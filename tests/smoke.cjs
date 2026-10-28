const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{}) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/firebase-config.js', route => route.fulfill({body:'window.NONO_FIREBASE_CONFIG={};',contentType:'text/javascript'}));
  // Test the exact built directory deployed to Cloudflare, not repository-root files.
  for(const name of ['row-highlight','pointer-follow','hint-hud','filled-run','drag-hud']){
    const picture=path.resolve(__dirname,'..','dist','assets','setting-guides',name+'.svg');
    if(!fs.existsSync(picture))throw new Error('Missing approved guide in deploy bundle: '+name);
    const data=fs.readFileSync(picture,'utf8');
    if(!data.includes('<svg')||!data.includes('</svg>')||data.length<200)
      throw new Error('Malformed deployed guide SVG: '+name);
  }
  const builtHtml=fs.readFileSync(path.resolve(__dirname,'..','dist','index.html'),'utf8');
  if(!/settings\\.js\\?v=[a-f0-9]{12}/.test(builtHtml))
    throw new Error('Built settings script reference has no fresh hash, browser may show stale diagrams');
  await page.goto(pathToFileURL(path.resolve(__dirname, '..', 'dist','index.html')).href);
  await page.locator('#nono-open-settings').waitFor();

  await page.locator('#nono-theme-open').waitFor();
  // The approved compact base layout shares one left/right edge across
  // the header, all four mode tabs and the full settings card.
  const base=await page.evaluate(()=>{
    const rect=id=>{const r=document.querySelector(id).getBoundingClientRect();return {x:r.x,right:r.right,width:r.width,y:r.y,bottom:r.bottom}};
    return {
      header:rect('.topbar'),tabs:rect('.mode-select'),panel:rect('#setup'),
      heroHidden:getComputedStyle(document.querySelector('.hero')).display==='none',
      nativePickerHidden:getComputedStyle(document.querySelector('#setup>.controls')).display==='none',
      controls:document.querySelectorAll('#nono-quick-size option').length,
      difficulties:document.querySelectorAll('#nono-quick-difficulty option').length,
      pageBackground:getComputedStyle(document.body).backgroundColor,
      shellHeight:document.querySelector('.shell').getBoundingClientRect().height,
      artContent:getComputedStyle(document.querySelector('#setup'),'::after').content,
      originalArt:getComputedStyle(document.querySelector('#home-view'),'::after').content,
      fillerCount:document.querySelectorAll('.nono-base-kicker,.nono-base-detail,.nono-base-footer').length,
      artVisibility:getComputedStyle(document.querySelector('#setup'),'::after').display,
      viewportWidth:window.innerWidth,
      documentWidth:document.documentElement.scrollWidth,
      pageTheme:document.body.dataset.nonoTheme,
      titleColor:getComputedStyle(document.querySelector('.brand')).color,
      selectedTabColor:getComputedStyle(document.querySelector('.mode-card.selected')).backgroundColor,
      choiceSizeRow:document.querySelector('#nono-quick-sizes').getBoundingClientRect().top,
      difficultyRow:document.querySelector('#nono-quick-difficulties').getBoundingClientRect().top
    };
  });
  if(!base.heroHidden || !base.nativePickerHidden || base.controls!==9 || base.difficulties!==3 ||
    Math.abs(base.header.x-base.tabs.x)>1 ||
    Math.abs(base.tabs.x-base.panel.x)>1 ||
    Math.abs(base.header.right-base.tabs.right)>1 ||
    Math.abs(base.tabs.right-base.panel.right)>1 ||
    base.panel.y<base.tabs.bottom || base.panel.width<1000 ||
    base.panel.height>340 || Math.abs(base.panel.x-(base.viewportWidth-base.panel.right))>2 ||
    base.documentWidth>base.viewportWidth+2 ||
    base.shellHeight<800 || base.pageTheme!=='neon' ||
    base.fillerCount!==0 || base.artContent!=='none' ||
    base.originalArt!=='none' || base.selectedTabColor==='rgba(0, 0, 0, 0)' ||
    Math.abs(base.choiceSizeRow-base.difficultyRow)>2)
    throw new Error('Default launcher side edges / compact spacing broken: '+JSON.stringify(base));
  // The default homepage must use the entire available viewport at
  // common desktop, tablet and phone sizes -- no fixed 570px strip.
  for(const viewport of [
    {width:1920,height:1080},
    {width:1280,height:800},
    {width:900,height:700},
    {width:768,height:900},
    {width:390,height:844},
    {width:320,height:720}
  ]){
    await page.setViewportSize(viewport);
    const layout=await page.evaluate(()=>{
      const r=q=>{const b=document.querySelector(q).getBoundingClientRect();return {left:b.left,right:b.right,width:b.width,height:b.height}};
      return {
        header:r('.topbar'), tabs:r('.mode-select'),panel:r('#setup'),
        viewport:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth+2,
        setupArt:getComputedStyle(document.querySelector('#setup'),'::after').display,
        screen:document.querySelector('.shell').getBoundingClientRect().height
      };
    });
    if(layout.overflow || layout.panel.width < Math.min(layout.viewport*.86,1160)-2 ||
      Math.abs(layout.panel.left-(layout.viewport-layout.panel.right))>2 ||
      Math.abs(layout.header.left-layout.tabs.left)>1 ||
      Math.abs(layout.tabs.left-layout.panel.left)>1 ||
      Math.abs(layout.header.right-layout.tabs.right)>1 ||
      Math.abs(layout.tabs.right-layout.panel.right)>1 ||
      layout.setupArt!=='none' ||
      layout.screen<viewport.height-1)
      throw new Error('Viewport-responsive NONO base layout failed: '+JSON.stringify({viewport,...layout}));
  }
  await page.setViewportSize({width:1440,height:900});
  // Simple homepage contract: no decorative English kicker, unnecessary text,
  // or artwork that could be mistaken for the nonogram answer.
  const simple=await page.evaluate(()=>{
    const panel=document.querySelector('#setup').getBoundingClientRect();
    const heading=document.getElementById('setup-heading').getBoundingClientRect();
    const options=document.getElementById('nono-quick-options').getBoundingClientRect();
    const start=document.getElementById('play-alone').getBoundingClientRect();
    const decors=[...document.querySelectorAll('.nono-base-kicker,.nono-base-detail,.nono-base-footer')];
    return {
      panelHeight:panel.height,
      headingSize:parseFloat(getComputedStyle(document.getElementById('setup-heading')).fontSize),
      headingY:heading.y,optionsY:options.y,startY:start.y,
      decors:decors.length,
      panelArt:getComputedStyle(document.getElementById('setup'),'::after').content
    };
  });
  if(simple.decors!==0 || simple.panelArt!=='none' ||
     simple.panelHeight>340 || simple.headingSize<18 ||
     simple.headingY>=simple.optionsY || simple.optionsY>=simple.startY)
    throw new Error('Simple homepage content-only layout failed: '+JSON.stringify(simple));
  await page.screenshot({path:'test-results/default-home-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'test-results/default-home-mobile.png',fullPage:true});
  await page.setViewportSize({width:1440,height:900});
  await page.locator('.mode-card[data-mode="race"]').click();
  if(!await page.locator('#public-lobby').isVisible())throw new Error('Public room lobby must be visible in race mode');
  if(!await page.locator('#quick-match').isVisible())throw new Error('Quick matching action missing');
  if(!await page.locator('#public-room-toggle').isChecked())throw new Error('New rooms must default to public');
  await page.locator('#quick-match').click();
  if(!((await page.locator('#toast').innerText()).includes('온라인 연결')))throw new Error('Offline quick matching must show an honest connection warning');
  if(!await page.locator('#nono-quick-options').isVisible() ||
      !await page.locator('#public-lobby-create').isVisible() ||
      await page.locator('#room-controls').isVisible())
    throw new Error('Race needs compact filters, public lobby and no duplicate room controls');
  const lobbyOrder=await page.evaluate(()=>{
    const top=id=>document.getElementById(id).getBoundingClientRect().top;
    return [top('nono-quick-options'),top('quick-match'),top('public-room-list'),top('public-lobby-create')];
  });
  if(lobbyOrder.some((n,i)=>i>0&&n<=lobbyOrder[i-1]))
    throw new Error('Approved lobby order broken: '+lobbyOrder.join(','));
  if(!await page.locator('#nono-quick-size option[value="30"]').evaluate(option=>option.disabled))
    throw new Error('30x30 multiplayer must stay disabled');
  await page.screenshot({path:'test-results/public-lobby-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2))
    throw new Error('Mobile public lobby has horizontal overflow');
  await page.screenshot({path:'test-results/public-lobby-mobile.png',fullPage:true});
  await page.setViewportSize({width:1440,height:900});
  await page.locator('.mode-card[data-mode="coop"]').click();
  if(!(await page.locator('#quick-match').innerText()).includes('빠른 협동'))
    throw new Error('Coop quick-match label missing');
  await page.locator('.mode-card[data-mode="practice"]').click();
  if(!await page.locator('#nono-quick-options').isVisible() ||
      await page.locator('#public-lobby').isVisible())
    throw new Error('Solo must show only size/difficulty');
  if(!await page.locator('#nono-quick-size option[value="15"]').evaluate(option=>option.disabled))
    throw new Error('Unavailable 15x15 puzzles must not pretend to work');
  await page.selectOption('#nono-quick-size','5');
  if(await page.locator('#puzzle').inputValue()!=='heart5')throw new Error('5x5 does not select real puzzle');
  await page.selectOption('#nono-quick-size','10');
  await page.selectOption('#nono-quick-difficulty','어려움');
  if(await page.locator('#puzzle').inputValue()!=='rocket10')throw new Error('Difficulty does not select actual puzzle');
  // Every (size, difficulty) pair must list all matching real puzzle IDs, not
  // only the 30x30 voxel group. Keep solution thumbnails and titles hidden.
  await page.selectOption('#nono-quick-size','30');
  if(!await page.locator('#nono-quick-difficulty').isVisible())
    throw new Error('Difficulty filter is missing for 30x30');
  if(await page.locator('#nono-quick-variants button').allTextContents().then(x=>x.join(','))!=='01,02,03')
    throw new Error('30x30 puzzle choices should show 01 / 02 / 03');
  await page.locator('#nono-quick-variants button').nth(2).click();
  if(await page.locator('#puzzle').inputValue()!=='vox_crabino_top')
    throw new Error('30x30 puzzle 03 is not wired to the real puzzle');
  // All three large layout previews must exist, be selectable, and have coherent clues.
  for(const size of [50,75,100]){
    await page.selectOption('#nono-quick-size',String(size));
    if(await page.locator('#puzzle').inputValue()!=='size-test-'+size)
      throw new Error('Large layout test size '+size+' cannot be selected');
    if(await page.locator('#nono-quick-variants button').allTextContents().then(x=>x.join(','))!=='01')
      throw new Error('Each large size should offer exactly one random test puzzle');
  }
  const previewPuzzles=await page.evaluate(()=>[50,75,100].map(size=>{
    const p=PUZZLES.find(p=>p.id==='size-test-'+size);
    return p&&{size:p.size,rows:p.rows.length,cols:p.cols.length,
      rowTotal:p.rows.flat().reduce((a,b)=>a+b,0),
      colTotal:p.cols.flat().reduce((a,b)=>a+b,0),test:p.sizeTest};
  }));
  if(previewPuzzles.some((p,i)=>!p||p.size!==[50,75,100][i]||p.rows!==p.size||
    p.cols!==p.size||!p.rowTotal||p.rowTotal!==p.colTotal||!p.test))
    throw new Error('Large random previews have malformed clues: '+JSON.stringify(previewPuzzles));
  await page.selectOption('#nono-quick-size','10');
  await page.selectOption('#nono-quick-difficulty','보통');
  await page.evaluate(()=>{
    const fixture={...PUZZLES.find(p=>p.id==='cat10'),id:'cat10_extra_test',difficulty:'보통'};
    PUZZLES.push(fixture);
    const option=document.createElement('option');
    option.value=fixture.id;option.textContent='시험용 퍼즐';
    document.querySelector('#puzzle').append(option);
    document.querySelector('#puzzle').dispatchEvent(new Event('change',{bubbles:true}));
  });
  if(await page.locator('#nono-quick-variants button').allTextContents().then(x=>x.join(','))!=='01,02')
    throw new Error('All puzzles matching the size and difficulty must appear');
  await page.locator('#nono-quick-variants button').nth(1).click();
  if(await page.locator('#puzzle').inputValue()!=='cat10_extra_test')
    throw new Error('Newly registered matching puzzle was not selectable');
  await page.evaluate(()=>{
    const index=PUZZLES.findIndex(p=>p.id==='cat10_extra_test');
    if(index!==-1)PUZZLES.splice(index,1);
    document.querySelector('#puzzle option[value="cat10_extra_test"]')?.remove();
    document.querySelector('#puzzle').value='cat10';
    document.querySelector('#puzzle').dispatchEvent(new Event('change',{bubbles:true}));
  });
  if(await page.locator('#nono-quick-variants button').count()!==1)
    throw new Error('Puzzle chooser was not refreshed after list changes');
  const voxelIds=await page.evaluate(()=>PUZZLES.filter(p=>p.size===30).map(p=>p.id));
  if(voxelIds.join(',')!=='vox_crabino_front,vox_crabino_side,vox_crabino_top')
    throw new Error('Missing voxel puzzle datasets');

  // The large random previews must show their entire grid and clues without scrolling.
  for(const size of [50,75,100]){
    await page.selectOption('#nono-quick-size',String(size));
    if(await page.locator('#puzzle').inputValue()!=='size-test-'+size)
      throw new Error('Large layout selector failed for '+size);
    await page.click('#play-alone');
    await page.waitForFunction(()=>document.querySelector('#board')?.dataset.fitCellSize);
    const layout=await page.evaluate(()=>{
      const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom}};
      const boardElement=document.querySelector('#board');
      const boardArea=document.querySelector('#game .board-scroll');
      const topbar=document.querySelector('.topbar'),gameHeader=document.querySelector('#game .game-header');
      const hints=[...boardElement.querySelectorAll('.row-clue span,.col-clue span')];
      const clipped=hints.filter(el=>{
        const span=el.getBoundingClientRect(),cell=el.closest('.row-clue,.col-clue').getBoundingClientRect();
        return span.width<2||span.height<2||span.left<cell.left-1||
          span.right>cell.right+1||span.top<cell.top-1||span.bottom>cell.bottom+1||
          el.scrollWidth>el.clientWidth+2||el.scrollHeight>el.clientHeight+2;
      }).length;
      return {board:rect(boardElement),
        card:rect(document.querySelector('.board-card')),
        topbar:rect(topbar),header:rect(gameHeader),
        toolbars:['#nono-board-zoom','.board-footer','#nono-actions'].map(selector=>rect(document.querySelector('#game '+selector))),
        screen:{width:innerWidth,height:innerHeight},
        scroll:{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,
          htmlX:getComputedStyle(document.documentElement).overflowX,
          htmlY:getComputedStyle(document.documentElement).overflowY,
          bodyX:getComputedStyle(document.body).overflowX,
          bodyY:getComputedStyle(document.body).overflowY,
          scrollX:window.scrollX,scrollY:window.scrollY},
        areaScroll:{width:boardArea.scrollWidth,clientWidth:boardArea.clientWidth,
          height:boardArea.scrollHeight,clientHeight:boardArea.clientHeight,
          overflowX:getComputedStyle(boardArea).overflowX,overflowY:getComputedStyle(boardArea).overflowY},
        hintCount:hints.length,clippedHintCount:clipped,
        coordinateCount:document.querySelectorAll('#board .cell[data-row-coordinate]').length,
        oldIndices:document.querySelectorAll('#board .nono-clue-index').length};
    });
    console.log('Large board fit '+size+'x'+size+': '+JSON.stringify(layout));
    if(layout.scroll.htmlX!=='hidden'||layout.scroll.htmlY!=='hidden'||
       layout.scroll.bodyX!=='hidden'||layout.scroll.bodyY!=='hidden'||
       layout.scroll.scrollX!==0||layout.scroll.scrollY!==0)
      throw new Error('At screen fit both document scroll axes must be disabled: '+JSON.stringify(layout.scroll));
    if(layout.board.left<-3||layout.board.top<0||layout.board.right>layout.screen.width+3||
       layout.board.bottom>layout.screen.height+3||layout.card.bottom>layout.screen.height+3||
       layout.scroll.width>layout.screen.width+3||layout.scroll.height>layout.screen.height+3)
      throw new Error('Large '+size+'x'+size+' viewport fit failed: '+JSON.stringify(layout));
    // The play card itself must use almost the entire viewport width.
    if(layout.card.left>20||layout.card.right<layout.screen.width-20)
      throw new Error('Excessive horizontal margins remain on the play card: '+JSON.stringify(layout));
    if(layout.topbar.left>20||layout.topbar.right<layout.screen.width-20||
       layout.header.left>20||layout.header.right<layout.screen.width-20)
      throw new Error('Navigation/header should span the play card width: '+JSON.stringify(layout));
    if(layout.hintCount===0||layout.clippedHintCount>0)
      throw new Error('Clue numbers missing or clipped at '+size+': '+JSON.stringify(layout));
    if(layout.areaScroll.overflowX!=='hidden'||layout.areaScroll.overflowY!=='hidden'||
       layout.areaScroll.width>layout.areaScroll.clientWidth+3||
       layout.areaScroll.height>layout.areaScroll.clientHeight+3)
      throw new Error('Puzzle board has internal scroll or hidden content: '+JSON.stringify(layout));
    if(layout.coordinateCount!==size/5||layout.oldIndices!==0)
      throw new Error('Row coordinates should mark the right grid edge: '+JSON.stringify(layout));
    // Screen fit must visibly prioritize the puzzle. The previous implementation
    // passed despite a ~590px board on a 900px screen, so reject that regression.
    const fittedHeight=layout.board.bottom-layout.board.top;
    if(fittedHeight<layout.screen.height*.96 ||
       layout.board.top>layout.screen.height*.025 ||
       layout.board.bottom<layout.screen.height*.975)
      throw new Error(size+'x'+size+' must reach both viewport edges without vertical blank bands: '+JSON.stringify(layout));
    for(const toolbar of layout.toolbars){
      const overlapW=Math.min(layout.board.right,toolbar.right)-Math.max(layout.board.left,toolbar.left);
      const overlapH=Math.min(layout.board.bottom,toolbar.bottom)-Math.max(layout.board.top,toolbar.top);
      if(overlapW>1&&overlapH>1)
        throw new Error('Floating controls must not cover puzzle or clues: '+JSON.stringify({size,toolbar,board:layout.board}));
    }
    if(layout.areaScroll.clientHeight<layout.screen.height*.72)
      throw new Error('Puzzle region still loses excessive height to toolbars: '+JSON.stringify(layout));
    const initial=Number(await page.locator('#board').getAttribute('data-fit-cell-size')||
      await page.locator('#board').getAttribute('data-fit-cell-size'));
    // Dataset property is also exposed through data-fit-cell-size, and zoom updates on RAF.
    if(!Number.isFinite(initial)||initial<=0)throw new Error('Missing computed cell size');
    // The first intentional direction locks the drag to one row or column.
    // Moving outside the starting line/board projects the pointer onto that axis.
    if(size===50){
      const start=20*size+20;
      const point=async index=>{
        const rect=await page.locator('#board .cell').nth(index).boundingBox();
        if(!rect)throw new Error('Missing drag cell '+index);
        return {x:rect.x+rect.width/2,y:rect.y+rect.height/2};
      };
      const origin=await point(start),far=await point(start+6),
        back=await point(start+2),down=await point(start+size*6);
      await page.mouse.move(origin.x,origin.y);
      const initialState=await page.evaluate(()=>({undo:undoStack.length,values:board.slice()}));
      await page.mouse.down();
      const hudOnPress=await page.locator('#nono-drag-hud').evaluate(el=>({
        hidden:el.hidden,active:el.classList.contains('nono-drag-active'),text:el.textContent,
        display:getComputedStyle(el).display,rect:el.getBoundingClientRect().toJSON()
      }));
      if(hudOnPress.hidden||!hudOnPress.active||!hudOnPress.text.includes('1칸')||hudOnPress.display==='none')
        throw new Error('Drag count HUD must show as soon as mouse is pressed: '+JSON.stringify(hudOnPress));
      await page.mouse.move(far.x,far.y,{steps:5});
      const hudDuring=await page.locator('#nono-drag-hud').evaluate(el=>({
        hidden:el.hidden,active:el.classList.contains('nono-drag-active'),text:el.textContent,
        left:el.getBoundingClientRect().left,top:el.getBoundingClientRect().top,
        display:getComputedStyle(el).display
      }));
      if(hudDuring.hidden||!hudDuring.active||!hudDuring.text.includes('7칸')||
        hudDuring.display==='none'||hudDuring.left<0||hudDuring.top<0)
        throw new Error('Drag count HUD must update and remain visible near mouse: '+JSON.stringify(hudDuring));
      let values=await page.evaluate(start=>board.slice(start,start+7),start);
      if(values.some(v=>v!=='1'))throw new Error('One-row drag did not fill its straight segment: '+values.join(''));
      // Leave the row: the selected horizontal segment must still respond to x.
      await page.mouse.move(far.x+35,down.y,{steps:4});
      const offLine=await page.evaluate(({start,size})=>({
        sameRow:board.slice(start,start+9),nextRow:board[start+size+6]}),{start,size});
      if(offLine.sameRow.some(v=>v!=='1')||offLine.nextRow!=='0')
        throw new Error('Drag changed another row or failed when pointer left its row: '+JSON.stringify(offLine));
      // Leaving the *entire board* still updates/clamps to its last column.
      const bounds=await page.locator('#board .cells').boundingBox();
      await page.mouse.move(bounds.x+bounds.width+45,down.y,{steps:2});
      const lastColumn=await page.evaluate(({start,size})=>board[start-start%size+size-1],{start,size});
      if(lastColumn!=='1')throw new Error('Dragging past the board right edge did not reach the last column');
      await page.mouse.move(back.x,down.y,{steps:4});
      values=await page.evaluate(start=>board.slice(start,start+9),start);
      if(values.slice(0,3).some(v=>v!=='1')||values.slice(3).some(v=>v!=='0'))
        throw new Error('Backward drag did not shrink its single row: '+values.join(''));
      // Backtrack completely to the first cell, then switch to vertical
      // without releasing the mouse button.
      await page.mouse.move(origin.x,down.y,{steps:4});
      const atStart=await page.evaluate(start=>board.slice(start,start+9),start);
      if(atStart[0]!=='1'||atStart.slice(1).some(v=>v!=='0'))
        throw new Error('Returning to origin must clear previous horizontal stroke: '+atStart.join(''));
      await page.mouse.move(origin.x,origin.y,{steps:3});
      await page.mouse.move(origin.x,down.y,{steps:4});
      const changedAxis=await page.evaluate(({start,size})=>({
        vertical:Array.from({length:7},(_,i)=>board[start+i*size]),
        horizontal:board[start+2]}),{start,size});
      if(changedAxis.vertical.some(v=>v!=='1')||changedAxis.horizontal!=='0')
        throw new Error('Returning to start did not unlock row to column switch: '+JSON.stringify(changedAxis));
      await page.mouse.up();
      const ended=await page.locator('#nono-drag-hud').evaluate(el=>({
        hidden:el.hidden,active:el.classList.contains('nono-drag-active')}));
      if(!ended.hidden||ended.active)throw new Error('HUD must disappear after stroke: '+JSON.stringify(ended));
      const afterState=await page.evaluate(()=>({undo:undoStack.length,dragging:!document.getElementById('nono-drag-hud').hidden}));
      if(afterState.dragging||afterState.undo!==initialState.undo+1)
        throw new Error('Row stroke must commit one undo entry: '+JSON.stringify({initial:initialState.undo,after:afterState}));
      await page.click('#undo');
      let restored=await page.evaluate(()=>board.slice());
      if(JSON.stringify(restored)!==JSON.stringify(initialState.values))
        throw new Error('Undo failed to restore a full row stroke');
      // A fresh vertical stroke remains in its original column while pointer is off-column.
      await page.mouse.move(origin.x,origin.y);
      await page.mouse.down();
      const chooseVertical=await point(start+size*2);
      await page.mouse.move(chooseVertical.x,chooseVertical.y,{steps:3});
      await page.mouse.move(bounds.x-45,down.y,{steps:3});
      const vertical=await page.evaluate(({start,size})=>({
        inColumn:Array.from({length:7},(_,i)=>board[start+i*size]),
        adjacent:board[start+size*6-1]}),{start,size});
      if(vertical.inColumn.some(v=>v!=='1')||vertical.adjacent!=='0')
        throw new Error('Vertical drag failed to stay in one column outside that column: '+JSON.stringify(vertical));
      await page.mouse.up();
      await page.click('#undo');
      restored=await page.evaluate(()=>board.slice());
      if(JSON.stringify(restored)!==JSON.stringify(initialState.values))
        throw new Error('Undo failed to restore a vertical stroke');
      // Jump the hover directly across the board in a single pointermove.
      await page.mouse.move(origin.x,origin.y,{steps:1});
      const destination=await point(33*size+38);
      await page.mouse.move(destination.x,destination.y,{steps:1});
      const cursor=await page.evaluate(({start,dest})=>({
        current:document.querySelectorAll('#board .cell')[dest].classList.contains('active'),
        former:document.querySelectorAll('#board .cell')[start].classList.contains('active'),
        selected}),{start,dest:33*size+38});
      if(!cursor.current||cursor.former||cursor.selected!==33*size+38)
        throw new Error('Hover should immediately jump to the actual mouse cell: '+JSON.stringify(cursor));
      await page.click('#nono-open-settings');
      await page.getByRole('tab',{name:'편의성·힌트'}).click();
      const pref=page.locator('#nono-settings-content input[aria-label="마우스 실시간 선택"]');
      if(!await pref.isChecked())throw new Error('Mouse-follow preference must default to ON');
      const rows=await page.locator('#nono-settings-content .nono-setting').count();
      const helps=await page.locator('#nono-settings-content .nono-setting .nono-setting-visual').count();
      if(rows!==helps)throw new Error('Each setting needs an individual illustration button');
      for(const [label,path] of [
        ['현재 행·열 강조','row-highlight.svg'],
        ['마우스 실시간 선택','pointer-follow.svg'],
        ['현재 행·열 숫자 HUD','hint-hud.svg'],
        ['연속 색칠 칸 수 표시','filled-run.svg'],
        ['드래그 칸 수 HUD','drag-hud.svg']
      ]){
        await page.getByRole('button',{name:label+' 이미지로 설명보기'}).click();
        const img=page.locator('#nono-guide-overlay img.nono-guide-approved-image');
        await img.waitFor();
        await page.waitForFunction(path=>{
          const image=document.querySelector('#nono-guide-overlay img.nono-guide-approved-image');
          return image&&image.complete&&image.naturalWidth>0&&image.getAttribute('src').endsWith(path);
        },path);
        if(await page.locator('#nono-guide-overlay .nono-guide-item').count()!==1)
          throw new Error('Guide must only show requested option '+label);
        await page.locator('#nono-guide-overlay button').first().click();
      }

      await pref.uncheck();await page.click('#nono-settings-close');
      const oldSelected=await page.evaluate(()=>selected);
      await page.mouse.move(origin.x,origin.y,{steps:1});
      if(await page.evaluate(()=>selected)!==oldSelected)
        throw new Error('Mouse-follow OFF must prevent cursor selection');
      await page.click('#nono-open-settings');
      await page.getByRole('tab',{name:'편의성·힌트'}).click();
      await pref.check();
      const runToggle=page.locator('#nono-settings-content input[aria-label="연속 색칠 칸 수 표시"]');
      const runThreshold=page.locator('#nono-settings-content input[aria-label="연속 칸 숫자 표시 기준"]');
      if(await runToggle.isChecked()||!(await runThreshold.count()))
        throw new Error('Continuous painted-run length feature should default to OFF with a numeric threshold');
      const mergedRow=page.locator('#nono-settings-content .nono-setting-run');
      if(await mergedRow.count()!==1||
         await mergedRow.locator('input[type=checkbox]').count()!==1||
         await mergedRow.locator('input[type=range]').count()!==1||
         await mergedRow.locator('.nono-setting-visual').count()!==1||
         await page.getByText('연속 칸 숫자 표시 기준',{exact:true}).count()!==0)
        throw new Error('Count toggle and threshold must share one settings row');
      if(!await runThreshold.isDisabled())throw new Error('Threshold should be disabled when run labels are off');
      await runToggle.check();
      if(await runThreshold.isDisabled())throw new Error('Threshold must be active after enabling run labels');
      await page.click('#nono-settings-close');
      await page.evaluate(start=>{
        for(let i=0;i<12;i++)board[i]='1';
        render();
      },start);
      const runLabels=await page.locator('#board .nono-run-number').allTextContents();
      if(!runLabels.includes('12'))throw new Error('Run-count label did not appear beyond threshold: '+JSON.stringify(runLabels));
      await page.evaluate(()=>{for(let i=0;i<12;i++)board[i]='0';render();});
      await page.click('#nono-open-settings');
      await page.getByRole('tab',{name:'편의성·힌트'}).click();
      await runToggle.uncheck();await page.click('#nono-settings-close');
    }
    await page.click('#nono-zoom-out');
    await page.waitForFunction(previous=>Number(document.querySelector('#board').dataset.fitCellSize)<previous,initial);
    await page.click('#nono-zoom-center');
    await page.click('#nono-zoom-in');
    await page.waitForFunction(previous=>Math.abs(Number(document.querySelector('#board').dataset.fitCellSize)-previous)<.05,initial);
    if(await page.locator('#nono-zoom-in').isDisabled())
      throw new Error('Zoom-in must remain available beyond full-screen fit');
    await page.click('#nono-zoom-in');
    await page.waitForFunction(previous=>Number(document.querySelector('#board').dataset.fitCellSize)>previous,initial);
    const extraZoom=await page.evaluate(()=>{
      const area=document.querySelector('#game .board-scroll');
      return {
        cell:Number(document.querySelector('#board').dataset.fitCellSize),
        overflowX:getComputedStyle(area).overflowX,overflowY:getComputedStyle(area).overflowY,
        pageWidth:document.documentElement.scrollWidth,pageHeight:document.documentElement.scrollHeight,
        label:document.querySelector('#nono-zoom-label').textContent};
    });
    if(extraZoom.cell<=initial||extraZoom.overflowX!=='hidden'||extraZoom.overflowY!=='hidden'||
       extraZoom.pageHeight<=900)
      throw new Error('Beyond-fit zoom must scroll the document, never the puzzle: '+JSON.stringify(extraZoom));
    const pageScroll=await page.evaluate(()=>{
      window.scrollTo({top:230,left:75,behavior:'instant'});
      return {y:window.scrollY,x:window.scrollX};
    });
    if(pageScroll.y<=0||(extraZoom.pageWidth>1440&&pageScroll.x<=0))
      throw new Error('Site must retain native vertical and horizontal scrolling when enlarged: '+JSON.stringify(pageScroll));
    await page.evaluate(()=>window.scrollTo({top:0,left:0,behavior:'instant'}));
    await page.click('#nono-zoom-out');
    await page.click('#nono-zoom-out');
    await page.waitForFunction(previous=>Number(document.querySelector('#board').dataset.fitCellSize)<previous,initial);
    await page.click('#nono-zoom-fit');
    await page.waitForFunction(previous=>Math.abs(Number(document.querySelector('#board').dataset.fitCellSize)-previous)<.05,initial);
    const afterFit=await page.evaluate(()=>{
      const area=document.querySelector('#game .board-scroll');
      const board=document.querySelector('#board').getBoundingClientRect();
      const host=area.getBoundingClientRect();
      return {scrollLeft:area.scrollLeft,scrollTop:area.scrollTop,
        overflowX:getComputedStyle(area).overflowX,
        overflowY:getComputedStyle(area).overflowY,
        htmlX:getComputedStyle(document.documentElement).overflowX,
        htmlY:getComputedStyle(document.documentElement).overflowY,
        bodyX:getComputedStyle(document.body).overflowX,
        bodyY:getComputedStyle(document.body).overflowY,
        pageWidth:document.documentElement.scrollWidth,
        pageHeight:document.documentElement.scrollHeight,
        viewportW:innerWidth,viewportH:innerHeight,
        centered:Math.abs((board.left+board.right)/2-(host.left+host.right)/2)<4};
    });
    if(!afterFit.centered||afterFit.scrollTop!==0||afterFit.scrollLeft!==0||
       afterFit.overflowX!=='hidden'||afterFit.overflowY!=='hidden'||
       afterFit.htmlX!=='hidden'||afterFit.htmlY!=='hidden'||
       afterFit.bodyX!=='hidden'||afterFit.bodyY!=='hidden'||
       afterFit.pageWidth>afterFit.viewportW+2||afterFit.pageHeight>afterFit.viewportH+2)
      throw new Error('Screen fit must restore size and center with no scroll: '+JSON.stringify(afterFit));
    await page.evaluate(()=>leaveGame());
  }
  await page.click('#nono-open-settings');
  await page.getByRole('tab',{name:'보드·화면'}).click();
  if(await page.locator('#nono-visual-help').count()!==0)
    throw new Error('Global image explanation button must be absent');
  await page.getByRole('button',{name:'일반 격자선 두께 이미지로 설명보기'}).click();
  if(!await page.locator('#nono-guide-overlay').isVisible()||
     await page.locator('#nono-guide-overlay .nono-guide-item').count()!==1||
     await page.locator('#nono-guide-overlay svg').count()!==2)
    throw new Error('Per-setting illustrated explanation must remain available');
  await page.locator('#nono-guide-overlay button').first().click();
  await page.click('#nono-settings-close');

  await page.click('#nono-theme-open');
  if (await page.locator('.nono-theme-card').count() !== 10) throw new Error('Ten tiered theme cards not found');
  if(await page.locator('.nono-theme-section').count()!==2)throw new Error('Color/world theme categories missing');
  if(await page.locator('.nono-theme-card[data-tier="color"]').count()!==5)throw new Error('Incorrect color theme count');
  if(await page.locator('.nono-theme-card[data-tier="world"]').count()!==5)throw new Error('Incorrect world theme count');
  await page.getByRole('button', { name: '크림 라벤더 미리보기' }).click();
  if (await page.locator('body').getAttribute('data-nono-theme') !== 'pastel')
    throw new Error('Theme preview did not apply site-wide');
  await page.getByRole('button', { name: '오로라 네온 미리보기' }).click();
  if(await page.locator('body').getAttribute('data-nono-theme')!=='aurora')throw new Error('Aurora color theme unavailable');
  await page.click('#nono-theme-close');
  if (await page.locator('body').getAttribute('data-nono-theme') !== 'neon')
    throw new Error('Closing preview did not restore default theme');
  await page.click('#nono-theme-open');
  await page.getByRole('button', { name: '포레스트 그린 미리보기' }).click();
  await page.locator('#nono-theme-use').click();
  if (await page.locator('body').getAttribute('data-nono-theme') !== 'forest')
    throw new Error('Temporary theme trial was not applied');
  // A full world skin must replace the hero artwork and structurally redesign the game.
  for (const [id,label] of [['arcade','픽셀 시티 아케이드'],['library','신비로운 도서관'],['enchanted','정령의 숲'],['cosmos','우주 관제실']]) {
    await page.click('#nono-theme-open');
    await page.getByRole('button',{name:label+' 미리보기'}).click();
    const world=await page.evaluate(()=>{
      const hero=document.querySelector('.hero');
      const scene=hero.querySelector('.nono-world-scene');
      return {theme:document.body.dataset.nonoTheme,
        sceneImage:getComputedStyle(scene).backgroundImage,
        sceneDisplay:getComputedStyle(scene).display,
        catDisplay:getComputedStyle(hero.querySelector('.hero-art')).display,
        heroBorder:getComputedStyle(hero).borderRadius,
        cardBorder:getComputedStyle(document.querySelector('.mode-card')).borderRadius,
        homeGalleryDisplay:getComputedStyle(document.querySelector('.nono-world-extras')).display,
        homeGalleryItems:document.querySelectorAll('.nono-world-puzzle').length,
        heroAction:getComputedStyle(document.querySelector('.nono-world-cta')).display};
    });
    if(world.theme!==id || !world.sceneImage.includes('scene.svg') ||
      (id!=='library' && world.sceneDisplay==='none') ||
      world.catDisplay!=='none' || world.homeGalleryDisplay==='none' ||
      world.homeGalleryItems<3 || world.heroAction==='none')
      throw new Error('Premium world visual assets or interactions missing: '+JSON.stringify(world));
    await page.click('#nono-theme-close');
    if(await page.locator('body').getAttribute('data-nono-theme')!=='forest')
      throw new Error('Closing premium preview failed to restore prior tier');
  }
  const siteTheme = await page.locator('.hero').evaluate(el=>getComputedStyle(el).backgroundImage);
  const cellTheme = await page.locator('#nono-theme-open').evaluate(el=>getComputedStyle(el).backgroundColor);
  if(!siteTheme.includes('gradient') || cellTheme === 'rgba(0, 0, 0, 0)')
    throw new Error('Theme did not update the surrounding UI');

  // Premium worlds must be functional, not just mockup decoration.
  await page.click('#nono-theme-open');
  await page.getByRole('button',{name:'신비로운 도서관 미리보기'}).click();
  await page.locator('#nono-theme-use').click();
  // SVG originals are vector artwork, not compressed/cropped portions of the mockup.
  for(const name of ['library-world','library-mode-practice','library-mode-race','library-mode-coop','library-mode-record']){
    const source=fs.readFileSync(path.resolve(__dirname,'..','assets',name+'.svg'),'utf8');
    if(!source.includes('<svg') || !source.includes('viewBox'))
      throw new Error('Real scalable library artwork missing: '+name);
  }
  // The reference-inspired library is a real page layout, not just a color filter.
  const libraryUI=await page.evaluate(()=>{
    const hero=document.querySelector('.hero');
    const topbar=document.querySelector('.topbar');
    const card=document.querySelector('.mode-card');
    const gallery=document.querySelector('.nono-world-panel');
    return {nav:getComputedStyle(document.querySelector('.nono-library-nav')).display,
      heroImage:getComputedStyle(hero).backgroundImage,
      heroHeight:hero.getBoundingClientRect().height,
      cardHeight:card.getBoundingClientRect().height,
      cardArtwork:getComputedStyle(card,'::before').backgroundImage,
      galleryText:getComputedStyle(gallery).color,
      headerHeight:topbar.getBoundingClientRect().height};
  });
  if(libraryUI.nav==='none' || !libraryUI.heroImage.includes('library-world.svg') ||
    libraryUI.heroHeight<390 || libraryUI.cardHeight<240 ||
    !libraryUI.heroImage.includes('linear-gradient') ||
    !libraryUI.cardArtwork.includes('library-mode-practice.svg'))
    throw new Error('Illustrated library homepage did not render as intended: '+JSON.stringify(libraryUI));
  const worldItems=page.locator('.nono-world-puzzle');
  await worldItems.last().click();
  if(!await page.locator('#puzzle').inputValue())throw new Error('Premium puzzle selection did not set puzzle picker');
  await page.selectOption('#puzzle','heart5'); // Continue the existing five-cell completion/resume regression test.
  await page.click('#nono-open-settings');
  await page.locator('#nono-settings-content').waitFor();
  if (!await page.locator('.nono-setting').count()) throw new Error('No settings rendered');
  // Guard against the collapsed tab strip seen when the settings modal has lots of options.
  for (const viewport of [{width:1440,height:900},{width:390,height:660}]) {
    await page.setViewportSize(viewport);
    const geometry = await page.locator('.nono-settings-tabs').evaluate(el => {
      const tab = el.querySelector('button');
      const bar = el.getBoundingClientRect();
      const btn = tab.getBoundingClientRect();
      return {barHeight:bar.height,buttonHeight:btn.height,
        cropped:btn.top < bar.top || btn.bottom > bar.bottom,
        horizontalScroll:getComputedStyle(el).overflowX,
        verticalScroll:getComputedStyle(el).overflowY};
    });
    if (geometry.barHeight < 54 || geometry.buttonHeight < 36 || geometry.cropped) {
      throw new Error('Settings tab bar is clipped at ' + viewport.width + 'px: ' + JSON.stringify(geometry));
    }
  }
  await page.setViewportSize({width:1440,height:900});
  const tabNames = await page.locator('.nono-settings-tabs button').allTextContents();
  if (!tabNames.includes('멀티플레이') || tabNames.some(t => t.includes('성능'))) {
    throw new Error('Settings should expose multiplayer without a performance tab: ' + tabNames.join(', '));
  }
  await page.getByRole('tab', { name: '멀티플레이' }).click();
  const multiSettings = await page.locator('#nono-settings-content').innerText();
  if (!multiSettings.includes('다른 플레이어 커서') || !multiSettings.includes('다른 플레이어 이름')) {
    throw new Error('Multiplayer preferences are missing');
  }
  if (/화질|품질|LOD|FPS|자동 성능|그래픽 프리셋/.test(multiSettings)) {
    throw new Error('Removed graphics or performance controls are still visible');
  }
  await page.click('#nono-settings-close');
  await page.click('#play-alone');
  await page.locator('#board .cell').first().waitFor();
  if(await page.locator('.timer-stat').isVisible())throw new Error('Play timer must default to hidden');
  if((await page.locator('#game-title').innerText()).includes('하트'))
    throw new Error('Solution subject leaked into game title');
  await page.locator('#board .cell').nth(1).hover();
  if(!await page.locator('#board .cell').nth(1).evaluate(el=>el.classList.contains('active')))
    throw new Error('Mouse hover does not follow the current cell');
  await page.keyboard.down('Alt');
  await page.keyboard.press('ArrowLeft');
  if(await page.locator('#board .nono-alt-hint-target').count()!==1)
    throw new Error('Alt+Left did not move focus into current row hints');
  await page.keyboard.up('Alt');
  if(!await page.locator('#board > .row-clues .row-clue').first().locator('span').last()
    .evaluate(el=>el.classList.contains('nono-fade-clue')))
    throw new Error('Releasing Alt did not manually fade the focused clue');
  const premiumBorder=await page.locator('.board-card').evaluate(el=>getComputedStyle(el).borderTopWidth);
  if(parseFloat(premiumBorder)<5)throw new Error('Premium library board frame was not applied to gameplay');
  const illustratedGame=await page.evaluate(()=>{
    const board=document.querySelector('.board-card');
    const panel=document.querySelector('.nono-library-side');
    return {boardBackground:getComputedStyle(board).backgroundImage,
      panelVisible:getComputedStyle(panel).display!=='none' && !panel.hidden,
      clueColor:getComputedStyle(document.querySelector('.row-clue')).color};
  });
  if(!illustratedGame.boardBackground.includes('gradient') || !illustratedGame.panelVisible)
    throw new Error('Library parchment game area or live objective sidebar is missing: '+JSON.stringify(illustratedGame));
  await page.click('#nono-theme-open');
  await page.getByRole('button',{name:'크림 라벤더 미리보기'}).click();
  const colorBorder=await page.locator('.board-card').evaluate(el=>getComputedStyle(el).borderTopWidth);
  if(colorBorder===premiumBorder)throw new Error('Changing to cheap color theme did not restore base board structure');
  await page.click('#nono-theme-close');
  if(await page.locator('#nono-drag-hud').isVisible())throw new Error('Idle drag counter must be hidden');
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('x');
  await page.keyboard.press('h');
  await page.keyboard.press('Space');
  await page.keyboard.press('h');
  await page.keyboard.press('Tab');
  await page.locator('#nono-overview').waitFor({ state: 'visible' });
  await page.keyboard.press('Tab');
  await page.locator('#nono-overview').waitFor({ state: 'hidden' });
  await page.click('#nono-hint-action');
  await page.click('#nono-check-action');
  await page.click('#nono-open-settings');
  await page.locator('.nono-settings-tabs button').nth(2).click();
  const both = page.locator('.nono-setting').filter({ hasText: '힌트 숫자 양쪽 표시' }).locator('input');
  await both.check();
  await page.click('#nono-settings-close');
  if (!await page.locator('#board .nono-extra-row').count()) throw new Error('Two-sided clues not rendered');
  await page.click('#nono-open-settings');
  await page.locator('.nono-settings-tabs button').nth(1).click();
  await page.getByText('HUD 편집 · 위치/크기/배경').click();
  await page.locator('#nono-hud-editor').waitFor();
  await page.locator('#nono-hud-editor button').last().click();
  await page.locator('#nono-hud-editor').waitFor({state:'detached'});
  const {answers}=require('./puzzles.cjs');
  const completedAt=await page.evaluate(answer=>{board=answer.split('');startedAt=Date.now()-15000;finishLocal();return finishedAt;},answers.heart5);
  await page.reload();await page.locator('#nono-open-settings').waitFor();
  if(await page.locator('body').getAttribute('data-nono-theme')!=='library')throw new Error('Temporary library trial was not retained in the same browser tab');
  const freshContext=await browser.newContext();
  await freshContext.route('**/firebase-config.js', route => route.fulfill({body:'window.NONO_FIREBASE_CONFIG={};',contentType:'text/javascript'}));
  const freshTab=await freshContext.newPage();
  await freshTab.goto(pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href);
  if(await freshTab.locator('body').getAttribute('data-nono-theme')!=='neon')throw new Error('Temporary trial leaked into a new browser session');
  await freshContext.close();
  await page.click('#play-alone');
  const restoredAt=await page.evaluate(()=>finishedAt);
  if(restoredAt!==completedAt)throw new Error('Completed practice time changed on resume');
  // The moonlit forest must be an independent website layer, not altered colors on the default home.
  const forestPage=await browser.newPage({viewport:{width:1440,height:900}});
  const forestErrors=[];
  forestPage.on('pageerror',error=>forestErrors.push(error.message));
  await forestPage.route('**/firebase-config.js',route=>route.fulfill({body:'window.NONO_FIREBASE_CONFIG={};',contentType:'text/javascript'}));
  await forestPage.goto(pathToFileURL(path.resolve(__dirname,'..','index.html')).href);
  await forestPage.click('#nono-theme-open');
  await forestPage.getByRole('button',{name:'정령의 숲 미리보기'}).click();
  await forestPage.locator('#nono-theme-use').click();
  await forestPage.locator('#fg-scene').waitFor({state:'visible'});
  const forestHome=await forestPage.evaluate(()=>{
    const root=document.getElementById('forest-experience');
    const oldShell=document.querySelector('body>.shell');
    const scene=document.getElementById('fg-scene');
    return {
      originalHidden:getComputedStyle(oldShell).display==='none',
      ownHeader:!!root.querySelector('.fg-header'),
      ownTrails:root.querySelectorAll('[data-forest-mode]').length,
      sceneImage:getComputedStyle(scene).backgroundImage,
      setupMounted:!!root.querySelector('#fg-setup-mount #setup'),
      oldHomeInside:!!root.querySelector('#home-view')
    };
  });
  if(!forestHome.originalHidden || !forestHome.ownHeader || forestHome.ownTrails!==4 ||
     !forestHome.sceneImage.includes('forest-world.svg') || !forestHome.setupMounted || forestHome.oldHomeInside)
    throw new Error('Standalone forest homepage incomplete: '+JSON.stringify(forestHome));
  await forestPage.locator('[data-forest-mode="race"]').click();
  if(!await forestPage.locator('.mode-card[data-mode="race"]').evaluate(el=>el.classList.contains('selected')))
    throw new Error('Forest mode choice did not update actual NONO game mode');
  await forestPage.locator('[data-forest-mode="practice"]').click();
  await forestPage.selectOption('#puzzle','heart5');
  await forestPage.click('#play-alone');
  await forestPage.locator('#forest-experience #board .cell').first().waitFor({state:'visible'});
  if(!await forestPage.locator('#fg-playing').isVisible() ||
     await forestPage.locator('#fg-home').isVisible())
    throw new Error('Forest home did not switch to its own playable scene');
  await forestPage.locator('#forest-experience #board').focus();
  await forestPage.keyboard.press('ArrowRight');
  await forestPage.keyboard.press('Space');
  await forestPage.click('#fg-theme');
  await forestPage.getByRole('button',{name:'네온 다크 미리보기'}).click();
  await forestPage.locator('#nono-theme-use').click();
  if(await forestPage.locator('#forest-experience').isVisible() ||
     !await forestPage.locator('body>.shell #game').count())
    throw new Error('Switching out of forest did not restore the original game DOM');
  await forestPage.click('#nono-theme-open');
  await forestPage.getByRole('button',{name:'정령의 숲 미리보기'}).click();
  await forestPage.locator('#nono-theme-use').click();
  await forestPage.setViewportSize({width:390,height:740});
  await forestPage.locator('#forest-experience #board .cell').first().waitFor({state:'visible'});
  const mobileOk=await forestPage.evaluate(()=>{
    const header=document.querySelector('.fg-header').getBoundingClientRect();
    const board=document.querySelector('#forest-experience #board').getBoundingClientRect();
    return header.width>330 && board.width>0;
  });
  if(!mobileOk)throw new Error('Forest mobile layout failed');
  if(forestErrors.length)throw new Error('Forest JS errors: '+forestErrors.join(' | '));
  await forestPage.close();

  // Terminal is a *separate* functional windowed website, not a recolor of the default UI.
  const terminalPage=await browser.newPage({viewport:{width:1440,height:900}});
  const terminalErrors=[];
  terminalPage.on('pageerror',error=>terminalErrors.push(error.message));
  await terminalPage.route('**/firebase-config.js',route=>route.fulfill({body:'window.NONO_FIREBASE_CONFIG={};',contentType:'text/javascript'}));
  await terminalPage.goto(pathToFileURL(path.resolve(__dirname,'..','index.html')).href);
  await terminalPage.click('#nono-theme-open');
  await terminalPage.getByRole('button',{name:'던전 터미널 미리보기'}).click();
  await terminalPage.locator('#nono-theme-use').click();
  await terminalPage.locator('#terminal-experience').waitFor({state:'visible'});
  const windows=await terminalPage.evaluate(()=>{
    const root=document.getElementById('terminal-experience');
    return {
      originalHidden:getComputedStyle(document.querySelector('body>.shell')).display==='none',
      desktopColumns:getComputedStyle(root.querySelector('.term-workspace')).gridTemplateColumns.split(' ').length,
      windows:root.querySelectorAll('.term-window').length,
      setupMoved:!!root.querySelector('#term-setup-mount #setup'),
      gameMoved:!!root.querySelector('#term-game-mount #game'),
      art:getComputedStyle(root).backgroundImage,
      allModes:root.querySelectorAll('[data-term-mode]').length
    };
  });
  if(!windows.originalHidden || windows.desktopColumns!==3 || windows.windows!==6 ||
    !windows.setupMoved || !windows.gameMoved || windows.allModes!==4 ||
    !windows.art.includes('terminal-wallpaper.svg'))
    throw new Error('New CRT desktop is not independent or functional: '+JSON.stringify(windows));
  await terminalPage.locator('[data-term-mode="race"]').click();
  if(!await terminalPage.locator('.mode-card[data-mode="race"]').evaluate(el=>el.classList.contains('selected')))
    throw new Error('CRT window mode failed to switch the real game');
  await terminalPage.locator('[data-term-mode="practice"]').click();
  await terminalPage.selectOption('#puzzle','heart5');
  await terminalPage.click('#play-alone');
  await terminalPage.locator('#terminal-experience #board .cell').first().waitFor({state:'visible'});
  if(!await terminalPage.locator('#term-playing').isVisible() ||
      await terminalPage.locator('#term-home').isVisible())
    throw new Error('CRT game did not switch from Explorer to actual board');
  await terminalPage.locator('#terminal-experience #board').focus();
  await terminalPage.keyboard.press('ArrowRight');
  await terminalPage.keyboard.press('Space');
  await terminalPage.locator('#term-cross').click();
  if(!await terminalPage.locator('#tool-cross').evaluate(el=>el.classList.contains('primary')))
    throw new Error('CRT Tools are not attached to actual puzzle input');
  await terminalPage.locator('#term-menu').click();
  await terminalPage.getByRole('button',{name:'네온 다크 미리보기'}).click();
  await terminalPage.locator('#nono-theme-use').click();
  if(await terminalPage.locator('#terminal-experience').isVisible() ||
    !await terminalPage.locator('body>.shell #game').count())
    throw new Error('CRT environment did not restore original site when exiting');
  await terminalPage.click('#nono-theme-open');
  await terminalPage.getByRole('button',{name:'던전 터미널 미리보기'}).click();
  await terminalPage.locator('#nono-theme-use').click();
  await terminalPage.setViewportSize({width:390,height:740});
  await terminalPage.locator('#terminal-experience #board .cell').first().waitFor({state:'visible'});
  const terminalMobile=await terminalPage.evaluate(()=>{
    const board=document.querySelector('#terminal-experience #board').getBoundingClientRect();
    return board.width>0 && getComputedStyle(document.querySelector('.term-workspace')).display==='flex';
  });
  if(!terminalMobile)throw new Error('CRT mobile board is broken');
  if(terminalErrors.length)throw new Error('CRT JavaScript errors: '+terminalErrors.join(' | '));
  await terminalPage.close();

  if (errors.length) throw new Error('Browser errors: ' + errors.join(' | '));
  console.log('NONO smoke test passed.');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
