/* A public GitHub repository can hold only SEALED puzzle answers.
 * Plain masks must remain on the creator's machine, never in commits/logs.
 * RSA-OAEP-SHA256 wraps a one-time AES-256-GCM key; the exact GCP service
 * account private key already held in GitHub Actions unlocks the bundle.
 */
'use strict';
const crypto=require('node:crypto');
const codec=require('../answer-bitpack.js');
const FORMAT='rsa-oaep-sha256+a256gcm-v1';
// Old key was exposed in chat: never wrap newly created answers to it.
const REVOKE_KEY_ID='7018ae5277b705be7d69bae56b40256126ad3909';
const B64=/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
function validId(id){return typeof id==='string'&&/^[a-z][a-z0-9_-]{2,78}$/.test(id);}
function strictBuffer(value,label){
 if(typeof value!=='string'||!value||!B64.test(value))throw Error('Invalid '+label);
 const result=Buffer.from(value,'base64');
 if(result.toString('base64')!==value)throw Error('Invalid canonical '+label);
 return result;
}
function validateEnvelope(envelope){
 if(!envelope||typeof envelope!=='object'||Array.isArray(envelope)||
   envelope.version!==1||envelope.format!==FORMAT||!validId(envelope.id)||
   !Number.isSafeInteger(envelope.width)||!Number.isSafeInteger(envelope.height)||
   envelope.width<1||envelope.height<1||envelope.width*envelope.height>16384||
   !Array.isArray(envelope.keys)||!envelope.keys.length||envelope.keys.length>8)
  throw Error('Invalid sealed puzzle answer metadata');
 if(new Set(envelope.keys.map(key=>key.keyId)).size!==envelope.keys.length)
  throw Error('Duplicate wrapped key');
 for(const key of envelope.keys){
  if(typeof key.keyId!=='string'||!/^[a-f0-9]{40}$/.test(key.keyId)||
     strictBuffer(key.wrappedKey,'wrapped key').length<100)
   throw Error('Invalid wrapped key');
 }
 if(strictBuffer(envelope.iv,'IV').length!==12||
    strictBuffer(envelope.tag,'auth tag').length!==16||
    strictBuffer(envelope.ciphertext,'ciphertext').length<8)
   throw Error('Invalid AES-GCM envelope');
 const expected=['version','format','id','width','height','keys','iv','tag','ciphertext'].sort();
 if(JSON.stringify(Object.keys(envelope).sort())!==JSON.stringify(expected))
  throw Error('Unexpected private-answer metadata field');
 return envelope;
}
function aad(id,width,height){return Buffer.from('nono-sealed-answer-v1:'+id+':'+width+'x'+height,'utf8');}
function seal({id,width,height,mask,rows,cols},keys){
 if(!validId(id))throw Error('Invalid puzzle ID');
 const packed=codec.validateAnswer(mask,width,height,rows,cols);
 if(!Array.isArray(keys)||!keys.length||keys.length>8)throw Error('Missing public certificates');
 const pass=crypto.randomBytes(32),iv=crypto.randomBytes(12);
 const cipher=crypto.createCipheriv('aes-256-gcm',pass,iv);
 cipher.setAAD(aad(id,width,height));
 const plain=Buffer.from(JSON.stringify({id,width,height,packed}),'utf8');
 const body=Buffer.concat([cipher.update(plain),cipher.final()]);
 const safeKeys=keys.filter(x=>x.keyId!==REVOKE_KEY_ID);
 if(!safeKeys.length)throw Error('No safe administrator certificates; rotate exposed Firebase key first');
 const wrapped=safeKeys.map(({keyId,publicKey})=>{
  if(!/^[a-f0-9]{40}$/.test(keyId))throw Error('Invalid certificate key ID');
  return {keyId,wrappedKey:crypto.publicEncrypt({
   key:publicKey,padding:crypto.constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'
  },pass).toString('base64')};
 });
 pass.fill(0);plain.fill(0);
 return validateEnvelope({version:1,format:FORMAT,id,width,height,keys:wrapped,
  iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),ciphertext:body.toString('base64')});
}
function unseal(data,serviceAccount){
 const envelope=validateEnvelope(data);
 if(serviceAccount?.private_key_id===REVOKE_KEY_ID)
  throw Error('Refusing to decrypt with previously exposed Firebase private key');
 if(!serviceAccount||serviceAccount.type!=='service_account'||
    typeof serviceAccount.private_key!=='string'||!serviceAccount.private_key_id)
  throw Error('Service account with usable private key required');
 const wrapped=envelope.keys.find(x=>x.keyId===serviceAccount.private_key_id);
 if(!wrapped)throw Error('Encrypted puzzle key does not match the installed service account: '+envelope.id);
 const pass=crypto.privateDecrypt({key:serviceAccount.private_key,
  padding:crypto.constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},
  strictBuffer(wrapped.wrappedKey,'wrapped key'));
 try{
  const decipher=crypto.createDecipheriv('aes-256-gcm',pass,strictBuffer(envelope.iv,'IV'));
  decipher.setAAD(aad(envelope.id,envelope.width,envelope.height));
  decipher.setAuthTag(strictBuffer(envelope.tag,'tag'));
  const bytes=Buffer.concat([decipher.update(strictBuffer(envelope.ciphertext,'ciphertext')),decipher.final()]);
  const result=JSON.parse(bytes.toString('utf8'));bytes.fill(0);
  if(result.id!==envelope.id||result.width!==envelope.width||result.height!==envelope.height)
   throw Error('Sealed answer metadata mismatch');
  codec.unpack(result.packed,result.width,result.height);
  return result;
 }finally{pass.fill(0);}
}
async function getPublicKeys(email){
 if(typeof email!=='string'||!/^[^@\s]+@[^@\s]+\.gserviceaccount\.com$/.test(email))
  throw Error('Valid Firebase service-account email required');
 const url='https://www.googleapis.com/robot/v1/metadata/x509/'+encodeURIComponent(email);
 const response=await fetch(url,{signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('Failed to retrieve active Google public certificates: '+response.status);
 const certs=await response.json(),keys=[];
 for(const [keyId,pem] of Object.entries(certs)){
  if(!/^[a-f0-9]{40}$/.test(keyId)||keyId===REVOKE_KEY_ID)continue;
  const cert=new crypto.X509Certificate(pem);
  keys.push({keyId,publicKey:cert.publicKey});
 }
 if(!keys.length||keys.length>8)throw Error('No current service-account public certificates');
 return keys;
}
module.exports={FORMAT,seal,unseal,validateEnvelope,getPublicKeys};
