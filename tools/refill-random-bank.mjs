/* Scheduled privileged inventory refill job.
 * Required GitHub Actions secrets:
 *   FIREBASE_SERVICE_ACCOUNT_JSON   Google service account JSON (full)
 *   FIREBASE_DATABASE_URL           https://...firebaseio.com or ...firebasedatabase.app
 * Do not use any client SDK / publish credentials to the website.
 */
import {makeAdminStore} from './random-bank-admin.mjs';
import {refill} from './random-bank-refill-core.mjs';

const credentials=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const databaseUrl=process.env.FIREBASE_DATABASE_URL;
if(!credentials||!databaseUrl)
  throw Error('Server refill disabled: configure FIREBASE_SERVICE_ACCOUNT_JSON and FIREBASE_DATABASE_URL as GitHub Actions secrets');
const store=makeAdminStore({serviceAccountJson:credentials,databaseUrl});
const integer=(key,fallback,max)=>{
  const value=Number(process.env[key]);
  return Number.isSafeInteger(value)&&value>=0?Math.min(value,max):fallback;
};
const result=await refill(store,{
  maxPublished:integer('RANDOM_BANK_MAX_PUBLISHED',12,100),
  maxAttempts:integer('RANDOM_BANK_MAX_ATTEMPTS',144,1000),
  maxMs:integer('RANDOM_BANK_MAX_MS',300000,900000),
  perBucketAttempts:integer('RANDOM_BANK_PER_BUCKET_ATTEMPTS',4,100),
  log:(name,details)=>console.log(JSON.stringify({event:name,...details}))
});
console.log(JSON.stringify({
  event:'refill_complete',
  published:result.published,attempts:result.attempts,
  bucketsVisited:result.visited,verifiedRestockRequests:result.verifiedRequests,
  rejectedRestockRequests:result.rejectedRequests,
  sweepComplete:result.complete
}));
