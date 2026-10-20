const fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8').replace(/\r\n/g,'\n');
const puzzles=vm.runInNewContext(html.match(/const PUZZLES = ([\s\S]*?);\nfunction lineHints/)[1]);
function hints(line){const out=[];let n=0;for(const b of line){if(b==='1')n++;else if(n){out.push(n);n=0;}}if(n)out.push(n);return out.length?out:[0];}
function solve(p){
 const options=p.rows.map(row=>Array.from({length:2**p.size},(_,n)=>n.toString(2).padStart(p.size,'0')).filter(line=>hints(line).join()==row.join()));
 const chosen=[];let result;
 function visit(r){if(r===p.size){if(p.cols.every((cl,c)=>hints(chosen.map(row=>row[c])).join()==cl.join())){result=chosen.join('');return true;}return false;}
  for(const row of options[r]){chosen.push(row);const valid=p.cols.every((cl,c)=>{const prefix=chosen.map(row=>row[c]).join('');return Array.from({length:2**(p.size-r-1)},(_,n)=>prefix+n.toString(2).padStart(p.size-r-1,'0').slice(-(p.size-r-1)||Infinity)).some(line=>hints(line).join()==cl.join());});if(valid&&visit(r+1))return true;chosen.pop();}return false;}
 visit(0);if(!result)throw Error('Unsolvable '+p.id);return result;
}
module.exports={puzzles,answers:Object.fromEntries(puzzles.map(p=>[p.id,solve(p)]))};
