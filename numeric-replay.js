/* NONO numeric replay core.
 * No GIF/video files are generated. This is a small, versioned integer event log.
 * Actions: [actionId, actorNumber, elapsedMilliseconds, [[cellId, before, after], ...]]
 * Cell states: 0 empty, 1 filled, 2 X. The action groups a drag; changes keep
 * their original order so animation can reveal one cell at a time.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.NONO_REPLAY = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const VERSION = 1;
  const PREFIX = 'nono-numeric-replay-v1:';
  const activeCache = new WeakMap();

  function integer(value, label, min, max) {
    if (!Number.isSafeInteger(value) || value < min || value > max) {
      throw new TypeError(label + ' must be an integer between ' + min + ' and ' + max);
    }
    return value;
  }
  function normalizedBoard(board, size) {
    const value = Array.isArray(board) ? board.join('') : board;
    if (typeof value !== 'string' || value.length !== size * size || /[^012]/.test(value)) {
      throw new TypeError('Invalid replay board');
    }
    return value;
  }
  function makeSession(options) {
    const size = integer(options.size, 'size', 1, 150);
    const mode = options.mode;
    if (!['practice', 'record', 'race', 'coop'].includes(mode)) throw new TypeError('Invalid mode');
    if (typeof options.puzzleId !== 'string' || !/^[a-zA-Z0-9_-]{1,90}$/.test(options.puzzleId)) {
      throw new TypeError('Invalid puzzle ID');
    }
    const start = integer(options.startedAt || Date.now(), 'startedAt', 1, Number.MAX_SAFE_INTEGER);
    const session = {
      version: VERSION,
      id: String(options.id || (start + '-' + Math.random().toString(36).slice(2, 11))),
      puzzleId: options.puzzleId,
      size,
      mode,
      initial: normalizedBoard(options.initial || '0'.repeat(size * size), size),
      startedAt: start,
      completedAt: 0,
      actors: Array.isArray(options.actors) ? options.actors.slice() : [],
      actions: []
    };
    activeCache.set(session, {board: session.initial.split('').map(Number), group: null});
    return session;
  }
  function assertSession(session) {
    if (!session || session.version !== VERSION || !Array.isArray(session.actions)) {
      throw new TypeError('Unsupported replay version');
    }
    integer(session.size, 'size', 1, 150);
    normalizedBoard(session.initial, session.size);
  }
  function getCursor(session) {
    let cursor = activeCache.get(session);
    if (cursor) return cursor;
    assertSession(session);
    const board = session.initial.split('').map(Number);
    let lastId = 0, lastTime = 0;
    for (const action of session.actions) {
      if (!Array.isArray(action) || action.length !== 4) throw new TypeError('Invalid replay action');
      integer(action[0], 'actionId', 1, Number.MAX_SAFE_INTEGER);
      integer(action[1], 'playerId', 0, Number.MAX_SAFE_INTEGER);
      integer(action[2], 'elapsedMs', 0, Number.MAX_SAFE_INTEGER);
      if (action[0] <= lastId || action[2] < lastTime || !Array.isArray(action[3]) || !action[3].length) {
        throw new TypeError('Invalid action order');
      }
      for (const change of action[3]) applyChange(board, change);
      lastId = action[0];
      lastTime = action[2];
    }
    cursor = {board, group: null};
    activeCache.set(session, cursor);
    return cursor;
  }
  function applyChange(board, change) {
    if (!Array.isArray(change) || change.length !== 3) throw new TypeError('Invalid cell change');
    const cell = integer(change[0], 'cell', 0, board.length - 1);
    const before = integer(change[1], 'before', 0, 2);
    const after = integer(change[2], 'after', 0, 2);
    if (before === after || board[cell] !== before) throw new TypeError('Replay state mismatch at cell ' + cell);
    board[cell] = after;
  }
  function record(session, options) {
    assertSession(session);
    if (session.completedAt) throw new Error('Completed replay is immutable');
    const cursor = getCursor(session);
    const actor = integer(options.actor, 'actor', 0, Number.MAX_SAFE_INTEGER);
    const elapsed = integer(Math.max(0, Math.round(options.elapsedMs)), 'elapsedMs', 0, Number.MAX_SAFE_INTEGER);
    const changes = options.changes;
    if (!Array.isArray(changes) || !changes.length) return false;
    // Validate atomically; never partially mutate a replay on bad input.
    const next = cursor.board.slice();
    for (const change of changes) applyChange(next, change);
    const previous = session.actions[session.actions.length - 1];
    const group = options.group == null ? null : String(options.group);
    const merge = Boolean(group && cursor.group === group && previous && previous[1] === actor);
    if (merge) {
      // The last action begins before the new event; its final timestamp is kept.
      previous[3].push(...changes.map(c => c.slice()));
    } else {
      const lastId = previous ? previous[0] : 0;
      const lastTime = previous ? previous[2] : 0;
      session.actions.push([lastId + 1, actor, Math.max(lastTime, elapsed), changes.map(c => c.slice())]);
    }
    cursor.board = next;
    cursor.group = group;
    return true;
  }
  function boardAtEnd(session) {
    return getCursor(session).board.join('');
  }
  function everyStep(session, callback) {
    assertSession(session);
    const cursor = session.initial.split('').map(Number);
    let index = 0;
    for (const action of session.actions) {
      for (const change of action[3]) {
        applyChange(cursor, change);
        callback({index, cell: change[0], value: change[2], actor: action[1], elapsedMs: action[2]});
        index++;
      }
    }
    return index;
  }
  function markCompleted(session, at) {
    assertSession(session);
    session.completedAt = integer(Math.round(at || Date.now()), 'completedAt', 1, Number.MAX_SAFE_INTEGER);
    activeCache.delete(session);
    return session;
  }

  // NR2: lossless, versioned packed action stream. Active moves stay in memory
  // for instant editing; localStorage/RTDB persist this representation directly.
  // This is a binary encoding, not an additional general-purpose compression pass.
  const PACKED_PREFIX = 'NR2:';
  const CHANGE_PREFIX = 'NRC1:';
  const encoder = new TextEncoder();
  const decoder = new TextDecoder('utf-8', {fatal: true});
  const MODE_IDS = ['practice','record','race','coop'];
  function pushVar(out, v) {
    integer(v, 'varint', 0, Number.MAX_SAFE_INTEGER);
    while(v>=128) {out.push(v%128+128);v=Math.floor(v/128);}
    out.push(v);
  }
  function takeVar(data, cursor) {
    let value=0,unit=1,steps=0;
    for (;;) {
      if(cursor.i>=data.length || steps++>=8) throw new TypeError('Truncated/oversized replay varint');
      const byte=data[cursor.i++];
      value+=(byte%128)*unit;
      if(!Number.isSafeInteger(value))throw new TypeError('Replay integer overflow');
      if(byte<128)return value;
      unit*=128;
    }
  }
  function pushString(out, value) {
    const bytes=encoder.encode(value);
    if(bytes.length>65535) throw new TypeError('Replay string too large');
    pushVar(out,bytes.length);
    for(const b of bytes)out.push(b);
  }
  function takeString(data,cursor) {
    const n=takeVar(data,cursor);
    if(n>65535 || n>data.length-cursor.i)throw new TypeError('Invalid replay string length');
    const result=decoder.decode(data.subarray(cursor.i,cursor.i+n));
    cursor.i+=n;return result;
  }
  function asBase64(bytes) {
    if(typeof Buffer!=='undefined')return Buffer.from(bytes).toString('base64');
    let binary='';
    for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
    return btoa(binary);
  }
  function fromBase64(str) {
    if(typeof str!=='string'||str.length%4!==0||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(str))
      throw new TypeError('Invalid base64 replay');
    if(typeof Buffer!=='undefined')return Uint8Array.from(Buffer.from(str,'base64'));
    const binary=atob(str), bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
    return bytes;
  }
  function pushChange(out,change,size) {
    if(!Array.isArray(change)||change.length!==3)throw new TypeError('Invalid replay change');
    const cell=integer(change[0],'cell',0,size*size-1);
    const before=integer(change[1],'before',0,2);
    const after=integer(change[2],'after',0,2);
    if(before===after)throw new TypeError('Replay change cannot be a no-op');
    pushVar(out,cell*9+before*3+after);
  }
  function takeChange(data,cursor,size) {
    const value=takeVar(data,cursor);
    const cell=Math.floor(value/9), rest=value%9;
    const before=Math.floor(rest/3),after=rest%3;
    integer(cell,'cell',0,size*size-1);
    if(before===after)throw new TypeError('Replay change cannot be a no-op');
    return [cell,before,after];
  }
  function encodeChanges(changes,size) {
    integer(size,'size',1,150);
    if(!Array.isArray(changes)||changes.length<1||changes.length>250)throw new TypeError('Invalid multiplayer change count');
    const out=[1];
    pushVar(out,changes.length);
    for(const change of changes)pushChange(out,change,size);
    return CHANGE_PREFIX+asBase64(Uint8Array.from(out));
  }
  function decodeChanges(value,size) {
    integer(size,'size',1,150);
    if(typeof value!=='string')throw new TypeError('Invalid multiplayer changes');
    if(!value.startsWith(CHANGE_PREFIX)){
      // Legacy room events used JSON arrays. Read without altering them.
      const old=JSON.parse(value);
      if(!Array.isArray(old)||!old.length||old.length>250)throw new TypeError('Invalid legacy change count');
      const probe=[];
      for(const item of old)pushChange(probe,item,size);
      return old;
    }
    const bytes=fromBase64(value.slice(CHANGE_PREFIX.length)), cursor={i:0};
    if(bytes[cursor.i++]!==1)throw new TypeError('Unsupported change codec version');
    const count=takeVar(bytes,cursor);
    if(count<1||count>250)throw new TypeError('Invalid packed change count');
    const changes=[];
    for(let i=0;i<count;i++)changes.push(takeChange(bytes,cursor,size));
    if(cursor.i!==bytes.length)throw new TypeError('Trailing replay change bytes');
    return changes;
  }
  function packBoard(board) {
    const result=new Uint8Array(Math.ceil(board.length/4));
    for(let i=0;i<board.length;i++) result[i>>2]|=Number(board[i])<<((i%4)*2);
    return result;
  }
  function unpackBoard(data,cursor,size) {
    const length=Math.ceil(size*size/4);
    if(cursor.i+length>data.length)throw new TypeError('Truncated replay board');
    const out=[];
    for(let i=0;i<size*size;i++){
      const value=(data[cursor.i+(i>>2)]>>((i%4)*2))&3;
      if(value>2)throw new TypeError('Invalid packed board state');
      out.push(String(value));
    }
    cursor.i+=length;return out.join('');
  }
  function serialize(session) {
    assertSession(session);
    getCursor(session); // Validate the entire saved sequence before encoding.
    const out=[78,82,2];
    pushString(out,session.id);
    pushString(out,session.puzzleId);
    const mode=MODE_IDS.indexOf(session.mode);
    if(mode<0)throw new TypeError('Unsupported replay mode');
    out.push(mode);
    pushVar(out,session.size);
    pushVar(out,session.startedAt);
    pushVar(out,session.completedAt||0);
    for(const b of packBoard(session.initial))out.push(b);
    pushString(out,JSON.stringify(session.actors||[]));
    pushVar(out,session.actions.length);
    let previousId=0,previousTime=0;
    for(const action of session.actions){
      if(!Array.isArray(action)||action.length!==4||!Array.isArray(action[3])||!action[3].length)
        throw new TypeError('Invalid replay action');
      pushVar(out,integer(action[0]-previousId,'actionId delta',1,Number.MAX_SAFE_INTEGER));
      pushVar(out,integer(action[1],'actor',0,Number.MAX_SAFE_INTEGER));
      pushVar(out,integer(action[2]-previousTime,'time delta',0,Number.MAX_SAFE_INTEGER));
      pushVar(out,action[3].length);
      for(const change of action[3])pushChange(out,change,session.size);
      previousId=action[0];previousTime=action[2];
    }
    return PACKED_PREFIX+asBase64(Uint8Array.from(out));
  }
  function parsePacked(raw) {
    const data=fromBase64(raw.slice(PACKED_PREFIX.length)),cursor={i:0};
    if(data[cursor.i++]!==78||data[cursor.i++]!==82||data[cursor.i++]!==2)
      throw new TypeError('Unsupported packed replay version');
    const id=takeString(data,cursor),puzzleId=takeString(data,cursor);
    const mode=MODE_IDS[data[cursor.i++]];
    if(!mode)throw new TypeError('Invalid packed replay mode');
    const size=integer(takeVar(data,cursor),'size',1,150);
    const startedAt=integer(takeVar(data,cursor),'startedAt',1,Number.MAX_SAFE_INTEGER);
    const completedAt=integer(takeVar(data,cursor),'completedAt',0,Number.MAX_SAFE_INTEGER);
    const initial=unpackBoard(data,cursor,size);
    const actors=JSON.parse(takeString(data,cursor));
    if(!Array.isArray(actors))throw new TypeError('Invalid replay actors');
    const actionCount=takeVar(data,cursor);
    if(actionCount>1000000)throw new TypeError('Replay action count too large');
    const actions=[];
    let prevId=0,prevTime=0;
    for(let i=0;i<actionCount;i++){
      const idDelta=takeVar(data,cursor),actor=takeVar(data,cursor),delta=takeVar(data,cursor),count=takeVar(data,cursor);
      if(idDelta<1||count<1||count>22500)throw new TypeError('Invalid replay action lengths');
      const nextId=prevId+idDelta,nextTime=prevTime+delta;
      if(!Number.isSafeInteger(nextId)||!Number.isSafeInteger(nextTime))throw new TypeError('Replay action overflow');
      const changes=[];
      for(let j=0;j<count;j++)changes.push(takeChange(data,cursor,size));
      actions.push([nextId,actor,nextTime,changes]);
      prevId=nextId;prevTime=nextTime;
    }
    if(cursor.i!==data.length)throw new TypeError('Trailing replay bytes');
    const session={version:VERSION,id,puzzleId,size,mode,initial,startedAt,completedAt,actors,actions};
    assertSession(session);
    getCursor(session);
    return session;
  }
  function parse(raw) {
    if (typeof raw !== 'string') throw new TypeError('Replay must be a string');
    if(raw.startsWith(PACKED_PREFIX))return parsePacked(raw);
    const data=JSON.parse(raw); // Legacy NR1 JSON is read-only compatible.
    assertSession(data);getCursor(data);
    return data;
  }
  function pendingKey(puzzleId, mode) { return PREFIX + 'pending:' + mode + ':' + puzzleId; }
  function completedKey(id) { return PREFIX + 'complete:' + id; }
  function savePending(storage, session) {
    assertSession(session);
    storage.setItem(pendingKey(session.puzzleId, session.mode), serialize(session));
  }
  function readPending(storage, puzzleId, mode) {
    const data = storage.getItem(pendingKey(puzzleId, mode));
    if (!data) return null;
    try { return parse(data); } catch (_) { return null; }
  }
  function clearPending(storage, puzzleId, mode) {
    storage.removeItem(pendingKey(puzzleId, mode));
  }
  function saveCompleted(storage, session) {
    if (!session.completedAt) throw new Error('Replay is not completed');
    const key = completedKey(session.id);
    // Write record before indexing: incomplete writes must never appear in feed.
    storage.setItem(key, serialize(session));
    const indexKey = PREFIX + 'complete-index';
    let index;
    try { index = JSON.parse(storage.getItem(indexKey) || '[]'); } catch (_) { index = []; }
    if (!Array.isArray(index)) index = [];
    const list = [session.id, ...index.filter(id => id !== session.id)];
    storage.setItem(indexKey, JSON.stringify(list));
    clearPending(storage, session.puzzleId, session.mode);
  }
  function recentCompleted(storage, count) {
    let ids;
    try { ids = JSON.parse(storage.getItem(PREFIX + 'complete-index') || '[]'); } catch (_) { ids = []; }
    if (!Array.isArray(ids)) return [];
    const result = [];
    for (const id of ids) {
      try {
        const raw = storage.getItem(completedKey(id));
        if (!raw) continue;
        const session = parse(raw);
        if (session.completedAt) result.push(session);
      } catch (_) { /* Corrupt record ignored without revealing a board. */ }
      if (result.length >= count) break;
    }
    return result;
  }
  return {VERSION, makeSession, record, boardAtEnd, everyStep, markCompleted,
    parse, serialize, encodeChanges, decodeChanges,
    savePending, readPending, clearPending, saveCompleted, recentCompleted};
});
