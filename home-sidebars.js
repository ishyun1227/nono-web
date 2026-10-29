/* NONO verified-by-game completion feed and passive advertising slot.
   The feed contains only completion events, never live games or spectating. */
(()=>{
'use strict';
const home=document.getElementById('home-view');
if(!home||document.getElementById('nono-clear-sidebar'))return;
const left=document.createElement('aside');
left.id='nono-clear-sidebar';
left.setAttribute('aria-label','최근 퍼즐 완료 기록');
left.innerHTML=[
  '<section class="nono-rail-panel nono-clear-panel">',
  '<h2 class="nono-rail-title"><span class="nono-rail-indicator" aria-hidden="true"></span>최근 클리어</h2>',
  '<p class="nono-rail-description">퍼즐을 완료한 기록만 표시해요.</p>',
  '<div id="nono-completion-list" role="feed" aria-live="polite" aria-label="최근 퍼즐 완료 기록"></div>',
  '<p class="nono-rail-footer">혼자 · 대결 · 협동 완료 기록</p>',
  '</section>'
].join('');
const right=document.createElement('aside');
right.id='nono-ad-sidebar';
right.setAttribute('aria-label','광고 위치');
right.innerHTML=[
  '<section class="nono-rail-panel nono-ad-panel">',
  '<div class="nono-ad-label"><span>광고</span><span>ADVERTISEMENT</span></div>',
  '<div class="nono-ad-placeholder" aria-label="추후 광고가 표시될 자리">',
  '<span class="nono-ad-placeholder-icon" aria-hidden="true">▤</span>',
  '<strong>광고 영역</strong>',
  '<small>광고가 연결되면 이 위치에 표시됩니다.</small>',
  '</div>',
  '<p class="nono-ad-caption">현재는 광고가 없는 빈 공간입니다.</p>',
  '</section>'
].join('');
home.insertBefore(left,home.querySelector('.home-content')||null);
home.append(right);

const list=left.querySelector('#nono-completion-list');

const HISTORY_KEY='nono-completion-history-v1';
const inflight=new Set();
function readHistory(){
  try{
    const rows=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');
    return Array.isArray(rows)?rows.filter(row=>row&&typeof row.key==='string'&&Number.isFinite(row.finishedAt)):[];
  }catch{return [];}
}
function writeHistory(rows){
  try{localStorage.setItem(HISTORY_KEY,JSON.stringify(rows));}
  catch(error){console.warn('개인 완료 기록 저장 실패',error);}
}
function remember(detail){
  if(!detail||!['solo','race','coop'].includes(detail.mode)||
     typeof detail.puzzleId!=='string'||!detail.puzzleId||
     !Number.isInteger(Number(detail.size)))return null;
  const finishedAt=Number(detail.finishedAt)||Date.now();
  const roomCode=String(detail.roomCode||'');
  const key=detail.mode==='solo'
    ?'solo:'+detail.puzzleId+':'+finishedAt
    :detail.mode+':'+roomCode;
  const rows=readHistory();
  const existing=rows.find(row=>row.key===key);
  if(existing)return existing;
  const start=detail.mode==='solo'
    ?(typeof startedAt==='number'?startedAt:0)
    :(typeof meta!=='undefined'&&meta?Number(meta.startedAt):0);
  const duration=Number.isFinite(start)&&start>0&&finishedAt>=start?finishedAt-start:null;
  const item={key,mode:detail.mode,puzzleId:detail.puzzleId,
    size:Number(detail.size),name:String(detail.name||'플레이어').slice(0,18),
    roomCode,finishedAt,duration,status:'pending'};
  rows.unshift(item);
  writeHistory(rows);
  window.dispatchEvent(new CustomEvent('nono:completion-history-updated',{detail:item}));
  return item;
}
function setHistoryStatus(key,status){
  const rows=readHistory();
  const item=rows.find(row=>row.key===key);
  if(!item||item.status===status)return;
  item.status=status;
  writeHistory(rows);
}
window.NONO_COMPLETION_HISTORY=Object.freeze({all:readHistory});

function message(text){
  const note=document.createElement('p');note.className='nono-completion-empty';note.textContent=text;list.replaceChildren(note);
}
function dbReady(){
  return typeof database!=='undefined'&&!!database &&
    typeof currentUser!=='undefined'&&!!currentUser &&
    typeof onValue==='function'&&typeof query==='function'&&
    typeof ref==='function'&&typeof orderByChild==='function'&&
    typeof limitToLast==='function';
}
function clock(value){
  if(!Number.isFinite(value)||value<=0)return '';
  try{return new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value));}
  catch{return '';}
}
let publicValues={};
function render(values){
  if(values!==undefined)publicValues=values||{};
  const published=Object.values(publicValues).filter(x=>x&&
    ['solo','race','coop'].includes(x.mode)&&
    Number.isFinite(x.completedAt)&&
    Number.isInteger(x.size)&&x.size>=1&&x.size<=100&&
    typeof x.name==='string');
  const own=readHistory().map(x=>({
    mode:x.mode,puzzleId:x.puzzleId,size:x.size,
    name:x.name,completedAt:x.finishedAt,local:true,status:x.status
  })).filter(x=>['solo','race','coop'].includes(x.mode)&&
    Number.isFinite(x.completedAt)&&Number.isInteger(x.size));
  const unmatched=own.filter(x=>!published.some(p=>
    p.mode===x.mode&&p.puzzleId===x.puzzleId&&p.size===x.size&&
    (p.uid===currentUser?.uid||x.mode==='coop')&&
    Math.abs(p.completedAt-x.completedAt)<120000));
  const rows=[...published,...unmatched]
    .sort((a,b)=>b.completedAt-a.completedAt).slice(0,6);
  if(!rows.length){message('아직 공개된 완료 기록이 없어요. 첫 클리어를 기다리고 있어요!');return;}
  const nodes=rows.map(item=>{
    const row=document.createElement('article');row.className='nono-completion-item';row.setAttribute('role','article');
    const name=document.createElement('strong');name.className='nono-completion-name';name.textContent=item.name.slice(0,18)||'플레이어';
    const info=document.createElement('div');info.className='nono-completion-info';
    const mode=document.createElement('span');mode.className='nono-completion-tag';
    mode.dataset.mode=item.mode;mode.textContent=({solo:'혼자',race:'대결',coop:'협동'})[item.mode];
    const size=document.createElement('span');size.textContent=item.size+'×'+item.size;
    const done=document.createElement('span');
    done.textContent=item.local
      ?(item.status==='failed'?'내 완료 · 공개 실패':item.status==='published'?'내 완료 · 공개됨':'내 완료 · 공개 대기')
      :'✓ 완료';
    const time=document.createElement('span');time.className='nono-completion-time';time.textContent=clock(item.completedAt);
    info.append(mode,size,done,time);row.append(name,info);return row;
  });
  list.replaceChildren(...nodes);
}

