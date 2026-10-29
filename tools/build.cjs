const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),output=path.join(root,'dist');
fs.mkdirSync(output,{recursive:true});
for(const name of ['index.html','locale.js','locale-packs.js','locale-en-extra.js','locale-settings-packs.js','locale-descriptions-packs.js','locale-core-packs.js','locale-controls-packs.js','locale-options-packs.js','locale-navigation-packs.js','locale-world-packs.js','locale-dynamics.js','locale-runtime-messages.js','locale-firebase-messages.js','locale-controller-messages.js','puzzles-brainrot.js','voxel-test-preview.js','settings.js','firebase-config.js','themes.css','themes.js','premium-themes.css','theme-extras.css','library-precision.css','theme-world-ui.js','library-ui.js','forest-world.css','forest-world.js','assets/forest-world.svg','terminal-world.css','terminal-world.js','assets/terminal-wallpaper.svg','default-home.css','default-home.js','apple-home.css','apple-home.js','home-sidebars.css','home-sidebars.js','reward-policy.css','reward-policy.js','community.css','community.js','controller-input.css','controller-input.js','controller-customization.css','controller-customization.js','daily-rewards.js','daily-rewards.css','shop.js','shop.css','public-lobby.css','pixel-friends.css','assets/friends-parade.svg','assets/library-scene.svg','assets/library-world.svg','assets/library-mode-practice.svg','assets/library-mode-race.svg','assets/library-mode-coop.svg','assets/library-mode-record.svg','assets/arcade-scene.svg','assets/enchanted-scene.svg','assets/cosmos-scene.svg','assets/setting-guides/row-highlight.svg','assets/setting-guides/pointer-follow.svg','assets/setting-guides/hint-hud.svg','assets/setting-guides/filled-run.svg','assets/setting-guides/drag-hud.svg']){
  const target=path.join(output,name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,name),target);
}

// The live Worker serves only ./dist, not the repository root.
// Every approved settings picture must be copied into dist.
for(const name of ['row-highlight','pointer-follow','hint-hud','filled-run','drag-hud']){
  const file=path.join(output,'assets/setting-guides',name+'.svg');
  if(!fs.existsSync(file)||fs.statSync(file).size<100)
    throw Error('Settings guide missing from deploy output: '+name);
}
// Fingerprint settings.js on every build to prevent the browser from
// retaining the old generated fallback diagrams after a successful deploy.
const crypto=require('node:crypto');
const settingsHash=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'settings.js'))).digest('hex').slice(0,12);
const builtIndex=path.join(output,'index.html');
const builtHtml=fs.readFileSync(builtIndex,'utf8');
if(!/\.\/settings\.js\?v=[^"' ]+/.test(builtHtml))throw Error('Settings script reference missing');
fs.writeFileSync(builtIndex,builtHtml.replace(/\.\/settings\.js\?v=[^"' ]+/g,'./settings.js?v='+settingsHash));
// Fingerprint the dashboard stylesheet too: a fixed ?v=1 would let browsers
// reuse an outdated layout after the Worker has deployed a new CSS file.
const appleHomeHash=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'apple-home.css'))).digest('hex').slice(0,12);
const currentIndex=fs.readFileSync(builtIndex,'utf8');
if(!/\.\/apple-home\.css\?v=[^"' ]+/.test(currentIndex))throw Error('Apple home stylesheet reference missing');
fs.writeFileSync(builtIndex,currentIndex.replace(/\.\/apple-home\.css\?v=[^"' ]+/g,'./apple-home.css?v='+appleHomeHash));

// New side rails must be cached by file content, not the legacy fixed ?v=1.
for(const asset of ['home-sidebars.css','home-sidebars.js','apple-home.js','daily-rewards.js','reward-policy.css','reward-policy.js','community.css','community.js']){
  const hash=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,asset))).digest('hex').slice(0,12);
  const html=fs.readFileSync(builtIndex,'utf8');
  const current='./'+asset+'?v=1';
  if(!html.includes(current))throw Error('Home rail asset reference missing: '+asset);
  fs.writeFileSync(builtIndex,html.replace(current,'./'+asset+'?v='+hash));
}

// Generate polished non-clickable decorations from the reference character strip.
// The old heavily thresholded SVG removed dark eye outlines and damaged the faces.
const zlib=require('node:zlib');
const paletteSource=fs.readFileSync(path.join(root,'assets/friends-pixels-v3.txt'),'utf8').trim();
const sprites=JSON.parse(zlib.inflateSync(Buffer.from(paletteSource,'base64')).toString('utf8'));
const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const escapeXml=(s)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
if(sprites.length!==6)throw Error('Expected six mascot sprites');
const parts=['<svg xmlns="http://www.w3.org/2000/svg" width="762" height="135" viewBox="0 0 762 135" aria-hidden="true">'];
sprites.forEach(([colors, pixels],spriteIndex)=>{
  const cellCount=40,px=118/cellCount;
  if(pixels.length!==cellCount*cellCount||colors.length>64)throw Error('Invalid mascot data');
  parts.push('<g transform="translate('+(8+spriteIndex*127)+',8) scale('+px+')" shape-rendering="crispEdges">');
  for(let y=0;y<cellCount;y++){
    for(let x=0;x<cellCount;){
      const char=pixels[y*cellCount+x];
      let end=x+1;
      while(end<cellCount&&pixels[y*cellCount+end]===char)end++;
      if(char!=='.'){
        const idx=chars.indexOf(char),color=colors[idx];
        if(idx<0||!color||!/^[a-f0-9]{6}$/.test(color))throw Error('Invalid mascot pixel');
        parts.push('<rect x="'+x+'" y="'+y+'" width="'+(end-x)+'" height="1" fill="#'+escapeXml(color)+'"/>');
      }
      x=end;
    }
  }
  parts.push('</g>');
  const ringColors=['#a393ed','#f569a7','#ffd16a','#b1a3ec','#f36fbd','#77cbef'];
  parts.push('<circle cx="'+(8+spriteIndex*127+59)+'" cy="67" r="57.5" fill="none" stroke="'+ringColors[spriteIndex]+'" stroke-opacity=".75" stroke-width="1.2"/>');
});
parts.push('</svg>');
fs.writeFileSync(path.join(output,'assets/friends-parade.svg'),parts.join(''));
console.log('Built NONO static assets and restored six original grid characters');
