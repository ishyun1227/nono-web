const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const codec=require('../answer-bitpack.js');
const {answers,puzzles}=require('./puzzles.cjs');
assert.equal(codec.FORMAT,'nono-1bit-msb-v1');
assert.equal(codec.pack('100000001',3,3),'gIA=');
assert.equal(codec.unpack('gIA=',3,3),'100000001');
assert.equal(codec.pack('00000000',4,2),'AA==');
assert.equal(codec.pack('11111111',4,2),'/w==');
assert.throws(()=>codec.unpack('gIE=',3,3),/padding/);
assert.throws(()=>codec.unpack('gIA',3,3),/base64/);
assert.throws(()=>codec.unpack('gI=',3,3),/base64/);
assert.throws(()=>codec.unpack('gIA=',5,5),/length/);
assert.throws(()=>codec.pack('0102',2,2),/0\/1/);
assert.throws(()=>codec.pack('010',2,2),/dimensions/);
assert.throws(()=>codec.unpack('gIA=',0,9),/dimensions/);
assert.throws(()=>codec.validateAnswer('100000001',3,3,[[1],[0],[1]],[[1],[0],[0]]),/Clues/);
for(const p of puzzles.filter(p=>p.size<=10)){
  const mask=answers[p.id];
  const base64=codec.validateAnswer(mask,p.size,p.size,p.rows,p.cols);
  assert.equal(codec.unpack(base64,p.size,p.size),mask,p.id+' roundtrip');
  assert.equal(codec.read(mask,p.size,p.size),mask,p.id+' legacy');
  assert.equal(codec.read(base64,p.size,p.size),mask,p.id+' packed');
}
for(const [width,height] of [[59,63],[63,59],[1,1],[1,57],[57,1],[75,75],[100,100]]){
  for(const seed of [0,1,7,17]){
    const mask=Array.from({length:width*height},(_,i)=>((i*19+i*i+seed*13)%23)<11?'1':'0').join('');
    const clues=codec.hints(mask,width,height);
    const b64=codec.validateAnswer(mask,width,height,clues.rows,clues.cols);
    assert.equal(codec.unpack(b64,width,height),mask, width+'x'+height+' roundtrip');
    assert.equal(Buffer.from(b64,'base64').length,Math.ceil(width*height/8));
  }
}
const source=fs.readFileSync(require.resolve('../answer-bitpack.js'),'utf8'),sandbox={window:{},btoa:(s)=>Buffer.from(s,'latin1').toString('base64'),atob:(s)=>Buffer.from(s,'base64').toString('latin1')};
vm.runInNewContext(source,sandbox);
const browserCodec=sandbox.window.NONO_ANSWER_BITS;
const mask='10010110111001001';
assert.equal(browserCodec.pack(mask,17,1),codec.pack(mask,17,1));
assert.equal(browserCodec.unpack(codec.pack(mask,17,1),17,1),mask);
console.log('PASS answer codec legacy compatibility, base64, MSB bit order, padding, rectangular grid, clues and browser parity');

 
// Production rollout allowlist must match IDs actually seeded by the guarded
// workflow. Never switch unseeded 30x30+ or trial puzzles to packed completions.
const production={window:{}};
vm.runInNewContext(fs.readFileSync(require.resolve('../firebase-config.js'),'utf8'),production);
assert.equal(production.window.NONO_FIREBASE_CONFIG.projectId,'nono-web-ishyun-20261020');
const enabled=Array.from(production.window.NONO_PACKED_ANSWERS_READY||[]);
assert.deepEqual(enabled.sort(),['cat10','heart5','rocket10'],'Production rollout allowlist');
assert.equal(enabled.length,new Set(enabled).size,'Duplicate rollout ID');
assert.deepEqual(enabled.slice().sort(),Array.from(puzzles.filter(p=>p.size<=10),p=>p.id).sort(),
  'Rollout must match all and only private packed-answer seed IDs');
const indexSource=fs.readFileSync(require.resolve('../index.html'),'utf8');
const maskFunction=indexSource.match(/function serverAnswerMask\(board,p\)\{[\s\S]*?\n\}/);
assert(maskFunction,'Missing browser completion encoder');
const live={window:{NONO_PACKED_ANSWERS_READY:enabled,NONO_ANSWER_BITS:codec},
  filledMask:board=>board.map(x=>x==='1'?'1':'0').join('')};
vm.runInNewContext(maskFunction[0],live);
for(const puzzle of puzzles.filter(p=>p.size<=10)){
 const mask=answers[puzzle.id],board=mask.split('');
 assert.equal(live.serverAnswerMask(board,puzzle),codec.pack(mask,puzzle.size,puzzle.size),
   puzzle.id+' packed production completion');
}
const large=Array(30*30).fill('0');
assert.equal(live.serverAnswerMask(large,{id:'unseeded-30x30',size:30}),large.join(''),
 'Unseeded puzzle must retain legacy completion');
assert.equal(live.serverAnswerMask(large,{id:'winter-snowman-trial-v1',size:30}),large.join(''),
 'Trial puzzle must not submit packed answer to absent production seed');
console.log('PASS Production rollout allowlist and backwards-compatible completion encoding');
