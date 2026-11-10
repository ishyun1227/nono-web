/* Firebase emulator security tests for owner-only private completion index.
 * These IDs are personal discovery preferences, never reward proof.
 */
'use strict';
const {initializeTestEnvironment,assertFails,assertSucceeds}=require('@firebase/rules-unit-testing');
const {ref,set,get,update,serverTimestamp,remove}=require('firebase/database');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
  const env=await initializeTestEnvironment({
    projectId:'demo-nono',database:{host:'127.0.0.1',port:9000,
      rules:fs.readFileSync('database.rules.json','utf8')}
  });
  try{
    await env.clearDatabase();
    const signed=uid=>env.authenticatedContext(uid,{firebase:{sign_in_provider:'google.com'}}).database();
    const alice=signed('alice'),bob=signed('bob');
    const guest=env.authenticatedContext('anon',{firebase:{sign_in_provider:'anonymous'}}).database();
    const unauth=env.unauthenticatedContext().database();
    const item=ref(alice,'userCompleted/alice/random-10-abc');
    await assertSucceeds(set(item,serverTimestamp()));
    const stamp=(await assertSucceeds(get(item))).val();
    assert(Number.isFinite(stamp)&&stamp>0);
    await assertSucceeds(update(ref(alice,'userCompleted/alice'),{
      'random-11-def':serverTimestamp(),
      'random-12-ghi':serverTimestamp()
    }));
    const snapshot=(await assertSucceeds(get(ref(alice,'userCompleted/alice')))).val();
    assert.equal(Object.keys(snapshot).length,3);
    await assertFails(get(ref(bob,'userCompleted/alice')));
    await assertFails(get(ref(alice,'userCompleted/bob')));
    await assertFails(get(ref(alice,'userCompleted')));
    await assertFails(get(ref(unauth,'userCompleted/alice')));
    await assertFails(set(ref(bob,'userCompleted/alice/random-hijack'),serverTimestamp()));
    await assertFails(set(ref(alice,'userCompleted/bob/random-hijack'),serverTimestamp()));
    await assertFails(set(ref(guest,'userCompleted/anon/random-a'),serverTimestamp()));
    await assertFails(set(ref(unauth,'userCompleted/alice/random-hijack'),serverTimestamp()));
    await assertFails(set(item,serverTimestamp()));
    await assertFails(set(ref(alice,'userCompleted/alice/random-invalid'),42));
    await assertFails(set(ref(alice,'userCompleted/alice/bad.id'),serverTimestamp()));
    await assertFails(remove(item));
    await assertFails(update(ref(alice,'userCompleted/alice'),{'random-12-ghi':serverTimestamp()}));
    await assertSucceeds(set(ref(bob,'userCompleted/bob/random-10-abc'),serverTimestamp()));
    console.log('PASS owner-only immutable per-player puzzle completion IDs, multiple-player isolation, batch adds, no guest or forged writes');
  }finally{await env.cleanup();}
})().catch(error=>{console.error(error);process.exitCode=1;});