let stop=null;
function watch(){
  if(stop||!dbReady())return;
  message('최근 완료 기록을 불러오는 중…');
  stop=onValue(query(ref(database,'recentCompletions'),orderByChild('completedAt'),limitToLast(10)),
    snap=>render(snap.val()),error=>{
      console.warn('최근 클리어 구독 실패 (Firebase 규칙 확인 필요)',error);
      message('완료 기록에 연결하지 못했어요.');
    });
}
function publish(detail){
  if(!dbReady()||typeof set!=='function'||typeof serverTimestamp!=='function'||!detail)return;
  const mode=detail.mode,valid=['solo','race','coop'].includes(mode);
  const puzzleId=typeof detail.puzzleId==='string'?detail.puzzleId:'';
  const size=Number(detail.size),finishedAt=Number(detail.finishedAt);
  const roomCode=mode==='solo'?'':String(detail.roomCode||'');
  if(!valid||!Number.isInteger(size)||size<1||size>100||
     !/^[a-zA-Z0-9_-]{1,80}$/.test(puzzleId)||
     (mode!=='solo'&&!/^[A-HJ-NP-Z2-9]{6}$/.test(roomCode)))return;
  const historyKey=detail.key||'';
  if(historyKey&&inflight.has(historyKey))return;
  const uid=currentUser.uid;
  const time=Math.max(0,Math.floor(finishedAt||Date.now()));
  const id=mode==='coop'?'coop-'+roomCode:
           mode==='race'?'race-'+roomCode+'-'+uid:
           'solo-'+uid+'-'+puzzleId+'-'+time;
  const value={mode,puzzleId,size,roomCode,uid,
    name:(mode==='coop'?'협동 팀':String(detail.name||'플레이어')).slice(0,18),
    completedAt:serverTimestamp()};
  const destination=ref(database,'recentCompletions/'+id);
  if(historyKey)inflight.add(historyKey);
  const work=mode==='coop'&&typeof runTransaction==='function'
    ?runTransaction(destination,current=>current?undefined:value,{applyLocally:false})
    :set(destination,value);
  Promise.resolve(work).then(()=>{
    if(historyKey)setHistoryStatus(historyKey,'published');
    render();
  }).catch(error=>{
    if(historyKey)setHistoryStatus(historyKey,'failed');
    render();
    console.warn('완료 기록 공개 실패 (Firebase 규칙 확인 필요)',error);
  }).finally(()=>{if(historyKey)inflight.delete(historyKey);});
}

message('실시간 완료 기록을 연결하는 중…');
const connection=document.getElementById('connection');
if(connection){
  const updateOfflineState=()=>{
    if(!dbReady()&&/오프라인|연결 실패/.test(connection.textContent||''))
      message('온라인 연결 후 최근 완료 기록이 표시돼요.');
  };
  new MutationObserver(updateOfflineState).observe(connection,{childList:true,subtree:true,characterData:true});
  updateOfflineState();
}
window.addEventListener('nono:firebase-ready',()=>{
  watch();
  for(const item of readHistory().filter(x=>x.status==='pending'||x.status==='failed'))
    publish(item);
});
window.addEventListener('nono:completion-confirmed',event=>{
  const item=remember(event.detail);
  render();
  if(item&&item.status!=='published')publish(item);
});
render();
if(dbReady()){
  watch();
  for(const item of readHistory().filter(x=>x.status==='pending'||x.status==='failed'))
    publish(item);
}
})();