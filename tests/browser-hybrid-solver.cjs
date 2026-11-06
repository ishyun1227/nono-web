/* Browser integration: background hybrid solving and independent uniqueness
 * certification use different workers, with no effect on saved puzzles.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const dir=path.resolve(__dirname,'../dist');
const hard=JSON.parse(fs.readFileSync(path.resolve(__dirname,'./fixtures/hard-random-unique-stalled-20261106.json'))).fixtures;
const f=hard.find(x=>x.id==='hard-random-5-259');
assert(f);
const mime={'.html':'text/html','.js':'text/javascript','.wasm':'application/wasm',
  '.json':'application/json','.svg':'image/svg+xml','.css':'text/css'};
const server=http.createServer((req,res)=>{
  const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/,'');
  const file=path.resolve(dir,name||'index.html');
  if(!file.startsWith(dir+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(err,bytes)=>{
    if(err){res.writeHead(404).end();return;}
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(bytes);
  });
});
let browser;
(async()=>{
  await new Promise((resolve,reject)=>server.listen(0,'127.0.0.1',e=>e?reject(e):resolve()));
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  await page.route('**/firebase-config.js',route=>route.fulfill({
    body:'window.NONO_FIREBASE_CONFIG={};',contentType:'text/javascript'}));
  await page.goto('http://127.0.0.1:'+server.address().port+'/index.html');
  await page.waitForFunction(()=>Boolean(window.NONO_RANDOM_PUZZLES?.solveAsync));
  const results=await page.evaluate(async fixture=>{
    const api=window.NONO_RANDOM_PUZZLES;
    const start=api.restore().length;
    const allBlack={size:5,rows:Array.from({length:5},()=>[5]),cols:Array.from({length:5},()=>[5])};
    const simple=await api.solveAsync(allBlack,{maxMs:5000});
    const stuck=await api.solveAsync({size:fixture.size,rows:fixture.rows,cols:fixture.cols},{maxMs:8000});
    const after=api.restore().length;
    return {simple,stuck,counts:[start,after]};
  },{size:f.size,rows:f.rows,cols:f.cols});
  assert.equal(results.simple.status,'solved');
  assert.equal(results.simple.method,'adaptive');
  assert.equal(results.simple.satCalled,false);
  assert.equal(results.simple.uniqueness,'not_checked');
  assert.equal(results.simple.cells.join(''),'1'.repeat(25));
  assert.equal(results.stuck.status,'solved');
  assert.equal(results.stuck.method,'adaptive_then_cadical');
  assert.equal(results.stuck.satCalled,true);
  assert.equal(results.stuck.uniqueness,'not_checked');
  assert.equal(results.stuck.cells.join(''),f.answerRows.join(''));
  assert.deepEqual(results.counts,[0,0],'Solving must not register random puzzles');
  console.log('PASS actual Chromium hybrid solve Worker; logic-only and true stall paths; no auto-certification or storage');
})().catch(e=>{console.error(e);process.exitCode=1;})
.finally(async()=>{try{await browser?.close();}finally{await new Promise(r=>server.close(r));}});
