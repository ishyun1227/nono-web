/* Per-player completion index: completion only, cross-mode dedupe, guest
 * migration, account isolation, reload and legacy import. Browser integration.
 */
'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage();
    await page.route('**/firebase-config.js',route=>route.fulfill({
      body:'window.NONO_FIREBASE_CONFIG={};',contentType:'text/javascript'
    }));
    await page.goto(pathToFileURL(path.resolve(__dirname,'../dist/index.html')).href);
    await page.waitForFunction(()=>!!window.NONO_COMPLETED_PUZZLES);
    const initial=await page.evaluate(()=>{
      const api=window.NONO_COMPLETED_PUZZLES,now=Date.now();
      const complete=(mode,id,code='')=>window.dispatchEvent(new CustomEvent('nono:completion-confirmed',{
        detail:{mode,puzzleId:id,size:10,roomCode:code,finishedAt:now}}));
      complete('solo','random-one');complete('race','random-one','ABC234');
      complete('coop','random-two','ABC235');
      window.dispatchEvent(new CustomEvent('nono:private-puzzle-completed',{
        detail:{mode:'solo',puzzleId:'random-trial',size:10,finishedAt:now}}));
      window.dispatchEvent(new CustomEvent('nono:puzzle-started',{
        detail:{mode:'solo',puzzleId:'random-unfinished',size:10,finishedAt:now}}));
      return {count:api.completedCount(),one:api.has('random-one'),trial:api.has('random-trial'),
        unfinished:api.has('random-unfinished'),unseen:api.unseen(['random-one','random-new'])};
    });
    assert.equal(initial.count,3);
    assert(initial.one&&initial.trial);
    assert.equal(initial.unfinished,false);
    assert.deepEqual(initial.unseen,['random-new']);
    await page.reload();
    await page.waitForFunction(()=>!!window.NONO_COMPLETED_PUZZLES);
    assert.equal(await page.evaluate(()=>window.NONO_COMPLETED_PUZZLES.completedCount()),3,'Reload preserves IDs');
    const scopes=await page.evaluate(()=>{
      const api=window.NONO_COMPLETED_PUZZLES;
      localStorage.setItem('nono-account-scope-v1','alice');
      window.dispatchEvent(new CustomEvent('nono:account-changed',{detail:{previous:'guest',target:'alice'}}));
      const a=api.completedCount();
      // account.js clears/restores scoped history on a real account switch.
      localStorage.removeItem('nono-completion-history-v1');
      localStorage.setItem('nono-account-scope-v1','bob');
      window.dispatchEvent(new CustomEvent('nono:account-changed',{detail:{previous:'alice',target:'bob'}}));
      const b=api.completedCount();
      window.dispatchEvent(new CustomEvent('nono:private-puzzle-completed',{
        detail:{mode:'solo',puzzleId:'bob-only',size:10,finishedAt:Date.now()}}));
      localStorage.setItem('nono-account-scope-v1','alice');
      window.dispatchEvent(new CustomEvent('nono:account-changed',{detail:{previous:'bob',target:'alice'}}));
      const alice={count:api.completedCount(),bob:api.has('bob-only')};
      localStorage.setItem('nono-account-scope-v1','bob');
      window.dispatchEvent(new CustomEvent('nono:account-changed',{detail:{previous:'alice',target:'bob'}}));
      const bob={count:api.completedCount(),own:api.has('bob-only'),guest:api.has('random-one')};
      return {a,b,alice,bob};
    });
    assert.equal(scopes.a,3,'Guest completed IDs migrate to first login');
    assert.equal(scopes.b,0,'Different account is isolated');
    assert.deepEqual(scopes.alice,{count:3,bob:false},'Account A cannot see B');
    assert.deepEqual(scopes.bob,{count:1,own:true,guest:false},'Account B sees only itself');
    console.log('PASS personal completion IDs: solo/race/coop, trial, reload, guest merge, no started records, account isolation');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
