/* Server refill planner regression tests with an in-memory, privileged RTDB.
 * No credentials or live Firebase are used here.
 */
import assert from 'node:assert/strict';
import {refill} from '../tools/random-bank-refill-core.mjs';
import {attempt,classify,proveUnique,puzzleSpec,BUCKETS} from '../tools/random-bank-generator.mjs';
import {validateDatabaseUrl,validateCredential,makeAdminStore} from '../tools/random-bank-admin.mjs';
import {generateKeyPairSync} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {assertTargetAccount,assertLiveBankRules,TARGET_PROJECT,TARGET_DATABASE_URL} from '../tools/random-bank-live-rules.mjs';
import {approveRulesActivation,activateBankRules} from '../tools/activate-random-bank-rules.mjs';

const deep=v=>v===undefined?null:structuredClone(v);
class Store {
  constructor(data={}){this.data=deep(data);this.writes=[];}
  parts(path){return path.split('/');}
  async get(path){let item=this.data;for(const part of this.parts(path)){if(!item||typeof item!=='object')return null;item=item[part];}return deep(item);}
  async put(path,value){let item=this.data;const parts=this.parts(path);
    for(const part of parts.slice(0,-1))item=item[part]??={};
    item[parts.at(-1)]=deep(value);this.writes.push({path,value:deep(value)});return deep(value);}
  async create(path,value){
    if(await this.get(path)!==null)return {created:false};
    await this.put(path,value);return {created:true};
  }
  async remove(path){let item=this.data,parts=this.parts(path);
    for(const part of parts.slice(0,-1)){item=item?.[part];if(!item)return true;}
    delete item[parts.at(-1)];return true;
  }
  async getWithEtag(path){
    const value=await this.get(path);
    return {value,etag:JSON.stringify(value)};
  }
  async putIfMatch(path,value,etag){
    if(JSON.stringify(await this.get(path))!==etag)return {written:false};
    await this.put(path,value);
    return {written:true};
  }
}
const main={size:10,difficulty:'보통',key:'10_보통'};
let nextSeed=123,makeCalls=0;
const good=async ({size,difficulty})=>{
  makeCalls++;
  const spec=puzzleSpec(size,difficulty,nextSeed++);
  return {status:'accepted',spec:{...spec,verified:true,
    verifiedBy:'cadical_reference_blocking_unsat_v1'},
    grade:{difficulty},proof:{status:'unique'}};
};
const first=new Store();
let result=await refill(first,{
  buckets:[main],makeAttempt:good,maxPublished:3,maxAttempts:10,
  perBucketAttempts:3,maxMs:10000
});
assert.equal(result.published,3);
assert.equal(Object.keys((await first.get('randomPuzzleBank/10_보통'))||{}).length,3);
assert.equal((await first.get('randomBankControl/cursor')),0);
result=await refill(first,{buckets:[main],makeAttempt:good,
  maxPublished:3,perBucketAttempts:3,maxMs:10000});
assert.equal(result.published,3);
assert.equal(Object.keys(await first.get('randomPuzzleBank/10_보통')).length,6);
console.log('PASS initially empty bank fills in bounded, resumable batches');

// Cumulative stats must distinguish generator yield from stock quantity, include
// reason categories, measure elapsed time and survive the next scheduled run.
const telemetryBucket={size:5,difficulty:'쉬움',key:'5_쉬움'};
const telemetryStore=new Store();
const telemetrySpec=puzzleSpec(5,'쉬움',4242);
const telemetryAccepted=()=>{
  return {status:'accepted',spec:{...telemetrySpec,verified:true,
    verifiedBy:'cadical_reference_blocking_unsat_v1'},
    grade:{difficulty:'쉬움'},proof:{status:'unique'}};
};
let telemetryTick=0,telemetryIndex=0;
const telemetryCandidates=[
  {status:'rejected',reason:'wrong_difficulty',grade:{difficulty:'보통'}},
  {status:'rejected',reason:'uniqueness_multiple',grade:{difficulty:'쉬움'}},
  null,telemetryAccepted(),telemetryAccepted()
];
result=await refill(telemetryStore,{
  buckets:[telemetryBucket],maxPublished:5,maxAttempts:5,
  perBucketAttempts:5,maxMs:10000,measureMs:()=>telemetryTick,
  makeAttempt:async()=>{
    telemetryTick+=100;
    const index=telemetryIndex++;
    if(index===2)throw Error('synthetic generation error');
    return telemetryCandidates[index];
  }
});
assert.equal(result.attempts,5);
assert.equal(result.published,1);
let stats=await telemetryStore.get('randomBankStats/5_쉬움');
assert.equal(stats.schemaVersion,1);
assert.equal(stats.attempts,5);
assert.equal(stats.published,1);
assert.equal(stats.failed,4);
assert.equal(stats.successRatePct,20);
assert.equal(stats.avgAttemptMs,100);
assert.equal(stats.avgMsPerPublished,500,
  'Time per published puzzle must include unsuccessful attempts');
