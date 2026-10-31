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
  if(s==='.nono-dpad .nono-pad-center')return crossCenter;
  if(s==='.cells')return cells;
  return null;
 }
 addEventListener(n,fn){(this.listeners[n]??=[]).push(fn)}
 setAttribute(){}
 prepend(...items){this.children.unshift(...items);for(const el of items)el.parentElement=this}
 append(x){this.children.push(x);x.parentElement=this}
 getContext(){
  if(!this.context)this.context={fillStyle:'',strokeStyle:'',lineWidth:1,draws:0,
   clearRect(){},fillRect(){this.draws++},beginPath(){},moveTo(){},lineTo(){},stroke(){}};
  return this.context;
 }
 replaceChildren(fragment){this.children=fragment.nodes??[]}
 getBoundingClientRect(){
  const strip=this.dataset.nonoSmartEdge;
  const boxes={
   up:{left:10,top:-17,right:162,bottom:5,width:152,height:22},
   down:{left:10,top:167,right:162,bottom:189,width:152,height:22},
   left:{left:-17,top:10,right:5,bottom:162,width:22,height:152},
   right:{left:167,top:10,right:189,bottom:162,width:22,height:152}
  };
  return boxes[strip]||this.rect;
 }
 fire(type,x,y){
  const event={pointerId:1,button:0,clientX:x,clientY:y,preventDefault(){}};
  for(const fn of this.listeners[type]??[])fn(event);
 }
 setPointerCapture(){}
 releasePointerCapture(){}
 hasPointerCapture(){return false}
}
const pad=new Element,mini=new Element,zone=new Element,label=new Element,cursor=new Element;
const crossCenter=new Element,boardRoot=new Element;
crossCenter.rect={left:61,top:61,right:111,bottom:111,width:50,height:50};
boardRoot.rect={left:0,top:0,right:600,bottom:800,width:600,height:800};
boardRoot.offsetWidth=600;boardRoot.offsetHeight=800;
const buttons=new Element,game=new Element,lobby=new Element,cells=new Element;
lobby.classList.add('hidden');
cells.children=Array.from({length:53*73},(_,i)=>{
 const el=new Element,col=i%53,row=Math.floor(i/53);
 el.rect={left:20+col*10,top:30+row*10,right:30+col*10,
  bottom:40+row*10,width:10,height:10};
 return el;
});
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
 game,lobby,board:boardRoot
};
const document={
 getElementById:id=>nodes[id]||null,
 querySelector:sel=>sel==='#board .cells'?cells:null,
 createElement:()=>new Element,
 createDocumentFragment:()=>({nodes:[],append(x){this.nodes.push(x)}}),
 addEventListener(){}
};
const callbacks={};
const settings={mode:'smartMinimap',smartWindowCells:12,trackpadSensitivity:100,smartPanSpeed:14};
const window={
 NONO_TOUCH_CURSOR:nav,
 NONO_INPUT_CUSTOM:{get settings(){return {...settings}}},
 addEventListener:(event,cb)=>(callbacks[event]??=[]).push(cb)
};
let currentTime=1000,timerId=0;
const intervals=new Map();
new Function('document','window','matchMedia','setInterval','clearInterval','Date','requestAnimationFrame',source)(
 document,window,()=>({matches:true}),
 fn=>{intervals.set(++timerId,fn);return timerId},
 id=>intervals.delete(id),{now:()=>currentTime},
 fn=>{fn();return 1}
);
const positionAt=(x,y)=>[10+152*x,10+152*y];
const rail=pad.children.find(child=>child.id==='nono-smart-edge-rail');
assert.ok(rail,'smart mode needs four visible outer strips');
const edges=Object.fromEntries(rail.children.map(el=>[el.dataset.nonoSmartEdge,el]));
assert.deepEqual(Object.keys(edges).sort(),['down','left','right','up']);
const change=next=>{
 settings.mode=next;
 for(const cb of callbacks['nono:smart-controls-change']??[])cb();
};
// Ordinary miniature draws the whole puzzle's current progress, not the answer.
change('minimap');
const progress=mini.children.find(el=>el.className==='nono-mini-progress-preview');
assert.ok(progress,'classic miniature must have a progress canvas');
assert.equal(progress.width,152);
assert.equal(progress.height,152);
const initialRects=progress.getContext().draws;
cells.children[20*53+20].classList.add('filled');
change('minimap');
assert.ok(progress.getContext().draws>initialRects,'classic miniature redraws user-filled cells');
change('smartMinimap');
// The smart miniature selects coordinates in a 12x12 window, not the entire board.
assert.equal(window.NONO_SMART_TOUCH.viewport.cols,12);
assert.equal(window.NONO_SMART_TOUCH.viewport.rows,12);
mini.fire('pointerdown',...positionAt(.6,.6));
const start={...position};
mini.fire('pointermove',...positionAt(.15,.2));
assert.notEqual(position.row,start.row,'unheld miniature must move vertically');
assert.notEqual(position.col,start.col,'unheld miniature must move horizontally');
// Dragging well past the right/bottom corner behaves like the RIGHT strip
// (larger distances decide corners; equal distances prefer horizontal).
const beforeOutside={...position},windowBeforeOutside={...window.NONO_SMART_TOUCH.viewport};
mini.fire('pointermove',400,400);
assert.equal(window.NONO_SMART_TOUCH.edgeRegion,'right');
assert.equal(position.row,beforeOutside.row,'outside auto-pan must lock to chosen row');
assert.equal(position.col,beforeOutside.col+1,'leaving the square must pan immediately');
currentTime+=600;
for(const tick of [...intervals.values()])tick();
assert.equal(position.col,beforeOutside.col+2,'holding outside repeats at strip speed');
assert.equal(window.NONO_SMART_TOUCH.viewport.left,windowBeforeOutside.left+2,
 'outside auto-pan shifts the actual miniature viewport');
