/* Real Firebase+Chromium: an unfinished cooperative random room must not
 * be reissued to its participant, including when no squares were edited.
 * No completion event must be emitted on starting or leaving.
 */
'use strict';
const {chromium}=require('playwright');
const {initializeTestEnvironment}=require('@firebase/rules-unit-testing');
const {ref,set}=require('firebase/database');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const assert=require('node:assert/strict');
(async()=>{
  const env=await initializeTestEnvironment({
    projectId:'demo-nono',database:{host:'127.0.0.1',port:9000,
      rules:fs.readFileSync('database.rules.json','utf8')}
  });
  let server,browser;
  try{
    await env.clearDatabase();
    const pendingId='random-coop-pending-100',freshId='random-coop-fresh-101';
    await env.withSecurityRulesDisabled(async c=>{
      const db=c.database();
      await set(ref(db,'randomPuzzleBank/10_보통/'+pendingId),
        {id:pendingId,version:6,size:10,difficulty:'보통',seed:100,verified:true});
      await set(ref(db,'randomPuzzleBank/10_보통/'+freshId),
        {id:freshId,version:6,size:10,difficulty:'보통',seed:101,verified:true});
    });
    const root=process.cwd();
    server=http.createServer((req,res)=>{
      const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
      if(name==='/firebase-config.js'){
        res.writeHead(200,{'Content-Type':'text/javascript'});
        res.end("window.NONO_FIREBASE_CONFIG={apiKey:'demo-key',projectId:'demo-nono',databaseURL:'https://demo-nono.firebaseio.com',appId:'demo'};window.NONO_FIREBASE_EMULATORS=true;");
        return;
      }
      const target=path.resolve(root,'dist',name.replace(/^\/+/,'')||'index.html');
      if(!target.startsWith(path.resolve(root,'dist')+path.sep)){
        res.writeHead(403).end();return;
      }
      fs.readFile(target,(error,data)=>{
        res.writeHead(error?404:200,{'Content-Type':name.endsWith('.js')?'text/javascript':
          name.endsWith('.wasm')?'application/wasm':'text/html'});
        res.end(error?'not found':data);
      });
    });
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    browser=await chromium.launch({headless:true});
    const context=await browser.newContext();
    await context.addInitScript(()=>localStorage.setItem('nono-account-intro-v1','1'));
    await context.route(/https:\/\/www.gstatic.com\/firebasejs\/[\d.]+\/firebase-[\w-]+\.js/,
      route=>{
        const name=route.request().url().split('/').pop();
        return route.fulfill({path:path.join(root,'node_modules/firebase',name),
          contentType:'text/javascript'});
      });
    const page=await context.newPage();
    page.on('pageerror',e=>console.error('Browser error:',e.message));
    const url='http://127.0.0.1:'+server.address().port+'/index.html';
    await page.goto(url);
    await page.waitForFunction(()=>window.NONO_AUTH_READY_DETAIL?.auth);
    await page.evaluate(async()=>{
      const ready=window.NONO_AUTH_READY_DETAIL;
      await ready.sdk.createUserWithEmailAndPassword(ready.auth,
        'coop-active-test@example.invalid','only-for-local-emulator');
    });
    await page.waitForFunction(()=>window.NONO_ACCOUNT?.isSignedIn()===true);
    const created=await page.evaluate(async id=>{
      const spec={id,size:10,difficulty:'보통',seed:100,version:6};
      const p={...window.NONO_RANDOM_PUZZLES.fromSpec(spec),verified:true};
      PUZZLES.push(p);
      const el=document.createElement('option');el.value=p.id;el.textContent=p.name;
      document.getElementById('puzzle').append(el);
      document.getElementById('puzzle').value=p.id;
      document.getElementById('puzzle').dispatchEvent(new Event('change',{bubbles:true}));
      setMode('coop');
      const ok=await createRoom({publicRoom:false,requireUnseen:true});
      return {ok,room:roomCode,id:puzzle.id};
    },pendingId);
    assert.equal(created.ok,true);
    assert.equal(created.id,pendingId);
    assert.match(created.room,/^[A-HJ-NP-Z2-9]{6}$/);
    await page.waitForFunction(async()=>{
      const uid=currentId(),code=roomCode;
      if(!uid||!code)return false;
      return (await get(ref(database,'userRooms/'+uid+'/'+code))).val()===true;
    });
    await page.evaluate(()=>leaveGame());
    const before=await page.evaluate(()=>({
      completed:window.NONO_COMPLETED_PUZZLES.completedCount(),
      ids:window.NONO_COMPLETED_PUZZLES.all()
    }));
    assert.equal(before.completed,0);
    const pending=await page.evaluate(()=>window.NONO_RANDOM_IN_PROGRESS.all());
    assert(pending.includes(pendingId),'Even zero-move coop must block fresh assignment');
    await page.evaluate(()=>{window.NONO_RANDOM_PUZZLES.generateAsync=async()=>{throw Error('Unexpected instant generation');};});
    const chosen=await page.evaluate(async()=>window.NONO_RANDOM_ALLOCATION.choose({
      group:0,difficulty:'보통',localPuzzles:[]
    }));
    assert.equal(chosen.source,'bank');
    assert.equal(chosen.puzzle.id,freshId);
    assert.equal(await page.evaluate(()=>window.NONO_COMPLETED_PUZZLES.completedCount()),0,
      'Unfinished coop must not become a completion');
    console.log('PASS real Firebase coop room with zero moves excluded from new random assignment; shared bank picks fresh puzzle; no completed-ID change');
  }finally{
    await browser?.close();
    if(server)await new Promise(resolve=>server.close(resolve));
    await env.cleanup();
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
