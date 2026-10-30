/* A future creator adds a puzzle ONCE, not once for GitHub and again for Firebase.
 * Verify the registration script produces public clues + a sealed answer and
 * marks the newly added puzzle as quality-review pending.
 */
'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {register}=require('../tools/register-puzzle.cjs');
const {unseal}=require('../tools/sealed-puzzle-codec.cjs');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'nono-puzzle-import-'));
const work=path.join(temp,'public-repo'),secure=path.join(temp,'private-source');
fs.mkdirSync(path.join(work,'puzzles'),{recursive:true});
fs.mkdirSync(secure);
fs.copyFileSync(path.join(__dirname,'../puzzles/catalog.json'),path.join(work,'puzzles/catalog.json'));
const id='trial_secure_auto_example',mask='1'.repeat(25),rows=Array.from({length:5},()=>[5]),cols=rows.map(x=>x.slice());
const source=path.join(secure,'new.json');
fs.writeFileSync(source,JSON.stringify({id,name:'자동 등록 검증',width:5,height:5,rows,cols,mask,difficulty:'쉬움',reviewStatus:'approved'}));
const keys=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
const keyId='a'.repeat(40);
const account={type:'service_account',private_key_id:keyId,private_key:keys.privateKey.export({format:'pem',type:'pkcs8'})};
(async()=>{
 try{
  const result=await register({'--input':source},{root:work,keys:[{keyId,publicKey:keys.publicKey}]});
  const catalog=JSON.parse(fs.readFileSync(path.join(work,'puzzles/catalog.json'),'utf8'));
  assert.equal(catalog.puzzles.length,13);
  const entry=catalog.puzzles.find(p=>p.id===id);
  assert.equal(entry.review.status,'pending');
  assert.equal(entry.answer.deployment,'pending-auto-seed');
  assert(Object.values(entry.review.checks).every(status=>status==='pending'));
  const published=fs.readFileSync(result.publicPath,'utf8');
  const encrypted=fs.readFileSync(result.privatePath,'utf8');
  assert(!published.includes(mask),'Public puzzle source exposed the answer mask');
  assert(!encrypted.includes(mask),'GitHub encrypted bundle exposed the plaintext answer');
  const plain=unseal(JSON.parse(encrypted),account);
  assert.equal(plain.packed,require('../answer-bitpack.js').pack(mask,5,5));
  assert(!fs.existsSync(path.join(work,'puzzles/trial','new.json')));
  await assert.rejects(
   register({'--input':source},{root:work,keys:[{keyId,publicKey:keys.publicKey}]}),
   /Duplicate/,'Duplicate registration was allowed');
  console.log('PASS one-step future puzzle registration, protected answer, public clue data, pending QC, duplicate guard');
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
