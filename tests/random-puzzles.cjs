/* Deterministic constructive + paper-guided nonogram regression. */
'use strict';
const assert=require('node:assert/strict');
const storage=new Map();
globalThis.localStorage={
 getItem:key=>storage.has(key)?storage.get(key):null,
 setItem:(key,value)=>storage.set(String(key),String(value)),
 removeItem:key=>storage.delete(String(key))
};
const solver=require('../random-puzzle-solver.js');
const api=require('../random-puzzles.js');
assert.deepEqual(api.LEVELS,['쉬움','보통','어려움','전문가']);
function hints(bits){const runs=(bits.join('').match(/1+/g)||[]).map(s=>s.length);return runs.length?runs:[0];}
let created=0;
for(const size of [5,10,15,20,25,30,50,75,100]){
 for(const difficulty of api.LEVELS){
  const seed=(size*9991+api.LEVELS.indexOf(difficulty)*181)>>>0;
  const p=api.generate({size,difficulty,seed});
  const copy=api.fromSpec({...p});
  const answer=api.answerFor(p);
  assert.equal(p.designVersion,2);
  assert.equal(p.generated,true);
  assert.equal(p.trialOnly,true);
  assert.equal(p.seed,seed);
  assert.equal(answer.length,size*size);
  assert.deepEqual(copy.rows,p.rows);
  assert.deepEqual(copy.cols,p.cols);
  assert(p.rows.every(line=>line.length>0&&line[0]>0),'Empty row');
  assert(p.cols.every(line=>line.length>0&&line[0]>0),'Empty column');
  const rows=Array.from({length:size},(_,r)=>answer.slice(r*size,(r+1)*size).split(''));
  const cols=Array.from({length:size},(_,c)=>Array.from({length:size},(_,r)=>answer[r*size+c]));
  assert.deepEqual(rows.map(hints),p.rows,'Row clues disagree with answer');
  assert.deepEqual(cols.map(hints),p.cols,'Column clues disagree with answer');
  assert.equal(api.restore().some(x=>x.id===p.id),true);
  if(size<=30){
    const report=solver.evaluate(p);
    assert.equal(report.status,p.paperSolverStatus);
    assert.equal(report.funScore,p.paperFunScore);
    assert.equal(report.difficultyScore,p.paperDifficultyScore);
    if(report.status==='solved'){
      const {n,g,d,k,u,black,white}=report.metrics;
      assert.equal(report.difficultyScore,n+50*Math.sqrt(g)+10*d);
      if(k!==null){
        const expected=(4*black*white/(size**4)-k)*u+5-Math.max(d,5)-g*g;
        assert(Math.abs(expected-report.funScore)<0.002,'Paper fun formula mismatch');
      }
    }else{
      assert.equal(p.paperFunScore,null,'Do not invent a score for unsolved puzzles');
    }
  }else{
    assert.equal(p.paperSolverStatus,'not_evaluated');
    assert.equal(p.paperFunScore,null);
  }
  created++;
 }
}
assert.equal(api.restore().length,created);
// Existing saved and invited rooms must retain v1 clue/answer layout.
for(const size of [5,10,15,25]){
 const old=api.fromSpec({size,difficulty:'보통',seed:12345,version:1});
 assert.equal(old.designVersion,1);
 assert.equal(old.paperFunScore,null);
 assert.deepEqual(api.fromSpec({...old}).rows,old.rows);
 assert.equal(api.answerFor(old),api.answerFor({...old,version:1}));
}
// Regression: a previously ambiguous 25x25 grid can now be improved
// into a grid fully deduced from clues, which also proves uniqueness.
const sample=api.fromSpec({size:25,difficulty:'보통',seed:797});
assert.equal(sample.paperSolverStatus,'solved');
assert.notEqual(sample.paperFunScore,null);
assert.notEqual(api.answerFor(sample),api.answerFor({...sample,version:1}));
assert.throws(()=>api.generate({size:101,difficulty:'쉬움'}),/지원하지 않는/);
assert.throws(()=>api.generate({size:10,difficulty:'미평가'}),/지원하지 않는/);
assert.throws(()=>api.fromSpec({size:10,difficulty:'보통',seed:-1}),/지원하지 않는/);
console.log('PASS '+created+' generated combinations, paper evaluation, legacy v1 seeds, deterministic multiplayer reconstruction');
