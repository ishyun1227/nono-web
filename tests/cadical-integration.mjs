/* Real CaDiCaL WebAssembly cross-check against independent line-DP search.
 * This exercises the published professional solver, not the handwritten DPLL.
 * Run only after npm ci: node tests/cadical-integration.mjs
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { performance } from 'node:perf_hooks';
import { Cadical } from 'cadical-wasm';
const require=createRequire(import.meta.url);
const random=require('../random-puzzles.js');
const encoder=require('../sat-nonogram-solver.js');
const baseline=require('../random-puzzle-solver.js');

function runs(bits){return (bits.match(/1+/g)||[]).map(x=>x.length);}
function validOther(p,reference,other){
  if(other===reference)return false;
  for(let i=0;i<p.size;i++){
    const row=runs(other.slice(i*p.size,(i+1)*p.size));
    const col=runs(Array.from({length:p.size},(_,y)=>other[y*p.size+i]).join(''));
    if(JSON.stringify(row)!==JSON.stringify(p.rows[i])||
       JSON.stringify(col)!==JSON.stringify(p.cols[i]))return false;
  }
  return true;
}
const results=[];
for(const size of [5,10,15,20]){
  for(const seed of [100,102]){
    const puzzle=random.fromSpec({size,difficulty:'보통',seed,version:4});
    const reference=random.answerFor(puzzle);
    const independent=baseline.countSolutions(puzzle,{reference,maxChecks:50000,maxNodes:3000});
    assert(['unique','multiple'].includes(independent.status),'Independent proof was inconclusive');
    const compiled=encoder.encode(puzzle,reference,{maxMs:5000});
    assert.equal(compiled.status,'encoded');
    const solver=await Cadical.create({quiet:true});
    const started=performance.now(),deadline=Date.now()+5000;
    try{
      solver.setTerminate(()=>Date.now()>=deadline);
      solver.addClauses(compiled.clauses);
      assert(Date.now()<deadline,'Clause loading exceeded 5-second budget');
      const decision=solver.solve();
      assert.notEqual(decision,'unknown','Professional SAT solver could not decide');
      const actual=decision==='unsatisfiable'?'unique':
        decision==='satisfiable'?'multiple':'unexpected';
      assert.equal(actual,independent.status,`Mismatch for ${size}x${size}, seed ${seed}`);
      if(actual==='multiple'){
        const other=Array.from({length:reference.length},(_,i)=>solver.value(i+1)?'1':'0').join('');
        assert(validOther(puzzle,reference,other),'Invalid second solution returned');
      }
      results.push({size,seed,verdict:actual,elapsedMs:+(performance.now()-started).toFixed(2)});
    }finally{solver.dispose();}
  }
}
console.table(results);
console.log('PASS real CaDiCaL/CDCL WASM proof agrees with independent nonogram solver');
