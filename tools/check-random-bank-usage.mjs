/* Server-only, read-only Firebase usage check.
 * Blocks the one-time burst if Monitoring permissions, samples or remaining
 * no-cost headroom cannot be verified. Never prints access tokens.
 */
import {appendFileSync} from 'node:fs';
import {makeAdminStore,validateCredential,validateDatabaseUrl} from './random-bank-admin.mjs';
import {assertTargetAccount,TARGET_DATABASE_URL} from './random-bank-live-rules.mjs';
import {readFirebaseUsage,usageReportMarkdown} from './random-bank-usage-metrics.mjs';

const note=message=>{
  if(process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(process.env.GITHUB_STEP_SUMMARY,message+'\n');
};
try{
  const credentials=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if(!credentials)throw Error('Existing FIREBASE_SERVICE_ACCOUNT_JSON GitHub Secret missing');
  assertTargetAccount(validateCredential(credentials),validateDatabaseUrl(TARGET_DATABASE_URL));
  const store=makeAdminStore({serviceAccountJson:credentials,databaseUrl:TARGET_DATABASE_URL});
  const report=await readFirebaseUsage({
    getAccessToken:store.getMonitoringAccessToken
  });
  note(usageReportMarkdown(report));
  console.log(JSON.stringify({
    event:'firebase_usage_check',safe:report.safe,reason:report.reason,
    storageUsedMB:report.storage?.usedMB??null,
    storageLimitMB:report.storage?.limitMB??null,
    storagePercent:report.storage?Number((report.storage.fraction*100).toFixed(2)):null,
    monthlyDownloadMB:report.downloads?.usedMB??null,
    downloadLimitMB:report.downloads?.limitMB??null,
    downloadPercent:report.downloads?Number((report.downloads.fraction*100).toFixed(2)):null,
    missing:report.missing??[]
  }));
  if(process.env.GITHUB_OUTPUT)
    appendFileSync(process.env.GITHUB_OUTPUT,'safe='+(report.safe?'true':'false')+'\n');
  if(!report.safe)process.exitCode=1;
}catch(error){
  // Do not print Google error bodies, credentials, or auth request URLs.
  const message=String(error?.message||error).slice(0,250);
  console.error('Firebase usage check FAILED CLOSED: '+message);
  note('## Firebase Realtime Database 사용량 확인 실패\n\n'+
    '현재 남은 사용량: **정보 없음**. 초기 집중 생성은 차단했습니다.\n\n'+
    '원인: '+message+'\n\n'+
    'Cloud Monitoring API 사용 가능 여부와 서비스 계정에 '+
    '\u0060roles/monitoring.viewer\u0060 읽기 권한이 있는지 확인하세요. '+
    '기존 무료 Spark 요금제를 Blaze로 변경할 필요는 없습니다.\n');
  process.exitCode=1;
}