mini.fire('pointermove',...positionAt(.15,.2));
assert.equal(position.row,beforeOutside.row,'re-entry must not jump');
assert.equal(position.col,beforeOutside.col+2,'re-entry must not jump');
mini.fire('pointermove',...positionAt(.99,.6));
const centerEdge=window.NONO_SMART_TOUCH.viewport.left;
currentTime+=200;
for(const tick of [...intervals.values()])tick();
assert.equal(window.NONO_SMART_TOUCH.viewport.left,centerEdge,
 'the inner square edge no longer scrolls: use the outer strip');
mini.fire('pointermove',175,86);
assert.equal(window.NONO_SMART_TOUCH.edgeRegion,'right');
const firstPan=window.NONO_SMART_TOUCH.viewport.left;
assert.ok(firstPan>centerEdge,'entering right strip pans immediately');
currentTime+=100;
for(const tick of [...intervals.values()])tick();
assert.equal(window.NONO_SMART_TOUCH.viewport.left,firstPan+1,
 'holding a side strip continues panning');
const inRail={...position};
mini.fire('pointermove',400,400); // beyond even the long rectangle
currentTime+=300;
for(const tick of [...intervals.values()])tick();
assert.equal(position.row,inRail.row);
assert.equal(position.col,inRail.col+1,'continuing outward should keep repeating');
mini.fire('pointerup',400,400);
// Each elongated strip must work even if touched directly.
for(const [direction,x,y,coordinate,sign] of [
 ['up',86,-6,'row',-1],['down',86,178,'row',1],
 ['left',-6,86,'col',-1],['right',178,86,'col',1]
]){
 position.row=35;position.col=26;change('smartMinimap');
 const before={...position};
 edges[direction].fire('pointerdown',x,y);
 assert.equal(position[coordinate],before[coordinate]+sign,direction+' strip must move once on touch');
 edges[direction].fire('pointerup',x,y);
}
// Direct buttons in the smart miniature move a single cell regardless of speed.
assert.equal(window.NONO_SMART_TOUCH.panSpeed,14);
settings.smartPanSpeed=6;
position.row=20;position.col=20;change('smartMinimap');
edges.right.fire('pointerdown',178,86);
const slowStart=position.col;
currentTime+=500;for(const tick of [...intervals.values()])tick();
assert.equal(position.col,slowStart,'holding the direct right button must NOT repeat');
edges.right.fire('pointermove',210,86);
assert.equal(position.col,slowStart,'dragging from the pressed button cannot add steps');
edges.right.fire('pointerup',210,86);
settings.smartPanSpeed=30;
edges.right.fire('pointerdown',178,86);
const fastStart=position.col;
currentTime+=500;for(const tick of [...intervals.values()])tick();
assert.equal(position.col,fastStart,'direct button remains one step even at fast speed');
edges.right.fire('pointerup',178,86);
// A new physical press gives exactly one more step.
edges.right.fire('pointerdown',178,86);
assert.equal(position.col,fastStart+1,'next button press moves exactly one cell');
edges.right.fire('pointerup',178,86);
settings.smartPanSpeed=14;
// Smart trackpad is now a fixed cross with a small central circular
// gesture target; the miniature subwindow appears on the REAL board.
position.row=20;position.col=20;change('smartTrackpad');
const boardWindow=window.NONO_SMART_TOUCH.boardWindow;
assert.equal(boardWindow.parentElement,boardRoot,
 'smart trackpad overlays actual board rather than showing mini on controller');
