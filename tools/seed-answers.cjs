const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
const {answers}=require('../tests/puzzles.cjs');
const project=process.argv[2];
if(!project||!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(project))throw Error('Usage: node tools/seed-answers.cjs PROJECT_ID');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nono-answers-')),file=path.join(dir,'answers.json');
try{
 fs.writeFileSync(file,JSON.stringify(answers));
 const cli=path.join(__dirname,'../node_modules/firebase-tools/lib/bin/firebase.js');
 cp.execFileSync(process.execPath,[cli,'database:update','/privateAnswers',file,'--project',project,'--force'],{stdio:'inherit'});
}finally{fs.rmSync(file,{force:true});fs.rmdirSync(dir);}
