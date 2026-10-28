/* Local first-stage NONO numeric replay integration.
 * All completed local runs are retained as numeric actions, not GIFs.
 * Public multi-player replay needs server-side persistence and verification.
 */
(function () {
  'use strict';
  const API = window.NONO_REPLAY;
  if (!API) return;
  const local = storage; // Use the main app's safe storage adapter.
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
  panel.innerHTML = '<h2>최근 플레이</h2><p class="nono-replay-help">이 기기에서 완료한 퍼즐 · 다른 플레이어의 공개 기록은 준비 중이에요.</p><div class="nono-replay-items"></div>';
  const anchor = root.querySelector('#nono-resume-section, .nono-resume-section');
  if (anchor?.parentNode) anchor.after(panel);
  else root.appendChild(panel);
  const list = panel.querySelector('.nono-replay-items');
  let stopAnimations = [], remoteRows = [], accountRows = [];
  window.NONO_REPLAY_UI = {
    setRemote(rows) {remoteRows = Array.isArray(rows) ? rows.slice(0,5) : [];renderRecent();},
    setAccount(rows) {accountRows = Array.isArray(rows) ? rows.slice(0,5) : [];renderRecent();}
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
    title.textContent = (/[12]/.test(replay.initial) ? '중간부터 저장된 리플레이' : '풀이 리플레이') + ' · ' + replay.size + '×' + replay.size;
    const close = document.createElement('button');
    close.type = 'button'; close.textContent = '닫기';
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
      empty.textContent = '아직 완료한 퍼즐이 없어요. 퍼즐을 완성하면 여기에 움직이는 기록이 나타나요.';
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
        (run.size + '×' + run.size + ' · ' + (run.mode==='practice'?'혼자 풀기':'기록 경쟁'));
      const detail = document.createElement('small');
      detail.textContent = item.remote ?
        (item.row.locked ? '완료한 뒤 리플레이 공개 · ' : '공개 리플레이 · ') + new Date(item.row.completedAt).toLocaleDateString('ko-KR') :
        (/[12]/.test(run.initial) ? '중간부터 기록 · ' : '전체 풀이 · ') + new Date(run.completedAt).toLocaleDateString('ko-KR');
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
  renderRecent();
})();