assert.equal(boardWindow.hidden,false);
assert.equal(boardWindow.style.left,'160px');
assert.equal(boardWindow.style.top,'170px');
assert.equal(boardWindow.style.width,'120px');
assert.equal(boardWindow.style.height,'120px');
assert.equal(window.NONO_SMART_TOUCH.crossCenter,crossCenter);
// The real puzzle outline follows selections from other input sources too.
nav.select(22,30);
window.NONO_SMART_TOUCH.refresh();
assert.equal(boardWindow.style.left,'210px','on-board window follows native D-pad selection');
nav.select(20,20);window.NONO_SMART_TOUCH.refresh();
crossCenter.fire('pointerdown',70,70);
assert.equal(position.row,20,'central circle first touch must not teleport vertically');
assert.equal(position.col,20,'central circle first touch must not teleport horizontally');
crossCenter.fire('pointermove',95,95);
assert.ok(position.row>20&&position.col>20,'central circle relative drag is freely diagonal');
const insidePos={...position};
crossCenter.fire('pointermove',400,400);
assert.equal(window.NONO_SMART_TOUCH.edgeRegion,'right');
assert.equal(position.row,insidePos.row,'trackpad outside auto-scroll stays on chosen row');
assert.equal(position.col,insidePos.col+1,'cross center outward drag pans by one cell');
assert.equal(boardWindow.parentElement,boardRoot);
assert.equal(boardWindow.hidden,false);
crossCenter.fire('pointermove',100,100);
assert.equal(position.col,insidePos.col+1,'returning to center must not bank outside distance');
crossCenter.fire('pointerup',100,100);
// Hybrid square displays the FULL puzzle miniature. It selects absolutely on
// the first touch, then keeps relative motion under pointer capture outside.
position.row=10;position.col=10;
change('smartHybrid');
assert.equal(boardWindow.hidden,true,'board overlay must hide in other input modes');
assert.equal(window.NONO_SMART_TOUCH.viewport,null,'hybrid uses full-puzzle miniature, not a sliding subsection');
const preview=zone.children.find(el=>el.className==='nono-hybrid-preview');
const marker=zone.children.find(el=>el.className==='nono-hybrid-cursor');
assert.ok(preview,'hybrid requires its own miniature drawing canvas');
assert.ok(marker,'hybrid requires a position marker');
assert.equal(preview.width,152);
assert.equal(preview.height,152);
zone.fire('pointerdown',100,100);
assert.equal(position.row,43,'first touch must jump to the absolute miniature row');
assert.equal(position.col,31,'first touch must jump to the absolute miniature column');
const first={...position};
zone.fire('pointermove',130,115);
assert.ok(position.row>first.row&&position.col>first.col,'inside drag must move relatively');
const insidePosition={...position};
zone.fire('pointermove',180,140);
const firstOutside={...position};
assert.ok(firstOutside.row>insidePosition.row&&firstOutside.col>insidePosition.col,
 'hybrid outside must keep moving on BOTH axes by finger delta');
assert.equal(window.NONO_SMART_TOUCH.edgeRegion,'center',
 'hybrid never enters directional-strip mode');
assert.equal(intervals.size,0,
 'hybrid must not start timed directional auto-scroll');
currentTime+=1000;
for(const tick of [...intervals.values()])tick();
assert.deepEqual(position,firstOutside,
 'holding outside without finger movement must NOT auto-repeat');
zone.fire('pointermove',210,155);
const fartherOutside={...position};
assert.ok(fartherOutside.row>firstOutside.row&&fartherOutside.col>firstOutside.col,
 'continued outside swipe must keep moving in both axes');
zone.fire('pointermove',130,130);
assert.ok(position.row<fartherOutside.row&&position.col<fartherOutside.col,
 're-entering square still uses ordinary relative trackpad motion');
