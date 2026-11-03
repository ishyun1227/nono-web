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
const uniqueness=require('../random-puzzle-solver.js');
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
// v1-v4 room seeds must reconstruct identically without upgrading saved puzzles.
for(const version of [1,2,3,4]){
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

// New puzzles are published only after an exact solver certifies ONE solution.
// The source v4 distribution is still unconstrained random dots, and v5
// repeatedly samples from it until a mathematical uniqueness proof succeeds.
assert.equal(uniqueness.countSolutions({
 size:5,rows:Array.from({length:5},()=>[1]),cols:Array.from({length:5},()=>[1])
},{maxChecks:10000,maxNodes:2000}).status,'multiple');
assert.equal(uniqueness.countSolutions({
 size:5,rows:Array.from({length:5},()=>[5]),cols:Array.from({length:5},()=>[5])
},{maxChecks:10000,maxNodes:2000}).status,'unique');
let certified=0;
for(const size of [5,10,15,20,25]){
 const seed=size*11113+3*37;
 const p=api.fromSpec({size,difficulty:'보통',seed,version:5});
 const answer=api.answerFor(p);
 assert.equal(p.designVersion,5);
 assert.equal(p.paperFunScore,null);
 assert.equal(p.paperSolverStatus,'not_evaluated');
 const proof=uniqueness.countSolutions(p,{reference:answer,maxChecks:150000,maxNodes:5000});
 assert.equal(proof.status,'unique','An independently checked v5 puzzle must have exactly one answer');
 assert.deepEqual(api.fromSpec({...p}).rows,p.rows,'Seeded room rebuild must be deterministic');
 const rows=Array.from({length:size},(_,r)=>answer.slice(r*size,(r+1)*size).split(''));
 const cols=Array.from({length:size},(_,c)=>Array.from({length:size},(_,r)=>answer[r*size+c]));
 assert.deepEqual(rows.map(hints),p.rows);
 assert.deepEqual(cols.map(hints),p.cols);
 certified++;
}
// Even when the solver cannot prove uniqueness, the generator must NEVER
// claim a puzzle is unique or register an unverified candidate.
const original=uniqueness.countSolutions;
try{
 uniqueness.countSolutions=()=>({status:'unknown',count:0});
 assert.throws(()=>api.fromSpec({size:10,difficulty:'쉬움',seed:0x7fffff01,version:5}),/정답이 하나임을 확인하지 못했습니다/);
 assert.throws(()=>api.generate({size:10,difficulty:'쉬움',seed:0x7fffff01}),/정답이 하나임을 확인하지 못했습니다/);
}finally{uniqueness.countSolutions=original;}
assert.equal(api.restore().length,created,'Unverified puzzle must not be stored');

assert.throws(()=>api.generate({size:101,difficulty:'쉬움'}),/지원하지 않는/);
assert.throws(()=>api.generate({size:10,difficulty:'미평가'}),/지원하지 않는/);
assert.throws(()=>api.fromSpec({size:10,difficulty:'보통',seed:-1}),/지원하지 않는/);
console.log('PASS '+variants+' legacy v4 random designs, '+certified+' certified unique v5 puzzles, '+created+' restored games, rejection of unproved puzzles and v1-v4 compatibility');
