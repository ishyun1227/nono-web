/* Mobile control deck + standard Gamepad API. Native input pipeline stays authoritative. */
(()=>{'use strict';
const game=document.getElementById('game'),lobby=document.getElementById('lobby'),area=document.getElementById('play-area');
if(!game||!lobby||!area)return;
const $=id=>document.getElementById(id);
const mq=window.matchMedia('(max-width:900px) and (pointer:coarse)');
const pad=document.createElement('section');
pad.id='nono-mobile-pad';pad.setAttribute('aria-label','모바일 퍼즐 조작 패드');
pad.innerHTML="<div class=\"nono-pad-top\">\n<span class=\"nono-pad-caption\">퍼즐 컨트롤</span><span class=\"nono-pad-connection\" id=\"nono-pad-connection\">방향키 · 칸 입력</span>\n<button class=\"nono-pad-collapse\" id=\"nono-pad-collapse\" type=\"button\" aria-label=\"모바일 패드 접기\">접기 ⌄</button>\n</div>\n<div class=\"nono-pad-main\">\n<div class=\"nono-dpad\" role=\"group\" aria-label=\"칸 이동\">\n<button type=\"button\" class=\"nono-pad-key\" data-nono-input=\"up\" aria-label=\"위로 이동\">▲</button>\n<button type=\"button\" class=\"nono-pad-key\" data-nono-input=\"left\" aria-label=\"왼쪽 이동\">◀</button>\n<span class=\"nono-pad-center\" aria-hidden=\"true\">✦</span>\n<button type=\"button\" class=\"nono-pad-key\" data-nono-input=\"right\" aria-label=\"오른쪽 이동\">▶</button>\n<button type=\"button\" class=\"nono-pad-key\" data-nono-input=\"down\" aria-label=\"아래로 이동\">▼</button>\n</div>\n<div class=\"nono-pad-actions\" role=\"group\" aria-label=\"칸 입력\">\n<button type=\"button\" class=\"nono-pad-action is-fill\" data-nono-input=\"fill\" aria-label=\"현재 칸 칠하기\"><span aria-hidden=\"true\">■</span><small>칠하기</small></button>\n<button type=\"button\" class=\"nono-pad-action is-cross\" data-nono-input=\"cross\" aria-label=\"현재 칸에 X 표시\"><span aria-hidden=\"true\">×</span><small>X 표시</small></button>\n<button type=\"button\" class=\"nono-pad-action is-clear\" data-nono-input=\"clear\" aria-label=\"현재 칸 지우기\"><span aria-hidden=\"true\">⌫</span><small>지우기</small></button>\n<button type=\"button\" class=\"nono-pad-action is-undo\" data-nono-input=\"undo\" aria-label=\"실행 취소\"><span aria-hidden=\"true\">↶</span><small>취소</small></button>\n</div></div>";
pad.hidden=true;
const reopen=document.createElement('button');
reopen.id='nono-mobile-pad-toggle';reopen.type='button';reopen.hidden=true;
reopen.textContent='✥ 조작 패드';
const indicator=document.createElement('div');
indicator.id='nono-gamepad-status';indicator.hidden=true;
indicator.textContent='🎮 컨트롤러 연결됨';
indicator.title='방향키/왼쪽 스틱 이동 · A(×) 칠하기 · B(○) X 표시 · X(□) 지우기 · LB/RB 취소/다시';
document.body.append(pad,reopen,indicator);
const buttons=Array.from(pad.querySelectorAll('button[data-nono-input]'));
const codes={up:['ArrowUp','ArrowUp'],down:['ArrowDown','ArrowDown'],left:['ArrowLeft','ArrowLeft'],right:['ArrowRight','ArrowRight'],fill:[' ','Space'],cross:['x','KeyX'],clear:['Backspace','Backspace']};
const touch=new Map(),physical=new Set();
let expanded=true,connected=false;
function active(){
 return !game.classList.contains('hidden')&&lobby.classList.contains('hidden')&&!area.classList.contains('hidden')
 &&!$('nono-settings-overlay')&&!document.querySelector('.nono-guide-overlay')&&(!$('nono-overview')||$('nono-overview').hidden);
}
function emit(name,down){
 if(down&&active()&&['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)){
   try{document.getElementById('board')?.focus({preventScroll:true});}catch(_){}
 }
 if(name==='undo'||name==='redo'){if(down&&active())$(name)?.click();return;}
 const c=codes[name];if(!c||(down&&!active()))return;
 document.dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{key:c[0],code:c[1],bubbles:true,cancelable:true,repeat:false}));
}
function releasePhysical(){for(const n of physical)emit(n,false);physical.clear();}
function releaseTouch(){for(const n of touch.values())emit(n,false);touch.clear();buttons.forEach(b=>b.classList.remove('is-held'));}
function releaseAll(){releaseTouch();releasePhysical();}
function sync(){
 const playable=active(),show=mq.matches&&playable,open=show&&expanded;
 const wasOpen=document.body.classList.contains('nono-touch-pad-visible');
 pad.hidden=!open;reopen.hidden=!show||expanded;
 indicator.hidden=!playable||!connected||show;
 document.body.classList.toggle('nono-touch-pad-visible',open);
 document.body.classList.toggle('nono-touch-pad-collapsed',show&&!expanded);
 if(wasOpen!==open)window.dispatchEvent(new Event('resize'));
 if(!playable)releaseAll();
}
pad.querySelector('#nono-pad-collapse').addEventListener('click',()=>{releaseTouch();expanded=false;sync();});
reopen.addEventListener('click',()=>{expanded=true;sync();});
for(const button of buttons){
 const name=button.dataset.nonoInput;
 button.addEventListener('pointerdown',e=>{
  if(e.button!==0||!active())return;
  e.preventDefault();
  try{button.setPointerCapture(e.pointerId);}catch(_){}
  touch.set(e.pointerId,name);button.classList.add('is-held');emit(name,true);
 });
 const stop=e=>{
  const held=touch.get(e.pointerId);if(!held)return;
  touch.delete(e.pointerId);button.classList.remove('is-held');emit(held,false);
  if(button.hasPointerCapture?.(e.pointerId))try{button.releasePointerCapture(e.pointerId);}catch(_){}
 };
 button.addEventListener('pointerup',stop);
 button.addEventListener('pointercancel',stop);
 button.addEventListener('lostpointercapture',stop);
 button.addEventListener('click',e=>{if(e.detail===0&&active()){emit(name,true);emit(name,false);}});
 button.addEventListener('contextmenu',e=>e.preventDefault());
}
function readGamepad(){
 if(typeof navigator.getGamepads!=='function')return null;
 try{return Array.from(navigator.getGamepads()||[]).find(p=>p&&p.connected&&p.mapping==='standard')||null;}
 catch(_){return null;}
}
function poll(){
 const gp=readGamepad(),ok=Boolean(gp);
 const custom=window.NONO_INPUT_CUSTOM?.settings;
 const mapping=custom?.mapping||{fill:0,cross:1,clear:2,undo:4,redo:5};
 if(connected!==ok){
  connected=ok;
  const status=$('nono-pad-connection');if(status)status.textContent=ok?'🎮 게임패드 연결됨':'방향키 · 칸 입력';
  document.body.classList.toggle('nono-gamepad-connected',ok);
  indicator.hidden=!ok||!active()||mq.matches;
 }
 if(!gp||!active()||custom?.controllerEnabled===false){releasePhysical();return;}
 const down=i=>Boolean(gp.buttons[i]?.pressed||gp.buttons[i]?.value>.55);
 const x=gp.axes[0]||0,y=gp.axes[1]||0;
 const deadzone=(custom?.deadzone||55)/100;
 const stickX=custom?.stick!==false&&Math.abs(x)>deadzone?(x>0?'right':'left'):null;
 const stickY=custom?.stick!==false&&Math.abs(y)>deadzone?(y>0?'down':'up'):null;
 const direction=down(12)?'up':down(13)?'down':down(14)?'left':down(15)?'right':
   Math.abs(x)>Math.abs(y)?stickX:(stickY||stickX);
 const current=new Set();
 if(direction)current.add(direction);
 if(down(mapping.cross))current.add('cross');else if(down(mapping.clear))current.add('clear');else if(down(mapping.fill))current.add('fill');
 if(down(mapping.undo))current.add('undo');
 if(down(mapping.redo))current.add('redo');
 for(const name of [...physical])if(!current.has(name)){emit(name,false);physical.delete(name);}
 for(const name of current)if(!physical.has(name)){emit(name,true);physical.add(name);}
}
for(const node of [game,lobby,area])new MutationObserver(sync).observe(node,{attributes:true,attributeFilter:['class']});
mq.addEventListener?.('change',sync);
window.addEventListener('resize',sync,{passive:true});
window.addEventListener('blur',releaseAll);
document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseAll();});
window.addEventListener('gamepaddisconnected',()=>{releasePhysical();});
window.addEventListener('gamepadconnected',()=>{connected=false;});
setInterval(poll,50);
sync();
})();