/* Write canonical packed answers ONLY to the private Firebase path.
 * Default is dry-run; --apply is explicit. This NEVER deletes old privateAnswers.
 * For an extra puzzle, pass --input /secure/path/puzzle-answer.json:
 * {"id":"unique-id","width":59,"height":63,"mask":"001...","rows":[...],"cols":[...]}
 * Do not commit raw private answer inputs to the public repo.
 */
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const codec=require('../answer-bitpack.js');
const {answers,puzzles}=require('../tests/puzzles.cjs');
const argv=process.argv.slice(2);
const option=key=>{const i=argv.indexOf(key);return i<0?null:argv[i+1];};
const apply=argv.includes('--apply'),project=option('--project'),input=option('--input');
if(argv.some(arg=>arg.startsWith('--')&&!['--apply','--project','--input'].includes(arg)))throw Error('Unrecognized option');
if(apply&&(!project||!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(project)))
  throw Error('Apply requires: --apply --project PROJECT_ID');
if(argv.includes('--input')&&!input)throw Error('Missing --input JSON file path');
const specs=puzzles.filter(p=>p.size<=10).map(p=>({
  id:p.id,width:p.size,height:p.size,mask:answers[p.id],rows:p.rows,cols:p.cols
}));
if(input){
  const extra=JSON.parse(fs.readFileSync(path.resolve(input),'utf8'));
  if(!extra||typeof extra!=='object'||typeof extra.id!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(extra.id))
    throw Error('Invalid private answer id');
  if(specs.some(p=>p.id===extra.id))throw Error('Duplicate puzzle id');
  specs.push(extra);
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
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nono-packed-')),file=path.join(dir,'privateAnswersPacked.json');
try{
  fs.writeFileSync(file,JSON.stringify(packedAnswers),{mode:0o600});
  const cli=path.join(__dirname,'../node_modules/firebase-tools/lib/bin/firebase.js');
  if(!fs.existsSync(cli))throw Error('Run npm ci before deploying private packed answers');
  cp.execFileSync(process.execPath,[cli,'database:update','/privateAnswersPacked',file,'--project',project,'--force'],{stdio:'inherit'});
  console.log('Published packed answers WITHOUT modifying legacy privateAnswers.');
}finally{
  fs.rmSync(dir,{recursive:true,force:true});
}
