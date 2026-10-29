/* Import validation for curated nonograms.
 * Creates ONLY separate PUBLIC clue data and PRIVATE packed-answer data.
 * It never updates production Firebase or exposes a mask in deployment assets.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const codec=require('../answer-bitpack.js');
const FORMAT=codec.FORMAT;
function prepare(source){
 if(!source||typeof source!=='object'||Array.isArray(source))throw Error('Invalid puzzle object');
 const {id,name,width,height,mask,rows,cols}=source;
 if(typeof id!=='string'||!/^[a-z][a-z0-9_-]{2,78}$/.test(id))throw Error('Invalid puzzle ID');
 if(typeof name!=='string'||!name.trim()||name.length>90||/[<>]/.test(name))throw Error('Invalid puzzle title');
 if(!['쉬움','보통','어려움','매우 어려움'].includes(source.difficulty))throw Error('Difficulty must be declared');
 if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||width*height>16384)throw Error('Invalid width or height');
 if(!Array.isArray(rows)||!Array.isArray(cols)||rows.length!==height||cols.length!==width)throw Error('Missing row/column clues');
 if(typeof mask!=='string'||mask.length!==width*height||!/^[01]+$/.test(mask))throw Error('Missing or invalid source mask');
 // The puzzle tool must have removed any entirely white OUTER row/column.
 if((rows[0].length===1&&rows[0][0]===0)||(rows[height-1].length===1&&rows[height-1][0]===0)||
    (cols[0].length===1&&cols[0][0]===0)||(cols[width-1].length===1&&cols[width-1][0]===0))
   throw Error('Outer 0 line present: trim empty borders before importing');
 const packed=codec.validateAnswer(mask,width,height,rows,cols);
 const bytes=Buffer.from(packed,'base64');
 const status=source.reviewStatus==='approved'?'approved':'trial';
 // An external uniqueness claim is only descriptive; the codec does NOT prove unique solvability.
 if(status==='approved' && source.uniqueProofStatus!=='unique')throw Error('Approved puzzles require external unique-solution proof');
 const common={id,name:name.trim(),width,height,difficulty:source.difficulty,
   reviewStatus:status,uniqueProofStatus:source.uniqueProofStatus==='unique'?'externally-reported-unique':'not-verified'};
 const publicData={...common,rows,cols,format:'nonogram-clues-v1'};
 const privateData={id,width,height,format:FORMAT,packed,
   sha256:crypto.createHash('sha256').update(mask,'ascii').digest('hex')};
 if(JSON.stringify(publicData).includes(packed)||Object.hasOwn(publicData,'mask')||Object.hasOwn(publicData,'packed'))
   throw Error('Private answer leaked to public output');
 return {publicData,privateData,bytes:bytes.length,filled:mask.split('1').length-1};
}
function parseArgs(args){
 const out={};
 for(let i=0;i<args.length;i++){
  if(!['--input','--public-out','--private-out','--overwrite'].includes(args[i]))throw Error('Unknown option '+args[i]);
  if(args[i]==='--overwrite'){out.overwrite=true;continue;}
  const arg=args[i];if(!args[i+1]||args[i+1].startsWith('--'))throw Error('Missing value for '+arg);
  out[arg]=args[++i];
 }
 if(!out['--input'])throw Error('Usage: node tools/prepare-puzzle.cjs --input PRIVATE_JSON [--public-out PUBLIC_JSON --private-out PRIVATE_JSON]');
 if(Boolean(out['--public-out'])!==Boolean(out['--private-out']))throw Error('Both output paths must be supplied together');
 return out;
}
function main(args){
 const flags=parseArgs(args),input=path.resolve(flags['--input']);
 const result=prepare(JSON.parse(fs.readFileSync(input,'utf8')));
 console.log('Verified',result.publicData.id,result.publicData.width+'x'+result.publicData.height,
  'packed bytes='+result.bytes,'black cells='+result.filled,'status='+result.publicData.reviewStatus);
 if(!flags['--public-out']){console.log('DRY RUN: no files written.');return;}
 const pub=path.resolve(flags['--public-out']),priv=path.resolve(flags['--private-out']);
 const repoRoot=path.resolve(__dirname,'..')+path.sep;
 if(pub===priv)throw Error('Public and private paths must be distinct');
 if(priv.startsWith(repoRoot))throw Error('Private output must stay OUTSIDE the repository and deployment directory');
 if(!flags.overwrite && (fs.existsSync(pub)||fs.existsSync(priv)))throw Error('Output file already exists. Use --overwrite explicitly.');
 fs.mkdirSync(path.dirname(pub),{recursive:true});
 fs.mkdirSync(path.dirname(priv),{recursive:true});
 fs.writeFileSync(priv,JSON.stringify(result.privateData,null,2)+'\n',{mode:0o600,flag:flags.overwrite?'w':'wx'});
 try{fs.writeFileSync(pub,JSON.stringify(result.publicData,null,2)+'\n',{flag:flags.overwrite?'w':'wx'});}
 catch(error){fs.rmSync(priv,{force:true});throw error;}
 console.log('Public clue file:',pub,'Private answer file:',priv);
 console.log('Not added to live catalog and not deployed. Run full game/server validation before release.');
}
module.exports={prepare,parseArgs};
if(require.main===module){try{main(process.argv.slice(2));}catch(e){console.error(e.message);process.exitCode=1;}}
