/* Paired comparison: actual CaDiCaL solver with/without sound logical unit facts.
 * Results are measurements, not a claim that all generated V4 boards are unique.
 * Every result is checked for the same SAT/UNSAT interpretation, where decided.
 */
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {createRequire} from 'node:module';
import {Cadical} from 'cadical-wasm';
const require=createRequire(import.meta.url);
const random=require('../random-puzzles.js');
const encoder=require('../sat-nonogram-solver.js');
const adaptive=require('../adaptive-nonogram-solver.js');
const cases=[5,10,15,20,25,30,50,75,100];
async function run(puzzle,mask,preprocess){
  const start=performance.now(),deadline=Date.now()+5000;
  let logicMs=0,units=[],result='unknown',reason='',solver;
  if(preprocess){
    const t=performance.now();
    const deductions=adaptive.solve(puzzle,{maxMs:Math.min(125,Math.max(1,deadline-Date.now())),captureTrace:false});
    logicMs=performance.now()-t;
    assert.notEqual(deductions.status,'invalid','Incorrect logical contradiction');
    for(let i=0;i<deductions.cells.length;i++)if(deductions.cells[i]!==-1){
      const value=deductions.cells[i];
      assert.equal(value,Number(mask[i]),'Unsound deduction would invalidate uniqueness proof');
      units.push(value===1?i+1:-(i+1));
    }
  }
  const encoded=encoder.encode(puzzle,mask,{maxMs:Math.max(0,deadline-Date.now())});
  if(encoded.status!=='encoded')return {status:'unknown',reason:encoded.reason||encoded.status,units:units.length,
    logicMs:+logicMs.toFixed(2),elapsedMs:+(performance.now()-start).toFixed(1)};
  try{
    solver=await Cadical.create({quiet:true});
    if(Date.now()>=deadline)return {status:'unknown',reason:'init_budget',units:units.length,
      logicMs:+logicMs.toFixed(2),elapsedMs:+(performance.now()-start).toFixed(1)};
    solver.setTerminate(()=>Date.now()>=deadline);
    solver.addClauses(units.length?[...encoded.clauses,...units.map(u=>[u])]:encoded.clauses);
    const decision=Date.now()>=deadline?'unknown':solver.solve();
    result=Date.now()>=deadline?'unknown':decision==='satisfiable'?'multiple':
      decision==='unsatisfiable'?'unique':'unknown';
    if(result==='multiple'){
      const alternative=Array.from({length:mask.length},(_,i)=>solver.value(i+1)?'1':'0').join('');
      const getRuns=s=>(s.match(/1+/g)||[]).map(x=>x.length).join(',');
      assert.notEqual(alternative,mask,'Blocked original solution returned');
      for(let i=0;i<puzzle.size;i++){
        assert.equal(getRuns(alternative.slice(i*puzzle.size,(i+1)*puzzle.size)),puzzle.rows[i].join(','));
        assert.equal(getRuns(Array.from({length:puzzle.size},(_,j)=>alternative[j*puzzle.size+i]).join('')),puzzle.cols[i].join(','));
      }
    }
    if(result==='unknown')reason='time_budget';
  }finally{solver?.dispose();}
  return {status:result,reason,units:units.length,logicMs:+logicMs.toFixed(2),
    elapsedMs:+(performance.now()-start).toFixed(1)};
}
const records=[];
for(const size of cases){
  const puzzle=random.fromSpec({size,difficulty:'보통',seed:100,version:4});
  const mask=random.answerFor(puzzle);
  const base=await run(puzzle,mask,false);
  const assisted=await run(puzzle,mask,true);
  if(base.status!=='unknown'&&assisted.status!=='unknown')
    assert.equal(base.status,assisted.status,'Logical preprocessing changed SAT truth');
  records.push({size,base:base.status,baseMs:base.elapsedMs,adaptive:assisted.status,
    adaptiveMs:assisted.elapsedMs,preMs:assisted.logicMs,forced:assisted.units});
}
console.table(records);
console.log('PASS paired CaDiCaL comparisons (decided statuses consistent; timeout is inconclusive)');
