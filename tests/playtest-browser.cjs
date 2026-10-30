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
    // Hint labels must NOT contain the grid's interior separators.
    // Also prove that LEFT row-hint slots no longer waste ~1.78em per digit.
    const hintLayout=await page.evaluate(()=>{
      const grid=document.getElementById('board');
      const row=grid.querySelector('.row-clue'),col=grid.querySelector('.col-clue');
      const rowSpan=row?.querySelector('span'),colSpan=col?.querySelector('span');
      const measure=el=>getComputedStyle(el);
      const r=measure(row),c=measure(col),rs=measure(rowSpan),cs=measure(colSpan);
      const font=parseFloat(r.fontSize),slot=rowSpan.getBoundingClientRect().width;
      return {
        rowBorder:r.borderBottomWidth,colBorder:c.borderRightWidth,
        rowShadow:r.boxShadow,colShadow:c.boxShadow,
        innerRowBorder:rs.borderLeftWidth,innerColBorder:cs.borderBottomWidth,
        outerRowBorder:measure(grid.querySelector('.row-clues')).borderRightWidth,
        outerColBorder:measure(grid.querySelector('.col-clues')).borderBottomWidth,
        font,slot,
        rowWidth:grid.querySelector('.row-clues').getBoundingClientRect().width
      };
    });
    if(hintLayout.rowBorder!=='0px'||hintLayout.colBorder!=='0px'||
       hintLayout.rowShadow!=='none'||hintLayout.colShadow!=='none'||
       hintLayout.innerRowBorder!=='0px'||hintLayout.innerColBorder!=='0px'||
       parseFloat(hintLayout.outerRowBorder)<=0||parseFloat(hintLayout.outerColBorder)<=0||
       hintLayout.slot>hintLayout.font*1.5+2.5)
      throw Error('Clue separators or excessive left-hint spacing remain: '+
        id+' '+JSON.stringify({viewport,hintLayout}));
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
  // The prior arrow path performed a complete 5,184-cell repaint for each
  // stroke. Keyboard movement now updates only old/new active cells.
  await page.setViewportSize({width:937,height:971});
  await open('trial_samurai_72x72',72,72);
  const navigation=await page.evaluate(()=>{
   const grid=document.querySelector('#board');
   const before=grid.querySelectorAll('.cell.active')[0]?.dataset.index;
   const start=performance.now();
   for(let i=0;i<60;i++){
    document.dispatchEvent(new KeyboardEvent('keydown',{bubbles:true,code:'ArrowRight',key:'ArrowRight'}));
    document.dispatchEvent(new KeyboardEvent('keyup',{bubbles:true,code:'ArrowRight',key:'ArrowRight'}));
   }
   const elapsed=performance.now()-start;
   const active=[...grid.querySelectorAll('.cell.active')].map(e=>e.dataset.index);
   return {before,active,elapsed};
  });
  if(navigation.active.length!==1||Number(navigation.active[0])!==60||
     navigation.elapsed>1500)
   throw Error('Arrow navigation still blocks on full board updates: '+JSON.stringify(navigation));

  // The pre-existing '가장자리 고정 힌트' setting used to only make the HUD
  // sticky. Exercise actual frozen ROW and COLUMN hint canvases when zoomed
  // and scrolling the document, as with Excel freeze panes.
  await page.setViewportSize({width:760,height:660});
  await open('trial_samurai_72x72',72,72);
  await page.locator('#nono-open-settings').click();
  await page.locator('.nono-settings-tabs [role="tab"]').filter({hasText:'보드·화면'}).click();
  await page.locator('input[aria-label="가장자리 고정 힌트"]').check();
  await page.locator('#nono-settings-close').click();
  for(let k=0;k<8;k++)await page.locator('#nono-zoom-in').click();
  await page.evaluate(async()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const scrollResult=await page.evaluate(async()=>{
   window.scrollTo({left:500,top:500,behavior:'instant'});
   await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
   const row=document.querySelector('canvas[data-clue-axis="row"]');
   const col=document.querySelector('canvas[data-clue-axis="col"]');
   return {scrollX,scrollY,row:row&&getComputedStyle(row).display,col:col&&getComputedStyle(col).display,
    htmlWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth,
    gameWidth:document.getElementById('game').getBoundingClientRect().width,
    boardRect:(()=>{const r=document.getElementById('board').getBoundingClientRect();return [r.left,r.right,r.top,r.bottom]})(),
    zoomed:document.body.classList.contains('nono-zoom-exceeded'),
    cells:document.querySelectorAll('#board .cells .cell').length};
  });
  if(scrollResult.scrollX<5||scrollResult.scrollY<5||
     scrollResult.row!=='block'||scrollResult.col!=='block'||scrollResult.cells!==5184)
   throw Error('Excel-style frozen hints not visible when zoom scrolling: '+JSON.stringify(scrollResult));
  await page.locator('#nono-open-settings').click();
  await page.locator('.nono-settings-tabs [role="tab"]').filter({hasText:'보드·화면'}).click();
  await page.locator('input[aria-label="가장자리 고정 힌트"]').uncheck();
  await page.locator('#nono-settings-close').click();
  await page.evaluate(async()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const hidden=await page.evaluate(()=>[...document.querySelectorAll('canvas.nono-frozen-clues')].every(x=>getComputedStyle(x).display==='none'));
  if(!hidden)throw Error('Pinned hints did not turn off');
  console.log('Keyboard navigation and Excel-style frozen hint rails passed.',navigation.elapsed.toFixed(1)+'ms');
  // App-like mobile view: screen itself does not scroll; swipe gestures
  // are never painted into cells; on zoom, only the puzzle pane can pan.
  const mobileContext=await browser.newContext({
   viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2
  });
  const mobile=await mobileContext.newPage();
  const mobileErrors=[];mobile.on('pageerror',error=>mobileErrors.push(error.message));
  await mobile.route('**/firebase-config.js',route=>route.fulfill({body:'window.NONO_FIREBASE_CONFIG={};',contentType:'text/javascript'}));
  await mobile.goto(pathToFileURL(path.resolve(__dirname,'..','dist','index.html')).href);
  await mobile.locator('#nono-open-settings').waitFor();
  await mobile.evaluate(async()=>{
   setMode('practice');
   const picker=document.querySelector('#puzzle');picker.value='trial_rabbit_53x73';
   picker.dispatchEvent(new Event('change',{bubbles:true}));await startAlone();
  });
  await mobile.locator('#nono-mobile-pad .nono-dpad').waitFor({state:'visible'});
  await mobile.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const layout=await mobile.evaluate(()=>{
   const box=sel=>{const r=document.querySelector(sel).getBoundingClientRect();return [r.left,r.top,r.right,r.bottom]};
   return {
    viewport:[innerWidth,innerHeight],documentHeight:document.documentElement.scrollHeight,
    documentWidth:document.documentElement.scrollWidth,
    isApp:document.body.classList.contains('nono-mobile-app'),
    board:box('#board'),pane:box('#game .board-scroll'),
    dpad:box('#nono-mobile-pad .nono-dpad'),actions:box('#nono-mobile-pad .nono-pad-actions'),
    duplicateToolbar:getComputedStyle(document.querySelector('#game .board-footer')).display,
    pad:document.getElementById('nono-mobile-pad').hidden,
    pointerAction:getComputedStyle(document.querySelector('#board .cell')).touchAction
   };
  });
  if(!layout.isApp||layout.pad||layout.duplicateToolbar!=='none'||
     layout.documentHeight>layout.viewport[1]+2||layout.documentWidth>layout.viewport[0]+2||
     layout.pane[1]<39||layout.pane[3]>Math.min(layout.dpad[1],layout.actions[1])+2||
     layout.board[0]<-2||layout.board[2]>layout.viewport[0]+2||
     layout.board[1]<layout.pane[1]-2||layout.board[3]>layout.pane[3]+2||
     !/pan-x/.test(layout.pointerAction))
   throw Error('Mobile app layout failed: '+JSON.stringify(layout));
  const first=await mobile.locator('#board .cells .cell').first().boundingBox();
  await mobile.touchscreen.tap(first.x+first.width/2,first.y+first.height/2);
  if(!await mobile.evaluate(()=>board[0]==='1'))throw Error('Touch tap did not paint cell 0');
  await mobile.evaluate(()=>{
    const el=document.querySelector('#board .cells .cell');
    const init={bubbles:true,cancelable:true,pointerType:'touch',pointerId:75,isPrimary:true,button:0,buttons:1};
    el.dispatchEvent(new PointerEvent('pointerdown',{...init,clientX:100,clientY:250}));
    el.dispatchEvent(new PointerEvent('pointermove',{...init,clientX:100,clientY:285}));
    el.dispatchEvent(new PointerEvent('pointerup',{...init,clientX:100,clientY:305,buttons:0}));
  });
  if(await mobile.evaluate(()=>board.filter(v=>v==='1').length)!==1)
   throw Error('Touch drag unexpectedly painted');
  for(let k=0;k<8;k++)await mobile.locator('#nono-zoom-in').click({force:true});
  await mobile.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const zoom=await mobile.evaluate(()=>{
   const pane=document.querySelector('#game .board-scroll');
   return {body:document.documentElement.scrollHeight,paneScroll:pane.scrollHeight,
    paneClient:pane.clientHeight,overflow:getComputedStyle(pane).overflow,
    pageScroll:scrollY,zoomed:document.body.classList.contains('nono-zoom-exceeded')};
  });
  if(!zoom.zoomed||!zoom.overflow.includes('auto')||zoom.body>846||
     zoom.paneScroll<=zoom.paneClient+1)
    throw Error('Mobile zoom should pan the pane but not the page: '+JSON.stringify(zoom));
  if(mobileErrors.length)throw Error('Mobile game exceptions: '+mobileErrors.join(' | '));
  await mobileContext.close();
  console.log('Mobile app viewport, tap-vs-swipe and internal zoom panning passed.');
  await page.setViewportSize({width:1280,height:850});
  if(errors.length)throw Error('Main-player errors: '+errors.join(' | '));
  console.log('PLAYTEST_PASS: original editor; rabbit 53x73, samurai 72x72, paint, undo, redo, resume and switch');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
