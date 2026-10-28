const {chromium}=require('playwright');
const {initializeTestEnvironment}=require('@firebase/rules-unit-testing');
const {ref,set}=require('firebase/database');
const {answers}=require('./puzzles.cjs');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
async function main(){
 const env=await initializeTestEnvironment({projectId:'demo-nono',database:{host:'127.0.0.1',port:9000,rules:fs.readFileSync('database.rules.json','utf8')}});
 let server,browser;
 try{
  await env.clearDatabase();
  await env.withSecurityRulesDisabled(c=>set(ref(c.database(),'privateAnswers'),answers));
  server=http.createServer((req,res)=>{
   const file=req.url.split('?')[0];
   res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':'text/html');
   if(file==='/firebase-config.js')return res.end("window.NONO_FIREBASE_CONFIG={apiKey:'demo-key',projectId:'demo-nono',databaseURL:'https://demo-nono.firebaseio.com',appId:'demo'};window.NONO_FIREBASE_EMULATORS=true;");
   const target=path.join(process.cwd(),file==='/'?'index.html':file);
   if(!target.startsWith(process.cwd())){res.statusCode=403;return res.end();}
   fs.readFile(target,(error,data)=>{res.statusCode=error?404:200;res.end(error?'missing':data);});
  });
  await new Promise(resolve=>server.listen(4176,'127.0.0.1',resolve));
  browser=await chromium.launch({headless:true});
  const contexts=[await browser.newContext(),await browser.newContext()];
  for(const context of contexts)await context.route(/https:\/\/www.gstatic.com\/firebasejs\/[\d.]+\/(firebase-[\w-]+\.js)/,route=>{
    const filename=route.request().url().split('/').pop();
    return route.fulfill({path:path.join(process.cwd(),'node_modules/firebase',filename),contentType:'text/javascript'});
  });
  const pages=await Promise.all(contexts.map(c=>c.newPage()));
  const errors=[];
  pages.forEach(p=>{p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(20000);});
  await Promise.all(pages.map(p=>p.goto('http://127.0.0.1:4176')));
  for(const p of pages)await p.waitForFunction(()=>document.querySelector('#connection')?.textContent.includes('온라인 연결'));

  // Solo completion becomes a numeric record, not a GIF.
  await pages[0].evaluate(async expected=>{
   setMode('practice');const select=document.getElementById('puzzle');select.value='heart5';
   select.dispatchEvent(new Event('change',{bubbles:true}));await startAlone();
   for(let i=0;i<expected.length;i++)if(expected[i]==='1')paint(i,'1',true);
  },answers.heart5);
  const diagnostic=await pages[0].evaluate(()=>{
    const stored=window.NONO_REPLAY?.recentCompleted(storage,5)||[];
    return {
      activeMode:mode,selected:puzzle?.id,boardSize:board.length,
      finished,completedAt:finishedAt,prefix:board.join('').slice(0,50),
      actualExpected:PUZZLES.find(p=>p.id===puzzle?.id)?.rows,
      saved:stored.length,replayCount:stored[0]?.actions?.length,
      cardCount:document.querySelectorAll('.nono-replay-card').length
    };
  });
  console.log('REPLAY SOLO DIAGNOSTIC',JSON.stringify(diagnostic),'page errors',errors);
  await pages[0].waitForSelector('.nono-replay-card',{state:'attached'}); // Home stays hidden while a puzzle is open.
  const state=await pages[0].evaluate(()=>{
   const r=window.NONO_REPLAY.recentCompleted(storage,5)[0];
   return {mode:r?.mode,count:r?.actions.length,finished:r?.completedAt,end:r&&window.NONO_REPLAY.boardAtEnd(r),canvas:!!document.querySelector('.nono-replay-card canvas')};
  });
  assert.equal(state.end,answers.heart5);
  assert(state.finished>0&&state.count>0&&state.canvas);

  // In coop mode, Firebase board acknowledgement generates actor-attributed,
  // private, append-only numeric change events.
  await pages[0].evaluate(async()=>{
   setMode('coop');document.getElementById('puzzle').value='heart5';
   await createRoom({publicRoom:false});
  });
  const room=await pages[0].evaluate(()=>roomCode);
  assert.match(room,/^[A-HJ-NP-Z2-9]{6}$/);
  await pages[1].evaluate(async code=>await enterRoom(code),room);
  await pages[0].evaluate(()=>paint(1,'1',true));
  await pages[1].evaluate(()=>paint(2,'1',true));
  await pages[0].waitForFunction(async()=> {
   const snapshot=await get(ref(database,'rooms/'+roomCode+'/replayEvents'));
   return Object.values(snapshot.val()||{}).flatMap(x=>Object.values(x||{})).length>=2;
  },null,{timeout:20000});
  const events=await pages[0].evaluate(async()=>{
   const snapshot=await get(ref(database,'rooms/'+roomCode+'/replayEvents'));
   return Object.values(snapshot.val()||{}).flatMap(x=>Object.values(x||{})).map(x=>({actor:x.actor,mode:x.mode,cells:x.cells}));
  });
  assert.equal(new Set(events.map(x=>x.actor)).size,2);
  assert(events.every(x=>x.mode==='coop'&&/^\[\[/.test(x.cells)));
  assert.equal(errors.length,0,errors.join('; '));
  console.log('PASS browser solo numeric replay and two-player co-op event logging');
 }finally{
  if(browser)await browser.close();
  if(server)await new Promise(resolve=>server.close(resolve));
  await env.cleanup();
 }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
