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
  // Laptop trackpad navigates freely in BOTH directions without an action;
  // only painting locks the initial row/column axis.
  await mobile.evaluate(()=>{
   window.NONO_INPUT_CUSTOM.set('mode','trackpad');
   selected=20*53+20;render();
  });
  await mobile.locator('#nono-floating-zone').waitFor({state:'visible'});
  const trackpad=await mobile.evaluate(()=>{
   const zone=document.querySelector('#nono-floating-zone'),input=window.NONO_INPUT_CUSTOM;
   const init={pointerType:'touch',pointerId:456,isPrimary:true,button:0,buttons:1,bubbles:true,cancelable:true};
   const fire=(type,x,y,extra={})=>zone.dispatchEvent(new PointerEvent(type,{...init,clientX:x,clientY:y,...extra}));
   const start=selected,initialFilled=board.filter(v=>v==='1').length;
   fire('pointerdown',95,690);
   fire('pointermove',102,695);  // under 12px per axis: no jump
   const tiny=selected;
   fire('pointermove',108,695);  // accumulated 13px right: +1 cell
   const one=selected;
   fire('pointermove',132,719);  // +2 columns and +2 rows, freely diagonal
   const diagonal=selected;
   const hold=selected;          // finger stopped: no timed auto-repeat
   fire('pointerup',132,719,{buttons:0});
   fire('pointerdown',95,690);   // second stroke is relative to current cell
   fire('pointermove',82,690);   // one cell left
   const back=selected;
   fire('pointercancel',82,690,{buttons:0});
   const final=selected;
   return {start,tiny,one,diagonal,hold,back,final,
    initialFilled,filled:board.filter(v=>v==='1').length,
    mode:input.settings.mode,
    sensitivity:input.settings.trackpadSensitivity,
    oldJoystickRemoved:!document.querySelector('#nono-floating-stick'),
    legacyFloatingRejected:(()=>{input.set('mode','floating');const rejected=input.settings.mode;input.set('mode','trackpad');return rejected==='fixed'})(),
    dpadHidden:getComputedStyle(document.querySelector('#nono-mobile-pad .nono-dpad')).display,
    zoneAction:getComputedStyle(zone).touchAction};
  });
  if(trackpad.tiny!==trackpad.start||
     trackpad.one!==trackpad.start+1||
     trackpad.diagonal!==trackpad.start+2*53+3||
     trackpad.back!==trackpad.diagonal-1||
     trackpad.final!==trackpad.back||
     trackpad.initialFilled!==trackpad.filled||
     trackpad.mode!=='trackpad'||trackpad.sensitivity!==100||
     !trackpad.oldJoystickRemoved||!trackpad.legacyFloatingRejected||
     trackpad.dpadHidden!=='none'||trackpad.zoneAction!=='none')
   throw Error('Mobile relative trackpad mismatch: '+JSON.stringify(trackpad));
  // Editing while dragging is intentionally different: first axis wins.
  const paintLocked=await mobile.evaluate(()=>{
   const nav=window.NONO_TOUCH_CURSOR,zone=document.getElementById('nono-floating-zone');
   const fill=document.querySelector('[data-nono-input="fill"]');
   nav.select(20,20);fill.classList.add('is-held');
   const r=zone.getBoundingClientRect(),x=(r.left+r.right)/2,y=(r.top+r.bottom)/2;
   const init={pointerType:'touch',pointerId:467,isPrimary:true,button:0,
    buttons:1,bubbles:true,cancelable:true};
   const fire=(t,cx,cy,other={})=>zone.dispatchEvent(new PointerEvent(t,{...init,clientX:cx,clientY:cy,...other}));
   fire('pointerdown',x,y);fire('pointermove',x+32,y+20);
   const locked={...nav.position};
   fill.classList.remove('is-held');
   fire('pointermove',x+32,y+20);fire('pointermove',x+44,y+32);
   const freed={...nav.position};
   fire('pointerup',x+44,y+32,{buttons:0});
   return {locked,freed};
  });
  if(paintLocked.locked.row!==20||paintLocked.locked.col<=20||
     paintLocked.freed.row<=paintLocked.locked.row)
   throw Error('Trackpad editing should lock one axis only while fill is held: '+JSON.stringify(paintLocked));
  console.log('Laptop trackpad action-only row/column lock passed.');
  // Sensitivity persists while switching modes; existing modes are preserved.
  await mobile.evaluate(()=>{
    window.NONO_INPUT_CUSTOM.set('trackpadSensitivity',150);
    window.NONO_INPUT_CUSTOM.set('mode','fixed');
    window.NONO_INPUT_CUSTOM.set('mode','trackpad');
  });
  const persisted=await mobile.evaluate(()=>({
   mode:window.NONO_INPUT_CUSTOM.settings.mode,
   sensitivity:window.NONO_INPUT_CUSTOM.settings.trackpadSensitivity,
   stored:JSON.parse(localStorage.getItem('nono-input-settings-v1')).trackpadSensitivity
  }));
  if(persisted.mode!=='trackpad'||persisted.sensitivity!==150||persisted.stored!==150)
   throw Error('Relative trackpad preferences did not persist: '+JSON.stringify(persisted));
  console.log('Mobile trackpad free diagonal, joystick removal, lift/retry and sensitivity passed.',JSON.stringify(trackpad));
  // Drag left/right reaches the edge and clamps there even when the site's
  // regular keyboard wrap option is enabled. Reversing stays in this row.
  const bounded=await mobile.evaluate(()=>{
   const nav=window.NONO_TOUCH_CURSOR,settings=window.NONO_INPUT_CUSTOM;
   const zone=document.getElementById('nono-floating-zone');
   settings.set('trackpadSensitivity',100);
   settings.set('mode','trackpad');
   nav.select(12,52);
   const init={pointerType:'touch',pointerId:996,isPrimary:true,button:0,buttons:1,bubbles:true,cancelable:true};
   const fire=(type,x,y,other={})=>zone.dispatchEvent(new PointerEvent(type,{...init,clientX:x,clientY:y,...other}));
   fire('pointerdown',100,690);fire('pointermove',155,694);
   const atEdge=nav.position;
   fire('pointermove',135,694);const reverse=nav.position;
   fire('pointerup',135,694,{buttons:0});
   return {atEdge,reverse,wrapPreference:JSON.parse(localStorage.getItem('nono-web-preferences-v1')||'{}').wrap};
  });
  if(bounded.atEdge.row!==12||bounded.atEdge.col!==52||
     bounded.reverse.row!==12||bounded.reverse.col>=52)
   throw Error('Trackpad should clamp at puzzle edge and reverse normally: '+JSON.stringify(bounded));

  // Changing the slider in the SETTINGS modal used to emit a resize that
  // hid the whole pad. Closing settings must ALWAYS restore it at 65–150%.
  await mobile.locator('#nono-open-settings').click();
  await mobile.locator('[data-nono-extra-tab="touch"]').click();
  await mobile.evaluate(()=>window.NONO_INPUT_CUSTOM.set('size',150));
  await mobile.locator('#nono-settings-close').click();
  await mobile.waitForFunction(()=>!document.getElementById('nono-mobile-pad').hidden);
  const maxSize=await mobile.evaluate(()=>{
   const el=document.getElementById('nono-floating-zone'),r=el.getBoundingClientRect();
   return {visible:getComputedStyle(el).display!=='none',left:r.left,right:r.right,
    width:innerWidth,padHidden:document.getElementById('nono-mobile-pad').hidden};
  });
  if(!maxSize.visible||maxSize.padHidden||maxSize.left<0||maxSize.right>maxSize.width+1)
   throw Error('Resized trackpad disappeared or exceeded mobile width: '+JSON.stringify(maxSize));

  // Absolute miniature: unrestricted two-axis navigation until an edit
  // action is held; only editing should lock the row or column.
  const miniResult=await mobile.evaluate(()=>{
   const api=window.NONO_INPUT_CUSTOM,nav=window.NONO_TOUCH_CURSOR;
   api.set('size',100);api.set('mode','minimap');
   const el=document.getElementById('nono-absolute-pad'),r=el.getBoundingClientRect();
   const init={pointerType:'touch',pointerId:977,isPrimary:true,button:0,buttons:1,bubbles:true,cancelable:true};
   const fire=(kind,x,y,other={})=>el.dispatchEvent(new PointerEvent(kind,{...init,clientX:x,clientY:y,...other}));
   const at=(x,y)=>[r.left+r.width*x,r.top+r.height*y];
   fire('pointerdown',r.right-3,r.top+3);const corner={...nav.position};
   fire('pointerup',r.right-3,r.top+3,{buttons:0});
   fire('pointerdown',...at(.5,.5));const freeStart={...nav.position};
   fire('pointermove',r.right-4,r.top+4);const freeTopRight={...nav.position};
   fire('pointermove',r.left+4,r.bottom-4);const freeBottomLeft={...nav.position};
   fire('pointerup',r.left+4,r.bottom-4,{buttons:0});
   const width=nav.dimensions.width;
   // Ensure both ends of the forthcoming paint stroke are empty.
   const centerRow=Math.floor(nav.dimensions.height/2),centerCol=Math.floor(width/2);
   board[centerRow*width+centerCol]='0';board[centerRow*width+width-1]='0';render();
   fire('pointerdown',...at(.5,.5));const paintStart={...nav.position};
   const fillButton=document.querySelector('#nono-mobile-pad [data-nono-input="fill"]');
   const fillInit={...init,pointerId:978};
   fillButton.dispatchEvent(new PointerEvent('pointerdown',{...fillInit,clientX:350,clientY:670}));
   const filledAtStart=board[centerRow*width+centerCol];
   fire('pointermove',r.right-4,r.top+4);const locked={...nav.position};
   const filledAtEnd=board[centerRow*width+width-1];
   fillButton.dispatchEvent(new PointerEvent('pointerup',{...fillInit,clientX:350,clientY:670,buttons:0}));
   fire('pointermove',r.left+4,r.top+4);const afterRelease={...nav.position};
   fire('pointerup',r.left+4,r.top+4,{buttons:0});
   return {corner,freeStart,freeTopRight,freeBottomLeft,paintStart,locked,
    filledAtStart,filledAtEnd,afterRelease,mode:api.settings.mode};
  });
  if(miniResult.corner.row!==0||miniResult.corner.col!==52||
     miniResult.freeTopRight.row!==0||miniResult.freeTopRight.col!==52||
     miniResult.freeBottomLeft.row!==72||miniResult.freeBottomLeft.col!==0||
     miniResult.locked.row!==miniResult.paintStart.row||
     miniResult.locked.col!==52||miniResult.filledAtStart!=='1'||
     miniResult.filledAtEnd!=='1'||miniResult.afterRelease.row!==0||
     miniResult.afterRelease.col!==0||miniResult.mode!=='minimap')
    throw Error('Miniature free navigation or action-only paint lock failed: '+JSON.stringify(miniResult));
  console.log('Trackpad sizing and free miniature navigation versus locked editing passed.');
  // Pointer capture previously kept touch gestures alive when the finger had
  // left the visible input region. Test every navigation surface on mobile.
  const boundsResults=await mobile.evaluate(async()=>{
   const modes=['trackpad','minimap'];
   const api=window.NONO_INPUT_CUSTOM,nav=window.NONO_TOUCH_CURSOR;
   const results=[];
   for(let i=0;i<modes.length;i++){
    const mode=modes[i];api.set('mode',mode);nav.select(20,20);
    const el=document.getElementById(
     ['floating','trackpad','smartHybrid'].includes(mode)?'nono-floating-zone':'nono-absolute-pad');
    const r=el.getBoundingClientRect();
    const x=r.left+r.width*.8,y=r.top+r.height*.2;
    const init={pointerType:'touch',pointerId:2100+i,isPrimary:true,button:0,buttons:1,bubbles:true,cancelable:true};
    const fire=(type,cx,cy,other={})=>el.dispatchEvent(
     new PointerEvent(type,{...init,clientX:cx,clientY:cy,...other}));
    fire('pointerdown',x,y);const initial={...nav.position};
    fire('pointermove',r.right+90,r.bottom+90);const outside={...nav.position};
    await new Promise(resolve=>setTimeout(resolve,390));
    const afterHold={...nav.position};
    fire('pointermove',x,y);const reentered={...nav.position};
    fire('pointerup',x,y,{buttons:0});
    results.push({mode,initial,outside,afterHold,reentered});
   }
   const fill=document.querySelector('#nono-mobile-pad [data-nono-input="fill"]');
   const rect=fill.getBoundingClientRect(),bx=rect.left+rect.width/2,by=rect.top+rect.height/2;
   const init={pointerType:'touch',pointerId:2222,isPrimary:true,button:0,buttons:1,bubbles:true,cancelable:true};
   fill.dispatchEvent(new PointerEvent('pointerdown',{...init,clientX:bx,clientY:by}));
   const heldBefore=fill.classList.contains('is-held');
   fill.dispatchEvent(new PointerEvent('pointermove',{...init,clientX:rect.right+100,clientY:rect.bottom+100}));
   const heldAfter=fill.classList.contains('is-held');
   fill.dispatchEvent(new PointerEvent('pointerup',{...init,clientX:rect.right+100,clientY:rect.bottom+100,buttons:0}));
   return {results,heldBefore,heldAfter};
  });
  for(const item of boundsResults.results){
   for(const key of ['outside','afterHold','reentered']){
    if(item[key].row!==item.initial.row||item[key].col!==item.initial.col)
     throw Error('Touch must stop outside surface ('+item.mode+'/'+key+'): '+JSON.stringify(item));
   }
  }
  if(!boundsResults.heldBefore||boundsResults.heldAfter)
   throw Error('Touch action must release after finger leaves button: '+JSON.stringify(boundsResults));
  console.log('Two remaining legacy touch surfaces and action buttons respect their bounds.');
  // In BOTH windowed smart modes, dragging beyond the square presses the
  // corresponding long rectangle until release; re-entry stops immediately.
  const smartExit=await mobile.evaluate(async()=>{
   const api=window.NONO_INPUT_CUSTOM,nav=window.NONO_TOUCH_CURSOR;
   const result=[];
   for(const [i,mode] of ['smartTrackpad','smartMinimap'].entries()){
    api.set('mode',mode);api.set('smartPanSpeed',14);nav.select(20,20);
    const el=document.getElementById('nono-absolute-pad'),r=el.getBoundingClientRect();
    const x=(r.left+r.right)/2,y=(r.top+r.bottom)/2;
    const pointer={pointerType:'touch',pointerId:2400+i,isPrimary:true,
     button:0,buttons:1,bubbles:true,cancelable:true};
    const fire=(type,cx,cy,more={})=>
     el.dispatchEvent(new PointerEvent(type,{...pointer,clientX:cx,clientY:cy,...more}));
    fire('pointerdown',x,y);const first={...nav.position};
    fire('pointermove',r.right+90,y);const exited={...nav.position};
    await new Promise(resolve=>setTimeout(resolve,260));
    const held={...nav.position};
    fire('pointermove',x,y);const back={...nav.position};
    fire('pointerup',x,y,{buttons:0});
    result.push({mode,first,exited,held,back});
   }
   return result;
  });
  for(const item of smartExit){
   if(item.exited.row!==item.first.row||item.exited.col!==item.first.col+1||
      item.held.row!==item.exited.row||item.held.col<=item.exited.col||
      item.back.row!==item.held.row||item.back.col!==item.held.col)
    throw Error('Smart dragged-outside auto-scroll failed: '+JSON.stringify(item));
  }
  console.log('Smart trackpad and miniature exit-to-arrow continuous auto-scroll passed.');
  // Hybrid is intentionally different: a visible full-board miniature square
  // for the FIRST touch, then captured relative movement outside the square.
  const hybridResult=await mobile.evaluate(async()=>{
   const api=window.NONO_INPUT_CUSTOM,nav=window.NONO_TOUCH_CURSOR;
   api.set('size',100);api.set('mode','smartHybrid');nav.select(10,10);
   const el=document.getElementById('nono-floating-zone');
   const canvas=el.querySelector('.nono-hybrid-preview');
   const marker=el.querySelector('.nono-hybrid-cursor');
   const r=el.getBoundingClientRect();
   const x=r.left+r.width*.50,y=r.top+r.height*.50;
   const pointer={pointerType:'touch',pointerId:3077,isPrimary:true,
    button:0,buttons:1,bubbles:true,cancelable:true};
   const send=(event,cx,cy,more={})=>
    el.dispatchEvent(new PointerEvent(event,{...pointer,clientX:cx,clientY:cy,...more}));
   send('pointerdown',x,y);const initial={...nav.position};
   send('pointermove',x+24,y+12);const inside={...nav.position};
   send('pointermove',r.right+25,y+25);const outside={...nav.position};
   await new Promise(resolve=>setTimeout(resolve,260));
   const held={...nav.position};
   send('pointermove',x,y);const back={...nav.position};
   send('pointerup',x,y,{buttons:0});
   const canvasStyle=getComputedStyle(canvas);
   const squareStyle=getComputedStyle(el);
   return {initial,inside,outside,held,back,
    expectedRow:Math.floor(nav.dimensions.height*.5),
    expectedCol:Math.floor(nav.dimensions.width*.5),
    canvasWidth:canvas.width,canvasHeight:canvas.height,
    canvasVisible:canvasStyle.display!=='none',
    markerVisible:getComputedStyle(marker).display!=='none',
    ratio:r.width/r.height,cornerRadius:squareStyle.borderRadius,
    gestureActive:window.NONO_SMART_TOUCH.active};
  });
  if(hybridResult.initial.row!==hybridResult.expectedRow||
    hybridResult.initial.col!==hybridResult.expectedCol||
    hybridResult.inside.row<=hybridResult.initial.row||
    hybridResult.inside.col<=hybridResult.initial.col||
    hybridResult.outside.row<=hybridResult.inside.row||
    hybridResult.outside.col<=hybridResult.inside.col+1||
    hybridResult.held.row!==hybridResult.outside.row||
    hybridResult.held.col!==hybridResult.outside.col||
    hybridResult.back.row>=hybridResult.held.row||
    hybridResult.back.col>=hybridResult.held.col||
    hybridResult.canvasWidth!==152||hybridResult.canvasHeight!==152||
    !hybridResult.canvasVisible||!hybridResult.markerVisible||
    Math.abs(hybridResult.ratio-1)>.05||hybridResult.gestureActive)
   throw Error('Hybrid square/absolute tap/outside drag mismatch: '+JSON.stringify(hybridResult));
  console.log('Hybrid absolute first touch, relative movement outside on both axes and no hold-repeat passed.');
  // Each visible smart strip must touch the side of the small square while
  // remaining onscreen, work when pressed directly and persist speed changes.
  const smartEdges=await mobile.evaluate(()=>{
   const control=window.NONO_INPUT_CUSTOM,nav=window.NONO_TOUCH_CURSOR;
   control.set('mode','smartMinimap');
   control.set('size',100);control.set('smartPanSpeed',22);
   const mini=document.getElementById('nono-absolute-pad');
   const center=mini.getBoundingClientRect();
   const rail=document.getElementById('nono-smart-edge-rail');
   const slots={};
   for(const [dir,delta] of Object.entries({up:[-1,0],down:[1,0],left:[0,-1],right:[0,1]})){
    const button=rail.querySelector('[data-nono-smart-edge="'+dir+'"]');
    const r=button.getBoundingClientRect();
    const x=(r.left+r.right)/2,y=(r.top+r.bottom)/2;
    nav.select(30,25);const start={...nav.position};
    const id=3100+Object.keys(slots).length;
    const base={pointerType:'touch',pointerId:id,isPrimary:true,button:0,buttons:1,bubbles:true,cancelable:true};
    button.dispatchEvent(new PointerEvent('pointerdown',{...base,clientX:x,clientY:y}));
    const selected={...nav.position};
    button.dispatchEvent(new PointerEvent('pointermove',{...base,clientX:x+3,clientY:y+3}));
    const moved={...nav.position};
    button.dispatchEvent(new PointerEvent('pointerup',{...base,clientX:x,clientY:y,buttons:0}));
    slots[dir]={r:{left:r.left,top:r.top,right:r.right,bottom:r.bottom},
     start,selected,moved,delta};
   }
   const s=window.NONO_INPUT_CUSTOM.settings;
   const persisted=JSON.parse(localStorage.getItem('nono-input-settings-v1'));
   control.set('mode','smartHybrid');
   const railHidden=getComputedStyle(rail).display==='none';
   return {slots,center:{left:center.left,right:center.right,top:center.top,bottom:center.bottom},
    savedSpeed:s.smartPanSpeed,storedSpeed:persisted.smartPanSpeed,railHidden};
  });
  for(const [dir,slot] of Object.entries(smartEdges.slots)){
   if(slot.selected.row!==slot.start.row+slot.delta[0]||
      slot.selected.col!==slot.start.col+slot.delta[1]||
      slot.moved.row!==slot.selected.row||slot.moved.col!==slot.selected.col)
    throw Error('Smart strip movement failed '+dir+': '+JSON.stringify(slot));
   const r=slot.r;
   if(r.left<0||r.top<0||r.right>390||r.bottom>844)
    throw Error('Smart strip is clipped '+dir+': '+JSON.stringify(r));
   if((dir==='up'&&r.bottom>smartEdges.center.top)||
      (dir==='down'&&r.top<smartEdges.center.bottom)||
      (dir==='left'&&r.right>smartEdges.center.left)||
      (dir==='right'&&r.left<smartEdges.center.right))
    throw Error('Smart strip overlaps miniature '+dir+': '+JSON.stringify(smartEdges));
  }
  if(smartEdges.savedSpeed!==22||smartEdges.storedSpeed!==22||!smartEdges.railHidden)
   throw Error('Speed persistence or hybrid strip visibility failed: '+JSON.stringify(smartEdges));
  console.log('Smart directional strips, 22-cell speed persistence and hybrid hiding passed.');
  if(mobileErrors.length)throw Error('Mobile game exceptions: '+mobileErrors.join(' | '));
  await mobileContext.close();
  console.log('Mobile app viewport, tap-vs-swipe and internal zoom panning passed.');
  await page.setViewportSize({width:1280,height:850});
  if(errors.length)throw Error('Main-player errors: '+errors.join(' | '));
  console.log('PLAYTEST_PASS: original editor; rabbit 53x73, samurai 72x72, paint, undo, redo, resume and switch');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
