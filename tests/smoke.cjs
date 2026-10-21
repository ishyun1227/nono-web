const { chromium } = require('playwright');
const path = require('node:path');
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
  await page.click('#nono-theme-open');
  if (await page.locator('.nono-theme-card').count() !== 9) throw new Error('Nine tiered theme cards not found');
  if(await page.locator('.nono-theme-section').count()!==2)throw new Error('Color/world theme categories missing');
  if(await page.locator('.nono-theme-card[data-tier="color"]').count()!==5)throw new Error('Incorrect color theme count');
  if(await page.locator('.nono-theme-card[data-tier="world"]').count()!==4)throw new Error('Incorrect world theme count');
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
    if(world.theme!==id || !world.sceneImage.includes('scene.svg') || world.sceneDisplay==='none' || world.catDisplay!=='none' || world.homeGalleryDisplay==='none' || world.homeGalleryItems<3 || world.heroAction==='none')
      throw new Error('Premium world scene did not replace mascot artwork: '+JSON.stringify(world));
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
      galleryText:getComputedStyle(gallery).color,
      headerHeight:topbar.getBoundingClientRect().height};
  });
  if(libraryUI.nav==='none' || !libraryUI.heroImage.includes('library-scene.svg') ||
    libraryUI.heroHeight<390 || libraryUI.cardHeight<240)
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
  if (errors.length) throw new Error('Browser errors: ' + errors.join(' | '));
  console.log('NONO smoke test passed.');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
