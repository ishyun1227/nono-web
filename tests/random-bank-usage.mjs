/* No credentials: pure quota decisions plus Cloud Monitoring HTTP mock.
 * Live Firebase / Google Cloud APIs are never contacted.
 */
import assert from 'node:assert/strict';
import {EXPECTED_NAMESPACE,LIMIT_RATIO,SPARK_STORAGE_BYTES,
  SPARK_MONTHLY_DOWNLOAD_BYTES,evaluateUsage,pickMetricSample,
  readFirebaseUsage,usageReportMarkdown,classifyMonitoringFailure} from '../tools/random-bank-usage-metrics.mjs';
import {TARGET_PROJECT} from '../tools/random-bank-live-rules.mjs';
const now=Date.parse('2026-11-11T06:00:00Z');
const sample=(value,time=now-60*60*1000)=>({
  bytes:value,at:time,sampledAt:new Date(time).toISOString()
});
const normal={
  storageUsed:sample(100_000_000),storageLimit:sample(1_000_000_000),
  monthlyDownload:sample(2_000_000_000),monthlyLimit:sample(10_000_000_000)
};
let result=evaluateUsage(normal);
assert.equal(result.safe,true);
assert.equal(result.storage.fraction,0.1);
assert.equal(result.downloads.fraction,0.2);
assert.match(usageReportMarkdown(result),/저장공간/);
assert.match(usageReportMarkdown(result),/이달 다운로드/);
assert.equal(evaluateUsage({...normal,storageUsed:sample(800_000_000)}).safe,false);
assert.equal(evaluateUsage({...normal,monthlyDownload:sample(8_000_000_000)}).safe,false);
assert.equal(evaluateUsage({...normal,monthlyLimit:sample(0)}).safe,false);
assert.equal(evaluateUsage({...normal,storageUsed:null}).safe,false);
assert.equal(evaluateUsage({...normal,storageLimit:sample(100_000_000_000),
  storageUsed:sample(850_000_000)}).safe,false,
  'Never exceed fixed Spark free cap even if the provider reports a bigger limit');
assert.equal(LIMIT_RATIO,0.8);
assert.equal(SPARK_STORAGE_BYTES,1_000_000_000);
assert.equal(SPARK_MONTHLY_DOWNLOAD_BYTES,10_000_000_000);
console.log('PASS 80% quota headroom and Spark no-cost clamps');

const point=(type,value,at,namespace=EXPECTED_NAMESPACE)=>({
  metric:{type:'firebasedatabase.googleapis.com/'+type},
  resource:{type:'firebase_namespace',labels:{
    table_name:namespace,project_id:TARGET_PROJECT,location:'asia-southeast1'}},
  points:[{value:{int64Value:String(value)},interval:{
    startTime:new Date(at).toISOString(),endTime:new Date(at).toISOString()}}]
});
const definition={type:'storage/total_bytes',maxAgeMs:60*60*60*1000};
assert.equal(pickMetricSample([point(definition.type,12345,now-3600000)],definition,{now}).bytes,12345);
assert.equal(pickMetricSample([point(definition.type,12345,now-70*3600000)],definition,{now}),null);
assert.equal(pickMetricSample([point(definition.type,12345,now-3600000,'another-db')],definition,{now}),null);
assert.equal(pickMetricSample([point(definition.type,-5,now-3600000)],definition,{now}),null);
assert.equal(pickMetricSample([point(definition.type,12345,now+60000)],definition,{now}),null);
console.log('PASS rejects wrong namespace, stale, future and invalid Monitoring samples');

