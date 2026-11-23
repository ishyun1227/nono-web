/* NONOgram feed. Native puzzle screens remain separate and authoritative. */
(()=>{
'use strict';
const home=document.getElementById('home-view');
const tabs=document.querySelector('#nono-workbench-nav .mode-select');
if(!home||!tabs||document.getElementById('nono-community-tab'))return;
const button=(id,label)=>{
 const el=document.createElement('button');
 el.id=id;el.type='button';el.className='nono-top-action';el.textContent=label;
 el.setAttribute('aria-label',label+' 열기');return el;
};
const community=button('nono-community-tab','노노그램');
const shop=button('nono-shop-tab-top','상점');
tabs.append(community,shop);
const root=document.createElement('section');
root.id='nono-community-page';root.hidden=true;
root.setAttribute('aria-label','노노그램 피드');
home.after(root);
const $=(tag,cls,txt)=>{
 const el=document.createElement(tag);
 if(cls)el.className=cls;
 if(txt!==undefined)el.textContent=String(txt);
 return el;
};
const ICON={
 home:'▦',race:'⚔',coop:'♧',feed:'♡',shop:'▤',
 search:'⌕',notification:'♡',profile:'◎',more:'···',
 like:'♡',comment:'▢',share:'➤',save:'♧',back:'←'
};
const FILTERS=['추천','팔로잉','최신','실시간','랭킹'];
const modeNames={solo:'혼자 풀기',practice:'혼자 풀기',record:'기록 경쟁',race:'실시간 대결',coop:'협동 플레이'};
const STORE='nono-social-local-v1';
let view='추천',mounted=false,painted=false,observer=null,animations=[];
let publicRows=[],remoteReplayRows=[],scoresLoading=false,leaderboardRows=[];
function readLocal(){
 try{const d=JSON.parse(localStorage.getItem(STORE)||'{}');return d&&typeof d==='object'?d:{};}
 catch{return {};}
}
function writeLocal(d){try{localStorage.setItem(STORE,JSON.stringify(d));}catch(error){console.warn('노노그램 로컬 반응 저장 실패',error);}}
function toggleLocal(bucket,key){
 const d=readLocal(),list=Array.isArray(d[bucket])?d[bucket]:[];
 d[bucket]=list.includes(key)?list.filter(x=>x!==key):[...list,key].slice(-500);
 writeLocal(d);return d[bucket].includes(key);
}
function currentUid(){try{return window.NONO_ACCOUNT?.isSignedIn()?currentUser?.uid||'':'';}catch{return '';}}
function signedIn(){return Boolean(currentUid());}
function userName(){return document.getElementById('profile-name')?.textContent?.trim()||'플레이어';}
function localReplays(){
 const api=window.NONO_REPLAY;
 if(!api)return [];
 try{return api.recentCompleted(window.NONO_REPLAY_STORAGE||localStorage,30).filter(r=>r&&r.completedAt);}
 catch(error){console.warn('완료 리플레이 로딩 실패',error);return [];}
}
function feedRows(){
 const local=localReplays().map(r=>({
  key:'run:'+r.id,uid:currentUid()||'local',name:userName(),
  mode:r.mode,puzzleId:r.puzzleId,size:r.size,height:r.height||r.size,
  completedAt:r.completedAt,replay:r,own:true
 }));
 const remote=remoteReplayRows.filter(r=>r&&r.replay&&r.completedAt).map(r=>({
  key:'published:'+r.puzzleId+':'+r.uid+':'+r.completedAt,uid:r.uid,
  name:r.name||'플레이어',mode:'record',puzzleId:r.puzzleId,size:r.size,
  completedAt:r.completedAt,replay:r.replay,own:r.uid===currentUid()
 }));
 const completions=publicRows.filter(r=>r&&Number.isFinite(r.completedAt)&&r.size>0).map(r=>({
  key:'clear:'+r.mode+':'+r.puzzleId+':'+r.uid+':'+r.completedAt,
  uid:r.uid||'',name:r.name||'플레이어',mode:r.mode,puzzleId:r.puzzleId,
  size:r.size,completedAt:r.completedAt,own:!!r.local
 }));
 const list=[...local,...remote];
 for(const row of completions){
  const dup=list.some(r=>r.puzzleId===row.puzzleId&&
    (r.uid===row.uid||(!row.uid&&r.own))&&
    Math.abs(r.completedAt-row.completedAt)<120000);
  if(!dup)list.push(row);
 }
 list.sort((a,b)=>b.completedAt-a.completedAt);
 const known=new Set();
 return list.filter(r=>{if(known.has(r.key))return false;known.add(r.key);return true;}).slice(0,40);
}
function face(label){
 const box=$('span','nono-social-avatar');box.textContent=(label||'N').trim().slice(0,1)||'N';
 box.setAttribute('aria-hidden','true');return box;
}
function mkButton(text,cls,handler){
 const b=$('button',cls,text);b.type='button';if(handler)b.addEventListener('click',handler);return b;
}
function nav(mode){
 const menu=$('nav','nono-social-nav');
 menu.setAttribute('aria-label','메인 메뉴');
 for(const [id,label,ico] of [['practice','혼자 풀기','home'],['race','실시간 대결','race'],['coop','협동 플레이','coop'],['feed','노노그램','feed'],['shop','상점','shop']]){
  const item=mkButton('','nono-social-nav-item'+(id===mode?' is-active':''),()=>navigate(id));
  item.dataset.page=id;item.setAttribute('aria-label',label);
  item.append($('span','nono-social-icon',ICON[ico]),$('span','nono-social-nav-text',label));
  menu.append(item);
 }
 return menu;
}
function navigate(id){
 if(id==='feed'){open();return;}
 close();
 if(id==='shop'){
  if(typeof window.NONO_THEMES?.open==='function')window.NONO_THEMES.open();
  else document.getElementById('nono-theme-open')?.click();
  return;
 }
 const native=document.querySelector('.mode-card[data-mode="'+id+'"]');
 if(native)native.click();
 window.scrollTo({top:0,behavior:'instant'});
}
function clearAnimations(){
 if(observer){observer.disconnect();observer=null;}
 for(const stop of animations)stop();
 animations=[];
}
function close(){
 if(!mounted)return;
 root.hidden=true;document.body.classList.remove('nono-social-open');
 community.classList.remove('is-current');community.setAttribute('aria-expanded','false');
 mounted=false;clearAnimations();
}
function open(){
 if(document.body.dataset.nonoTheme!=='neon'||!document.getElementById('game')?.classList.contains('hidden'))return;
 root.hidden=false;document.body.classList.add('nono-social-open');
 community.setAttribute('aria-expanded','true');community.classList.add('is-current');
 mounted=true;view='추천';render();
 root.scrollTop=0;
}
function tabsRow(){
 const row=$('div','nono-social-filters');row.setAttribute('role','tablist');
 for(const name of FILTERS){
  const b=mkButton(name,'nono-social-filter'+(view===name?' is-active':''),()=>{
   view=name;render();
  });
  b.setAttribute('role','tab');b.setAttribute('aria-selected',String(view===name));
  row.append(b);
 }
 return row;
}
function labelFor(row){
 let label=modeNames[row.mode]||'완료';
 if(row.size)label+=' · '+row.size+'×'+(row.height||row.size);
 return label;
}
function dateFor(ts){
 try{return new Date(ts).toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});}
 catch{return '';}
}
function statusArea(rows){
 const box=$('section','nono-social-rail-card');box.append($('h3','','실시간 현황'));
 const recent=rows.filter(r=>r.completedAt).slice(0,5);
 if(!recent.length)box.append($('p','nono-social-muted','아직 완료 기록이 없어요.'));
 for(const row of recent) {
  const item=$('div','nono-social-mini-line');
  item.append($('strong','',row.name),$('small','',labelFor(row)));
  box.append(item);
 }
 return box;
}
function leaderboardArea(){
 const card=$('section','nono-social-rail-card');card.append($('h3','','랭킹'));
 const hint=$('p','nono-social-muted','현재 선택한 퍼즐의 서버 기록');card.append(hint);
 if(scoresLoading)card.append($('p','nono-social-muted','랭킹 조회 중…'));
 else if(!leaderboardRows.length)card.append($('p','nono-social-muted','등록된 랭킹이 없어요.'));
 else leaderboardRows.forEach((r,i)=>{
  const row=$('div','nono-social-mini-line');
  row.append($('strong','',(i+1)+'위 · '+String(r.name||'플레이어').slice(0,18)), $('small','',duration(r.duration)));
  card.append(row);
 });
 card.append(mkButton('기록 경쟁 시작','nono-social-plain',()=>{close();document.querySelector('.mode-card[data-mode="record"]')?.click();}));
 return card;
}
function duration(ms){
 if(!Number.isFinite(ms))return '완료';
 return Math.floor(ms/60000)+'분 '+String(Math.floor(ms/1000)%60).padStart(2,'0')+'초';
}
async function loadLeaderboard(){
 if(scoresLoading)return;
 scoresLoading=true;
 try{
  if(typeof get!=='function'||typeof topScores!=='function'||!signedIn())return;
  const id=document.getElementById('puzzle')?.value;
  if(!id)return;
  const data=(await get(topScores(id))).val()||{};
  leaderboardRows=Object.values(data).filter(r=>r&&Number.isFinite(r.duration)).sort((a,b)=>a.duration-b.duration).slice(0,5);
 }catch(error){console.warn('랭킹 조회 실패',error);leaderboardRows=[];}
 finally{scoresLoading=false;if(mounted)drawRail();}
}
function drawRail(){
 const rail=root.querySelector('.nono-social-right');if(!rail)return;
 rail.replaceChildren();
 const head=$('div','nono-social-account');head.append(face(userName()));
 const info=$('div','');info.append($('strong','',userName()),$('small','','내 계정'));
 head.append(info);rail.append(head);
 const all=feedRows();rail.append(statusArea(all),leaderboardArea());
 rail.append($('p','nono-social-muted','NONO · 노노그램'));
}
function drawCanvas(canvas,board,size,height){
 const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)return;
 if(canvas.width!==size||canvas.height!==height){canvas.width=size;canvas.height=height;}
 const img=ctx.createImageData(size,height);
 for(let i=0;i<board.length;i++){
  const c=board[i]===1?34:board[i]===2?192:255;
  const j=i*4;
  img.data[j]=c;img.data[j+1]=c;img.data[j+2]=c;img.data[j+3]=255;
 }
 ctx.putImageData(img,0,0);
}
function play(canvas,run){
 const api=window.NONO_REPLAY;if(!api)return;
 const size=run.size,height=run.height||size;
 if(size*height>22500)return;
 const start=run.initial.split('').map(Number),steps=[];
 try{api.everyStep(run,e=>steps.push(e));}catch{return;}
 const board=start.slice(),stride=Math.max(1,Math.ceil(steps.length/100));
 let index=0,hold=0,timer=null,visible=false;
 drawCanvas(canvas,board,size,height);
 const advance=()=>{
  if(index>=steps.length){
   if(++hold>=11){board.splice(0,board.length,...start);index=0;hold=0;}
  }else{
   for(let n=0;n<stride&&index<steps.length;n++,index++){
    const step=steps[index];if(step.cell>=0&&step.cell<board.length)board[step.cell]=step.value;
   }
  }
  drawCanvas(canvas,board,size,height);
 };
 const startPlayback=()=>{if(visible||document.hidden||!mounted)return;visible=true;timer=setInterval(advance,105);};
 const stopPlayback=()=>{visible=false;if(timer){clearInterval(timer);timer=null;}};
 if(!observer&&typeof IntersectionObserver!=='undefined')
  observer=new IntersectionObserver(entries=>{
   for(const e of entries){if(e.isIntersecting)e.target.__startReplay?.();else e.target.__stopReplay?.();}
  },{root,threshold:.15});
 canvas.__startReplay=startPlayback;canvas.__stopReplay=stopPlayback;
 if(observer)observer.observe(canvas);else startPlayback();
 animations.push(stopPlayback);
}
function post(row){
 const art=$('article','nono-social-post');
 const top=$('div','nono-social-post-head');top.append(face(row.name));
 const title=$('div','nono-social-post-author');
 title.append($('strong','',row.name),$('small','',labelFor(row)+' · '+dateFor(row.completedAt)));top.append(title);
 const follows=readLocal().following||[];
 if(row.uid&&!row.own&&row.uid!==currentUid()){
  const follow=mkButton(follows.includes(row.uid)?'팔로잉':'팔로우','nono-social-follow',()=>{
   if(!signedIn()){notice('팔로우하려면 로그인해 주세요.');return;}
   const active=toggleLocal('following',row.uid);follow.textContent=active?'팔로잉':'팔로우';
   notice('팔로우 목록은 현재 이 브라우저에 저장됩니다.');
  });
  top.append(follow);
 }
 art.append(top);
 const visual=$('div','nono-social-post-media');
 if(row.replay&&window.NONO_REPLAY){
  const canvas=$('canvas','nono-social-replay');canvas.setAttribute('aria-label','퍼즐 풀이 과정 자동 반복 재생');
  visual.append(canvas);play(canvas,row.replay);
 }else{
  const missing=$('div','nono-social-replay-unavailable');
  missing.append($('span','nono-social-missing-icon','▦'),$('p','','완료된 퍼즐'),$('small','','이 기록의 풀이 과정은 아직 공개되지 않았어요.'));
  visual.append(missing);
 }
 art.append(visual);
 const controls=$('div','nono-social-post-actions');
 const likes=readLocal().likes||[];
 const like=mkButton(likes.includes(row.key)?'♥':'♡','nono-social-action'+(likes.includes(row.key)?' is-liked':''),()=>{
  if(!signedIn()){notice('좋아요를 누르려면 로그인해 주세요.');return;}
  const active=toggleLocal('likes',row.key);
  like.textContent=active?'♥':'♡';like.classList.toggle('is-liked',active);
  notice('좋아요는 현재 이 브라우저에 저장됩니다.');
 });
 like.setAttribute('aria-label','좋아요');
 const comment=mkButton('▢','nono-social-action',()=>{
  if(!signedIn()){notice('댓글을 쓰려면 로그인해 주세요.');return;}
  const text=prompt('댓글을 작성하세요 (이 기기에만 저장됩니다).');
  if(!text?.trim())return;
  const data=readLocal();data.comments ||= {};
  const old=Array.isArray(data.comments[row.key])?data.comments[row.key]:[];
  data.comments[row.key]=[...old,{name:userName(),text:text.trim().slice(0,300)}].slice(-30);
  writeLocal(data);notice('댓글이 이 브라우저에 저장되었어요.');
 });
 comment.setAttribute('aria-label','댓글');
 const share=mkButton('➤','nono-social-action',async()=>{
  const url=new URL(location.href);url.searchParams.set('puzzle',row.puzzleId||'');
  try{
   if(navigator.share)await navigator.share({title:'NONO 노노그램 퍼즐',url:String(url)});
   else {await navigator.clipboard.writeText(String(url));notice('퍼즐 링크를 복사했어요.');}
  }catch(error){if(error?.name!=='AbortError')notice('링크 공유가 지원되지 않아요.');}
 });
 share.setAttribute('aria-label','공유');
 const saved=readLocal().saved||[];
 const save=mkButton(saved.includes(row.key)?'▣':'♧','nono-social-action nono-social-bookmark',()=>{
  const active=toggleLocal('saved',row.key);save.textContent=active?'▣':'♧';
 });
 save.setAttribute('aria-label','저장');
 controls.append(like,comment,share,save);art.append(controls);
 const desc=$('div','nono-social-post-description');
 desc.append($('strong','',row.name+' '),document.createTextNode('퍼즐을 완성했습니다!'));
 art.append(desc);
 const sub=$('div','nono-social-post-sub');
 sub.textContent=row.replay?'풀이 과정 자동 반복 재생':'완료 기록';
 art.append(sub);
 return art;
}
function notice(message){
 const note=root.querySelector('.nono-social-notice');if(!note)return;
 note.textContent=message;note.hidden=false;clearTimeout(note.__timer);
 note.__timer=setTimeout(()=>{note.hidden=true;},2800);
}
function render(){
 if(!mounted)return;
 clearAnimations();
 root.replaceChildren();
 const layout=$('div','nono-social-layout');
 const sidebar=$('aside','nono-social-left');
 const logo=$('div','nono-social-logo','NONO');
 logo.append($('span','nono-social-logo-dot','•'));
 sidebar.append(logo,nav('feed'));
 const tail=$('div','nono-social-left-bottom');
 tail.append(mkButton('◎ 프로필','nono-social-plain',()=>document.getElementById('profile-button')?.click()));
 tail.append(mkButton('← 돌아가기','nono-social-plain',close));
 sidebar.append(tail);
 const body=$('main','nono-social-center');
 const mobileHeader=$('header','nono-social-mobile-head');
 mobileHeader.append($('strong','','NONO'));
 const tools=$('div','nono-social-mobile-tools');
 tools.append(mkButton('⌕','nono-social-action',()=>notice('피드 검색 기능은 준비 중입니다.')),
              mkButton('◎','nono-social-action',()=>document.getElementById('profile-button')?.click()));
 mobileHeader.append(tools);body.append(mobileHeader);
 const heading=$('div','nono-social-heading');
 heading.append($('h1','','노노그램'),mkButton('←','nono-social-back',close));body.append(heading);
 body.append(tabsRow());
 const list=$('section','nono-social-feed');list.setAttribute('aria-label','퍼즐 완료 피드');
 let rows=feedRows();
 if(view==='팔로잉'){
  const f=readLocal().following||[];rows=rows.filter(r=>f.includes(r.uid));
 }else if(view==='실시간'){
  const status=statusArea(rows);status.classList.add('nono-social-inline-rail');list.append(status);rows=[];
 }else if(view==='랭킹'){
  const rank=leaderboardArea();rank.classList.add('nono-social-inline-rail');list.append(rank);rows=[];
 }
 if(FILTERS.slice(0,3).includes(view)){
  if(!rows.length)list.append($('div','nono-social-empty',view==='팔로잉'?'팔로우한 사람의 완료 기록이 아직 없어요.':'완료된 퍼즐 기록이 아직 없어요.'));
  else rows.slice(0,16).forEach(r=>list.append(post(r)));
 }
 body.append(list);
 const rail=$('aside','nono-social-right');layout.append(sidebar,body,rail);
 root.append(layout,nav('feed'));
 root.lastChild.classList.add('nono-social-bottom');
 const notification=$('div','nono-social-notice');notification.setAttribute('role','status');notification.hidden=true;root.append(notification);
 drawRail();
}
function updateFeed(){
 if(!mounted)return;
 // Do not interrupt a running replay on every background event.
 render();
}
function readPublic(){
 if(Array.isArray(window.NONO_COMMUNITY_COMPLETIONS))publicRows=window.NONO_COMMUNITY_COMPLETIONS.slice(0,40);
}
window.addEventListener('nono:completion-feed',()=>{
 readPublic();updateFeed();
});
window.addEventListener('nono:public-replays',e=>{
 remoteReplayRows=Array.isArray(e.detail)?e.detail:[];updateFeed();
});
window.addEventListener('nono:account-changed',()=>{
 if(mounted)render();
});
window.addEventListener('nono:completion-confirmed',()=>{
 setTimeout(()=>{if(mounted)render();},300);
});
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&mounted)close();});
community.addEventListener('click',open);
shop.addEventListener('click',()=>navigate('shop'));
document.getElementById('brand-home')?.addEventListener('click',()=>{if(mounted)close();});
document.querySelectorAll('.mode-card[data-mode]').forEach(b=>b.addEventListener('click',()=>{if(mounted)close();}));
window.NONO_COMMUNITY={open,close};
readPublic();
loadLeaderboard();
})();