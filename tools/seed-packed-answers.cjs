/* Write canonical packed answers ONLY to the private Firebase path.
 * Default is dry-run; --apply is explicit. This NEVER deletes old privateAnswers.
 * For an extra puzzle, pass --input /secure/path/puzzle-answer.json:
 * {"id":"unique-id","width":59,"height":63,"mask":"001...","rows":[...],"cols":[...]}
 * Do not commit raw private answer inputs to the public repo.
 */
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const codec=require('../answer-bitpack.js');
const {answers,puzzles}=require('../tests/puzzles.cjs');
const {curatedVoxAnswers}=require('./curated-vox-answers.cjs');
const {curatedPlaytestAnswers}=require('./curated-playtest-answers.cjs');
const {planMissingPackedAnswers}=require('./packed-seed-plan.cjs');
const {validateEnvelope,unseal}=require('./sealed-puzzle-codec.cjs');
const argv=process.argv.slice(2);
const option=key=>{const i=argv.indexOf(key);return i<0?null:argv[i+1];};
const apply=argv.includes('--apply'),project=option('--project'),input=option('--input');
if(argv.some(arg=>arg.startsWith('--')&&!['--apply','--project','--input'].includes(arg)))throw Error('Unrecognized option');
if(apply&&(!project||!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(project)))
  throw Error('Apply requires: --apply --project PROJECT_ID');
if(argv.includes('--input')&&!input)throw Error('Missing --input JSON file path');
const specs=[
 ...puzzles.filter(p=>p.size<=10).map(p=>({
  id:p.id,width:p.size,height:p.size,mask:answers[p.id],rows:p.rows,cols:p.cols
 })),
 ...curatedVoxAnswers(),
 ...curatedPlaytestAnswers()
];
// Read current server children BEFORE decrypting archived bundles. After an
// admin key is rotated, already-uploaded bundles can be safely skipped.
// Every missing bundle must still decrypt and match its public hints.
const cli=path.join(__dirname,'../node_modules/firebase-tools/lib/bin/firebase.js');
const base=['--project',project];
if(apply&&!fs.existsSync(cli))throw Error('Run npm ci before uploading protected answers');
const existing=apply
 ? JSON.parse(cp.execFileSync(process.execPath,[cli,'database:get','/privateAnswersPacked',...base],
   {encoding:'utf8',stdio:['ignore','pipe','pipe']}))
 : null;

// A private answer can be committed only as an encrypted, opaque bundle.
 // The public catalog contains dimensions and hints but never the solution.
const catalog=JSON.parse(fs.readFileSync(path.join(__dirname,'../puzzles/catalog.json'),'utf8'));
const publicIds=new Map(catalog.puzzles.map(p=>[p.id,p]));
const sealedDir=path.join(__dirname,'../puzzles/sealed');
const files=fs.existsSync(sealedDir)?fs.readdirSync(sealedDir).filter(n=>n.endsWith('.json')).sort():[];
let sealedSpecs=0;
for(const filename of files){
 const encrypted=validateEnvelope(JSON.parse(fs.readFileSync(path.join(sealedDir,filename),'utf8')));
 if(filename!==encrypted.id+'.json')throw Error('Sealed filename and puzzle ID mismatch');
 const publicPuzzle=publicIds.get(encrypted.id);
 if(!publicPuzzle||publicPuzzle.kind!=='fixed'||publicPuzzle.origin!=='trial'||
    publicPuzzle.answer?.deployment!=='pending-auto-seed'||
    publicPuzzle.width!==encrypted.width||publicPuzzle.height!==encrypted.height||
    !Array.isArray(publicPuzzle.rows)||!Array.isArray(publicPuzzle.cols))
  throw Error('Sealed answer missing matching public trial metadata: '+encrypted.id);
 if(specs.some(p=>p.id===encrypted.id))throw Error('Duplicate sealed answer id: '+encrypted.id);
 sealedSpecs++;
 if(apply){
  const credential=process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if(!credential||!fs.existsSync(credential))throw Error('Private service account credentials are not available for sealed answer decryption');
  const account=JSON.parse(fs.readFileSync(credential,'utf8'));
  if(!encrypted.keys.some(k=>k.keyId===account.private_key_id)&&
     existing&&Object.hasOwn(existing,encrypted.id)){
   console.log('Preserved already-uploaded encrypted answer after credential rotation:',encrypted.id);
   continue;
  }
  const privatePuzzle=unseal(encrypted,account);
  const mask=codec.unpack(privatePuzzle.packed,encrypted.width,encrypted.height);
  specs.push({id:encrypted.id,width:encrypted.width,height:encrypted.height,
   mask,rows:publicPuzzle.rows,cols:publicPuzzle.cols});
 }
}
if(!apply&&sealedSpecs)console.log('Validated '+sealedSpecs+' encrypted answer containers (content verified on authenticated deploy)');
if(input){
  const extra=JSON.parse(fs.readFileSync(path.resolve(input),'utf8'));
  if(!extra||typeof extra!=='object'||typeof extra.id!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(extra.id))
    throw Error('Invalid private answer id');
  if(specs.some(p=>p.id===extra.id))throw Error('Duplicate puzzle id');
  specs.push(extra);
}
// Do not silently claim that an unencrypted puzzle without a canonical
// source can be added to Firebase. Snowman remains an explicit private-source gap.
const pending=catalog.puzzles.filter(p=>p.kind==='fixed'&&p.answer?.deployment==='pending-auto-seed');
for(const p of pending){
 if(!files.includes(p.id+'.json'))throw Error('Missing encrypted answer for newly registered puzzle: '+p.id);
}
const packedAnswers={};
for(const p of specs){
  const packed=codec.validateAnswer(p.mask,p.width,p.height,p.rows,p.cols);
  const result=codec.unpack(packed,p.width,p.height);
  if(result!==p.mask)throw Error('LOSSLESS VERIFY FAILED: '+p.id);
  packedAnswers[p.id]=packed;
  const fingerprint=crypto.createHash('sha256').update(codec.FORMAT+':'+p.width+':'+p.height+':'+packed).digest('hex');
  console.log(p.id,p.width+'x'+p.height,'bytes='+Math.ceil(p.width*p.height/8),'sha256='+fingerprint.slice(0,16));
}
if(!apply){
  console.log('DRY RUN: Verified '+specs.length+' packed answers; no Firebase writes. To publish: --apply --project PROJECT_ID');
  process.exit(0);
}
// Read first and never silently destroy existing answers. Firebase's database:update
// at /privateAnswersPacked replaces the entire branch, so write only missing child IDs.
const missing=planMissingPackedAnswers(existing,packedAnswers);
console.log('Preflight:',Object.keys(existing||{}).length,'existing packed answers;',missing.length,'new answers to add');
if(missing.length===0){console.log('All expected packed answers are already seeded.');process.exit(0);}
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nono-packed-'));
try{
 for(const [id,packed] of missing){
  const file=path.join(dir,id+'.json');
  fs.writeFileSync(file,JSON.stringify(packed),{mode:0o600});
  // Never replace the privateAnswersPacked root, or remove any previous entry.
  cp.execFileSync(process.execPath,[cli,'database:set','/privateAnswersPacked/'+id,file,...base,'--force'],{stdio:'inherit'});
  fs.rmSync(file,{force:true});
  console.log('Added verified private packed answer:',id);
 }
 console.log('Published '+missing.length+' additional packed answers WITHOUT modifying prior answers, rooms, records or the legacy privateAnswers path.');
}finally{
 fs.rmSync(dir,{recursive:true,force:true});
}
