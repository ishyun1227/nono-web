/* Diagnostic benchmark; never changes the production v5 generator.
 * Compare exact branch-and-propagate vs experimental SAT encoding.
 * Only completed proofs count as successes; unknown is NOT unique.
 * node tests/benchmark-sat-uniqueness.cjs
 */
'use strict';
const {performance}=require('node:perf_hooks');
const base=require('../random-puzzle-solver.js');
const sat=require('../sat-nonogram-solver.js');
const gen=require('../random-puzzles.js');
const sizes=[5,10,15,20,25,30];
const samples=4,results=[];
for(const size of sizes){
  let originalTime=0,satTime=0,originalComplete=0,satComplete=0,unknown=0,mismatches=0;
  for(let index=0;index<samples;index++){
    const seed=100+index;
    const p=gen.fromSpec({size,difficulty:'보통',seed,version:4});
    const reference=gen.answerFor(p);
    const startOriginal=performance.now();
    const original=base.countSolutions(p,{reference,maxChecks:25000,maxNodes:1000});
    originalTime+=performance.now()-startOriginal;
    const startSat=performance.now();
    const alternative=sat.check(p,reference,{maxNodes:1500,maxVisits:100000,maxVariables:30000,maxClauses:85000});
    satTime+=performance.now()-startSat;
    if(original.status==='unique'||original.status==='multiple')originalComplete++;
    if(alternative.status==='unique'||alternative.status==='multiple')satComplete++;
    if(alternative.status==='unknown')unknown++;
    if(alternative.status!=='unknown'&&original.status!=='unknown'&&alternative.status!==original.status)mismatches++;
  }
  results.push({size,samples,baselineSolved:originalComplete,satSolved:satComplete,satUnknown:unknown,
    baselineAvgMs:+(originalTime/samples).toFixed(2),satAvgMs:+(satTime/samples).toFixed(2),mismatches});
}
console.table(results);
if(results.some(r=>r.mismatches))throw Error('SAT and baseline uniqueness decisions disagreed');
console.log('Experimental SAT checker is NOT used to approve generated puzzles.');
