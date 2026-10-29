/* Canonical 30x30 source art already exists in the test-only VOX preview.
 * Extract its BASE64 masks solely for private Firebase seeding. Never include
 * the extracted data in public JSON catalogs or modify player save files.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const codec=require('../answer-bitpack.js');
const {puzzles}=require('../tests/puzzles.cjs');
function curatedVoxAnswers(){
 const text=fs.readFileSync(path.join(__dirname,'../voxel-test-preview.js'),'utf8');
 const section=text.match(/const packed\s*=\s*Object\.freeze\(\{([\s\S]*?)\}\);/);
 if(!section)throw Error('Source 30x30 packed bitmap block not found');
 const raw=Object.create(null);
 const entries=[...section[1].matchAll(/\b(vox_[a-z0-9_]+)\s*:\s*'([A-Za-z0-9+/=]+)'/g)];
 for(const [,id,packed] of entries){
  if(Object.prototype.hasOwnProperty.call(raw,id))throw Error('Duplicate VOX id: '+id);
  raw[id]=packed;
 }
 const specs=puzzles.filter(p=>p.size===30&&/^vox_[a-z0-9_]+$/.test(p.id));
 if(!specs.length||entries.length!==specs.length)throw Error('VOX answer count mismatches source puzzles');
 const answerList=[];
 for(const p of specs){
  const packed=raw[p.id];
  if(!packed)throw Error('Missing VOX private answer: '+p.id);
  const mask=codec.unpack(packed,p.size,p.size);
  const canonical=codec.validateAnswer(mask,p.size,p.size,p.rows,p.cols);
  if(packed!==canonical)throw Error('Noncanonical VOX bitmap: '+p.id);
  answerList.push({id:p.id,width:p.size,height:p.size,mask,rows:p.rows,cols:p.cols});
 }
 return answerList;
}
module.exports={curatedVoxAnswers};
