/* 10-second end-to-end nonogram solving benchmark.
 * Pinned, unmodified upstream solvers fetched by CI; seeded kniffen adapter
 * only adds initial cells for combined modes.
 * Fixtures (triangle and border) have a unique solution by construction.
 * Each mode+fixture is an isolated Node process with a 10,000ms hard limit.
 * Report partial deduction separately from solved; no uniqueness claims
 * are derived from a timed-out solver.
 */
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const adaptive=require('../adaptive-nonogram-solver.js');
const sat=require('../sat-nonogram-solver.js');
const MODES=['monkey','kniffen','adaptive','combine2','combine3','cadical','adaptive50_cadical','adaptivefull_cadical'];
const FIXTURES=['triangle','border'], SIZES=[5,10,15,20,25,30,50,75,100];
function clue(bits){const a=[];let k=0;for(const x of bits){if(x)k++;else if(k){a.push(k);k=0;}}if(k)a.push(k);return a.length?a:[0];}
function fixture(n,kind){
  const bits=Array.from({length:n*n},(_,i)=>{
    const y=Math.floor(i/n),x=i%n;
    return kind==='triangle'?(x<=y?1:0):(x===0||x===n-1||y===0||y===n-1?1:0);
  });
  return {puzzle:{size:n,rows:Array.from({length:n},(_,y)=>clue(bits.slice(y*n,(y+1)*n))),
    cols:Array.from({length:n},(_,x)=>clue(Array.from({length:n},(_,y)=>bits[y*n+x])))},
    reference:bits.join('')};
}
function verify(cells,mask){assert.equal(cells.length,mask.length);for(let i=0;i<cells.length;i++)
  if(cells[i]!==-1)assert.equal(cells[i],Number(mask[i]),'unsound deduction at '+i);
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
    verify(cells,reference);
    return {status:'solved',cells};
  }finally{solver?.dispose();}
}
async function run(size,kind,mode){
  const {puzzle,reference}=fixture(size,kind);
  const start=performance.now(),deadline=Date.now()+9700;
  let cells=blank(size),handoffAt=null,iterations=0,status='partial',reason='';
  function next(s){verify(s,reference);cells=s;}
  if(mode==='monkey')next(await monkey(puzzle,cells));
  else if(mode==='kniffen')next(await kniffen(puzzle,cells));
  else if(mode==='adaptive'){
    const r=logic(puzzle,cells,deadline);
    next(r.cells);iterations+=r.iterations;
    if(r.status==='unknown')status='timeout';
  }else if(mode==='combine2'||mode==='combine3'){
    for(let pass=0;pass<2*size+2&&Date.now()<deadline;pass++){
      const before=known(cells);
      next(await monkey(puzzle,cells));
      if(known(cells)===size*size)break;
      next(await kniffen(puzzle,cells,true));
      if(known(cells)===size*size)break;
      if(mode==='combine3'){
        const r=logic(puzzle,cells,deadline);
        next(r.cells);iterations+=r.iterations;
        if(r.status==='unknown')break;
      }
      if(known(cells)===before)break;
    }
  }else if(mode==='cadical'||mode==='adaptive50_cadical'||mode==='adaptivefull_cadical'){
    if(mode!=='cadical'){
      const r=logic(puzzle,cells,deadline,mode==='adaptive50_cadical'?0.5:undefined);
      next(r.cells);iterations+=r.iterations;
      handoffAt=known(cells)/(size*size);
    }
    if(known(cells)!==size*size){
      const r=await cadical(puzzle,reference,cells,deadline);
      if(r.cells)next(r.cells);
      status=r.status;reason=r.reason||'';
    }
  }else throw Error('Unrecognized mode '+mode);
  if(known(cells)===size*size)status='solved';
  else if(Date.now()>=deadline&&status==='partial')status='timeout';
  return {size,fixture:kind,mode,status,reason,knownCells:known(cells),
    percent:+(100*known(cells)/(size*size)).toFixed(1),
    handoffPct:handoffAt===null?null:+(100*handoffAt).toFixed(1),
    iterations,elapsedMs:+(performance.now()-start).toFixed(2)};
}
const i=process.argv.indexOf('--single');
if(i>=0){
  const size=Number(process.argv[i+1]),kind=process.argv[i+2],mode=process.argv[i+3];
  assert(SIZES.includes(size)&&FIXTURES.includes(kind)&&MODES.includes(mode));
  try{console.log(JSON.stringify(await run(size,kind,mode)));}
  catch(e){console.log(JSON.stringify({size,fixture:kind,mode,status:'error',
    reason:String(e?.stack||e).slice(0,700)}));process.exitCode=1;}
}else{
  const s=process.argv.indexOf('--size'),selected=s>=0?[Number(process.argv[s+1])]:SIZES;
  for(const size of selected)for(const kind of FIXTURES)for(const mode of MODES){
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
