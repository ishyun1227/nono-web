/* Authenticated bank-bucket readers only; writes require trusted backend.
 * Firebase Realtime Database emulator tests.
 */
'use strict';
const {initializeTestEnvironment,assertFails,assertSucceeds}=require('@firebase/rules-unit-testing');
const {ref,set,get,remove}=require('firebase/database');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
  const env=await initializeTestEnvironment({
    projectId:'demo-nono',database:{
      host:'127.0.0.1',port:9000,
      rules:fs.readFileSync('database.rules.json','utf8')
    }
  });
  try{
    await env.clearDatabase();
    await env.withSecurityRulesDisabled(async ctx=>{
      const db=ctx.database();
      await set(ref(db,'randomPuzzleBank/10_보통/random-bank-10-100'),
        {id:'random-bank-10-100',version:6,size:10,difficulty:'보통',seed:100,verified:true});
      await set(ref(db,'randomPuzzleBank/30_전문가/random-bank-30-100'),
        {id:'random-bank-30-100',version:6,size:30,difficulty:'전문가',seed:100,verified:true});
    });
    const alice=env.authenticatedContext('alice').database();
    const bob=env.authenticatedContext('bob').database();
    const anon=env.authenticatedContext('guest',{firebase:{sign_in_provider:'anonymous'}}).database();
    const stranger=env.unauthenticatedContext().database();
    const a=await assertSucceeds(get(ref(alice,'randomPuzzleBank/10_보통')));
    assert.equal(a.val()['random-bank-10-100'].verified,true);
    await assertSucceeds(get(ref(bob,'randomPuzzleBank/30_전문가')));
    await assertSucceeds(get(ref(anon,'randomPuzzleBank/10_보통')));
    await assertFails(get(ref(stranger,'randomPuzzleBank/10_보통')));
    await assertFails(get(ref(alice,'randomPuzzleBank')));
    await assertFails(get(ref(alice,'randomPuzzleBank/10_미평가')));
    await assertFails(get(ref(alice,'randomPuzzleBank/999_보통')));
    await assertFails(set(ref(alice,'randomPuzzleBank/10_보통/random-fake'),
      {id:'random-fake',verified:true,version:6,seed:20,size:10,difficulty:'보통'}));
    await assertFails(set(ref(bob,'randomPuzzleBank/10_보통/random-bank-10-100'),null));
    await assertFails(remove(ref(anon,'randomPuzzleBank/10_보통/random-bank-10-100')));
    // New auto-assigned rooms must carry an immutable fresh-only marker.
    // Existing manually chosen generated rooms must still permit replay.
    const randSpec={version:6,size:10,seed:100,difficulty:'보통'};
    const room=(id,fresh)=>({
      host:'alice',mode:'race',puzzleId:id,size:10,status:'lobby',
      createdAt:require('firebase/database').serverTimestamp(),startedAt:0,
      format:2,randomSpec:randSpec,...(fresh?{randomFresh:true}:{})
    });
    await assertSucceeds(set(ref(alice,'rooms/FRESH1/meta'),room('random-bank-10-100',true)));
    assert.equal((await get(ref(alice,'rooms/FRESH1/meta/randomFresh'))).val(),true);
    await assertSucceeds(set(ref(alice,'rooms/MANUAL/meta'),room('random-bank-10-100',false)));
    assert.equal((await get(ref(alice,'rooms/MANUAL/meta/randomFresh'))).val(),null);
    await assertFails(set(ref(alice,'rooms/FRESH2/meta'),{
      host:'alice',mode:'race',puzzleId:'heart5',size:5,status:'lobby',
      createdAt:require('firebase/database').serverTimestamp(),startedAt:0,
      randomFresh:true,format:2
    }));
    console.log('PASS fresh-only auto-assigned room flag and backward-compatible manual generated rooms');
    console.log('PASS shared random puzzle bank auth reads, bucket allowlist, forbidden client writes and deletes');
  }finally{await env.cleanup();}
})().catch(e=>{console.error(e);process.exitCode=1;});
