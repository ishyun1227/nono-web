/* Offline migration contract: zero secrets, zero network, no user data edits.
 * Live Firebase rule enforcement is tested separately by test:multiplayer.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const codec=require('../answer-bitpack.js');
const {planMissingPackedAnswers}=require('../tools/packed-seed-plan.cjs');
const {answers,puzzles}=require('./puzzles.cjs');
const {curatedVoxAnswers}=require('../tools/curated-vox-answers.cjs');
const {curatedPlaytestAnswers}=require('../tools/curated-playtest-answers.cjs');
const specs=[...puzzles.filter(p=>p.size<=10).map(p=>({
 id:p.id,width:p.size,height:p.size,mask:answers[p.id],rows:p.rows,cols:p.cols
})),...curatedVoxAnswers(),...curatedPlaytestAnswers()];
assert.equal(specs.length,8,'Eight independently validated original answers');
const desired=Object.fromEntries(specs.map(p=>[p.id,codec.validateAnswer(p.mask,p.width,p.height,p.rows,p.cols)]));
assert.equal(Object.keys(desired).length,8,'All IDs must be distinct');
const original='101010101',unrelated='untouched-private-value';
const full={privateAnswers:{unrelated:original},privateAnswersPacked:{custom_unrelated:unrelated}};
let pending=planMissingPackedAnswers(full.privateAnswersPacked,desired);
assert.equal(pending.length,8);
for(const [id,packed] of pending)full.privateAnswersPacked[id]=packed;
assert.equal(full.privateAnswers.unrelated,original,'Legacy answer must not be deleted');
assert.equal(full.privateAnswersPacked.custom_unrelated,unrelated,'Old packed answer must remain');
assert.deepEqual(planMissingPackedAnswers(full.privateAnswersPacked,desired),[],'Second migration must be idempotent');
full.privateAnswersPacked.vox_crabino_front='tampered-value';
assert.throws(()=>planMissingPackedAnswers(full.privateAnswersPacked,desired),/Existing private packed answer differs/);
assert.equal(full.privateAnswersPacked.vox_crabino_front,'tampered-value','Conflicting answer overwritten');
assert.equal(full.privateAnswersPacked.custom_unrelated,unrelated,'Unrelated child modified');
assert.throws(()=>planMissingPackedAnswers(['bad'],desired),/format/);
assert.throws(()=>planMissingPackedAnswers(null,{bad:'!'}),/Invalid private packed answer/);
const seedSource=fs.readFileSync(path.join(__dirname,'../tools/seed-packed-answers.cjs'),'utf8');
assert(seedSource.includes("database:set','/privateAnswersPacked/'+id"),'Migration must set individual child paths');
assert(!/database:update.*privateAnswersPacked/.test(seedSource.replace(/\/\*[\s\S]*?\*\//g,'')),'Whole private branch replacement is forbidden');
console.log('PASS 8 packed masks, conflict refusal, migration idempotence, unrelated and legacy preservation');