assert.equal(stats.avgPublishedAttemptMs,100);
assert.equal(stats.totalAttemptMs,500);
assert.deepEqual(stats.failures,{
  wrong_difficulty:1,uniqueness_multiple:1,candidate_error:1,duplicate_id:1
});
assert.deepEqual(stats.gradedByDifficulty,{'보통':1,'쉬움':3});
assert.equal(stats.attempts,stats.published+stats.failed);
assert.deepEqual(
  Object.keys((await telemetryStore.get('randomPuzzleBank/5_쉬움'))||{}),
  [telemetrySpec.id],
  'Stats must not change puzzle allocation or create duplicates'
);
const firstRecordedAt=stats.firstRecordedAt;
result=await refill(telemetryStore,{
  buckets:[telemetryBucket],maxPublished:1,maxAttempts:1,
  perBucketAttempts:1,maxMs:10000,measureMs:()=>telemetryTick,
  makeAttempt:async()=>{
    telemetryTick+=200;
    const spec=puzzleSpec(5,'쉬움',4243);
    return {status:'accepted',spec:{...spec,verified:true,
      verifiedBy:'cadical_reference_blocking_unsat_v1'},
      grade:{difficulty:'쉬움'},proof:{status:'unique'}};
  }
});
stats=await telemetryStore.get('randomBankStats/5_쉬움');
assert.equal(stats.attempts,6);
assert.equal(stats.published,2);
assert.equal(stats.failed,4);
assert.equal(stats.totalAttemptMs,700);
assert.equal(stats.successRatePct,33.33);
assert.equal(stats.avgMsPerPublished,350);
assert.equal(stats.firstRecordedAt,firstRecordedAt);
console.log('PASS cumulative per-bucket yield, classified failure reasons, difficulty mix, elapsed time and cross-run persistence');

const interruptedStats=new Store();
let failureCalls=0;
result=await refill(interruptedStats,{
  buckets:[telemetryBucket],maxPublished:2,maxAttempts:21,
  perBucketAttempts:21,maxMs:10000,makeAttempt:async()=>{
    failureCalls++;
    return {status:'rejected',reason:'logic_unknown_or_invalid'};
  }
});
assert.equal(failureCalls,21);
assert.equal(result.published,0);
stats=await interruptedStats.get('randomBankStats/5_쉬움');
assert.equal(stats.attempts,21);
assert.equal(stats.successRatePct,0);
assert.equal(stats.avgMsPerPublished,null);
assert.equal(stats.failures.logic_unknown_or_invalid,21);
assert.equal(interruptedStats.writes.filter(w=>w.path==='randomBankStats/5_쉬움').length,3,
  'Aggregated stats should flush periodically, never once per candidate');
console.log('PASS bounded statistics writes and no divide-by-zero when a bucket produces nothing');

const categorized=new Store();
const reasonExamples=[
  {status:'rejected',reason:'logic_unknown_or_invalid',logicStatus:'unknown'},
  {status:'rejected',reason:'logic_unknown_or_invalid',logicStatus:'invalid'},
  {status:'rejected',reason:'uniqueness_unknown',proof:{reason:'proof_time_budget'}},
  {status:'rejected',reason:'uniqueness_unknown',proof:{reason:'sat_error'}},
  {status:'rejected',reason:'uniqueness_unknown',proof:{reason:'encode_unsupported'}}
];
let reasonIndex=0;
result=await refill(categorized,{
  buckets:[telemetryBucket],maxPublished:1,maxAttempts:5,
  perBucketAttempts:5,maxMs:10000,
  makeAttempt:async()=>reasonExamples[reasonIndex++]
});
stats=await categorized.get('randomBankStats/5_쉬움');
assert.equal(stats.attempts,5);
assert.deepEqual(stats.failures,{
  logic_unknown:1,logic_invalid:1,uniqueness_timeout:1,
  uniqueness_error:1,uniqueness_encoding_issue:1
});
console.log('PASS separate logic unknown/invalid, SAT timeout, SAT error and encoding failure metrics');



