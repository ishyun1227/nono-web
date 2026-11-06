/* Exact cell-count handoff benchmark, 2026-11-06.
 * Nine previously SAT-certified UNIQUE independent-random nonograms (5..100).
 * Each cell commitment is cut at ceil(area * 25/50/75/90 percent):
 * no finishing a whole logical line before SAT. If logical propagation stalls
 * before a target, DO NOT label the resulting SAT run a target handoff.
 * All 9 fixtures are re-certified independently with reference-blocking SAT.
 * Seven modes, five independent repetitions, ten-second hard timeout each.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const adaptive=require('../adaptive-nonogram-solver.js');
const sat=require('../sat-nonogram-solver.js');
const SIZES=[5,10,15,20,25,30,50,75,100];
const MODES=['adaptive','adaptivefull_cadical','cadical','adaptive25_cadical',
  'adaptive50_cadical','adaptive75_cadical','adaptive90_cadical'];
const REPEATS=5,INTERNAL_LIMIT_MS=9700,HARD_LIMIT_MS=10000;
const savedSmall=JSON.parse(fs.readFileSync(new URL('./fixtures/five-unique-random-20261106.json',import.meta.url),'utf8')).puzzles;
const savedLarge=JSON.parse(fs.readFileSync(new URL('./fixtures/large-giant-unique-p80-20261106.json',import.meta.url),'utf8')).fixtures;
function clue(bits){
  const result=[];let length=0;
  for(const bit of bits){if(bit)length++;else if(length){result.push(length);length=0;}}
  if(length)result.push(length);
  return result.length?result:[0];
}
function hashMask(bits){
  let h=2166136261>>>0;
  for(const bit of bits){h^=bit;h=Math.imul(h,16777619)>>>0;}
  return h.toString(16).padStart(8,'0');
}
function tiny(){
  const n=5,seed=1366787604,density=0.5;
  let state=seed;
  const bits=Array.from({length:n*n},()=>{
    state^=state<<13;state^=state>>>17;state^=state<<5;
    return (state>>>0)/4294967296<density?1:0;
  });
  return {size:n,seed,density,maskHash:'3faab37d',
    rows:Array.from({length:n},(_,y)=>clue(bits.slice(y*n,(y+1)*n))),
    cols:Array.from({length:n},(_,x)=>clue(Array.from({length:n},(_,y)=>bits[y*n+x]))),
    answerRows:Array.from({length:n},(_,y)=>bits.slice(y*n,(y+1)*n).join(''))};
}
const FIXTURES=[tiny(),...savedSmall,...savedLarge];
assert.deepEqual(FIXTURES.map(p=>p.size),SIZES);
function fixture(n){
  const p=FIXTURES.find(v=>v.size===n);
  assert(p,'Missing fixture '+n);
  const reference=p.answerRows.join(''),bits=reference.split('').map(Number);
  assert.equal(bits.length,n*n);
  assert(/^[01]+$/.test(reference));
  assert.equal(hashMask(bits),p.maskHash,'Corrupted reference mask '+n);
  for(let i=0;i<n;i++){
    assert.deepEqual(clue(bits.slice(i*n,(i+1)*n)),p.rows[i],'Row clue mismatch');
    assert.deepEqual(clue(Array.from({length:n},(_,y)=>bits[y*n+i])),p.cols[i],'Column clue mismatch');
  }
  return {size:n,puzzle:{size:n,rows:p.rows,cols:p.cols},reference,
    maskHash:p.maskHash,seed:p.seed,source:'stored_fixture'};
}
function validComplete(c,p){
  const n=p.size;
  if(!Array.isArray(c)||c.length!==n*n||c.some(v=>v!==0&&v!==1))return false;
  for(let i=0;i<n;i++){
    if(JSON.stringify(clue(c.slice(i*n,(i+1)*n)))!==JSON.stringify(p.rows[i]))return false;
    if(JSON.stringify(clue(Array.from({length:n},(_,y)=>c[y*n+i])))!==JSON.stringify(p.cols[i]))return false;
  }
  return true;
}
async function proveUnique(f){
  const t=performance.now(),deadline=Date.now()+INTERNAL_LIMIT_MS;
  const e=sat.encode(f.puzzle,f.reference,{maxMs:Math.max(0,deadline-Date.now()),
    maxVariables:700000,maxClauses:1600000});
  if(e.status!=='encoded')return {status:'unknown',reason:e.reason||e.status};
  let solver;
  try{
    solver=await (await import('cadical-wasm')).Cadical.create({quiet:true});
    solver.setTerminate(()=>Date.now()>=deadline);
    solver.addClauses(e.clauses); // Includes the reference blocking clause.
    const result=Date.now()<deadline?solver.solve():'unknown';
    return {status:result==='unsatisfiable'?'unique':
      result==='satisfiable'?'multiple':'unknown',elapsedMs:+(performance.now()-t).toFixed(2)};
  }finally{solver?.dispose();}
}
async function solveSAT(f,seed,deadline){
  const e=sat.encode(f.puzzle,f.reference,{maxMs:Math.max(0,deadline-Date.now()),
    maxVariables:700000,maxClauses:1600000});
  if(e.status!=='encoded')return {status:'timeout',reason:e.reason||e.status};
  const expected=Array.from({length:f.reference.length},(_,i)=>
    f.reference[i]==='1'?-(i+1):i+1);
  assert.deepEqual(e.clauses.at(-1),expected,'Unexpected SAT reference blocker');
  const clauses=e.clauses.slice(0,-1);
  for(let i=0;i<seed.length;i++)if(seed[i]!==-1)clauses.push([seed[i]===1?i+1:-(i+1)]);
  let solver;
  try{
    if(Date.now()>=deadline)return {status:'timeout',reason:'deadline_before_sat'};
    solver=await (await import('cadical-wasm')).Cadical.create({quiet:true});
    solver.setTerminate(()=>Date.now()>=deadline);
    solver.addClauses(clauses);
    const outcome=Date.now()<deadline?solver.solve():'unknown';
    if(outcome!=='satisfiable'||Date.now()>=deadline)
      return {status:outcome==='unsatisfiable'?'error':'timeout',reason:outcome};
    const cells=Array.from({length:f.reference.length},(_,i)=>solver.value(i+1)?1:0);
    assert(validComplete(cells,f.puzzle),'SAT solution contradicts clues');
    assert.equal(cells.join(''),f.reference,'SAT result not equal to unique reference');
    return {status:'solved',cells};
  }finally{solver?.dispose();}
}
async function runCase(n,mode,rep){
  const f=fixture(n),start=performance.now(),deadline=Date.now()+INTERNAL_LIMIT_MS;
  const ratio={adaptive25_cadical:0.25,adaptive50_cadical:0.5,
    adaptive75_cadical:0.75,adaptive90_cadical:0.9}[mode];
  const targetCount=ratio?Math.ceil(n*n*ratio):null;
  let cells=Array(n*n).fill(-1),phase1Status='skipped',phase1Ms=0,satCalled=false,satMs=0;
  let transferCount=0,targetReached=null,satOutcome=null;
  if(mode!=='cadical'){
    const t=performance.now();
    const r=adaptive.solve(f.puzzle,{maxMs:Math.max(0,deadline-Date.now()),
      captureTrace:false,...(ratio?{stopAtFraction:ratio,exactStopAtFraction:true}:{})});
    phase1Ms=+(performance.now()-t).toFixed(2);
    if(r.status==='invalid')throw Error('Adaptive contradictory: '+r.reason);
    cells=r.cells;phase1Status=r.status;
    assert.equal(cells.length,n*n);
    for(let i=0;i<cells.length;i++)if(cells[i]!==-1)
      assert.equal(cells[i],Number(f.reference[i]),'Unsound partial logical deduction');
    transferCount=cells.filter(v=>v!==-1).length;
    if(ratio){
      targetReached=transferCount===targetCount;
      if(transferCount>targetCount)throw Error('Exact handoff overshot target');
      if(!targetReached)return {size:n,mode,rep,status:'target_not_reached',
        phase1Status,phase1Ms,transferCount,targetCount,satCalled:false,
        maskHash:f.maskHash,elapsedMs:+(performance.now()-start).toFixed(2)};
    }
  }
  if(mode!=='adaptive'&&cells.includes(-1)){
    satCalled=true;
    const t=performance.now();
    const r=await solveSAT(f,cells,deadline);
    satMs=+(performance.now()-t).toFixed(2);
    satOutcome=r.status;
    if(r.cells)cells=r.cells;
  }
  const status=validComplete(cells,f.puzzle)?'solved':
    Date.now()>=deadline?'timeout':satOutcome||'partial';
  if(status==='solved')assert.equal(cells.join(''),f.reference,'Completed solution mismatch');
  return {size:n,mode,rep,maskHash:f.maskHash,status,
    elapsedMs:+(performance.now()-start).toFixed(2),phase1Ms,satMs,
    phase1Status,satCalled,satOutcome,targetCount,transferCount,targetReached};
}
function child(args){
  const t=performance.now(),isProof=args[0]==='--proof';
  const c=spawnSync(process.execPath,[new URL(import.meta.url).pathname,...args],
    {encoding:'utf8',timeout:HARD_LIMIT_MS,maxBuffer:1024*1024});
  let row;
  if(c.error?.code==='ETIMEDOUT')
    row={status:isProof?'unknown':'timeout',reason:'hard_10s_limit'};
  else try{row=JSON.parse((c.stdout||'').trim().split('\n').at(-1));}
  catch{row={status:'error',
    reason:(c.stderr||c.error?.message||c.stdout||'invalid_child_output').slice(0,400)};}
  row.wallMs=+(performance.now()-t).toFixed(1);
  return row;
}
const [cmd,nS,mode,repS]=process.argv.slice(2);
if(cmd==='--proof'){
  const n=Number(nS);assert(SIZES.includes(n));
  try{console.log(JSON.stringify({size:n,phase:'proof',maskHash:fixture(n).maskHash,
    ...(await proveUnique(fixture(n)))}));}
  catch(e){console.log(JSON.stringify({size:n,phase:'proof',status:'error',reason:String(e?.stack||e).slice(0,700)}));}
}else if(cmd==='--case'){
  const n=Number(nS),rep=Number(repS);assert(SIZES.includes(n)&&MODES.includes(mode)&&Number.isInteger(rep));
  try{console.log(JSON.stringify({phase:'solver',...(await runCase(n,mode,rep))}));}
  catch(e){console.log(JSON.stringify({phase:'solver',size:n,mode,rep,status:'error',
    reason:String(e?.stack||e).slice(0,700)}));}
}else{
  const selector=process.argv.indexOf('--size');
  const selected=selector<0?SIZES:[Number(process.argv[selector+1])];
  for(const n of selected){
    assert(SIZES.includes(n));
    const proof=child(['--proof',String(n)]);
    console.log(JSON.stringify({size:n,phase:'proof',...proof}));
    if(proof.status!=='unique'){
      console.log(JSON.stringify({size:n,phase:'summary',status:'unproven_skip'}));
      process.exitCode=2;continue;
    }
    for(const m of MODES)for(let rep=0;rep<REPEATS;rep++){
      const out=child(['--case',String(n),m,String(rep)]);
      console.log(JSON.stringify({size:n,phase:'solver',mode:m,rep,...out}));
    }
  }
}
