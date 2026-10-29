/* NONO account controller: optional Google/Apple auth and private solo sync. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const button=$('profile-button');
if(!button)return;
const SCOPE='nono-account-scope-v1', CACHE='nono-account-cache-v1:', INTRO='nono-account-intro-v1';
const style=document.createElement('style');
style.textContent=[
 '#profile-button.profile-chip{display:inline-flex!important;align-items:center!important;justify-content:center;min-width:40px;min-height:40px;padding:6px 10px!important}',
 '@media(max-width:700px){#profile-button #profile-name{display:none}.header-right{gap:8px}}',
 '.nono-account-shade{position:fixed;inset:0;z-index:45000;background:#030917c9;display:flex;justify-content:center;align-items:center;padding:14px}',
 '.nono-account-panel{background:#141e36;color:#f4f6ff;border:1px solid #435579;box-shadow:0 16px 55px #000b;border-radius:18px;padding:24px;width:min(440px,100%);max-height:90vh;overflow:auto}',
 '.nono-account-panel h2{margin:0 0 12px;font-size:23px}.nono-account-panel p{font-size:13px;color:#b5c5dd;line-height:1.6}',
 '.nono-account-buttons{display:grid;gap:9px;margin:14px 0}.nono-account-buttons button{border-radius:10px;min-height:43px;background:#273958;border:1px solid #53688c;color:#fff;font:inherit;font-weight:700;padding:10px}',
 '.nono-account-close{float:right;background:none;border:0;color:#fff;font-size:25px}.nono-account-row{display:flex;justify-content:space-between;border-bottom:1px solid #33425c;padding:9px 0;font-size:13px}',
 '.nono-account-row span{color:#b5c5dd}.nono-account-entry{font-size:12px;border-bottom:1px solid #283853;padding:7px 0}.nono-account-note{font-size:12px!important;color:#9aacc8!important}'
].join('');
document.head.append(style);
let auth=null,sdk=null,db=null,databaseSdk=null,user=null,scope='',modal=null,busy=false,syncJob=null,syncOwner='',syncTimer=null,connecting=false,applying=false;
const validKey=key=>key==='nono-completion-history-v1'||/^nono-web-puzzle-v1:[a-zA-Z0-9_-]{1,90}$/.test(key)||/^nono-records-[a-zA-Z0-9_-]{1,90}$/.test(key);
const json=(value,fallback)=>{try{return JSON.parse(value);}catch{return fallback;}};
const currentKeys=()=>Object.keys(localStorage).filter(validKey);
function localSnapshot(){
 const keys={};
 for(const key of currentKeys()){
  const value=localStorage.getItem(key);
  if(value&&value.length<280000)keys[key]=value;
 }
 return {format:1,keys};
}
function backup(name){
 try{localStorage.setItem(CACHE+name,JSON.stringify(localSnapshot()));}catch(e){console.warn('계정별 임시 기록 백업 실패',e);}
}
function changeScope(next,inheritGuest){
 const previous=localStorage.getItem(SCOPE)||'guest';
 if(previous===next)return;
 backup(previous);
 if(!inheritGuest){
  for(const key of currentKeys())localStorage.removeItem(key);
  const previousState=json(localStorage.getItem(CACHE+next),null);
  for(const [key,value] of Object.entries(previousState?.keys||{})){
   if(validKey(key)&&typeof value==='string')localStorage.setItem(key,value);
  }
 }
 localStorage.setItem(SCOPE,next);
 window.dispatchEvent(new Event('nono:completion-history-updated'));
}
function mergeHistory(a,b){
 const x=json(a,[]),y=json(b,[]),map=new Map();
 for(const row of [...(Array.isArray(y)?y:[]),...(Array.isArray(x)?x:[])]){
  if(!row||typeof row.key!=='string'||!Number.isFinite(row.finishedAt))continue;
  const old=map.get(row.key);
  if(!old||row.status==='published'||old.status!=='published')map.set(row.key,row);
 }
 return JSON.stringify([...map.values()].sort((p,q)=>q.finishedAt-p.finishedAt).slice(0,1000));
}
function mergeRecords(a,b){
 const x=json(a,[]),y=json(b,[]),map=new Map();
 for(const row of [...(Array.isArray(y)?y:[]),...(Array.isArray(x)?x:[])]){
  if(!row||!Number.isFinite(row.finishedAt)||!Number.isFinite(row.duration))continue;
  map.set(String(row.finishedAt)+':'+String(row.duration)+':'+String(row.changes||0),row);
 }
 return JSON.stringify([...map.values()].sort((p,q)=>p.duration-q.duration).slice(0,50));
}
function mergeState(a,b){
 const out={format:1,keys:{}},left=a?.format===1?a.keys||{}:{},right=b?.format===1?b.keys||{}:{};
 for(const key of new Set([...Object.keys(left),...Object.keys(right)])){
  if(!validKey(key))continue;
  let local=left[key],remote=right[key],value;
  if(typeof local!=='string')value=remote;
  else if(typeof remote!=='string')value=local;
  else if(key==='nono-completion-history-v1')value=mergeHistory(local,remote);
  else if(key.startsWith('nono-records-'))value=mergeRecords(local,remote);
  else{
   const x=json(local,null),y=json(remote,null);
   value=!x||typeof x.board!=='string'?remote:!y||typeof y.board!=='string'?local:(Number(y.savedAt)||0)>(Number(x.savedAt)||0)?remote:local;
  }
  if(typeof value==='string'&&value.length<280000)out.keys[key]=value;
 }
 return out;
}
function applyState(state){
 const combined=mergeState(localSnapshot(),state);
 for(const [key,value] of Object.entries(combined.keys))if(localStorage.getItem(key)!==value)localStorage.setItem(key,value);
 backup(localStorage.getItem(SCOPE)||'guest');
 applying=true;
 try{window.dispatchEvent(new Event('nono:completion-history-updated'));}finally{applying=false;}
 if(typeof resumeHub!=='undefined')resumeHub?.refresh?.();
}
const isSignedIn=()=>!!user&&!user.isAnonymous;
async function syncNow(){
 if(!isSignedIn()||!db||!databaseSdk)return;
 const uid=user.uid;
 if(syncJob&&syncOwner===uid)return syncJob;
 const atStart=localSnapshot();
 syncOwner=uid;
 const job=(async()=>{
  try{
   const path=databaseSdk.ref(db,'userSync/'+uid+'/state');
   const tx=await databaseSdk.runTransaction(path,previous=>{
    const merged=mergeState(atStart,json(previous,null));
    const payload=JSON.stringify(merged);
    return payload.length<=1200000?payload:undefined;
   },{applyLocally:false});
   if(!tx.committed)throw Error('클라우드 기록 용량 제한');
   if(auth.currentUser?.uid===uid&&user?.uid===uid){
    applyState(json(tx.snapshot.val(),null));
    window.dispatchEvent(new Event('nono:account-synced'));
   }
   return true;
  }catch(error){
   console.warn('기록 동기화 실패 · 로컬 기록 유지',error);
   message('기록 동기화에 실패했어요. 진행 상태는 현재 브라우저에 보존됩니다.');
   return false;
  }
 })();
 syncJob=job;
 try{return await job;}finally{if(syncJob===job){syncJob=null;syncOwner='';}}
}
function scheduleSync(){
 if(!isSignedIn())return;
 clearTimeout(syncTimer);
 syncTimer=setTimeout(()=>syncNow(),6000);
}
function message(value){const box=$('nono-account-status');if(box)box.textContent=value;}
// Keep profile actions translated even when auth state changes after locale initialization.
const CHIP_LABELS={
 ko:['로그인','내 프로필','로그인 / 내 기록'],
 en:['Login','My profile','Login / My records'],
 ja:['ログイン','マイプロフィール','ログイン / マイ記録'],
 'zh-CN':['登录','我的资料','登录 / 我的记录'],
 'zh-TW':['登入','我的個人資料','登入 / 我的紀錄'],
 es:['Iniciar sesión','Mi perfil','Inicio de sesión / Mis registros'],
 'pt-BR':['Entrar','Meu perfil','Entrar / Meus recordes'],
 fr:['Connexion','Mon profil','Connexion / Mes records'],
 de:['Anmelden','Mein Profil','Anmelden / Meine Rekorde'],
 id:['Masuk','Profil saya','Masuk / Rekor saya'],
 vi:['Đăng nhập','Hồ sơ của tôi','Đăng nhập / Kỷ lục của tôi'],
 th:['เข้าสู่ระบบ','โปรไฟล์ของฉัน','เข้าสู่ระบบ / สถิติของฉัน']
};
function updateChip(){
 const locale=window.NONO_I18N?.locale||document.documentElement.lang||'ko';
 const labels=CHIP_LABELS[locale]||CHIP_LABELS.en;
 const signed=isSignedIn();
 $('profile-name').textContent=labels[signed?1:0];
 button.title=labels[signed?1:2];
 button.setAttribute('aria-label',button.title);
}
window.addEventListener('nono:languagechange',updateChip);
async function changeUser(next){
 const previous=scope;
 user=next||null;
 if(typeof currentUser!=='undefined')currentUser=next||null;
 const target=next&&!next.isAnonymous?next.uid:'guest';
 updateChip();
 if(previous===target)return;
 clearTimeout(syncTimer);
 scope=target;
 const movedGuest=previous==='guest'&&target!=='guest';
 changeScope(target,movedGuest);
 if(target!=='guest'){
  const synced=await syncNow();
  if(movedGuest&&synced===true)localStorage.setItem(CACHE+'guest',JSON.stringify({format:1,keys:{}}));
 }
 else if(!localStorage.getItem(INTRO)&&auth)setTimeout(()=>{if(!isSignedIn()&&!modal)open('welcome');},300);
 if(typeof resumeHub!=='undefined'){resumeHub?.watch?.();resumeHub?.refresh?.();}
 window.dispatchEvent(new CustomEvent('nono:account-changed',{detail:{previous,target}}));
}
function node(tag,text,parent,className){
 const n=document.createElement(tag);if(text!==null)n.textContent=text;
 if(className)n.className=className;if(parent)parent.append(n);return n;
}
function close(){if(!modal)return;modal.remove();modal=null;document.removeEventListener('keydown',esc);}
function esc(e){if(e.key==='Escape'&&!busy)close();}
function action(container,label,fn){
 const b=node('button',label,container);
 b.type='button';b.onclick=fn;return b;
}
function row(container,label,value){
 const r=node('div',null,container,'nono-account-row');node('span',label,r);node('strong',String(value),r);
}
function open(kind='profile'){
 close();
 modal=node('div',null,document.body,'nono-account-shade');
 const panel=node('section',null,modal,'nono-account-panel');panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
 const x=node('button','×',panel,'nono-account-close');x.type='button';x.setAttribute('aria-label','닫기');x.onclick=close;
 node('h2',kind==='welcome'?'NONO 시작하기':'내 프로필',panel);
 if(kind==='welcome')node('p','로그인 없이 혼자 풀기를 즐길 수 있어요. Google 또는 Apple로 로그인하면 퍼즐 진행 상태와 완료 기록을 기기 간 동기화할 수 있어요.',panel);
 else{
  node('p',isSignedIn()?(user.displayName||'소셜 계정')+' · 로그인됨':'비회원 플레이 중 · 이 브라우저에서만 기록이 보관됩니다.',panel);
  const history=json(localStorage.getItem('nono-completion-history-v1'),[]);
  const records=Array.isArray(history)?history:[];
  row(panel,'혼자하기 클리어',records.filter(x=>x.mode==='solo').length);
  row(panel,'대결 완료',records.filter(x=>x.mode==='race').length);
  row(panel,'협동 완료',records.filter(x=>x.mode==='coop').length);
  const saves=currentKeys().filter(k=>k.startsWith('nono-web-puzzle-v1:')&&json(localStorage.getItem(k),{})?.finishedAt===0);
  row(panel,'혼자하기 이어서 풀기',saves.length);
  const wallet=json(localStorage.getItem('nono-daily-preview-v1'),null);
  if(wallet&&Number.isFinite(wallet.points))row(panel,'체험 포인트 (브라우저 저장)',wallet.points+' P');
  for(const item of records.slice().sort((a,b)=>b.finishedAt-a.finishedAt).slice(0,5)){
   if(item?.puzzleId)node('div',(item.mode==='solo'?'혼자':item.mode==='race'?'대결':'협동')+' · '+item.puzzleId+' · '+new Date(item.finishedAt).toLocaleDateString(),panel,'nono-account-entry');
  }
 }
 const controls=node('div',null,panel,'nono-account-buttons');
 if(!isSignedIn()){
  const g=action(controls,'Google로 계속하기',()=>login('google'));
  const a=action(controls,'Apple로 계속하기',()=>login('apple'));
  g.disabled=a.disabled=!auth;
  action(controls,'로그인 없이 혼자하기',()=>{localStorage.setItem(INTRO,'1');close();});
 }else{
  if(!user.providerData.some(p=>p.providerId==='google.com'))action(controls,'Google 계정 연결',()=>login('google'));
  if(!user.providerData.some(p=>p.providerId==='apple.com'))action(controls,'Apple 계정 연결',()=>login('apple'));
  action(controls,'기록 동기화',()=>syncNow());
  action(controls,'로그아웃',logout);
 }
 node('p','Undo/Redo는 기존 숫자 기록 형식을 유지합니다. 대결·협동 진행 중에는 로그인 수단을 전환할 수 없습니다.',panel,'nono-account-note');
 const status=node('p','',panel,'nono-account-note');status.id='nono-account-status';status.setAttribute('aria-live','polite');
 modal.addEventListener('click',event=>{if(event.target===modal&&!busy)close();});
 document.addEventListener('keydown',esc);x.focus();
}
async function login(providerName){
 if(!auth||!sdk)return message('Firebase 연결을 확인해 주세요.');
 if(typeof roomCode!=='undefined'&&roomCode)return message('진행 중인 대결·협동 방에서 먼저 나와 주세요.');
 if(busy)return;
 busy=true;message('로그인 창을 여는 중…');
 try{
  const provider=providerName==='google'?new sdk.GoogleAuthProvider():new sdk.OAuthProvider('apple.com');
  if(providerName==='apple')provider.addScope('email');
  try{
   if(auth.currentUser)await sdk.linkWithPopup(auth.currentUser,provider);
   else await sdk.signInWithPopup(auth,provider);
  }catch(error){
   if(error.code!=='auth/credential-already-in-use')throw error;
   if(auth.currentUser&&!auth.currentUser.isAnonymous)throw new Error('이미 다른 계정과 연결된 로그인 수단이에요. 해당 계정에 먼저 로그인해야 합니다.');
   const credential=providerName==='google'?sdk.GoogleAuthProvider.credentialFromError(error):sdk.OAuthProvider.credentialFromError(error);
   if(!credential)throw error;
   await sdk.signInWithCredential(auth,credential);
  }
  await changeUser(auth.currentUser);
  localStorage.setItem(INTRO,'1');
  close();open('profile');
 }catch(error){
  const errors={
   'auth/operation-not-allowed':'Firebase에서 이 로그인 제공업체를 활성화해야 해요.',
   'auth/unauthorized-domain':'Firebase 승인 도메인에 현재 사이트를 등록해야 해요.',
   'auth/popup-blocked':'팝업 허용 설정을 확인해 주세요.',
   'auth/popup-closed-by-user':'로그인 창을 닫았어요.',
   'auth/account-exists-with-different-credential':'같은 이메일이 다른 소셜 계정에 연결되어 있어요. 기존 방식으로 로그인한 다음 연결해 주세요.'
  };
  console.warn('소셜 로그인 실패',error);
  message(errors[error.code]||error.message||'로그인에 실패했어요: '+(error.code||'연결 상태 확인'));
 }finally{busy=false;}
}
async function logout(){
 if(!auth||busy)return;
 if(typeof roomCode!=='undefined'&&roomCode)return message('대결·협동 방에서 먼저 나와 주세요.');
 busy=true;
 try{
  if(user?.uid)backup(user.uid);
  if(await syncNow()===false){message('클라우드 동기화가 실패해 로그아웃을 중단했어요. 연결을 확인해 주세요.');return;}
  await sdk.signOut(auth);
  const credential=await sdk.signInAnonymously(auth);
  await changeUser(credential.user);
  close();open('profile');
 }catch(e){message('로그아웃에 실패했어요: '+(e.code||'연결 오류'));}finally{busy=false;}
}
button.addEventListener('click',()=>open('profile'));
window.addEventListener('nono:completion-confirmed',scheduleSync);
window.addEventListener('nono:local-record-changed',scheduleSync);
window.addEventListener('nono:completion-history-updated',()=>{if(!applying)scheduleSync();});
window.addEventListener('focus',()=>{if(isSignedIn())syncNow();});
window.addEventListener('pagehide',()=>{if(isSignedIn())backup(user.uid);});
window.NONO_ACCOUNT={open,isSignedIn,require(){if(isSignedIn())return true;open('welcome');return false;},syncNow,scheduleSync};
function authReady(detail){
 if(connecting)return;
 connecting=true;
 auth=detail.auth;sdk=detail.sdk;db=detail.database;databaseSdk=detail.databaseSdk;
 changeUser(auth.currentUser);
 sdk.onAuthStateChanged(auth,next=>changeUser(next));
}
window.addEventListener('nono:auth-ready',event=>authReady(event.detail));
if(window.NONO_AUTH_READY_DETAIL)authReady(window.NONO_AUTH_READY_DETAIL);
updateChip();
})();
