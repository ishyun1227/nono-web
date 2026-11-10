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
export async function refill(store,{
  buckets=BUCKETS,maxPublished=12,maxAttempts=144,maxMs=300000,
  perBucketAttempts=0,makeAttempt=attempt,now=Date.now,log=()=>{}
}={}){
  if(!store?.get||!store?.put||!store?.create||!store?.remove)
    throw Error('A privileged Firebase data adapter is required');
  if(!Array.isArray(buckets)||!buckets.length||
     !buckets.every(b=>BUCKET_SET.has(b.key)&&SIZES.includes(b.size)&&
       DIFFICULTIES.includes(b.difficulty)&&b.key===b.size+'_'+b.difficulty))
    throw Error('Unknown inventory bucket');
  const deadline=now()+clamp(maxMs,300000,900000);
  const limit=clamp(maxPublished,12,100);
  const attemptLimit=clamp(maxAttempts,1200,5000);
  const perBucket=clamp(perBucketAttempts,0,1000);
  const automaticQuota=size=>size<=5?400:size<=10?200:size<=15?100:size<=20?60:
    size<=25?36:size<=30?24:size<=50?10:size<=75?4:2;
  const control=values(await store.get('randomBankControl'));
  const offset=clamp(Number(control.cursor),0,buckets.length-1)%buckets.length;
  const requests=values(await store.get('randomRestockRequests'));
  let totalAttempts=0,published=0,visited=0,verifiedRequests=0,rejectedRequests=0;
  const results=[];
  // A rotating start prevents giant/rare buckets from starving small ones.
  for(let index=0;index<buckets.length;index++){
    if(totalAttempts>=attemptLimit||published>=limit||now()>=deadline)break;
    const b=buckets[(offset+index)%buckets.length];
    visited++;
    const ref='randomPuzzleBank/'+b.key;
    const current=values(await store.get(ref));
    let count=Object.keys(current).length;
    const previous=values(await store.get('randomBankState/'+b.key));
    let target=Math.max(100,clamp(Number(previous.target),100,10000000));
    // Process signed-in user requests against ACTUAL completed records.
    // A client timestamp/request alone does not authorize replenishment.
    for(const [uid,byBucket] of Object.entries(requests)){
      if(!USER.test(uid)||!own(values(byBucket),b.key))continue;
      const requestPath='randomRestockRequests/'+uid+'/'+b.key;
      let valid=false;
      try{
        const completed=values(await store.get('userCompleted/'+uid));
        const remaining=Object.keys(current).reduce((n,id)=>n+(!own(completed,id)?1:0),0);
        valid=remaining<=10;
      }catch(error){
        log('request_check_failed',{bucket:b.key,reason:String(error?.message||error).slice(0,120)});
        continue; // Keep the request to retry on another run.
      }
      if(valid){
        verifiedRequests++;
        if(count>=target)target=count+100; // exactly one additional batch
      }else rejectedRequests++;
      // Persist the target before removing requests so a crash cannot lose it.
      await store.put('randomBankState/'+b.key,{
        target,updatedAt:now(),lastReason:valid?'confirmed_player_low_stock':'unchanged'
      });
      await store.remove(requestPath);
    }
    const entry={bucket:b.key,before:count,target,accepted:0,attempted:0,failed:0};
    // Each bucket gets a small fair share; unfinished targets persist.
    if(count<target){
      const quota=perBucket||automaticQuota(b.size);
      for(let k=0;k<quota&&count<target&&
          totalAttempts<attemptLimit&&published<limit&&now()<deadline;k++){
        totalAttempts++;entry.attempted++;
        let candidate;
        try{
          candidate=await makeAttempt({size:b.size,difficulty:b.difficulty});
        }catch(error){
          entry.failed++;log('candidate_error',{bucket:b.key,
            reason:String(error?.message||error).slice(0,140)});
          continue;
        }
        if(!goodCandidate(candidate,b)){entry.failed++;continue;}
        // Firebase REST If-Match:null_etag prevents overwriting another puzzle.
        const result=await store.create(ref+'/'+candidate.spec.id,candidate.spec);
        if(result?.created){
          current[candidate.spec.id]=candidate.spec;
          count++;published++;entry.accepted++;
        }else entry.failed++;
      }
    }
    entry.after=count;
    results.push(entry);
    if(entry.attempted||entry.before!==entry.target)
      log('bucket_processed',entry);
  }
  await store.put('randomBankControl/cursor',(offset+visited)%buckets.length);
  return {
    published,attempts:totalAttempts,visited,
    verifiedRequests,rejectedRequests,complete:visited===buckets.length,
    results
  };
}
