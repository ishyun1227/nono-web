/* Pure assignment tests: completed filter, private bank, local cache, SAT-only
 * instant generation when appropriate, and never accept unverified bank data.
 */
'use strict';
const assert=require('node:assert/strict');
const bank=require('../random-puzzle-allocation.js');
const mk=(id,size=10,difficulty='보통',verified=true)=>({
  id,size,difficulty,verified,designVersion:6,version:6,seed:100
});
let stored=[],generated=0,queries=[],completion={},cloud={};
globalThis.NONO_RANDOM_PUZZLES={
  validSpec:spec=>Number.isInteger(spec.size)&&Number.isInteger(spec.seed)&&
    ['쉬움','보통','어려움','전문가'].includes(spec.difficulty),
  fromSpec:spec=>mk(spec.id,spec.size,spec.difficulty),
  restore:()=>stored,
  generateAsync:async({size,difficulty})=>{
    generated++;
    return mk('random-generated-'+generated,size,difficulty);
  }
};
globalThis.NONO_COMPLETED_PUZZLES={
  ready:async()=>true,
  all:()=>({...completion}),
  has:id=>Object.prototype.hasOwnProperty.call(completion,id)
};
globalThis.NONO_AUTH_READY_DETAIL={
  auth:{currentUser:{uid:'alice'}},database:{},
  databaseSdk:{
    ref:(db,p)=>p,
    get:async key=>{
      queries.push(key);
      return {val:()=>cloud[key]||null};
    }
  }
};
(async()=>{
  assert.equal(bank.pickUnseen([mk('random-1')],{'random-1':true}),null);
  assert.equal(bank.pickUnseen([mk('random-1'),mk('random-2')],
    {'random-1':true},()=>0).id,'random-2');
  assert.equal(bank.pickUnseen([mk('random-1'),mk('random-2')],{},()=>0.99).id,'random-2');
  assert.equal(bank.verifiedLocal(mk('random-a'),[10],'보통',globalThis.NONO_RANDOM_PUZZLES),true);
  assert.equal(bank.verifiedLocal(mk('random-a',10,'보통',false),[10],'보통',globalThis.NONO_RANDOM_PUZZLES),false);
  assert.equal(bank.verifiedBank({...mk('random-a'),version:5},10,'보통',globalThis.NONO_RANDOM_PUZZLES),false);
  assert.equal(bank.verifiedBank({...mk('random-a'),verified:false},10,'보통',globalThis.NONO_RANDOM_PUZZLES),false);
  cloud['randomPuzzleBank/10_보통']={
    a:{...mk('random-bank-1'),version:6},
    b:{...mk('random-bank-2'),version:6}
  };
  completion={'random-bank-1':111};
  let r=await bank.choose({group:0,difficulty:'보통'});
  assert.equal(r.puzzle.id,'random-bank-2');
  assert.equal(r.source,'bank');
  assert.equal(generated,0,'Verified bank puzzle should avoid generation');
  assert(queries.includes('randomPuzzleBank/5_보통'));
  assert(queries.includes('randomPuzzleBank/10_보통'));
  // Shared bank contains only completed puzzles for the current player.
  completion['random-bank-2']=112;
  stored=[mk('random-cache-1'),mk('random-cache-2',10,'보통',false)];
  r=await bank.choose({group:0,difficulty:'보통'});
  assert.equal(r.source,'local');
  assert.equal(r.puzzle.id,'random-cache-1');
  assert.equal(generated,0);
  completion['random-cache-1']=113;
  r=await bank.choose({group:0,difficulty:'보통'});
  assert.equal(r.source,'generated');
  assert(r.puzzle.id.startsWith('random-generated-'));
  assert.equal(generated,1);
  // A server outage must not cause approval of unverified local puzzles.
  globalThis.NONO_AUTH_READY_DETAIL.databaseSdk.get=async()=>{throw Error('offline');};
  r=await bank.choose({group:0,difficulty:'보통',localPuzzles:[mk('random-unapproved',10,'보통',false)]});
  assert.equal(r.source,'generated');
  assert.equal(generated,2);
  // A generated puzzle must be marked independently certified by the generator.
  globalThis.NONO_RANDOM_PUZZLES.generateAsync=async()=>mk('random-unsafe',10,'보통',false);
  await assert.rejects(bank.choose({group:0,difficulty:'보통',
    localPuzzles:[mk('random-unapproved',10,'보통',false)]}),/유일해/);
  await assert.rejects(bank.choose({group:9,difficulty:'보통'}),/조건/);
  console.log('PASS user-unseen bank-first assignment, local certified fallback, instant-only exhaustion, invalid proof rejection, outage handling');
})().catch(error=>{console.error(error);process.exitCode=1;});