// Across one run, no size/difficulty bucket may monopolize the attempt budget.
const fairBuckets=[
  {size:5,difficulty:'쉬움',key:'5_쉬움'},
  {size:10,difficulty:'보통',key:'10_보통'},
  {size:15,difficulty:'어려움',key:'15_어려움'},
  {size:20,difficulty:'전문가',key:'20_전문가'}
];
const balanced=new Store();
result=await refill(balanced,{buckets:fairBuckets,makeAttempt:good,
  maxPublished:8,maxAttempts:8,perBucketAttempts:8,maxMs:10000});
assert.equal(result.published,8);
assert.equal(result.visited,4);
for(const b of fairBuckets){
  assert.equal(Object.keys(await balanced.get('randomPuzzleBank/'+b.key)).length,2,
    'Each size and difficulty must receive an equal initial opportunity');
}
console.log('PASS fair round-robin replenishment across four sizes and difficulties');

// Attempt fairness persists after the job ends, even when no full sweep fits.
const split=new Store();
for(let run=0;run<2;run++){
  result=await refill(split,{buckets:fairBuckets,makeAttempt:good,
    maxPublished:2,maxAttempts:2,perBucketAttempts:8,maxMs:10000});
  assert.equal(result.published,2);
}
for(const b of fairBuckets){
  assert.equal(Object.keys(await split.get('randomPuzzleBank/'+b.key)).length,1,
    'The next scheduled run must resume categories not served previously');
}
console.log('PASS least-served scheduler preserves fairness across short jobs');

// A category that rejects every candidate cannot exhaust the entire run.
const stubborn=new Store();
result=await refill(stubborn,{
  buckets:fairBuckets,maxPublished:3,maxAttempts:4,perBucketAttempts:8,
  maxMs:10000,
  makeAttempt:async b=>b.size===5?{status:'rejected',reason:'test_rejection'}:good(b)
});
assert.equal(result.published,3);
assert.equal(result.attempts,4);
assert.equal(result.visited,4);
for(const b of fairBuckets.slice(1)){
  assert.equal(Object.keys(await stubborn.get('randomPuzzleBank/'+b.key)).length,1);
}
console.log('PASS repeatedly rejected bucket cannot starve other classifications');

// Among categories with equal service credit, the least-stocked comes first.
const almostFull=Object.fromEntries(Array.from({length:98},(_,i)=>{
  const spec=puzzleSpec(5,'쉬움',i);
  return [spec.id,{...spec,verified:true}];
}));
const priority=new Store({randomPuzzleBank:{'5_쉬움':almostFull}});
let firstSelected=null;
result=await refill(priority,{buckets:fairBuckets.slice(0,2),
  maxPublished:1,maxAttempts:1,perBucketAttempts:8,maxMs:10000,
  makeAttempt:async b=>{firstSelected=b.difficulty;return good(b);}
});
assert.equal(firstSelected,'보통');
assert.equal(result.published,1);
console.log('PASS inventory shortage breaks ties without violating attempt fairness');


const inventory=Object.fromEntries(Array.from({length:100},(_,i)=>[
  'random-10-1-'+i,{...puzzleSpec(10,'보통',i),verified:true}
]));
const completed=Object.fromEntries(Object.keys(inventory).slice(0,90).map((id,i)=>[id,i+1]));
const restock=new Store({
  randomPuzzleBank:{'10_보통':inventory},
  randomBankState:{'10_보통':{target:100}},
  randomRestockRequests:{alice:{'10_보통':1234}},
  userCompleted:{alice:completed}
});
result=await refill(restock,{buckets:[main],makeAttempt:good,
  maxPublished:2,perBucketAttempts:2,maxMs:10000});
assert.equal(result.verifiedRequests,1);
assert.equal(result.published,2);
assert.equal((await restock.get('randomBankState/10_보통')).target,200);
assert.equal(await restock.get('randomRestockRequests/alice/10_보통'),null);
assert.equal(Object.keys(await restock.get('randomPuzzleBank/10_보통')).length,102);
await restock.put('randomRestockRequests/alice/10_보통',5555);
result=await refill(restock,{buckets:[main],makeAttempt:good,
  maxPublished:2,perBucketAttempts:2,maxMs:10000});
assert.equal((await restock.get('randomBankState/10_보통')).target,200,
  'Requests during an outstanding batch must not stack further +100');
