/* Real Chromium integration checks for the built game. Firebase is tested separately in emulators. */
const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../dist'),out=path.resolve(__dirname,'../test-results/taste');
fs.mkdirSync(out,{recursive:true});
const results=[];
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');const file=path.join(root,url.pathname==='/'?'index.html':url.pathname);
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.wasm':'application/wasm'})[path.extname(file)]||'application/octet-stream');
 fs.readFile(file,(e,b)=>{res.statusCode=e?404:200;res.end(e?'Not found':b)});
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext({hasTouch:true});
  await context.route('**/firebase-config.js',r=>r.fulfill({body:'window.NONO_FIREBASE_CONFIG={};',contentType:'text/javascript'}));
  await context.addInitScript(()=>localStorage.setItem('nono-account-intro-v1','1'));
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  for(const [width,height] of [[1440,900],[1024,768],[768,1024],[390,844],[320,740]]){
   await page.setViewportSize({width,height});await page.goto(url);await page.waitForFunction(()=>document.documentElement.dataset.nonoBoot==='ready');
   const state=await page.evaluate(()=>{
    const box=s=>{const e=document.querySelector(s),r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
    return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,nav:box('#nono-workbench-nav'),setup:box('#setup'),start:box('#play-alone'),resume:box('#nono-resume-view'),support:box('#nono-workbench-support'),ad:box('#nono-ad-sidebar'),choices:document.querySelectorAll('.nono-apple-choice[data-puzzle-id]').length};
   });
   const matrix=await page.evaluate(()=>{
     const rect=el=>{const r=el.getBoundingClientRect();return {width:r.width,height:r.height}};
     return {board:rect(document.querySelector('.nono-apple-matrix')),
       cell:rect(document.querySelector('.nono-apple-matrix tbody td')),
       tabVisible:!!document.querySelector('.nono-apple-text-picker')?.getBoundingClientRect().height};
   });
   assert.ok(matrix.tabVisible,'size/difficulty tabs must remain visible');
   assert.ok(Math.abs(matrix.board.width-matrix.board.height)<3,'matrix not square '+JSON.stringify({width,matrix}));
   assert.ok(Math.abs(matrix.cell.width-matrix.cell.height)<3,'matrix cell not square '+JSON.stringify({width,matrix}));
   assert.ok(state.scrollWidth<=width+1,'horizontal overflow '+JSON.stringify(state));assert.ok(state.choices>0,'real puzzle choices missing');
   assert.ok(state.resume.y>=state.setup.bottom-1,'resume overlaps selector');
   if(width>=1200)assert.ok(state.nav.right<=state.setup.x&&state.setup.right<=state.support.x,'desktop hierarchy');
   assert.ok(state.start.bottom<=height+20||width===320,'start below first screen '+JSON.stringify(state));
   await page.screenshot({path:path.join(out,'home-'+width+'.png'),fullPage:true});results.push({check:'home',...state});
  }
  await page.setViewportSize({width:1440,height:900});
  // Size is the row, difficulty is the column. The intersection is one selection.
  assert.equal(await page.locator('.nono-apple-matrix tbody tr').count(),4);
  assert.equal(await page.locator('.nono-apple-matrix-cell').count(),16);
  assert.equal(await page.locator('.nono-apple-axis-col').count(),4);
  assert.equal(await page.locator('.nono-apple-text-size button').count(),4);
  assert.equal(await page.locator('.nono-apple-text-level button').count(),4);
  assert.equal(await page.locator('#setup').getByText('미평가',{exact:true}).count(),0);
  // Text tabs on the left must update a square nonogram on the right.
  await page.locator('.nono-apple-text-size button').nth(1).click();
  await page.locator('.nono-apple-text-level button').nth(2).click();
  const hintState=await page.evaluate(()=>({
    columns:[...document.querySelectorAll('.nono-apple-axis-col .nono-apple-axis-clue')].map(el=>el.textContent),
    rows:[...document.querySelectorAll('.nono-apple-axis-row .nono-apple-axis-clue')].map(el=>el.textContent),
    selected:document.querySelector('.nono-apple-matrix-cell[aria-pressed="true"]')?.dataset
  }));
  assert.deepEqual(hintState.columns,['4','4','1,2','4'],'column clues of all cells except chosen');
  assert.deepEqual(hintState.rows,['4','2,1','4','4'],'row clues of all cells except chosen');
  assert.equal(hintState.selected.sizeGroup,'1');
  assert.equal(hintState.selected.difficulty,'어려움');
  await page.locator('.nono-apple-axis-col[data-difficulty="보통"]').click();
  assert.equal(await page.locator('.nono-apple-matrix-cell[data-size-group="1"][data-difficulty="보통"]').getAttribute('aria-pressed'),'true');
  await page.locator('.nono-apple-axis-row').nth(0).click();
  assert.equal(await page.locator('.nono-apple-matrix-cell[data-size-group="0"][data-difficulty="보통"]').getAttribute('aria-pressed'),'true');
  assert.match(await page.locator('.nono-apple-matrix-cell[aria-pressed="true"]').innerText(),/30\s*P/);
  await page.locator('.nono-apple-matrix-cell[data-size-group="0"][data-difficulty="쉬움"]').click();
  assert.equal(await page.locator('.nono-apple-matrix-cell[aria-pressed="true"]').count(),1);
  assert.equal(await page.locator('.nono-apple-matrix-cell[data-size-group="0"][data-difficulty="쉬움"]').getAttribute('aria-pressed'),'true');
  assert.ok(await page.locator('.nono-apple-choice[data-puzzle-id="heart5"]').isVisible());
  await page.locator('.nono-apple-matrix-cell[data-size-group="0"][data-difficulty="쉬움"]').click();
  await page.locator('.nono-apple-choice[data-puzzle-id="heart5"]').click();await page.click('#play-alone');
  await page.locator('#board .cell').first().waitFor({state:'visible'});
  await page.locator('#board .cell').first().click();
  assert.equal(await page.evaluate(()=>board[0]),'1');
  await page.click('#undo');assert.equal(await page.evaluate(()=>board[0]),'0');
  await page.click('#redo');assert.equal(await page.evaluate(()=>board[0]),'1');
  for(const [width,height] of [[1440,900],[1024,768],[768,1024],[390,844]]){
   await page.setViewportSize({width,height});await page.waitForTimeout(400);
   const geom=await page.evaluate(()=>{
    const box=e=>{if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
    const pad=document.querySelector('#nono-mobile-pad');
    const targets=pad&&!pad.hidden?[...pad.querySelectorAll('.nono-dpad,.nono-pad-actions,#nono-absolute-pad')].map(box).filter(r=>r.width&&r.height):[];
    return {width:innerWidth,height:innerHeight,scrollHeight:document.documentElement.scrollHeight,scrollWidth:document.documentElement.scrollWidth,board:box(document.querySelector('#board')),hint:box(document.querySelector('#nono-hint-action')),pad:targets.length?{y:Math.min(...targets.map(r=>r.y)),height:Math.max(...targets.map(r=>r.height)),targets}:null};
   });
   assert.ok(geom.scrollWidth<=width+1,'play width overflow');
   if(width===390){assert.ok(geom.hint.y>=geom.board.bottom,'hint overlaps puzzle '+JSON.stringify(geom));assert.ok(geom.scrollHeight<=height+1,'mobile play scroll '+JSON.stringify(geom));if(geom.pad?.height)assert.ok(geom.board.bottom<=geom.pad.y+1,'pad overlaps board '+JSON.stringify(geom));}
   await page.screenshot({path:path.join(out,'play-'+width+'.png')});results.push({check:'play',...geom});
  }
  await page.click('#leave-game');
  await page.locator('.nono-resume-continue').first().waitFor();await page.reload();
  await page.locator('.nono-resume-continue').first().click();assert.equal(await page.evaluate(()=>board[0]),'1');
  results.push({check:'paint, undo, redo, persist, reload, resume',passed:true});await page.click('#leave-game');
  for(const mode of ['race','coop','practice']){
   await page.click('[data-mode="'+mode+'"]');assert.equal(await page.locator('[data-mode="'+mode+'"]').getAttribute('aria-pressed'),'true');
  }
  await page.click('#nono-community-tab');await page.locator('#nono-community-title').waitFor({state:'visible'});
  await page.getByRole('tab',{name:'랭킹'}).click();
  await page.getByRole('button',{name:'기록 경쟁 시작'}).first().click();
  assert.equal(await page.locator('[data-mode="record"]').getAttribute('aria-pressed'),'true');
  await page.click('[data-mode="practice"]');
  await page.click('#nono-community-tab');await page.locator('#nono-community-title').waitFor({state:'visible'});await page.keyboard.press('Escape');
  await page.click('#profile-button');await page.locator('.nono-account-panel').waitFor({state:'visible'});assert.equal(await page.locator('.shell').evaluate(e=>e.inert),true);await page.click('.nono-account-close');assert.equal(await page.locator('.shell').evaluate(e=>e.inert),false);
  await page.click('#nono-attendance-claim');assert.equal(await page.evaluate(()=>NONO_DAILY_REWARDS.getSnapshot().points),20);assert.equal(await page.evaluate(()=>NONO_DAILY_REWARDS.claimAttendance()),false);
  results.push({check:'all modes, community, account, attendance duplicate guard',passed:true});
  await page.click('#nono-shop-tab-top');await page.locator('#nono-theme-overlay').waitFor({state:'visible'});
  for(const theme of ['aurora','pastel','retro','forest','arcade','library','enchanted','cosmos','terminal','neon']){
   await page.locator('[data-theme-id="'+theme+'"]').click();assert.equal(await page.locator('body').getAttribute('data-nono-theme'),theme);
  }
  await page.click('#nono-theme-use');assert.ok(await page.locator('#nono-workbench-nav .mode-select').isVisible());
  results.push({check:'all ten themes and default navigation restored',passed:true});
  await page.locator('.nono-apple-matrix-cell[data-size-group="0"][data-difficulty="쉬움"]').click();await page.locator('.nono-apple-random-generate').click();
  await page.locator('#board .cell').first().waitFor({state:'visible',timeout:90000});
  assert.ok(await page.evaluate(()=>puzzle.generated===true));results.push({check:'random generation starts real game',passed:true});await page.click('#leave-game');
  // Exercise the actual six controller surfaces on both ordinary and dense grids.
  for(const inputMode of ['fixed','trackpad','minimap','smartTrackpad','smartMinimap','smartHybrid']){
   await page.evaluate(mode=>localStorage.setItem('nono-input-settings-v1',JSON.stringify({mode,size:150})),inputMode);
   await page.reload();
   for(const [group,id] of [['작음','cat10'],['큼','vox_crabino_front']]){
    const row=group==='작음'?'0':'2';
    await page.locator('.nono-apple-matrix-cell[data-size-group="'+row+'"][data-difficulty="보통"]').click();
    await page.locator('.nono-apple-choice[data-puzzle-id="'+id+'"]').click();await page.click('#play-alone');
    await page.locator('#board .cell').first().waitFor();await page.waitForTimeout(500);
    const bounds=await page.evaluate(()=>{
     const grid=document.querySelector('#board').getBoundingClientRect();
     const controls=[...document.querySelectorAll('#nono-mobile-pad .nono-dpad,#nono-mobile-pad .nono-pad-actions,#nono-absolute-pad,#nono-floating-zone,#nono-smart-edge-rail,#nono-hint-action,#nono-board-zoom')]
      .filter(e=>getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().width>0)
      .map(e=>({id:e.id||e.className,rect:e.getBoundingClientRect().toJSON()}));
     return {grid:grid.toJSON(),controls,height:innerHeight,scroll:document.documentElement.scrollHeight};
    });
    assert.ok(bounds.scroll<=bounds.height+1,inputMode+' document scroll');
    for(const c of bounds.controls)assert.ok(c.rect.top>=bounds.grid.bottom-1,inputMode+' '+id+' overlaps '+JSON.stringify(c));
    assert.ok(await page.locator('#leave-game').isVisible());
    await page.screenshot({path:path.join(out,'mobile-'+inputMode+'-'+id+'.png')});
    results.push({check:'mobile controller',inputMode,puzzle:id,...bounds});await page.click('#leave-game');
   }
  }
  // Reproduce the old seven-second reveal race by delaying a structural UI script.
  await page.route('**/apple-home.js*',async route=>{await new Promise(r=>setTimeout(r,8500));await route.continue()});
  const navigation=page.goto(url,{waitUntil:'load'});await page.waitForTimeout(7600);
  assert.equal(await page.locator('html').getAttribute('data-nono-boot'),'slow');assert.equal(await page.locator('#home-view').evaluate(e=>getComputedStyle(e).visibility),'hidden');
  await navigation;await page.waitForFunction(()=>document.documentElement.dataset.nonoBoot==='ready');
  assert.ok(await page.locator('#nono-workbench-nav .mode-select').isVisible());results.push({check:'8.5-second delayed script never exposes legacy layout',passed:true});
  assert.deepEqual(errors,[],'browser errors');
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,results,errors},null,2));
  console.log(JSON.stringify({passed:true,checks:results.length,artifacts:out}));
 }finally{await browser.close();server.close()}
})().catch(e=>{fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({error:e.stack,results},null,2));console.error(e);server.close();process.exitCode=1});
