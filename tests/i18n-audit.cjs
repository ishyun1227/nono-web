/* Language coverage audit for visible UI. Captures leftover Korean on non-Korean screens.
 * Does not assert total coverage yet; log is a baseline for the remaining i18n migration.
 */
const {chromium}=require('playwright');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844},locale:'en-US'});
 await page.route('**/firebase-config.js',route=>route.fulfill({body:'window.NONO_FIREBASE_CONFIG={};',contentType:'text/javascript'}));
 await page.goto(pathToFileURL(path.resolve(__dirname,'../dist/index.html')).href);
 await page.locator('#nono-open-settings').waitFor();
 const results=[];
 const audit=async(name)=>{
   await page.waitForTimeout(80);
   const left=await page.evaluate(()=>{
    const missing=new Map(),K=/[가-힣]/,excluded='script,style,pre,code,kbd,#profile-name,#nickname,.player-pill,.nono-theme-pixels';
    const visible=el=>{
      if(!el||el.closest(excluded))return false;
      const rect=el.getBoundingClientRect();
      const s=getComputedStyle(el);
      return rect.width>0&&rect.height>0&&s.visibility!=='hidden'&&s.display!=='none';
    };
    const add=(value)=>{
      const s=String(value||'').trim().replace(/\s+/g,' ');
      if(!K.test(s))return;
      if(!missing.has(s))missing.set(s,0);
      missing.set(s,missing.get(s)+1);
    };
    const walk=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    let node;while((node=walk.nextNode())){
      if(visible(node.parentElement))add(node.textContent);
    }
    for(const el of document.querySelectorAll('[title],[aria-label],[placeholder]')){
      if(!visible(el))continue;
      for(const a of ['title','aria-label','placeholder'])if(el.hasAttribute(a))add(el.getAttribute(a));
    }
    return [...missing.keys()].slice(0,100);
   });
   results.push({name,left});
 };
 for(const lang of ['en','ja','zh-CN','es']){
   await page.evaluate(code=>window.NONO_I18N.setLanguage(code),lang);
   await audit(lang+':home');
   await page.locator('#nono-open-settings').click();
   await audit(lang+':settings');
   const tabs=page.locator('.nono-settings-tabs button');
   const length=await tabs.count();
   for(let i=0;i<length;i++){await tabs.nth(i).click();await audit(lang+':settings-tab-'+i);}
   await page.locator('#nono-settings-close').click();
   await page.locator('#nono-theme-open').click();
   await audit(lang+':shop-theme');
   for(const id of ['points','premium']){
     await page.locator('#nono-shop-tab-'+id).click();await audit(lang+':shop-'+id);
   }
   await page.locator('#nono-theme-close').click();
 }
 for(const item of results)console.log('I18N_AUDIT '+JSON.stringify(item));
 console.log('I18N_AUDIT totals '+results.map(r=>r.name+':'+r.left.length).join(' '));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