zone.fire('pointerup',143,142);
assert.equal(window.NONO_SMART_TOUCH.active,false);
zone.fire('pointermove',260,200);
assert.equal(window.NONO_SMART_TOUCH.active,false,'lifting finger ends continuous outside movement');
// Only actively held editing locks the axis; releasing unlocks immediately.
change('smartTrackpad');position.row=30;position.col=30;held.fill=true;
crossCenter.fire('pointerdown',70,70);
crossCenter.fire('pointermove',98,77);
assert.equal(position.row,30);
assert.ok(position.col>30);
assert.ok(painted.length>0,'held editing must paint');
const beforePaintOutside={...position},paintedBeforeOutside=painted.length;
crossCenter.fire('pointermove',500,500);
assert.equal(position.row,beforePaintOutside.row,'paint action remains row locked outside');
assert.equal(position.col,beforePaintOutside.col+1,'painting past edge presses right once');
currentTime+=600;
for(const tick of [...intervals.values()])tick();
assert.ok(painted.length>paintedBeforeOutside,'outside edge hold keeps painting along locked row');
crossCenter.fire('pointermove',90,68);
const previous={...position};
held.fill=false;
crossCenter.fire('pointermove',102,88);
assert.ok(position.row>previous.row&&position.col>previous.col,
 'releasing edit must immediately restore free movement');
crossCenter.fire('pointerup',102,88);
assert.equal(window.NONO_SMART_TOUCH.active,false);
// Also run the ACTUAL production laptop-trackpad handler in a small DOM shim.
// Passive movement is 2D; only a held edit action locks the first drag axis.
const controllerSource=fs.readFileSync(path.join(__dirname,'..','controller-customization.js'),'utf8');
const laptopStart=controllerSource.indexOf('// Laptop-style relative trackpad:');
const laptopEnd=controllerSource.indexOf('// Absolute miniature:',laptopStart);
assert.ok(laptopStart>=0&&laptopEnd>laptopStart,'find laptop handler in production source');
const laptopCode=controllerSource.slice(laptopStart,laptopEnd);
const laptopZone=new Element;
let laptopAction=null;
const laptopPosition={row:20,col:20},laptopPaint=[];
const laptopNav={
 dimensions:{width:53,height:73},
 get position(){return {...laptopPosition}},
 move(dx,dy){
  laptopPosition.row=Math.max(0,Math.min(72,laptopPosition.row+dy));
  laptopPosition.col=Math.max(0,Math.min(52,laptopPosition.col+dx));
  return true;
 },
 beginStroke(){return 0},endStroke(){},
 paintLine(fr,fc,row,col,action){
  laptopPaint.push({fr,fc,row,col,action});
  return this.move(col-laptopPosition.col,row-laptopPosition.row);
 }
};
new Function('zone','touchAllowed','insideTouch','heldMiniAction','cursor','state','trackpadActive',laptopCode)(
 laptopZone,()=>true,(el,x,y)=>x>=10&&x<=162&&y>=10&&y<=162,
 ()=>laptopAction,()=>laptopNav,{trackpadSensitivity:100},null
);
laptopZone.fire('pointerdown',60,60);
laptopZone.fire('pointermove',84,84);
assert.equal(laptopPosition.row,22,'laptop free navigation must move row too');
assert.equal(laptopPosition.col,22,'laptop free navigation must move column too');
laptopZone.fire('pointermove',96,108);
assert.equal(laptopPosition.row,24,'laptop diagonal tracking continues vertically');
assert.equal(laptopPosition.col,23,'laptop diagonal tracking continues horizontally');
laptopZone.fire('pointermove',205,195);
const outsideLaptop={...laptopPosition};
assert.ok(outsideLaptop.row>24&&outsideLaptop.col>23,
 'laptop trackpad must continue moving both axes outside its bounds');
laptopZone.fire('pointermove',220,207);
assert.ok(laptopPosition.row>outsideLaptop.row&&laptopPosition.col>outsideLaptop.col,
 'laptop trackpad continues relative movement while still outside');
laptopZone.fire('pointerup',220,207);
laptopAction='fill';laptopPosition.row=20;laptopPosition.col=20;
laptopZone.fire('pointerdown',60,60);
laptopZone.fire('pointermove',96,69);
assert.equal(laptopPosition.row,20,'held fill locks row on horizontal drag');
assert.equal(laptopPosition.col,23,'held fill paints horizontally');
assert.ok(laptopPaint.length>0,'edit drag invokes paintLine');
laptopAction=null;
laptopZone.fire('pointermove',108,82); // unlock without teleporting
const lockedPosition={...laptopPosition};
laptopZone.fire('pointermove',120,94);
assert.equal(laptopPosition.row,lockedPosition.row+1,'releasing action restores vertical movement');
assert.equal(laptopPosition.col,lockedPosition.col+1,'releasing action restores horizontal movement');
laptopZone.fire('pointerup',120,94);
console.log('LAPTOP_TRACKPAD_PASS: diagonal inside/outside and editing-only axis lock');
console.log('SMART_TOUCH_PASS: cross center, actual board window, miniature edges and hybrid gestures');
