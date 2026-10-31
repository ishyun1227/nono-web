/* Constructive random puzzle regression: no candidate search and no picture sources. */
'use strict';
const assert=require('node:assert/strict');
const storage=new Map();
globalThis.localStorage={
 getItem:key=>storage.has(key)?storage.get(key):null,
 setItem:(key,value)=>storage.set(String(key),String(value)),
 removeItem:key=>storage.delete(String(key))
};
const api=require('../random-puzzles.js');
assert.deepEqual(api.LEVELS,['쉬움','보통','어려움','전문가']);
function hints(bits){const runs=(bits.join('').match(/1+/g)||[]).map(s=>s.length);return runs.length?runs:[0];}
let created=0;
for(const size of [5,10,15,20,25,30,50,75,100]){
 for(const difficulty of api.LEVELS){
  const seed=(size*9991+api.LEVELS.indexOf(difficulty)*181)>>>0;
  const puzzle=api.generate({size,difficulty,seed});
  const copy=api.fromSpec({...puzzle});
  const answer=api.answerFor(puzzle);
  assert.equal(puzzle.generated,true);
  assert.equal(puzzle.trialOnly,true);
  assert.equal(puzzle.seed,seed);
  assert.equal(answer.length,size*size);
  assert.deepEqual(copy.rows,puzzle.rows);
  assert.deepEqual(copy.cols,puzzle.cols);
  assert(puzzle.rows.every(line=>line.length>0&&line[0]>0),'Empty row');
  assert(puzzle.cols.every(line=>line.length>0&&line[0]>0),'Empty column');
  const rows=Array.from({length:size},(_,r)=>answer.slice(r*size,(r+1)*size).split(''));
  const cols=Array.from({length:size},(_,c)=>Array.from({length:size},(_,r)=>answer[r*size+c]));
  assert.deepEqual(rows.map(hints),puzzle.rows,'Row clues disagree with answer');
  assert.deepEqual(cols.map(hints),puzzle.cols,'Col clues disagree with answer');
  assert.equal(api.restore().some(p=>p.id===puzzle.id),true);
  created++;
 }
}
assert.equal(api.restore().length,created);
const before=api.fromSpec({size:20,difficulty:'보통',seed:1337});
const after=api.fromSpec({size:20,difficulty:'보통',seed:1338});
assert.notDeepEqual(before.rows,after.rows,'Seed should vary generated patterns');
assert.throws(()=>api.generate({size:101,difficulty:'쉬움'}),/지원하지 않는/);
assert.throws(()=>api.generate({size:10,difficulty:'미평가'}),/지원하지 않는/);
assert.throws(()=>api.fromSpec({size:10,difficulty:'보통',seed:-1}),/지원하지 않는/);
console.log('PASS '+created+' constructively generated puzzle combinations, reproducible clues, local restoration');
