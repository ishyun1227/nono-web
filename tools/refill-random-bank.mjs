/* Scheduled privileged inventory refill job.
 * Required GitHub Actions secrets:
 *   FIREBASE_SERVICE_ACCOUNT_JSON   repository's existing Firebase server key
 * The Firebase database URL is pinned to the reviewed website configuration.
 * Do not use any client SDK / publish credentials to the website.
 */
import {makeAdminStore,validateCredential,validateDatabaseUrl} from './random-bank-admin.mjs';
import {assertTargetAccount,checkLiveBankRules,TARGET_DATABASE_URL} from './random-bank-live-rules.mjs';
import {refill} from './random-bank-refill-core.mjs';

const credentials=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const databaseUrl=TARGET_DATABASE_URL;
if(!credentials)
  throw Error('Server refill disabled: existing FIREBASE_SERVICE_ACCOUNT_JSON GitHub Actions secret was not provided');
assertTargetAccount(validateCredential(credentials),validateDatabaseUrl(databaseUrl));
const store=makeAdminStore({serviceAccountJson:credentials,databaseUrl});
await checkLiveBankRules(store);
console.log(JSON.stringify({event:'production_security_preflight_passed',rules:'verified',project:'verified'}));
const integer=(key,fallback,max)=>{
  const value=Number(process.env[key]);
  return Number.isSafeInteger(value)&&value>=0?Math.min(value,max):fallback;
};
const result=await refill(store,{
  maxPublished:integer('RANDOM_BANK_MAX_PUBLISHED',12,100),
  maxAttempts:integer('RANDOM_BANK_MAX_ATTEMPTS',1200,5000),
  maxMs:integer('RANDOM_BANK_MAX_MS',300000,900000),
  perBucketAttempts:integer('RANDOM_BANK_PER_BUCKET_ATTEMPTS',0,1000),
  log:(name,details)=>console.log(JSON.stringify({event:name,...details}))
});
console.log(JSON.stringify({
  event:'refill_complete',
  published:result.published,attempts:result.attempts,
  bucketsVisited:result.visited,verifiedRestockRequests:result.verifiedRequests,
  rejectedRestockRequests:result.rejectedRequests,
  sweepComplete:result.complete
}));
