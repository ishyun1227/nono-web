/* Real UI: pressing random must first select a locally SAT-certified
 * unfinished puzzle and must NOT generate another. No completion on start.
 */
'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:850}});
    page.on('pageerror',error=>console.error('Page error:',error.message));
    await page.route('**/firebase-config.js',route=>route.fulfill({
      body:'window.NONO_FIREBASE_CONFIG={};',contentType:'text/javascript'
    }));
    const uri=pathToFileURL(path.resolve(__dirname,'../dist/index.html')).href;
    await page.goto(uri);
    await page.waitForFunction(()=>!!window.NONO_RANDOM_PUZZLES&&!!window.NONO_COMPLETED_PUZZLES);
    await page.evaluate(()=>{
      const api=window.NONO_RANDOM_PUZZLES;
      for(const [id,seed] of [['random-local-a',100],['random-local-b',101]]){
        const puzzle=api.fromSpec({size:10,difficulty:'보통',seed,version:6,id});
        api.register({...puzzle,verified:true});
      }
      window.dispatchEvent(new CustomEvent('nono:private-puzzle-completed',{
        detail:{mode:'solo',puzzleId:'random-local-a',size:10,finishedAt:Date.now()}
      }));
    });
    await page.reload();
    await page.waitForFunction(()=>!!window.NONO_RANDOM_ALLOCATION);
    await page.evaluate(()=>{
      document.body.dataset.nonoTheme='neon';
      // If a completed local item is assigned instead of the other one,
      // or the selector generates on every click, fail immediately.
      window.NONO_RANDOM_PUZZLES.generateAsync=async()=>{throw Error('unexpected instant generation');};
    });
    await page.locator('.nono-apple-difficulty-choices button').filter({hasText:'보통'}).click();
    const button=page.locator('.nono-apple-random-generate');
    await button.waitFor({state:'visible'});
    await button.click();
    await page.waitForFunction(()=>document.getElementById('puzzle')?.value==='random-local-b',
      null,{timeout:10000});
    const values=await page.evaluate(()=>({
      id:document.getElementById('puzzle').value,
      a:window.NONO_COMPLETED_PUZZLES.has('random-local-a'),
      b:window.NONO_COMPLETED_PUZZLES.has('random-local-b'),
      saved:window.NONO_RANDOM_PUZZLES.restore().some(p=>p.id==='random-local-b')
    }));
    assert.equal(values.id,'random-local-b');
    assert.equal(values.a,true);
    assert.equal(values.b,false,'Starting must not record completion');
    assert.equal(values.saved,true);
    console.log('PASS actual random button gives an uncompleted, saved verified puzzle; no per-click generation or start-as-finish');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
