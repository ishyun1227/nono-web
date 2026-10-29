/* Reuse original rabbit/samurai packed source art without ever copying a
 * solution to public puzzle catalogs. Their standalone trial pages keep their
 * existing local-only record policy; seeding prepares future server support.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const bits=require('../answer-bitpack.js');
function curatedPlaytestAnswers(){
 const source=fs.readFileSync(path.join(__dirname,'../playtest-rabbit-samurai.html'),'utf8');
 const section=source.match(/const DATA=\{([\s\S]*?)\n\};/);
 if(!section)throw Error('Rabbit/samurai exact puzzle data missing');
 const entries=[...section[1].matchAll(/\b(rabbit|samurai):\{name:'[^']+',w:(\d+),h:(\d+),total:(\d+),b64:'([A-Za-z0-9+/=]+)'/g)];
 if(entries.length!==2||new Set(entries.map(m=>m[1])).size!==2)
   throw Error('Expected exactly two separate playtest source images');
 const expected={rabbit:[53,73,1069],samurai:[72,72,2136]};
 return entries.map(([,label,wText,hText,totalText,packed])=>{
  const width=Number(wText),height=Number(hText),total=Number(totalText);
  if([width,height,total].join(',')!==expected[label].join(','))throw Error('Source dimensions changed: '+label);
  const mask=bits.unpack(packed,width,height);
  if(mask.split('1').length-1!==total)throw Error('Black pixel count mismatch: '+label);
  const {rows,cols}=bits.hints(mask,width,height);
  if(bits.validateAnswer(mask,width,height,rows,cols)!==packed)throw Error('Unstable source bits: '+label);
  return {id:'trial_'+label+'_'+width+'x'+height,width,height,mask,rows,cols};
 });
}
module.exports={curatedPlaytestAnswers};
