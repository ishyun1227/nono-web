/* Standalone regression suite for local, image-independent random puzzles. */
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
let created=0;
for(const size of [5,10,15,20,25,30,50,75,100]){
  for(const difficulty of api.LEVELS){
    let puzzle=null;
    for(let attempt=0;attempt<5&&!puzzle;attempt++){
      try{puzzle=api.generate({size,difficulty,seed:size*1000+api.LEVELS.indexOf(difficulty)*10+attempt+1});}
      catch(e){if(!/품질 기준/.test(e.message))throw e;}
    }
    assert(puzzle, 'Could not generate accepted random puzzle: '+size+' '+difficulty);
    created++;
    assert.equal(puzzle.generated,true);
    assert.equal(puzzle.trialOnly,true);
    assert.equal(puzzle.rows.length,size);
    assert.equal(puzzle.cols.length,size);
    assert(puzzle.quality>=80);
    assert(puzzle.rows.every(line=>line[0]>0));
    assert(puzzle.cols.every(line=>line[0]>0));
    assert.equal(puzzle.rows.flat().reduce((a,b)=>a+b,0),
      puzzle.cols.flat().reduce((a,b)=>a+b,0));
    assert.equal(api.restore().some(p=>p.id===puzzle.id),true);
  }
}
assert.equal(api.restore().length,created);
assert.throws(()=>api.generate({size:101,difficulty:'쉬움'}),/지원하지 않는/);
assert.throws(()=>api.generate({size:10,difficulty:'미평가'}),/지원하지 않는/);
console.log('PASS '+created+' random puzzles: sizes, levels, structural quality, clue totals, local restore');
