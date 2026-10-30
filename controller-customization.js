/* NONO touch/controller preferences. Layers onto controller-input.js, preserving the game's native input system. */
(()=>{'use strict';
const pad=document.getElementById('nono-mobile-pad');
if(!pad)return;
const $=id=>document.getElementById(id);
const storageKey='nono-input-settings-v1';
const defaults=()=>({mode:'fixed',opacity:80,size:100,trackpadSensitivity:100,
 dpad:{x:.21,y:.83},actions:{x:.79,y:.83},
 offsets:{fill:[0,0],cross:[0,0],clear:[0,0],undo:[0,0]},
 controllerEnabled:true,deadzone:55,stick:true,
 mapping:{fill:0,cross:1,clear:2,undo:4,redo:5}});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const clone=v=>JSON.parse(JSON.stringify(v));
function validate(src){
 const d=defaults(),s=src&&typeof src==='object'?src:{};
 const out={...d,...s,offsets:{...d.offsets,...s.offsets},mapping:{...d.mapping,...s.mapping}};
 out.mode=['fixed','floating','trackpad','minimap'].includes(out.mode)?out.mode:'fixed';
 out.trackpadSensitivity=clamp(Number(out.trackpadSensitivity)||100,50,200);
 out.opacity=clamp(Number(out.opacity)||80,20,100);out.size=clamp(Number(out.size)||100,65,150);
 out.deadzone=clamp(Number(out.deadzone)||55,20,85);out.stick=out.stick!==false;
 out.controllerEnabled=out.controllerEnabled!==false;
 for(const key of ['dpad','actions']){
  const p=s[key]||d[key];
  out[key]={x:clamp(Number(p.x)||d[key].x,.1,.9),y:clamp(Number(p.y)||d[key].y,.17,.96)};
 }
 for(const key of Object.keys(d.offsets)){
  const v=out.offsets[key];
  out.offsets[key]=Array.isArray(v)?[clamp(Number(v[0])||0,-60,60),clamp(Number(v[1])||0,-60,60)]:[0,0];
 }
 for(const key of Object.keys(d.mapping)){
  const v=Number(out.mapping[key]);
  out.mapping[key]=Number.isInteger(v)&&v>=0&&v<=15?v:d.mapping[key];
 }
 return out;
}
let state;try{state=validate(JSON.parse(localStorage.getItem(storageKey)||'null'))}catch(_){state=defaults()}
const api={get settings(){return clone(state)},set:setValue,reset,edit:beginEdit};
window.NONO_INPUT_CUSTOM=api;
function save(){try{localStorage.setItem(storageKey,JSON.stringify(state))}catch(_){}}
function setValue(key,value){
 if(!(key in defaults()))return;
 state=validate({...state,[key]:value});save();apply();
 if(key==='mode'||key==='size')window.dispatchEvent(new Event('resize'));
}
function reset(){state=defaults();save();apply();window.dispatchEvent(new Event('resize'));refreshCustomSettings()}
const actionGroup=pad.querySelector('.nono-pad-actions'),dpadGroup=pad.querySelector('.nono-dpad');
const actions=['fill','cross','clear','undo'];
const positions=['dpad','actions'];
dpadGroup.insertAdjacentHTML('afterbegin','<span class="nono-pad-drag-handle" data-move-group="dpad">✥ 이동</span>');
actionGroup.insertAdjacentHTML('afterbegin','<span class="nono-pad-drag-handle" data-move-group="actions">✥ 이동</span>');
const top=pad.querySelector('.nono-pad-top');
const settingsButton=document.createElement('button');
settingsButton.id='nono-pad-preferences';settingsButton.type='button';settingsButton.textContent='⚙ 설정';
top.insertBefore(settingsButton,top.querySelector('#nono-pad-collapse'));
const zone=document.createElement('div');zone.id='nono-floating-zone';
zone.setAttribute('aria-label','손가락을 움직인 거리만큼 퍼즐 선택 칸 이동');
function updateTrackpadLabel(){
 const t=key=>window.NONO_I18N?.translate?.(key)||key;
 zone.dataset.trackpadText=t('트랙패드')+'\n'+t('손가락을 밀어 이동');
}
window.addEventListener('nono:languagechange',updateTrackpadLabel);
updateTrackpadLabel();
const joystick=document.createElement('div');joystick.id='nono-floating-stick';
joystick.innerHTML='<span id="nono-floating-knob"></span>';
pad.prepend(zone,joystick);
const knob=$('nono-floating-knob');
// Fixed miniature of the whole puzzle. A touch jumps to the same normalized
// row/column; it never paints. Dragging locks onto the first chosen axis.
const mini=document.createElement('div');mini.id='nono-absolute-pad';
mini.setAttribute('role','group');mini.setAttribute('aria-label','축소 퍼즐 위치 선택');
mini.innerHTML='<span class="nono-absolute-label">퍼즐 축소판</span><span class="nono-absolute-cursor" aria-hidden="true"></span>';
pad.prepend(mini);
const miniCursor=mini.querySelector('.nono-absolute-cursor');
function updateMiniCursor(){
 const p=window.NONO_TOUCH_CURSOR?.position,d=window.NONO_TOUCH_CURSOR?.dimensions;
 if(!p||!d)return;
 miniCursor.style.left=((p.col+.5)/d.width*100)+'%';
 miniCursor.style.top=((p.row+.5)/d.height*100)+'%';
}
window.addEventListener('nono:touch-cursor',updateMiniCursor);
const editbar=document.createElement('div');editbar.id='nono-pad-editbar';editbar.hidden=true;
editbar.innerHTML='<strong>버튼 배치 편집</strong><small>✥ 이동을 끌면 그룹, 동작 버튼을 끌면 개별 위치가 바뀝니다.</small><button data-pad-edit="reset" type="button">기본 위치</button><button data-pad-edit="cancel" type="button">취소</button><button data-pad-edit="save" type="button">저장</button>';
document.body.append(editbar);
let editing=false,beforeEdit=null,drag=null,floatingPointer=null,stickDirection=null,trackpadActive=null,miniActive=null;
function apply(){
 const opacity=state.opacity/100,scale=state.size/100;
 pad.classList.toggle('nono-floating-mode',state.mode==='floating');
 pad.classList.toggle('nono-trackpad-mode',state.mode==='trackpad');
 pad.classList.toggle('nono-minimap-mode',state.mode==='minimap');
 if(state.mode!=='trackpad'||editing)trackpadActive=null;
 if(state.mode!=='minimap'||editing)miniActive=null;
 pad.classList.toggle('nono-pad-editing',editing);
 pad.style.setProperty('--nono-pad-opacity',opacity);
 pad.style.setProperty('--nono-pad-scale',scale);
 for(const name of positions){
  const el=name==='dpad'?dpadGroup:actionGroup;
  el.style.setProperty('--pad-x',state[name].x*100+'vw');
  el.style.setProperty('--pad-y',state[name].y*100+'dvh');
 }
 for(const name of actions){
  const btn=actionGroup.querySelector('[data-nono-input="'+name+'"]');
  btn.style.setProperty('--offset-x',state.offsets[name][0]+'px');
  btn.style.setProperty('--offset-y',state.offsets[name][1]+'px');
 }
 editbar.hidden=!editing;
 zone.style.setProperty('--zone-x',state.dpad.x*100+'vw');
 zone.style.setProperty('--zone-y',state.dpad.y*100+'dvh');
 zone.style.setProperty('--nono-trackpad-gutter',(80*scale+8)+'px');
 mini.style.setProperty('--nono-mini-gutter',(76*scale+8)+'px');
 mini.style.setProperty('--zone-x',state.dpad.x*100+'vw');
 mini.style.setProperty('--zone-y',state.dpad.y*100+'dvh');
 updateMiniCursor();
 // Changes to on-screen controls do not require recalculating the board on each drag.
}
function nativeSend(name,down){
 const codes={up:['ArrowUp','ArrowUp'],down:['ArrowDown','ArrowDown'],
 left:['ArrowLeft','ArrowLeft'],right:['ArrowRight','ArrowRight']};
 const code=codes[name];if(!code)return;
 const game=$('game'),lobby=$('lobby');
 if(down&&(game?.classList.contains('hidden')||!lobby?.classList.contains('hidden')||$('nono-settings-overlay')))return;
 document.dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',
  {bubbles:true,cancelable:true,key:code[0],code:code[1]}));
}
let stick={x:0,y:0};
function floatMove(e){
 const x=e.clientX-stick.x,y=e.clientY-stick.y,dist=Math.hypot(x,y);
 const radius=35*state.size/100;
 let direction=null;
 if(dist>radius*.27)direction=Math.abs(x)>Math.abs(y)?x>0?'right':'left':y>0?'down':'up';
 if(direction!==stickDirection){
  if(stickDirection)nativeSend(stickDirection,false);
  stickDirection=direction;
  if(direction)nativeSend(direction,true);
 }
 const scale=Math.min(1,radius/(dist||1));
 knob.style.transform='translate(-50%,-50%) translate('+(x*scale)+'px,'+(y*scale)+'px)';
 if(dist>radius*1.8){
  stick.x+=x*(1-radius/dist);stick.y+=y*(1-radius/dist);
  joystick.style.left=stick.x+'px';joystick.style.top=stick.y+'px';
 }
}
zone.addEventListener('pointerdown',e=>{
 if(editing||state.mode!=='floating'||floatingPointer!==null||e.button!==0)return;
 if($('game')?.classList.contains('hidden')||!$('lobby')?.classList.contains('hidden'))return;
 e.preventDefault();floatingPointer=e.pointerId;stick={x:e.clientX,y:e.clientY};
 joystick.style.left=stick.x+'px';joystick.style.top=stick.y+'px';
 joystick.classList.add('is-on');knob.style.transform='translate(-50%,-50%)';
 try{zone.setPointerCapture(e.pointerId)}catch(_){}
});
zone.addEventListener('pointermove',e=>{if(e.pointerId===floatingPointer)floatMove(e)});
function floatEnd(e){
 if(e.pointerId!==floatingPointer)return;
 floatingPointer=null;joystick.classList.remove('is-on');
 if(stickDirection)nativeSend(stickDirection,false);stickDirection=null;
}
for(const name of ['pointerup','pointercancel','lostpointercapture'])zone.addEventListener(name,floatEnd);

