/* Nonogram language preferences: browser test of UI, controls, shop, missions and persistence. */
const {chromium}=require('playwright');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844},locale:'en-US'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/firebase-config.js',route=>route.fulfill({body:'window.NONO_FIREBASE_CONFIG={};',contentType:'text/javascript'}));
 const uri=pathToFileURL(path.resolve(__dirname,'../dist/index.html')).href;
 await page.goto(uri);
 await page.locator('#nono-open-settings').waitFor();
 const initial=await page.evaluate(()=>({
  lang:document.documentElement.lang,
  choice:window.NONO_I18N?.choice,
  mode:document.querySelector('.mode-card[data-mode="practice"] strong')?.textContent,
  shop:document.querySelector('#nono-theme-open')?.textContent
 }));
 if(initial.lang!=='ko'||initial.choice!=='ko'||initial.mode!=='혼자 풀기'||!initial.shop.includes('상점'))
  throw Error('Existing Korean default must remain stable: '+JSON.stringify(initial));
 await page.click('#nono-open-settings');
 const select=page.locator('#nono-language-select');await select.waitFor();
 if(await page.locator('#nono-language-control').count()!==1)throw Error('Language selector is duplicated');
 const values=await select.locator('option').evaluateAll(xs=>xs.map(x=>x.value));
 if(JSON.stringify(values)!==JSON.stringify(['auto','ko','en','ja','zh-CN','zh-TW','es','pt-BR','fr','de','id','vi','th']))throw Error('Language options missing: '+values);
 await select.selectOption('en');
 await page.waitForFunction(()=>document.documentElement.lang==='en'&&document.querySelector('#nono-open-settings')?.textContent.includes('Settings'));
 const english=await page.evaluate(()=>({
  lang:document.documentElement.lang,
  modes:[...document.querySelectorAll('.mode-card[data-mode] strong')].map(n=>n.textContent.trim()),
  title:document.querySelector('.nono-settings-head h2')?.textContent.trim(),
  daily:document.querySelector('#nono-daily-title')?.textContent.trim(),
  attendance:document.querySelector('#nono-attendance-title')?.textContent.trim()
 }));
 if(english.lang!=='en'||english.modes[0]!=='Solo'||!english.title.includes('settings')||english.daily!=='Daily missions'||english.attendance!=='Daily check-in')
  throw Error('English localization incomplete: '+JSON.stringify(english));
 await page.locator('#nono-settings-close').click();
 await page.click('#nono-theme-open');
 await page.waitForFunction(()=>document.querySelector('#nono-shop-tab-points')?.textContent.includes('Top up'));
 if(!(await page.locator('#nono-shop-tab-premium').innerText()).includes('Ad-free'))throw Error('Shop translation missing');
 if(await page.locator('#nono-shop-points button:not([disabled])').count())throw Error('Cash button should remain disabled');
 await page.locator('#nono-theme-close').click();
 await page.reload();
 await page.locator('#nono-open-settings').waitFor();
 if(await page.evaluate(()=>document.documentElement.lang)!=='en')throw Error('Language selection lost on reload');
 await page.click('#nono-open-settings');
 if(await page.locator('#nono-language-select').inputValue()!=='en')throw Error('Language setting not persisted');
 await page.locator('#nono-language-select').selectOption('ja');
 await page.waitForFunction(()=>document.documentElement.lang==='ja'&&document.querySelector('#nono-daily-title')?.textContent==='今日のミッション');
 if(!(await page.locator('.mode-card[data-mode="practice"] strong').innerText()).includes('ひとりで'))throw Error('Japanese main modes not updated');
 await page.locator('#nono-language-select').selectOption('auto');
 await page.waitForFunction(()=>document.documentElement.lang==='en');
 if(await page.evaluate(()=>window.NONO_I18N.choice)!=='auto')throw Error('Auto preference did not persist');
 await page.locator('#nono-language-select').selectOption('zh-CN');
 await page.waitForFunction(()=>document.documentElement.lang==='zh-CN'&&document.querySelector('.mode-card[data-mode="practice"] strong')?.textContent==='单人游戏');
 await page.locator('#nono-language-select').selectOption('zh-TW');
 await page.waitForFunction(()=>document.documentElement.lang==='zh-TW'&&document.querySelector('.mode-card[data-mode="practice"] strong')?.textContent==='單人遊戲');
 await page.locator('#nono-language-select').selectOption('es');
 await page.waitForFunction(()=>document.documentElement.lang==='es'&&document.querySelector('.mode-card[data-mode="practice"] strong')?.textContent==='En solitario');
 await page.locator('#nono-language-select').selectOption('th');
 await page.waitForFunction(()=>document.documentElement.lang==='th'&&document.querySelector('.mode-card[data-mode="practice"] strong')?.textContent==='เล่นคนเดียว');
 await page.locator('#nono-language-select').selectOption('ko');
 await page.waitForFunction(()=>document.documentElement.lang==='ko'&&document.querySelector('.mode-card[data-mode="practice"] strong')?.textContent==='혼자 풀기');
 const before=await page.evaluate(()=>localStorage.getItem('nono-web-preferences-v1'));
 await page.locator('#nono-settings-close').click();
 // A locale switch does not change puzzle engine or reset the preferences.
 await page.evaluate(()=>{
  const picker=document.querySelector('#puzzle');picker.value='heart5';picker.dispatchEvent(new Event('change',{bubbles:true}));
 });
 await page.locator('#play-alone').click();
 await page.locator('#board .cell').first().waitFor();
 const game=await page.evaluate(()=>({
  cells:document.querySelectorAll('#board .cell').length,
  locale:document.documentElement.lang,
  setting:localStorage.getItem('nono-web-preferences-v1')
 }));
 if(game.cells!==25||game.locale!=='ko'||game.setting!==before)throw Error('Puzzle engine or preferences changed after language switch');
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2))throw Error('Language settings overflow mobile viewport');
 if(errors.length)throw Error('Language UI page errors: '+errors.join(' | '));
 console.log('Language selector English/Japanese/Korean/auto, shop, daily missions, persistence and puzzle tested.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});