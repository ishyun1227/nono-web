/* Participant-only multiplayer numeric replay.
 * Stores successful, server-acknowledged cell edits as numeric deltas.
 * NOT authoritative for competitive scoring: event writes are client supplied.
 * Coop updates and replay writes are separate transactions; concurrent writes
 * can lead to ordering ambiguity, which is surfaced rather than fabricated.
 */
(function () {
  'use strict';
  let pending = Promise.resolve(), count = 0, currentCode = '';
  const colors = ['#437fee','#ea8a51','#a565de','#3eae8a','#e1ba4c','#e9709a'];
  const valid = changes => Array.isArray(changes) && changes.length > 0 &&
    changes.length <= 250 && changes.every(c=>Array.isArray(c)&&c.length===3&&c.every(n=>Number.isInteger(n)));
  function ready(code) {return onlineReady() && code && /^[A-HJ-NP-Z2-9]{6}$/.test(code) && typeof push==='function';}
  function record(detail) {
    if (!detail || !ready(detail.room) || !valid(detail.changes)) return;
    const modeValue=detail.mode,actor=detail.actor,room=detail.room;
    if (!['coop','race'].includes(modeValue) || actor!==currentId()) return;
    const start=Number(detail.startedAt)||serverNow();
    const elapsed=Math.max(0,Math.min(86400000,Math.round((Number(detail.at)||serverNow())-start)));
    const cells=JSON.stringify(detail.changes);
    if(cells.length>12000)return;
    // Serialise own submissions, preserving a reproducible participant order.
    pending=pending.catch(()=>{}).then(async()=>{
      if (!ready(room))return;
      const base=ref(database,'rooms/'+room+'/replayEvents/'+actor);
      const key=push(base);
      await set(key,{actor,mode:modeValue,elapsedMs:elapsed,cells,at:serverTimestamp()});
    }).catch(error=>console.warn('멀티플레이 숫자 기록 전송 실패',error));
  }
  window.addEventListener('nono:race-committed',e=>record(e.detail));
  window.addEventListener('nono:coop-committed',e=>record(e.detail));

  function normalizeEvents(raw,size) {
    const items=[];
    if(!raw||typeof raw!=='object')return [];
    for(const [uid,actions] of Object.entries(raw)){
      if(!actions||typeof actions!=='object')continue;
      for(const [key,v] of Object.entries(actions)){
        if(v?.actor!==uid || !['race','coop'].includes(v.mode) || !Number.isFinite(v.at) ||
          !Number.isFinite(v.elapsedMs) || typeof v.cells!=='string'||v.cells.length>12000)continue;
        let changes;try{changes=JSON.parse(v.cells);}catch{continue;}
        if(!valid(changes)||!changes.every(c=>c[0]>=0&&c[0]<size*size&&c[1]>=0&&c[1]<=2&&c[2]>=0&&c[2]<=2))continue;
        items.push({uid,key,at:v.at,ms:v.elapsedMs,changes,mode:v.mode});
      }
    }
    // Cross-client clock is ordered by server write acceptance; within one
    // stroke cell order is exactly the saved numeric delta order.
    return items.sort((a,b)=>a.at-b.at||a.key.localeCompare(b.key));
  }
  function makeRaceData(events,users,size,started){
    const actorIds=users.map(p=>p.uid);
    const per=Object.fromEntries(actorIds.map(uid=>[uid,[]]));
    for(const e of events)if(e.mode==='race'&&per[e.uid])per[e.uid].push(e);
    const maxTime=Math.max(1,...events.map(e=>e.ms));
    return {actors:users,size,per,maxTime,started};
  }
  function colorFor(index){return colors[index%colors.length];}
  function draw(canvas,board,size,owner=null) {
    const ctx=canvas.getContext('2d');if(!ctx)return;
    canvas.width=size;canvas.height=size;
    const image=ctx.createImageData(size,size);
    for(let i=0;i<board.length;i++){
      const value=board[i], rgb=value===1?(
        owner?.[i]>0?hexColor(colorFor(owner[i]-1)):[24,32,52]
      ):value===2?[168,177,196]:[255,255,255];
      const p=i*4;
      image.data[p]=rgb[0];image.data[p+1]=rgb[1];image.data[p+2]=rgb[2];image.data[p+3]=255;
    }
    ctx.putImageData(image,0,0);
  }
  function hexColor(s){return [1,3,5].map(i=>parseInt(s.slice(i,i+2),16));}
  function animate(canvasList,events,users,size,coop,subtitle,onStop) {
    const start=Array(size*size).fill(0);
    const board=coop?start.slice():users.map(()=>start.slice());
    const owners=coop?start.slice():null;
    const uidMap=new Map(users.map((u,i)=>[u.uid,i]));
    const steps=[];
    for(const event of events)for(const change of event.changes)steps.push({
      uid:event.uid,cell:change[0],before:change[1],after:change[2],ms:event.ms,
      at:event.at, mode:event.mode
    });
    if(!coop)steps.sort((a,b)=>a.ms-b.ms||a.at-b.at);
    const max=coop ? Math.max(1,steps.length):Math.max(1,...steps.map(s=>s.ms));
    let position=0,origin=performance.now(),raf=0,issues=0,frame=0;
    function reset(){
      position=0;issues=0;
      if(coop){board.fill(0);owners.fill(0);}
      else for(const b of board)b.fill(0);
    }
    function tick(now){
      const ratio=((now-origin)%8000)/8000;
      const elapsed=ratio*max;
      if(frame++ % 2===0 && document.hidden){raf=requestAnimationFrame(tick);return;}
      let target=0;
      if(coop)target=Math.floor(ratio*(steps.length+1));
      else {
        // Exact timestamps determine which player is ahead at the same time.
        while(target<steps.length && steps[target].ms<=elapsed)target++;
      }
      if(target<position)reset();
      while(position<target){
        const s=steps[position++];
        const i=uidMap.get(s.uid);if(i===undefined)continue;
        const dest=coop?board:board[i];
        if(dest[s.cell]!==s.before){issues++;continue;}
        dest[s.cell]=s.after;
        if(coop)owners[s.cell]=s.after===1?i+1:0;
      }
      if(coop)draw(canvasList[0],board,size,owners);
      else canvasList.forEach((canvas,i)=>draw(canvas,board[i],size));
      if(subtitle)subtitle.textContent=issues?
        '동시 편집으로 기록 순서가 겹친 칸 '+issues+'개 · 일부 과정이 생략됐어요':
        '숫자 기록으로 재생 중 · GIF 파일 없음';
      raf=requestAnimationFrame(tick);
    }
    raf=requestAnimationFrame(tick);
    onStop.push(()=>cancelAnimationFrame(raf));
  }
  async function openRoomReplay(){
    const code=roomCode,kind=mode;
    if(!ready(code)||!['coop','race'].includes(kind))return;
    try{
      const snapshot=await get(ref(database,'rooms/'+code+'/replayEvents'));
      if(code!==roomCode)return;
      const users=Object.values(players||{}).filter(p=>p?.uid).map(p=>({uid:p.uid,name:p.name||'플레이어'}));
      for(const uid of Object.keys(snapshot.val()||{}))if(!users.some(p=>p.uid===uid))users.push({uid,name:'이전 참가자'});
      if(kind==='race' && raceStates){
        for(const uid of Object.keys(raceStates)){
          if(!users.some(x=>x.uid===uid))users.push({uid,name:'참여자'});
        }
      }
      const events=normalizeEvents(snapshot.val(),puzzle.size).filter(e=>e.mode===kind);
      if(!events.length){toast('아직 저장된 숫자 리플레이가 없어요.');return;}
      // Room replay stays participant-only; do not display it on the public feed.
      const overlay=document.createElement('div');
      overlay.className='nono-replay-overlay';
      const dialog=document.createElement('div');
      dialog.className='nono-replay-dialog';
      dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');
      dialog.style.width=kind==='race'?'min(780px,96vw)':'min(480px,96vw)';
      const top=document.createElement('div');top.className='nono-replay-dialog-head';
      const title=document.createElement('strong');title.textContent=kind==='coop'?'협동 풀이 기록':'대결 풀이 비교';
      const close=document.createElement('button');close.textContent='닫기';close.type='button';
      top.append(title,close);dialog.append(top);
      const caption=document.createElement('p');caption.style.cssText='font-size:12px;color:#afbfdf;margin:8px 0';
      caption.textContent='숫자 기록으로 재생 중 · GIF 파일 없음';dialog.append(caption);
      const grid=document.createElement('div');
      grid.style.cssText='display:flex;flex-wrap:wrap;gap:14px;justify-content:center';
      const list=[];
      if(kind==='coop'){
        const canvas=document.createElement('canvas');canvas.className='nono-replay-large';
        grid.append(canvas);list.push(canvas);
        const legend=document.createElement('div');legend.style.cssText='display:flex;flex-wrap:wrap;gap:8px';
        users.forEach((u,i)=>{
          const span=document.createElement('span');span.style.cssText='font-size:12px;color:'+colorFor(i);
          span.textContent='■ '+u.name;legend.append(span);
        });
        dialog.append(grid,legend);
      }else{
        for(const [i,p] of users.entries()){
          const col=document.createElement('div');col.style.cssText='min-width:120px;flex:1 1 135px;max-width:180px;text-align:center';
          const name=document.createElement('div');name.textContent=p.name;name.style.cssText='font-size:12px;margin-bottom:6px';
          const canvas=document.createElement('canvas');canvas.className='nono-replay-large';
          canvas.style.cssText='width:100%;height:auto;aspect-ratio:1/1;image-rendering:pixelated';
          col.append(name,canvas);grid.append(col);list.push(canvas);
        }
        dialog.append(grid);
      }
      overlay.append(dialog);document.body.append(overlay);
      const disposers=[];
      animate(list,events,users,puzzle.size,kind==='coop',caption,disposers);
      const onKey=e=>{if(e.key==='Escape')dismiss();};
      function dismiss(){disposers.forEach(d=>d());document.removeEventListener('keydown',onKey);overlay.remove();}
      close.addEventListener('click',dismiss);overlay.addEventListener('click',e=>{if(e.target===overlay)dismiss();});
      document.addEventListener('keydown',onKey);
    }catch(error){console.warn('멀티 리플레이 조회 실패',error);toast('리플레이를 불러오지 못했어요.');}
  }

  const button=document.createElement('button');
  button.type='button';button.textContent='숫자 리플레이 보기';button.className='button outline';
  button.style.cssText='font-size:12px;max-width:fit-content';
  button.addEventListener('click',openRoomReplay);
  const side=document.getElementById('live-results');
  if(side?.parentElement)side.parentElement.append(button);
  const observer=new MutationObserver(()=>{
    const available=!!roomCode && (mode==='race' || mode==='coop') &&
      (mode==='coop'?finished:Object.values(raceStates||{}).some(s=>s?.finishedAt));
    button.hidden=!available;
  });
  observer.observe(document.getElementById('game'),{subtree:true,childList:true,attributes:true,attributeFilter:['class','aria-selected']});
  button.hidden=true;
  window.NONO_MULTIPLAYER_REPLAY={normalizeEvents,makeRaceData};
})();