// Cursor-only touch navigation. Never use synthetic key-repeat or user
// wrap preferences: reaching the end of the puzzle stops at that edge.
const cursor=()=>window.NONO_TOUCH_CURSOR;
function touchAllowed(mode){
 return state.mode===mode&&!editing&&
  matchMedia('(max-width:900px) and (pointer:coarse)').matches&&
  !pad.hidden&&!$('game')?.classList.contains('hidden')&&
  $('lobby')?.classList.contains('hidden')&&!$('nono-settings-overlay');
}
// Relative laptop-style trackpad. The first definite drag axis is locked
// until lift (no diagonal jumps), matching regular row/column puzzle drags.
zone.addEventListener('pointerdown',e=>{
 if(!touchAllowed('trackpad')||trackpadActive||e.button!==0)return;
 e.preventDefault();trackpadActive={id:e.pointerId,x:e.clientX,y:e.clientY,
  originX:e.clientX,originY:e.clientY,axis:null,residual:0};
 try{zone.setPointerCapture(e.pointerId)}catch(_){}
});
zone.addEventListener('pointermove',e=>{
 const a=trackpadActive;
 if(!a||a.id!==e.pointerId)return;
 if(!touchAllowed('trackpad')){trackpadActive=null;return}
 e.preventDefault();
 if(!a.axis){
  const totalX=e.clientX-a.originX,totalY=e.clientY-a.originY;
  if(Math.max(Math.abs(totalX),Math.abs(totalY))<5)return;
  a.axis=Math.abs(totalX)>=Math.abs(totalY)?'x':'y';
  a.residual=0;
  // Keep the initial travel (after threshold) rather than dropping steps.
  // The origin remains the start of the stroke until axis lock.
 }
 const distance=a.axis==='x'?e.clientX-a.x:e.clientY-a.y;
 a.residual+=distance;
 a.x=e.clientX;a.y=e.clientY;
 const pxPerCell=12*100/state.trackpadSensitivity;
 let steps=Math.trunc(a.residual/pxPerCell);
 steps=Math.sign(steps)*Math.min(50,Math.abs(steps));
 if(!steps)return;
 a.residual-=steps*pxPerCell;
 const nav=cursor();
 if(!nav?.position)return;
 // Atomic bounded movement: no wrap, no repeated full-board rendering.
 const ok=a.axis==='x'?nav.move(steps,0):nav.move(0,steps);
 if(ok===false)return;
 // When hitting a board edge, don't bank movement that could later
 // unexpectedly reverse or wrap to the opposite side.
 const {position,dimensions}=nav;
 if(a.axis==='x'&&(position.col===0||position.col===dimensions.width-1)||
    a.axis==='y'&&(position.row===0||position.row===dimensions.height-1))
  a.residual=0;
});
const trackpadEnd=e=>{
 if(trackpadActive?.id!==e.pointerId)return;
 trackpadActive=null;
 if(zone.hasPointerCapture?.(e.pointerId))try{zone.releasePointerCapture(e.pointerId)}catch(_){}
};
for(const name of ['pointerup','pointercancel','lostpointercapture'])zone.addEventListener(name,trackpadEnd);

