/* Verify every registered Korean UI message has a native translation in all 11 target locales.
 * English fallback is deliberately NOT counted as coverage.
 */
const {chromium}=require('playwright');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  const page=await browser.newPage({locale:'ko-KR'});
  await page.route('**/firebase-config.js',r=>r.fulfill({contentType:'text/javascript',body:'window.NONO_FIREBASE_CONFIG={};'}));
  await page.goto(pathToFileURL(path.resolve(__dirname,'../dist/index.html')).href);
  await page.waitForFunction(()=>Boolean(window.NONO_I18N?.nativeCoverage));
  const report=await page.evaluate(()=>window.NONO_I18N.nativeCoverage());
  const ids=['en','ja','zh-CN','zh-TW','es','pt-BR','fr','de','id','vi','th'];
  if(JSON.stringify(Object.keys(report))!==JSON.stringify(ids))throw Error('Expected eleven translated locales');
  for(const id of ids){
   const {total,missing}=report[id];
   console.log('NATIVE_TRANSLATIONS '+id+': '+(total-missing.length)+'/'+total+' explicitly translated');
   if(total<500||missing.length)throw Error('Native translation gap '+id+': '+JSON.stringify(missing.slice(0,35)));
  }
  // Changing locale must not change selected game mode or puzzle storage.
  const settings=await page.evaluate(()=>localStorage.getItem('nono-web-preferences-v1'));
  for(const id of ids)await page.evaluate(id=>window.NONO_I18N.setLanguage(id),id);
  if(await page.evaluate(()=>localStorage.getItem('nono-web-preferences-v1'))!==settings)
    throw Error('Changing languages mutated saved game settings');
  console.log('All registered UI keys have native translations in all twelve languages, Korean original included.');
 } finally {await browser.close();}
})().catch(err=>{console.error(err);process.exit(1)});
