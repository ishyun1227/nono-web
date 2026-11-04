/* Differential checks: SAT DFA/CNF vs exhaustive small-board counting.
 * SAT 'unknown' is never interpreted as unique. */
'use strict';
const assert=require('node:assert/strict');
const sat=require('../sat-nonogram-solver.js');
const old=require('../random-puzzle-solver.js');
const gen=require('../random-puzzles.js');
function clues(line){return (line.match(/1+/g)||[]).map(x=>x.length).join(',');}
function brute(puzzle){
  const n=puzzle.size,limit=1<<n,patterns=new Map();
  function options(hint){
    const id=hint.join(',');
    if(!patterns.has(id)){
      const possible=[];
      for(let mask=0;mask<limit;mask++){
        const bits=Array.from({length:n},(_,i)=>(mask>>i)&1).join('');
        if(clues(bits)===id)possible.push(mask);
      }
      patterns.set(id,possible);
    }
    return patterns.get(id);
  }
  let count=0;
  const row=puzzle.rows.map(options),col=puzzle.cols.map(options);
  function dfs(y,candidates){
    if(count>=2)return;
    if(y===n){count++;return;}
    for(const bits of row[y]){
      const next=candidates.map((values,x)=>values.filter(mask=>((mask>>y)&1)===((bits>>x)&1)));
      if(next.every(x=>x.length))dfs(y+1,next);
      if(count>=2)return;
    }
  }
  dfs(0,col);
  return count===0?'invalid':count===1?'unique':'multiple';
}
const full={size:5,rows:Array.from({length:5},()=>[5]),cols:Array.from({length:5},()=>[5])};
const diag={size:5,rows:Array.from({length:5},()=>[1]),cols:Array.from({length:5},()=>[1])};
assert.equal(sat.check(full,'1'.repeat(25)).status,'unique');
assert.equal(sat.check(diag,'1000001000001000001000001',{maxNodes:5000}).status,'multiple');
assert.equal(sat.check(full,'0'.repeat(25)).status,'invalid');
assert.equal(sat.check(diag,'1000001000001000001000001',{maxNodes:1}).status,'unknown');
// The real wall-clock limit is independent of node and clause limits.
const zeroTime=sat.check(full,'1'.repeat(25),{maxMs:0,maxNodes:1000000});
assert.equal(zeroTime.status,'unknown');
assert.equal(zeroTime.reason,'time_budget');
// Huge puzzles must not crash or falsely claim uniqueness if the budget
// expires during CNF construction. Keep this CI check short.
for(const size of [75,100]){
  const huge=gen.fromSpec({size,difficulty:'보통',seed:100,version:4});
  const result=sat.check(huge,gen.answerFor(huge),{
    maxMs:15,maxNodes:10000000,maxVisits:100000000,
    maxVariables:700000,maxClauses:1600000
  });
  assert.equal(result.status,'unknown');
}

let solved=0,inconclusive=0;
for(let n of [5,10]){
  for(let i=0;i<25;i++){
    const seed=(Math.imul(i+1,0x9E3779B9)^Math.imul(n,0x85EBCA6B))>>>0;
    const puzzle=gen.fromSpec({size:n,difficulty:'보통',seed,version:4});
    const reference=gen.answerFor(puzzle);
    const expected=brute(puzzle);
    const a=old.countSolutions(puzzle,{reference,maxChecks:20000,maxNodes:2000});
    assert.equal(a.status,expected,'Baseline disagrees with independent exact enumeration');
    const b=sat.check(puzzle,reference,{maxNodes:3000,maxVisits:200000});
    if(b.status==='unknown'){inconclusive++;continue;}
    assert.equal(b.status,expected,'SAT disagrees with independent exact enumeration');
    assert(b.status==='unique'||b.status==='multiple');
    if(b.status==='multiple')assert.notEqual(b.alternative,reference);
    solved++;
  }
}
assert(solved>0);
console.log('PASS SAT vs exhaustive baseline on '+solved+' resolved cases; '+inconclusive+' SAT budget-limited cases kept unknown');
