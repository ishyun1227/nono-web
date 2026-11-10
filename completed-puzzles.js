/* NONO private, per-player completed puzzle index.
 * Only completed puzzle IDs are recorded. In-progress boards, gameplay logs,
 * and public per-puzzle user lists are NOT part of this index.
 * This is a personal discovery index, NOT authoritative proof for rewards.
 */
(function(root){
'use strict';
const PREFIX='nono-completed-puzzles-v1:';
const SCOPE='nono-account-scope-v1';
const ID=/^[A-Za-z0-9_-]{1,90}$/;
const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);
const validStamp=v=>Number.isFinite(v)&&v>0;
function scope(){
  try{const value=localStorage.getItem(SCOPE)||'guest';return value==='guest'||ID.test(value)?value:'guest';}
  catch{return 'guest';}
}
function read(name=scope()){
  const out=Object.create(null);
  try{
    const stored=JSON.parse(localStorage.getItem(PREFIX+name)||'{}');
    if(stored&&typeof stored==='object'&&!Array.isArray(stored))
      for(const [id,time] of Object.entries(stored))
        if(ID.test(id)&&validStamp(time))out[id]=time;
  }catch{}
  return out;
}
function save(name,data){
  try{localStorage.setItem(PREFIX+name,JSON.stringify(data));return true;}
  catch(error){console.warn('완료 퍼즐 인덱스 저장 실패',error);return false;}
}
function combine(...maps){
  const result=Object.create(null);
  for(const map of maps)for(const [id,time] of Object.entries(map||{}))
    if(ID.test(id)&&validStamp(time)&&(!own(result,id)||time<result[id]))
      result[id]=time;
  return result;
}
function broadcast(){root.dispatchEvent(new Event('nono:completed-puzzles-updated'));}
function importHistory(){
  let history;
  try{history=JSON.parse(localStorage.getItem('nono-completion-history-v1')||'[]');}
  catch{return;}
  if(!Array.isArray(history))return;
  const name=scope(),old=read(name),found=Object.create(null);
  for(const item of history)
    if(item&&['solo','race','coop'].includes(item.mode)&&
       ID.test(item.puzzleId)&&validStamp(item.finishedAt))
      found[item.puzzleId]=Math.min(found[item.puzzleId]||Infinity,item.finishedAt);
  const merged=combine(old,found);
  if(Object.keys(merged).length!==Object.keys(old).length&&save(name,merged))broadcast();
}
function has(id){return typeof id==='string'&&own(read(),id);}
function all(){return {...read()};}
function unseen(items){
  const done=read();
  return Array.isArray(items)?items.filter(item=>{
    const id=typeof item==='string'?item:item?.id;
    return ID.test(id||'')&&!own(done,id);
  }):[];
}
function completedCount(){return Object.keys(read()).length;}
function mark(detail){
  if(!detail||!['solo','race','coop'].includes(detail.mode)||
     typeof detail.puzzleId!=='string'||!ID.test(detail.puzzleId)||
     !validStamp(Number(detail.finishedAt)))return false;
  const name=scope(),existing=read(name),id=detail.puzzleId;
  if(own(existing,id))return false;
  existing[id]=Number(detail.finishedAt);
  if(!save(name,existing))return false;
  broadcast();
  scheduleSync();
  return true;
}
let task=null,again=false,timer=null;
function connection(){
  const details=root.NONO_AUTH_READY_DETAIL;
  const user=details?.auth?.currentUser;
  if(!user||user.isAnonymous||user.uid!==scope()||
     !details?.database||!details?.databaseSdk)return null;
  return {uid:user.uid,db:details.database,sdk:details.databaseSdk};
}
function scheduleSync(){
  if(!connection())return;
  if(task){again=true;return;}
  clearTimeout(timer);
  timer=setTimeout(()=>{syncNow().catch(error=>console.warn('완료 퍼즐 동기화 오류',error));},300);
}
async function syncNow(){
  if(task){again=true;return task;}
  const conn=connection();
  if(!conn)return false;
  const {uid,db,sdk}=conn;
  const job=(async()=>{
    try{
      const path=sdk.ref(db,'userCompleted/'+uid);
      const snap=await sdk.get(path);
      if(scope()!==uid||connection()?.uid!==uid)return false;
      const remote=Object.create(null),values=snap.val()||{};
      if(values&&typeof values==='object')
        for(const [id,time] of Object.entries(values))
          if(ID.test(id)&&validStamp(time))remote[id]=time;
      const local=read(uid);
      const missing=Object.keys(local).filter(id=>!own(remote,id));
      // Per-ID immutable writes; batch only IDs absent from the server snapshot.
      // A concurrent device could write an ID first: retry on next sync.
      for(let i=0;i<missing.length;i+=80){
        if(scope()!==uid||connection()?.uid!==uid)return false;
        const chunk=Object.fromEntries(missing.slice(i,i+80)
          .map(id=>[id,sdk.serverTimestamp()]));
        await sdk.update(path,chunk);
      }
      if(scope()!==uid||connection()?.uid!==uid)return false;
      const combined=combine(remote,read(uid));
      const previous=read(uid);
      if(Object.keys(combined).length!==Object.keys(previous).length&&save(uid,combined))broadcast();
      return true;
    }catch(error){
      console.warn('완료 퍼즐 클라우드 동기화 실패 · 브라우저 기록은 유지',error);
      return false;
    }
  })();
  task=job;
  try{return await job;}
  finally{
    if(task===job){
      task=null;
      if(again){again=false;scheduleSync();}
    }
  }
}
async function ready(){
  importHistory();
  return syncNow();
}
function onAccountChanged(event){
  const previous=event?.detail?.previous,target=event?.detail?.target;
  if(target&&target!=='guest'&&previous==='guest'){
    const merged=combine(read(target),read('guest'));
    save(target,merged);
  }
  importHistory();
  broadcast();
  scheduleSync();
}
root.addEventListener('nono:completion-confirmed',event=>mark(event.detail));
root.addEventListener('nono:private-puzzle-completed',event=>mark(event.detail));
root.addEventListener('nono:account-changed',onAccountChanged);
root.addEventListener('nono:completion-history-updated',()=>{importHistory();scheduleSync();});
root.addEventListener('nono:account-synced',()=>{importHistory();scheduleSync();});
root.addEventListener('nono:auth-ready',scheduleSync);
importHistory();
root.NONO_COMPLETED_PUZZLES=Object.freeze({
  all,has,unseen,completedCount,ready
});
})(window);
