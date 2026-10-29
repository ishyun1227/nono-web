/* Local first-stage NONO numeric replay integration.
 * All completed local runs are retained as numeric actions, not GIFs.
 * Public multi-player replay needs server-side persistence and verification.
 */
(function () {
  'use strict';
  const API = window.NONO_REPLAY;
  if (!API) return;
  const replayPrefix='nono-account-replay-v1:';
  const getScope=()=>window.NONO_ACCOUNT?.isSignedIn()&&currentUser?.uid?currentUser.uid:'guest';
  const storageKey=(scope,key)=>replayPrefix+scope+':'+key;
  const local={
    getItem(key){return storage.getItem(storageKey(getScope(),key));},
    setItem(key,value){storage.setItem(storageKey(getScope(),key),value);},
    removeItem(key){storage.removeItem(storageKey(getScope(),key));}
  };
  // Never upload one account's locally stored replay history into another account.
  window.NONO_REPLAY_STORAGE=local;
  function moveGuestReplays(previous,next){
    if(previous!=='guest'||!next||next==='guest')return;
    const prefix=replayPrefix+'guest:',target=replayPrefix+next+':';
    const entries=Object.keys(localStorage).filter(key=>key.startsWith(prefix));
    const indexKey='nono-numeric-replay-v1:complete-index';
    for(const key of entries){
      if(key===prefix+indexKey)continue;
      const candidate=target+key.slice(prefix.length);
      if(localStorage.getItem(candidate)===null)localStorage.setItem(candidate,localStorage.getItem(key));
    }
    const prevIndex=JSON.parse(localStorage.getItem(prefix+indexKey)||'[]');
    const nextIndex=JSON.parse(localStorage.getItem(target+indexKey)||'[]');
    if(Array.isArray(prevIndex)&&Array.isArray(nextIndex)){
      localStorage.setItem(target+indexKey,JSON.stringify([...new Set([...nextIndex,...prevIndex])].slice(0,300)));
    }
    for(const key of entries)localStorage.removeItem(key);
  }
  // New replay UI is translated independently so it does not stay Korean
  // when the user chooses a language whose dictionary predates this feature.
  const words = {
    recent:['최근 플레이','Recent plays','最近のプレイ'],
    help:['완료한 퍼즐의 움직이는 기록 · 미완료 퍼즐은 스포일러 방지를 위해 잠길 수 있어요.','Animated completed solves · unsolved puzzles stay locked to avoid spoilers.','完成したパズルのリプレイ · 未クリアのパズルはネタバレ防止のためロックされます。'],
    empty:['완료한 퍼즐이 없어요. 퍼즐을 완료하면 리플레이가 나타나요.','No completed puzzles yet. Finish one to see its replay.','クリアしたパズルがありません。クリアするとリプレイが表示されます。'],
    solo:['혼자 풀기','Solo','ひとりで'],
    record:['기록 경쟁','Time trial','タイムアタック'],
    full:['전체 풀이','Full solve','全プレイ'],
    partial:['중간부터 기록','Partial replay','途中からのリプレイ'],
    public:['공개 리플레이','Public replay','公開リプレイ'],
    locked:['완료 후 리플레이 공개','Unlock after completion','クリア後にリプレイを公開'],
    replay:['풀이 리플레이','Solve replay','プレイリプレイ'],
    close:['닫기','Close','閉じる'],
    share:['완료 기록을 다른 사람에게 공개','Share completed replays','完成したリプレイを公開']
  };
  const labels=['recent','help','empty','solo','record','full','partial','public','locked','replay','close','share'];
  const locales={
    'zh-CN':['最近游玩','已完成谜题的动态回放 · 未完成的谜题可能锁定以防剧透','还没有完成的谜题。完成后即可查看回放。','单人解谜','计时挑战','完整解题','部分回放','公开回放','完成后解锁回放','解题回放','关闭','向其他玩家公开完成记录'],
    'zh-TW':['最近遊玩','已完成謎題的動態重播 · 未完成的謎題可能鎖定以防劇透','尚無已完成的謎題。完成後即可觀看重播。','單人解謎','計時挑戰','完整解題','部分重播','公開重播','完成後解鎖重播','解題重播','關閉','向其他玩家公開完成紀錄'],
    es:['Partidas recientes','Repeticiones animadas de puzles completados · Los pendientes pueden estar bloqueados','Aún no has completado ningún puzle. Al terminar uno verás su repetición.','Solo','Contrarreloj','Solución completa','Repetición parcial','Repetición pública','Se desbloquea al completar','Repetición','Cerrar','Compartir partidas completadas'],
    'pt-BR':['Jogadas recentes','Replays animados de puzzles concluídos · Puzzles não concluídos podem ficar bloqueados','Você ainda não concluiu puzzles. Termine um para ver o replay.','Solo','Contra o tempo','Resolução completa','Replay parcial','Replay público','Desbloqueie ao concluir','Replay da solução','Fechar','Compartilhar partidas concluídas'],
    fr:['Parties récentes','Replays animés des grilles terminées · Les autres peuvent être verrouillées','Aucune grille terminée. Terminez-en une pour voir le replay.','Solo','Contre-la-montre','Solution complète','Replay partiel','Replay public','À débloquer après réussite','Replay de la solution','Fermer','Partager les parties terminées'],
    de:['Letzte Spiele','Animierte Wiederholungen gelöster Rätsel · Ungelöste Rätsel können gesperrt sein','Noch keine Rätsel gelöst. Schließe eines ab, um die Wiederholung anzusehen.','Solo','Zeitrennen','Vollständige Lösung','Teilweise Wiederholung','Öffentliche Wiederholung','Nach Abschluss freischalten','Lösungswiederholung','Schließen','Abgeschlossene Spiele teilen'],
    id:['Permainan terbaru','Putar ulang animasi puzzle selesai · Puzzle yang belum selesai dapat dikunci','Belum ada puzzle selesai. Selesaikan puzzle untuk melihat putar ulang.','Solo','Tantangan waktu','Penyelesaian penuh','Putar ulang sebagian','Putar ulang publik','Terbuka setelah selesai','Putar ulang solusi','Tutup','Bagikan permainan selesai'],
    vi:['Lượt chơi gần đây','Xem lại diễn biến giải đố đã hoàn thành · Câu đố chưa xong có thể bị khóa','Chưa có câu đố hoàn thành. Hoàn thành một câu để xem lại.','Chơi đơn','Thử thách thời gian','Lời giải đầy đủ','Phát lại một phần','Phát lại công khai','Mở khóa khi hoàn thành','Phát lại lời giải','Đóng','Chia sẻ lượt chơi đã hoàn thành'],
    th:['การเล่นล่าสุด','ดูการเล่นย้อนหลังแบบเคลื่อนไหวของปริศนาที่ผ่านแล้ว · ปริศนาที่ยังไม่ผ่านอาจถูกล็อก','ยังไม่มีปริศนาที่ผ่าน เล่นให้สำเร็จเพื่อดูย้อนหลัง','เล่นคนเดียว','แข่งทำเวลา','เฉลยทั้งหมด','เล่นย้อนหลังบางส่วน','เล่นย้อนหลังสาธารณะ','ปลดล็อกเมื่อเล่นสำเร็จ','เล่นย้อนหลังวิธีแก้','ปิด','แชร์การเล่นที่สำเร็จ']
  };
  const t = key => {
    const lang=window.NONO_I18N?.locale||document.documentElement.lang||'ko';
    const idx=lang.startsWith('ko')?0:lang.startsWith('ja')?2:1;
    const extra=locales[lang],position=labels.indexOf(key);
    return position>=0&&extra?extra[position]:(words[key]||[])[idx]||key;
  };
  const date = ms=>new Date(ms).toLocaleDateString(document.documentElement.lang||'ko-KR');
  let session = null, saveTimer = 0, warned = false;
  const getBoard = () => board.join('');
  const isSolo = () => (mode === 'practice' || mode === 'record') && !roomCode;
  function safeSave(complete) {
    if (!session) return;
    try {
      if (complete) API.saveCompleted(local, session);
      else API.savePending(local, session);
    } catch (error) {
      console.warn('숫자 리플레이 저장 실패 (로컬 공간/권한 확인)', error);
      if (!warned) {
        warned = true;
        toast('이 기기의 리플레이 저장 공간이 부족하거나 차단됐어요.');
      }
    }
  }
  function scheduleSave() {
    if (!session || session.completedAt || saveTimer) return;
    saveTimer = setTimeout(() => { saveTimer = 0; safeSave(false); }, 500);
  }
  function finishIfCompleted() {
    if (!session || session.completedAt || !finished || !isSolo()) return;
    clearTimeout(saveTimer); saveTimer = 0;
    if (API.boardAtEnd(session) !== getBoard()) {
      console.warn('리플레이와 게임판이 달라 완료 기록을 생성하지 않았어요.');
      return;
    }
    API.markCompleted(session, finishedAt || Date.now());
    safeSave(true);
    // The local numeric history is authoritative for rendering; cloud publish
    // is best-effort and never delays finishing the puzzle.
    window.NONO_REPLAY_CLOUD?.publish(session).catch(error=>console.warn('클라우드 리플레이 전송 실패',error));
    renderRecent();
    session = null;
  }
  function activate() {
    clearTimeout(saveTimer); saveTimer = 0;
    session = null;
    if (!isSolo() || finished) return;
    const existing = API.readPending(local, puzzle.id, mode);
    if (existing && existing.size === puzzle.size && API.boardAtEnd(existing) === getBoard()) {
      session = existing;
    } else {
      // Old unfinished saves do not contain their earlier steps.
      // Begin with the actual restored board, never fabricate earlier input.
      session = API.makeSession({
        puzzleId: puzzle.id, mode, size: puzzle.size,
        initial: getBoard(), startedAt: startedAt || Date.now()
      });
      safeSave(false);
    }
  }
  function recordChanges(changes, group, at) {
    if (!session || !isSolo() || !changes?.length) return;
    try {
      API.record(session, {
        actor: 1, group, changes,
        elapsedMs: Math.max(0, (at || Date.now()) - session.startedAt)
      });
      scheduleSave();
    } catch (error) {
      console.warn('리플레이 동작 불일치', error);
    }
  }
  // settings.js installs its fast-pointer implementation before this module.
  // Normal keyboard/controller edits still go through paint().
  const originalPaint = paint;
  paint = function (index, value, drag) {
    const before = board && board[index];
    const result = originalPaint.apply(this, arguments);
    const after = board && board[index];
    if (before !== after && before !== undefined) {
      recordChanges([[index, Number(before), Number(after)]], null);
      finishIfCompleted();
    }
    return result;
  };
  const originalRestore = restoreHistory;
  restoreHistory = function () {
    const before = board.slice();
    const result = originalRestore.apply(this, arguments);
    const changes = [];
    board.forEach((value, i) => { if (value !== before[i]) changes.push([i, Number(before[i]), Number(value)]); });
    recordChanges(changes, null);
    return result;
  };
  const originalShow = showGame;
  showGame = function () {
    const result = originalShow.apply(this, arguments);
    activate(); renderRecent();
    return result;
  };
  const originalLeave = leaveGame;
  leaveGame = function () {
    finishIfCompleted();
    clearTimeout(saveTimer); saveTimer = 0;
    if (session) safeSave(false);
    session = null;
    return originalLeave.apply(this, arguments);
  };
  // settings.js fast drag intentionally bypasses paint() for performance.
  window.addEventListener('nono:replay-stroke', event => {
    if (!isSolo() || !session) return;
    recordChanges(event.detail?.changes || [], null, event.detail?.at);
    finishIfCompleted();
  });
  window.addEventListener('nono:activity', event => {
    if (event.detail?.kind === 'puzzle-complete') {
      // The completion event fires inside paint, before paint() returns.
      queueMicrotask(finishIfCompleted);
    }
  });
  window.addEventListener('pagehide', () => {
    clearTimeout(saveTimer); saveTimer = 0;
    if (session && !session.completedAt) safeSave(false);
  });

  // Never pretend that locally stored runs are already a public community feed.
  const root = document.getElementById('home-view');
  if (!root) return;
  const css = document.createElement('style');
  css.textContent = '.nono-replay-recent{max-width:1160px;margin:14px auto;padding:14px 16px;border:1px solid #ffffff24;border-radius:15px;background:#111a2c;color:#f3f5ff}.nono-replay-recent h2{font-size:16px;margin:0 0 4px}.nono-replay-help{font-size:12px;color:#9eaccb;margin:0 0 12px}.nono-replay-items{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px}.nono-replay-card{display:flex;align-items:center;text-align:left;gap:12px;width:100%;color:inherit;background:#1a2640;border:1px solid #ffffff1d;border-radius:12px;padding:9px;cursor:pointer}.nono-replay-card:hover{border-color:#8d9eef}.nono-replay-card canvas{width:70px;height:70px;flex:0 0 70px;image-rendering:pixelated;background:#fff;border-radius:5px}.nono-replay-card strong{display:block;font-size:13px}.nono-replay-card small{display:block;font-size:11px;color:#b2bbd4;margin-top:4px}.nono-replay-overlay{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#000b;z-index:12000;padding:20px}.nono-replay-dialog{background:#17233e;color:#f3f5ff;border:1px solid #8193be;border-radius:16px;padding:18px;width:min(480px,96vw)}.nono-replay-dialog-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}.nono-replay-dialog-head button{background:#2a3957;border:0;color:#fff;border-radius:8px;padding:6px 12px;cursor:pointer}.nono-replay-large{width:min(70vw,360px);height:min(70vw,360px);display:block;margin:auto;image-rendering:pixelated;background:#fff}';
  document.head.appendChild(css);
  const panel = document.createElement('section');
  panel.className = 'nono-replay-recent';
  panel.innerHTML = '<h2></h2><p class="nono-replay-help"></p><div class="nono-replay-items"></div>';
  const anchor = root.querySelector('#nono-resume-section, .nono-resume-section');
  if (anchor?.parentNode) anchor.after(panel);
  else root.appendChild(panel);
  const list = panel.querySelector('.nono-replay-items');
  const consent=document.createElement('label');
  consent.style.cssText='display:flex;gap:7px;align-items:center;font-size:12px;color:#b9c8e7;margin:4px 0 10px;cursor:pointer';
  const consentInput=document.createElement('input');
  consentInput.type='checkbox';consentInput.disabled=true;consentInput.setAttribute('aria-label',t('share'));
  const consentLabel=document.createElement('span');consentLabel.textContent=t('share');
  consent.append(consentInput,consentLabel);
  panel.insertBefore(consent,list);
  consentInput.addEventListener('change',async()=>{
    const requested=consentInput.checked;
    consentInput.disabled=true;
    try{await window.NONO_REPLAY_CLOUD?.setPublicEnabled(requested);}
    catch(error){console.warn('리플레이 공개 설정 실패',error);consentInput.checked=!requested;toast('리플레이 공개 설정을 변경할 수 없어요.');}
    finally{consentInput.disabled=false;}
  });
  let stopAnimations = [], remoteRows = [], accountRows = [];
  window.NONO_REPLAY_UI = {
    setRemote(rows) {remoteRows = Array.isArray(rows) ? rows.slice(0,5) : [];renderRecent();},
    setAccount(rows) {accountRows = Array.isArray(rows) ? rows.slice(0,5) : [];renderRecent();},
    setPublicPreference(value) {consentInput.disabled=false;consentInput.checked=Boolean(value);consentLabel.textContent=t('share');}
  };
  function draw(canvas, grid, size) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = size; canvas.height = size;
    const img = ctx.createImageData(size, size);
    for (let i = 0; i < grid.length; i++) {
      const value = Number(grid[i]);
      const base = i * 4;
      const color = value === 1 ? [27,39,64] : value === 2 ? [183,192,205] : [255,255,255];
      img.data[base] = color[0]; img.data[base + 1] = color[1];
      img.data[base + 2] = color[2]; img.data[base + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }
  function animate(canvas, replay, loopMs) {
    const steps = [];
    API.everyStep(replay, event => steps.push(event));
    const start = replay.initial.split('').map(Number);
    let grid = start.slice(), position = 0, epoch = performance.now(), frame = 0, running = true;
    function tick(now) {
      if (!running) return;
      const visible = canvas.isConnected && !document.hidden && canvas.getBoundingClientRect().bottom >= 0
        && canvas.getBoundingClientRect().top <= innerHeight;
      if (visible) {
        const ratio = ((now - epoch) % loopMs) / loopMs;
        const next = Math.min(steps.length, Math.floor(ratio * (steps.length + 1)));
        if (next < position) { grid = start.slice(); position = 0; }
        while (position < next) {
          const step = steps[position++];
          grid[step.cell] = step.value;
        }
        draw(canvas, grid, replay.size);
      }
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => { running = false; cancelAnimationFrame(frame); };
  }
  function showDetail(replay) {
    const overlay = document.createElement('div');
    overlay.className = 'nono-replay-overlay';
    const dialog = document.createElement('div');
    dialog.className = 'nono-replay-dialog';
    dialog.setAttribute('role','dialog'); dialog.setAttribute('aria-modal','true');
    const head = document.createElement('div');
    head.className = 'nono-replay-dialog-head';
    const title = document.createElement('strong');
    title.textContent = t(/[12]/.test(replay.initial)?'partial':'replay') + ' · ' + replay.size + '×' + replay.size;
    const close = document.createElement('button');
    close.type = 'button'; close.textContent = t('close');
    head.append(title, close); dialog.appendChild(head);
    const canvas = document.createElement('canvas'); canvas.className = 'nono-replay-large';
    canvas.setAttribute('aria-label','퍼즐 풀이 리플레이'); dialog.appendChild(canvas);
    overlay.appendChild(dialog); document.body.appendChild(overlay);
    const stop = animate(canvas, replay, 8000);
    const onKey = e => {if(e.key==='Escape') dismiss();};
    function dismiss(){ stop();document.removeEventListener('keydown',onKey);overlay.remove(); }
    close.addEventListener('click',dismiss);
    overlay.addEventListener('click',e=>{if(e.target===overlay)dismiss();});
    document.addEventListener('keydown',onKey);
  }
  function renderRecent() {
    if (!list) return;
    panel.querySelector('h2').textContent=t('recent');
    panel.querySelector('.nono-replay-help').textContent=t('help');
    stopAnimations.forEach(stop=>stop()); stopAnimations = [];
    list.replaceChildren();
    const own = API.recentCompleted(local, 5);
    const seen = new Set();
    const runs = [
      ...remoteRows.map(row=>({remote:true,row,at:row.completedAt,unique:row.replay?.id || 'public:'+row.puzzleId+':'+row.uid})),
      ...accountRows.map(run=>({run,at:run.completedAt,unique:run.id})),
      ...own.map(run=>({run,at:run.completedAt,unique:run.id}))
    ].sort((a,b)=>b.at-a.at).filter(item=>{
      if (seen.has(item.unique)) return false;
      seen.add(item.unique);return true;
    }).slice(0,5);
    if (!runs.length) {
      const empty = document.createElement('p');empty.className = 'nono-replay-help';
      empty.textContent = t('empty');
      list.appendChild(empty); return;
    }
    for (const item of runs) {
      const run = item.remote ? item.row.replay : item.run;
      const button = document.createElement('button');
      button.type = 'button';button.className = 'nono-replay-card';
      const canvas = document.createElement('canvas');canvas.setAttribute('aria-hidden','true');
      const info = document.createElement('span');
      const name = document.createElement('strong');
      name.textContent = item.remote ? (item.row.name + ' · ' + item.row.size + '×' + item.row.size) :
        (run.size + '×' + run.size + ' · ' + t(run.mode==='practice'?'solo':'record'));
      const detail = document.createElement('small');
      detail.textContent = item.remote ?
        (item.row.locked ? t('locked') : t('public')) + ' · ' + date(item.row.completedAt) :
        t(/[12]/.test(run.initial)?'partial':'full') + ' · ' + date(run.completedAt);
      info.append(name,detail);button.append(canvas,info);
      if (run) {
        button.addEventListener('click',()=>showDetail(run));
        stopAnimations.push(animate(canvas,run,7000));
      } else {
        button.disabled = true;
        canvas.setAttribute('aria-label','완료 전 풀이 미리보기 잠김');
        button.classList.add('nono-replay-locked');
        const ctx=canvas.getContext('2d');canvas.width=32;canvas.height=32;
        ctx.fillStyle='#29344e';ctx.fillRect(0,0,32,32);
        ctx.fillStyle='#aeb9d4';ctx.font='23px sans-serif';ctx.fillText('🔒',2,25);
      }
      list.appendChild(button);
    }
  }
  window.addEventListener('nono:account-changed',event=>{try{moveGuestReplays(event.detail?.previous,event.detail?.target);}catch(error){console.warn('게스트 리플레이 이전 실패',error);}renderRecent();});
  window.addEventListener('nono:languagechange',()=>{const translated=t('share');consentLabel.textContent=translated;consentInput.setAttribute('aria-label',translated);renderRecent();});
  renderRecent();
})();
