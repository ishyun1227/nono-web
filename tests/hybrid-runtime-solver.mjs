/* Real CaDiCaL integration for chosen adaptive-to-stall solving strategy.
 * Uniqueness remains blocked-reference UNSAT, never inferred from solving.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {Cadical} from 'cadical-wasm';
const require=createRequire(import.meta.url);
const adaptive=require('../adaptive-nonogram-solver.js');
const sat=require('../sat-nonogram-solver.js');
const hybrid=require('../hybrid-nonogram-solver.js');
const hard=JSON.parse(fs.readFileSync(new URL('./fixtures/hard-random-unique-stalled-20261106.json',import.meta.url))).fixtures;
const easy=JSON.parse(fs.readFileSync(new URL('./fixtures/five-unique-random-20261106.json',import.meta.url))).puzzles;
function validate(p,cells){
  assert.equal(cells.length,p.size*p.size);
  assert(hybrid.matchesClues(cells,p));
}
const createSolver=()=>Cadical.create({quiet:true});
const proofOfUniqueness=async(p,reference)=>{
  const cnf=sat.encode(p,reference,{maxMs:5000});
  assert.equal(cnf.status,'encoded');
  let solver=await createSolver();
  try{solver.addClauses(cnf.clauses);return solver.solve();}
  finally{solver.dispose();}
};
const base=easy.find(x=>x.size===10);
assert(base,'10x10 easy fixture missing');
const puzzle={size:base.size,rows:base.rows,cols:base.cols};
const logic=adaptive.solve(puzzle,{maxMs:1000,captureTrace:false});
assert.equal(logic.status,'solved','easy fixture must not call SAT');
const answer=await hybrid.solve(puzzle,{maxMs:5000,createSolver,captureTrace:true});
assert.equal(answer.status,'solved');
assert.equal(answer.method,'adaptive');
assert.equal(answer.satCalled,false);
assert.equal(answer.uniqueness,'not_checked');
assert(answer.trace?.length>0);
assert.equal(answer.cells.join(''),base.answerRows.join(''));
validate(puzzle,answer.cells);

for(const n of [5,10,20,50]){
  const f=hard.find(x=>x.size===n&&x.kind==='independent Bernoulli sample');
  assert(f,'Hard sample missing: '+n);
  const p={size:n,rows:f.rows,cols:f.cols};
  const first=adaptive.solve(p,{maxMs:5000,captureTrace:false});
  assert.equal(first.status,'partial','Fixture must genuinely stall '+n);
  const result=await hybrid.solve(p,{maxMs:9000,createSolver});
  assert.equal(result.status,'solved','Hybrid must complete '+n+' '+result.reason);
  assert.equal(result.method,'adaptive_then_cadical');
  assert.equal(result.satCalled,true);
  assert.equal(result.uniqueness,'not_checked');
  assert.equal(result.logicSolved,first.solved);
  assert.equal(result.cells.join(''),f.answerRows.join(''));
  validate(p,result.cells);
  const independent=await proofOfUniqueness(p,f.answerRows.join(''));
  assert.equal(independent,'unsatisfiable','Uniqueness must be independently proven '+n);
  console.log('PASS '+n+'×'+n+' Adaptive stalled at '+first.solved+' cells, CaDiCaL completed; distinct UNSAT proof');
}
// Multi-solution permutation board: hybrid can solve ONE grid but never call it unique.
const n=5,multi={size:n,rows:Array.from({length:n},()=>[1]),cols:Array.from({length:n},()=>[1])};
const found=await hybrid.solve(multi,{maxMs:5000,createSolver});
assert.equal(found.status,'solved');
assert.equal(found.satCalled,true);
assert.equal(found.uniqueness,'not_checked');
validate(multi,found.cells);
assert.equal(await proofOfUniqueness(multi,found.cells.join('')),'satisfiable',
  'A valid completed grid must NOT certify uniqueness');
const cnfSolve=sat.encodeForSolve(multi,{maxMs:5000});
const cnfUnique=sat.encode(multi,found.cells.join(''),{maxMs:5000});
assert.equal(cnfSolve.status,'encoded');
assert.equal(cnfUnique.status,'encoded');
assert.equal(cnfSolve.clauses.length+1,cnfUnique.clauses.length,
  'Only reference-blocked proof receives the extra disjunction');
assert.equal((await hybrid.solve({size:5,rows:[[4]],cols:[]},
  {createSolver})).status,'invalid');
assert.equal((await hybrid.solve(multi,{maxMs:0,createSolver})).status,'unknown');
console.log('PASS easy path, 4 hard unique cases, multiple-solution isolation, no-false-uniqueness, timeout, validation');