const untriggered=new Store({
  randomPuzzleBank:{'10_보통':inventory},
  userCompleted:{alice:Object.fromEntries(Object.keys(inventory).slice(0,4).map(id=>[id,1]))},
  randomRestockRequests:{alice:{'10_보통':1}}
});
result=await refill(untriggered,{buckets:[main],makeAttempt:good});
assert.equal(result.published,0);
assert.equal(result.rejectedRequests,1);
assert.equal(await untriggered.get('randomRestockRequests/alice/10_보통'),null);
console.log('PASS backend independently validates 10 remaining, adds 100 target once, ignores unverified demand');

const rejected=new Store();
result=await refill(rejected,{buckets:[main],maxPublished:3,
  perBucketAttempts:3,makeAttempt:async({size,difficulty})=>({
    status:'accepted',grade:{difficulty},proof:{status:'multiple'},
    spec:{...puzzleSpec(size,difficulty,42),verified:true,
      verifiedBy:'cadical_reference_blocking_unsat_v1'}
  })});
assert.equal(result.published,0);
assert.equal(await rejected.get('randomPuzzleBank/10_보통'),null);
console.log('PASS no SAT UNSAT certification means no server publication');

assert.equal(classify(10,{status:'partial',solved:30,stats:{iterations:12}}).difficulty,'전문가');
assert.equal(classify(10,{status:'unknown',solved:30,stats:{iterations:12}}),null);
assert.equal(classify(10,{status:'solved',solved:100,stats:{iterations:12}}).difficulty,'쉬움');
assert.equal(classify(10,{status:'solved',solved:100,stats:{iterations:30}}).difficulty,'보통');
assert.equal(classify(10,{status:'solved',solved:100,stats:{iterations:40}}).difficulty,'어려움');
const classified=await attempt({size:5,difficulty:'쉬움',seed:421,
  solveLogic:()=>({status:'solved',solved:25,cells:Array(25).fill(0),stats:{iterations:5}}),
  certify:async()=>({status:'unique'})});
assert.equal(classified.status,'rejected',
  'Contradictory fake solver must not certify by merely returning solved');
const mockedLogic=await attempt({size:5,difficulty:'전문가',seed:10,
  solveLogic:()=>({status:'partial',solved:10,stats:{iterations:8}}),
  certify:async()=>({status:'unique'})});
assert.equal(mockedLogic.status,'accepted');
assert.equal(mockedLogic.spec.verifiedBy,'cadical_reference_blocking_unsat_v1');
const unproved=await attempt({size:5,difficulty:'전문가',seed:10,
  solveLogic:()=>({status:'partial',solved:10,stats:{iterations:8}}),
  certify:async()=>({status:'unknown'})});
assert.notEqual(unproved.status,'accepted');
console.log('PASS provisional 3 logical levels, stalled expert, fail-closed candidate checks');

const black={size:5,rows:Array.from({length:5},()=>[5]),cols:Array.from({length:5},()=>[5])};
const many={size:5,rows:Array.from({length:5},()=>[1]),cols:Array.from({length:5},()=>[1])};
assert.equal((await proveUnique(black,'1'.repeat(25),{maxMs:5000})).status,'unique');
assert.equal((await proveUnique(many,'1000001000001000001000001',{maxMs:5000})).status,'multiple');
assert.equal((await proveUnique(black,'0'.repeat(25),{maxMs:5000})).status,'unknown');
console.log('PASS real CaDiCaL UNSAT uniqueness, SAT second answer, invalid reference rejection');
let produced=null;
const rejectedReasons={};
for(let seed=0;seed<2048;seed++){
  const candidate=await attempt({size:5,difficulty:'쉬움',seed,logicMs:1000,proofMs:2500});
  if(candidate.status==='accepted'){produced=candidate;break;}
  const label=candidate.reason+':'+(candidate.grade?.difficulty||'none');
  rejectedReasons[label]=(rejectedReasons[label]||0)+1;
}
console.log('Observed live 5x5 v6 generator rejection statistics',rejectedReasons);
assert(produced,'Actual random v6 pipeline must be able to publish at least one independently certified easy 5×5 puzzle');
assert.equal(produced.spec.verifiedBy,'cadical_reference_blocking_unsat_v1');
assert.equal(produced.grade.difficulty,'쉬움');
console.log('PASS real v6 random grid -> Adaptive easy classification -> CaDiCaL uniqueness -> publishable spec, seed '+produced.spec.seed);


