/* Manual SAT uniqueness benchmark with a strict per-puzzle 5000 ms limit.
 * node tests/benchmark-sat-five-seconds.cjs
 * Uniqueness is NOT granted when the SAT solver returns 'unknown'.
 * The production v5 random generator remains unchanged.
 */
'use strict';
const {performance}=require('node:perf_hooks');
const gen=require('../random-puzzles.js');
const sat=require('../sat-nonogram-solver.js');
const limitMs=5000;
const results=[];
for(const size of [5,10,15,20,25,30,50,75,100]){
  const p=gen.fromSpec({size,difficulty:'보통',seed:100,version:4});
  const reference=gen.answerFor(p);
  const start=performance.now();
  const result=sat.check(p,reference,{
    maxMs:limitMs,maxNodes:10000000,maxVisits:100000000,
    maxVariables:700000,maxClauses:1600000
  });
  const elapsedMs=Math.round(performance.now()-start);
  if(result.status==='multiple'&&!result.alternative)throw Error('Missing second solution');
  results.push({size,limitMs,elapsedMs,status:result.status,
    reason:result.reason||'-',nodes:result.nodes,variables:result.variables||null,
    clauses:result.clauses||null});
}
console.table(results);
console.log('Results are single fixed-seed trials, not success-rate estimates.');
