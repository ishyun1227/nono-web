/* Compare adaptive constraint-first priority with and without edge tiebreak.
 * Representative fixed V4 deterministic candidates; NO uniqueness claim.
 * Run: node tests/benchmark-adaptive-nonogram.cjs
 */
'use strict';
const {performance}=require('node:perf_hooks');
const adaptive=require('../adaptive-nonogram-solver.js');
const generator=require('../random-puzzles.js');
const seeds=[100,102,501],sizes=[5,10,15,20,25,30,50,75,100];
const results=[];
for(const size of sizes)for(const edgePriority of [false,true]){
  let elapsedMs=0,solved=0,completed=0,dp=0,enumeration=0,switches=0,timeouts=0;
  for(const seed of seeds){
    const puzzle=generator.fromSpec({size,difficulty:'보통',seed,version:4});
    const start=performance.now();
    const output=adaptive.solve(puzzle,{maxMs:1000,captureTrace:false,edgePriority});
    elapsedMs+=performance.now()-start;
    solved+=output.solved;
    completed+=(output.status==='solved');
    dp+=output.stats.dpCalls;
    enumeration+=output.stats.enumerationCalls;
    switches+=output.stats.modeSwitches;
    timeouts+=(output.status==='unknown');
  }
  results.push({size,edge:edgePriority?'on':'off',avgMs:+(elapsedMs/seeds.length).toFixed(2),
    avgCells:+(solved/seeds.length).toFixed(1),finished:completed,dp,enumeration,switches,timeouts});
}
console.table(results);
console.log('NOTE: incomplete logic solves do not prove non-uniqueness; only CaDiCaL certifies unique.');
