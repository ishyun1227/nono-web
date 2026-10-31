/* Sliding puzzle-window controls and a frameless absolute+relative hybrid.
   The authoritative selection/paint/history pipeline is NONO_TOUCH_CURSOR. */
(()=>{'use strict';
const pad=document.getElementById('nono-mobile-pad');
const mini=document.getElementById('nono-absolute-pad');
const zone=document.getElementById('nono-floating-zone');
if(!pad||!mini||!zone)return;
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
const grid=document.createElement('div');
grid.className='nono-smart-window-grid';
grid.setAttribute('aria-hidden','true');
mini.prepend(grid);
let viewport=null,gesture=null,edgeTimer=null,edgeLast=0;
const supported=()=>['smartTrackpad','smartMinimap'].includes(mode());
// Pointer capture deliberately keeps delivery outside an element. Do not let
// the captured pointer select, paint or auto-scroll outside the actual region.
function inside(element,x,y){
 const r=element.getBoundingClientRect();
 return r.width>0&&r.height>0&&x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;
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
 if(!supported())return;
 includeCursor();
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
  if(changed)nav()?.paintLine?.(p.row,p.col,row,col,action);
  else return true;
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
 if(!a||a.outside||a.mode==='smartHybrid'||!inside(mini,a.lastX,a.lastY))return null;
 const r=mini.getBoundingClientRect(),margin=13;
 const x=a.lastX>=r.right-margin?1:a.lastX<=r.left+margin?-1:0;
 const y=a.lastY>=r.bottom-margin?1:a.lastY<=r.top+margin?-1:0;
 if(!x&&!y)return null;
 return {x,y};
}
function edgeStep(){
 const a=gesture;if(!a||!live()||!supported())return;
 const dir=edgeDirection(a);if(!dir){edgeLast=0;return;}
 if(Date.now()-a.startedAt<280)return;
 const now=Date.now();if(now-edgeLast<100)return;
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
 // Pan the displayed subsection once per tick, then advance the cursor.
 // Preserve the old offset to avoid double-panning when includeCursor runs.
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
 if(a?.stroke!==null&&a?.stroke!==undefined)nav()?.endStroke?.(a.stroke);
 if(edgeTimer!==null){clearInterval(edgeTimer);edgeTimer=null;}
 if(a?.element?.hasPointerCapture?.(a.id))
  try{a.element.releasePointerCapture(a.id)}catch(_){}
}
function begin(event,kind,element){
 if(!live()||mode()!==kind||gesture||event.button!==0||
    !inside(element,event.clientX,event.clientY))return;
 event.preventDefault();
 if(kind!=='smartHybrid')initWindow();
 const action=heldAction();
 const p=kind==='smartMinimap'?localPosition(event):
   kind==='smartHybrid'?absolutePosition(event,zone):nav()?.position;
 if(!p)return;
 const a={id:event.pointerId,mode:kind,element,startedAt:Date.now(),
  lastX:event.clientX,lastY:event.clientY,outside:false,
  originX:event.clientX,originY:event.clientY,
  residualX:0,residualY:0,axis:null,action,anchor:{...p},
  stroke:action?nav()?.beginStroke?.()??null:null};
 gesture=a;
 nav()?.select(p.row,p.col);
 // If an action was already held before touching the surface, the new
 // starting cell is marked using the non-toggle drag semantics.
 if(action&&kind!=='smartTrackpad')nav()?.paintAt?.(p.row,p.col,action);
 if(kind!=='smartHybrid')updateWindow();
 try{element.setPointerCapture(event.pointerId)}catch(_){}
 if(kind!=='smartHybrid')edgeTimer=setInterval(edgeStep,80);
}
function move(event,kind){
 const a=gesture;
 if(!a||a.id!==event.pointerId||a.mode!==kind)return;
 if(!live()){stop();return;}
 event.preventDefault();
 if(!inside(a.element,event.clientX,event.clientY)){
  // Stop immediately even though pointer capture continues to deliver events.
  a.outside=true;a.lastX=event.clientX;a.lastY=event.clientY;
  a.residualX=0;a.residualY=0;edgeLast=0;return;
 }
 if(a.outside){
  // Re-entry starts a fresh local finger reference; never jump by the
  // distance traveled outside the control. Keep the ongoing paint axis.
  a.outside=false;a.lastX=event.clientX;a.lastY=event.clientY;
  a.originX=event.clientX;a.originY=event.clientY;
  a.residualX=0;a.residualY=0;a.startedAt=Date.now();
  refreshAction(a,event);
  return;
 }
 if(kind==='smartMinimap'){
  a.lastX=event.clientX;a.lastY=event.clientY;
  moveAbsolute(a,event);
 }else moveRelative(a,event);
 if(kind!=='smartHybrid'){
  const edge=edgeDirection(a);
  if(!edge)a.startedAt=Date.now();
 }
}
for(const [element,kind] of [[mini,'smartTrackpad'],[mini,'smartMinimap'],[zone,'smartHybrid']]){
 element.addEventListener('pointerdown',event=>begin(event,kind,element));
 element.addEventListener('pointermove',event=>move(event,kind));
 for(const name of ['pointerup','pointercancel','lostpointercapture'])
  element.addEventListener(name,event=>{if(gesture?.id===event.pointerId&&gesture.mode===kind)stop()});
}
function updateHybridLabel(){
 const t=window.NONO_I18N?.translate;
 zone.dataset.smartHybridText=typeof t==='function'?
  t('첫 터치 위치 선택 · 드래그 이동'):'첫 터치 위치 선택 · 드래그 이동';
}
function sync(){
 updateHybridLabel();
 if(!modes.has(mode())){stop();viewport=null;return;}
 if(!supported()){viewport=null;return;}
 initWindow(true);
 updateWindow();
}
window.addEventListener('nono:smart-controls-change',sync);
window.addEventListener('nono:touch-cursor',()=>{if(supported())updateWindow()});
window.addEventListener('resize',()=>{if(supported())updateWindow()});
window.addEventListener('nono:languagechange',()=>{updateHybridLabel();updateWindow()});
window.addEventListener('blur',stop);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
window.NONO_SMART_TOUCH={get viewport(){return viewport?{...viewport}:null},
 get active(){return !!gesture},get mode(){return mode()},refresh:updateWindow};
sync();
})();
