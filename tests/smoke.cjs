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
  await page.goto(pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href);
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
      controls:document.querySelectorAll('#nono-quick-sizes button').length,
      difficulties:document.querySelectorAll('#nono-quick-difficulties button').length,
      pageBackground:getComputedStyle(document.body).backgroundColor,
      shellHeight:document.querySelector('.shell').getBoundingClientRect().height,
      figureArt:getComputedStyle(document.querySelector('#home-view'),'::after').backgroundImage,
      artVisibility:getComputedStyle(document.querySelector('#home-view'),'::after').display,
      pageTheme:document.body.dataset.nonoTheme,
      titleColor:getComputedStyle(document.querySelector('.brand')).color,
      selectedTabBackground:getComputedStyle(document.querySelector('.mode-card.selected')).backgroundImage,
      choiceSizeRow:document.querySelector('#nono-quick-sizes').getBoundingClientRect().top,
      difficultyRow:document.querySelector('#nono-quick-difficulties').getBoundingClientRect().top
    };
  });
  if(!base.heroHidden || !base.nativePickerHidden || base.controls!==6 || base.difficulties!==3 ||
    Math.abs(base.header.x-base.tabs.x)>1 ||
    Math.abs(base.tabs.x-base.panel.x)>1 ||
    Math.abs(base.header.right-base.tabs.right)>1 ||
    Math.abs(base.tabs.right-base.panel.right)>1 ||
    base.panel.y<base.tabs.bottom || base.panel.width>575 ||
    base.shellHeight<800 || base.pageTheme!=='neon' ||
    !base.figureArt.includes('nono-default-atmosphere.svg') ||
    base.artVisibility==='none' || base.selectedTabBackground==='none' ||
    Math.abs(base.choiceSizeRow-base.difficultyRow)>2)
    throw new Error('Default launcher side edges / compact spacing broken: '+JSON.stringify(base));
  await page.locator('.mode-card[data-mode="race"]').click();
  if(!await page.locator('#nono-quick-room-options').isVisible() ||
    await page.locator('#nono-quick-options').isVisible())
    throw new Error('Race should start with create/join choices only');
  await page.click('#nono-quick-create');
  if(!await page.locator('#nono-quick-options').isVisible() ||
    !await page.locator('#nono-quick-create-actions').isVisible())
    throw new Error('Race room creation choices not displayed in place');
  await page.locator('.mode-card[data-mode="practice"]').click();
  if(await page.locator('#nono-quick-room-options').isVisible() ||
    !await page.locator('#nono-quick-options').isVisible())
    throw new Error('Solo needs only size and difficulty');
  if(!await page.locator('#nono-quick-sizes button').nth(2).isDisabled())
    throw new Error('Unavailable 15x15 puzzles must not pretend to work');
  await page.locator('#nono-quick-sizes button').first().click();
  if(await page.locator('#puzzle').inputValue()!=='heart5')throw new Error('5x5 does not select real puzzle');
  await page.locator('#nono-quick-sizes button').nth(1).click();
  await page.locator('#nono-quick-difficulties button').nth(2).click();
  if(await page.locator('#puzzle').inputValue()!=='rocket10')throw new Error('Difficulty does not select actual puzzle');

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
