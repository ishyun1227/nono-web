/* Shape-independent random fill positions using only static black/white balance.
 * No gameplay solver, picture, or scoring is used in v4. */
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
let variants=0,created=0;
for(const size of [5,10,15,20,25,30,50,75,100]){
 for(const difficulty of api.LEVELS){
  const base=(size*9991+api.LEVELS.indexOf(difficulty)*181)>>>0;
  for(const seed of [base,base+1,base+2]){
   const p=api.fromSpec({size,difficulty,seed,version:4}),answer=api.answerFor(p);
   const b=answer.split('1').length-1,w=answer.length-b,balanced=4*b*w/(answer.length**2);
   assert.equal(p.designVersion,4);
   assert.equal(p.paperFunScore,null);
   assert.equal(p.paperDifficultyScore,null);
   assert.equal(p.paperScoreMethod,null);
   assert.equal(p.paperSolverStatus,'not_evaluated');
   assert(balanced>=.994,'Black/white balance must be near equal, without filtering samples');
   assert.equal(answer.length,size*size);
   assert(p.rows.every(line=>line[0]>0),'Empty row');
   assert(p.cols.every(line=>line[0]>0),'Empty column');
   const rows=Array.from({length:size},(_,r)=>answer.slice(r*size,(r+1)*size).split(''));
   const cols=Array.from({length:size},(_,c)=>Array.from({length:size},(_,r)=>answer[r*size+c]));
   assert.deepEqual(rows.map(hints),p.rows);
   assert.deepEqual(cols.map(hints),p.cols);
   const copy=api.fromSpec({...p});assert.deepEqual(copy.rows,p.rows);assert.deepEqual(copy.cols,p.cols);
   variants++;
  }
  const persisted=api.generate({size,difficulty,seed:base});
  assert.equal(persisted.designVersion,4);
  assert(api.restore().some(p=>p.id===persisted.id));
  created++;
 }
}
assert.equal(api.restore().length,created);
// v1-v3 room seeds must reconstruct identically without upgrading any saved puzzle.
for(const version of [1,2,3]){
 const p=api.fromSpec({size:10,difficulty:'보통',seed:12345,version});
 assert.equal(p.designVersion,version);
 assert.deepEqual(api.fromSpec({...p}).rows,p.rows);
 assert.equal(api.answerFor(p),api.answerFor({...p,version}));
}
const randomA=api.fromSpec({size:20,difficulty:'보통',seed:12345,version:4});
const randomB=api.fromSpec({size:20,difficulty:'보통',seed:12346,version:4});
assert.notDeepEqual(randomA.rows,randomB.rows,'Distinct seeds should produce distinct random puzzles');
const legacyV3=api.fromSpec({size:20,difficulty:'보통',seed:12345,version:3});
assert.notDeepEqual(randomA.rows,legacyV3.rows,'V4 should not generate old curves or motifs');
assert.throws(()=>api.generate({size:101,difficulty:'쉬움'}),/지원하지 않는/);
assert.throws(()=>api.generate({size:10,difficulty:'미평가'}),/지원하지 않는/);
assert.throws(()=>api.fromSpec({size:10,difficulty:'보통',seed:-1}),/지원하지 않는/);
console.log('PASS '+variants+' shape-independent randomized designs, '+created+' restored games, v1-v3 multiplayer compatibility (no v4 solver evaluation)');
