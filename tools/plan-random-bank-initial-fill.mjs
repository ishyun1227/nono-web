/* GitHub Actions planner for continuing initial stock auto-fill.
 * Uses the existing Firebase service account. It never activates rules,
 * changes the paid plan, or writes puzzles on its own. Generation occurs in
 * the separate bounded refill step only when understocked buckets remain.
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
  event:'initial_fill_plan',mode:plan.run?'burst':(plan.reason==='target_reached'?'normal_only':'paused'),
  reason:plan.reason,runs:plan.runs,remainingBuckets:plan.remainingBuckets,
  stalledRuns:plan.stalledRuns,
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
    '- 누적 집중 실행: '+plan.runs+'회\n'+
    '- 재고 100개 미만 분류: '+(plan.remainingBuckets??'미확인')+'\n'+
    (plan.totalDeficit!==undefined?'- 목표까지 부족한 퍼즐 수: '+plan.totalDeficit+'\n':'')+
    '- 연속 재고 증가 없음: '+(plan.stalledRuns??0)+' / 24회\n'+
    '- 36개 분류가 모두 100개이면 자동 종료, 24회 연속 증가가 없으면 자동 일시중지\n'+
    '- Spark의 정확한 실시간 무료 사용량은 자동 확인하지 못함. Firebase 콘솔에서 정기 확인 필요\n');
}
