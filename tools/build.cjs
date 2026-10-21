const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),output=path.join(root,'dist');
fs.mkdirSync(output,{recursive:true});
for(const name of ['index.html','settings.js','firebase-config.js','themes.css','themes.js'])fs.copyFileSync(path.join(root,name),path.join(output,name));
console.log('Built NONO static assets, including themes.css and themes.js');
