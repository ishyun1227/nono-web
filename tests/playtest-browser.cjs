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
  for(const viewport of [{width:937,height:971},{width:760,height:660},{width:760,height:900},{width:390,height:844}]){
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
      const offscreen=[],protruding=[],crowded=[];
      const inkRect=span=>span.querySelector('.nono-fit-clue-ink')?.getBoundingClientRect();
      for(const group of el.querySelectorAll('.col-clue,.row-clue')){
       const ink=[...group.querySelectorAll('.nono-fit-clue-ink')].map(e=>e.getBoundingClientRect());
       for(let i=1;i<ink.length;i++){
        const before=ink[i-1],after=ink[i],vertical=group.classList.contains('col-clue');
        if(vertical?before.bottom>after.top+.35:before.right>after.left+.35)
         crowded.push(group.className);
       }
      }
      for(const span of clues){
       const r=span.getBoundingClientRect();
       if(r.left<-1||r.top<-1||r.right>innerWidth+1||r.bottom>innerHeight+1)
        offscreen.push(span.textContent);
       // A number's glyph must fit INSIDE its own hint slot, not simply
       // escape a visible span while overlapping the adjacent number.
       const ink=inkRect(span);
       if(!ink||ink.left<r.left-.8||ink.top<r.top-.8||
          ink.right>r.right+.8||ink.bottom>r.bottom+.8)
        protruding.push({n:span.textContent,slot:[r.width,r.height],
         ink:ink?[ink.width,ink.height]:null});
      }
      return {viewport:[innerWidth,innerHeight],board:[frame.left,frame.top,frame.right,frame.bottom],
       grid:[cells.width,cells.height],rowWidth:row.width,colHeight:col.height,
       expectedWidth:Number(el.dataset.fitBoardWidth),expectedHeight:Number(el.dataset.fitBoardHeight),
       offscreen:offscreen.slice(0,5),protruding:protruding.slice(0,5),
       crowded:crowded.slice(0,5),clueCount:clues.length,
       overflow:getComputedStyle(document.querySelector('#game .board-scroll')).overflow};
    });
    console.log('CLUE_BASELINE',id,viewport.width,JSON.stringify(await page.evaluate(()=>{
      const grid=document.querySelector('#board'),span=grid.querySelector('.col-clue span'),ink=span?.querySelector('.nono-fit-clue-ink');
      const style=getComputedStyle(ink),sn=getComputedStyle(span);
      const numbers=[...grid.querySelectorAll('.col-clue .nono-fit-clue-ink')]; 
      const single=numbers.filter(e=>e.textContent.length===1);
      const double=numbers.filter(e=>e.textContent.length>1);
      const minHeight=items=>Math.min(...items.map(e=>e.getBoundingClientRect().height));
      const sample=numbers.find(e=>e.textContent.length>1)||numbers[0];
      return {cell:grid.dataset.fitCellSize,font:style.fontSize,scale:grid.style.getPropertyValue('--nono-fit-glyph-scale'),
       slot:[span.getBoundingClientRect().width,span.getBoundingClientRect().height],
       inkHeight:ink.getBoundingClientRect().height,sampleDigit:sample.textContent,
       sampleHeight:sample.getBoundingClientRect().height,sampleWidth:sample.getBoundingClientRect().width,
       rowWidth:grid.style.getPropertyValue('--nono-fit-row-width'),colHeight:grid.style.getPropertyValue('--nono-fit-col-height'),
       gridSize:[grid.getBoundingClientRect().width,grid.getBoundingClientRect().height],
       computedFont:sn.fontSize,
       minSingleHeight:minHeight(single),minDoubleHeight:minHeight(double),
       fullFontPixels:parseFloat(style.fontSize),
       independentScales:[...new Set(numbers.slice(0,50).map(x=>x.style.getPropertyValue('--nono-fit-glyph-scale')))]};
    })));
    if(viewport.width>=700){
      const readability=await page.evaluate(()=>{
       const nodes=[...document.querySelectorAll('#board .col-clue .nono-fit-clue-ink')];
       const min=(xs)=>Math.min(...xs.map(x=>x.getBoundingClientRect().height));
       return {single:min(nodes.filter(x=>x.textContent.length===1)),
        double:min(nodes.filter(x=>x.textContent.length>1)),
        global:document.getElementById('board').style.getPropertyValue('--nono-fit-glyph-scale')};
      });
      const doubleMin=viewport.width>=900?6:4.2;
      if(readability.global||readability.single<6.7||readability.double<doubleMin)
       throw Error('Hint digits were shrunk globally or are unreadable: '+
        id+' '+JSON.stringify({viewport,readability}));
    }
    if(fit.board[0]<8||fit.board[1]<8||
       fit.board[2]>viewport.width-8||fit.board[3]>viewport.height-8||
       fit.offscreen.length||fit.protruding.length||fit.crowded.length||
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
