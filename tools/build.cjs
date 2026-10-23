const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),output=path.join(root,'dist');
fs.mkdirSync(output,{recursive:true});
for(const name of ['index.html','settings.js','firebase-config.js','themes.css','themes.js','premium-themes.css','theme-extras.css','library-precision.css','theme-world-ui.js','library-ui.js','forest-world.css','forest-world.js','assets/forest-world.svg','terminal-world.css','terminal-world.js','assets/terminal-wallpaper.svg','default-home.css','default-home.js','assets/nono-default-atmosphere.svg','assets/library-scene.svg','assets/library-world.svg','assets/library-mode-practice.svg','assets/library-mode-race.svg','assets/library-mode-coop.svg','assets/library-mode-record.svg','assets/arcade-scene.svg','assets/enchanted-scene.svg','assets/cosmos-scene.svg']){
  const target=path.join(output,name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,name),target);
}
console.log('Built NONO static assets, including themes.css and themes.js');
