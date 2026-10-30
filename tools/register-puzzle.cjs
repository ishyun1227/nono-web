/* One-step nonogram registration.
 * Input must be a PRIVATE JSON outside this public repository.
 * Publishes only row/column clues and encrypted answer bytes. Firebase
 * GitHub Actions uploads the answer after a normal push to main.
 *
 * npm run puzzle:add -- --input /secure/new-puzzle.json
 */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {prepare}=require('./prepare-puzzle.cjs');
const {seal,getPublicKeys}=require('./sealed-puzzle-codec.cjs');
const root=path.resolve(__dirname,'..');
const CHECKS=['subjectRecognition','visualQuality','smallDetailsAndSpikes','outerZeroBorder',
 'logicalSolvability','uniqueSolution','difficultyCalibration','humanPlaytest'];
const DEFAULT_ACCOUNT='firebase-adminsdk-fbsvc@nono-web-ishyun-20261020.iam.gserviceaccount.com';
const exclude=target=>target===root||target.startsWith(root+path.sep);
function args(values){
 const result={};
 for(let i=0;i<values.length;i++){
  if(!['--input','--cert-json','--service-account-email'].includes(values[i]))
   throw Error('Unknown argument '+values[i]);
  if(!values[i+1]||values[i+1].startsWith('--'))throw Error('Missing argument value '+values[i]);
  result[values[i]]=values[++i];
 }
 if(!result['--input'])throw Error('Usage: node tools/register-puzzle.cjs --input /private/puzzle.json');
 return result;
}
async function register(flags,dependencies={}){
 const repositoryRoot=path.resolve(dependencies.root||root);
 const sourcePath=path.resolve(flags['--input']);
 if(exclude(sourcePath)||sourcePath===repositoryRoot||sourcePath.startsWith(repositoryRoot+path.sep))
  throw Error('Unencrypted puzzle input MUST remain outside the public repository');
 const original=JSON.parse(fs.readFileSync(sourcePath,'utf8'));
 // Even when a creator proposes "approved", a new puzzle MUST enter review.
 original.reviewStatus='trial';
 const result=prepare(original);
 const {id,width,height}=result.publicData;
 const catalogPath=path.join(repositoryRoot,'puzzles/catalog.json');
 const catalog=JSON.parse(fs.readFileSync(catalogPath,'utf8'));
 if(catalog.schemaVersion!==1||!Array.isArray(catalog.puzzles))throw Error('Unexpected puzzle catalog format');
 if(catalog.puzzles.some(p=>p.id===id))throw Error('Duplicate public puzzle ID '+id);
 const publicPath=path.join(repositoryRoot,'puzzles/trial',id+'.json');
 const privatePath=path.join(repositoryRoot,'puzzles/sealed',id+'.json');
 if(fs.existsSync(publicPath)||fs.existsSync(privatePath))throw Error('Puzzle already exists on disk');
 let keys=dependencies.keys;
 if(!keys){
  if(flags['--cert-json']){
   const certificateMap=JSON.parse(fs.readFileSync(path.resolve(flags['--cert-json']),'utf8'));
   const crypto=require('node:crypto');
   keys=Object.entries(certificateMap).map(([keyId,pem])=>
     ({keyId,publicKey:crypto.createPublicKey(pem)}));
  }else keys=await getPublicKeys(flags['--service-account-email']||DEFAULT_ACCOUNT);
 }
 const envelope=seal({...original,id,width,height},keys);
 const entry={id,name:result.publicData.name,width,height,rows:result.publicData.rows,
  cols:result.publicData.cols,origin:'trial',kind:'fixed',source:'puzzles/trial/'+id+'.json',
  difficulty:'미평가',answer:{format:'nono-1bit-msb-v1',location:'protected-firebase',deployment:'pending-auto-seed'},
  review:{status:'pending',checks:Object.fromEntries(CHECKS.map(k=>[k,'pending'])),notes:''}};
 const publicPuzzle={...result.publicData,reviewStatus:'trial'};
 // Commit files in one Git commit. If interrupted during staging, restore files;
 // Never change any old puzzle entries or legacy local save keys.
 const written=[];
 try{
  fs.mkdirSync(path.dirname(privatePath),{recursive:true});
  fs.writeFileSync(privatePath,JSON.stringify(envelope,null,2)+'\n',{flag:'wx',mode:0o600});written.push(privatePath);
  fs.writeFileSync(publicPath,JSON.stringify(publicPuzzle,null,2)+'\n',{flag:'wx'});written.push(publicPath);
  catalog.puzzles.push(entry);
  fs.writeFileSync(catalogPath,JSON.stringify(catalog,null,2)+'\n',{flag:'w'});
 }catch(e){
  for(const file of written)fs.rmSync(file,{force:true});
  throw e;
 }
 console.log('READY',id,width+'x'+height,'for quality review.');
 console.log('Safe to commit: puzzles/sealed/'+id+'.json (ENCRYPTED), puzzles/trial/'+id+'.json and puzzles/catalog.json');
 console.log('Private source was NOT copied. Normal main-branch push automatically seeds Firebase; formal publishing still requires review.');
 return {id,publicPath,privatePath,catalogPath};
}
module.exports={args,register};
if(require.main===module)register(args(process.argv.slice(2))).catch(e=>{console.error(e.message);process.exitCode=1;});
