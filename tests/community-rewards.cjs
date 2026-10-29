/* Default theme community and browser-only game reward policy smoke checks. */
const {chromium}=require('playwright');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/firebase-config.js',route=>route.fulfill({body:'window.NONO_FIREBASE_CONFIG={};',contentType:'text/javascript'}));
  await page.goto(pathToFileURL(path.resolve(__dirname,'..','dist','index.html')).href);
  await page.locator('#nono-community-tab').waitFor();
  const visible=await page.locator('.topbar .mode-select>button:visible').count();
  if(visible!==5)throw Error('Expected exactly five visible top tabs, got '+visible);
  if(await page.locator('#nono-theme-open').isVisible())throw Error('Shop duplicated in top-right');
  if(!await page.locator('#nono-open-settings').isVisible())throw Error('Settings not in header');
  await page.locator('#nono-community-tab').click();
  if(!await page.locator('#nono-community-title').isVisible())throw Error('Community not opened');
  const fake=await page.locator('.nono-community-line').count();
  if(fake!==0)throw Error('Community fabricated a score without records');
  await page.locator('.nono-community-start').click();
  const record=await page.locator('.mode-card[data-mode="record"]').evaluate(el=>el.classList.contains('selected'));
  if(!record)throw Error('Record competition not accessible from community');
  await page.locator('.mode-card[data-mode="practice"]').click();
  await page.locator('.nono-reward-hint').click();
  if(!await page.locator('#nono-reward-title').isVisible())throw Error('Reward table not shown');
  if(await page.locator('.nono-reward-table tr').count()!==5)throw Error('Missing four reward size groups');
  await page.locator('.nono-reward-head button').click();
  const reward=await page.evaluate(()=>{
   const policy=window.NONO_REWARD_POLICY;
   const wallet=window.NONO_DAILY_REWARDS;
   const solo=wallet.creditGameCompletion({mode:'solo',puzzleId:'cat10',size:10,difficulty:'보통'});
   const duplicate=wallet.creditGameCompletion({mode:'solo',puzzleId:'cat10',size:10,difficulty:'보통'});
   const race1=wallet.creditGameCompletion({mode:'race',puzzleId:'cat10',size:10,difficulty:'보통',uid:'test-user',roomCode:'ABCDEF',won:true});
   const race2=wallet.creditGameCompletion({mode:'race',puzzleId:'cat10',size:10,difficulty:'보통',uid:'test-user',roomCode:'GHJKLN',won:true});
   const race3=wallet.creditGameCompletion({mode:'race',puzzleId:'cat10',size:10,difficulty:'보통',uid:'test-user',roomCode:'MNPRST',won:false});
   const coop=wallet.creditGameCompletion({mode:'coop',puzzleId:'cat10',size:10,difficulty:'보통',uid:'test-user',roomCode:'UVWX23',won:false});
   const state=wallet.getSnapshot();
   return {table:policy.GROUPS.map(g=>g.values),solo,duplicate,race1,race2,race3,coop,streak:state.gameRewards.winStreak,balance:state.points};
  });
  if(reward.solo.amount!==30||reward.duplicate.ok||reward.race1.amount!==45||
     reward.race2.amount!==65||reward.race3.amount!==30||reward.coop.amount!==25||
     reward.streak!==0||reward.balance!==195)
   throw Error('Payout/dedupe/streak regression: '+JSON.stringify(reward));
  await page.locator('#nono-shop-tab-top').click();
  if(!await page.locator('#nono-shop-balance').isVisible())throw Error('Shop not accessible from header');
  if(!((await page.locator('#nono-shop-balance').textContent())||'').includes('195'))throw Error('Game points missing from shop wallet');
  await page.locator('#nono-theme-close').click();
  if(errors.length)throw Error('Browser errors: '+errors.join(' | '));
  console.log('PASS community navigation, reward table, gameplay preview wallet and store');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
