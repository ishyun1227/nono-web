/* Deterministic smart mobile controller behavior tests (no browser required).
   Exercises the real smart-touch-controls.js against a small event/DOM shim. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','smart-touch-controls.js'),'utf8');
class Element {
 constructor(){
  this.listeners={};this.style={};this.dataset={};this.children=[];this.className='';
  this.hidden=false;this.classList={values:new Set(),contains:x=>this.classList.values.has(x),
   add:x=>this.classList.values.add(x)};
  this.rect={left:10,top:10,right:162,bottom:162,width:152,height:152};
 }
 querySelector(s){
  if(s==='.nono-absolute-label')return label;
  if(s==='.nono-absolute-cursor')return cursor;
  if(s==='.nono-pad-actions')return buttons;
  return null;
 }
 addEventListener(n,fn){(this.listeners[n]??=[]).push(fn)}
 setAttribute(){}
 prepend(x){this.children.unshift(x)}
 replaceChildren(fragment){this.children=fragment.nodes??[]}
 getBoundingClientRect(){return this.rect}
 fire(type,x,y){
  const event={pointerId:1,button:0,clientX:x,clientY:y,preventDefault(){}};
  for(const fn of this.listeners[type]??[])fn(event);
 }
 setPointerCapture(){}
 releasePointerCapture(){}
 hasPointerCapture(){return false}
}
const pad=new Element,mini=new Element,zone=new Element,label=new Element,cursor=new Element;
const buttons=new Element,game=new Element,lobby=new Element,cells=new Element;
lobby.classList.add('hidden');
cells.children=Array.from({length:53*73},()=>new Element);
const held={fill:false,cross:false,clear:false};
buttons.querySelector=selector=>{
 const match=selector.match(/data-nono-input="([^"]+)"/);
 return held[match[1]]?{}:null;
};
const dim={width:53,height:73},position={row:20,col:20},painted=[];
const nav={
 dimensions:dim,
 get position(){return {...position}},
 select(row,col){
  position.row=Math.max(0,Math.min(72,row));
  position.col=Math.max(0,Math.min(52,col));
  return true;
 },
 paintLine(row,col,nextRow,nextCol,action){
  painted.push({row,col,nextRow,nextCol,action});
  return this.select(nextRow,nextCol);
 },
 paintAt(row,col,action){painted.push({row,col,action});return true}
};
const nodes={
 'nono-mobile-pad':pad,'nono-absolute-pad':mini,'nono-floating-zone':zone,
 game,lobby
};
const document={
 getElementById:id=>nodes[id]||null,
 querySelector:sel=>sel==='#board .cells'?cells:null,
 createElement:()=>new Element,
 createDocumentFragment:()=>({nodes:[],append(x){this.nodes.push(x)}}),
 addEventListener(){}
};
const callbacks={};
const settings={mode:'smartMinimap',smartWindowCells:12,trackpadSensitivity:100};
const window={
 NONO_TOUCH_CURSOR:nav,
 NONO_INPUT_CUSTOM:{get settings(){return {...settings}}},
 addEventListener:(event,cb)=>(callbacks[event]??=[]).push(cb)
};
let currentTime=1000,timerId=0;
const intervals=new Map();
new Function('document','window','matchMedia','setInterval','clearInterval','Date',source)(
 document,window,()=>({matches:true}),
 fn=>{intervals.set(++timerId,fn);return timerId},
 id=>intervals.delete(id),{now:()=>currentTime}
);
const positionAt=(x,y)=>[10+152*x,10+152*y];
const change=next=>{
 settings.mode=next;
 for(const cb of callbacks['nono:smart-controls-change']??[])cb();
};
// The miniature selects coordinates in a 12x12 window, not the entire board.
assert.equal(window.NONO_SMART_TOUCH.viewport.cols,12);
assert.equal(window.NONO_SMART_TOUCH.viewport.rows,12);
mini.fire('pointerdown',...positionAt(.6,.6));
const start={...position};
mini.fire('pointermove',...positionAt(.15,.2));
assert.notEqual(position.row,start.row,'unheld miniature must move vertically');
assert.notEqual(position.col,start.col,'unheld miniature must move horizontally');
mini.fire('pointermove',...positionAt(.99,.6));
const before=window.NONO_SMART_TOUCH.viewport.left;
currentTime+=450;
for(const tick of [...intervals.values()])tick();
assert.equal(window.NONO_SMART_TOUCH.viewport.left,before+1,'edge should pan the whole miniature');
mini.fire('pointerup',...positionAt(.99,.6));
// The trackpad moves freely on both axes without an action button.
change('smartTrackpad');position.row=20;position.col=20;
mini.fire('pointerdown',70,70);
mini.fire('pointermove',95,95);
assert.ok(position.row>20&&position.col>20,'free trackpad drag should move diagonally');
mini.fire('pointerup',95,95);
// The hybrid has no miniature: touch starts at absolute full-board position,
// subsequent drag changes the position relatively.
change('smartHybrid');
zone.fire('pointerdown',160,13);
assert.equal(position.row,0);
assert.equal(position.col,52);
zone.fire('pointermove',135,27);
assert.ok(position.row>0&&position.col<52);
zone.fire('pointerup',135,27);
// Only actively held editing locks the axis; releasing unlocks immediately.
change('smartTrackpad');position.row=30;position.col=30;held.fill=true;
mini.fire('pointerdown',60,60);
mini.fire('pointermove',90,68);
assert.equal(position.row,30);
assert.ok(position.col>30);
assert.ok(painted.length>0,'held editing must paint');
const previous={...position};
held.fill=false;
mini.fire('pointermove',102,88);
assert.ok(position.row>previous.row&&position.col>previous.col,
 'releasing edit must immediately restore free movement');
mini.fire('pointerup',102,88);
assert.equal(window.NONO_SMART_TOUCH.active,false);
console.log('SMART_TOUCH_PASS: sliding window, free diagonal, action lock, frameless hybrid');
