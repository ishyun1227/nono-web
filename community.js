/* NONO default-theme community & shop navigation.
   Community shares existing records; does not invent replay or social posts. */
(()=>{
'use strict';
const tabs=document.querySelector('.mode-select');
if(!tabs||document.getElementById('nono-community-tab'))return;
const record=document.querySelector('.mode-card[data-mode="record"]');
const make=(id,label)=>{
 const button=document.createElement('button');
 button.id=id;button.className='nono-top-action';button.type='button';button.textContent=label;
 button.setAttribute('aria-label',label+' 열기');
 return button;
};
const community=make('nono-community-tab','커뮤니티');
const shop=make('nono-shop-tab-top','상점');
tabs.append(community,shop);
let overlay=null,lastFocus=null;
const elt=(tag,classname,text)=>{
 const n=document.createElement(tag);if(classname)n.className=classname;if(text)n.textContent=text;return n;
};
const title=(parent,label,helper)=>{
 parent.append(elt('h3','nono-community-section-title',label));
 if(helper)parent.append(elt('p','nono-community-muted',helper));
};
function close(){
 if(!overlay)return;
 overlay.remove();overlay=null;
 document.removeEventListener('keydown',escape);
 community.setAttribute('aria-expanded','false');
 community.classList.toggle('is-current',record?.classList.contains('selected')||false);
 (lastFocus||community).focus({preventScroll:true});
}
function escape(e){if(e.key==='Escape')close();}
function localRecords(){
 const data=[];
 const completed=window.NONO_COMPLETION_HISTORY?.all?.()||[];
 for(const row of completed){
  if(!row||!['solo','race','coop'].includes(row.mode)||
     !Number.isFinite(row.finishedAt)||!Number.isInteger(row.size))continue;
  data.push({name:typeof row.name==='string'?row.name:'플레이어',
   mode:row.mode,puzzleId:row.puzzleId,size:row.size,
   ms:Number.isFinite(row.duration)?row.duration:null,finishedAt:row.finishedAt});
 }
 // Preserve older offline time-trial scores rather than replacing them.
 if(typeof PUZZLES!=='undefined')for(const p of PUZZLES){
  let rows=[];
  try{rows=JSON.parse(localStorage.getItem('nono-records-'+p.id)||'[]');}catch{}
  if(!Array.isArray(rows))continue;
  for(const row of rows){
   if(!row||!Number.isFinite(row.duration)||row.duration<0)continue;
   const when=Number(row.finishedAt)||0;
   if(data.some(x=>x.puzzleId===p.id&&Math.abs(x.finishedAt-when)<2000))continue;
   data.push({name:typeof row.name==='string'?row.name:'플레이어',
     mode:'solo',puzzleId:p.id,size:p.size,ms:row.duration,finishedAt:when});
  }
 }
 return data.sort((a,b)=>b.finishedAt-a.finishedAt).slice(0,12);
}
function recordDetail(item){
 const when=item.finishedAt>0?new Date(item.finishedAt).toLocaleString('ko-KR',{
   timeZone:'Asia/Seoul',month:'numeric',day:'numeric',
   hour:'2-digit',minute:'2-digit',hour12:false
 }):'';
 return (when?when+' · ':'')+(Number.isFinite(item.ms)?format(item.ms):'완료');
}

function format(ms){
 if(!Number.isFinite(ms))return '—';
 return Math.floor(ms/60000)+'분 '+String(Math.floor(ms/1000)%60).padStart(2,'0')+'초';
}
function line(name,detail){
 const row=elt('div','nono-community-line');
 const a=elt('strong','',name),b=elt('span','',detail);
 row.append(a,b);return row;
}
function render(){
 if(overlay)return;
 lastFocus=document.activeElement;
 overlay=elt('div','nono-community-overlay');
 const panel=elt('section','nono-community-panel');
 panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
 panel.setAttribute('aria-labelledby','nono-community-title');
 const header=elt('header','nono-community-header');
 const heading=elt('h2','','커뮤니티');
 heading.id='nono-community-title';
 const dismiss=elt('button','','닫기');dismiss.type='button';dismiss.addEventListener('click',close);
 header.append(heading,dismiss);
 const description=elt('p','nono-community-intro','퍼즐별 랭킹과 공개 완료 기록을 확인할 수 있어요. 개인 기록은 상단 프로필에서 확인해 주세요.');
 const grid=elt('div','nono-community-grid');
 const leaderboard=elt('div','nono-community-card');
 title(leaderboard,'퍼즐별 랭킹','현재 선택한 퍼즐의 기록을 조회해요.');
 const leaderRows=elt('div','nono-community-leaders');
 leaderRows.append(elt('p','nono-community-empty','서버 기록을 불러오는 중…'));
 leaderboard.append(leaderRows);
 const communityFeed=elt('div','nono-community-card');
 title(communityFeed,'최근 클리어','혼자·대결·협동으로 완성한 공개 기록이에요.');
 const recent=elt('div','nono-community-recent');
 const feed=document.querySelector('#nono-completion-list');
 if(feed?.querySelector('.nono-completion-item')){
  for(const row of [...feed.querySelectorAll('.nono-completion-item')].slice(0,5)){
   const name=row.querySelector('.nono-completion-name')?.textContent||'플레이어';
   const info=row.querySelector('.nono-completion-info')?.textContent||'완료';
   recent.append(line(name,info.trim()));
  }
 }else recent.append(elt('p','nono-community-empty','아직 공개된 완료 기록이 없어요.'));
 communityFeed.append(recent);
 const challenge=elt('div','nono-community-card');
 title(challenge,'기록 경쟁','기존 시간 기록 모드를 여기서 시작할 수 있어요.');
 const button=elt('button','nono-community-start','기록 경쟁 시작');
 button.type='button';
 button.addEventListener('click',()=>{
  close();
  record?.click();
  document.getElementById('setup')?.scrollIntoView({behavior:'smooth',block:'center'});
 });
 const replay=elt('p','nono-community-muted','리플레이 공개 및 공유 기능은 준비 중이에요.');
 challenge.append(button,replay);
 grid.append(leaderboard,communityFeed,challenge);
 panel.append(header,description,grid);
 overlay.append(panel);document.body.append(overlay);
 overlay.addEventListener('click',event=>{if(event.target===overlay)close();});
 document.addEventListener('keydown',escape);
 community.setAttribute('aria-expanded','true');community.classList.add('is-current');
 dismiss.focus();
 /* Online leaderboard from the existing server-validated score paths. */
 (async()=>{
  if(typeof database==='undefined'||!database||typeof currentUser==='undefined'||!currentUser||
     typeof get!=='function'||typeof topScores!=='function') {
   leaderRows.replaceChildren(elt('p','nono-community-empty','온라인 연결 후 서버 랭킹을 표시해요.'));return;
  }
  try{
   const id=document.getElementById('puzzle')?.value;
   if(!id)return;
   const scores=(await get(topScores(id))).val()||{};
   if(!overlay||!leaderRows.isConnected)return;
   const rows=Object.values(scores).filter(r=>r&&Number.isFinite(r.duration))
     .sort((a,b)=>a.duration-b.duration).slice(0,5);
   leaderRows.replaceChildren();
   if(!rows.length)leaderRows.append(elt('p','nono-community-empty','이 퍼즐의 랭킹이 아직 없어요.'));
   rows.forEach((r,i)=>leaderRows.append(line((i+1)+'위 · '+String(r.name||'플레이어').slice(0,18),format(r.duration))));
  }catch(error){
   if(leaderRows.isConnected)leaderRows.replaceChildren(elt('p','nono-community-empty','랭킹을 불러오지 못했어요.'));
  }
 })();
}
community.addEventListener('click',render);
shop.addEventListener('click',()=>{
 if(typeof window.NONO_THEMES?.open==='function')window.NONO_THEMES.open();
 else document.getElementById('nono-theme-open')?.click();
});
document.querySelectorAll('.mode-card[data-mode]').forEach(button=>
 button.addEventListener('click',()=>{community.classList.toggle('is-current',button.dataset.mode==='record')}));
})();