/* Scheduled privileged inventory refill job.
 * Required GitHub Actions secrets:
 *   FIREBASE_SERVICE_ACCOUNT_JSON   repository's existing Firebase server key
 * The Firebase database URL is pinned to the reviewed website configuration.
 * Do not use any client SDK / publish credentials to the website.
 */
import {makeAdminStore,validateCredential,validateDatabaseUrl} from './random-bank-admin.mjs';
import {assertTargetAccount,checkLiveBankRules,TARGET_DATABASE_URL} from './random-bank-live-rules.mjs';
import {refill} from './random-bank-refill-core.mjs';
import {appendFileSync} from 'node:fs';

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

const tracked=result.results.filter(entry=>entry.cumulative);
const stepSummary=process.env.GITHUB_STEP_SUMMARY;
if(stepSummary){
  const rows=tracked.map(entry=>{
    const parts=entry.bucket.split('_');
    const stats=entry.cumulative;
    const primary=Object.entries(stats.failures||{}).sort((a,b)=>b[1]-a[1])[0];
    return [
      parts[0]+'×'+parts[0],parts[1],entry.after+'/'+entry.target,
      stats.attempts,stats.published,stats.successRatePct+'%',
      stats.avgMsPerPublished===null?'아직 성공 없음':stats.avgMsPerPublished+' ms',
      primary?primary[0]+' ('+primary[1]+')':'없음'
    ];
  });
  const markdown=[
    '## 랜덤 퍼즐 자동 생성: 누적 통계',
    '',
    '기준: 이번 실행에서 시도한 분류만 표시. 값은 해당 분류의 **기록 시작 이후 누적**이며, 과거 로그는 소급 집계하지 않습니다.',
    '',
    '| 크기 | 난이도 | 현재 재고 / 목표 | 누적 시도 | 누적 저장 | 성공률 | 퍼즐 1개당 소요시간(실패 포함) | 최다 실패 원인 |',
    '|---|---|---:|---:|---:|---:|---:|---|',
    ...(rows.length?rows.map(row=>'| '+row.join(' | ')+' |'):
      ['| - | - | - | - | - | - | - | 이번 실행에서 생성 시도가 없었음 |']),
    '',
    '전체 36개 분류의 누적 상세 기록은 비공개 Firebase RTDB \u0060randomBankStats/{size}_{difficulty}\u0060에 저장됩니다.',
    ''
  ].join('\n');
  appendFileSync(stepSummary,markdown+'\n');
}
console.log(JSON.stringify({
  event:'refill_complete',
  published:result.published,attempts:result.attempts,
  bucketsVisited:result.visited,verifiedRestockRequests:result.verifiedRequests,
  rejectedRestockRequests:result.rejectedRequests,
  sweepComplete:result.complete
}));