assert.throws(()=>validateDatabaseUrl('https://malicious.example.com'));
assert.throws(()=>validateDatabaseUrl('http://demo.firebaseio.com'));
assert.equal(validateDatabaseUrl('https://demo.firebaseio.com'),'https://demo.firebaseio.com');
const keys=generateKeyPairSync('rsa',{modulusLength:2048});
const account={type:'service_account',client_email:'a@b.gserviceaccount.com',
  private_key:keys.privateKey.export({format:'pem',type:'pkcs8'})};
assert.equal(validateCredential(account).client_email,account.client_email);
const requests=[];
const fakeFetch=async(url,opts)=>{
  requests.push({uri:url.toString(),method:opts.method,headers:opts.headers,body:opts.body});
  return opts.method==='POST'?{ok:true,json:async()=>({access_token:'fake-token',expires_in:3600})}:
    {ok:true,json:async()=>({ok:true})};
};
const admin=makeAdminStore({serviceAccountJson:account,databaseUrl:'https://demo.firebaseio.com',fetchFn:fakeFetch});
await admin.create('randomPuzzleBank/10_보통/random-10-1-100',{verified:true});
assert(requests[1].uri.includes('access_token=fake-token'));
assert(requests[1].uri.includes('10_%EB%B3%B4%ED%86%B5'));
assert.equal(requests[1].headers['If-Match'],'null_etag');
console.log('PASS restricted service-account URL, OAuth JWT and conditional no-overwrite REST writes');

let savedRuleValue={rules:{'.read':false,'.write':false}};
let remoteEtag='"rules-v1"';
const etagHeaders=[];
const rulesFetch=async(uri,opts)=>{
  if(opts.method==='POST')return {ok:true,json:async()=>({access_token:'etag-test-token',expires_in:3600})};
  etagHeaders.push(opts.headers);
  if(opts.method==='GET')return {
    ok:true,headers:{get:key=>key.toLowerCase()==='etag'?remoteEtag:null},
    json:async()=>structuredClone(savedRuleValue)
  };
  if(opts.method==='PUT'){
    if(opts.headers['If-Match']!==remoteEtag)
      return {ok:false,status:412,json:async()=>structuredClone(savedRuleValue)};
    savedRuleValue=JSON.parse(opts.body);
    remoteEtag='"rules-v2"';
    return {ok:true,status:200,json:async()=>structuredClone(savedRuleValue)};
  }
  throw Error('Unexpected method '+opts.method);
};
const rulesAdmin=makeAdminStore({
  serviceAccountJson:account,databaseUrl:'https://demo.firebaseio.com',fetchFn:rulesFetch
});
const readWithTag=await rulesAdmin.getWithEtag('.settings/rules');
assert.equal(readWithTag.etag,'"rules-v1"');
assert.equal(etagHeaders[0]['X-Firebase-ETag'],'true');
assert.deepEqual(await rulesAdmin.putIfMatch('.settings/rules',readWithTag.value,readWithTag.etag),
  {written:true});
assert.equal(etagHeaders[1]['If-Match'],'"rules-v1"');
assert.deepEqual(await rulesAdmin.putIfMatch('.settings/rules',readWithTag.value,readWithTag.etag),
  {written:false});
await assert.rejects(
  rulesAdmin.putIfMatch('.settings/rules',readWithTag.value,'bad\netag'),/ETag/);
console.log('PASS Firebase ETag fetch, conditional rules PUT, conflict refusal and invalid tag rejection');


const approved=JSON.parse(readFileSync(new URL('../database.rules.json',import.meta.url),'utf8'));
assert.equal(assertLiveBankRules(JSON.stringify(approved),approved),true);
assert.doesNotThrow(()=>assertTargetAccount({type:'service_account',project_id:TARGET_PROJECT},TARGET_DATABASE_URL));
assert.throws(()=>assertTargetAccount({type:'service_account',project_id:'other-project'},TARGET_DATABASE_URL),/project/);
assert.throws(()=>assertTargetAccount({type:'service_account',project_id:TARGET_PROJECT},'https://other.firebaseio.com'),/endpoint/);
const overlyPermissive=structuredClone(approved);
overlyPermissive.rules['.read']=true;
assert.throws(()=>assertLiveBankRules(overlyPermissive,approved),/root/);
const missingBank=structuredClone(approved);
delete missingBank.rules.randomPuzzleBank;
assert.throws(()=>assertLiveBankRules(missingBank,approved),/randomPuzzleBank/);
const unsafeWrite=structuredClone(approved);
unsafeWrite.rules.randomPuzzleBank['$bucket']['.write']=true;
assert.throws(()=>assertLiveBankRules(unsafeWrite,approved),/randomPuzzleBank/);
console.log('PASS fail-closed production project and remote Firebase security-rules preflight');

