/* Large and giant random nonograms, accepting ONLY CaDiCaL SAT-certified UNIQUE solutions.
 * Individual cells independently sampled from fixed-seed Bernoulli distributions.
 * Three large sizes (50/75/100), five top-performing modes, five repeats each.
 * No shape templates, no success-based puzzle selection, no unconcluded uniqueness accepted.
 */
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const adaptive=require('../adaptive-nonogram-solver.js');
const sat=require('../sat-nonogram-solver.js');
const SIZES=[50,75,100];
const MODES=['adaptivefull_cadical','adaptive','adaptive90_cadical','adaptive75_cadical','adaptive50_cadical'];
const DENSITIES=[0.96,0.98,0.94,0.99,0.90,0.97];
const REPEATS=5,MAX_ATTEMPTS=18;
function clue(bits){const a=[];let k=0;for(const x of bits){if(x)k++;else if(k){a.push(k);k=0;}}if(k)a.push(k);return a.length?a:[0];}
function make(n,attempt){
  const density=DENSITIES[attempt%DENSITIES.length];
  const seed=(0x4e4f4e4f ^ Math.imul(n,0x9e3779b9) ^ Math.imul(attempt+1,0x85ebca6b))>>>0;
  let x=seed;
  const bits=Array.from({length:n*n},()=>{
    x^=x<<13;x^=x>>>17;x^=x<<5;
    return (x>>>0)/4294967296<density?1:0;
  });
  const puzzle={size:n,rows:Array.from({length:n},(_,y)=>clue(bits.slice(y*n,(y+1)*n))),
    cols:Array.from({length:n},(_,k)=>clue(Array.from({length:n},(_,y)=>bits[y*n+k])))};
  let hash=2166136261>>>0;
  for(const b of bits){hash^=b;hash=Math.imul(hash,16777619)>>>0;}
  return {size:n,attempt,seed,density,actualDensity:bits.reduce((a,b)=>a+b,0)/(n*n),
    hash:hash.toString(16).padStart(8,'0'),puzzle,reference:bits.join('')};
}
function lineRuns(bits){return clue(bits);}
function sameClue(x,y){return JSON.stringify(x)===JSON.stringify(y);}
function validComplete(c,p){
  const n=p.size;
  if(!Array.isArray(c)||c.length!==n*n||c.some(x=>x!==0&&x!==1))return false;
  for(let y=0;y<n;y++)if(!sameClue(lineRuns(c.slice(y*n,(y+1)*n)),p.rows[y]))return false;
  for(let x=0;x<n;x++)if(!sameClue(lineRuns(Array.from({length:n},(_,y)=>c[y*n+x])),p.cols[x]))return false;
  return true;
}
function partialSafe(c,ref){
  assert.equal(c.length,ref.length);
  for(let i=0;i<c.length;i++)if(c[i]!==-1)assert.equal(c[i],Number(ref[i]),'unsound deduction');
}
async function proveUnique(n,attempt){
  const f=make(n,attempt),deadline=Date.now()+7600,start=performance.now();
  const enc=sat.encode(f.puzzle,f.reference,{maxMs:Math.max(0,deadline-Date.now()),
    maxVariables:700000,maxClauses:1600000});
  let solver;
  if(enc.status!=='encoded')return {phase:'proof',size:n,attempt,status:'unknown',
    reason:enc.reason||enc.status,elapsedMs:+(performance.now()-start).toFixed(2)};
  try{
    solver=await (await import('cadical-wasm')).Cadical.create({quiet:true});
    solver.setTerminate(()=>Date.now()>=deadline);
    solver.addClauses(enc.clauses); // Reference BLOCKING CLAUSE included.
    const ans=Date.now()<deadline?solver.solve():'unknown';
    const status=ans==='unsatisfiable'?'unique':ans==='satisfiable'?'multiple':'unknown';
    return {phase:'proof',size:n,attempt,seed:f.seed,density:f.density,
      actualDensity:f.actualDensity,hash:f.hash,status,
      elapsedMs:+(performance.now()-start).toFixed(2)};
  }finally{solver?.dispose();}
}
async function solveSAT(f,known,deadline){
  const enc=sat.encode(f.puzzle,f.reference,{maxMs:Math.max(0,deadline-Date.now()),
    maxVariables:700000,maxClauses:1600000});
  if(enc.status!=='encoded')return {status:'timeout',reason:enc.reason||enc.status};
  const blocking=Array.from({length:f.reference.length},(_,i)=>f.reference[i]==='1'?-(i+1):i+1);
  assert.deepEqual(enc.clauses.at(-1),blocking);
  const clauses=enc.clauses.slice(0,-1);
  for(let i=0;i<known.length;i++)if(known[i]!==-1)clauses.push([known[i]===1?i+1:-(i+1)]);
  let solver;
  try{
    if(Date.now()>=deadline)return {status:'timeout',reason:'budget'};
    solver=await (await import('cadical-wasm')).Cadical.create({quiet:true});
    solver.setTerminate(()=>Date.now()>=deadline);
    solver.addClauses(clauses);
    const ans=Date.now()<deadline?solver.solve():'unknown';
    if(ans!=='satisfiable'||Date.now()>=deadline)return {status:ans==='unsatisfiable'?'error':'timeout',reason:ans};
    const cells=Array.from({length:f.reference.length},(_,i)=>solver.value(i+1)?1:0);
    if(!validComplete(cells,f.puzzle))throw Error('SAT full answer invalid');
    return {status:'solved',cells};
  }finally{solver?.dispose();}
}
async function run(n,attempt,mode,rep){
  const f=make(n,attempt),start=performance.now(),deadline=Date.now()+9700;
  const r=adaptive.solve(f.puzzle,{maxMs:Math.max(0,deadline-Date.now()),captureTrace:false,
    ...(mode==='adaptive90_cadical'?{stopAtFraction:0.9}:mode==='adaptive75_cadical'?{stopAtFraction:0.75}:mode==='adaptive50_cadical'?{stopAtFraction:0.5}:{})});
  if(r.status==='invalid')throw Error('adaptive invalid: '+r.reason);
  let cells=r.cells,firstStatus=r.status,satCalled=false,satOutcome=null,handPct=r.solved/(n*n)*100;
  partialSafe(cells,f.reference);
  if(mode!=='adaptive'&&cells.some(x=>x===-1)&&Date.now()<deadline){
    satCalled=true;
    const a=await solveSAT(f,cells,deadline);
    if(a.cells)cells=a.cells;
    else satOutcome=a.status;
  }
  const fullySolved=validComplete(cells,f.puzzle);
  return {phase:'solver',size:n,attempt,seed:f.seed,density:f.density,hash:f.hash,
    mode,rep,status:fullySolved?'solved':Date.now()>=deadline?'timeout':'partial',
    elapsedMs:+(performance.now()-start).toFixed(2),knownCells:cells.filter(x=>x!==-1).length,
    satCalled,satOutcome,phase1Pct:+handPct.toFixed(2),phase1Status:firstStatus,
    targetReached:mode==='adaptive90_cadical'?handPct>=90:mode==='adaptive75_cadical'?handPct>=75:mode==='adaptive50_cadical'?handPct>=50:null};
}
function child(args,timeout){
  const t=performance.now();
  const c=spawnSync(process.execPath,[new URL(import.meta.url).pathname,...args],
    {encoding:'utf8',timeout,maxBuffer:1024*1024});
  let obj;
  if(c.error?.code==='ETIMEDOUT')obj={phase:args[0]==='--proof'?'proof':'solver',
    status:args[0]==='--proof'?'unknown':'timeout',reason:'hard_limit'};
  else try{obj=JSON.parse((c.stdout||'').trim().split('\n').at(-1));}
  catch{obj={phase:args[0]==='--proof'?'proof':'solver',status:'error',
    reason:(c.stderr||c.error?.message||c.stdout||'invalid_output').slice(0,500)};}
  obj.wallMs=+(performance.now()-t).toFixed(2);
  return obj;
}
const [cmd,nArg,attemptArg,modeArg,repArg]=process.argv.slice(2);
if(cmd==='--proof'){
  const n=Number(nArg),attempt=Number(attemptArg);
  assert(SIZES.includes(n)&&Number.isInteger(attempt));
  try{console.log(JSON.stringify(await proveUnique(n,attempt)));}
  catch(e){console.log(JSON.stringify({phase:'proof',size:n,attempt,status:'unknown',reason:String(e)}));}
}else if(cmd==='--solve'){
  const n=Number(nArg),attempt=Number(attemptArg),mode=modeArg,rep=Number(repArg);
  assert(SIZES.includes(n)&&MODES.includes(mode)&&Number.isInteger(rep));
  try{console.log(JSON.stringify(await run(n,attempt,mode,rep)));}
  catch(e){console.log(JSON.stringify({phase:'solver',size:n,attempt,mode,rep,status:'error',reason:String(e)}));}
}else{
  const selected=nArg?Number(nArg):null;
  const sizes=selected?[selected]:SIZES;
  for(const n of sizes){
    let chosen=null,counts={unique:0,multiple:0,unknown:0,error:0};
    for(let attempt=0;attempt<MAX_ATTEMPTS;attempt++){
      const r=child(['--proof',String(n),String(attempt)],8000);
      r.size=n;r.attempt=attempt;
      counts[r.status]=(counts[r.status]||0)+1;
      console.log(JSON.stringify(r));
      if(r.status==='unique'){chosen=attempt;break;}
    }
    if(chosen===null){
      console.log(JSON.stringify({phase:'summary',size:n,status:'no_certified_unique',
        attempts:MAX_ATTEMPTS,counts}));
      process.exitCode=2;
      continue;
    }
    console.log(JSON.stringify({phase:'selection',size:n,attempt:chosen,hash:make(n,chosen).hash,
      density:make(n,chosen).density,status:'certified_unique',attemptCounts:counts}));
    for(const mode of MODES)for(let rep=0;rep<REPEATS;rep++){
      const r=child(['--solve',String(n),String(chosen),mode,String(rep)],10000);
      r.size=n;r.attempt=chosen;r.mode=mode;r.rep=rep;
      console.log(JSON.stringify(r));
    }
  }
}
