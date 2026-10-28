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
  function parse(raw) {
    if (typeof raw !== 'string') throw new TypeError('Replay must be JSON');
    const data = JSON.parse(raw);
    assertSession(data);
    getCursor(data); // Reject corrupted or inconsistent change sequences.
    return data;
  }
  function pendingKey(puzzleId, mode) { return PREFIX + 'pending:' + mode + ':' + puzzleId; }
  function completedKey(id) { return PREFIX + 'complete:' + id; }
  function savePending(storage, session) {
    assertSession(session);
    storage.setItem(pendingKey(session.puzzleId, session.mode), JSON.stringify(session));
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
    storage.setItem(key, JSON.stringify(session));
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
    parse, savePending, readPending, clearPending, saveCompleted, recentCompleted};
});
