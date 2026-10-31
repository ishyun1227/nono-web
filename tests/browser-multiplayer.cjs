const {chromium}=require('playwright');
const {atob}=require('node:buffer');
const {initializeTestEnvironment}=require('@firebase/rules-unit-testing');
const {ref,set}=require('firebase/database');
const {answers}=require('./puzzles.cjs');
const answerBits=require('../answer-bitpack.js');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
async function main(){
 const env=await initializeTestEnvironment({projectId:'demo-nono',database:{host:'127.0.0.1',port:9000,rules:fs.readFileSync('database.rules.json','utf8')}});
 await env.clearDatabase();await env.withSecurityRulesDisabled(async c=>{
   await set(ref(c.database(),'privateAnswers'),answers);
   await set(ref(c.database(),'privateAnswersPacked'),
     Object.fromEntries(Object.entries(answers).map(([id,mask])=>{
       const size=id==='heart5'?5:10;
       return [id,answerBits.pack(mask,size,size)];
     })));
  });
 const server=http.createServer((req,res)=>{const file=req.url.split('?')[0];res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':'text/html');if(file==='/firebase-config.js')return res.end("window.NONO_FIREBASE_CONFIG={apiKey:'demo-key',projectId:'demo-nono',databaseURL:'https://demo-nono.firebaseio.com',appId:'demo'};window.NONO_FIREBASE_EMULATORS=true;");const target=path.join(process.cwd(),file==='/'?'index.html':file);if(!target.startsWith(process.cwd())){res.statusCode=403;return res.end();}fs.readFile(target,(e,data)=>{res.statusCode=e?404:200;res.end(e?'missing':data);});});
 await new Promise(r=>server.listen(4173,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
 try{
  const contexts=await Promise.all([browser.newContext(),browser.newContext()]);
  // The first-visit welcome dialog is not part of multiplayer gameplay.
  // Mark it as acknowledged before loading the test page (production stays unchanged).
  for(const c of contexts)await c.addInitScript(()=>{
    localStorage.setItem('nono-account-intro-v1','1');
  });
  for(const c of contexts)await c.route(/https:\/\/www.gstatic.com\/firebasejs\/[\d.]+\/(firebase-[\w-]+\.js)/,route=>{const name=route.request().url().split('/').pop();return route.fulfill({path:path.join(process.cwd(),'node_modules/firebase',name),contentType:'text/javascript'});});
  const [a,b]=await Promise.all(contexts.map(c=>c.newPage()));const errors=[];
  for(const p of [a,b])p.setDefaultTimeout(20000);
  for(const p of [a,b]){p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')console.error('BROWSER:',m.text());});}
  await Promise.all([a.goto('http://127.0.0.1:4173'),b.goto('http://127.0.0.1:4173')]);
  for(const p of [a,b])await p.waitForFunction(()=>document.querySelector('#connection').textContent.includes('온라인 연결'));
  // Nickname is no longer editable. The production UI requires a signed-in account.
  // Create two genuine, non-anonymous accounts in the local Firebase Auth emulator.
  for(const [page,email] of [[a,'alice-test@example.invalid'],[b,'bob-test@example.invalid']]){
    await page.evaluate(async address=>{
      const ready=window.NONO_AUTH_READY_DETAIL;
      if(!ready?.auth||!ready.sdk?.createUserWithEmailAndPassword)throw Error('Auth SDK not ready');
      await ready.sdk.createUserWithEmailAndPassword(ready.auth,address,'emulator-test-only-password');
    },email);
    await page.waitForFunction(()=>window.NONO_ACCOUNT?.isSignedIn()===true);
  }
  assert.equal(await a.locator('#nickname').getAttribute('type'),'hidden');
  // Opt in only in the emulator test. Production stays on legacy masks until Firebase migration.
  await a.evaluate(()=>{window.NONO_PACKED_ANSWERS_READY=['heart5'];});
  // An ID not seeded for packed validation must keep legacy mask format.
  const fallback=await a.evaluate(()=>serverAnswerMask(Array(100).fill('0'),{id:'cat10',size:10}));
  assert.equal(fallback,'0'.repeat(100),'Unseeded puzzles retain existing format');
  // Public matchmaking: a stranger should see and join an actual waiting room.
  await Promise.all([a.click('[data-mode="race"]'),b.click('[data-mode="race"]')]);
  await a.click('#quick-match');await a.waitForURL(/room=/);
  const matchCode=new URL(a.url()).searchParams.get('room');
  await b.locator('#public-room-list [data-room-code="'+matchCode+'"]').waitFor({state:'visible'});
  await b.click('#quick-match');await b.waitForURL(/room=/);
  assert.equal(new URL(b.url()).searchParams.get('room'),matchCode,'Quick match must join the existing public room');
  for(const p of [a,b])await p.waitForFunction(()=>meta?.status==='playing'&&Boolean(raceStates[currentId()]));
  await Promise.all([a.evaluate(()=>leaveGame()),b.evaluate(()=>leaveGame())]);
  console.log('PASS public quick match connects strangers and automatically starts a two-player race');
  // The redesigned launcher starts with 10x10 selected. This scenario uses
  // the known 5x5 fixture and must select it explicitly before room creation.
  await a.click('[data-mode="practice"]');
  await a.selectOption('#nono-quick-size','5');
  await a.click('[data-mode="coop"]');await a.click('#create-room');await a.waitForURL(/room=/);const coop=new URL(a.url()).searchParams.get('room');
  await b.click('[data-mode="coop"]');await b.fill('#room-code',coop);await b.click('#join-room');
  await b.locator('#board .cell').first().waitFor();
  await Promise.all([a.locator('#board .cell').nth(0).click(),b.locator('#board .cell').nth(1).click()]);
  for(const p of [a,b])await p.waitForFunction(()=>board[0]==='1'&&board[1]==='1');
  const coopStorage=await a.evaluate(async code=>{
    const data=(await get(ref(database,`rooms/${code}/coopMoves`))).val()||{};
    const baseline=(await get(ref(database,`rooms/${code}/board`))).val();
    return {actions:Object.values(data),baseline,format:meta.format};
  },coop);
  assert.equal(coopStorage.format,2,'New co-op rooms must use delta format');
  assert.equal(coopStorage.baseline,null,'No full co-op board should be sent on input');
  assert.equal(coopStorage.actions.length,2,'Each concurrent co-op input should produce one move');
  for(const action of coopStorage.actions)assert.equal(atob(action.bits).length,2,'Move stores a two-byte index/value pair');
  await a.screenshot({path:'test-results/coop-desktop.png'});
  console.log('PASS two independent browsers: invitation, cooperative concurrent input');
  await a.evaluate(()=>leaveGame());
  const listedAfterHostLeave=await a.evaluate(async code=>(await get(ref(database,'publicRooms/'+code))).exists(),coop);
  assert.equal(listedAfterHostLeave,true,'Public shared puzzle must survive its host leaving');
  await a.reload();
  await a.locator('#nono-resume-view').waitFor({state:'visible'});
  await a.evaluate(()=>{window.NONO_PACKED_ANSWERS_READY=['heart5'];});
  for(const mode of ['practice','coop','record','race']){
    await a.click('[data-mode="'+mode+'"]');
    if(!await a.locator('#nono-resume-view').isVisible())throw new Error('Resume panel hidden in '+mode+' mode');
  }
  await a.locator('#nono-resume-items .nono-resume-card').filter({hasText:'협동'}).first().locator('.nono-resume-continue').click();
  await a.waitForURL(/room=/);
  await a.waitForFunction(()=>board[0]==='1'&&board[1]==='1');
  const resumedPuzzle=await a.evaluate(()=>({size:puzzle.size,length:board.length,roomSize:meta.size}));
  assert.deepEqual(resumedPuzzle,{size:5,length:25,roomSize:5},
    'Resume must restore the room puzzle size, not the home picker size');
  console.log('PASS public listing survives host departure and saved cooperation resumes after page reload');
  await a.evaluate(answer=>{for(let i=0;i<answer.length;i++)paint(i,answer[i]==='1'?'1':'0',true);},answers.heart5);
  try{for(const p of [a,b])await p.waitForFunction(()=>finished&&finishedAt>0,{timeout:10000});}
  catch(error){
    const states=await Promise.all([a,b].map(p=>p.evaluate(async({code,answer})=>{
      const moves=(await get(ref(database,`rooms/${code}/coopMoves`))).val()||{};
      const records=Object.entries(moves).map(([id,v])=>({id,at:v.at,bits:v.bits})).sort((x,y)=>x.at-y.at||x.id.localeCompare(y.id));
      return {board:board.join(''),answer,finished,meta,moveCount:records.length,records};
    },{code:coop,answer:answers.heart5})));
    console.error('COOP COMPLETION DEBUG '+JSON.stringify(states));
    throw error;
  }
  const coopFinish=await b.evaluate(()=>{tick();return {at:finishedAt,label:document.querySelector('#timer').textContent};});
  await b.waitForTimeout(1100);
  assert.equal(await b.evaluate(()=>{tick();return document.querySelector('#timer').textContent;}),coopFinish.label);
  console.log('PASS cooperative completion freezes timer for both players');
  await Promise.all([a.evaluate(()=>leaveGame()),b.evaluate(()=>leaveGame())]);
  await a.click('[data-mode="race"]');await a.click('#create-room');await a.waitForURL(/room=/);const race=new URL(a.url()).searchParams.get('room');
  await b.click('[data-mode="race"]');await b.fill('#room-code',race);await b.click('#join-room');await b.locator('#lobby-players').getByText('플레이어').first().waitFor();
  await a.click('#start-race');for(const p of [a,b])await p.waitForFunction(()=>meta?.status==='playing'&&!startingRace&&!settingBoard&&raceStates[currentId()]);
  // A race must resume from its saved personal board in the shared panel below every mode.
  const firstBlack=answers.heart5.indexOf('1');
  assert(firstBlack>=0,'The test puzzle needs at least one filled cell');
  await a.evaluate(i=>paint(i,'1',true),firstBlack);
  await a.waitForFunction(i=>board[i]==='1' && raceMoveBoards[currentId()]?.[i]==='1',firstBlack);
  const raceStorage=await a.evaluate(async code=>{
    const user=currentId(),state=(await get(ref(database,`rooms/${code}/states/${user}`))).val();
    const moves=(await get(ref(database,`rooms/${code}/raceMoves/${user}`))).val()||{};
    return {state,moves:Object.values(moves),format:meta.format};
  },race);
  assert.equal(raceStorage.format,2,'New race rooms must use delta format');
  assert.equal(raceStorage.state.board,undefined,'Race must not send a full board during play');
  assert.equal(raceStorage.moves.length,1,'Race must store one changed-cell action');
  assert.equal(atob(raceStorage.moves[0].bits).length,2,'Race move is packed binary');
  await a.evaluate(()=>leaveGame());
  // The same five-card resume area must remain below the mode-specific setup.
  for(const tab of ['practice','coop','record','race']){
    await a.click('[data-mode="'+tab+'"]');
    if(!await a.locator('#nono-resume-view').isVisible())throw new Error('Missing persistent resume in '+tab);
  }
  await a.locator('#nono-resume-items .nono-resume-card').filter({hasText:'대결'}).first().locator('.nono-resume-continue').click();
  await a.waitForURL(/room=/);
  assert.equal(new URL(a.url()).searchParams.get('room'),race,'Resume must rejoin the original race');
  await a.waitForFunction(i=>board[i]==='1',firstBlack);
  console.log('PASS persistent below-mode resume panel restores incomplete race state');
  await a.evaluate(answer=>{for(let i=0;i<answer.length;i++)if(answer[i]==='1'&&board[i]!=='1')paint(i,'1',true);},answers.heart5);
  await a.waitForFunction(()=>finished);await b.waitForFunction(()=>Object.values(raceStates).some(s=>s.finishedAt>0));
  const packedRace=await a.evaluate(async()=>((await get(ref(database,`rooms/${roomCode}/states/${currentId()}`))).val()||{}).filled);
  assert.equal(packedRace,answerBits.pack(answers.heart5,5,5),'Race finish must send packed answer');
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
  await a.waitForFunction(()=>finished);await a.locator('#live-results').getByText('1위 플레이어').waitFor();
  const packedRun=await a.evaluate(async()=>((await get(ref(database,`runs/${puzzle.id}/${currentId()}`))).val()||{}).filled);
  assert.equal(packedRun,answerBits.pack(answers.heart5,5,5),'Online record must send packed answer');
  await a.setViewportSize({width:390,height:844});await a.screenshot({path:'test-results/record-mobile.png',fullPage:true});
  // Generated multiplayer: independent accounts obtain the host's puzzle from the room.
  await Promise.all([a.evaluate(()=>leaveGame()),b.evaluate(()=>leaveGame())]);
  await a.setViewportSize({width:1440,height:900});
  await a.click('[data-mode="race"]');
  const generated=await a.evaluate(()=>{
    const p=window.NONO_RANDOM_PUZZLES.generate({size:10,difficulty:'보통',seed:47119});
    PUZZLES.push(p);const option=document.createElement('option');
    option.value=p.id;option.textContent=p.name;
    const picker=document.querySelector('#puzzle');picker.append(option);picker.value=p.id;
    picker.dispatchEvent(new Event('change',{bubbles:true}));
    return {id:p.id,rows:p.rows,cols:p.cols,answer:window.NONO_RANDOM_PUZZLES.answerFor(p)};
  });
  await a.click('#create-room');await a.waitForURL(/room=/);
  const generatedCode=new URL(a.url()).searchParams.get('room');
  await b.click('[data-mode="race"]');await b.fill('#room-code',generatedCode);await b.click('#join-room');
  await b.waitForURL(/room=/);
  const other=await b.evaluate(()=>({id:puzzle.id,rows:puzzle.rows,cols:puzzle.cols,generated:puzzle.generated}));
  assert.equal(other.id,generated.id);assert.deepEqual(other.rows,generated.rows);assert.deepEqual(other.cols,generated.cols);
  assert.equal(other.generated,true);
  const visibility=await b.evaluate(async code=>{try{await get(ref(database,'roomAnswers/'+code));return 'READABLE';}catch{return 'DENIED';}},generatedCode);
  assert.equal(visibility,'DENIED','Private generated answer must remain inaccessible');
  await a.click('#start-race');
  for(const page of [a,b])await page.waitForFunction(()=>meta?.status==='playing'&&raceStates[currentId()]);
  await a.evaluate(answer=>{for(let i=0;i<answer.length;i++)if(answer[i]==='1')paint(i,'1',true);},generated.answer);
  await a.waitForFunction(()=>finished&&finishedAt>0,{timeout:20000});
  await b.waitForFunction(()=>Object.values(raceStates).some(s=>s.finishedAt>0),{timeout:20000});
  assert.equal(await a.evaluate(()=>raceStates[currentId()].filled),generated.answer);
  console.log('PASS generated race: same clues, protected answer and validated winner');
  await Promise.all([a.evaluate(()=>leaveGame()),b.evaluate(()=>leaveGame())]);
  await a.click('[data-mode="coop"]');
  await a.evaluate(id=>{const select=document.querySelector('#puzzle');select.value=id;select.dispatchEvent(new Event('change',{bubbles:true}));},generated.id);
  await a.click('#create-room');await a.waitForURL(/room=/);
  const generatedCoopCode=new URL(a.url()).searchParams.get('room');
  await b.click('[data-mode="coop"]');await b.fill('#room-code',generatedCoopCode);await b.click('#join-room');
  await b.waitForURL(/room=/);
  await a.evaluate(()=>paint(0,'1',false));
  await b.waitForFunction(()=>board[0]==='1');
  assert.equal(await b.evaluate(()=>puzzle.id),generated.id);
  console.log('PASS generated coop: separate accounts share the board and input deltas');
  assert.deepEqual(errors,[]);console.log('PASS online record saved, leaderboard and mobile view, no page errors');
 }finally{await browser.close();await new Promise(r=>server.close(r));await env.cleanup();}
}
fs.mkdirSync('test-results',{recursive:true});main().catch(e=>{console.error(e);process.exitCode=1;});
