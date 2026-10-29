const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const listeners={};
const codec=require('../numeric-replay.js');
const elements=new Map();
const doc={
  createElement(tag){return {tagName:tag,style:{},children:[],append(...items){this.children.push(...items);},addEventListener(event,fn){this['on'+event]=fn;},setAttribute(){},textContent:'',hidden:false};},
  getElementById(id){if(!elements.has(id))elements.set(id,{parentElement:{append(){}},style:{},setAttribute(){}});return elements.get(id);}
};
const win={NONO_REPLAY:codec,addEventListener(event,fn){listeners[event]=fn;}};
class Observer{observe(){}disconnect(){}}
const context={window:win,document:doc,MutationObserver:Observer,console,Promise,setTimeout,clearTimeout};
vm.runInNewContext(fs.readFileSync('multiplayer-replay.js','utf8'),context,{filename:'multiplayer-replay.js'});
const normalize=win.NONO_MULTIPLAYER_REPLAY.normalizeEvents;
assert.equal(typeof normalize,'function');
const data={
 alice:{
  k1:{actor:'alice',mode:'coop',elapsedMs:10,at:1000,cells:codec.encodeChanges([[0,0,1],[1,0,1]],5)},
  k3:{actor:'bob',mode:'coop',elapsedMs:13,at:1100,cells:'[[2,0,1]]'},
  malformed:{actor:'alice',mode:'coop',elapsedMs:30,at:1300,cells:'not-json'}
 },
 bob:{
  k2:{actor:'bob',mode:'coop',elapsedMs:15,at:1100,cells:codec.encodeChanges([[2,0,1]],5)},
  k4:{actor:'bob',mode:'coop',elapsedMs:16,at:1500,cells:'[[12000,0,1]]'}
 }
};
const events=normalize(data,5);
assert.equal(events.length,2);
assert.equal(events[0].uid,'alice');
assert.equal(events[1].uid,'bob');
assert.deepEqual(JSON.parse(JSON.stringify(events[0].changes)),[[0,0,1],[1,0,1]]);
const race=normalize({a:{a:{actor:'a',mode:'race',at:500,elapsedMs:200,cells:'[[4,0,1]]'}},b:{b:{actor:'b',mode:'race',at:520,elapsedMs:180,cells:'[[6,0,1]]'}}},5);
assert.equal(race.length,2);
const lanes=win.NONO_MULTIPLAYER_REPLAY.makeRaceData(race,[{uid:'a'},{uid:'b'}],5,100);
assert.equal(lanes.per.a.length,1);
assert.equal(lanes.per.b.length,1);
assert.equal(lanes.maxTime,200);
const packedRace = codec.encodeChanges([[24,0,1],[24,1,2]],5);
const extra=normalize({alice:{new:{actor:'alice',mode:'race',elapsedMs:500,at:600,cells:packedRace}}},5);
assert.deepEqual(JSON.parse(JSON.stringify(extra[0].changes)),[[24,0,1],[24,1,2]]);
console.log('Multiplayer numeric replay parsing and actor separation passed');
