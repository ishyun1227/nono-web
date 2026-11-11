/* Bounded, resumable server refill planner for a shared per-size/difficulty
 * Firebase RTDB puzzle bank. The adapter uses privileged service credentials;
 * browsers can only read published puzzle specs.
 *
 * Initial target: 100 per bucket. Once an authenticated player's confirmed
 * completed IDs leave <=10 unseen, extend that bucket's target by 100.
 * Progress is persisted across scheduled jobs; never publish unproved grids.
 */
import {BUCKETS,attempt,DIFFICULTIES,SIZES} from './random-bank-generator.mjs';
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
  perBucketAttempts=0,makeAttempt=attempt,now=Date.now,log=()=>{}
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
      entry:{bucket:b.key,before:count,target,accepted:0,attempted:0,failed:0}
    });
  }
  log('inventory_plan',{buckets:states.length,
    underTarget:states.filter(s=>s.count<s.target).length,cursor});
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
    let candidate;
    try{
      candidate=await makeAttempt({
        size:selected.bucket.size,difficulty:selected.bucket.difficulty
      });
    }catch(error){
      selected.entry.failed++;
      log('candidate_error',{bucket:selected.bucket.key,
        reason:String(error?.message||error).slice(0,140)});
      continue;
    }
    if(!goodCandidate(candidate,selected.bucket)){
      selected.entry.failed++;
      continue;
    }
    // Firebase REST If-Match:null_etag protects existing puzzle IDs.
    const result=await store.create(selected.ref+'/'+candidate.spec.id,candidate.spec);
    if(result?.created){
      selected.current[candidate.spec.id]=candidate.spec;
      selected.count++;
      published++;
      selected.entry.accepted++;
    }else selected.entry.failed++;
  }
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
    if(state.entry.attempted)log('bucket_processed',state.entry);
  }
  return {
    published,attempts:totalAttempts,visited:visited.size,
    verifiedRequests,rejectedRequests,
    complete:states.every(s=>s.count>=s.target||s.entry.attempted>0),
    results:states.map(s=>s.entry)
  };
}
