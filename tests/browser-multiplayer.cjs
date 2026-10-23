const {chromium}=require('playwright');
const {initializeTestEnvironment}=require('@firebase/rules-unit-testing');
const {ref,set}=require('firebase/database');
const {answers}=require('./puzzles.cjs');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
async function main(){
 const env=await initializeTestEnvironment({projectId:'demo-nono',database:{host:'127.0.0.1',port:9000,rules:fs.readFileSync('database.rules.json','utf8')}});
 await env.clearDatabase();await env.withSecurityRulesDisabled(c=>set(ref(c.database(),'privateAnswers'),answers));
 const server=http.createServer((req,res)=>{const file=req.url.split('?')[0];res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':'text/html');if(file==='/firebase-config.js')return res.end("window.NONO_FIREBASE_CONFIG={apiKey:'demo-key',projectId:'demo-nono',databaseURL:'https://demo-nono.firebaseio.com',appId:'demo'};window.NONO_FIREBASE_EMULATORS=true;");const target=path.join(process.cwd(),file==='/'?'index.html':file);if(!target.startsWith(process.cwd())){res.statusCode=403;return res.end();}fs.readFile(target,(e,data)=>{res.statusCode=e?404:200;res.end(e?'missing':data);});});
 await new Promise(r=>server.listen(4173,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
 try{
  const contexts=await Promise.all([browser.newContext(),browser.newContext()]);
  for(const c of contexts)await c.route(/https:\/\/www.gstatic.com\/firebasejs\/[\d.]+\/(firebase-[\w-]+\.js)/,route=>{const name=route.request().url().split('/').pop();return route.fulfill({path:path.join(process.cwd(),'node_modules/firebase',name),contentType:'text/javascript'});});
  const [a,b]=await Promise.all(contexts.map(c=>c.newPage()));const errors=[];
  for(const p of [a,b])p.setDefaultTimeout(20000);
  for(const p of [a,b]){p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')console.error('BROWSER:',m.text());});}
  await Promise.all([a.goto('http://127.0.0.1:4173'),b.goto('http://127.0.0.1:4173')]);
  for(const p of [a,b])await p.waitForFunction(()=>document.querySelector('#connection').textContent.includes('온라인 연결'));
  await a.fill('#nickname','Alice');await b.fill('#nickname','Bob');
  // The redesigned launcher starts with 10x10 selected. This scenario uses
  // the known 5x5 fixture and must select it explicitly before room creation.
  await a.locator('#nono-quick-sizes button').first().click();
  await a.click('[data-mode="coop"]');await a.click('#create-room');await a.waitForURL(/room=/);const coop=new URL(a.url()).searchParams.get('room');
  await b.click('[data-mode="coop"]');await b.fill('#room-code',coop);await b.click('#join-room');
  await b.locator('#board .cell').first().waitFor();
  await Promise.all([a.locator('#board .cell').nth(0).click(),b.locator('#board .cell').nth(1).click()]);
  for(const p of [a,b])await p.waitForFunction(()=>board[0]==='1'&&board[1]==='1');
  await a.screenshot({path:'test-results/coop-desktop.png'});
  console.log('PASS two independent browsers: invitation, cooperative concurrent input');
  await a.evaluate(answer=>{for(let i=0;i<answer.length;i++)paint(i,answer[i]==='1'?'1':'0',true);},answers.heart5);
  for(const p of [a,b])await p.waitForFunction(()=>finished&&finishedAt>0);
  const coopFinish=await b.evaluate(()=>{tick();return {at:finishedAt,label:document.querySelector('#timer').textContent};});
  await b.waitForTimeout(1100);
  assert.equal(await b.evaluate(()=>{tick();return document.querySelector('#timer').textContent;}),coopFinish.label);
  console.log('PASS cooperative completion freezes timer for both players');
  await Promise.all([a.evaluate(()=>leaveGame()),b.evaluate(()=>leaveGame())]);
  await a.click('[data-mode="race"]');await a.click('#create-room');await a.waitForURL(/room=/);const race=new URL(a.url()).searchParams.get('room');
  await b.click('[data-mode="race"]');await b.fill('#room-code',race);await b.click('#join-room');await b.locator('#lobby-players').getByText('Alice').waitFor();
  await a.click('#start-race');for(const p of [a,b])await p.waitForFunction(()=>meta?.status==='playing'&&!startingRace&&!settingBoard&&raceStates[currentId()]);
  await a.evaluate(answer=>{for(let i=0;i<answer.length;i++)if(answer[i]==='1')paint(i,'1',true);},answers.heart5);
  await a.waitForFunction(()=>finished);await b.waitForFunction(()=>Object.values(raceStates).some(s=>s.finishedAt>0));
  await b.screenshot({path:'test-results/race-desktop.png'});
  console.log('PASS synchronized race start, rapid input, completion and opponent results');
  await a.evaluate(()=>leaveGame());await a.click('[data-mode="record"]');await a.click('#play-alone');
  await a.locator('#game').waitFor({state:'visible'});
  const firstRun=await a.evaluate(()=>startedAt);
  a.once('dialog',d=>d.accept());await a.click('#restart');
  await a.waitForFunction(prior=>!startingAlone&&startedAt!==prior,firstRun);
  const runTimes=await a.evaluate(async()=>({local:startedAt,server:(await get(ref(database,`runs/${puzzle.id}/${currentId()}`))).val().startedAt}));
  assert.equal(runTimes.local,runTimes.server,'Restart must establish a fresh server-timed record run');
  await a.evaluate(answer=>{for(let i=0;i<answer.length;i++)if(answer[i]==='1')paint(i,'1',true);},answers.heart5);
  await a.waitForFunction(()=>finished);await a.locator('#live-results').getByText('1위 Alice').waitFor();
  await a.setViewportSize({width:390,height:844});await a.screenshot({path:'test-results/record-mobile.png',fullPage:true});
  assert.deepEqual(errors,[]);console.log('PASS online record saved, leaderboard and mobile view, no page errors');
 }finally{await browser.close();await new Promise(r=>server.close(r));await env.cleanup();}
}
fs.mkdirSync('test-results',{recursive:true});main().catch(e=>{console.error(e);process.exitCode=1;});
