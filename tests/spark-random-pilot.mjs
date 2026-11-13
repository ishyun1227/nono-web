/* No real Firebase access or credentials. Prove one-time Spark pilot bounds.
 * Uses an in-memory privileged store and a fake refill executor.
 */
import assert from 'node:assert/strict';
import {
  runSparkPilot,eligiblePilotBuckets,SPARK_PILOT_BUCKET_KEYS,
  SPARK_PILOT_MARKER,SPARK_PILOT_LIMITS
} from '../tools/run-spark-random-pilot.mjs';

const clone=value=>value===undefined?null:structuredClone(value);
class Store{
  constructor(data={}){this.data=clone(data);this.writes=[];}
  async get(path){
    let value=this.data;
    for(const part of path.split('/'))value=value?.[part];
    return clone(value);
  }
  async put(path,value){
    let parent=this.data;
    const parts=path.split('/');
    for(const part of parts.slice(0,-1))parent=parent[part]??={};
    parent[parts.at(-1)]=clone(value);
    this.writes.push({path,value:clone(value)});
  }
  async create(path,value){
    if(await this.get(path)!==null)return {created:false};
    await this.put(path,value);
    return {created:true};
  }
  async remove(path){return true;}
  async keys(path){return Object.keys((await this.get(path))||{});}
}
const data=new Store();
assert.equal(SPARK_PILOT_BUCKET_KEYS.length,6);
assert.equal(SPARK_PILOT_LIMITS.maxPublished,10);
assert.equal(SPARK_PILOT_LIMITS.maxAttempts,240);
assert.equal(SPARK_PILOT_LIMITS.maxMs,120000);
const before=SPARK_PILOT_BUCKET_KEYS.reduce((acc,key)=>({...acc,[key]:0}),{});
assert.equal(eligiblePilotBuckets(before).length,6);
const full=Object.fromEntries(Array.from({length:100},(_,i)=>['p'+i,true]));
await data.put('randomPuzzleBank/5_쉬움',full);
let calls=0;
const executor=async (_store,options)=>{
  calls++;
  assert.equal(options.maxPublished,10);
  assert.equal(options.maxAttempts,240);
  assert.equal(options.maxMs,120000);
  assert.equal(options.perBucketAttempts,40);
  assert.equal(options.buckets.length,5);
  assert(!options.buckets.some(bucket=>bucket.key==='5_쉬움'));
  return {published:2,attempts:30,visited:5,
    results:options.buckets.map(bucket=>({
      bucket:bucket.key,before:0,after:0,attempted:6,
      accepted:0,failed:6
    }))};
};
let result=await runSparkPilot(data,{now:()=>1234567890,runRefill:executor});
assert.equal(result.status,'finished');
assert.equal(result.published,2);
assert.equal(calls,1);
assert.equal((await data.get(SPARK_PILOT_MARKER)).state,'finished');
assert.equal((await data.get(SPARK_PILOT_MARKER)).maxPublished,10);
result=await runSparkPilot(data,{now:()=>1234567891,runRefill:executor});
assert.equal(result.status,'already_claimed');
assert.equal(calls,1);
console.log('PASS strict trial limits, 100-stock exclusion and single conditional claim');

const failStore=new Store();
await assert.rejects(runSparkPilot(failStore,{
  now:()=>1234567892,runRefill:async()=>{throw Error('synthetic failure');}
}),/synthetic failure/);
assert.equal((await failStore.get(SPARK_PILOT_MARKER)).state,'failed');
result=await runSparkPilot(failStore,{
  now:()=>1234567893,
  runRefill:async()=>{throw Error('must not restart failed claim');}
});
assert.equal(result.status,'already_claimed');
const fullStore=new Store();
for(const key of SPARK_PILOT_BUCKET_KEYS)
  await fullStore.put('randomPuzzleBank/'+key,full);
result=await runSparkPilot(fullStore,{
  now:()=>1234567894,
  runRefill:async()=>{throw Error('must not generate if full');}
});
assert.equal(result.status,'all_selected_buckets_full');
assert.equal(await fullStore.get(SPARK_PILOT_MARKER),null);
console.log('PASS fails closed on errors, never re-runs and never generates if sample sizes full');
