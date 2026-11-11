/* Bounded, resumable server refill planner for a shared per-size/difficulty
 * Firebase RTDB puzzle bank. The adapter uses privileged service credentials;
 * browsers can only read published puzzle specs.
 *
 * Initial target: 100 per bucket. Once an authenticated player's confirmed
 * completed IDs leave <=10 unseen, extend that bucket's target by 100.
 * Progress is persisted across scheduled jobs; never publish unproved grids.
 */
import {BUCKETS,attempt,DIFFICULTIES,SIZES} from './random-bank-generator.mjs';
import {performance} from 'node:perf_hooks';
const own=(obj,id)=>Object.prototype.hasOwnProperty.call(obj||{},id);
const clamp=(x,fallback,max)=>Number.isSafeInteger(x)&&x>=0?Math.min(x,max):fallback;
const BUCKET_SET=new Set(BUCKETS.map(b=>b.key));
const USER=/^[A-Za-z0-9_-]{1,128}$/;
function values(input){return input&&typeof input==='object'&&!Array.isArray(input)?input:{};}
function goodCandidate(result,b){
  const s=result?.spec;
  return result?.status==='accepted'&&result?.grade?.difficulty===b.difficulty&&
    result?.proof?.status==='unique'&&s?.verified===true&&
    s.verifiedBy==='cadical_reference_blocking_unsat_v1'&&
    s.version===6&&s.size===b.size&&s.difficulty===b.difficulty&&
    Number.isSafeInteger(s.seed)&&s.seed>=0&&s.seed<=4294967295&&
    typeof s.id==='string'&&/^random-[a-z0-9-]{1,85}$/.test(s.id);
}
// Small per-bucket aggregates, private to the server admin. Never write one
// database entry per candidate: aggregate statistics and flush periodically.
const STATS_FLUSH_ATTEMPTS=10;
const REASONS=new Set([
  'wrong_difficulty','logic_unknown_or_invalid','logic_unknown','logic_invalid',
  'logic_solution_mismatch','uniqueness_multiple','uniqueness_unknown',
  'uniqueness_timeout','uniqueness_error','uniqueness_encoding_issue',
  'candidate_error','publish_error','duplicate_id','invalid_candidate','other_rejection'
]);
function emptyDelta(){
  return {attempts:0,published:0,failed:0,totalAttemptMs:0,
    publishedAttemptMs:0,failures:{},gradedByDifficulty:{}};
}
function failureFor(candidate){
  if(candidate?.status==='rejected'&&candidate.reason==='logic_unknown_or_invalid'){
    if(candidate.logicStatus==='unknown')return 'logic_unknown';
    if(candidate.logicStatus==='invalid')return 'logic_invalid';
  }
  if(candidate?.status==='rejected'&&candidate.reason==='uniqueness_unknown'){
    const detail=candidate.proof?.reason;
    if(['proof_time_budget','encode_time_budget','encode_timeout'].includes(detail))
      return 'uniqueness_timeout';
    if(detail==='sat_error')return 'uniqueness_error';
    if(typeof detail==='string'&&detail.startsWith('encode_'))
      return 'uniqueness_encoding_issue';
  }
  return candidate?.status==='rejected'&&REASONS.has(candidate.reason)
    ?candidate.reason:candidate?.status==='rejected'?'other_rejection':'invalid_candidate';
}
const safeCount=n=>Number.isSafeInteger(n)&&n>=0?n:0;
const round=n=>Math.round(n*100)/100;
function mergeCounts(left,right){
  const result={...values(left)};
  for(const [key,value] of Object.entries(right)){
    if(Number.isSafeInteger(value)&&value>0)result[key]=safeCount(result[key])+value;
  }
  return result;
}
export function combineStatistics(previous,delta,updatedAt){
  const old=values(previous);
  const attempts=safeCount(old.attempts)+delta.attempts;
  const published=safeCount(old.published)+delta.published;
  const failed=safeCount(old.failed)+delta.failed;
  const totalAttemptMs=safeCount(old.totalAttemptMs)+delta.totalAttemptMs;
  const publishedAttemptMs=safeCount(old.publishedAttemptMs)+delta.publishedAttemptMs;
  return {
    schemaVersion:1,attempts,published,failed,totalAttemptMs,publishedAttemptMs,
    failures:mergeCounts(old.failures,delta.failures),
    gradedByDifficulty:mergeCounts(old.gradedByDifficulty,delta.gradedByDifficulty),
    successRatePct:attempts?round(100*published/attempts):null,
    avgAttemptMs:attempts?round(totalAttemptMs/attempts):null,
    // Includes time spent on failed candidates, not just successful ones.
    avgMsPerPublished:published?round(totalAttemptMs/published):null,
    avgPublishedAttemptMs:published?round(publishedAttemptMs/published):null,
    firstRecordedAt:safeCount(old.firstRecordedAt)||updatedAt,
    updatedAt
  };
}
// Visit all size/difficulty combinations in a diagonal order rather than
// exhausting one size before trying the next. Every four consecutive slots
// cover all four difficulties; each nine-slot band covers all nine sizes.
export function balancedBucketOrder(buckets=BUCKETS){
  return [...buckets].sort((a,b)=>{
    const rank=x=>{
      const sizeIndex=SIZES.indexOf(x.size);
      const difficultyIndex=DIFFICULTIES.indexOf(x.difficulty);
      return ((difficultyIndex-sizeIndex+DIFFICULTIES.length*4)%
        DIFFICULTIES.length)*SIZES.length+sizeIndex;
    };
    return rank(a)-rank(b);
  });
}
export async function refill(store,{
  buckets=BUCKETS,maxPublished=12,maxAttempts=144,maxMs=300000,
  perBucketAttempts=0,makeAttempt=attempt,now=Date.now,
  measureMs=()=>performance.now(),log=()=>{}
}={}){
  if(!store?.get||!store?.put||!store?.create||!store?.remove)
    throw Error('A privileged Firebase data adapter is required');
  if(!Array.isArray(buckets)||!buckets.length||
     !buckets.every(b=>BUCKET_SET.has(b.key)&&SIZES.includes(b.size)&&
       DIFFICULTIES.includes(b.difficulty)&&b.key===b.size+'_'+b.difficulty)||
     new Set(buckets.map(b=>b.key)).size!==buckets.length)
    throw Error('Unknown or duplicate inventory bucket');
  const deadline=now()+clamp(maxMs,300000,900000);
  const limit=clamp(maxPublished,12,100);
  const attemptLimit=clamp(maxAttempts,1200,5000);
  const perBucket=clamp(perBucketAttempts,0,1000);
  const automaticQuota=size=>size<=5?400:size<=10?200:size<=15?100:size<=20?60:
    size<=25?36:size<=30?24:size<=50?10:size<=75?4:2;
  const ordered=balancedBucketOrder(buckets);
  const control=values(await store.get('randomBankControl'));
  const cursor=clamp(Number(control.cursor),0,ordered.length-1)%ordered.length;
  const previousCredits=values(control.servedAttempts);
  const knownCredits=Object.values(previousCredits).filter(
    x=>Number.isSafeInteger(x)&&x>=0&&x<=1000000000);
  const initialCredit=knownCredits.length?Math.min(...knownCredits):0;
  const requests=values(await store.get('randomRestockRequests'));
  let totalAttempts=0,published=0,verifiedRequests=0,rejectedRequests=0;
  const visited=new Set();
  // Inspect ALL buckets before generating. A job that runs out of time can
  // still validate outstanding refill requests and learn current stock levels.
  const states=[];
  for(const b of ordered){
    const ref='randomPuzzleBank/'+b.key;
    const current=values(await store.get(ref));
    let count=Object.keys(current).length;
    const previous=values(await store.get('randomBankState/'+b.key));
    let target=Math.max(100,clamp(Number(previous.target),100,10000000));
    for(const [uid,byBucket] of Object.entries(requests)){
      if(!USER.test(uid)||!own(values(byBucket),b.key))continue;
      const requestPath='randomRestockRequests/'+uid+'/'+b.key;
      let valid=false;
      try{
        const completed=values(await store.get('userCompleted/'+uid));
        const remaining=Object.keys(current).reduce((n,id)=>n+(!own(completed,id)?1:0),0);
        valid=remaining<=10;
      }catch(error){
        log('request_check_failed',{bucket:b.key,
          reason:String(error?.message||error).slice(0,120)});
        continue; // Keep the request to retry on another run.
      }
      if(valid){
        verifiedRequests++;
        if(count>=target)target=count+100; // Do not stack overlapping +100 batches.
      }else rejectedRequests++;
      // Persist the new target BEFORE deleting the triggering request.
      await store.put('randomBankState/'+b.key,{
        target,updatedAt:now(),lastReason:valid?'confirmed_player_low_stock':'unchanged'
      });
      await store.remove(requestPath);
    }
    const recorded=previousCredits[b.key];
    states.push({
      bucket:b,ref,current,count,target,quota:perBucket||automaticQuota(b.size),
      served:Number.isSafeInteger(recorded)&&recorded>=0&&recorded<=1000000000
        ?recorded:initialCredit,
      entry:{bucket:b.key,before:count,target,accepted:0,attempted:0,failed:0},
      statsDelta:emptyDelta(),cumulative:null
    });
  }
  log('inventory_plan',{buckets:states.length,
    underTarget:states.filter(s=>s.count<s.target).length,cursor});
  function recordAttempt(state,started,candidate,success,reason){
    const delta=state.statsDelta;
    const duration=Math.max(0,Math.round(measureMs()-started));
    delta.attempts++;
    delta.totalAttemptMs+=duration;
    if(DIFFICULTIES.includes(candidate?.grade?.difficulty)){
      const grade=candidate.grade.difficulty;
      delta.gradedByDifficulty[grade]=(delta.gradedByDifficulty[grade]||0)+1;
    }
    if(success){
      delta.published++;
      delta.publishedAttemptMs+=duration;
    }else{
      delta.failed++;
      const key=REASONS.has(reason)?reason:'other_rejection';
      delta.failures[key]=(delta.failures[key]||0)+1;
    }
  }
  async function flushStatistics(state){
    const delta=state.statsDelta;
    if(!delta.attempts)return;
    const path='randomBankStats/'+state.bucket.key;
    const existing=await store.get(path);
    const next=combineStatistics(existing,delta,now());
    await store.put(path,next);
    state.cumulative=next;
    state.statsDelta=emptyDelta();
  }
  // Persistent least-served scheduling: even a category with no successful
  // candidates accumulates an attempt credit. It therefore cannot monopolize
  // a run, and already-stocked categories are not starved by zero-stock ones.
  // Equal-credit categories with LESS stock relative to target go first.
  let nextCursor=cursor;
  while(totalAttempts<attemptLimit&&published<limit&&now()<deadline){
    let selected=null,selectedIndex=-1;
    for(let step=0;step<states.length;step++){
      const index=(nextCursor+step)%states.length;
      const state=states[index];
      if(state.count>=state.target||state.entry.attempted>=state.quota)continue;
      if(!selected||state.served<selected.served||
         (state.served===selected.served&&
          state.count*selected.target<selected.count*state.target)){
        selected=state;selectedIndex=index;
      }
    }
    if(!selected)break;
    nextCursor=(selectedIndex+1)%states.length;
    selected.served++;
    selected.entry.attempted++;
    totalAttempts++;
    visited.add(selected.bucket.key);
    const started=measureMs();
    let candidate,reason=null,success=false,fatal=null;
    try{
      candidate=await makeAttempt({
        size:selected.bucket.size,difficulty:selected.bucket.difficulty
      });
    }catch(error){
      reason='candidate_error';
      log('candidate_error',{bucket:selected.bucket.key,
        reason:String(error?.message||error).slice(0,140)});
    }
    if(!reason){
      if(!goodCandidate(candidate,selected.bucket)){
        reason=failureFor(candidate);
      }else{
        // Firebase REST If-Match:null_etag protects existing puzzle IDs.
        try{
          const result=await store.create(selected.ref+'/'+candidate.spec.id,candidate.spec);
          if(result?.created){
            selected.current[candidate.spec.id]=candidate.spec;
            selected.count++;
            published++;
            selected.entry.accepted++;
            success=true;
          }else reason='duplicate_id';
        }catch(error){
          reason='publish_error';
          fatal=error; // A database failure is not a normal rejected candidate.
        }
      }
    }
    if(!success)selected.entry.failed++;
    recordAttempt(selected,started,candidate,success,reason);
    // Bound lost measurements if a scheduled job is interrupted externally.
    if(selected.statsDelta.attempts>=STATS_FLUSH_ATTEMPTS||fatal)
      await flushStatistics(selected);
    if(fatal)throw fatal;
  }
  // Keep the rest of the run even if a bucket had no successful candidates.
  for(const state of states)await flushStatistics(state);
  // Save fairness across scheduled runs. Rotate the cursor even when all
  // targets are full; no bucket is permanently the first preferred option.
  const minCredit=Math.min(...states.map(s=>s.served));
  const servedAttempts=Object.fromEntries(states.map(s=>[
    s.bucket.key,s.served-minCredit
  ]));
  await store.put('randomBankControl/servedAttempts',servedAttempts);
  await store.put('randomBankControl/cursor',
    totalAttempts?nextCursor:(cursor+1)%states.length);
  for(const state of states){
    state.entry.after=state.count;
    if(state.cumulative)state.entry.cumulative={
      attempts:state.cumulative.attempts,published:state.cumulative.published,
      failed:state.cumulative.failed,successRatePct:state.cumulative.successRatePct,
      avgMsPerPublished:state.cumulative.avgMsPerPublished,
      avgAttemptMs:state.cumulative.avgAttemptMs,
      failures:state.cumulative.failures
    };
    if(state.entry.attempted)log('bucket_processed',state.entry);
  }
  return {
    published,attempts:totalAttempts,visited:visited.size,
    verifiedRequests,rejectedRequests,
    complete:states.every(s=>s.count>=s.target||s.entry.attempted>0),
    results:states.map(s=>s.entry)
  };
}
