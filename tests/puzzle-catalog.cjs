/* Every puzzle currently reachable by NONO is recorded once with the
 * same public metadata shape, while source/private answers stay protected.
 * This test prevents accidental changes to previously published clues.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'puzzles/catalog.json'),'utf8'));
const {puzzles,answers}=require('./puzzles.cjs');
const bits=require('../answer-bitpack.js');
const {curatedVoxAnswers}=require('../tools/curated-vox-answers.cjs');
const {curatedPlaytestAnswers}=require('../tools/curated-playtest-answers.cjs');
assert.equal(catalog.schemaVersion,1);
assert(catalog.puzzles.length>=12,'Existing twelve puzzle entries must remain present');
assert.equal(new Set(catalog.puzzles.map(p=>p.id)).size,12);
const expectedIds=['heart5','cat10','rocket10','vox_crabino_front','vox_crabino_side','vox_crabino_top',
 'trial_rabbit_53x73','trial_samurai_72x72','winter-snowman-trial-v1',
 'size-test-50','size-test-75','size-test-100'];
assert.deepEqual(catalog.puzzles.slice(0,12).map(p=>p.id),expectedIds,'Existing puzzle IDs or order modified');
for(const entry of catalog.puzzles.slice(12)){
 assert.equal(entry.kind,'fixed');assert.equal(entry.origin,'trial');
 assert.equal(entry.answer.deployment,'pending-auto-seed');
 assert(fs.existsSync(path.join(root,'puzzles/trial',entry.id+'.json')),'Missing public trial data '+entry.id);
 assert(fs.existsSync(path.join(root,'puzzles/sealed',entry.id+'.json')),'Missing encrypted private answer '+entry.id);
}
const lookup=new Map(catalog.puzzles.map(p=>[p.id,p]));
const checks=['subjectRecognition','visualQuality','smallDetailsAndSpikes','outerZeroBorder',
 'logicalSolvability','uniqueSolution','difficultyCalibration','humanPlaytest'];
for(const item of catalog.puzzles){
 assert.match(item.id,/^[a-z][a-z0-9_-]+$/);
 assert(['미평가','쉬움','보통','어려움','매우 어려움','전문가'].includes(item.difficulty));
 assert(item.width>0&&item.height>0);
 assert(item.review&&['pending','approved','rejected'].includes(item.review.status));
 assert.deepEqual(Object.keys(item.review.checks).sort(),checks.slice().sort());
 assert(Object.values(item.review.checks).every(v=>['pending','passed','failed'].includes(v)));
 if(item.review.status==='approved')assert(Object.values(item.review.checks).every(v=>v==='passed'),'An approved puzzle needs all eight passing quality checks');
 assert(!('mask' in item)&&!('packed' in item)&&!('b64' in item)&&!('solution' in item));
 assert(!('answer' in item&&('packed' in item.answer||'mask' in item.answer||'b64' in item.answer)));
 if(item.kind==='fixed'){
  assert.equal(item.rows.length,item.height);
  assert.equal(item.cols.length,item.width);
  const validateLine=(clues,n)=>clues.forEach(line=>{
   assert(Array.isArray(line)&&line.length>0);
   assert(line.every(v=>Number.isInteger(v)&&v>=0&&v<=n));
   assert(line.reduce((a,b)=>a+b,0)+line.length-1<=n);
  });
  validateLine(item.rows,item.width);validateLine(item.cols,item.height);
  const sum=lines=>lines.flat().reduce((a,b)=>a+b,0);
  assert.equal(sum(item.rows),sum(item.cols),item.id+' conflicting clues');
  assert.equal(item.answer.format,bits.FORMAT);
 }else{
  assert.equal(item.kind,'generated');
  assert.equal(item.rows,null);
  assert.equal(item.cols,null);
  assert.equal(item.answer.format,'session-generated');
 }
}
for(const p of puzzles){
 const entry=lookup.get(p.id);
 assert(entry);
 assert.equal(entry.width,p.size);
 assert.equal(entry.height,p.size);
 if(p.sizeTest)assert.equal(entry.kind,'generated');
 else {
  assert.deepEqual(entry.rows,Array.from(p.rows,x=>Array.from(x)));
  assert.deepEqual(entry.cols,Array.from(p.cols,x=>Array.from(x)));
 }
}
for(const p of [...curatedVoxAnswers(),...curatedPlaytestAnswers()]){
 const c=lookup.get(p.id);assert(c,p.id);
 assert.deepEqual(c.rows,p.rows);
 assert.deepEqual(c.cols,p.cols);
 assert.equal(bits.validateAnswer(p.mask,c.width,c.height,c.rows,c.cols),
   bits.pack(p.mask,p.width,p.height),p.id+' answer differs');
}
for(const p of puzzles.filter(p=>p.size<=10)){
 const c=lookup.get(p.id);
 assert.equal(bits.validateAnswer(answers[p.id],c.width,c.height,c.rows,c.cols),
   bits.pack(answers[p.id],c.width,c.height));
}
const snow=JSON.parse(fs.readFileSync(path.join(root,'puzzles/trial/winter-snowman-trial-v1.json'),'utf8'));
const trial=lookup.get(snow.id);
assert.deepEqual(trial.rows,snow.rows);assert.deepEqual(trial.cols,snow.cols);
assert.equal(trial.width,snow.width);assert.equal(trial.height,snow.height);
assert.equal(trial.answer.deployment,'private-answer-not-available');
// The three trials use the main puzzle runtime, not a separate simplified player.
const trialIds=['trial_rabbit_53x73','trial_samurai_72x72','winter-snowman-trial-v1'];
const dist=path.join(root,'dist'),builtHome=fs.readFileSync(path.join(dist,'index.html'),'utf8');
const script=fs.readFileSync(path.join(dist,'puzzles-public-catalog.js'),'utf8');
const ctx={window:{}};vm.runInNewContext(script,ctx);
const published=ctx.window.NONO_PUBLIC_PUZZLES;
assert.deepEqual(Array.from(published,p=>p.id),expectedIds.slice(0,9));
assert.deepEqual(Array.from(ctx.window.NONO_DYNAMIC_PUZZLE_DEFS,p=>p.size),[50,75,100]);
for(const id of trialIds){
 const item=lookup.get(id),entry=published.find(p=>p.id===id);
 assert(item&&entry,id+' missing from original puzzle selector');
 assert.equal(entry.width,item.width);assert.equal(entry.height,item.height);
 assert.equal(entry.size,item.width);assert.equal(entry.trialOnly,true);
 const source=JSON.parse(fs.readFileSync(path.join(root,'puzzles/trial',id+'.json'),'utf8'));
 assert.deepEqual(source.rows,item.rows);assert.deepEqual(source.cols,item.cols);
 assert(!Object.hasOwn(source,'mask')&&!Object.hasOwn(source,'packed'));
 assert.deepEqual(Array.from(entry.rows,r=>Array.from(r)),item.rows);
 assert.deepEqual(Array.from(entry.cols,r=>Array.from(r)),item.cols);
}
for(const removed of ['playtest-rabbit-samurai.html','winter-snowman-test.html','trial-index.json']){
 assert(!fs.existsSync(path.join(dist,removed)),'Simplified player still deployed: '+removed);
}
assert(!fs.existsSync(path.join(dist,'trials')),'Standalone trial pages were rebuilt');
assert(!builtHome.includes('playtest-rabbit-samurai.html'));
assert(!builtHome.includes('winter-snowman-trial-v1.html'));
assert(builtHome.includes('<script src="./puzzles-public-catalog.js?v=1"></script>'));
assert(!/privateAnswersPacked|\\bb64\\b|\\bmask\\b/.test(script),'Public clues must not embed answer bits');
console.log('PASS canonical 12-puzzle catalog, all 12 in existing main runtime, no standalone players, protected answers');
