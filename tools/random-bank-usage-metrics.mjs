/* Read-only Cloud Monitoring quota guard for the existing Firebase RTDB.
 * Use the project's own (one) Realtime Database namespace. Metric data may lag
 * behind live billing; the 80% safety threshold deliberately leaves headroom.
 * Missing, stale or ambiguous metrics MUST stop an initial stock burst.
 */
import {TARGET_PROJECT,TARGET_DATABASE_URL} from './random-bank-live-rules.mjs';

export const LIMIT_RATIO=0.80;
export const SPARK_STORAGE_BYTES=1_000_000_000; // Conservative decimal GB.
export const SPARK_MONTHLY_DOWNLOAD_BYTES=10_000_000_000;
export const EXPECTED_NAMESPACE=new URL(TARGET_DATABASE_URL).hostname.split('.')[0];
const TYPE_PREFIX='firebasedatabase.googleapis.com/';
const METRICS=Object.freeze({
  storageUsed:{type:'storage/total_bytes',maxAgeMs:60*60*60*1000},
  storageLimit:{type:'storage/limit',maxAgeMs:4*60*60*1000},
  monthlyDownload:{type:'network/monthly_sent',maxAgeMs:4*60*60*1000},
  monthlyLimit:{type:'network/monthly_sent_limit',maxAgeMs:4*60*60*1000}
});
const MAX_SERIES_PAGES=5;
const LOOKBACK_MS=72*60*60*1000;
const formatNumber=value=>Math.round(value/1_000_000*100)/100;
function safeNumber(raw){
  if(typeof raw!=='string'&&typeof raw!=='number')return null;
  if(!/^(0|[1-9]\d*)$/.test(String(raw)))return null;
  const n=Number(raw);
  return Number.isSafeInteger(n)&&n>=0?n:null;
}
export function pickMetricSample(series,definition,{
  now=Date.now(),namespace=EXPECTED_NAMESPACE,project=TARGET_PROJECT
}={}){
  if(!Array.isArray(series))return null;
  let best=null;
  for(const item of series){
    if(item?.metric?.type!==TYPE_PREFIX+definition.type||
       item?.resource?.type!=='firebase_namespace'||
       item?.resource?.labels?.table_name!==namespace||
       item?.resource?.labels?.project_id!==project)continue;
    for(const point of item.points||[]){
      const at=Date.parse(point?.interval?.endTime);
      const bytes=safeNumber(point?.value?.int64Value);
      if(bytes===null||!Number.isFinite(at)||at>now||at<now-definition.maxAgeMs)
        continue;
      if(!best||at>best.at)best={bytes,at,sampledAt:new Date(at).toISOString()};
    }
  }
  return best;
}
export function evaluateUsage(samples,{ratio=LIMIT_RATIO}={}){
  if(ratio!==LIMIT_RATIO)throw Error('The initial fill safety threshold is fixed');
  const missing=Object.keys(METRICS).filter(key=>!samples?.[key]);
  if(missing.length)return {safe:false,reason:'missing_or_stale_metrics',missing};
  const storageLimit=Math.min(samples.storageLimit.bytes,SPARK_STORAGE_BYTES);
  const downloadLimit=Math.min(samples.monthlyLimit.bytes,SPARK_MONTHLY_DOWNLOAD_BYTES);
  if(storageLimit<=0||downloadLimit<=0)return {
    safe:false,reason:'invalid_metric_limits',missing:[]
  };
  const storage={usedBytes:samples.storageUsed.bytes,limitBytes:storageLimit,
    usedMB:formatNumber(samples.storageUsed.bytes),limitMB:formatNumber(storageLimit),
    fraction:samples.storageUsed.bytes/storageLimit,
    sampledAt:samples.storageUsed.sampledAt};
  const downloads={usedBytes:samples.monthlyDownload.bytes,limitBytes:downloadLimit,
    usedMB:formatNumber(samples.monthlyDownload.bytes),limitMB:formatNumber(downloadLimit),
    fraction:samples.monthlyDownload.bytes/downloadLimit,
    sampledAt:samples.monthlyDownload.sampledAt};
  const blockers=[];
  if(storage.fraction>=ratio)blockers.push('storage_80pct');
  if(downloads.fraction>=ratio)blockers.push('downloads_80pct');
  return {safe:!blockers.length,reason:blockers.length?'near_spark_limit':'below_80pct',
    blockers,storage,downloads,thresholdPct:ratio*100};
}
// Classify provider errors without echoing the response body: Google may
// include account details, links or request identifiers in its message.
const KNOWN_GOOGLE_ERROR_REASONS=new Set([
  'BILLING_DISABLED','BILLING_NOT_ENABLED','BILLING_ACCOUNT_DISABLED',
  'SERVICE_DISABLED','API_DISABLED','SERVICE_USAGE_DISABLED',
  'IAM_PERMISSION_DENIED','ACCESS_TOKEN_SCOPE_INSUFFICIENT',
  'CONSUMER_INVALID','CONSUMER_SUSPENDED','RATE_LIMIT_EXCEEDED',
  'QUOTA_EXCEEDED','PERMISSION_DENIED'
]);
export function classifyMonitoringFailure(status,payload){
  const error=payload?.error&&typeof payload.error==='object'?payload.error:{};
  const info=Array.isArray(error.details)?error.details.find(item=>
    typeof item?.reason==='string' &&
    KNOWN_GOOGLE_ERROR_REASONS.has(item.reason.toUpperCase())):null;
  const reason=info?.reason?.toUpperCase()||null;
  const message=typeof error.message==='string'?error.message.toLowerCase():'';
  let category='unclassified_api_failure';
  if(reason?.startsWith('BILLING') ||
     /billing (?:account |must be |is |to be )?(?:enabled|disabled|suspend|required)|requires billing|billing check failed|enable billing/.test(message)){
    category='billing_not_enabled_or_restricted';
  }else if(['SERVICE_DISABLED','API_DISABLED','SERVICE_USAGE_DISABLED'].includes(reason)||
     /api (?:has not been used|is disabled)|service .*disabled/.test(message)){
    category='monitoring_api_disabled';
  }else if(reason==='ACCESS_TOKEN_SCOPE_INSUFFICIENT'||
     /insufficient authentication scopes/.test(message)){
    category='token_scope_missing';
  }else if(reason==='IAM_PERMISSION_DENIED' ||
     /permission monitoring\.timeseries\.list|permission denied on resource/.test(message)){
    category='monitoring_iam_or_project_restriction';
  }else if(reason==='CONSUMER_INVALID'||reason==='CONSUMER_SUSPENDED'){
    category='project_consumer_restricted';
  }else if(status===403){
    category='access_denied_unknown_cause';
  }else if(status===429||reason==='QUOTA_EXCEEDED'||reason==='RATE_LIMIT_EXCEEDED'){
    category='monitoring_request_rate_limited';
  }
  const guidance={
    billing_not_enabled_or_restricted:
      'Cloud Monitoring에서 결제 계정 연결을 요구하는 것일 수 있습니다. Spark 요금제를 자동으로 바꾸지 않습니다. Firebase 콘솔의 사용량 탭으로 확인하세요.',
    monitoring_api_disabled:
      'Cloud Monitoring API의 활성화 상태와 실제 호출 프로젝트를 확인하세요.',
    token_scope_missing:
      '서비스 계정 OAuth 토큰의 monitoring.read 범위가 필요한 상태입니다. GitHub 최신 main 코드를 사용했는지 확인하세요.',
    monitoring_iam_or_project_restriction:
      'GitHub에 저장된 서비스 계정이 IAM에서 확인한 모니터링 뷰어 계정과 동일한지 확인하세요.',
    project_consumer_restricted:
      '프로젝트 API 소비자 설정 또는 조직 정책 제한을 확인하세요.',
    access_denied_unknown_cause:
      '403의 상세 원인을 아직 확정할 수 없습니다. 서비스 계정 일치 여부, 프로젝트 정책과 결제 상태를 확인하세요.',
    monitoring_request_rate_limited:
      'Cloud Monitoring 요청 한도에 걸렸습니다. 반복 실행을 피하세요.',
    unclassified_api_failure:
      'Cloud Monitoring 호출에 실패했습니다. 상태코드와 API 설정을 확인하세요.'
  }[category];
  return {status:Number.isInteger(status)?status:null,category,
    providerReason:reason,providerStatus:
      typeof error.status==='string'&&/^[A-Z_]{1,50}$/.test(error.status)
        ?error.status:null,
    guidance};
}
async function safeMonitoringFailure(response,metric){
  let payload=null;
  // Never log raw response text. Parse structured error fields only.
  try{
    const contentType=response.headers?.get?.('content-type')||'';
    if(contentType&& !/json/i.test(contentType))throw Error('Non-JSON error');
    payload=await response.json();
  }catch{}
  const diagnostic=classifyMonitoringFailure(response.status,payload);
  const error=new Error('Cloud Monitoring HTTP '+diagnostic.status+
    ' metric='+metric+' category='+diagnostic.category+
    (diagnostic.providerReason?' providerReason='+diagnostic.providerReason:''));
  error.diagnostic=diagnostic;
  return error;
}
export async function readFirebaseUsage({
  getAccessToken,fetchFn=fetch,now=Date.now(),
  project=TARGET_PROJECT,namespace=EXPECTED_NAMESPACE
}={}){
  if(project!==TARGET_PROJECT||namespace!==EXPECTED_NAMESPACE)
    throw Error('Usage metrics query is restricted to the reviewed Firebase project');
  if(typeof getAccessToken!=='function'||typeof fetchFn!=='function')
    throw Error('A privileged token provider and fetch are required');
  const token=await getAccessToken();
  if(typeof token!=='string'||!token)throw Error('Google monitoring OAuth token is unavailable');
  const samples={};
  for(const [name,definition] of Object.entries(METRICS)){
    const url=new URL('https://monitoring.googleapis.com/v3/projects/'+project+'/timeSeries');
    url.searchParams.set('filter',
      'metric.type = "'+TYPE_PREFIX+definition.type+
      '" AND resource.type = "firebase_namespace"'+
      ' AND resource.labels.project_id = "'+project+'"'+
      ' AND resource.labels.table_name = "'+namespace+'"');
    url.searchParams.set('interval.startTime',new Date(now-LOOKBACK_MS).toISOString());
    url.searchParams.set('interval.endTime',new Date(now).toISOString());
    url.searchParams.set('view','FULL');
    url.searchParams.set('pageSize','500');
    const series=[];
    let pageToken='',pages=0;
    do{
      if(++pages>MAX_SERIES_PAGES)
        throw Error('Cloud Monitoring returned too many result pages');
      if(pageToken)url.searchParams.set('pageToken',pageToken);
      else url.searchParams.delete('pageToken');
      const response=await fetchFn(url,{
        method:'GET',headers:{Authorization:'Bearer '+token,Accept:'application/json'}
      });
      // Keep only whitelisted, structured diagnostics. Never expose tokens or raw bodies.
      if(!response.ok)throw await safeMonitoringFailure(response,definition.type);
      const body=await response.json();
      if(!Array.isArray(body?.timeSeries)&&body?.timeSeries!==undefined)
        throw Error('Malformed Cloud Monitoring time series');
      series.push(...(body.timeSeries||[]));
      pageToken=body.nextPageToken||'';
      if(typeof pageToken!=='string')throw Error('Invalid Monitoring page token');
    }while(pageToken);
    samples[name]=pickMetricSample(series,definition,{now,project,namespace});
  }
  return evaluateUsage(samples);
}
export function usageReportMarkdown(result){
  const lines=['## Firebase Realtime Database 무료 한도 점검','',
    '프로젝트: '+TARGET_PROJECT+' · 데이터베이스: '+EXPECTED_NAMESPACE,'',
    'Cloud Monitoring 측정값은 지연될 수 있으며 최종 청구 수치가 아닙니다.',''];
  if(result?.storage&&result?.downloads){
    lines.push('| 항목 | 측정 사용량 | 보수적 무료 한도 | 사용 비율 | 측정 시각 (UTC) |',
      '|---|---:|---:|---:|---|');
    for(const [label,entry] of [['저장공간',result.storage],['이달 다운로드',result.downloads]])
      lines.push('| '+label+' | '+entry.usedMB+' MB | '+entry.limitMB+' MB | '+
        (entry.fraction*100).toFixed(2)+'% | '+entry.sampledAt+' |');
    lines.push('');
  }
  lines.push('**집중 생성: '+(result?.safe?'허용 (80% 미만)':'차단')+'**',
    '판정: '+(result?.reason||'unknown'));
  if(result?.missing?.length)lines.push('측정 누락/지연: '+result.missing.join(', '));
  if(result?.blockers?.length)lines.push('한도 경고: '+result.blockers.join(', '));
  lines.push('','조회 또는 권한 오류로 측정할 수 없으면 실제 남은 사용량은 정보 없음으로 간주하고 생성하지 않습니다.','');
  return lines.join('\n');
}