// Absolute miniature: initial touch jumps to the matching position in the
// ENTIRE puzzle, regardless of current zoom or scroll. On a subsequent drag,
// lock row or column according to the dominant first movement.
function miniatureCoordinates(e){
 const r=mini.getBoundingClientRect(),d=cursor()?.dimensions;
 if(!d||r.width<=0||r.height<=0)return null;
 const x=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));
 const y=Math.max(0,Math.min(1,(e.clientY-r.top)/r.height));
 return {row:Math.min(d.height-1,Math.floor(y*d.height)),
  col:Math.min(d.width-1,Math.floor(x*d.width))};
}
mini.addEventListener('pointerdown',e=>{
 if(!touchAllowed('minimap')||miniActive||e.button!==0)return;
 const p=miniatureCoordinates(e);if(!p)return;
 e.preventDefault();
 miniActive={id:e.pointerId,x:e.clientX,y:e.clientY,axis:null,
  startRow:p.row,startCol:p.col};
 cursor()?.select(p.row,p.col);
 updateMiniCursor();
 try{mini.setPointerCapture(e.pointerId)}catch(_){}
});
mini.addEventListener('pointermove',e=>{
 const a=miniActive;
 if(!a||a.id!==e.pointerId)return;
 if(!touchAllowed('minimap')){miniActive=null;return}
 e.preventDefault();
 const p=miniatureCoordinates(e);if(!p)return;
 if(!a.axis){
  const dx=e.clientX-a.x,dy=e.clientY-a.y;
  if(Math.max(Math.abs(dx),Math.abs(dy))<5)return;
  a.axis=Math.abs(dx)>=Math.abs(dy)?'x':'y';
 }
 if(a.axis==='x')cursor()?.select(a.startRow,p.col);
 else cursor()?.select(p.row,a.startCol);
 updateMiniCursor();
});
const miniEnd=e=>{
 if(miniActive?.id!==e.pointerId)return;
 miniActive=null;
 if(mini.hasPointerCapture?.(e.pointerId))try{mini.releasePointerCapture(e.pointerId)}catch(_){}
};
for(const name of ['pointerup','pointercancel','lostpointercapture'])mini.addEventListener(name,miniEnd);

