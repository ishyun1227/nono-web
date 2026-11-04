/* Integration contract for the asynchronous v6 browser generator.
 * Fake Workers check message protocol and fail-closed storage behavior.
 * Actual CaDiCaL proof is checked separately in cadical-integration.mjs.
 */
'use strict';
const assert=require('node:assert/strict');
const saved=new Map();
globalThis.localStorage={
  getItem:key=>saved.get(key)||null,
  setItem:(key,value)=>saved.set(key,String(value))
};
const random=require('../random-puzzles.js');
const originalWorker=globalThis.Worker;

class FakeWorker {
  static decisions=[];
  static created=[];
  constructor(url,options){
    assert.equal(url,'./random-unique-worker.js');
    assert.equal(options.type,'module');
    this.listeners=new Map();
    this.requests=[];
    this.terminated=false;
    FakeWorker.created.push(this);
  }
  addEventListener(type,fn){
    if(!this.listeners.has(type))this.listeners.set(type,new Set());
    this.listeners.get(type).add(fn);
  }
  removeEventListener(type,fn){this.listeners.get(type)?.delete(fn);}
  postMessage(message){
    this.requests.push(message);
    assert(message.maxMs>0&&message.maxMs<=5000);
    assert.equal(message.mask.length,message.puzzle.size*message.puzzle.size);
    const status=FakeWorker.decisions.shift()||'unknown';
    queueMicrotask(()=>{
      if(this.terminated)return;
      for(const fn of this.listeners.get('message')||[])
        fn({data:{id:message.id,status,method:'mock-no-actual-solver'}});
    });
  }
  terminate(){this.terminated=true;}
}

async function run(){
  try{
    delete globalThis.Worker;
    await assert.rejects(
      random.generateAsync({size:10,difficulty:'보통',seed:100}),
      /전문 유일해 검사를 사용할 수 없습니다/
    );
    globalThis.Worker=FakeWorker;
    FakeWorker.decisions=['multiple','unique'];
    const before=random.restore().length;
    const result=await random.generateAsync({size:10,difficulty:'보통',seed:100,maxMs:5000});
    assert.equal(result.designVersion,6);
    assert.equal(random.answerFor(result).length,100);
    assert.equal(random.restore().length,before+1);
    assert.equal(FakeWorker.created[0].requests.length,2);
    assert.equal(FakeWorker.created[0].terminated,true);
    assert.notEqual(FakeWorker.created[0].requests[0].mask,FakeWorker.created[0].requests[1].mask);
    // A non-certified (unknown) candidate must never be stored.
    FakeWorker.decisions=Array.from({length:80},()=> 'unknown');
    await assert.rejects(
      random.generateAsync({size:10,difficulty:'보통',seed:101,maxMs:50}),
      /유일해 랜덤 퍼즐을 확인하지 못했습니다/
    );
    assert.equal(random.restore().length,before+1);
    assert.equal(FakeWorker.created[1].terminated,true);
    // Entire generator is cancelled on worker fault; it does not
    // silently fall back to the legacy, uncertified synchronous generator.
    FakeWorker.decisions=['error'];
    const faulty=FakeWorker.created.length;
    await assert.rejects(
      random.generateAsync({size:10,difficulty:'보통',seed:102,maxMs:5000}),
      /전문 유일해 검사 오류/
    );
    assert.equal(FakeWorker.created[faulty].terminated,true);
    assert.equal(random.restore().length,before+1);
    console.log('PASS v6 asynchronous CaDiCaL worker contract, deterministic reconstruction and fail-closed storage');
  }finally{
    if(originalWorker===undefined)delete globalThis.Worker;
    else globalThis.Worker=originalWorker;
  }
}
run().catch(e=>{console.error(e);process.exitCode=1;});
