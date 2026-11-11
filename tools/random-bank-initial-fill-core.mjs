/* Bounded one-time initial stock warmup for the shared v6 random bank.
 * Runs only from a credentialed server workflow and only for inventory buckets
 * that still have fewer than 100 verified puzzles.
 *
 * The once-per-hour burst is capped at 168 invocations and 7 days. A
 * terminal state prevents a sparse/impossible bucket from causing unbounded
 * GitHub Actions consumption. Hourly normal refill continues independently.
 */
export const INITIAL_SIZES=Object.freeze([5,10,15,20,25,30,50,75,100]);
export const INITIAL_DIFFICULTIES=Object.freeze(['쉬움','보통','어려움','전문가']);
export const INITIAL_TARGET=100;
export const INITIAL_BUCKET_KEYS=Object.freeze(
  INITIAL_SIZES.flatMap(size=>INITIAL_DIFFICULTIES.map(level=>size+'_'+level))
);
export const INITIAL_MAX_RUNS=168;
export const INITIAL_MAX_DAYS=7;
const CONTROL='randomBankControl/initialFill';
function validControl(control){
  return control&&typeof control==='object'&&!Array.isArray(control)&&
    ['active','finished'].includes(control.status)&&
    Number.isSafeInteger(control.startedAt)&&control.startedAt>0&&
    Number.isSafeInteger(control.runs)&&control.runs>=0;
}
export async function inspectInitialInventory(store,{keys=INITIAL_BUCKET_KEYS}={}){
  if(typeof store?.keys!=='function')throw Error('Admin shallow key scanning is required');
  const counts={};
  // Deliberately keep only six Firebase requests in flight at a time.
  for(let offset=0;offset<keys.length;offset+=6){
    const group=keys.slice(offset,offset+6);
    const countsInGroup=await Promise.all(group.map(async key=>{
      const found=await store.keys('randomPuzzleBank/'+key);
      if(!Array.isArray(found))throw Error('Invalid Firebase shallow stock response: '+key);
      return found.length;
    }));
    for(let i=0;i<group.length;i++)counts[group[i]]=countsInGroup[i];
  }
  return counts;
}
export function inventoryDeficits(counts,{target=INITIAL_TARGET}={}){
  return INITIAL_BUCKET_KEYS.filter(key=>
    !Number.isSafeInteger(counts?.[key])||counts[key]<target
  );
}
export async function planInitialFill(store,{
  now=Date.now(),maxDays=INITIAL_MAX_DAYS,maxRuns=INITIAL_MAX_RUNS
}={}){
  if(typeof store?.get!=='function'||typeof store?.put!=='function'||
     typeof store?.create!=='function'||typeof store?.keys!=='function')
    throw Error('Privileged Firebase adapter with safe shallow reads required');
  if(!Number.isSafeInteger(now)||now<=0||maxDays!==INITIAL_MAX_DAYS||
     maxRuns!==INITIAL_MAX_RUNS)
    throw Error('Invalid initial fill safety limits');
  let control=await store.get(CONTROL);
  if(control!==null&&!validControl(control))
    throw Error('Invalid initial-fill control record; refusing writes');
  if(control?.status==='finished')return {
    run:false,reason:control.reason||'already_finished',
    runs:control.runs,
    remainingBuckets:control.reason==='target_reached'?0:(control.remainingBuckets??null)
  };
  const startedAt=control?.startedAt??now;
  const runs=control?.runs??0;
  const maxAgeMs=maxDays*24*60*60*1000;
  if(now-startedAt>=maxAgeMs||runs>=maxRuns){
    const reason=runs>=maxRuns?'run_cap':'time_cap';
    await store.put(CONTROL,{...control,status:'finished',startedAt,
      runs,finishedAt:now,reason});
    return {run:false,reason,runs,remainingBuckets:null};
  }
  const counts=await inspectInitialInventory(store);
  const needed=inventoryDeficits(counts);
  if(!needed.length){
    await store.put(CONTROL,{...control,status:'finished',startedAt,
      runs,finishedAt:now,reason:'target_reached'});
    return {run:false,reason:'target_reached',runs,remainingBuckets:0};
  }
  if(!control){
    const result=await store.create(CONTROL,{status:'active',
      startedAt,runs:0,reason:'initial_stock'});
    if(!result?.created)
      throw Error('Another initial-fill job changed the control record; refusing to overwrite');
    control={status:'active',startedAt,runs:0};
  }
  await store.put(CONTROL,{...control,status:'active',
    runs:runs+1,lastStartedAt:now,remainingBuckets:needed.length});
  return {
    run:true,reason:'initial_stock_under_100',
    runs:runs+1,remainingBuckets:needed.length,
    totalDeficit:needed.reduce((n,key)=>n+(INITIAL_TARGET-counts[key]),0),
    bucketKeys:needed
  };
}
