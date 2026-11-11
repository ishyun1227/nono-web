/* GitHub Actions guard for the ONE-TIME initial puzzle stock burst.
 * Uses the existing Firebase service account. It never activates rules,
 * changes the paid plan, or writes puzzles on its own.
 */
import {appendFileSync} from 'node:fs';
import {makeAdminStore,validateCredential,validateDatabaseUrl} from './random-bank-admin.mjs';
import {assertTargetAccount,checkLiveBankRules,TARGET_DATABASE_URL} from './random-bank-live-rules.mjs';
import {planInitialFill} from './random-bank-initial-fill-core.mjs';

const credentials=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if(!credentials)throw Error('Existing Firebase service account secret is required');
assertTargetAccount(validateCredential(credentials),validateDatabaseUrl(TARGET_DATABASE_URL));
const store=makeAdminStore({serviceAccountJson:credentials,databaseUrl:TARGET_DATABASE_URL});
// All live security rules must be safe BEFORE attempting any initial-fill writes.
await checkLiveBankRules(store);
const plan=await planInitialFill(store);
console.log(JSON.stringify({
  event:'initial_fill_plan',mode:plan.run?'burst':'normal_only',
  reason:plan.reason,runs:plan.runs,remainingBuckets:plan.remainingBuckets,
  totalDeficit:plan.totalDeficit??null
}));
if(process.env.GITHUB_OUTPUT){
  appendFileSync(process.env.GITHUB_OUTPUT,
    'run='+(plan.run?'true':'false')+'\n'+
    'buckets='+(plan.bucketKeys?.join(',')||'')+'\n');
}
if(process.env.GITHUB_STEP_SUMMARY){
  appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    '## 초기 퍼즐 집중 생성\n\n'+
    '- 실행: **'+(plan.run?'집중 생성':'일반 모드만 유지')+'**\n'+
    '- 사유: '+plan.reason+'\n'+
    '- 누적 집중 실행 예약: '+plan.runs+' / 168\n'+
    '- 재고 100개 미만 분류: '+(plan.remainingBuckets??'미확인')+'\n'+
    (plan.totalDeficit!==undefined?'- 목표까지 부족한 퍼즐 수: '+plan.totalDeficit+'\n':'')+
    '- 최초 실행 후 최대 7일 또는 168회에 자동 종료\n');
}
