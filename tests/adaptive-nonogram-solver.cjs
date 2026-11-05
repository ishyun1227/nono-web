/* Exact differential checks for adaptive nonogram deductions.
 * Any confirmed cell must be present in EVERY compatible layout, not only
 * the known puzzle answer. This guards against false uniqueness proofs when
 * logical deductions are later used as SAT unit clauses.
 */
'use strict';
const assert=require('node:assert/strict');
const adaptive=require('../adaptive-nonogram-solver.js');
const random=require('../random-puzzles.js');
const baseline=require('../random-puzzle-solver.js');
function runs(bits){const s=[];let count=0;for(const b of bits){if(b)count++;else if(count){s.push(count);count=0;}}if(count)s.push(count);return s;}
function allPatterns(n,clue){
  const out=[];
  for(let mask=0;mask<1<<n;mask++){
    const bits=Array.from({length:n},(_,i)=>mask>>i&1);
    if(JSON.stringify(runs(bits))===JSON.stringify(clue))out.push(bits);
  }
  return out;
}
let checked=0;
for(let n=5;n<=10;n++){
  const clueMap=new Map();
  for(let mask=0;mask<1<<n;mask++){
    const bits=Array.from({length:n},(_,i)=>mask>>i&1);
    const clue=runs(bits);if(!clue.length)continue;
    const key=clue.join(',');
    if(!clueMap.has(key))clueMap.set(key,[]);
    clueMap.get(key).push(bits);
  }
  for(const [key,patterns] of clueMap){
    const clue=key.split(',').map(Number);
    // Every possible line assignment must agree with exact enumeration.
    for(let sample=0;sample<4;sample++){
      const seed=patterns[(sample*17)%patterns.length];
      const known=seed.map((x,i)=>(i*5+sample*3)%7<3?x:-1);
      const permitted=patterns.filter(p=>p.every((x,i)=>known[i]===-1||known[i]===x));
      const answer=adaptive.analyzeLine(clue,known);
      assert.equal(answer.status,'ok',n+':'+key+' sample '+sample);
      for(let i=0;i<n;i++)if(known[i]<0){
        const candidate=answer.forced.find(x=>x.pos===i);
        const expected=permitted.every(p=>p[i]===1)?1:permitted.every(p=>p[i]===0)?0:-1;
        assert.equal(candidate?candidate.value:-1,expected,'Unsound line inference n='+n+' clue='+key+' pos='+i);
      }
      checked++;
    }
  }
}
assert.equal(adaptive.analyzeLine([5],[0,-1,-1,-1,-1]).status,'contradiction');
assert.equal(adaptive.analyzeLine([3],[-1,-1,-1,-1,-1]).forced.some(x=>x.pos===2&&x.value===1),true);
const mid=Array(23).fill(-1),clue=[2,2,2,2];
assert.equal(adaptive.analyzeLine(clue,mid).method,'dp','Large candidate range uses DFA');
const fixed='11011011011000000000000'.split('').map(c=>Number(c));
assert.equal(fixed.length,23);
for(let i=0;i<fixed.length;i++)if(i%2===0)mid[i]=fixed[i];
assert.equal(adaptive.analyzeLine(clue,mid).method,'enumeration','Late narrowed state switches to enumeration');
const complex=adaptive.analyzeLine(Array(15).fill(1),Array(100).fill(-1),{deadline:Date.now()+1000});
assert.equal(complex.status,'ok');
assert.equal(complex.method,'dp');
let cells=0,trace=0,fullySolved=0;
for(const n of [5,10,15,20,25,30,50,75,100]){
  for(const seed of [100,102,501]){
    const puzzle=random.fromSpec({size:n,difficulty:'보통',seed,version:4});
    const original=random.answerFor(puzzle);
    const result=adaptive.solve(puzzle,{maxMs:1600});
    assert(['solved','partial','unknown'].includes(result.status),n+' invalid inference');
    assert.equal(result.cells.length,n*n);
    for(let i=0;i<n*n;i++)if(result.cells[i]!==-1){
      assert.equal(result.cells[i],Number(original[i]),'Incorrect forced cell: n='+n+', seed='+seed+', cell='+i);
      cells++;
    }
    if(result.status==='solved'){
      const proof= n<=20?baseline.countSolutions(puzzle,{reference:original,maxChecks:50000,maxNodes:3000}):null;
      if(proof)assert.equal(proof.status,'unique','Deductive finish means a unique solution');
      fullySolved++;
    }
    assert(result.trace.every(t=>t.changes.length>0));
    trace+=result.trace.length;
  }
}
const empty=adaptive.solve({size:5,rows:[[5],[5],[5],[5],[5]],cols:[[5],[5],[5],[5],[5]]},{maxMs:0});
assert.equal(empty.status,'unknown');
const forced=adaptive.solve({size:5,rows:[[5],[5],[5],[5],[5]],cols:[[5],[5],[5],[5],[5]]},{maxMs:1000});
assert.equal(forced.status,'solved');assert.equal(forced.solved,25);
const multiple=adaptive.solve({size:5,rows:[[1],[1],[1],[1],[1]],cols:[[1],[1],[1],[1],[1]]},{maxMs:1000});
assert.equal(multiple.status,'partial','Pure logic cannot pretend to prove uniqueness');
console.log('PASS adaptive solver: '+checked+' exact line cases, '+cells+' sound forced cells, '+trace+' traced steps, '+fullySolved+' complete sample solves');
