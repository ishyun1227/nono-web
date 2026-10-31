/* Sliding puzzle-window controls and a full-grid miniature + relative-drag hybrid.
   The authoritative selection/paint/history pipeline is NONO_TOUCH_CURSOR. */
(()=>{'use strict';
const pad=document.getElementById('nono-mobile-pad');
const mini=document.getElementById('nono-absolute-pad');
const zone=document.getElementById('nono-floating-zone');
const crossCenter=pad?.querySelector('.nono-dpad .nono-pad-center');
if(!pad||!mini||!zone||!crossCenter)return;
const modes=new Set(['smartTrackpad','smartMinimap','smartHybrid']);
const nav=()=>window.NONO_TOUCH_CURSOR;
const settings=()=>window.NONO_INPUT_CUSTOM?.settings||{};
const mode=()=>settings().mode;
const bound=(v,low,high)=>Math.max(low,Math.min(high,v));
const live=()=>modes.has(mode())&&!pad.hidden&&
 matchMedia('(max-width:900px) and (pointer:coarse)').matches&&
 !document.getElementById('game')?.classList.contains('hidden')&&
 document.getElementById('lobby')?.classList.contains('hidden')&&
 !document.getElementById('nono-settings-overlay');
const actionButtons=pad.querySelector('.nono-pad-actions');
function heldAction(){
 for(const key of ['fill','cross','clear'])
  if(actionButtons.querySelector('[data-nono-input="'+key+'"].is-held'))return key;
 return null;
}
const miniLabel=mini.querySelector('.nono-absolute-label');
const miniCursor=mini.querySelector('.nono-absolute-cursor');
// The smart trackpad uses the fixed D-pad with a small tactile center.
// Its sliding 8–20-cell window is outlined ON the real puzzle, not on the pad.
const boardWindow=document.createElement('div');
boardWindow.className='nono-smart-board-window';
boardWindow.setAttribute('aria-hidden','true');
boardWindow.hidden=true;
function updateBoardWindow(){
 if(mode()!=='smartTrackpad'||!live()||!viewport){
  boardWindow.hidden=true;return;
 }
 const board=document.getElementById('board');
 const cells=board?.querySelector('.cells');
 const d=dimensions(),v=viewport;
 if(!board||!cells||!d||!v)return;
 const first=cells.children[v.top*d.width+v.left];
 const last=cells.children[(v.top+v.rows-1)*d.width+v.left+v.cols-1];
 if(!first||!last)return;
 if(boardWindow.parentElement!==board)board.append(boardWindow);
 // Coordinates are measured against the actual rendered puzzle, so zoom,
 // cell sizing and 53x73 or 100x100 boards all keep the outline aligned.
 const b=board.getBoundingClientRect();
 const a=first.getBoundingClientRect(),z=last.getBoundingClientRect();
 const sx=b.width/Math.max(1,board.offsetWidth),sy=b.height/Math.max(1,board.offsetHeight);
 boardWindow.style.left=(a.left-b.left)/sx+'px';
 boardWindow.style.top=(a.top-b.top)/sy+'px';
 boardWindow.style.width=(z.right-a.left)/sx+'px';
 boardWindow.style.height=(z.bottom-a.top)/sy+'px';
 boardWindow.hidden=false;
}
const grid=document.createElement('div');
grid.className='nono-smart-window-grid';
grid.setAttribute('aria-hidden','true');
mini.prepend(grid);
// The ordinary miniature shows the player's FULL board progress, never answers.
const regularCanvas=document.createElement('canvas');
regularCanvas.className='nono-mini-progress-preview';
regularCanvas.width=152;regularCanvas.height=152;
regularCanvas.setAttribute('aria-hidden','true');
mini.prepend(regularCanvas);
let regularDirty=true,regularPending=false,regularWidth=0,regularHeight=0;
function updateRegularMiniPreview(force=false){
 if(mode()!=='minimap')return;
 if(force)regularDirty=true;
 if(regularPending)return;
 regularPending=true;requestAnimationFrame(drawRegularMiniPreview);
}
function drawRegularMiniPreview(){
 regularPending=false;
 if(mode()!=='minimap')return;
 const d=nav()?.dimensions;
 if(!d?.width||!d.height)return;
 if(!regularDirty&&regularWidth===d.width&&regularHeight===d.height)return;
 const ctx=regularCanvas.getContext?.('2d');if(!ctx)return;
 regularDirty=false;regularWidth=d.width;regularHeight=d.height;
 drawProgressPreview(ctx,d,152,152);
}
// The hybrid's square is a miniature of the FULL puzzle (not the answer).
// Its first touch is absolute; continued movement uses trackpad deltas.
const hybridCanvas=document.createElement('canvas');
hybridCanvas.width=152;hybridCanvas.height=152;
hybridCanvas.className='nono-hybrid-preview';
hybridCanvas.setAttribute('aria-hidden','true');
const hybridCursor=document.createElement('div');
hybridCursor.className='nono-hybrid-cursor';
hybridCursor.setAttribute('aria-hidden','true');
zone.prepend(hybridCanvas,hybridCursor);
let hybridDrawPending=false,hybridPaintDirty=true,hybridPreviewWidth=0,hybridPreviewHeight=0;
function drawProgressPreview(ctx,d,canvasWidth,canvasHeight){
 ctx.clearRect(0,0,canvasWidth,canvasHeight);
 ctx.fillStyle='#203850';ctx.fillRect(0,0,canvasWidth,canvasHeight);
 const cells=document.querySelector('#board .cells')?.children;
 if(!cells)return;
 const cw=canvasWidth/d.width,ch=canvasHeight/d.height;
 for(let row=0;row<d.height;row++)for(let col=0;col<d.width;col++){
  const cell=cells[row*d.width+col];
  if(!cell)continue;
  if(cell.classList.contains('filled')){
   ctx.fillStyle='#a2e8db';
   ctx.fillRect(col*cw,row*ch,Math.max(cw,.65),Math.max(ch,.65));
  }else if(cell.classList.contains('cross')){
   ctx.fillStyle='#b496b9';
   ctx.fillRect(col*cw+cw*.3,row*ch+ch*.3,Math.max(cw*.4,.5),Math.max(ch*.4,.5));
  }
 }
 ctx.strokeStyle='#85a6c66e';ctx.lineWidth=.5;
 const step=5;
 ctx.beginPath();
 for(let col=step;col<d.width;col+=step){
  const x=Math.round(col*cw)+.25;ctx.moveTo(x,0);ctx.lineTo(x,canvasHeight);
 }
 for(let row=step;row<d.height;row+=step){
  const y=Math.round(row*ch)+.25;ctx.moveTo(0,y);ctx.lineTo(canvasWidth,y);
 }
 ctx.stroke();
}
function drawHybridPreview(){
 hybridDrawPending=false;
 if(mode()!=='smartHybrid')return;
 const d=nav()?.dimensions;
 if(!d||!d.width||!d.height)return;
 const canvasWidth=152,canvasHeight=152;
 if(hybridCanvas.width!==canvasWidth||hybridCanvas.height!==canvasHeight){
  hybridCanvas.width=canvasWidth;hybridCanvas.height=canvasHeight;
  hybridPaintDirty=true;
 }
 const ctx=hybridCanvas.getContext?.('2d');
 if(!ctx)return;
 const p=nav()?.position;
 if(p){
  hybridCursor.style.left=((p.col+.5)/d.width*100)+'%';
  hybridCursor.style.top=((p.row+.5)/d.height*100)+'%';
 }
 if(!hybridPaintDirty&&hybridPreviewWidth===d.width&&hybridPreviewHeight===d.height)return;
 hybridPaintDirty=false;hybridPreviewWidth=d.width;hybridPreviewHeight=d.height;
 drawProgressPreview(ctx,d,canvasWidth,canvasHeight);
}
function updateHybridPreview(force=false){
 if(mode()!=='smartHybrid')return;
 if(force)hybridPaintDirty=true;
 const d=nav()?.dimensions,p=nav()?.position;
 if(d&&p){
  hybridCursor.style.left=((p.col+.5)/d.width*100)+'%';
  hybridCursor.style.top=((p.row+.5)/d.height*100)+'%';
 }
 if(!hybridDrawPending){
  hybridDrawPending=true;
  requestAnimationFrame(drawHybridPreview);
 }
}
// Distinct narrow touch strips around the stationary smart viewport.
const edgeRail=document.createElement('div');
edgeRail.id='nono-smart-edge-rail';
edgeRail.setAttribute('role','group');
const edgeButtons={};
for(const [direction,glyph,label] of [
 ['up','▲','위쪽 구간 이동'],['down','▼','아래쪽 구간 이동'],
 ['left','◀','왼쪽 구간 이동'],['right','▶','오른쪽 구간 이동']
]){
 const button=document.createElement('button');
 button.type='button';button.className='nono-smart-edge-key nono-smart-edge-'+direction;
 button.dataset.nonoSmartEdge=direction;button.textContent=glyph;
 button.setAttribute('aria-label',label);
 edgeRail.append(button);edgeButtons[direction]=button;
}
pad.prepend(edgeRail);
let viewport=null,gesture=null,edgeTimer=null,edgeLast=0;
const supported=()=>['smartTrackpad','smartMinimap'].includes(mode());
// Pointer capture deliberately keeps delivery outside an element. Do not let
// the captured pointer select, paint or auto-scroll outside the actual region.
function inside(element,x,y){
 const r=element.getBoundingClientRect();
 return r.width>0&&r.height>0&&x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;
}
const vectors={up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}};
function hitZone(x,y){
 if(inside(mini,x,y))return 'center';
 for(const dir of ['up','down','left','right'])
  if(inside(edgeButtons[dir],x,y))return dir;
 return null;
}
// Dragging beyond any edge emulates holding the corresponding rectangle.
// Pick the largest exterior offset at corners so painting stays axis-locked.
function dragRegion(kind,x,y){
 const square=kind==='smartHybrid'?zone:kind==='smartTrackpad'?crossCenter:mini;
 if(inside(square,x,y))return 'center';
 if(kind==='smartMinimap'){
  const strip=hitZone(x,y);
  if(strip)return strip;
 }
 const r=square.getBoundingClientRect();
 if(!r.width||!r.height)return null;
 const distances={
  right:Math.max(0,x-r.right),left:Math.max(0,r.left-x),
  down:Math.max(0,y-r.bottom),up:Math.max(0,r.top-y)
 };
 let winner=null,max=0;
 for(const dir of ['right','left','down','up']){
  if(distances[dir]>max){max=distances[dir];winner=dir;}
 }
 return winner;
}
function dimensions(){return nav()?.dimensions||null}
function initWindow(reset=false){
 if(!supported())return;
 const d=dimensions(),p=nav()?.position;
 if(!d||!p)return;
 const size=Number(settings().smartWindowCells)||12;
 const cols=Math.min(d.width,size),rows=Math.min(d.height,size);
 if(reset||!viewport||viewport.cols!==cols||viewport.rows!==rows||
    viewport.width!==d.width||viewport.height!==d.height){
  viewport={width:d.width,height:d.height,cols,rows,
   left:bound(p.col-Math.floor(cols/2),0,d.width-cols),
   top:bound(p.row-Math.floor(rows/2),0,d.height-rows)};
 }
}
function includeCursor(){
 if(!supported())return;
 initWindow();
 if(!viewport)return;
 const p=nav()?.position;if(!p)return;
 const v=viewport;
 v.left=bound(p.col<v.left?p.col:p.col>=v.left+v.cols?p.col-v.cols+1:v.left,0,v.width-v.cols);
 v.top=bound(p.row<v.top?p.row:p.row>=v.top+v.rows?p.row-v.rows+1:v.top,0,v.height-v.rows);
}
function updateWindow(){
 if(mode()==='smartHybrid'){updateHybridPreview(false);return;}
 if(!supported())return;
 includeCursor();
 if(mode()==='smartTrackpad'){
  updateBoardWindow();
  return;
 }
 const v=viewport,p=nav()?.position;if(!v||!p)return;
 const t=window.NONO_I18N?.translate;
 const rowWord=typeof t==='function'?t('행'):'행';
 const colWord=typeof t==='function'?t('열'):'열';
 const tMode=typeof t==='function'?t(mode()==='smartTrackpad'?'스마트 터치패드':'스마트 축소판'):
   (mode()==='smartTrackpad'?'스마트 터치패드':'스마트 축소판');
 miniLabel.textContent=tMode+' · '+rowWord+' '+(v.top+1)+'–'+(v.top+v.rows)+' · '+colWord+' '+(v.left+1)+'–'+(v.left+v.cols);
 miniCursor.style.left=((p.col-v.left+.5)/v.cols*100)+'%';
 miniCursor.style.top=((p.row-v.top+.5)/v.rows*100)+'%';
 grid.style.gridTemplateColumns='repeat('+v.cols+',minmax(0,1fr))';
 grid.style.gridTemplateRows='repeat('+v.rows+',minmax(0,1fr))';
 const boardCells=document.querySelector('#board .cells')?.children;
 const count=v.cols*v.rows;
 if(grid.children.length!==count){
  const fragment=document.createDocumentFragment();
  for(let i=0;i<count;i++)fragment.append(document.createElement('i'));
  grid.replaceChildren(fragment);
 }
 for(let i=0;i<count;i++){
  const row=v.top+Math.floor(i/v.cols),col=v.left+i%v.cols;
  const source=boardCells?.[row*v.width+col];
  const el=grid.children[i];
  const state=source?.classList.contains('filled')?' is-filled':
   source?.classList.contains('cross')?' is-cross':'';
  const className='nono-smart-cell'+state;
  if(el.className!==className)el.className=className;
 }
}
function selection(row,col,action=null,stroke=null){
 const d=dimensions();if(!d)return false;
 row=bound(Math.trunc(row),0,d.height-1);
 col=bound(Math.trunc(col),0,d.width-1);
 const p=nav()?.position;if(!p)return false;
 if(action&&stroke){
  if(!stroke.axis)return false;
  if(stroke.axis==='x')row=stroke.anchor.row;
  else col=stroke.anchor.col;
  const changed=row!==p.row||col!==p.col;
  if(changed){
   nav()?.paintLine?.(p.row,p.col,row,col,action);
   if(mode()==='smartHybrid')updateHybridPreview(true);
  }else return true;
 }else nav()?.select(row,col);
 updateWindow();
 return true;
}
function localPosition(event){
 if(!viewport)return null;
 const r=mini.getBoundingClientRect(),inset=3,v=viewport;
 const fx=bound((event.clientX-r.left-inset)/Math.max(1,r.width-inset*2),0,.999999);
 const fy=bound((event.clientY-r.top-inset)/Math.max(1,r.height-inset*2),0,.999999);
 return {row:v.top+Math.floor(fy*v.rows),col:v.left+Math.floor(fx*v.cols)};
}
function absolutePosition(event,element){
 const d=dimensions();if(!d)return null;
 const r=element.getBoundingClientRect(),inset=3;
 const x=bound((event.clientX-r.left-inset)/Math.max(1,r.width-2*inset),0,.999999);
 const y=bound((event.clientY-r.top-inset)/Math.max(1,r.height-2*inset),0,.999999);
 return {row:Math.floor(y*d.height),col:Math.floor(x*d.width)};
}
function refreshAction(a,event){
 const action=heldAction();
 if(action===a.action)return;
 if(a.stroke!==null)nav()?.endStroke?.(a.stroke);
 a.stroke=action?nav()?.beginStroke?.()??null:null;
 a.action=action;a.axis=null;
 a.anchor={...nav().position};
 a.originX=event.clientX;a.originY=event.clientY;
 a.residualX=0;a.residualY=0;
}
function chooseAxis(a,event){
 if(a.axis||!a.action)return;
 const dx=event.clientX-a.originX,dy=event.clientY-a.originY;
 if(Math.max(Math.abs(dx),Math.abs(dy))>=5)a.axis=Math.abs(dx)>=Math.abs(dy)?'x':'y';
}
function moveRelative(a,event){
 const deltaX=event.clientX-a.lastX,deltaY=event.clientY-a.lastY;
 a.lastX=event.clientX;a.lastY=event.clientY;
 refreshAction(a,event);
 chooseAxis(a,event);
 const px=12*100/(settings().trackpadSensitivity||100);
 a.residualX+=deltaX;a.residualY+=deltaY;
 let dx=bound(Math.trunc(a.residualX/px),-40,40);
 let dy=bound(Math.trunc(a.residualY/px),-40,40);
 a.residualX-=dx*px;a.residualY-=dy*px;
 if(a.action){
  if(!a.axis)return;
  if(a.axis==='x')dy=0;
  else dx=0;
 }
 if(!dx&&!dy)return;
 const p=nav()?.position;if(!p)return;
 selection(p.row+dy,p.col+dx,a.action,a);
}
function moveAbsolute(a,event){
 refreshAction(a,event);
 chooseAxis(a,event);
 const p=localPosition(event);if(!p)return;
 if(a.action&&!a.axis)return;
 selection(p.row,p.col,a.action,a);
}
function edgeDirection(a){
 if(!a||a.outside||a.mode==='smartHybrid')return null;
 const region=dragRegion(a.mode,a.lastX,a.lastY);
 return region===a.region?vectors[region]||null:null;
}
function edgeStep(){
 const a=gesture;if(!a||!live()||!supported())return;
 const dir=edgeDirection(a);if(!dir){edgeLast=0;return;}
 const now=Date.now(),speed=bound(Number(settings().smartPanSpeed)||14,6,30);
 if(edgeLast&&now-edgeLast<1000/speed)return;
 edgeLast=now;
 refreshAction(a,{clientX:a.lastX,clientY:a.lastY});
 if(a.action&&!a.axis)a.axis=Math.abs(dir.x)>=Math.abs(dir.y)?'x':'y';
 const dx=a.action&&a.axis==='y'?0:dir.x;
 const dy=a.action&&a.axis==='x'?0:dir.y;
 const p=nav()?.position;if(!p)return;
 const d=dimensions();
 const nextRow=bound(p.row+dy,0,d.height-1);
 const nextCol=bound(p.col+dx,0,d.width-1);
 if(nextRow===p.row&&nextCol===p.col)return;
 // Smart windows pan the miniature; hybrid advances its full-board cursor.
 // Both use the same speed, direction, and paint-axis lock.
 const left=viewport?.left,top=viewport?.top;
 selection(nextRow,nextCol,a.action,a);
 if(viewport){
  viewport.left=bound(left+dx,0,viewport.width-viewport.cols);
  viewport.top=bound(top+dy,0,viewport.height-viewport.rows);
  updateWindow();
 }
}
function stop(){
 const a=gesture;gesture=null;edgeLast=0;
 if(a?.mode==='smartHybrid')updateHybridPreview(true);
 if(a?.stroke!==null&&a?.stroke!==undefined)nav()?.endStroke?.(a.stroke);
 if(edgeTimer!==null){clearInterval(edgeTimer);edgeTimer=null;}
 if(a?.element?.hasPointerCapture?.(a.id))
  try{a.element.releasePointerCapture(a.id)}catch(_){}
}
function begin(event,kind,element){
 if(!live()||mode()!==kind||gesture||event.button!==0)return;
 const region=kind==='smartHybrid'?
  (inside(zone,event.clientX,event.clientY)?'center':null):
  kind==='smartTrackpad'?
  (inside(crossCenter,event.clientX,event.clientY)?'center':null):
  hitZone(event.clientX,event.clientY);
 if(!region)return;
 event.preventDefault();
 if(kind!=='smartHybrid')initWindow();
 const action=heldAction();
 const p=kind==='smartMinimap'&&region==='center'?localPosition(event):
   kind==='smartHybrid'?absolutePosition(event,zone):nav()?.position;
 if(!p)return;
 const a={id:event.pointerId,mode:kind,element,startedAt:Date.now(),
  lastX:event.clientX,lastY:event.clientY,outside:false,region,
  directEdge:element!==mini&&element!==zone&&element!==crossCenter,
  originX:event.clientX,originY:event.clientY,
  residualX:0,residualY:0,axis:null,action,anchor:{...p},
  stroke:action?nav()?.beginStroke?.()??null:null};
 gesture=a;
 nav()?.select(p.row,p.col);
 if(action&&kind!=='smartTrackpad'&&region==='center'){
  nav()?.paintAt?.(p.row,p.col,action);
  if(kind==='smartHybrid')updateHybridPreview(true);
 }
 updateWindow();
 try{element.setPointerCapture(event.pointerId)}catch(_){}
 // Hybrid never uses the outer directional strips or timed auto-repeat.
 // Captured movement outside the miniature remains relative to finger travel.
 if(kind!=='smartHybrid'){
  edgeLast=0;
  if(region!=='center')edgeStep();
  // Direct strip presses are a SINGLE D-pad step, with no hold-repeat.
  if(!a.directEdge)edgeTimer=setInterval(edgeStep,16);
 }
}
function move(event,kind){
 const a=gesture;
 if(!a||a.id!==event.pointerId||a.mode!==kind)return;
 if(!live()){stop();return;}
 event.preventDefault();
 if(a.directEdge)return; // no movement after initial direct press
 if(kind==='smartHybrid'){
  // Preserve the same delta-based trackpad behaviour both inside and outside
  // the square. Pointer capture delivers the entire ongoing finger stroke.
  // Painting retains its row/column lock, but navigation stays free in 2D.
  a.outside=false;a.region='center';
  moveRelative(a,event);
  return;
 }
 // Only smart trackpad and smart miniature emulate directional strips
 // after the touch leaves their square.
 const region=dragRegion(kind,event.clientX,event.clientY);
 if(!region){
  a.outside=true;a.region=null;a.lastX=event.clientX;a.lastY=event.clientY;
  a.residualX=0;a.residualY=0;edgeLast=0;return;
 }
 if(region!=='center'){
  const changed=a.region!==region||a.outside;
  a.region=region;a.outside=false;
  a.lastX=event.clientX;a.lastY=event.clientY;
  if(changed){
   a.originX=event.clientX;a.originY=event.clientY;
   a.residualX=0;a.residualY=0;edgeLast=0;
   refreshAction(a,event);
   edgeStep();
  }
  return;
 }
 if(a.outside||a.region!=='center'){
  // Re-entering never accumulates displacement from outside the touch area.
  a.outside=false;a.region='center';
  a.lastX=event.clientX;a.lastY=event.clientY;
  a.originX=event.clientX;a.originY=event.clientY;
  a.residualX=0;a.residualY=0;edgeLast=0;
  refreshAction(a,event);
  return;
 }
 if(kind==='smartMinimap'){
  a.lastX=event.clientX;a.lastY=event.clientY;
  moveAbsolute(a,event);
 }else moveRelative(a,event);
}
for(const [element,kind] of [[crossCenter,'smartTrackpad'],[mini,'smartMinimap'],[zone,'smartHybrid']]){
 element.addEventListener('pointerdown',event=>begin(event,kind,element));
 element.addEventListener('pointermove',event=>move(event,kind));
 for(const name of ['pointerup','pointercancel','lostpointercapture'])
  element.addEventListener(name,event=>{
   if(gesture?.id===event.pointerId&&gesture.element===element)stop();
  });
}
// Starting on a side strip and dragging from the center both scroll.
for(const button of Object.values(edgeButtons)){
 button.addEventListener('pointerdown',event=>{if(mode()==='smartMinimap')begin(event,mode(),button)});
 button.addEventListener('pointermove',event=>{
  if(gesture?.element===button)move(event,gesture.mode);
 });
 for(const name of ['pointerup','pointercancel','lostpointercapture'])
  button.addEventListener(name,event=>{
   if(gesture?.id===event.pointerId&&gesture.element===button)stop();
  });
}
function updateEdgeLabels(){
 const t=window.NONO_I18N?.translate;
 const labels={up:'위쪽 구간 이동',down:'아래쪽 구간 이동',
  left:'왼쪽 구간 이동',right:'오른쪽 구간 이동'};
 for(const [dir,label] of Object.entries(labels)){
  edgeButtons[dir].setAttribute('aria-label',typeof t==='function'?t(label):label);
 }
}
function updateHybridLabel(){
 const t=window.NONO_I18N?.translate;
 zone.dataset.smartHybridText=typeof t==='function'?
  t('스마트 혼합형'):'스마트 혼합형';
}
let currentMode=null;
function sync(){
 updateHybridLabel();updateEdgeLabels();
 boardWindow.hidden=mode()!=='smartTrackpad';
 if(currentMode!==mode()){stop();currentMode=mode();}
 if(mode()==='minimap'){
  stop();viewport=null;updateRegularMiniPreview(true);return;
 }
 if(!modes.has(mode())){stop();viewport=null;return;}
 if(mode()==='smartHybrid'){
  viewport=null;hybridPaintDirty=true;updateHybridPreview(true);return;
 }
 initWindow(true);
 updateWindow();
}
window.addEventListener('nono:smart-controls-change',sync);
window.addEventListener('nono:touch-cursor',()=>{if(modes.has(mode()))updateWindow()});
window.addEventListener('resize',()=>{if(supported())updateWindow()});
window.addEventListener('nono:languagechange',()=>{
 updateHybridLabel();updateEdgeLabels();updateWindow();
 updateRegularMiniPreview();
});
window.addEventListener('nono:puzzle-started',()=>{
 updateHybridPreview(true);updateRegularMiniPreview(true);
});
// Reflect keyboard, multiplayer and Undo/Redo changes in the miniature too.
// Ignore selection-only class changes to avoid repainting on every cursor move.
const boardRoot=document.getElementById('board');
if(boardRoot&&typeof MutationObserver==='function'){
 const observer=new MutationObserver(records=>{
  // buildBoard() replaces the board's children when a puzzle changes.
  // Reattach the non-interactive window once, without touching cell indexes.
  if(mode()==='smartTrackpad'){
   const rebuild=records.some(r=>r.type==='childList'&&r.target===boardRoot);
   const cursorMoved=records.some(r=>r.type==='attributes'&&r.attributeName==='class'&&
    r.target?.classList?.contains('cell')&&
    (/(?:^|\s)active(?:\s|$)/.test(r.oldValue||'')!==r.target.classList.contains('active')));
   // Native D-pad/gamepad keys update selection classes without firing
   // the dedicated smart-control event. Keep the on-board outline synced.
   if((rebuild&&boardWindow.parentElement!==boardRoot)||cursorMoved)updateWindow();
   return;
  }
  if(mode()!=='smartHybrid'&&mode()!=='minimap')return;
  const changed=records.some(record=>{
   if(record.type==='childList')return true;
   const previous=(record.oldValue||'').split(/\s+/);
   const current=record.target?.classList;
   return previous.includes('filled')!==!!current?.contains('filled')||
     previous.includes('cross')!==!!current?.contains('cross');
  });
  if(changed){
   updateHybridPreview(true);updateRegularMiniPreview(true);
  }else if(records.some(record=>record.type==='attributes')){
   updateHybridPreview(false);updateRegularMiniPreview(false);
  }
 });
 observer.observe(boardRoot,{subtree:true,childList:true,attributes:true,
  attributeFilter:['class'],attributeOldValue:true});
}
window.addEventListener('blur',stop);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
window.NONO_SMART_TOUCH={get viewport(){return viewport?{...viewport}:null},
 get active(){return !!gesture},get mode(){return mode()},refresh:updateWindow,
 get edgeRegion(){return gesture?.region??null},
 get panSpeed(){return bound(Number(settings().smartPanSpeed)||14,6,30)},
 get boardWindow(){return boardWindow},get crossCenter(){return crossCenter}
};
sync();
})();
