/* Resumable initial stock refiller for the existing Spark Firebase RTDB.
 * Tries to reach 100 certified puzzles in each size/difficulty bucket.
 * Each scheduled run is individually bounded by GitHub Actions; the planner
 * pauses if ALL understocked buckets show no new puzzles over 24 runs.
 * The monitored Firebase billing API is unavailable on this Spark project:
 * no claim of live quota monitoring is made. Spark itself has hard quotas.
 */
export const INITIAL_SIZES=Object.freeze([5,10,15,20,25,30,50,75,100]);
export const INITIAL_DIFFICULTIES=Object.freeze(['쉬움','보통','어려움','전문가']);
export const INITIAL_TARGET=100;
export const INITIAL_BUCKET_KEYS=Object.freeze(
  INITIAL_SIZES.flatMap(size=>INITIAL_DIFFICULTIES.map(level=>size+'_'+level))
);
export const INITIAL_MAX_STALLED_RUNS=24;
const CONTROL='randomBankControl/initialFill';
const safeCount=value=>Number.isSafeInteger(value)&&value>=0;
function validControl(control){
  return control&&typeof control==='object'&&!Array.isArray(control)&&
    ['active','paused','finished'].includes(control.status)&&
    safeCount(control.startedAt)&&control.startedAt>0&&safeCount(control.runs)&&
    (control.stalledRuns===undefined||safeCount(control.stalledRuns))&&
    (control.lastTotal===undefined||safeCount(control.lastTotal));
}
export async function inspectInitialInventory(store,{keys=INITIAL_BUCKET_KEYS}={}){
  if(typeof store?.keys!=='function')throw Error('Admin shallow key scanning is required');
  const counts={};
  // Limit Firebase REST reads to six simultaneous shallow requests.
  for(let offset=0;offset<keys.length;offset+=6){
    const group=keys.slice(offset,offset+6);
    const lengths=await Promise.all(group.map(async key=>{
      const found=await store.keys('randomPuzzleBank/'+key);
      if(!Array.isArray(found))throw Error('Invalid Firebase shallow stock response: '+key);
      return found.length;
    }));
    for(let i=0;i<group.length;i++)counts[group[i]]=lengths[i];
  }
  return counts;
}
export function inventoryDeficits(counts,{target=INITIAL_TARGET}={}){
  return INITIAL_BUCKET_KEYS.filter(key=>
    !safeCount(counts?.[key])||counts[key]<target
  );
}
export async function planInitialFill(store,{
  now=Date.now(),maxStalledRuns=INITIAL_MAX_STALLED_RUNS
}={}){
  if(typeof store?.get!=='function'||typeof store?.put!=='function'||
     typeof store?.create!=='function'||typeof store?.keys!=='function')
    throw Error('Privileged Firebase adapter with safe shallow reads required');
  if(!safeCount(now)||now<=0||maxStalledRuns!==INITIAL_MAX_STALLED_RUNS)
    throw Error('Invalid initial fill safety limits');
  let control=await store.get(CONTROL);
  if(control!==null&&!validControl(control))
    throw Error('Invalid initial-fill control record; refusing writes');
  if(control?.status==='finished'&&control.reason==='target_reached')
    return {run:false,reason:'target_reached',runs:control.runs,
      remainingBuckets:0,totalDeficit:0,stalledRuns:0};
  // Other historic finished reasons can be resumed by this new policy.
  const startedAt=control?.startedAt??now;
  const runs=control?.runs??0;
  const counts=await inspectInitialInventory(store);
  const needed=inventoryDeficits(counts);
  const stockTotal=INITIAL_BUCKET_KEYS.reduce((sum,key)=>sum+counts[key],0);
  const deficit=needed.reduce((sum,key)=>sum+(INITIAL_TARGET-counts[key]),0);
  if(!needed.length){
    await store.put(CONTROL,{...control,status:'finished',startedAt,
      runs,finishedAt:now,reason:'target_reached',remainingBuckets:0,
      lastTotal:stockTotal,stalledRuns:0});
    return {run:false,reason:'target_reached',runs,
      remainingBuckets:0,totalDeficit:0,stalledRuns:0};
  }
  const previousTotal=control?.lastTotal;
  const increased=safeCount(previousTotal)&&stockTotal>previousTotal;
  if(control?.status==='paused'&&!increased){
    return {run:false,reason:'no_progress_paused',runs,
      remainingBuckets:needed.length,totalDeficit:deficit,
      stalledRuns:control.stalledRuns??INITIAL_MAX_STALLED_RUNS};
  }
  const stalled=safeCount(previousTotal)&&!increased
    ?(control.stalledRuns??0)+1:0;
  if(stalled>=maxStalledRuns){
    await store.put(CONTROL,{...control,status:'paused',startedAt,
      runs,pausedAt:now,reason:'no_progress_24_runs',
      remainingBuckets:needed.length,lastTotal:stockTotal,
      stalledRuns:stalled});
    return {run:false,reason:'no_progress_24_runs',runs,
      remainingBuckets:needed.length,totalDeficit:deficit,stalledRuns:stalled};
  }
  if(!control){
    const claimed=await store.create(CONTROL,{status:'active',
      startedAt,runs:0,reason:'initial_stock'});
    if(!claimed?.created)
      throw Error('Another initial-fill job changed control record; refusing overwrite');
    control={status:'active',startedAt,runs:0};
  }
  const next={...control,status:'active',startedAt,runs:runs+1,
    lastStartedAt:now,lastTotal:stockTotal,stalledRuns:stalled,
    remainingBuckets:needed.length,reason:'initial_stock_under_100'};
  await store.put(CONTROL,next);
  return {run:true,reason:'initial_stock_under_100',runs:runs+1,
    remainingBuckets:needed.length,totalDeficit:deficit,
    stalledRuns:stalled,bucketKeys:needed};
}
