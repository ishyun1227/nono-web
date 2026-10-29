const assert = require('node:assert/strict');
const replay = require('../numeric-replay.js');
const storage = new Map();
const local = {
  setItem(k, v) { storage.set(k, v); },
  getItem(k) { return storage.get(k) ?? null; },
  removeItem(k) { storage.delete(k); }
};

const s = replay.makeSession({puzzleId:'heart5',size:5,mode:'practice',startedAt:1000});
assert.equal(replay.boardAtEnd(s),'0'.repeat(25));
// One drag saved as one numeric action but replayed cell-by-cell.
replay.record(s,{actor:1,elapsedMs:100,group:'drag1',changes:[[1,0,1],[2,0,1]]});
replay.record(s,{actor:1,elapsedMs:110,group:'drag1',changes:[[3,0,1]]});
assert.equal(s.actions.length,1);
assert.equal(s.actions[0][3].length,3);
replay.record(s,{actor:1,elapsedMs:300,changes:[[3,1,0]]}); // eraser
replay.record(s,{actor:1,elapsedMs:350,changes:[[4,0,2]]}); // X
replay.record(s,{actor:1,elapsedMs:450,changes:[[4,2,0]]}); // undo-equivalent
assert.equal(replay.boardAtEnd(s),'011'+'0'.repeat(22));
const steps = [];
replay.everyStep(s, step => steps.push(step));
assert.equal(steps.length,6);
assert.deepEqual(steps.map(x=>x.cell),[1,2,3,3,4,4]);
assert.deepEqual(steps.map(x=>x.value),[1,1,1,0,2,0]);
// JSON round-trip keeps identical result; numeric array format.
assert.equal(replay.boardAtEnd(replay.parse(JSON.stringify(s))), replay.boardAtEnd(s));
replay.savePending(local,s);
const resumed = replay.readPending(local,'heart5','practice');
assert.equal(replay.boardAtEnd(resumed),replay.boardAtEnd(s));
replay.record(resumed,{actor:1,elapsedMs:500,changes:[[5,0,1]]});
assert.equal(replay.boardAtEnd(resumed)[5],'1');
replay.markCompleted(resumed,2000);
replay.saveCompleted(local,resumed);
assert.equal(replay.readPending(local,'heart5','practice'),null);
assert.equal(replay.recentCompleted(local,5)[0].id,resumed.id);
assert.throws(()=>replay.record(resumed,{actor:1,elapsedMs:600,changes:[[6,0,1]]}),/immutable/);
// Collaboration uses a shared event log with separate numeric participants.
const coop = replay.makeSession({puzzleId:'cat10',size:10,mode:'coop',startedAt:4000});
replay.record(coop,{actor:1,elapsedMs:0,changes:[[42,0,1]]});
replay.record(coop,{actor:2,elapsedMs:50,changes:[[43,0,1]]});
const actors=[];
replay.everyStep(coop,x=>actors.push(x.actor));
assert.deepEqual(actors,[1,2]);
assert.throws(()=>replay.record(coop,{actor:3,elapsedMs:70,changes:[[42,0,2]]}),/mismatch/);
assert.throws(()=>replay.parse('{"version":4,"actions":[]}'),/Unsupported/);

// Packed NR3 stream is canonical; legacy NR2 and NR1 JSON are still readable.
const packed = replay.serialize(s);
assert(packed.startsWith('NR3:'), 'new records must be packed from first save');
const unpacked = replay.parse(packed);
assert.equal(replay.boardAtEnd(unpacked),replay.boardAtEnd(s));
assert.deepEqual(unpacked.actions,s.actions,'grouping, timestamps and undo/redo unchanged');
const oldJSONString = JSON.stringify(s);
assert.deepEqual(replay.parse(oldJSONString).actions,s.actions,'legacy JSON remains readable');
replay.savePending(local,s);
assert(local.getItem('nono-numeric-replay-v1:pending:practice:heart5').startsWith('NR3:'));
const binaryCell = replay.encodeChanges([[1,0,1],[2,0,1],[3,1,0]],25);
assert(binaryCell.startsWith('NRC1:'));
assert.deepEqual(replay.decodeChanges(binaryCell,25),[[1,0,1],[2,0,1],[3,1,0]]);
assert.deepEqual(replay.decodeChanges('[[1,0,1],[2,0,1]]',25),[[1,0,1],[2,0,1]]);
assert.throws(()=>replay.decodeChanges(binaryCell+'AA',25),/base64|bytes/);
assert.throws(()=>replay.decodeChanges('NRC1:AAAA',25),/Unsupported|Invalid|Truncated/);
assert.throws(()=>replay.parse(packed.slice(0,-4)),/base64|Truncated|bytes/);
const unicode = replay.makeSession({puzzleId:'heart5',size:5,mode:'practice',id:'길고양이-🐱',actors:[{name:'김철수'}],startedAt:9999});
replay.record(unicode,{actor:7,elapsedMs:120,changes:[[4,0,2]]});
const unicodeRound=replay.parse(replay.serialize(unicode));
assert.equal(unicodeRound.id,unicode.id);
assert.deepEqual(unicodeRound.actors,unicode.actors);
assert.deepEqual(unicodeRound.actions,unicode.actions);
let currentSize=[];
for(const size of [25,45,75,100]){
 const game=replay.makeSession({puzzleId:'cell'+size,size,mode:'practice',startedAt:1000});
 for(let i=0;i<size*size;i++)replay.record(game,{actor:1,elapsedMs:i*5,changes:[[i,0,1]]});
 const oldBytes=Buffer.byteLength(JSON.stringify(game),'utf8');
 const packedBase64=Buffer.byteLength(replay.serialize(game),'utf8');
 const packedBytes=Buffer.from(replay.serialize(game).slice(4),'base64').byteLength;
 assert.equal(replay.boardAtEnd(replay.parse(replay.serialize(game))),replay.boardAtEnd(game));
 assert(packedBase64<oldBytes/2,'packing should materially reduce size');
 currentSize.push({size,oldBytes,packedBase64,packedBytes,reductionPercent:Math.round((1-packedBase64/oldBytes)*100)});
}
console.log('Replay size measurements:',JSON.stringify(currentSize));

console.log('Numeric replay unit tests passed');
