/* Authenticated, opt-in-to-public NONO numeric replay storage.
 * Private: this account's completed local runs (no GIFs).
 * Public: ONLY a server-confirmed record-mode completion, with a bounded feed.
 * The entire replay remains hidden from viewers who have not completed
 * the same puzzle in the verified record mode (prevent solution spoilers).
 * The client-generated move sequence is not an authoritative anti-cheat proof.
 */
(function () {
  'use strict';
  const API = window.NONO_REPLAY, UI = window.NONO_REPLAY_UI;
  if (!API || !UI) return;
  const eligible = new Set(['heart5', 'cat10', 'rocket10']);
  const MAX_PACKED = 300000;
  const PUBLIC_PREF='nono-replay-public-consent-v1:';
  const isPublicAllowed=()=>ready() && storage.getItem(PUBLIC_PREF + currentId())==='true';
  const live = [];
  const uploaded = new Set();
  let token = 0, online = false, feed = [], watchedUid = '';

  function ready() { return Boolean(database && currentUser && window.NONO_ACCOUNT?.isSignedIn() && typeof get === 'function'); }
  function actualRun(s) {
    return s && s.version === 1 && s.completedAt && /^[a-zA-Z0-9_-]+$/.test(s.id)
      && API.boardAtEnd(s).length === s.size * s.size;
  }
  function safeLocalRuns() {
    try { return API.recentCompleted(window.NONO_REPLAY_STORAGE||storage, Number.MAX_SAFE_INTEGER); }
    catch (error) { console.warn('로컬 리플레이 목록 조회 실패',error); return []; }
  }
  async function upload(run) {
    if (!ready() || !actualRun(run)) return;
    const uid = currentUser.uid, content = API.serialize(run);
    if (content.length > MAX_PACKED) {
      console.warn('리플레이 1건이 클라우드 저장 크기 제한을 초과했습니다. 로컬 기록은 유지합니다.',run.id);
      return;
    }
    // In this stage only completed single-player runs are safely publishable.
    if (run.mode !== 'practice' && run.mode !== 'record') return;
    const marker = uid + ':' + run.id;
    const privatePath='privateReplays/' + uid + '/' + run.id;
    // Avoid a denied write on every reconnect; records are immutable.
    try {
      const existing=await get(ref(database,privatePath));
      if (existing.exists()) uploaded.add(marker);
    } catch (_) { /* Rules may not be deployed yet. */ }
    try {
      if (!uploaded.has(marker)) await set(ref(database,privatePath), {
        uid, mode:run.mode, completedAt:run.completedAt, puzzleId:run.puzzleId,
        payload:content
      });
      uploaded.add(marker);
    } catch (error) {
      // Re-uploading immutable records is rejected; existence means already backed up.
      try {
        const snap = await get(ref(database,'privateReplays/' + uid + '/' + run.id));
        if (snap.exists()) uploaded.add(marker);
      } catch (_) {}
      if (!uploaded.has(marker)) {
        console.warn('리플레이 클라우드 저장 실패',error); return;
      }
    }
    if (!isPublicAllowed() || run.mode !== 'record' || !eligible.has(run.puzzleId) || !/^0+$/.test(run.initial)) return;
    try {
      const s = (await get(ref(database,'runs/' + run.puzzleId + '/' + uid))).val();
      // A verified completion is required; do not publish stale/fake or aborted runs.
      if (!s || s.finishedAt !== run.completedAt || s.finishedAt <= 0) return;
      const entry = {uid, completedAt:s.finishedAt, payload:content};
      const old=(await get(ref(database,'publishedReplays/' + run.puzzleId + '/' + uid))).val();
      if (!old || old.completedAt < entry.completedAt) await set(ref(database,'publishedReplays/' + run.puzzleId + '/' + uid),entry);
      const published=(await get(ref(database,'publicReplayFeed/' + run.puzzleId + '/' + uid))).val();
      if (published && published.completedAt >= entry.completedAt) return;
      await set(ref(database,'publicReplayFeed/' + run.puzzleId + '/' + uid), {
        uid, name:s.name, puzzleId:run.puzzleId, size:run.size,
        completedAt:s.finishedAt
      });
    } catch (error) {
      console.warn('공개 리플레이 등록 실패 (Firebase 권한/규칙 배포 확인)',error);
    }
  }
  async function syncLocal() {
    if (!ready()) return;
    // One-at-a-time to avoid surprising database write spikes.
    for (const run of safeLocalRuns()) {
      if (!ready()) break;
      await upload(run);
    }
  }
  function stop() { while (live.length) live.pop()(); ++token; }
  async function refreshFeed() {
    if (!ready()) return;
    const marker = ++token;
    const list = feed.filter(r=>r && eligible.has(r.puzzleId));
    list.sort((a,b)=>b.completedAt-a.completedAt);
    const visible = list.slice(0,5);
    const rows = await Promise.all(visible.map(async item => {
      // Only the verified finisher of the same puzzle may view the full moves.
      const path = 'publishedReplays/' + item.puzzleId + '/' + item.uid;
      try {
        const myFinish = (await get(ref(database,'scores/' + item.puzzleId + '/' + currentUser.uid + '/finishedAt'))).val();
        if (!myFinish || myFinish <= 0) return {...item,locked:true};
        const result = (await get(ref(database,path))).val();
        if (!result || result.completedAt !== item.completedAt) return {...item,locked:true};
        const replay = API.parse(result.payload);
        if (replay.mode !== 'record' || replay.puzzleId !== item.puzzleId ||
            replay.size !== item.size || replay.completedAt !== item.completedAt ||
            !/^0+$/.test(replay.initial)) return {...item,locked:true};
        // Check hints without asking for the hidden answer; render only valid sequences.
        const known = PUZZLES.find(p=>p.id===replay.puzzleId);
        if (!known || !isSolved(API.boardAtEnd(replay).split(''),known)) return {...item,locked:true};
        return {...item,replay};
      } catch (_) { return {...item,locked:true}; }
    }));
    if (marker === token) UI.setRemote(rows);
  }
  function watchAccount() {
    if (!ready()) return;
    const q=query(ref(database,'privateReplays/' + currentUser.uid),orderByChild('completedAt'),limitToLast(5));
    live.push(onValue(q, snap=>{
      const rows=[];
      for(const value of Object.values(snap.val()||{})) {
        try {
          const run=API.parse(value.payload);
          if(run.completedAt===value.completedAt && run.mode===value.mode && run.puzzleId===value.puzzleId) rows.push(run);
        } catch (_) {}
      }
      rows.sort((a,b)=>b.completedAt-a.completedAt);
      UI.setAccount(rows.slice(0,5));
    },error=>console.warn('내 리플레이 클라우드 조회 실패',error)));
  }
  function watchFeed() {
    if (!ready() || live.length) return;
    online = true;
    watchAccount();
    const byPuzzle = new Map();
    for (const id of eligible) {
      const bounded = query(ref(database,'publicReplayFeed/' + id),orderByChild('completedAt'),limitToLast(5));
      live.push(onValue(bounded, snapshot => {
        byPuzzle.set(id,Object.values(snapshot.val()||{}));
        feed = [...byPuzzle.values()].flat();
        refreshFeed().catch(e=>console.warn('최근 플레이 조회 실패',e));
      },error=>console.warn('공개 리플레이 피드 읽기 실패',error)));
    }
  }
  async function setPublicEnabled(value){
    if(!ready())throw new Error('로그인 연결 후 설정할 수 있어요.');
    if(value){
      storage.setItem(PUBLIC_PREF+currentId(),'true');
      UI.setPublicPreference?.(true);
      await syncLocal();
      return;
    }
    // Remove existing public entries before marking the local preference private.
    // Never report a successful privacy change when revocation failed.
    for(const puzzleId of eligible){
      const index='publicReplayFeed/'+puzzleId+'/'+currentId();
      const replay='publishedReplays/'+puzzleId+'/'+currentId();
      for(const path of [index,replay]){
        const snapshot=await get(ref(database,path));
        if(snapshot.exists())await remove(ref(database,path));
      }
    }
    storage.setItem(PUBLIC_PREF+currentId(),'false');
    UI.setPublicPreference?.(false);
  }
  function onAuth() {
    const next=ready()?currentUser.uid:'';
    if(watchedUid!==next){
      stop();online=false;feed=[];watchedUid=next;
      UI.setRemote?.([]);UI.setAccount?.([]);
    }
    if (!ready()) return;
    UI.setPublicPreference?.(isPublicAllowed());
    if (!online) watchFeed();
    syncLocal().catch(e=>console.warn('리플레이 백업 재시도 필요',e));
  }
  window.NONO_REPLAY_CLOUD = {
    publish: run => upload(run),
    refresh: () => refreshFeed(),
    setPublicEnabled
  };
  window.addEventListener('nono:online-ready',onAuth);
  window.addEventListener('nono:account-synced',onAuth);
  window.addEventListener('nono:account-changed',onAuth);
  window.addEventListener('pagehide',stop);
  if (ready()) onAuth();
})();