function beginEdit(){
 if(!matchMedia('(pointer:coarse)').matches||$('game')?.classList.contains('hidden'))return false;
 beforeEdit=clone(state);editing=true;
 pad.classList.remove('hidden');pad.hidden=false;
 editbar.hidden=false;apply();return true;
}
function finishEdit(keep){
 if(!editing)return;
 if(!keep)state=validate(beforeEdit);
 editing=false;drag=null;beforeEdit=null;
 save();apply();window.dispatchEvent(new Event('resize'));refreshCustomSettings();
 // controller-input.js controls visibility on next state change.
 if($('game')?.classList.contains('hidden'))pad.hidden=true;
}
function resetPositions(){
 const d=defaults();state.dpad=d.dpad;state.actions=d.actions;state.offsets=d.offsets;apply();
}
editbar.addEventListener('click',e=>{
 const cmd=e.target?.dataset.padEdit;
 if(cmd==='save')finishEdit(true);
 if(cmd==='cancel')finishEdit(false);
 if(cmd==='reset')resetPositions();
});
pad.addEventListener('pointerdown',e=>{
 if(!editing||e.button!==0)return;
 const handle=e.target.closest('[data-move-group]');
 const button=e.target.closest('.nono-pad-actions [data-nono-input]');
 if(!handle&&!button)return;
 e.preventDefault();e.stopImmediatePropagation();
 const name=handle?handle.dataset.moveGroup:button.dataset.nonoInput;
 drag={name,type:handle?'group':'button',id:e.pointerId,x:e.clientX,y:e.clientY,
  start:handle?clone(state[name]):[...state.offsets[name]],element:handle||button};
 try{drag.element.setPointerCapture(e.pointerId)}catch(_){}
},true);
pad.addEventListener('pointermove',e=>{
 if(!drag||e.pointerId!==drag.id)return;
 e.preventDefault();e.stopImmediatePropagation();
 const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
 if(drag.type==='group'){
  const minX=Math.min(.38,Math.max(.14,80/innerWidth));
  state[drag.name].x=clamp(drag.start.x+dx/innerWidth,minX,1-minX);
  state[drag.name].y=clamp(drag.start.y+dy/innerHeight,.16,.92);
 }else{
  state.offsets[drag.name]=[clamp(drag.start[0]+dx,-60,60),clamp(drag.start[1]+dy,-60,60)];
 }
 apply();
},true);
for(const ev of ['pointerup','pointercancel','lostpointercapture'])pad.addEventListener(ev,e=>{
 if(drag?.id===e.pointerId){e.preventDefault();e.stopImmediatePropagation();drag=null}
},true);
function openTab(){
 $('nono-open-settings')?.click();
 setTimeout(()=>{document.querySelector('[data-nono-extra-tab="touch"]')?.click()},0);
}
settingsButton.addEventListener('click',openTab);
const buttonsLabel={0:'A / ✕',1:'B / ○',2:'X / □',3:'Y / △',4:'LB / L1',5:'RB / R1',6:'LT / L2',7:'RT / R2',
 8:'뒤로 / Share',9:'시작 / Options',10:'왼쪽 스틱 클릭',11:'오른쪽 스틱 클릭',12:'십자 위',13:'십자 아래',14:'십자 왼쪽',15:'십자 오른쪽'};
