/* Canonical trial smoke: snowman shares the production board and settings.
 * The deleted simplified player is never generated or linked.
 */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {pathToFileURL}=require('node:url'),{chromium}=require('playwright');
(async()=>{
 const built=path.resolve(__dirname,'..','dist');
 assert(!fs.existsSync(path.join(built,'trials')),'Deleted trial player was rebuilt');
 assert(!fs.existsSync(path.join(built,'winter-snowman-test.html')));
 const script=fs.readFileSync(path.join(built,'puzzles-public-catalog.js'),'utf8');
 const ctx={window:{}};vm.runInNewContext(script,ctx);
 const snow=ctx.window.NONO_PUBLIC_PUZZLES.find(p=>p.id==='winter-snowman-trial-v1');
 assert(snow&&snow.trialOnly&&snow.width===59&&snow.height===63);
 assert.equal(snow.rows.length,63);assert.equal(snow.cols.length,59);
 const sum=lines=>lines.flat().reduce((a,b)=>a+b,0);
 assert.equal(sum(snow.rows),1140);assert.equal(sum(snow.cols),1140);
 assert(!('mask' in snow)&&!('packed' in snow)&&!('answer' in snow));
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1200,height:850}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/firebase-config.js',route=>route.fulfill({body:'window.NONO_FIREBASE_CONFIG={};',contentType:'text/javascript'}));
  await page.goto(pathToFileURL(path.join(built,'index.html')).href);
  await page.locator('#nono-open-settings').waitFor();
  // A legacy standalone save is converted into the existing main save key.
  const oldAction=Buffer.from([0,0,1]).toString('base64');
  await page.evaluate(oldAction=>{
    localStorage.setItem('nono-winter-snowman-trial-v1',JSON.stringify({
      version:1,undo:oldAction,redo:'',selected:0,startedAt:1000,finishedAt:0
    }));
  },oldAction);
  await page.evaluate(async()=>{
    setMode('practice');
    const picker=document.getElementById('puzzle');
    picker.value='winter-snowman-trial-v1';picker.dispatchEvent(new Event('change',{bubbles:true}));
    await startAlone();
  });
  assert.equal(await page.locator('#board .cells .cell').count(),59*63);
  assert.equal(await page.locator('#board > .row-clues .row-clue').count(),63);
  assert.equal(await page.locator('#board > .col-clues .col-clue').count(),59);
  assert(await page.locator('#board .cells .cell').first().evaluate(e=>e.classList.contains('filled')),
    'Old snowman progress was not migrated');
  assert(await page.evaluate(()=>Boolean(localStorage.getItem('nono-web-puzzle-v1:winter-snowman-trial-v1'))));
  assert(await page.evaluate(()=>Boolean(localStorage.getItem('nono-winter-snowman-trial-v1'))),
    'Old save must remain untouched');
  await page.evaluate(()=>restoreHistory(undoStack,redoStack));
  assert(!await page.locator('#board .cells .cell').first().evaluate(e=>e.classList.contains('filled')));
  await page.evaluate(()=>restoreHistory(redoStack,undoStack));
  assert(await page.locator('#board .cells .cell').first().evaluate(e=>e.classList.contains('filled')));
  assert.deepEqual(errors,[]);
  console.log('PASS snowman uses canonical board, existing settings and migrated legacy action log');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
