/* Developer-only preview: loaded dynamically only when the URL contains ?test=1.
   Canonical 30x30 silhouettes from tostino_crabino_30x30_nonograms.json.
   A preview NEVER updates the user's board or records. */
(function () {
  'use strict';
  if (new URLSearchParams(location.search).get('test') !== '1') return;

  const packed = Object.freeze({
    vox_crabino_front: 'AAAAAAAAAAAAAAAAAAAAABzgAAB/gAAB/gAAB/gAAB/gAAD/wAAP/8AA///AH///4Pn/58Pn/58HH/84A///AA///AD///wHz/z4Phnh8PBMg8PAIA8fAYA+eAcAeeAYAeAAAAAAAAAAAAAAAAAAAAA=',
    vox_crabino_side: 'AAAAAAAAAAAAAAAAAAAAAAYAAAAYAAAAYAAAAYAAAAYAAAA8AAAH/AAAf/AAB//AAH//AAf3/AAD3/wAAP/4AAP/8AAf/+AAb/fAA7vPAAxOHgAwGDgAwGD+AwGDeAwCBOAAAAAAAAAAAAAAAAAAAAA=',
    vox_crabino_top: 'AAAAAAAcAAAAcAAAAcAAAAYAAAAYAAGAOAYDgCBwDgCBwBwGDgA4MHAAcMOAAP/8AYH/8GfH/8+H///4B///gAH/4AAP/8AAf/+AA9//AB4AHgPwAD8PgAB8PgAB8PgAB8NgABsNgABsHAAA4AAAAAA='
  });
  const labels = Object.freeze({
    vox_crabino_front: '정면',
    vox_crabino_side: '오른쪽 측면',
    vox_crabino_top: '윗면'
  });
  const game = document.getElementById('game');
  const picker = document.getElementById('puzzle');
  const toolbar = document.querySelector('#game .bottom-row');
  if (!game || !picker || !toolbar) return;

  const style = document.createElement('style');
  style.textContent = [
    '#nono-vox-test-button[hidden]{display:none!important}',
    '#nono-vox-test-button{margin-left:auto;flex:0 0 auto;padding:8px 12px;border:1px solid #7586a3;border-radius:8px;background:#23334a;color:#f3f7ff;font-size:12px;font-weight:750}',
    '#nono-vox-test-button:hover{background:#314462}',
    '#nono-vox-test-dialog{box-sizing:border-box;width:min(94vw,525px);max-height:92vh;max-height:92dvh;overflow:auto;border:1px solid #647490;border-radius:16px;background:#141e31;color:#f1f5ff;padding:22px;box-shadow:0 24px 60px #0009}',
    '#nono-vox-test-dialog:not([open]){display:none!important}',
    '#nono-vox-test-dialog::backdrop{background:rgba(5,9,20,.82)}',
    '.nono-vox-test-head{display:flex;align-items:start;justify-content:space-between;gap:16px}',
    '.nono-vox-test-kicker{margin:0 0 5px;font-size:11px;font-weight:700;letter-spacing:.08em;color:#95d8d0}',
    '#nono-vox-test-title{margin:0;font-size:21px;color:#f1f5ff}',
    '#nono-vox-test-close{flex:0 0 auto;min-width:36px;min-height:36px;border:1px solid #63738d;background:#25344b;color:#fff;border-radius:9px;font-size:18px}',
    '#nono-vox-test-canvas{display:block;box-sizing:border-box;width:min(100%,420px);height:auto;aspect-ratio:1/1;image-rendering:pixelated;margin:18px auto 14px;border:2px solid #8692a9;background:#fff}',
    '#nono-vox-test-description{margin:0;text-align:center;font-size:12px;line-height:1.65;color:#b6c5dc}',
    '@media(max-width:480px){#nono-vox-test-dialog{padding:14px}#nono-vox-test-button{font-size:11px;padding:7px 9px}}'
  ].join('\n');
  document.head.appendChild(style);

  const button = document.createElement('button');
  button.id = 'nono-vox-test-button';
  button.type = 'button';
  button.textContent = '◫ 완성 모습 보기 (테스트)';
  button.hidden = true;
  button.setAttribute('aria-haspopup', 'dialog');
  toolbar.insertBefore(button, document.getElementById('restart'));

  const dialog = document.createElement('dialog');
  dialog.id = 'nono-vox-test-dialog';
  dialog.setAttribute('aria-labelledby', 'nono-vox-test-title');
  dialog.innerHTML = [
    '<div class="nono-vox-test-head">',
      '<div><p class="nono-vox-test-kicker">NONO · 정답 미리보기 / TEST</p>',
        '<h2 id="nono-vox-test-title">완성 모습</h2></div>',
      '<button id="nono-vox-test-close" type="button" aria-label="완성 모습 닫기">×</button>',
    '</div>',
    '<canvas id="nono-vox-test-canvas" width="30" height="30" role="img" aria-label="30×30 노노그램 정답 그림"></canvas>',
    '<p id="nono-vox-test-description">테스트 전용입니다. 퍼즐판·진행률·기록은 변경되지 않습니다.</p>'
  ].join('');
  document.body.appendChild(dialog);
  const canvas = dialog.querySelector('canvas');
  const ctx = canvas.getContext('2d', {willReadFrequently:true});

  function lineHints(bits) {
    const clues = []; let count = 0;
    for (const filled of bits) {
      if (filled) count++;
      else if (count) { clues.push(count); count = 0; }
    }
    if (count) clues.push(count);
    return clues.length ? clues : [0];
  }

  function drawSolution(id) {
    const p = (window.NONO_VOX_PUZZLES || []).find(item => item.id === id);
    if (!p || !ctx) return false;
    const bytes = Uint8Array.from(atob(packed[id]), ch => ch.charCodeAt(0));
    if (bytes.length !== 113) return false;
    const bits = Array.from({length:900}, (_, i) => !!(bytes[i >> 3] & (128 >> (i & 7))));
    for (let row = 0; row < 30; row++) {
      if (lineHints(bits.slice(row * 30, row * 30 + 30)).join(',') !== p.rows[row].join(',')) return false;
    }
    for (let col = 0; col < 30; col++) {
      if (lineHints(Array.from({length:30}, (_, row) => bits[row * 30 + col])).join(',') !== p.cols[col].join(',')) return false;
    }
    ctx.fillStyle = '#f5f7fb';
    ctx.fillRect(0, 0, 30, 30);
    ctx.fillStyle = '#253149';
    bits.forEach((filled, i) => { if (filled) ctx.fillRect(i % 30, Math.floor(i / 30), 1, 1); });
    dialog.querySelector('#nono-vox-test-title').textContent = '토스티노 크라비노 · ' + labels[id];
    canvas.setAttribute('aria-label', '토스티노 크라비노 ' + labels[id] + ' 30×30 완성 그림');
    return true;
  }

  function eligible() {
    return !game.classList.contains('hidden')
      && !document.getElementById('play-area')?.classList.contains('hidden')
      && document.querySelector('.mode-card.selected')?.dataset.mode === 'practice'
      && Object.hasOwn(packed, picker.value);
  }
  function syncButton() { button.hidden = !eligible(); }
  button.addEventListener('click', () => {
    if (!eligible()) return;
    if (!drawSolution(picker.value)) {
      dialog.querySelector('#nono-vox-test-title').textContent = '정답 데이터 검증 실패';
      dialog.querySelector('#nono-vox-test-description').textContent = '정답과 가로·세로 힌트가 일치하지 않아 미리보기를 표시하지 않았습니다.';
      canvas.hidden = true;
    } else {
      canvas.hidden = false;
      dialog.querySelector('#nono-vox-test-description').textContent = '테스트 전용입니다. 퍼즐판·진행률·기록은 변경되지 않습니다.';
    }
    dialog.showModal();
    dialog.querySelector('#nono-vox-test-close').focus();
  });
  dialog.querySelector('#nono-vox-test-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => { if (!button.hidden) button.focus({preventScroll:true}); });
  new MutationObserver(syncButton).observe(game, {attributes:true,attributeFilter:['class']});
  picker.addEventListener('change', syncButton);
  document.querySelectorAll('.mode-card').forEach(b => b.addEventListener('click', syncButton));
  syncButton();
})();
