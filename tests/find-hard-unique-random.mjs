/* Find SAT-verified unique random-derived puzzles that Adaptive cannot finish.
 * Never accept unproven SAT timeouts, and keep exact seeds and answer masks.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const adaptive=require('../adaptive-nonogram-solver.js'),sat=require('../sat-nonogram-solver.js');
const {Cadical}=await import('cadical-wasm');
const SIZES=[5,10,15,20,25,30,50,75,100];
const SMALL=JSON.parse(fs.readFileSync(new URL('./fixtures/five-unique-random-20261106.json',import.meta.url))).puzzles;
const LARGE=JSON.parse(fs.readFileSync(new URL('./fixtures/large-giant-unique-p80-20261106.json',import.meta.url))).fixtures;
const bases=[...SMALL,...LARGE];
function rng(seed){let x=seed>>>0;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};}
function hash(a){let h=2166136261>>>0;for(const b of a){h^=b;h=Math.imul(h,16777619)>>>0;}return h.toString(16).padStart(8,'0');}
function clue(a){const out=[];let s=0;for(const x of a){if(x)s++;else if(s){out.push(s);s=0;}}if(s)out.push(s);return out.length?out:[0];}
function make(n,a){return {size:n,
 rows:Array.from({length:n},(_,y)=>clue(a.slice(n*y,n*(y+1)))),
 cols:Array.from({length:n},(_,x)=>clue(Array.from({length:n},(_,y)=>a[y*n+x])))};
}
function shuffle(r,n){const a=Array.from({length:n},(_,i)=>i);
 for(let i=n-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function generate(n,i){
 const seed=(0x688f1cb4 ^ Math.imul(n,0x9e3779b9) ^ Math.imul(i+1,0x85ebca6b))>>>0;
 const r=rng(seed),base=bases.find(f=>f.size===n),mode=i%7;
 let cells;
 if(!base||mode<3){
   const density=[0.35,0.5,0.65,0.75,0.8,0.9,0.2,0.58,0.7][Math.floor(i/7)%9];
   cells=Array.from({length:n*n},()=>r()<density?1:0);
   return {cells,puzzle:make(n,cells),seed,kind:'independent',density};
 }
 const original=base.answerRows.join('').split('').map(Number);
 if(mode===3||mode===4){
   cells=original.slice();
   const count=Math.max(1,Math.round(n*n*([0.003,0.008,0.02,0.05][Math.floor(i/7)%4])));
   for(let k=0;k<count;k++){const j=Math.floor(r()*cells.length);cells[j]^=1;}
   return {cells,puzzle:make(n,cells),seed,kind:'flipped_'+count,density:null};
 }
 const oldRows=mode===5?shuffle(r,n):Array.from({length:n},(_,k)=>k);
 const oldCols=mode===6?shuffle(r,n):Array.from({length:n},(_,k)=>k);
 cells=Array.from({length:n*n},(_,id)=>original[oldRows[Math.floor(id/n)]*n+oldCols[id%n]]);
 return {cells,puzzle:make(n,cells),seed,kind:mode===5?'shuffled_rows':'shuffled_cols',density:null};
}
function localSwapMultiple(n,c,p){
 for(let y=0;y<n-1;y++)for(let x=0;x<n-1;x++){
   const a=y*n+x,b=a+1,d=a+n,e=d+1;
   if(c[a]===c[e]&&c[b]===c[d]&&c[a]!==c[b]){
     const alt=c.slice();alt[a]^=1;alt[b]^=1;alt[d]^=1;alt[e]^=1;
     if(JSON.stringify(clue(alt.slice(y*n,(y+1)*n)))===JSON.stringify(p.rows[y])&&
        JSON.stringify(clue(alt.slice((y+1)*n,(y+2)*n)))===JSON.stringify(p.rows[y+1])&&
        JSON.stringify(clue(Array.from({length:n},(_,k)=>alt[k*n+x])))===JSON.stringify(p.cols[x])&&
        JSON.stringify(clue(Array.from({length:n},(_,k)=>alt[k*n+x+1])))===JSON.stringify(p.cols[x+1]))return true;
   }
 }
 return false;
}
async function proof(p,c,deadline){
 const enc=sat.encode(p,c.join(''),{maxMs:Math.min(3700,Math.max(0,deadline-Date.now())),
   maxVariables:700000,maxClauses:1600000});
 if(enc.status!=='encoded')return {status:'unknown',reason:enc.reason||enc.status};
 let solver;
 try{
   solver=await Cadical.create({quiet:true});
   solver.setTerminate(()=>Date.now()>=deadline);
   solver.addClauses(enc.clauses);
   const ans=Date.now()<deadline?solver.solve():'unknown';
   return {status:ans==='unsatisfiable'?'unique':ans==='satisfiable'?'multiple':'unknown'};
 }finally{solver?.dispose();}
}
const n=Number(process.argv[2]||0);
assert(SIZES.includes(n),'size 5/10/15/20/25/30/50/75/100');
const maxAttempts=Number(process.env.MAX_ATTEMPTS||([5,10,15,20].includes(n)?2500:450));
const maxWallMs=Number(process.env.MAX_WALL_MS||240000),maxFound=Number(process.env.MAX_FOUND||2);
const start=performance.now(),initial=Date.now();
const counters={total:0,adaptiveSolved:0,adaptiveStalled:0,localMultiple:0,satMultiple:0,satUnknown:0,satUnique:0,adaptiveTimeout:0};
const found=[];
for(let i=0;i<maxAttempts&&Date.now()-initial<maxWallMs&&found.length<maxFound;i++){
  const {cells,puzzle,seed,kind,density}=generate(n,i);counters.total++;
  const a=adaptive.solve(puzzle,{maxMs:Math.min(800,Math.max(0,maxWallMs-(Date.now()-initial))),captureTrace:false});
  if(a.status==='solved'){counters.adaptiveSolved++;continue;}
  if(a.status==='invalid'){console.log(JSON.stringify({phase:'error',size:n,attempt:i,reason:a.reason}));continue;}
  if(a.status==='unknown'&&a.reason==='time_budget'){counters.adaptiveTimeout++;continue;}
  counters.adaptiveStalled++;
  if(localSwapMultiple(n,cells,puzzle)){counters.localMultiple++;continue;}
  const result=await proof(puzzle,cells,Date.now()+3800);
  if(result.status==='unique'){
    counters.satUnique++;
    const maskHash=hash(cells);
    const f={id:'hard-random-'+n+'-'+i,size:n,seed,kind,density,attempt:i,maskHash,
      logicKnown:a.solved,logicFraction:+(a.solved/(n*n)).toFixed(6),
      logicStatus:a.status,answerRows:Array.from({length:n},(_,y)=>cells.slice(y*n,(y+1)*n).join('')),
      rows:puzzle.rows,cols:puzzle.cols,satProof:'CaDiCaL blocked-reference UNSAT'};
    found.push(f);
    console.log(JSON.stringify({phase:'found',size:n,id:f.id,seed,kind,attempt:i,density,maskHash,
      known:a.solved,percent:+(a.solved/(n*n)*100).toFixed(2),proof:'unique',
      elapsedMs:+(performance.now()-start).toFixed(1)}));
  }else if(result.status==='multiple')counters.satMultiple++;
  else counters.satUnknown++;
  if(i%40===0)console.log(JSON.stringify({phase:'progress',size:n,attempt:i,counters}));
}
const artifactPath='results/hard-unique-'+n+'.json';
fs.mkdirSync('results',{recursive:true});
fs.writeFileSync(artifactPath,JSON.stringify({size:n,found,counters,wallMs:+(performance.now()-start).toFixed(1)},null,2)+'\n');
console.log(JSON.stringify({phase:'summary',size:n,counters,found:found.map(({id,logicKnown,logicFraction,maskHash,kind})=>
  ({id,logicKnown,logicFraction,maskHash,kind})),artifactPath,wallMs:+(performance.now()-start).toFixed(1)}));
if(!found.length)process.exitCode=2;
