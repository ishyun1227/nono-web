/* Verify production Realtime Database access before a privileged refill.
 * Never deploy or overwrite remote security rules from the hourly generator:
 * Firebase's rules REST PUT replaces the whole active ruleset.
 */
import {readFileSync} from 'node:fs';

export const TARGET_PROJECT='nono-web-ishyun-20261020';
export const TARGET_DATABASE_URL='https://nono-web-ishyun-20261020-default-rtdb.asia-southeast1.firebasedatabase.app';
const SECURITY_NODES=['userCompleted','randomPuzzleBank','randomRestockRequests'];
const stable=value=>Array.isArray(value)
  ?value.map(stable)
  :value&&typeof value==='object'
    ?Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])]))
    :value;

export function assertTargetAccount(account,origin){
  if(account?.type!=='service_account'||account.project_id!==TARGET_PROJECT)
    throw Error('Production random bank service-account project does not match the configured Firebase project');
  if(origin!==TARGET_DATABASE_URL)
    throw Error('Production random bank database endpoint does not match the configured Firebase project database');
}

export function assertLiveBankRules(remote,expected){
  const actual=typeof remote==='string'?JSON.parse(remote):remote;
  if(!actual?.rules||!expected?.rules)
    throw Error('Cannot validate live Firebase Realtime Database security rules');
  for(const key of ['.read','.write']){
    if(actual.rules[key]!==false||expected.rules[key]!==false)
      throw Error('Live Firebase root security rule is not locked down: '+key);
  }
  for(const key of SECURITY_NODES){
    if(!actual.rules[key]||JSON.stringify(stable(actual.rules[key]))!==
         JSON.stringify(stable(expected.rules[key])))
      throw Error('Live Firebase security rule for '+key+' differs from the tested repository rules; deploy reviewed rules before refilling');
  }
  return true;
}

export async function checkLiveBankRules(store,{
  expected=JSON.parse(readFileSync(new URL('../database.rules.json',import.meta.url),'utf8'))
}={}){
  const live=await store.get('.settings/rules');
  return assertLiveBankRules(live,expected);
}
