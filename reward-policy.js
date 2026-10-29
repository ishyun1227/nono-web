/* Gameplay preview rewards — all amounts use browser-only practice points.
   Production currency requires server-authenticated reward validation. */
(()=>{
'use strict';
const GROUPS=Object.freeze([
 {name:'작음',min:1,max:10,values:[20,30,45]},
 {name:'중간',min:11,max:20,values:[45,65,90]},
 {name:'큼',min:21,max:34,values:[90,130,180]},
 {name:'거대',min:35,max:Infinity,values:[160,230,320]}
]);
const DIFFICULTIES=['쉬움','보통','어려움'];
const LEGACY=Object.freeze({heart5:'쉬움',cat10:'보통',rocket10:'어려움',
  vox_crabino_front:'보통',vox_crabino_side:'보통',vox_crabino_top:'보통'});
const groupOf=size=>GROUPS.find(group=>Number.isInteger(size)&&size>=group.min&&size<=group.max)||null;
const difficultyOf=p=>p&&(DIFFICULTIES.includes(p.difficulty)?p.difficulty:LEGACY[p.id])||null;
const baseFor=(size,difficulty)=>{
 const group=groupOf(size),index=DIFFICULTIES.indexOf(difficulty);
 return group&&index>=0?group.values[index]:0;
};
const roundFive=n=>Math.round(n/5)*5;
const streakBonus=wins=>Math.min(100,Math.max(0,wins-1)*20);
const reward=(mode,size,difficulty,won=false,streak=0)=>{
 const base=baseFor(size,difficulty);
 if(!base)return null;
 const completion=mode==='coop'?roundFive(base*.8):base;
 const victory=mode==='race'&&won?roundFive(base*.5):0;
 const consecutive=mode==='race'&&won?streakBonus(streak):0;
 return {completion,victory,consecutive,total:completion+victory+consecutive};
};
const policy=Object.freeze({GROUPS,DIFFICULTIES,groupOf,difficultyOf,baseFor,streakBonus,reward});
window.NONO_REWARD_POLICY=policy;
const root=document.querySelector('#setup .nono-apple-puzzles');
let badge=null,dialog=null;
function mode(){
 return document.querySelector('.mode-card[data-mode].selected')?.dataset.mode||'practice';
}
function selectedPuzzle(){
 try{
  if(typeof PUZZLES==='undefined')return null;
  return PUZZLES.find(p=>p.id===document.getElementById('puzzle')?.value)||null;
 }catch{return null;}
}
function updateBadge(){
 if(!badge)return;
 const p=selectedPuzzle(),m=mode();
 const result=p?reward(m==='record'?'solo':m,p.size,difficultyOf(p),true,2):null;
 if(!result){badge.textContent='보상표';return;}
 badge.textContent=m==='race'
  ?'완료 +'+result.completion+' P · 승리 +'+result.victory+' P · 연승 추가'
  :m==='coop'
  ?'협동 완료 +'+result.completion+' P'
  :'완료 +'+result.completion+' P';
}
function cell(text){
 const el=document.createElement('td');el.textContent=text;return el;
}
function showTable(){
 if(dialog){dialog.remove();dialog=null;}
 dialog=document.createElement('div');dialog.className='nono-reward-overlay';
 const panel=document.createElement('section');panel.className='nono-reward-dialog';
 panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','nono-reward-title');
 const header=document.createElement('header');header.className='nono-reward-head';
 const h=document.createElement('h2');h.id='nono-reward-title';h.textContent='🪙 퍼즐 보상표';
 const close=document.createElement('button');close.type='button';close.textContent='닫기';close.addEventListener('click',hide);
 header.append(h,close);
 const intro=document.createElement('p');intro.className='nono-reward-muted';
 intro.textContent='크기와 난이도가 높을수록 보상이 늘어나요. 모두 이 브라우저에서만 쓰는 체험 P예요.';
 const table=document.createElement('table');table.className='nono-reward-table';
 const top=document.createElement('tr');
 for(const heading of ['퍼즐 크기','쉬움','보통','어려움']){
  const th=document.createElement('th');th.textContent=heading;top.append(th);
 }
 table.append(top);
 for(const group of GROUPS){
  const row=document.createElement('tr');
  row.append(cell(group.name),...group.values.map(n=>cell(n+' P')));
  table.append(row);
 }
 const more=document.createElement('div');more.className='nono-reward-modes';
 const modes=[
  ['혼자 풀기','위 기본 포인트 지급 · 동일 퍼즐은 하루 첫 완료 1회만 지급'],
  ['대결','완료: 기본 포인트 / 승리: 기본의 50% 추가 / 패배: 승리 보너스 없음'],
  ['승리 연속 보너스','2연승 +20 P · 3연승 +40 P · 4연승 +60 P · 5연승 +80 P · 6연승 이상 +100 P'],
  ['협동','완료 시 기본 포인트의 80%(5 P 단위 반올림) · 실제로 칸을 채운 참여자만 지급']
 ];
 for(const [name,desc] of modes){
  const item=document.createElement('div');const title=document.createElement('strong');title.textContent=name;
  const p=document.createElement('p');p.textContent=desc;item.append(title,p);more.append(item);
 }
 const foot=document.createElement('p');foot.className='nono-reward-muted';
 foot.textContent='대결·협동은 서버 기록을 확인한 후 지급해요. 방마다 1회 지급하며, 대결에서 패하거나 중도 퇴장하면 연승은 초기화돼요. 실제 거래용 포인트는 아니에요.';
 panel.append(header,intro,table,more,foot);dialog.append(panel);document.body.append(dialog);
 dialog.addEventListener('click',e=>{if(e.target===dialog)hide()});
 document.addEventListener('keydown',onEscape);
 close.focus();
}
function onEscape(e){if(e.key==='Escape')hide()}
function hide(){if(!dialog)return;dialog.remove();dialog=null;document.removeEventListener('keydown',onEscape);badge?.focus({preventScroll:true})}
if(root){
 const title=root.querySelector('h4');
 if(title){
  badge=document.createElement('button');
  badge.type='button';badge.className='nono-reward-hint';
  badge.setAttribute('aria-label','퍼즐 포인트 보상표 열기');badge.addEventListener('click',showTable);
  title.append(badge);
 }
 document.addEventListener('click',event=>{
  if(event.target.closest('.mode-select,.nono-apple-setup'))queueMicrotask(updateBadge);
 });
 document.getElementById('puzzle')?.addEventListener('change',()=>queueMicrotask(updateBadge));
 updateBadge();
}
/* This stage only credits preview points. Race/coop must be saved in RTDB first.
   Race winner is derived from the earliest stored finishedAt, tie-broken by UID. */
async function awardConfirmed(event){
 const detail=event.detail||{},mode=detail.mode;
 const p=(typeof PUZZLES!=='undefined'?PUZZLES:[]).find(p=>p.id===detail.puzzleId);
 if(!p||p.size!==detail.size||!['solo','race','coop'].includes(mode))return;
 const difficulty=difficultyOf(p);
 if(!difficulty)return;
 const wallet=window.NONO_DAILY_REWARDS;
 if(!wallet?.creditGameCompletion)return;
 let won=false,uid='';
 if(mode!=='solo'){
  if(typeof database==='undefined'||!database||
     typeof currentUser==='undefined'||!currentUser||
     typeof get!=='function'||typeof ref!=='function')return;
  uid=currentUser.uid;
  if(!/^[A-HJ-NP-Z2-9]{6}$/.test(detail.roomCode||''))return;
  try{
   const code=detail.roomCode;
   const room=(await get(ref(database,'rooms/'+code+'/meta'))).val();
   if(!room||room.mode!==mode||room.puzzleId!==p.id)return;
   if(mode==='race'){
    const states=(await get(ref(database,'rooms/'+code+'/states'))).val()||{};
    const own=states[uid];
    if(!own||!Number.isFinite(own.finishedAt)||own.finishedAt<=0)return;
    const finishers=Object.entries(states).filter(([,state])=>state&&state.finishedAt>0)
      .sort((a,b)=>a[1].finishedAt-b[1].finishedAt||a[0].localeCompare(b[0]));
    won=finishers[0]?.[0]===uid;
   }else{
    const shared=(await get(ref(database,'rooms/'+code+'/board'))).val();
    if(typeof shared!=='string'||shared.length!==p.size*p.size||
       typeof isSolved!=='function'||!isSolved(shared.split(''),p))return;
   }
  }catch(err){console.warn('보상: 서버 완료 기록 확인 실패',err);return;}
 }
 wallet.creditGameCompletion({mode,puzzleId:p.id,size:p.size,difficulty,
   roomCode:detail.roomCode||'',uid,won,completedAt:detail.finishedAt});
}
window.addEventListener('nono:completion-confirmed',event=>{awardConfirmed(event).catch(console.warn)});
window.addEventListener('nono:race-forfeit',()=>window.NONO_DAILY_REWARDS?.resetWinStreak?.());
})();