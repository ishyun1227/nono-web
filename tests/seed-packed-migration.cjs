/* Production guardrail: new private masks must never replace old answers
 * or custom entries. All operations stay on the local Firebase emulator.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process'),path=require('node:path');
const {initializeTestEnvironment}=require('@firebase/rules-unit-testing');
const {ref,set,get}=require('firebase/database');
const bits=require('../answer-bitpack.js');
const {curatedVoxAnswers}=require('../tools/curated-vox-answers.cjs');
const {curatedPlaytestAnswers}=require('../tools/curated-playtest-answers.cjs');
const cwd=path.join(__dirname,'..');
const script=path.join(cwd,'tools/seed-packed-answers.cjs');
async function main(){
 const env=await initializeTestEnvironment({projectId:'demo-nono',
  database:{host:'127.0.0.1',port:9000,rules:fs.readFileSync(path.join(cwd,'database.rules.json'),'utf8')}});
 try{
  await env.clearDatabase();
  const legacy='101010101',custom='do-not-overwrite-custom-answer';
  await env.withSecurityRulesDisabled(async c=>{
   await set(ref(c.database(),'privateAnswers'),{unrelated:legacy});
   await set(ref(c.database(),'privateAnswersPacked'),{custom_unrelated:custom});
  });
  const children=[...curatedVoxAnswers(),...curatedPlaytestAnswers()];
  const expected=['heart5','cat10','rocket10',...children.map(p=>p.id)].sort();
  assert.equal(expected.length,8,'Eight independently verified seed targets');
  const command=()=>cp.execFileSync(process.execPath,[script,'--apply','--project','demo-nono'],{
   cwd,encoding:'utf8',timeout:120000,
   env:{...process.env,FIREBASE_DATABASE_EMULATOR_HOST:'127.0.0.1:9000'}
  });
  command();
  const read=async()=>{
   let data;
   await env.withSecurityRulesDisabled(async c=>{data=(await get(ref(c.database()))).val();});
   return data;
  };
  let snapshot=await read();
  assert.equal(snapshot.privateAnswers.unrelated,legacy,'Original 0/1 answer was modified');
  assert.equal(snapshot.privateAnswersPacked.custom_unrelated,custom,'Pre-existing packed answer was lost');
  assert.deepEqual(Object.keys(snapshot.privateAnswersPacked).filter(x=>x!=='custom_unrelated').sort(),expected);
  for(const p of children)assert.equal(snapshot.privateAnswersPacked[p.id],bits.pack(p.mask,p.width,p.height));
  command();
  const after=await read();
  assert.deepEqual(after,snapshot,'Running migration twice must be idempotent');
  await env.withSecurityRulesDisabled(async c=>set(ref(c.database(),'privateAnswersPacked/vox_crabino_front'),'tampered-entry'));
  assert.throws(command,/Existing private packed answer differs|Command failed/,'Mismatch must stop migration');
  snapshot=await read();
  assert.equal(snapshot.privateAnswersPacked.vox_crabino_front,'tampered-entry','Existing entry was overwritten');
  assert.equal(snapshot.privateAnswersPacked.custom_unrelated,custom,'Unrelated entry was damaged');
  console.log('PASS 8 private packed seeds, no legacy deletion, unrelated key preserved, idempotent migration, overwrite refusal');
 }finally{await env.cleanup();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
