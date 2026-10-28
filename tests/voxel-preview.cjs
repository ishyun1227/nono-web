/* Local browser verification for the developer-only completed VOX preview. */
const {chromium} = require('playwright');
const path = require('node:path');
const {pathToFileURL} = require('node:url');

(async () => {
  const browser = await chromium.launch({headless:true});
  const page = await browser.newPage({viewport:{width:1240,height:880}});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/firebase-config.js', route => route.fulfill({
    body:'window.NONO_FIREBASE_CONFIG={};',contentType:'text/javascript'
  }));
  const source = pathToFileURL(path.resolve(__dirname,'../index.html')).href;
  await page.goto(source);
  if (await page.locator('#nono-vox-test-button').count()) throw Error('Preview must be absent for normal players');
  await page.goto(source + '?test=1');
  // The launcher now uses native size selection. Open a fresh game per viewpoint.
  const samples = [
    ['vox_crabino_front',315],
    ['vox_crabino_side',210],
    ['vox_crabino_top',287]
  ];
  for (let variant = 0; variant < samples.length; variant++) {
    await page.goto(source + '?test=1');
    const [id,expected] = samples[variant];
    // The approved neon UI uses visible size/difficulty buttons, not the old hidden native selector.
    // Choose the exact puzzle through the native engine's supported change event;
    // apple-home.js will synchronize its visible controls from that selection.
    await page.evaluate(puzzleId=>{
      const picker=document.getElementById('puzzle');
      if(![...picker.options].some(option=>option.value===puzzleId))
        throw Error('Missing VOX puzzle '+puzzleId);
      picker.value=puzzleId;
      picker.dispatchEvent(new Event('change',{bubbles:true}));
    },id);
    if (await page.locator('#puzzle').inputValue() !== id) throw Error('Incorrect preview puzzle: ' + id);
    await page.locator('#play-alone').click();
    await page.locator('#nono-vox-test-button').waitFor({state:'visible'});
    const before = await page.evaluate(() => ({board:board.join(''),changes,finished,startedAt}));
    await page.locator('#nono-vox-test-button').click();
    const dialog = page.locator('#nono-vox-test-dialog');
    await dialog.waitFor({state:'visible'});
    const pixels = await page.evaluate(() => {
      const canvas = document.querySelector('#nono-vox-test-canvas');
      const data = canvas.getContext('2d').getImageData(0,0,30,30).data;
      let dark = 0;
      for(let i=0;i<data.length;i+=4) if(data[i]<100) dark++;
      return dark;
    });
    if(pixels!==expected) throw Error('Incorrect voxel preview bitmap for ' + id + ': ' + pixels);
    await page.locator('#nono-vox-test-close').click();
    if(await dialog.isVisible()) throw Error('Preview did not close');
    const after = await page.evaluate(() => ({board:board.join(''),changes,finished,startedAt}));
    if(JSON.stringify(before)!==JSON.stringify(after)) throw Error('Preview mutated game state for '+id);
    page.once('dialog',dialog=>dialog.accept());
    await page.locator('#leave-game').click();
  }
  if(errors.length) throw Error('Preview JavaScript errors: '+errors.join(' | '));
  console.log('VOX preview tests passed for all three original 30x30 silhouettes.');
  await browser.close();
})().catch(e => {console.error(e);process.exit(1)});
