/* Reproducible pseudorandom nonogram benchmark, with no generated shapes.
 * Every cell is an independent PRNG draw (density 35%, 50%, or 65%).
 * No uniqueness-based selection or puzzle simplification is applied.
 * Three masks per size, nine sizes, 12 modes = 324 timed solver attempts.
 * SAT solution classification is a SEPARATE, time-bounded process:
 * uniqueness=multiple/unique/unknown, never inferred from a single solution.
 * Partial results are not counted as completions. Each solver has a 10s
 * hard process limit; CI also reserves a 9.7s in-process solve deadline.
 * All random seeds, fill densities and complete-mask hashes are recorded.
 */
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const adaptive=require('../adaptive-nonogram-solver.js');
const sat=require('../sat-nonogram-solver.js');
const MODES=['monkey','kniffen','adaptive','combine2','combine3','combine3_logic','cadical','adaptive25_cadical','adaptive50_cadical','adaptive75_cadical','adaptive90_cadical','adaptivefull_cadical'];
const FIXTURES=['p35','p50','p65'], SIZES=[5,10,15,20,25,30,50,75,100];
const SEED_BASE=0x6e6f6e6f;
function clue(bits){const a=[];let k=0;for(const x of bits){if(x)k++;else if(k){a.push(k);k=0;}}if(k)a.push(k);return a.length?a:[0];}
function randomMask(n,kind){
  const density=Number(kind.slice(1))/100;
  const seed=(SEED_BASE ^ Math.imul(n,0x9e3779b9) ^ Math.imul(Math.round(density*100),0x85ebca6b))>>>0;
  let x=seed; const bits=[];
  for(let i=0;i<n*n;i++){
    x^=x<<13; x^=x>>>17; x^=x<<5;
    bits.push((x>>>0)/4294967296<density?1:0);
  }
  return {seed,density,bits};
}
function maskHash(bits){let h=2166136261>>>0;for(const b of bits){h^=b;h=Math.imul(h,16777619)>>>0;}return h.toString(16).padStart(8,'0');}
function fixture(n,kind){
  const {seed,density,bits}=randomMask(n,kind);
  const p={size:n,
    rows:Array.from({length:n},(_,y)=>clue(bits.slice(y*n,(y+1)*n))),
    cols:Array.from({length:n},(_,x)=>clue(Array.from({length:n},(_,y)=>bits[y*n+x])))};
  return {puzzle:p,reference:bits.join(''),seed,density,
    actualDensity:+(bits.reduce((a,b)=>a+b,0)/(n*n)).toFixed(4),maskHash:maskHash(bits)};
}
function exactClues(cells,puzzle){
  const n=puzzle.size;
  for(let y=0;y<n;y++)if(JSON.stringify(clue(cells.slice(y*n,(y+1)*n)))!==JSON.stringify(puzzle.rows[y]))return false;
  for(let x=0;x<n;x++)if(JSON.stringify(clue(Array.from({length:n},(_,y)=>cells[y*n+x])))!==JSON.stringify(puzzle.cols[x]))return false;
  return true;
}
function verify(cells,mask,puzzle){
  assert.equal(cells.length,mask.length);
  // On a multi-solution random puzzle an alternative COMPLETE valid solution
  // need not equal our generating mask. Verify its clues instead.
  if(cells.every(c=>c!==-1)){
    assert(exactClues(cells,puzzle),'full solver output violates clues');
  }else for(let i=0;i<cells.length;i++){
    // Any sound partial deduction must also hold in the generating solution.
    if(cells[i]!==-1)assert.equal(cells[i],Number(mask[i]),'unsound partial deduction at '+i);
  }
}
function known(cells){return cells.reduce((s,x)=>s+(x!==-1),0);}
function blank(n){return Array(n*n).fill(-1);}
async function monkey(puzzle,seed){
  const {Solver}=await import('../sources/monkey/src/solver.js');
  const n=puzzle.size;
  const cells=Array.from({length:n*n},(_,index)=>({
    index,row:Math.floor(index/n),column:index%n,aiSolution:null}));
  const p={width:n,height:n,cells,rowHints:puzzle.rows,columnHints:puzzle.cols,
    getRowCells(i){return this.cells.slice(i*n,(i+1)*n);},
    getColumnCells(i){return Array.from({length:n},(_,y)=>this.cells[y*n+i]);}};
  const solver=new Solver(p);
  for(let i=0;i<cells.length;i++)if(seed[i]!==-1)cells[i].aiSolution=seed[i];
  solver.solve();
  return cells.map(c=>c.aiSolution===null?-1:c.aiSolution);
}
async function kniffen(puzzle,seed,seeded=false){
  const {default:solve}=await import(seeded?'../sources/kniffen/seeded-solver.js':'../sources/kniffen/solver.js');
  const n=puzzle.size,grid=seeded?Array.from({length:n},(_,y)=>
    Array.from({length:n},(_,x)=>seed[y*n+x]===-1?0:seed[y*n+x]===1?1:2)):undefined;
  const result=seeded?solve(n,n,puzzle.rows,puzzle.cols,grid):solve(n,n,puzzle.rows,puzzle.cols);
  return result.flat().map(v=>v===0?-1:v===1?1:0);
}
function logic(puzzle,seed,deadline,stopAtFraction){
  const left=Math.max(0,deadline-Date.now());
  const r=adaptive.solve(puzzle,{maxMs:left,captureTrace:false,
    initialCells:seed,...(stopAtFraction?{stopAtFraction}:{})});
  if(r.status==='invalid')throw Error('Adaptive contradiction: '+r.reason);
  return {cells:r.cells,status:r.status,iterations:r.stats?.iterations??0};
}
async function cadical(puzzle,reference,seed,deadline){
  const {Cadical}=await import('cadical-wasm');
  const encoded=sat.encode(puzzle,reference,{maxMs:Math.max(0,deadline-Date.now()),
    maxVariables:700000,maxClauses:1600000});
  if(encoded.status!=='encoded')return {status:'timeout',reason:encoded.reason||encoded.status};
  // SAT encoder appends a reference-blocking clause solely for uniqueness tests.
  // Remove it: this benchmark asks for ONE valid solution, not a second solution.
  const block=encoded.clauses.at(-1);
  assert.deepEqual(block,Array.from({length:reference.length},(_,i)=>
    reference[i]==='1'?-(i+1):i+1));
  const clauses=encoded.clauses.slice(0,-1);
  for(let i=0;i<seed.length;i++)if(seed[i]!==-1)
    clauses.push([seed[i]===1?i+1:-(i+1)]);
  let solver;
  try{
    if(Date.now()>=deadline)return {status:'timeout',reason:'time_budget'};
    solver=await Cadical.create({quiet:true});
    solver.setTerminate(()=>Date.now()>=deadline);
    solver.addClauses(clauses);
    const result=Date.now()>=deadline?'unknown':solver.solve();
    if(result!=='satisfiable'||Date.now()>=deadline)
      return {status:result==='unsatisfiable'?'incorrect':'timeout',reason:result};
    const cells=Array.from({length:reference.length},(_,i)=>solver.value(i+1)?1:0);
    verify(cells,reference,puzzle);
    return {status:'solved',cells};
  }finally{solver?.dispose();}
}
async function run(size,kind,mode){
  const {puzzle,reference,seed,density,actualDensity,maskHash}=fixture(size,kind);
  const start=performance.now(),deadline=Date.now()+9700;
  let cells=blank(size),handoffAt=null,handoffReached=null,phase1Status=null,
      iterations=0,status='partial',reason='';
  function next(s){verify(s,reference,puzzle);cells=s;}
  if(mode==='monkey')next(await monkey(puzzle,cells));
  else if(mode==='kniffen')next(await kniffen(puzzle,cells));
  else if(mode==='adaptive'){
    const r=logic(puzzle,cells,deadline);
    next(r.cells);iterations+=r.iterations;
    if(r.status==='unknown')status='timeout';
  }else if(mode==='combine2'||mode==='combine3'||mode==='combine3_logic'){
    for(let pass=0;pass<2*size+2&&Date.now()<deadline;pass++){
      const before=known(cells);
      next(await monkey(puzzle,cells));
      if(known(cells)===size*size)break;
      next(await kniffen(puzzle,cells,true));
      if(known(cells)===size*size)break;
      if(mode==='combine3_logic'){
        const r=logic(puzzle,cells,deadline);
        next(r.cells);iterations+=r.iterations;
        if(r.status==='unknown')break;
      }
      if(known(cells)===before)break;
    }
    if(mode==='combine3'&&known(cells)!==size*size&&Date.now()<deadline){
      const r=await cadical(puzzle,reference,cells,deadline);
      if(r.cells)next(r.cells);
      status=r.status;reason=r.reason||'';
    }
  }else if(mode==='cadical'||mode.startsWith('adaptive')&&mode.endsWith('_cadical')){
    if(mode!=='cadical'){
      const fractions={adaptive25_cadical:0.25,adaptive50_cadical:0.5,
        adaptive75_cadical:0.75,adaptive90_cadical:0.9};
      const target=fractions[mode];
      const r=logic(puzzle,cells,deadline,target);
      next(r.cells);iterations+=r.iterations;phase1Status=r.status;
      handoffAt=known(cells)/(size*size);
      handoffReached=target===undefined?null:handoffAt>=target;
    }
    if(known(cells)!==size*size){
      const r=await cadical(puzzle,reference,cells,deadline);
      if(r.cells)next(r.cells);
      status=r.status;reason=r.reason||'';
    }
  }else throw Error('Unrecognized mode '+mode);
  if(known(cells)===size*size)status='solved';
  else if(Date.now()>=deadline&&status==='partial')status='timeout';
  return {size,fixture:kind,seed,density,actualDensity,maskHash,mode,status,reason,
    knownCells:known(cells),percent:+(100*known(cells)/(size*size)).toFixed(1),
    handoffPct:handoffAt===null?null:+(100*handoffAt).toFixed(1),
    handoffReached,phase1Status,iterations,
    elapsedMs:+(performance.now()-start).toFixed(2)};
}
async function uniqueness(size,kind){
  const {puzzle,reference,seed,density,actualDensity,maskHash}=fixture(size,kind);
  const start=performance.now(),deadline=Date.now()+7400;
  const meta={size,fixture:kind,seed,density,actualDensity,maskHash,mode:'uniqueness'};
  const {Cadical}=await import('cadical-wasm');
  const encoded=sat.encode(puzzle,reference,{maxMs:Math.max(0,deadline-Date.now()),
    maxVariables:700000,maxClauses:1600000});
  if(encoded.status!=='encoded')return {...meta,status:'unknown',
    reason:encoded.reason||encoded.status,elapsedMs:+(performance.now()-start).toFixed(2)};
  let solver;
  try{
    solver=await Cadical.create({quiet:true});
    solver.setTerminate(()=>Date.now()>=deadline);
    solver.addClauses(encoded.clauses); // INCLUDING the reference-blocking clause.
    const outcome=Date.now()<deadline?solver.solve():'unknown';
    const status=outcome==='unsatisfiable'?'unique':outcome==='satisfiable'?'multiple':'unknown';
    return {...meta,status,reason:status==='unknown'?outcome:'',
      elapsedMs:+(performance.now()-start).toFixed(2)};
  }finally{solver?.dispose();}
}
const i=process.argv.indexOf('--single'),u=process.argv.indexOf('--uniqueness');
if(i>=0){
  const size=Number(process.argv[i+1]),kind=process.argv[i+2],mode=process.argv[i+3];
  assert(SIZES.includes(size)&&FIXTURES.includes(kind)&&MODES.includes(mode));
  try{console.log(JSON.stringify(await run(size,kind,mode)));}
  catch(e){console.log(JSON.stringify({size,fixture:kind,mode,status:'error',
    reason:String(e?.stack||e).slice(0,700)}));process.exitCode=1;}
}else if(u>=0){
  const size=Number(process.argv[u+1]),kind=process.argv[u+2];
  assert(SIZES.includes(size)&&FIXTURES.includes(kind));
  try{console.log(JSON.stringify(await uniqueness(size,kind)));}
  catch(e){console.log(JSON.stringify({size,fixture:kind,mode:'uniqueness',status:'unknown',
    reason:String(e?.stack||e).slice(0,700)}));}
}else{
  const s=process.argv.indexOf('--size'),selected=s>=0?[Number(process.argv[s+1])]:SIZES;
  for(const size of selected)for(const kind of FIXTURES){
    {
      const t=performance.now();
      const child=spawnSync(process.execPath,[new URL(import.meta.url).pathname,'--uniqueness',
        String(size),kind],{encoding:'utf8',timeout:8000,maxBuffer:1024*1024});
      let row;
      if(child.error?.code==='ETIMEDOUT')
        row={size,fixture:kind,mode:'uniqueness',status:'unknown',reason:'8s_uniqueness_cap'};
      else try{row=JSON.parse((child.stdout||'').trim().split('\n').at(-1));}
      catch{row={size,fixture:kind,mode:'uniqueness',status:'unknown',
        reason:(child.stderr||child.error?.message||'invalid_child_output').slice(0,500)};}
      row.wallMs=+(performance.now()-t).toFixed(1);
      console.log(JSON.stringify(row));
    }
    for(const mode of MODES){
      const t=performance.now();
      const child=spawnSync(process.execPath,[new URL(import.meta.url).pathname,'--single',
        String(size),kind,mode],{encoding:'utf8',timeout:10000,maxBuffer:1024*1024});
      let row;
      if(child.error?.code==='ETIMEDOUT')
        row={size,fixture:kind,mode,status:'timeout',reason:'hard_10s_limit'};
      else try{row=JSON.parse((child.stdout||'').trim().split('\n').at(-1));}
      catch{row={size,fixture:kind,mode,status:'error',
        reason:(child.stderr||child.error?.message||'invalid_child_output').slice(0,500)};}
      row.wallMs=+(performance.now()-t).toFixed(1);
      console.log(JSON.stringify(row));
    }
  }
}
