/* Encrypted upload regression: no raw answer in public bundles, any wrong
 * key or altered ciphertext must fail before reaching Firebase.
 */
'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const bits=require('../answer-bitpack.js');
const {seal,unseal,validateEnvelope}=require('../tools/sealed-puzzle-codec.cjs');
const {answers,puzzles}=require('./puzzles.cjs');
const p=puzzles.find(p=>p.id==='heart5');
const mask=answers.heart5;
const keyA=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
const keyB=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
const a='a'.repeat(40),b='b'.repeat(40),c='c'.repeat(40);
const sealed=seal({id:'heart5',width:5,height:5,mask,rows:p.rows,cols:p.cols},[
 {keyId:a,publicKey:keyA.publicKey},{keyId:b,publicKey:keyB.publicKey}]);
const serialized=JSON.stringify(sealed);
assert(!serialized.includes(mask),'Plaintext answer leaked');
assert(!serialized.includes('"packed"'),'Packed answer key leaked');
assert(!serialized.includes('"rows"'),'Hints or puzzle metadata leaked into protected data');
assert.deepEqual(validateEnvelope(JSON.parse(serialized)),sealed);
for(const [keyId,privateKey] of [[a,keyA.privateKey],[b,keyB.privateKey]]){
 const account={type:'service_account',private_key_id:keyId,
  private_key:privateKey.export({type:'pkcs8',format:'pem'})};
 const original=unseal(JSON.parse(serialized),account);
 assert.equal(original.id,'heart5');
 assert.equal(bits.unpack(original.packed,5,5),mask);
 const tampered=JSON.parse(serialized);
 tampered.ciphertext=Buffer.from('forged-data-1234').toString('base64');
 assert.throws(()=>unseal(tampered,account),'Tampered ciphertext accepted');
 const changed=JSON.parse(serialized);
 changed.width=6;
 assert.throws(()=>unseal(changed,account),'Changed dimensions accepted');
}
assert.throws(()=>unseal(sealed,{type:'service_account',private_key_id:c,
 private_key:keyA.privateKey.export({type:'pkcs8',format:'pem'})}),/does not match/);
assert.throws(()=>seal({id:'heart5',width:5,height:5,mask:'0'.repeat(25),rows:p.rows,cols:p.cols},
 [{keyId:a,publicKey:keyA.publicKey}]),/Clues/);
assert.throws(()=>validateEnvelope({...sealed,mask}),/Unexpected/);
console.log('PASS RSA-OAEP/AES-GCM sealed answers, multiple keys, tamper/dimension guards, no plaintext');
