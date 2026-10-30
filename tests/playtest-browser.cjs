/* Regression: rabbit and samurai must use the existing production editor,
 * including its settings, numeric history and resume, never standalone pages.
 */
const {chromium}=require('playwright'),path=require('node:path');
const {pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:850}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/firebase-config.js',route=>route.fulfill({body:'window.NONO_FIREBASE_CONFIG={};',contentType:'text/javascript'}));
  await page.goto(pathToFileURL(path.resolve(__dirname,'..','dist','index.html')).href);
  await page.locator('#nono-open-settings').waitFor();
  const open=async(id,w,h)=>{
   await page.evaluate(async name=>{
    setMode('practice');
    const select=document.querySelector('#puzzle');select.value=name;
    select.dispatchEvent(new Event('change',{bubbles:true}));await startAlone();
   },id);
   const actual=await page.evaluate(()=>({
    cells:document.querySelectorAll('#board .cells .cell').length,
    rows:document.querySelectorAll('#board > .row-clues .row-clue').length,
    cols:document.querySelectorAll('#board > .col-clues .col-clue').length,
    mainSettings:!!document.getElementById('nono-open-settings')
   }));
   if(actual.cells!==w*h||actual.rows!==h||actual.cols!==w||!actual.mainSettings)
    throw Error('Existing board dimensions/settings incorrect: '+id+' '+JSON.stringify(actual));
  };
  await open('trial_rabbit_53x73',53,73);
  await page.evaluate(()=>paint(0,'1',false));
  if(!await page.locator('#board .cells .cell').first().evaluate(el=>el.classList.contains('filled')))
   throw Error('Rabbit paint failed');
  await page.locator('#undo').click();
  if(await page.locator('#board .cells .cell').first().evaluate(el=>el.classList.contains('filled')))
   throw Error('Rabbit undo failed');
  await page.locator('#redo').click();
  await page.reload();await page.locator('#nono-open-settings').waitFor();
  await open('trial_rabbit_53x73',53,73);
  if(!await page.locator('#board .cells .cell').first().evaluate(el=>el.classList.contains('filled')))
   throw Error('Rabbit resume failed');
  await open('trial_samurai_72x72',72,72);
  await page.evaluate(()=>paint(0,'1',false));
  await open('trial_rabbit_53x73',53,73);
  if(!await page.locator('#board .cells .cell').first().evaluate(el=>el.classList.contains('filled')))
   throw Error('Rabbit progress lost when switching puzzles');
  // 'Screen fit' includes every top/left clue, not only the filled grid.
  // Run at the user's reported near-square viewport and a narrow phone.
  for(const viewport of [{width:937,height:971},{width:390,height:844}]){
   await page.setViewportSize(viewport);
   for(const [id,w,h] of [
    ['trial_rabbit_53x73',53,73],
    ['trial_samurai_72x72',72,72],
    ['winter-snowman-trial-v1',59,63]
   ]){
    await open(id,w,h);
    await page.evaluate(async()=>{
      document.getElementById('nono-zoom-fit').click();
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    });
    const fit=await page.evaluate(()=>{
      const el=document.getElementById('board'),frame=el.getBoundingClientRect();
      const cells=el.querySelector('.cells').getBoundingClientRect();
      const row=el.querySelector('.row-clues').getBoundingClientRect();
      const col=el.querySelector('.col-clues').getBoundingClientRect();
      const clues=[...el.querySelectorAll('.row-clue span,.col-clue span')];
      const offscreen=[],protruding=[];
      for(const span of clues){
       const r=span.getBoundingClientRect();
       if(r.left<-1||r.top<-1||r.right>innerWidth+1||r.bottom>innerHeight+1)
        offscreen.push(span.textContent);
       // A number's glyph must fit INSIDE its own hint slot, not simply
       // escape a visible span while overlapping the adjacent number.
       const range=document.createRange();range.selectNodeContents(span);
       const ink=range.getBoundingClientRect();
       if(ink.width>r.width+1.8||ink.height>r.height+1.8)
        protruding.push({n:span.textContent,slot:r.width,ink:ink.width});
      }
      return {viewport:[innerWidth,innerHeight],board:[frame.left,frame.top,frame.right,frame.bottom],
       grid:[cells.width,cells.height],rowWidth:row.width,colHeight:col.height,
       expectedWidth:Number(el.dataset.fitBoardWidth),expectedHeight:Number(el.dataset.fitBoardHeight),
       offscreen:offscreen.slice(0,5),protruding:protruding.slice(0,5),
       clueCount:clues.length,
       overflow:getComputedStyle(document.querySelector('#game .board-scroll')).overflow};
    });
    if(fit.board[0]<-2||fit.board[1]<-2||
       fit.board[2]>viewport.width+2||fit.board[3]>viewport.height+2||
       fit.offscreen.length||fit.protruding.length||
       Math.abs(fit.rowWidth+fit.grid[0]-fit.expectedWidth)>8||
       Math.abs(fit.colHeight+fit.grid[1]-fit.expectedHeight)>8)
      throw Error('Full clue-and-grid screen fit failed: '+id+' '+JSON.stringify(fit));
   }
  }
  await page.setViewportSize({width:1280,height:850});
  if(errors.length)throw Error('Main-player errors: '+errors.join(' | '));
  console.log('PLAYTEST_PASS: original editor; rabbit 53x73, samurai 72x72, paint, undo, redo, resume and switch');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
