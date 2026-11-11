/* Server-only, read-only Firebase usage check.
 * Blocks the one-time burst if Monitoring permissions, samples or remaining
 * no-cost headroom cannot be verified. Never prints access tokens.
 */
import {appendFileSync} from 'node:fs';
import {makeAdminStore,validateCredential,validateDatabaseUrl} from './random-bank-admin.mjs';
import {assertTargetAccount,TARGET_DATABASE_URL} from './random-bank-live-rules.mjs';
import {readFirebaseUsage,usageReportMarkdown} from './random-bank-usage-metrics.mjs';

// This principal was confirmed in the project's IAM console. Never output
// the private key or the service-account JSON value.
const EXPECTED_IAM_PRINCIPAL='firebase-adminsdk-fbsvc@nono-web-ishyun-20261020.iam.gserviceaccount.com';
const note=message=>{
  if(process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(process.env.GITHUB_STEP_SUMMARY,message+'\n');
};
try{
  const credentials=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if(!credentials)throw Error('Existing FIREBASE_SERVICE_ACCOUNT_JSON GitHub Secret missing');
  const account=validateCredential(credentials);
  assertTargetAccount(account,validateDatabaseUrl(TARGET_DATABASE_URL));
  if(account.client_email!==EXPECTED_IAM_PRINCIPAL)
    throw Error('GitHub Firebase secret uses a different principal from the IAM Monitoring Viewer account');
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
  // The Monitoring SDK never exposes arbitrary provider error messages here.
  // Surface only the controlled diagnostic category and whitelisted reason.
  const diagnostic=error?.diagnostic;
  const category=diagnostic?.category||
    (String(error?.message||'').includes('different principal')
      ?'github_service_account_mismatch':'usage_check_configuration_or_network_error');
  const reason=diagnostic?.providerReason||null;
  const guidance=diagnostic?.guidance||
    (category==='github_service_account_mismatch'
      ?'GitHub의 FIREBASE_SERVICE_ACCOUNT_JSON이 IAM에서 확인한 서비스 계정과 다릅니다. 키를 채팅으로 공유하지 말고 GitHub 비밀정보를 점검하세요.'
      :'GitHub Actions의 인증·연결·Cloud Monitoring 설정을 확인하세요.');
  console.error(JSON.stringify({
    event:'firebase_usage_check_failed',category,
    httpStatus:diagnostic?.status??null,
    providerReason:reason
  }));
  note('## Firebase Realtime Database 사용량 확인 실패\n\n'+
    '현재 남은 사용량: **정보 없음**. 초기 집중 생성은 차단했습니다.\n\n'+
    '- 오류 분류: '+category+'\n'+
    (diagnostic?.status?'- HTTP 상태: '+diagnostic.status+'\n':'')+
    (reason?'- Google 오류 코드: '+reason+'\n':'')+
    '- 권장 확인: '+guidance+'\n\n'+
    '확인된 IAM 계정: '+EXPECTED_IAM_PRINCIPAL+'\n\n'+
    '사용량과 원인을 검증하기 전에는 Spark에서 Blaze로 변경하거나 집중 생성 차단을 해제하지 않습니다.\n');
  process.exitCode=1;
}