const older=structuredClone(approved);
delete older.rules.userCompleted;
delete older.rules.randomPuzzleBank;
delete older.rules.randomRestockRequests;
// The production server has a newer multiplayer rooms policy than GitHub.
// That must be preserved byte-for-byte, not treated as a blocker or overwritten.
older.rules.rooms.metaProductionFlag={'.read':false,'.write':false};
const activationPlan=approveRulesActivation(older,approved);
assert.equal(activationPlan.alreadyUpdated,false);
assert.equal(activationPlan.changedNodes.length,3);
assert.deepEqual(activationPlan.merged.rules.rooms,older.rules.rooms);
const fakeRules=new Store({'.settings':{rules:older}});
const activated=await activateBankRules(fakeRules,{expected:approved});
assert.equal(activated.deployed,true);
assert.equal(assertLiveBankRules(await fakeRules.get('.settings/rules'),approved),true);
assert.deepEqual((await fakeRules.get('.settings/rules')).rules.rooms,older.rules.rooms,
  'Existing production rooms rules must be preserved');
const secondActivation=await activateBankRules(fakeRules,{expected:approved});
assert.equal(secondActivation.alreadyActive,true);
assert.equal(secondActivation.deployed,false,'Deploy exactly once when already active');
const unrelated=structuredClone(older);
unrelated.rules.privateAnswers={'.read':true,'.write':false};
const preservedPlan=approveRulesActivation(unrelated,approved);
assert.equal(preservedPlan.merged.rules.privateAnswers['.read'],true,
  'Unrelated remote rule is never silently replaced');
const openRoot=structuredClone(older);openRoot.rules['.read']=true;
assert.throws(()=>approveRulesActivation(openRoot,approved),/root/);
const concurrent=new Store({'.settings':{rules:older}});
concurrent.putIfMatch=async()=>{
  await concurrent.put('.settings/rules',{...older,rules:{...older.rules,roomSideEdit:true}});
  return {written:false};
};
await assert.rejects(activateBankRules(concurrent,{expected:approved}),/concurrently/);
assert.equal((await concurrent.get('.settings/rules')).rules.userCompleted,undefined,
  'Failed ETag precondition cannot partly activate rules');
console.log('PASS live rooms-rule preservation, only three bank subtrees changed, ETag concurrent-update protection, idempotent deployment');

const noTagStore=new Store({'.settings':{rules:older}});
noTagStore.getWithEtag=async path=>({value:await noTagStore.get(path),etag:null});
await assert.rejects(
  activateBankRules(noTagStore,{expected:approved}),/explicit operator-approved/);
assert.deepEqual(await noTagStore.get('.settings/rules'),older,
  'Missing ETag cannot silently trigger a full-rule overwrite');
const noTagOutcome=await activateBankRules(noTagStore,{
  expected:approved,allowUnversionedRulesWrite:true
});
assert.equal(noTagOutcome.deployed,true);
assert.equal(noTagOutcome.concurrencyProtection,'double_read_nonatomic');
assert.deepEqual((await noTagStore.get('.settings/rules')).rules.rooms,older.rules.rooms);
const staleReadStore=new Store({'.settings':{rules:older}});
const unmodifiedGet=staleReadStore.get.bind(staleReadStore);
let rulesReadCount=0;
staleReadStore.get=async path=>{
  if(path==='.settings/rules'&&++rulesReadCount===2){
    const modified=await unmodifiedGet(path);
    modified.rules.rooms.externalEdit={'.read':false};
    await staleReadStore.put(path,modified);
  }
  return unmodifiedGet(path);
};
staleReadStore.getWithEtag=async path=>({value:await staleReadStore.get(path),etag:null});
await assert.rejects(activateBankRules(staleReadStore,{
  expected:approved,allowUnversionedRulesWrite:true
}),/changed after the first read/);
assert.equal((await staleReadStore.get('.settings/rules')).rules.userCompleted,undefined);
console.log('PASS Firebase rules missing-ETag production fallback: explicit approval only, double-read conflict refusal and unrelated rooms preserved');



