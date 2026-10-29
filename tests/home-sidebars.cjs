/* Dashboard and side rails visual contract; run after npm run build. */
const { chromium }=require('playwright');
const fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:900}});
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/firebase-config.js',route=>route.fulfill({body:'window.NONO_FIREBASE_CONFIG={};',contentType:'text/javascript'}));
    const index=path.resolve(__dirname,'..','dist','index.html');
    if(!fs.existsSync(index))throw Error('Run npm run build before test:home');
    await page.goto(pathToFileURL(index).href);
    await page.locator('#nono-completion-list').waitFor();
    await page.locator('#nono-daily-hub').waitFor();
    await page.locator('#nono-resume-view').waitFor();
    const info=await page.evaluate(()=>{
      const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,height:r.height}};
      return {
        clear:rect('#nono-clear-sidebar'),ad:rect('#nono-ad-sidebar'),
        setup:rect('#setup'),resume:rect('#nono-resume-view'),rewards:rect('#nono-daily-hub'),
        header:rect('.topbar'),
        fakeItems:document.querySelectorAll('#nono-completion-list .nono-completion-item').length,
        overflowX:document.documentElement.scrollWidth>innerWidth+2,
        overflowY:document.documentElement.scrollHeight>innerHeight+3
      };
    });
    if(info.overflowX||info.clear.right>=info.setup.left||info.ad.left<=info.resume.right||
       Math.abs(info.setup.top-info.resume.top)>3||info.rewards.top<info.setup.bottom-3||
       info.fakeItems!==0||info.overflowY)
      throw Error('1440×900 home layout regression: '+JSON.stringify(info));
    await page.setViewportSize({width:390,height:844});
    const mobile=await page.evaluate(()=>{
      const top=s=>document.querySelector(s).getBoundingClientRect().top;
      return {
        setup:top('#setup'),clear:top('#nono-clear-sidebar'),
        ad:top('#nono-ad-sidebar'),width:document.documentElement.scrollWidth,
        viewport:innerWidth
      };
    });
    if(mobile.setup>=mobile.clear||mobile.clear>=mobile.ad||mobile.width>mobile.viewport+2)
      throw Error('Mobile side rail order/overflow regression: '+JSON.stringify(mobile));
    if(errors.length)throw Error('Page errors: '+errors.join('; '));
    console.log('PASS home dashboard rails, empty feed, responsive placement');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
