/* NONO daily lobby rewards are browser-local preview points, not a trusted shop wallet. */
(()=>{'use strict';
const KEY='nono-daily-preview-v1';
const REWARDS=[20,30,40,50,60,70,100];
const THEME_PRICES=Object.freeze({aurora:300,pastel:450,retro:400,forest:500,arcade:2500,library:3500,enchanted:4500,cosmos:5500,terminal:6500});
const MISSIONS=[
 {id:'puzzle',event:'puzzle-complete',icon:'🧩',name:'퍼즐 1회 완료하기',info:'정답을 완성하면 달성',points:50},
 {id:'race',event:'race-action',icon:'🏁',name:'대결 1회 참여하기',info:'진행 중인 대결에서 칸 입력',points:50},
 {id:'coop',event:'coop-action',icon:'🛟',name:'협동 1회 참여하기',info:'협동 퍼즐에 칸 입력',points:50}
];
const $=s=>document.querySelector(s);
const safe=(n,max=9999999)=>Number.isSafeInteger(n)&&n>=0&&n<=max?n:0;
const dayKey=(ms=Date.now())=>{
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(ms));
 const v=key=>parts.find(p=>p.type===key)?.value||'';
 return [v('year'),v('month'),v('day')].join('-');
};
const priorDay=day=>new Date(Date.parse(day+'T00:00:00Z')-86400000).toISOString().slice(0,10);
const blank=()=>({points:0,streak:0,lastAttendance:'',days:{},ownedThemes:[],gameRewards:{claimed:[],winStreak:0}});
function load(){
 try{
  const raw=JSON.parse(localStorage.getItem(KEY)||'null');
  if(!raw||typeof raw!=='object')return blank();
  const days={};
  for(const d of Object.keys(raw.days||{}).filter(k=>/^\d{4}-\d{2}-\d{2}$/.test(k)).sort().slice(-60)){
   const item=raw.days[d]||{},missions={};
   for(const m of MISSIONS){const entry=item.missions?.[m.id];missions[m.id]={done:entry?.done===true,claimed:entry?.claimed===true};}
   days[d]={attendance:item.attendance===true,missions};
  }
  return {points:safe(raw.points),streak:safe(raw.streak,9999),
   lastAttendance:/^\d{4}-\d{2}-\d{2}$/.test(raw.lastAttendance||'')?raw.lastAttendance:'',days,
   ownedThemes:Array.isArray(raw.ownedThemes)?[...new Set(raw.ownedThemes.filter(id=>typeof id==='string'&&Object.prototype.hasOwnProperty.call(THEME_PRICES,id)))]:[],
    gameRewards:{
     claimed:Array.isArray(raw.gameRewards?.claimed)?[...new Set(raw.gameRewards.claimed.filter(id=>typeof id==='string'&&id.length<=130))].slice(-2500):[],
     winStreak:safe(raw.gameRewards?.winStreak,10000)
    }};
 }catch(_){return blank();}
}
let state=load(),renderedDay='';
const root=document.createElement('section');
root.id='nono-daily-hub';root.className='nono-daily-hub';root.setAttribute('aria-label','오늘의 미션과 출석 보상');
root.innerHTML=[
 '<section class="nono-daily-card nono-daily-missions" aria-labelledby="nono-daily-title">',
 '<div class="nono-daily-head"><div><span class="nono-daily-kicker">☀️ WATERPARK CHALLENGES</span><h2 id="nono-daily-title">오늘의 미션</h2></div><span id="nono-mission-count" class="nono-daily-progress">0 / 3 달성</span></div>',
 '<div id="nono-mission-list" class="nono-mission-list"></div>',
 '<p class="nono-daily-note">매일 자정(한국 시간)에 새로운 미션이 시작돼요.</p></section>',
 '<section class="nono-daily-card nono-daily-attendance" aria-labelledby="nono-attendance-title">',
 '<div class="nono-daily-head"><div><span class="nono-daily-kicker">🎁 DAILY CHECK-IN</span><h2 id="nono-attendance-title">출석 보상</h2></div><span id="nono-preview-points" class="nono-daily-wallet" aria-label="이 기기 체험 포인트">🪙 0 P</span></div>',
 '<p id="nono-attendance-lead" class="nono-attendance-lead"></p>',
 '<div id="nono-attendance-days" class="nono-attendance-days" aria-label="7일 출석 보상"></div>',
 '<button id="nono-attendance-claim" class="nono-attendance-claim" type="button">오늘 출석 보상 받기</button>',
 '<p class="nono-daily-note">포인트는 이 브라우저의 테마 상점 체험에 사용할 수 있어요. 현금 충전·기기 간 동기화는 아직 지원되지 않아요.</p></section>'
].join('');
const el=id=>root.querySelector('#'+id);
function todayState(day){
 if(!state.days[day])state.days[day]={attendance:false,missions:{}};
 return state.days[day];
}
function save(){
 const keys=Object.keys(state.days).sort();
 for(const k of keys.slice(0,Math.max(0,keys.length-60)))delete state.days[k];
 try{localStorage.setItem(KEY,JSON.stringify(state));}catch(_){}
}
const nextStreak=d=>state.lastAttendance===priorDay(d)?state.streak+1:1;
const stepFor=d=>(Math.max(1,state.lastAttendance===d?state.streak:nextStreak(d))-1)%7+1;
function notice(message){
 const box=$('#toast');if(!box)return;
 box.textContent=message;box.classList.remove('hidden');clearTimeout(notice.timeout);
 notice.timeout=setTimeout(()=>box.classList.add('hidden'),3200);
}
function render(){
 const day=dayKey(),data=todayState(day),step=stepFor(day);
 renderedDay=day;
 el('nono-mission-count').textContent=MISSIONS.filter(m=>data.missions?.[m.id]?.done).length+' / 3 달성';
 el('nono-preview-points').textContent='🪙 '+state.points.toLocaleString('ko-KR')+' P';
 const list=el('nono-mission-list');list.replaceChildren();
 for(const m of MISSIONS){
  const status=data.missions?.[m.id]||{};
  const row=document.createElement('div');row.className='nono-mission-row'+(status.claimed?' is-claimed':'');
  const icon=document.createElement('span');icon.className='nono-mission-icon';icon.setAttribute('aria-hidden','true');icon.textContent=m.icon;
  const copy=document.createElement('div');copy.className='nono-mission-copy';
  const strong=document.createElement('strong');strong.textContent=m.name;
  const small=document.createElement('small');small.textContent=status.done?'미션 달성!':m.info;
  copy.append(strong,small);
  const button=document.createElement('button');button.type='button';button.className='nono-mission-claim';
  button.dataset.mission=m.id;
  button.textContent=status.claimed?'받음 ✓':status.done?'+'+m.points+' P 받기':'+'+m.points+' P';
  button.disabled=!!status.claimed||!status.done;
  button.setAttribute('aria-label',m.name+' '+(status.claimed?'보상 수령 완료':status.done?'보상 받기':'진행 중'));
  row.append(icon,copy,button);list.append(row);
 }
 el('nono-attendance-lead').textContent=data.attendance
  ?'오늘 출석 완료! 내일도 들러서 연속 출석을 이어가세요.'
  :'오늘은 '+step+'일차 · 출석하고 '+REWARDS[step-1]+' P 받기';
 const days=el('nono-attendance-days');days.replaceChildren();
 for(let i=1;i<=7;i++){
  const tile=document.createElement('div');tile.className='nono-attendance-day'+(i===step?' is-today':'')+(data.attendance&&i<=step?' is-collected':'');
  const label=document.createElement('strong');label.textContent=i===7?'7일차 ✨':i+'일차';
  const amount=document.createElement('span');amount.textContent=REWARDS[i-1]+' P';
  tile.append(label,amount);days.append(tile);
 }
 const btn=el('nono-attendance-claim');btn.disabled=data.attendance;
 btn.textContent=data.attendance?'✓ 오늘 출석 완료':'🎁 오늘 출석 보상 받기 · +'+REWARDS[step-1]+' P';
}
function claimAttendance(){
 state=load();const day=dayKey(),data=todayState(day);
 if(data.attendance){render();return false;}
 const step=stepFor(day);data.attendance=true;
 state.streak=nextStreak(day);state.lastAttendance=day;
 state.points=Math.min(9999999,state.points+REWARDS[step-1]);
 save();render();notice('출석 완료! +'+REWARDS[step-1]+' 체험 P');return true;
}
function claimMission(id){
 const m=MISSIONS.find(m=>m.id===id);if(!m)return false;
 state=load();const data=todayState(dayKey()),entry=data.missions?.[id];
 if(!entry?.done||entry.claimed){render();return false;}
 entry.claimed=true;state.points=Math.min(9999999,state.points+m.points);
 save();render();notice('미션 보상 +'+m.points+' 체험 P');return true;
}
/* Gameplay rewards use the same device-local preview wallet as daily missions.
    One reward per solo puzzle each Korea day, or per joined race/coop room.
    Never represent these client points as trusted currency or real-money credit. */
 function creditGameCompletion(detail){
   const policy=window.NONO_REWARD_POLICY;
   if(!policy||!detail||!['solo','race','coop'].includes(detail.mode)||
      !Number.isInteger(detail.size)||!policy.baseFor(detail.size,detail.difficulty))return {ok:false};
   const {mode,puzzleId,roomCode,uid,won}=detail;
   if(typeof puzzleId!=='string'||!puzzleId||puzzleId.length>80)return {ok:false};
   if(mode!=='solo'&&(!/^[A-HJ-NP-Z2-9]{6}$/.test(roomCode||'')||typeof uid!=='string'||!uid))return {ok:false};
   const key=mode==='solo'?'solo:'+dayKey()+':'+puzzleId:mode+':'+roomCode+':'+uid;
   state=load();
   if(state.gameRewards.claimed.includes(key))return {ok:false,reason:'already-claimed'};
   const nextWinStreak=mode==='race'?(won?state.gameRewards.winStreak+1:0):state.gameRewards.winStreak;
   const data=policy.reward(mode,detail.size,detail.difficulty,won===true,nextWinStreak);
   if(!data||!Number.isSafeInteger(data.total)||data.total<0)return {ok:false};
   state.gameRewards.claimed.push(key);
   if(state.gameRewards.claimed.length>2500)state.gameRewards.claimed=state.gameRewards.claimed.slice(-2500);
   state.gameRewards.winStreak=Math.min(nextWinStreak,10000);
   state.points=Math.min(9999999,state.points+data.total);
   save();render();
   window.dispatchEvent(new CustomEvent('nono:wallet-change',{detail:{points:state.points,reward:data}}));
   setTimeout(()=>notice('게임 완료 보상 +'+data.total+' 체험 P'+(won?' · '+state.gameRewards.winStreak+'연승!':'')),450);
   return {ok:true,amount:data.total,breakdown:data,winStreak:state.gameRewards.winStreak};
 }
 function resetWinStreak(){
   state=load();
   if(!state.gameRewards.winStreak)return;
   state.gameRewards.winStreak=0;save();render();
 }
 function purchaseTheme(id){
  if(typeof id!=='string'||!Object.prototype.hasOwnProperty.call(THEME_PRICES,id))
    return {ok:false,reason:'상품 정보가 올바르지 않아요.'};
  state=load();
  if(state.ownedThemes.includes(id))return {ok:false,reason:'이미 이 브라우저에서 해제한 테마예요.'};
  const price=THEME_PRICES[id];
  if(state.points<price)return {ok:false,reason:'체험 포인트가 부족해요.'};
  state.points-=price;
  state.ownedThemes.push(id);
  save();render();
  window.dispatchEvent(new CustomEvent('nono:wallet-change',{detail:{id,points:state.points}}));
  return {ok:true,id,points:state.points,price};
}
function onActivity(event){
 const id=MISSIONS.find(m=>m.event===event.detail?.kind)?.id;if(!id)return;
 state=load();const data=todayState(dayKey());
 if(data.missions?.[id]?.done)return;
 data.missions[id]={done:true,claimed:false};save();render();
}
el('nono-mission-list').addEventListener('click',e=>{
 const button=e.target.closest('button[data-mission]');if(button)claimMission(button.dataset.mission);
});
el('nono-attendance-claim').addEventListener('click',claimAttendance);
window.addEventListener('nono:activity',onActivity);
window.addEventListener('storage',e=>{if(e.key===KEY){state=load();render();window.dispatchEvent(new Event('nono:wallet-change'));}});
function dock(){
 const theme=document.body.dataset.nonoTheme;
 const target=theme==='enchanted'?$('#fg-home'):theme==='terminal'?$('#terminal-experience'):$('#home-view');
 if(!target)return;
 root.classList.toggle('nono-daily-in-terminal',theme==='terminal');
 if(root.parentNode!==target)target.append(root);
}
new MutationObserver(()=>{dock();render();}).observe(document.body,{attributes:true,attributeFilter:['data-nono-theme']});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){state=load();dock();render();}});
window.addEventListener('focus',()=>{state=load();dock();render();});
setInterval(()=>{if(dayKey()!==renderedDay){state=load();render();}},60000);
window.NONO_DAILY_REWARDS=Object.freeze({
 getSnapshot:()=>JSON.parse(JSON.stringify({day:dayKey(),...state})),
 claimAttendance,claimMission,purchaseTheme,creditGameCompletion,resetWinStreak,
  refresh:()=>{state=load();dock();render();},
  ownsTheme:id=>id==='neon'||state.ownedThemes.includes(id)
});
dock();render();
})();