const actionLabel={fill:'칠하기',cross:'X 표시',clear:'지우기',undo:'실행 취소',redo:'다시 실행'};
function addRow(container,label,hint,control){
 const row=document.createElement('div');row.className='nono-controller-row';
 const copy=document.createElement('div');copy.className='nono-controller-label';
 const title=document.createElement('strong');title.textContent=label;copy.append(title);
 if(hint){const small=document.createElement('small');small.textContent=hint;copy.append(small)}
 row.append(copy,control);container.append(row);return row;
}
function select(options,value,onChange){
 const el=document.createElement('select');
 for(const [key,label] of options){
  const option=document.createElement('option');option.value=key;option.textContent=label;el.append(option);
 }
 el.value=String(value);el.addEventListener('change',()=>onChange(el.value,el));
 return el;
}
function range(min,max,step,value,after){
 const wrap=document.createElement('div');wrap.className='nono-controller-range';
 const slider=document.createElement('input');slider.type='range';slider.min=min;slider.max=max;slider.step=step;slider.value=value;
 const out=document.createElement('output');out.textContent=value+'%';
 slider.addEventListener('input',()=>{out.textContent=slider.value+'%';after(Number(slider.value))});
 wrap.append(slider,out);return wrap;
}
function check(value,after){
 const c=document.createElement('input');c.type='checkbox';c.checked=value;
 c.addEventListener('change',()=>after(c.checked));return c;
}
function touchSettings(root){
 const intro=document.createElement('p');intro.className='nono-controller-intro';
 intro.textContent='모바일 화면의 방향 패드와 동작 버튼을 원하는 스타일로 조정할 수 있어요.';
 root.append(intro);
 addRow(root,'이동 방식','트랙패드는 손가락 이동 거리만큼, 축소판은 터치한 위치로 커서를 옮깁니다. 드래그는 처음 움직인 행 또는 열로 고정됩니다.',
  select([['fixed','고정 십자키'],['floating','플로팅 조이스틱'],['trackpad','노트북형 트랙패드'],['minimap','퍼즐 축소판 터치']],state.mode,v=>{setValue('mode',v);renderExtras()}));
 if(state.mode==='trackpad')
  addRow(root,'트랙패드 민감도','100%는 약 12px 움직일 때 한 칸. 200%는 더 빠르게, 50%는 더 세밀하게 움직입니다.',
   range(50,200,10,state.trackpadSensitivity,v=>setValue('trackpadSensitivity',v)));
 addRow(root,'투명도','배경과 버튼의 표시 농도',
  range(20,100,5,state.opacity,v=>setValue('opacity',v)));
 addRow(root,'크기','방향 패드 및 동작 버튼 전체 크기',
  range(65,150,5,state.size,v=>setValue('size',v)));
 const actions=document.createElement('div');actions.className='nono-controller-buttons';
 const position=document.createElement('button');position.type='button';position.textContent='✥ 버튼 위치 조절';
 position.onclick=()=>{
  $('nono-settings-close')?.click();
  if(!beginEdit())alert('터치 화면에서 퍼즐을 실행한 후 버튼 위치를 조절할 수 있습니다.');
 };
 const resetBtn=document.createElement('button');resetBtn.type='button';resetBtn.textContent='조작 패드 초기화';
 resetBtn.onclick=()=>{if(confirm('조작 패드의 모든 사용자 설정을 초기화할까요?'))reset()};
 actions.append(position,resetBtn);root.append(actions);
 const note=document.createElement('p');note.className='nono-controller-tip';
 note.textContent='위치 편집 중에는 방향 패드의 ✥ 이동 손잡이와 개별 동작 버튼을 드래그할 수 있습니다. 설정은 이 브라우저에 저장됩니다.';
 root.append(note);
}
function controllerSettings(root){
 const id=typeof navigator.getGamepads==='function'?[...(navigator.getGamepads()||[])].find(g=>g&&g.connected&&g.mapping==='standard')?.id:'';
 const intro=document.createElement('p');intro.className='nono-controller-intro';
 intro.textContent='인식된 게임패드: '+(id||'연결 확인 중');
 root.append(intro);
 addRow(root,'컨트롤러 조작','연결 상태여도 조작을 잠시 끌 수 있어요.',
  check(state.controllerEnabled,v=>setValue('controllerEnabled',v)));
 addRow(root,'왼쪽 아날로그 스틱 사용','십자키는 항상 사용 가능합니다.',
  check(state.stick,v=>setValue('stick',v)));
 addRow(root,'스틱 데드존','작은 흔들림으로 칸이 움직이지 않도록 조정합니다.',
  range(20,85,5,state.deadzone,v=>setValue('deadzone',v)));
 const note=document.createElement('p');note.className='nono-controller-tip';
 note.textContent='십자키와 왼쪽 스틱으로 이동하며 아래 버튼의 기능을 변경할 수 있습니다. 같은 버튼에 여러 동작은 지정할 수 없습니다.';
 root.append(note);
 for(const name of Object.keys(actionLabel)){
  addRow(root,actionLabel[name],null,select(Object.entries(buttonsLabel).map(([v,n])=>[v,n]),state.mapping[name],(v,el)=>{
   const index=Number(v);
   if(Object.entries(state.mapping).some(([key,value])=>key!==name&&value===index)){
    el.value=String(state.mapping[name]);alert('이 버튼은 다른 동작에 사용 중이에요.');return;
   }
   const mapping={...state.mapping,[name]:index};setValue('mapping',mapping);
  }));
 }
 const buttons=document.createElement('div');buttons.className='nono-controller-buttons';
 const resetBtn=document.createElement('button');resetBtn.type='button';resetBtn.textContent='컨트롤러 버튼 기본값';
 resetBtn.onclick=()=>{
  if(!confirm('컨트롤러 버튼과 데드존 설정을 기본값으로 되돌릴까요?'))return;
  state.mapping=defaults().mapping;state.deadzone=55;state.stick=true;state.controllerEnabled=true;save();renderExtras();
 };buttons.append(resetBtn);root.append(buttons);
}
let attached=null,activeExtra=null;
function connected(){return document.body.classList.contains('nono-gamepad-connected')}
function renderExtras(){
 const overlay=$('nono-settings-overlay');if(!overlay)return;
 const content=$('nono-settings-content');
 if(!activeExtra||!content)return;
 content.replaceChildren();
 if(activeExtra==='touch')touchSettings(content);
 else if(activeExtra==='controller'&&connected())controllerSettings(content);
 else{
  activeExtra=null;
  overlay.querySelector('.nono-settings-tabs button[data-tab="0"]')?.click();
 }
}
function activate(button,kind){
 const tabs=button.parentElement;
 tabs.querySelectorAll('button').forEach(b=>{b.classList.remove('is-active');b.setAttribute('aria-selected','false')});
 button.classList.add('is-active');button.setAttribute('aria-selected','true');
 activeExtra=kind;renderExtras();
}
function attachSettings(){
 const overlay=$('nono-settings-overlay');
 if(!overlay){attached=null;activeExtra=null;return}
 const tabs=overlay.querySelector('.nono-settings-tabs');
 if(!tabs)return;
 if(attached!==overlay){attached=overlay;activeExtra=null}
 for(const [kind,name,visible] of [['touch','모바일 조작 패드',true],['controller','컨트롤러',connected()]]){
  let b=tabs.querySelector('[data-nono-extra-tab="'+kind+'"]');
  if(!visible){if(b?.classList.contains('is-active'))tabs.querySelector('[data-tab="0"]')?.click();b?.remove();continue;}
  if(!b){
   b=document.createElement('button');b.type='button';b.dataset.nonoExtraTab=kind;b.textContent=name;
   b.setAttribute('role','tab');b.setAttribute('aria-selected','false');
   b.addEventListener('click',()=>activate(b,kind));tabs.append(b);
  }
 }
 for(const b of tabs.querySelectorAll('button[data-tab]')){
  if(b.dataset.nonoInputHook)return;
  b.dataset.nonoInputHook='1';
  b.addEventListener('click',()=>{activeExtra=null});
 }
}
function refreshCustomSettings(){
 attachSettings();if(activeExtra)renderExtras();
}
new MutationObserver(attachSettings).observe(document.body,{childList:true});
new MutationObserver(()=>{attachSettings();if(!connected()&&activeExtra==='controller')renderExtras()}).observe(document.body,{attributes:true,attributeFilter:['class']});
apply();
})();