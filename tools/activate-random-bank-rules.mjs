/* One-time, explicitly confirmed production RTDB rules activation.
 * Only the three random-bank/owner history subtrees may differ from the
 * reviewed repository rules. Never overwrite other independently edited rules.
 * Firebase rules PUT replaces the entire active ruleset; fail closed.
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
  if(!live?.rules||!desired?.rules)throw Error('Remote or local Firebase rules unavailable');
  // No new or changed rules may escape the small, explicitly scoped allowlist.
  const all=new Set([...Object.keys(live.rules),...Object.keys(desired.rules)]);
  for(const key of all){
    if(CHANGED_NODES.includes(key))continue;
    if(!eq(live.rules[key],desired.rules[key]))
      throw Error('Production Firebase rules differ outside random-bank paths at '+key+
        '; manual rules review is required, nothing deployed');
  }
  // The desired values must leave root rules closed, regardless of remote.
  if(desired.rules['.read']!==false||desired.rules['.write']!==false)
    throw Error('Proposed root security rules are not locked down');
  return {alreadyUpdated:eq(live,desired),changedNodes:CHANGED_NODES.filter(k=>!eq(live.rules[k],desired.rules[k]))};
}

export async function activateBankRules(store,{expected=JSON.parse(
  readFileSync(new URL('../database.rules.json',import.meta.url),'utf8'))}={}){
  let remote=await store.get('.settings/rules');
  let plan=approveRulesActivation(remote,expected);
  if(plan.alreadyUpdated)return {deployed:false,alreadyActive:true};
  // Recheck immediately before the all-rules PUT to catch ordinary races.
  const second=await store.get('.settings/rules');
  if(!eq(second,remote))throw Error('Live Firebase rules changed during activation; retry after review');
  await store.put('.settings/rules',expected);
  remote=await store.get('.settings/rules');
  assertLiveBankRules(remote,expected);
  return {deployed:true,alreadyActive:false,updatedRules:plan.changedNodes};
}
if(process.argv[1]&&import.meta.url.endsWith(process.argv[1].replaceAll('\\','/'))){
  if(process.env.CONFIRM_FIREBASE_PROJECT!==TARGET_PROJECT)
    throw Error('Explicit confirmation of the target Firebase project is required');
  const key=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if(!key)throw Error('Missing existing FIREBASE_SERVICE_ACCOUNT_JSON GitHub Actions secret');
  assertTargetAccount(validateCredential(key),validateDatabaseUrl(TARGET_DATABASE_URL));
  const store=makeAdminStore({serviceAccountJson:key,databaseUrl:TARGET_DATABASE_URL});
  const outcome=await activateBankRules(store);
  console.log(JSON.stringify({event:'verified_random_bank_rules_activation',...outcome}));
}
