/* Real browser smoke checks for NONO's browser-local rewards preview. */
const {chromium}=require('playwright');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/firebase-config.js',route=>route.fulfill({body:'window.NONO_FIREBASE_CONFIG={};',contentType:'text/javascript'}));
 await page.goto(pathToFileURL(path.resolve(__dirname,'../dist/index.html')).href);
 await page.locator('#nono-attendance-claim').waitFor();
 let result=await page.evaluate(()=>{
  const api=window.NONO_DAILY_REWARDS;
  return {ready:!!api,points:api?.getSnapshot().points||0,disabled:document.querySelector('#nono-attendance-claim').disabled,
   missionCount:document.querySelectorAll('#nono-mission-list .nono-mission-row').length};
 });
 if(!result.ready||result.points!==0||result.disabled||result.missionCount!==3)throw Error('Initial rewards lobby state is incorrect: '+JSON.stringify(result));
 await page.locator('#nono-attendance-claim').click();
 result=await page.evaluate(()=>{
  const api=window.NONO_DAILY_REWARDS;
  return {first:api.getSnapshot().points,duplicate:api.claimAttendance(),second:api.getSnapshot().points,
    checked:document.querySelector('#nono-attendance-claim').disabled};
 });
 if(result.first!==20||result.duplicate!==false||result.second!==20||!result.checked)
  throw Error('Daily check-in duplicate grant or button state broken: '+JSON.stringify(result));
 // Complete a native 5x5 puzzle through the real paint() action, not by simulating a reward event.
 await page.evaluate(()=>{
  const picker=document.querySelector('#puzzle');picker.value='heart5';
  picker.dispatchEvent(new Event('change',{bubbles:true}));
 });
 await page.locator('#play-alone').click();
 await page.locator('#board .cell').first().waitFor();
 const win=await page.evaluate(()=>{
  const mask=['01010','11111','11111','01110','00100'].join('');
  for(let i=0;i<mask.length;i++)if(mask[i]==='1')paint(i,'1',true);
  return {finished,done:window.NONO_DAILY_REWARDS.getSnapshot().days[window.NONO_DAILY_REWARDS.getSnapshot().day]?.missions?.puzzle?.done,
   rewardEnabled:!document.querySelector('button[data-mission="puzzle"]').disabled};
 });
 if(!win.finished||!win.done||!win.rewardEnabled)throw Error('Native verified puzzle completion did not unlock mission: '+JSON.stringify(win));
 page.once('dialog',dialog=>dialog.accept());
 await page.locator('#leave-game').click();
 await page.locator('#nono-daily-hub').waitFor({state:'visible'});
 await page.locator('button[data-mission="puzzle"]').click();
 const verify=await page.evaluate(()=>{
  const api=window.NONO_DAILY_REWARDS;
  const again=api.claimMission('puzzle');
  window.dispatchEvent(new CustomEvent('nono:activity',{detail:{kind:'unknown'}}));
  const s=api.getSnapshot();
  const gameplayReward=window.NONO_REWARD_POLICY.reward('solo',5,'쉬움').total;
  return {points:s.points,expected:20+50+gameplayReward,again,puzzle:s.days[s.day].missions.puzzle,race:s.days[s.day].missions.race};
 });
 if(verify.points!==verify.expected||verify.again!==false||!verify.puzzle.claimed||verify.race?.done)
  throw Error('Mission claim or unknown-event handling incorrect: '+JSON.stringify(verify));
 await page.reload();
 await page.locator('#nono-attendance-claim').waitFor();
 result=await page.evaluate(()=>{
  const api=window.NONO_DAILY_REWARDS,s=api.getSnapshot();
  return {points:s.points,attendance:s.days[s.day]?.attendance,claimed:s.days[s.day]?.missions?.puzzle?.claimed,
    count:document.querySelectorAll('.nono-attendance-day').length,
    overflow:document.documentElement.scrollWidth>innerWidth+2};
 });
 if(result.points!==verify.expected||!result.attendance||!result.claimed||result.count!==7||result.overflow)
  throw Error('Browser persistence / mobile layout failed: '+JSON.stringify(result));
 if(errors.length)throw Error('Browser JavaScript errors: '+errors.join(' | '));
 console.log('Daily missions / check-in / persistence / mobile layout verified.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});