/* Smoke test for optional account UI without a connected Firebase project. */
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
(async()=>{
 const built=path.resolve(__dirname,'..','dist');
 if(!fs.existsSync(path.join(built,'account.js')))throw Error('Account controller is absent from Worker bundle');
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/firebase-config.js',route=>route.fulfill({body:'window.NONO_FIREBASE_CONFIG={};',contentType:'text/javascript'}));
  await page.goto(pathToFileURL(path.join(built,'index.html')).href);
  await page.locator('#profile-button').waitFor();
  if(!await page.locator('#profile-button').isVisible())throw Error('Profile missing in desktop header');
  if(await page.locator('#nickname').getAttribute('type')!=='hidden')throw Error('Nickname is still editable');
  await page.locator('#profile-button').click();
  if(!await page.locator('.nono-account-panel').isVisible())throw Error('Private profile not displayed');
  if(!await page.locator('.nono-account-panel').getByText('Google로 계속하기').count())throw Error('Google login missing');
  if(!await page.locator('.nono-account-panel').getByText('Apple로 계속하기').count())throw Error('Apple login missing');
  await page.locator('.nono-account-close').click();
  await page.locator('#nono-community-tab').click();
  if(await page.locator('#nono-community-title').count()!==1)throw Error('Community failed to open');
  if(await page.locator('.nono-community-section-title').filter({hasText:'내 기록'}).count())throw Error('Private records remain in community');
  await page.locator('.nono-community-header button').click();
  await page.setViewportSize({width:390,height:844});
  if(!await page.locator('#profile-button').isVisible())throw Error('Profile missing on mobile');
  await page.locator('.mode-card[data-mode="practice"]').click();
  if(!await page.locator('#play-alone').isVisible())throw Error('Guest cannot start solo mode');
  if(errors.length)throw Error(errors.join(' | '));
  console.log('PASS optional account UI, guest solo, no editable nickname, private profile');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
