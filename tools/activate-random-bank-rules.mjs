/* One-time, explicitly confirmed production RTDB rules activation.
 * Merge only the three random-bank/owner history subtrees into the current
 * LIVE ruleset; preserve every preexisting unrelated rule, even when it
 * differs from GitHub's file. Prefer Firebase ETag CAS; a manual, non-atomic
 * read-diff-read fallback is possible only with explicit operator approval.
 */
import {readFileSync} from 'node:fs';
import {makeAdminStore,validateCredential,validateDatabaseUrl} from './random-bank-admin.mjs';
import {TARGET_PROJECT,TARGET_DATABASE_URL,assertTargetAccount,assertLiveBankRules} from './random-bank-live-rules.mjs';

export const CHANGED_NODES=Object.freeze([
  'userCompleted','randomPuzzleBank','randomRestockRequests'
]);
const normalize=value=>Array.isArray(value)?value.map(normalize):
  value&&typeof value==='object'?Object.fromEntries(
    Object.keys(value).sort().map(k=>[k,normalize(value[k])])):value;
const eq=(a,b)=>JSON.stringify(normalize(a))===JSON.stringify(normalize(b));

export function approveRulesActivation(remote,desired){
  const live=typeof remote==='string'?JSON.parse(remote):remote;
  if(!live?.rules||!desired?.rules||Array.isArray(live.rules)||
     typeof live.rules!=='object')throw Error('Remote or local Firebase rules unavailable');
  // Do not change any existing game/room/user rule. The active production
  // rules may legitimately differ from the checked-in snapshot.
  for(const key of ['.read','.write']){
    if(live.rules[key]!==false||desired.rules[key]!==false)
      throw Error('Production Firebase root '+key+' must remain denied');
  }
  const merged=structuredClone(live);
  const changedNodes=[];
  for(const key of CHANGED_NODES){
    const requested=desired.rules[key];
    if(!requested||typeof requested!=='object')
      throw Error('Required reviewed Firebase security rules missing at '+key);
    if(!eq(live.rules[key],requested))changedNodes.push(key);
    merged.rules[key]=structuredClone(requested);
  }
  for(const key of Object.keys(live.rules)){
    if(CHANGED_NODES.includes(key))continue;
    if(!eq(merged.rules[key],live.rules[key]))
      throw Error('Unrelated production Firebase rule changed unexpectedly: '+key);
  }
  return {alreadyUpdated:changedNodes.length===0,changedNodes,merged};
}
export async function activateBankRules(store,{expected=JSON.parse(
  readFileSync(new URL('../database.rules.json',import.meta.url),'utf8')),
  allowUnversionedRulesWrite=false
}={}){
  if(!store?.getWithEtag||!store?.putIfMatch||!store?.get||!store?.put)
    throw Error('Production rules activation requires a privileged Firebase adapter');
  const snapshot=await store.getWithEtag('.settings/rules');
  if(!snapshot||!snapshot.value)
    throw Error('Live Firebase security rules could not be read; refusing update');
  const plan=approveRulesActivation(snapshot.value,expected);
  if(plan.alreadyUpdated)return {deployed:false,alreadyActive:true};
  const atomic=typeof snapshot.etag==='string'&&snapshot.etag.length>0;
  if(atomic){
    // Preferred: Firebase rejects the write if a concurrent admin changed
    // anything after the snapshot was taken.
    const result=await store.putIfMatch('.settings/rules',plan.merged,snapshot.etag);
    if(result?.written!==true)
      throw Error('Production rules changed concurrently; aborted without overwriting');
  }else{
    // The special /.settings/rules endpoint was observed to return no ETag.
    // A plain PUT is not atomic with a concurrent console edit. This fallback
    // is ONLY permitted in the manually confirmed one-time activation job.
    if(!allowUnversionedRulesWrite)
      throw Error('Firebase did not return a rules ETag. Unversioned activation requires an explicit operator-approved one-time fallback');
    const second=await store.get('.settings/rules');
    if(!eq(second,snapshot.value))
      throw Error('Production rules changed after the first read; refusing unversioned deployment');
    // Copy the LIVE rules with ONLY our three target subtrees changed.
    await store.put('.settings/rules',plan.merged);
  }
  const deployed=await store.get('.settings/rules');
  assertLiveBankRules(deployed,expected);
  const live=typeof deployed==='string'?JSON.parse(deployed):deployed;
  for(const [key,value] of Object.entries(snapshot.value.rules))
    if(!CHANGED_NODES.includes(key)&&!eq(live.rules[key],value))
      throw Error('Unrelated production rule failed post-deployment verification at '+key);
  return {deployed:true,alreadyActive:false,updatedRules:plan.changedNodes,
    preservedExistingOtherRules:true,concurrencyProtection:atomic?'firebase_etag':'double_read_nonatomic'};
}
if(process.argv[1]&&import.meta.url.endsWith(process.argv[1].replaceAll('\\','/'))){
  if(process.env.CONFIRM_FIREBASE_PROJECT!==TARGET_PROJECT)
    throw Error('Explicit confirmation of the target Firebase project is required');
  const key=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if(!key)throw Error('Missing existing FIREBASE_SERVICE_ACCOUNT_JSON GitHub Actions secret');
  assertTargetAccount(validateCredential(key),validateDatabaseUrl(TARGET_DATABASE_URL));
  const store=makeAdminStore({serviceAccountJson:key,databaseUrl:TARGET_DATABASE_URL});
  const outcome=await activateBankRules(store,{
    allowUnversionedRulesWrite:process.env.ALLOW_FIREBASE_RULES_UNVERSIONED_UPDATE==='true'
  });
  console.log(JSON.stringify({event:'verified_random_bank_rules_activation',...outcome}));
}
