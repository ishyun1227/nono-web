/* Pure assignment tests: completed filter, private bank, local cache, SAT-only
 * instant generation when appropriate, and never accept unverified bank data.
 */
'use strict';
const assert=require('node:assert/strict');
const bank=require('../random-puzzle-allocation.js');
const mk=(id,size=10,difficulty='보통',verified=true)=>({
  id,size,difficulty,verified,designVersion:6,version:6,seed:100
});
let stored=[],generated=0,queries=[],completion={},cloud={},pending=[],signals=[];
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
globalThis.NONO_RANDOM_IN_PROGRESS={all:async()=>pending.slice()};
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
      return {val:()=>cloud[key]||null,exists:()=>Boolean(cloud[key])};
    },
    set:async(key,value)=>{signals.push({key,value});cloud[key]=value;},
    serverTimestamp:()=>Date.now()
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
  // A coop room can still be unfinished even if no completion was recorded.
  // Its puzzle must not be selected from the bank.
  completion={'random-bank-1':111};
  pending=['random-bank-2'];
  r=await bank.choose({group:0,difficulty:'보통'});
  assert.equal(r.source,'local');
  assert.equal(r.puzzle.id,'random-cache-1');
  assert.equal(globalThis.NONO_COMPLETED_PUZZLES.has('random-bank-2'),false,
    'Pending puzzle must not be recorded as completed');
  // Race/solo resumed puzzles also block local reuse; only exhaustion generates.
  completion['random-bank-2']=112;
  pending=['random-cache-1'];
  r=await bank.choose({group:0,difficulty:'보통'});
  assert.equal(r.source,'generated');
  assert.equal(generated,1);
  assert.equal(globalThis.NONO_COMPLETED_PUZZLES.has('random-cache-1'),false);
  pending=[];
  completion['random-cache-1']=113;
  r=await bank.choose({group:0,difficulty:'보통'});
  assert.equal(r.source,'generated');
  assert(r.puzzle.id.startsWith('random-generated-'));
  assert.equal(generated,2);
  // A server outage must not cause approval of unverified local puzzles.
  globalThis.NONO_AUTH_READY_DETAIL.databaseSdk.get=async()=>{throw Error('offline');};
  r=await bank.choose({group:0,difficulty:'보통',localPuzzles:[mk('random-unapproved',10,'보통',false)]});
  assert.equal(r.source,'generated');
  assert.equal(generated,3);
  // A generated puzzle must be marked independently certified by the generator.
  globalThis.NONO_RANDOM_PUZZLES.generateAsync=async()=>mk('random-unsafe',10,'보통',false);
  await assert.rejects(bank.choose({group:0,difficulty:'보통',
    localPuzzles:[mk('random-unapproved',10,'보통',false)]}),/유일해/);
  await assert.rejects(bank.choose({group:9,difficulty:'보통'}),/조건/);
  // A player who has completed 90 out of 100 available in the same bucket
  // requests +100 on the server. Clients cannot write the actual bank.
  const samples=Array.from({length:100},(_,i)=>mk('random-low-'+i));
  const done90=Object.fromEntries(samples.slice(0,90).map((v,i)=>[v.id,i+1]));
  globalThis.NONO_AUTH_READY_DETAIL.auth.currentUser={uid:'refilltest',isAnonymous:false};
  globalThis.NONO_AUTH_READY_DETAIL.databaseSdk.get=async key=>({
    val:()=>cloud[key]||null,exists:()=>Boolean(cloud[key])
  });
  await new Promise(resolve=>setImmediate(resolve));
  await bank.requestRestockIfLow(samples,[10],'보통',done90);
  const ownSignals=()=>signals.filter(item=>item.key==='randomRestockRequests/refilltest/10_보통');
  assert.equal(ownSignals().length,1,'10 left -> exactly one refill request');
  await bank.requestRestockIfLow(samples,[10],'보통',done90);
  assert.equal(ownSignals().length,1,'Repeated clicks do not queue duplicate requests');
  const beforeOther=signals.length;
  globalThis.NONO_AUTH_READY_DETAIL.auth.currentUser={uid:'another',isAnonymous:false};
  await bank.requestRestockIfLow(samples,[10],'보통',Object.fromEntries(samples.slice(0,89).map(v=>[v.id,1])));
  assert.equal(signals.length,beforeOther,'11 remaining -> no refill');
  globalThis.NONO_AUTH_READY_DETAIL.auth.currentUser={uid:'anonymous-test',isAnonymous:true};
  await bank.requestRestockIfLow(samples,[10],'보통',done90);
  assert.equal(signals.length,beforeOther,'Anonymous players cannot write verified account restock requests');
  console.log('PASS completed and in-progress separation, bank/local exclusion, 10-left signal, no duplicate requests, instant-only exhaustion, invalid proof rejection, outage handling');
})().catch(error=>{console.error(error);process.exitCode=1;});
