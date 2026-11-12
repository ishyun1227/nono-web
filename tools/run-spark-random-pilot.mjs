/* One-time Spark-safe v6 random puzzle pilot, triggered by a dedicated
 * short GitHub Actions workflow. Uses ONLY the existing Firebase credential.
 *
 * Operator checked on 2026-11-12: RTDB 9.4 KB billed storage, 1.2 MB monthly
 * downloads, 5/100 connections. These figures are historical screenshots,
 * NOT automatically verified quotas. Never infer live quotas from them.
 *
 * This pilot intentionally DOES NOT call billable Cloud Monitoring. A
 * Firebase conditional marker guarantees at most one pilot execution.
 */
import {appendFileSync} from 'node:fs';
import {makeAdminStore,validateCredential,validateDatabaseUrl} from './random-bank-admin.mjs';
import {assertTargetAccount,checkLiveBankRules,TARGET_DATABASE_URL} from './random-bank-live-rules.mjs';
import {refill} from './random-bank-refill-core.mjs';
import {BUCKETS} from './random-bank-generator.mjs';

export const SPARK_PILOT_MARKER='randomBankControl/sparkPilot20261112';
export const SPARK_PILOT_BUCKET_KEYS=Object.freeze([
  '5_쉬움','10_쉬움','10_보통','15_쉬움','15_보통','20_어려움'
]);
export const SPARK_PILOT_LIMITS=Object.freeze({
  maxPublished:10,maxAttempts:240,maxMs:120000,perBucketAttempts:40
});
export function eligiblePilotBuckets(counts){
  const lookup=new Map(BUCKETS.map(b=>[b.key,b]));
  return SPARK_PILOT_BUCKET_KEYS.filter(key=>
    Number.isSafeInteger(counts?.[key])&&counts[key]>=0&&counts[key]<100
  ).map(key=>lookup.get(key));
}
const note=text=>{
  if(process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(process.env.GITHUB_STEP_SUMMARY,text+'\n');
};
export async function runSparkPilot(store,{
  now=Date.now,runRefill=refill
}={}){
  if(!store?.get||!store?.put||!store?.create||!store?.remove||!store?.keys)
    throw Error('Privileged Firebase store with shallow key reads is required');
  // Never touch an existing claim: no cron or repeated workflow run can
  // accidentally double production activity.
  if(await store.get(SPARK_PILOT_MARKER)!==null){
    return {status:'already_claimed',published:0,attempts:0};
  }
  const counts={};
  for(const key of SPARK_PILOT_BUCKET_KEYS){
    const names=await store.keys('randomPuzzleBank/'+key);
    if(!Array.isArray(names))throw Error('Invalid Firebase shallow inventory response');
    counts[key]=names.length;
  }
  const buckets=eligiblePilotBuckets(counts);
  if(!buckets.length)return {status:'all_selected_buckets_full',published:0,attempts:0,counts};
  const claimedAt=now();
  const claim={state:'claimed',claimedAt,scope:'six_small_size_difficulty_buckets',
    ...SPARK_PILOT_LIMITS,snapshotDate:'2026-11-12',snapshotType:'operator_console_only'};
  const created=await store.create(SPARK_PILOT_MARKER,claim);
  if(!created?.created)return {status:'claimed_concurrently',published:0,attempts:0,counts};
  let result;
  try{
    result=await runRefill(store,{buckets,...SPARK_PILOT_LIMITS,
      now,log:(event,details)=>console.log(JSON.stringify({event,...details}))});
    await store.put(SPARK_PILOT_MARKER,{...claim,state:'finished',
      finishedAt:now(),published:result.published,attempts:result.attempts,
      bucketsVisited:result.visited});
  }catch(error){
    try{
      await store.put(SPARK_PILOT_MARKER,{...claim,state:'failed',
        finishedAt:now(),reason:'pilot_runtime_error'});
    }catch{}
    throw error;
  }
  return {status:'finished',published:result.published,attempts:result.attempts,
    visited:result.visited,counts,
    results:result.results.filter(r=>r.attempted>0).map(r=>({
      bucket:r.bucket,before:r.before,after:r.after,attempted:r.attempted,
      accepted:r.accepted,failed:r.failed
    }))};
}

if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
  try{
    const credentials=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if(!credentials)throw Error('Existing FIREBASE_SERVICE_ACCOUNT_JSON secret is not configured');
    assertTargetAccount(validateCredential(credentials),validateDatabaseUrl(TARGET_DATABASE_URL));
    const store=makeAdminStore({serviceAccountJson:credentials,databaseUrl:TARGET_DATABASE_URL});
    // Safety: do not change live RTDB rules; fail if not equal to reviewed rules.
    await checkLiveBankRules(store);
    console.log(JSON.stringify({event:'pilot_safety_preflight_passed',project:'verified',rules:'verified'}));
    const result=await runSparkPilot(store);
    const lines=[
      '## Spark 무료 요금제: 1회 시험 퍼즐 생성',
      '',
      '**실시간 Firebase 사용량: 자동 조회하지 못함.**',
      '2026-11-12 사용자가 Firebase Console에서 저장량 약 9.4 KB, 월 다운로드 약 1.2 MB를 확인한 뒤, 이 1회 제한 시험을 승인했습니다.',
      '',
      '- 결과: '+result.status,
      '- 실제 저장: '+result.published+'개 (상한 10개)',
      '- 후보 시도: '+result.attempts+'회 (상한 240회)',
      '- 생성 시간 상한: 120초',
      '- 대상: '+SPARK_PILOT_BUCKET_KEYS.join(', '),
      ''
    ];
    if(result.results?.length){
      lines.push('| 종류 | 전 재고 | 후 재고 | 시도 | 신규 저장 | 실패 |',
        '|---|---:|---:|---:|---:|---:|');
      for(const row of result.results)
        lines.push('| '+row.bucket+' | '+row.before+' | '+row.after+
          ' | '+row.attempted+' | '+row.accepted+' | '+row.failed+' |');
      lines.push('');
    }
    note(lines.join('\n'));
    console.log(JSON.stringify({
      event:'spark_pilot_complete',status:result.status,
      published:result.published,attempts:result.attempts,
      bucketResults:result.results||[]
    }));
  }catch(error){
    // Never display service account material, access tokens or raw responses.
    console.error(JSON.stringify({event:'spark_pilot_failed',
      message:String(error?.message||error).slice(0,250)}));
    note('## Spark 1회 시험 생성 실패\n\n운영 데이터베이스의 인증/보안 규칙/저장 동작을 확인해야 합니다.\n');
    process.exitCode=1;
  }
}
