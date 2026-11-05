/* True browser integration for the v6 random-puzzle certification Worker.
 * Serves the actual dist/ build over localhost so module Worker and WASM have
 * normal same-origin semantics. No mocked SAT decision or mocked Worker.
 */
'use strict';
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const solver=require('../random-puzzle-solver.js');
const dir=path.resolve(__dirname,'../dist');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.wasm':'application/wasm','.css':'text/css','.svg':'image/svg+xml','.json':'application/json'};
const server=http.createServer((req,res)=>{
  const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/, '');
  const file=path.resolve(dir,name||'index.html');
  if(!(file===dir||file.startsWith(dir+path.sep))){res.writeHead(403).end();return;}
  fs.readFile(file,(error,data)=>{
    if(error){res.writeHead(404).end();return;}
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});
    res.end(data);
  });
});
let browser;
(async()=>{
  await new Promise((resolve,reject)=>server.listen(0,'127.0.0.1',e=>e?reject(e):resolve()));
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/firebase-config.js',route=>route.fulfill({body:'window.NONO_FIREBASE_CONFIG={};',contentType:'text/javascript'}));
  await page.goto('http://127.0.0.1:'+server.address().port+'/index.html');
  await page.waitForFunction(()=>Boolean(window.NONO_RANDOM_PUZZLES?.generateAsync));
  const outcome=await page.evaluate(async()=>{
    const start=performance.now();
    const puzzle=await window.NONO_RANDOM_PUZZLES.generateAsync({
      size:10,difficulty:'보통',seed:100,maxMs:5000
    });
    const mask=window.NONO_RANDOM_PUZZLES.answerFor(puzzle);
    return {size:puzzle.size,version:puzzle.designVersion,rows:puzzle.rows,
      cols:puzzle.cols,mask,elapsedMs:performance.now()-start,
      saved:window.NONO_RANDOM_PUZZLES.restore().some(p=>p.id===puzzle.id)};
  });
  assert.equal(outcome.size,10);
  assert.equal(outcome.version,6);
  assert.equal(outcome.mask.length,100);
  assert.equal(outcome.saved,true,'Only certified games should be registered');
  assert(outcome.elapsedMs<5500,'One random puzzle should respect the time budget');
  const proof=solver.countSolutions({size:outcome.size,rows:outcome.rows,cols:outcome.cols},
    {reference:outcome.mask,maxChecks:50000,maxNodes:3000});
  assert.equal(proof.status,'unique','Independently certify the browser-generated puzzle');
  console.log('PASS real Chromium Web Worker + CaDiCaL WASM: 10x10 unique, saved, '+outcome.elapsedMs.toFixed(1)+'ms');
  if(errors.length)console.log('Other page warnings: '+errors.slice(0,3).join(' | '));
})().catch(e=>{console.error('FAIL CaDiCaL Chromium integration:',e);process.exitCode=1;})
.finally(async()=>{try{await browser?.close();}finally{await new Promise(resolve=>server.close(resolve));}});
