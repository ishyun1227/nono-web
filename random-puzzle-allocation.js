/* Shared, verified random puzzle assignment.
 * The private completed-ID index and separate in-progress index are consulted
 * for the CURRENT player, without marking unfinished games as completed.
 * Server bank entries are read-only, seed-based v6 puzzles (no answers).
 * If no eligible bank entry exists, reuse a locally certified puzzle; otherwise
 * generate with existing fail-closed CaDiCaL uniqueness verification.
 *
 * Not authoritative completion verification / not a points decision.
 */
(function(root){
'use strict';
const groupSizes=[[5,10],[15,20],[25,30],[50,75,100]];
const levels=['쉬움','보통','어려움','전문가'];
const idPattern=/^random-[a-z0-9-]{1,85}$/;
function validRequest(sizes,difficulty){
  return Array.isArray(sizes)&&sizes.length>0&&sizes.every(size=>
    Number.isInteger(size)&&size>=5&&size<=100)&&levels.includes(difficulty);
}
function pickUnseen(candidates,completed,random=Math.random){
  if(!Array.isArray(candidates))return null;
  const seen=completed&&typeof completed==='object'?completed:{};
  const unique=new Map();
  for(const candidate of candidates){
    if(!candidate||!idPattern.test(candidate.id)||Object.hasOwn(seen,candidate.id))continue;
    if(!unique.has(candidate.id))unique.set(candidate.id,candidate);
  }
  const options=Array.from(unique.values());
  if(!options.length)return null;
  let roll=Number(random());
  if(!Number.isFinite(roll))roll=0;
  const index=Math.min(options.length-1,Math.max(0,Math.floor(roll*options.length)));
  return options[index];
}
function verifiedLocal(puzzle,sizes,difficulty,api){
  return !!puzzle&&puzzle.verified===true&&puzzle.designVersion===6&&
    sizes.includes(puzzle.size)&&puzzle.difficulty===difficulty&&
    idPattern.test(puzzle.id)&&api.validSpec(puzzle);
}
function verifiedBank(spec,size,difficulty,api){
  return !!spec&&typeof spec==='object'&&
    spec.verified===true&&spec.version===6&&spec.size===size&&
    spec.difficulty===difficulty&&idPattern.test(spec.id)&&
    api.validSpec(spec);
}
async function cloudCandidates(sizes,difficulty,api){
  const ready=root.NONO_AUTH_READY_DETAIL;
  if(!ready?.database||!ready?.databaseSdk||!ready.auth?.currentUser)return [];
  const sdk=ready.databaseSdk,db=ready.database;
  // Individual bucket reads avoid reading the whole shared bank.
  const batches=await Promise.all(sizes.map(async size=>{
    try{
      const snap=await sdk.get(sdk.ref(db,'randomPuzzleBank/'+size+'_'+difficulty));
      const data=snap.val();
      if(!data||typeof data!=='object'||Array.isArray(data))return [];
      const puzzles=[];
      for(const spec of Object.values(data)){
        if(!verifiedBank(spec,size,difficulty,api))continue;
        try{puzzles.push({...api.fromSpec(spec),verified:true});}
        catch(error){console.warn('검증된 공용 랜덤 퍼즐 스펙 복원 실패',error);}
      }
      return puzzles;
    }catch(error){
      // Unavailable bank never turns an unverified puzzle into an accepted one.
      console.warn('공용 랜덤 퍼즐 보관함 조회 실패',error);
      return [];
    }
  }));
  return batches.flat();
}
// Ask the privileged scheduled job to refill ONLY when this signed-in
// player's unfinished bank choices in a particular size/level reach <=10.
// The backend checks authoritative completed IDs; clients cannot publish.
const requestedThisSession=new Set();
let recentlySelectedBank=null;
async function requestRestockIfLow(candidates,sizes,difficulty,completed){
  const ready=root.NONO_AUTH_READY_DETAIL;
  const auth=ready?.auth?.currentUser,sdk=ready?.databaseSdk,db=ready?.database;
  if(!auth||auth.isAnonymous||!sdk?.get||!sdk?.ref||!sdk?.set||!sdk?.serverTimestamp||!db)
    return;
  for(const size of sizes){
    const bucket=size+'_'+difficulty;
    const items=candidates.filter(p=>p.size===size&&p.difficulty===difficulty);
    // No completed history for this bucket? Initial 100-stock job handles it.
    if(!items.length)continue;
    const available=items.reduce((sum,p)=>sum+(Object.hasOwn(completed,p.id)?0:1),0);
    if(available>10||requestedThisSession.has(auth.uid+':'+bucket))continue;
    requestedThisSession.add(auth.uid+':'+bucket);
    try{
      const path=sdk.ref(db,'randomRestockRequests/'+auth.uid+'/'+bucket);
      if(!(await sdk.get(path)).exists())
        await sdk.set(path,sdk.serverTimestamp());
    }catch(error){
      requestedThisSession.delete(auth.uid+':'+bucket);
      console.warn('퍼즐 보충 요청은 아직 서버에 전달되지 않았어요.',error);
    }
  }
}
async function choose({group,difficulty,localPuzzles=[]}={}){
  const api=root.NONO_RANDOM_PUZZLES;
  const completion=root.NONO_COMPLETED_PUZZLES;
  const sizes=groupSizes[group];
  if(!api?.generateAsync||!api?.fromSpec||!api?.restore||
     !sizes||!validRequest(sizes,difficulty))
    throw Error('랜덤 퍼즐 생성 조건이 올바르지 않습니다.');
  // Synchronize account completions before assigning a puzzle, including
  // completions made on another device. Guests use local data only.
  const synced=await completion?.ready?.();
  const done=completion?.all?.()||{};
  // Exclude ALL unfinished saves: solo, race, and shared co-op. This is a
  // temporary allocation blocklist, never written to completed history.
  const pending=await root.NONO_RANDOM_IN_PROGRESS?.all?.()||[];
  const blocked=Object.assign(Object.create(null),done);
  for(const id of pending)
    if(typeof id==='string'&&idPattern.test(id))blocked[id]=true;
  const cloud=await cloudCandidates(sizes,difficulty,api);
  // Keep only the current account's latest bank snapshot so the 90th
  // completion can request replenishment without waiting for another click.
  recentlySelectedBank={
    uid:root.NONO_AUTH_READY_DETAIL?.auth?.currentUser?.uid||null,
    sizes:sizes.slice(),difficulty,candidates:cloud
  };
  // Do not delay gameplay for the scheduled refill request.
  void requestRestockIfLow(cloud,sizes,difficulty,done);
  const bank=pickUnseen(cloud,blocked);
  if(bank)return {puzzle:bank,source:'bank',syncStatus:synced};
  const local=(localPuzzles.length?localPuzzles:api.restore())
    .filter(p=>verifiedLocal(p,sizes,difficulty,api));
  const cached=pickUnseen(local,blocked);
  if(cached)return {puzzle:cached,source:'local',syncStatus:synced};
  // Entire group is exhausted for THIS player, not for other users.
  // Fresh candidate must independently pass CaDiCaL blocked-reference UNSAT.
  const size=sizes[Math.floor(Math.random()*sizes.length)];
  const puzzle=await api.generateAsync({size,difficulty,maxMs:5000});
  if(!puzzle||puzzle.verified!==true||Object.hasOwn(blocked,puzzle.id)||completion?.has?.(puzzle.id))
    throw Error('유일해가 확인된 새 퍼즐을 배정하지 못했습니다.');
  return {puzzle,source:'generated',syncStatus:synced};
}
function onCompletion(event){
  const id=event?.detail?.puzzleId;
  const bank=recentlySelectedBank;
  if(typeof id!=='string'||!idPattern.test(id)||!bank||
     !bank.uid||bank.uid!==root.NONO_AUTH_READY_DETAIL?.auth?.currentUser?.uid||
     !bank.candidates.some(item=>item.id===id))return;
  const done=root.NONO_COMPLETED_PUZZLES?.all?.()||{};
  void requestRestockIfLow(bank.candidates,bank.sizes,bank.difficulty,done);
}
if(typeof root.addEventListener==='function'){
  root.addEventListener('nono:completion-confirmed',onCompletion);
  root.addEventListener('nono:private-puzzle-completed',onCompletion);
}
const api={choose,pickUnseen,verifiedLocal,verifiedBank,cloudCandidates,requestRestockIfLow,groupSizes};
root.NONO_RANDOM_ALLOCATION=Object.freeze(api);
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