const used={
  'storage/total_bytes':200_000_000,'storage/limit':1_000_000_000,
  'network/monthly_sent':1_000_000_000,'network/monthly_sent_limit':10_000_000_000
};
const seen=[];
const mockFetch=async (url,options)=>{
  const uri=new URL(url);
  const metric=uri.searchParams.get('filter').match(/firebasedatabase.googleapis.com\/([^"]+)/)?.[1];
  assert.equal(uri.hostname,'monitoring.googleapis.com');
  assert.equal(uri.pathname,'/v3/projects/'+TARGET_PROJECT+'/timeSeries');
  assert(uri.searchParams.get('filter').includes('resource.labels.table_name = "'+EXPECTED_NAMESPACE+'"'));
  assert.equal(options.headers.Authorization,'Bearer MOCK_ONLY');
  seen.push(metric);
  return {ok:true,json:async()=>({timeSeries:[point(metric,used[metric],now-3600000)]})};
};
result=await readFirebaseUsage({getAccessToken:async()=>'MOCK_ONLY',fetchFn:mockFetch,now});
assert.equal(result.safe,true);
assert.equal(result.storage.usedBytes,200_000_000);
assert.equal(result.downloads.usedBytes,1_000_000_000);
assert.equal(seen.length,4);
console.log('PASS four exact Monitoring metrics, fixed project, read-only API, and usage summary');

const missingMetrics=await readFirebaseUsage({
  getAccessToken:async()=>'MOCK_ONLY',now,
  fetchFn:async()=>({ok:true,json:async()=>({timeSeries:[]})})
});
assert.equal(missingMetrics.safe,false);
assert.equal(missingMetrics.reason,'missing_or_stale_metrics');
assert.equal(missingMetrics.missing.length,4);
await assert.rejects(readFirebaseUsage({
  getAccessToken:async()=>'MOCK_ONLY',now,
  fetchFn:async()=>({ok:false,status:403})
}),/category=access_denied_unknown_cause/);
const gcpFailure=(reason,message)=>({
  error:{code:403,status:'PERMISSION_DENIED',message,
    details:[{'@type':'type.googleapis.com/google.rpc.ErrorInfo',
      reason,domain:'googleapis.com'}]}
});
assert.deepEqual(
  classifyMonitoringFailure(403,gcpFailure('BILLING_DISABLED',
    'This API method requires billing to be enabled')).category,
  'billing_not_enabled_or_restricted');
assert.equal(classifyMonitoringFailure(403,gcpFailure('SERVICE_DISABLED',
  'Cloud Monitoring API has not been used')).category,'monitoring_api_disabled');
assert.equal(classifyMonitoringFailure(403,gcpFailure('IAM_PERMISSION_DENIED',
  'Permission monitoring.timeSeries.list denied')).category,
  'monitoring_iam_or_project_restriction');
assert.equal(classifyMonitoringFailure(403,gcpFailure('ACCESS_TOKEN_SCOPE_INSUFFICIENT',
  'Insufficient authentication scopes')).category,'token_scope_missing');
assert.equal(classifyMonitoringFailure(403,gcpFailure('CONSUMER_INVALID','consumer')),
  'project_consumer_restricted');
const privateSample='access_token=PRIVATE_VALUE';
await assert.rejects(readFirebaseUsage({
  getAccessToken:async()=>'MOCK_ONLY',now,
  fetchFn:async()=>({ok:false,status:403,
    headers:{get:()=> 'application/json'},
    json:async()=>gcpFailure('BILLING_DISABLED',
      'This API method requires billing. '+privateSample)})
}),error=>{
  assert.equal(error.diagnostic.category,'billing_not_enabled_or_restricted');
  assert.equal(error.diagnostic.providerReason,'BILLING_DISABLED');
  assert(!error.message.includes(privateSample));
  assert(!JSON.stringify(error.diagnostic).includes(privateSample));
  return true;
});
console.log('PASS 403 billing, disabled API, IAM, scope and project classification without secret leakage');
await assert.rejects(readFirebaseUsage({
  getAccessToken:async()=>'MOCK_ONLY',now,
  project:'other-project',fetchFn:mockFetch
}),/restricted/);
console.log('PASS inaccessible, missing, stale or wrong-project usage always blocks initial burst');
