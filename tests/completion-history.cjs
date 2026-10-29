/* Completion history regression: all modes, reload, duplicate protection, offline feed. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:900}});
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/firebase-config.js',route=>route.fulfill({
      body:'window.NONO_FIREBASE_CONFIG={};',contentType:'text/javascript'
    }));
    const file=path.resolve(__dirname,'..','dist','index.html');
    if(!fs.existsSync(file))throw Error('Run npm run build first');
    await page.goto(pathToFileURL(file).href);
    await page.locator('#nono-completion-list').waitFor();
    const detail={
      mode:'solo',puzzleId:'heart5',size:5,name:'테스트',
      roomCode:'',finishedAt:Date.now()
    };
    await page.evaluate(value=>{
      window.dispatchEvent(new CustomEvent('nono:completion-confirmed',{detail:value}));
      window.dispatchEvent(new CustomEvent('nono:completion-confirmed',{detail:value}));
    },detail);
    assert.equal(await page.locator('#nono-completion-list .nono-completion-item').count(),1);
    assert.match(await page.locator('#nono-completion-list').innerText(),/내 완료/);
    await page.locator('#nono-community-tab').click();
    assert.match(await page.locator('.nono-community-card').first().innerText(),/혼자.*5×5/);
    await page.reload();
    await page.locator('#nono-completion-list').waitFor();
    assert.equal(await page.locator('#nono-completion-list .nono-completion-item').count(),1,
      'completion must survive a reload');
    await page.evaluate(()=>{
      const now=Date.now();
      for(const mode of ['race','coop'])window.dispatchEvent(new CustomEvent('nono:completion-confirmed',{
        detail:{mode,puzzleId:'cat10',size:10,name:'테스트',roomCode:'ABC234',finishedAt:now}
      }));
    });
    assert.equal(await page.locator('#nono-completion-list .nono-completion-item').count(),3);
    await page.locator('#nono-community-tab').click();
    const own=await page.locator('.nono-community-card').first().innerText();
    assert.match(own,/혼자/);
    assert.match(own,/대결/);
    assert.match(own,/협동/);
    const history=await page.evaluate(()=>window.NONO_COMPLETION_HISTORY.all());
    assert.equal(history.length,3,'duplicate completion must not be stored twice');
    if(errors.length)throw Error('Page errors: '+errors.join('; '));
    console.log('PASS completion history for solo, race, coop, reload and duplicates');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
