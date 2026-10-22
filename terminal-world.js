/* NONO Pocket Dungeon / CRT Desktop.
   A separate, interactive desktop environment inspired by hand-drawn green retro PC games.
   No source art is reused and no fake inventory, currency or RPG stats are added.
   Original setup and game DOM nodes are MOVED, never cloned. */
(function(){
'use strict';
const setup=document.getElementById('setup');
const game=document.getElementById('game');
const toast=document.getElementById('toast');
const picker=document.getElementById('puzzle');
const nickname=document.getElementById('nickname');
const progress=document.getElementById('progress');
const timer=document.getElementById('timer');
const connection=document.getElementById('connection');
const modes=[...document.querySelectorAll('.mode-card[data-mode]')];
if(!setup||!game||!picker||modes.length!==4)return;

const root=document.createElement('div');
root.id='terminal-experience';root.hidden=true;root.setAttribute('aria-label','NONO 던전 터미널');
root.innerHTML=`
<div class="term-crt">
 <div class="term-workspace">
  <aside class="term-left">
   <section class="term-window term-player" aria-labelledby="term-player-title">
    <div class="term-titlebar"><strong id="term-player-title">Player</strong><span class="term-win-buttons" aria-hidden="true"><i>▣</i><i>×</i></span></div>
    <div class="term-player-inner">
      <div class="term-avatar" aria-hidden="true"><span class="term-avatar-pixel">◈</span><span class="term-avatar-eyes">•ᴗ•</span></div>
      <div class="term-player-facts">
        <strong id="term-nickname">PLAYER</strong>
        <span id="term-player-mode">SOLO</span>
        <small id="term-connection">LOCAL</small>
      </div>
      <div class="term-stats-mini"><span>PROGRESS</span><strong id="term-player-progress">0%</strong><div class="term-bar"><i id="term-player-fill"></i></div></div>
    </div>
   </section>
   <section class="term-window term-log" aria-labelledby="term-log-title">
    <div class="term-titlebar"><strong id="term-log-title">Properties</strong><span class="term-win-buttons" aria-hidden="true"><i>▣</i><i>×</i></span></div>
    <div class="term-log-body">
      <div class="term-mono-head">NONOGRAM EXPLORER</div>
      <p>01 &gt; PUZZLE SELECT<br>02 &gt; FILL / CROSS<br>03 &gt; COMPLETE</p>
      <div class="term-log-box"><strong>CONTROLS</strong><span>↑ ↓ ← → &nbsp; MOVE</span><span>SPACE &nbsp; FILL</span><span>X &nbsp; CROSS</span><span>⌫ &nbsp; ERASE</span><span>CTRL + Z &nbsp; UNDO</span></div>
      <p class="term-log-tip">✦ 칸을 채우면 숨겨진 그림이 나타나요.</p>
    </div>
   </section>
  </aside>

  <section class="term-window term-explorer" aria-labelledby="term-explorer-title">
    <div class="term-titlebar"><strong id="term-explorer-title">Dungeon Explorer — NONO</strong><span class="term-win-buttons" aria-hidden="true"><i>▣</i><i>×</i></span></div>
    <div class="term-browser-toolbar">
       <button type="button" id="term-back" aria-label="홈으로">⬅</button>
       <button type="button" id="term-forward" aria-label="퍼즐 선택으로 이동">➡</button>
       <div class="term-address" id="term-address">C:\\NONO\\PUZZLES\\</div>
       <button type="button" id="term-refresh" aria-label="퍼즐 목록 새로고침">↻</button>
    </div>
    <div class="term-explorer-content">
      <div class="term-home" id="term-home">
        <div class="term-directory-header"><span class="term-directory-icon">▦</span><div><b>PUZZLE DIRECTORY</b><small>네 가지 플레이 방식 중 하나를 선택하세요.</small></div></div>
        <div class="term-mode-grid" id="term-mode-grid">
          <button type="button" data-term-mode="practice" aria-pressed="true"><span class="term-mode-image" aria-hidden="true">♜</span><b>혼자 풀기</b><small>solo.exe</small></button>
          <button type="button" data-term-mode="race" aria-pressed="false"><span class="term-mode-image" aria-hidden="true">⚔</span><b>실시간 대결</b><small>versus.exe</small></button>
          <button type="button" data-term-mode="coop" aria-pressed="false"><span class="term-mode-image" aria-hidden="true">✦</span><b>협동 플레이</b><small>co-op.exe</small></button>
          <button type="button" data-term-mode="record" aria-pressed="false"><span class="term-mode-image" aria-hidden="true">★</span><b>기록 경쟁</b><small>records.exe</small></button>
        </div>
        <div class="term-folder-caption">▤ &nbsp; AVAILABLE PUZZLES</div>
        <div class="term-file-grid" id="term-file-grid"></div>
        <div class="term-setup-mount" id="term-setup-mount"></div>
      </div>
      <div class="term-playing" id="term-playing" hidden>
        <div class="term-game-mount" id="term-game-mount"></div>
      </div>
    </div>
  </section>

  <aside class="term-right">
    <section class="term-window term-status" aria-labelledby="term-status-title">
      <div class="term-titlebar"><strong id="term-status-title">Stats</strong><span class="term-win-buttons" aria-hidden="true"><i>▣</i><i>×</i></span></div>
      <div class="term-status-grid">
        <div>▣ <strong id="term-stat-size">5×5</strong><small>BOARD</small></div>
        <div>◷ <strong id="term-stat-time">00:00</strong><small>TIME</small></div>
        <div>◈ <strong id="term-stat-progress">0%</strong><small>DONE</small></div>
        <div>✦ <strong id="term-stat-mode">SOLO</strong><small>MODE</small></div>
      </div>
    </section>
    <section class="term-window term-inventory" aria-labelledby="term-inventory-title">
      <div class="term-titlebar"><strong id="term-inventory-title">Inventory</strong><span class="term-win-buttons" aria-hidden="true"><i>▣</i><i>×</i></span></div>
      <div class="term-inventory-inner"><p>PUZZLE CARTRIDGES</p><div id="term-inventory-grid"></div><small>실제 이용 가능한 퍼즐 목록</small></div>
    </section>
    <section class="term-window term-tools" aria-labelledby="term-tools-title">
      <div class="term-titlebar"><strong id="term-tools-title">Tools</strong><span class="term-win-buttons" aria-hidden="true"><i>▣</i><i>×</i></span></div>
      <div class="term-tool-grid">
        <button type="button" id="term-fill">▣ <small>FILL</small></button>
        <button type="button" id="term-cross">× <small>CROSS</small></button>
        <button type="button" id="term-undo">↶ <small>UNDO</small></button>
        <button type="button" id="term-settings">⚙ <small>CONFIG</small></button>
      </div>
    </section>
  </aside>
 </div>
 <footer class="term-taskbar"><button type="button" id="term-menu">▣ &nbsp; MENU</button><nav aria-label="터미널 빠른 실행"><button type="button" id="term-short-home" title="퍼즐 목록">▤</button><button type="button" id="term-short-theme" title="테마 상점">✦</button><button type="button" id="term-short-record" title="기록 경쟁">★</button><button type="button" id="term-short-help" title="설정">⌕</button></nav><div class="term-task-right"><span id="term-task-status">NONO.EXE</span><span id="term-time">00:00</span></div></footer>
 </div>
</div>`;
document.body.append(root);
const Q=s=>root.querySelector(s);
const anchors={};
for(const [name,node] of Object.entries({setup,game,toast})){
 if(!node)continue;
 anchors[name]=document.createComment('Terminal original '+name);
 node.parentNode.insertBefore(anchors[name],node);
}
function restore(){
 for(const [name,node] of Object.entries({setup,game,toast})){
   const anchor=anchors[name];if(node&&anchor?.parentNode)anchor.parentNode.insertBefore(node,anchor.nextSibling);
 }
}
function move(){
 Q('#term-setup-mount').append(setup);
 Q('#term-game-mount').append(game);
 if(toast)root.append(toast);
}
const label={practice:'SOLO',race:'RACE',coop:'CO-OP',record:'RECORD'};
function chosenMode(){
 return modes.find(b=>b.classList.contains('selected'))?.dataset.mode||'practice';
}
function syncMode(){
 const m=chosenMode();
 Q('#term-player-mode').textContent=label[m];
 Q('#term-stat-mode').textContent=label[m];
 for(const btn of root.querySelectorAll('[data-term-mode]')){
  const selected=btn.dataset.termMode===m;
  btn.setAttribute('aria-pressed',String(selected));
  btn.classList.toggle('is-selected',selected);
 }
}
function selectMode(m){
 const btn=modes.find(b=>b.dataset.mode===m);
 if(btn)btn.click();
 syncMode();
 picker.focus({preventScroll:true});
}
root.querySelectorAll('[data-term-mode]').forEach(btn=>btn.addEventListener('click',()=>selectMode(btn.dataset.termMode)));
function selectPuzzle(value){
 picker.value=value;picker.dispatchEvent(new Event('change',{bubbles:true}));
 updateStatus();Q('#term-setup-mount').scrollIntoView({behavior:'smooth',block:'nearest'});
}
function populate(){
 for(const selector of ['#term-file-grid','#term-inventory-grid'])Q(selector).replaceChildren();
 const entries=[...picker.options].filter(o=>o.value);
 entries.forEach((option,i)=>{
  const b=document.createElement('button');
  b.className='term-file';b.type='button';
  b.setAttribute('aria-label','퍼즐 선택: '+option.textContent.trim());
  const ico=document.createElement('span');ico.className='term-file-icon';
  ico.textContent=['♜','♣','✦','◈','♟','♦'][i%6];
  const title=document.createElement('strong');title.textContent=option.textContent.trim();
  b.append(ico,title);
  b.addEventListener('click',()=>selectPuzzle(option.value));
  Q('#term-file-grid').append(b);
  const item=b.cloneNode(true);item.addEventListener('click',()=>selectPuzzle(option.value));
  Q('#term-inventory-grid').append(item);
 });
}
function state(){
 return game.classList.contains('hidden')?'home':'playing';
}
function syncScreen(){
 const playing=state()==='playing';
 Q('#term-home').hidden=playing;
 Q('#term-playing').hidden=!playing;
 root.classList.toggle('term-is-playing',playing);
 Q('#term-address').textContent=playing?'C:\\NONO\\ACTIVE\\'+(picker.value||'PUZZLE').toUpperCase():'C:\\NONO\\PUZZLES\\';
 updateStatus();
}
function updateStatus(){
 Q('#term-nickname').textContent=nickname?.value.trim()||'PLAYER';
 Q('#term-connection').textContent=connection?.textContent?.trim()||'LOCAL';
 const pc=progress?.textContent?.trim()||'0%';
 Q('#term-player-progress').textContent=pc;Q('#term-player-fill').style.width=(Math.min(100,Math.max(0,parseFloat(pc)||0)))+'%';
 Q('#term-stat-progress').textContent=pc;
 Q('#term-stat-time').textContent=timer?.textContent?.trim()||'00:00';
 const opt=picker.selectedOptions[0];
 const match=opt?.textContent.match(/(\d+)\s*[x×X]\s*(\d+)/);
 Q('#term-stat-size').textContent=match?match[1]+'×'+match[2]:'PUZZLE';
 const stamp=new Date();Q('#term-time').textContent=stamp.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:true});
 Q('#term-task-status').textContent=state()==='playing'?'PLAYING':'READY';
}
Q('#term-fill').addEventListener('click',()=>document.getElementById('tool-fill')?.click());
Q('#term-cross').addEventListener('click',()=>document.getElementById('tool-cross')?.click());
Q('#term-undo').addEventListener('click',()=>document.getElementById('undo')?.click());
Q('#term-settings').addEventListener('click',()=>document.getElementById('nono-open-settings')?.click());
Q('#term-menu').addEventListener('click',()=>window.NONO_THEMES?.open?.());
Q('#term-short-theme').addEventListener('click',()=>window.NONO_THEMES?.open?.());
Q('#term-short-help').addEventListener('click',()=>document.getElementById('nono-open-settings')?.click());
function home(){
 if(state()==='playing')document.getElementById('leave-game')?.click();
 Q('#term-file-grid').scrollIntoView({block:'nearest',behavior:'smooth'});
}
Q('#term-back').addEventListener('click',home);
Q('#term-short-home').addEventListener('click',home);
Q('#term-forward').addEventListener('click',()=>Q('#term-setup-mount').scrollIntoView({block:'center',behavior:'smooth'}));
Q('#term-refresh').addEventListener('click',()=>{populate();updateStatus()});
Q('#term-short-record').addEventListener('click',()=>{home();selectMode('record')});
if(nickname)nickname.addEventListener('input',updateStatus);
picker.addEventListener('change',updateStatus);
new MutationObserver(syncScreen).observe(game,{attributes:true,attributeFilter:['class']});
modes.forEach(b=>new MutationObserver(syncMode).observe(b,{attributes:true,attributeFilter:['class']}));
if(progress)new MutationObserver(updateStatus).observe(progress,{childList:true,characterData:true,subtree:true});
if(timer)new MutationObserver(updateStatus).observe(timer,{childList:true,characterData:true,subtree:true});
if(connection)new MutationObserver(updateStatus).observe(connection,{childList:true,characterData:true,subtree:true});
let active=false;
function syncTheme(){
 const on=document.body.dataset.nonoTheme==='terminal';
 if(on===active)return;
 active=on;
 if(on){move();populate();syncMode();syncScreen();root.hidden=false;updateStatus()}
 else {root.hidden=true;restore();if(document.body.dataset.nonoTheme==='enchanted')queueMicrotask(()=>window.NONO_FOREST?.remount?.())}
}
new MutationObserver(syncTheme).observe(document.body,{attributes:true,attributeFilter:['data-nono-theme']});
syncTheme();
window.NONO_TERMINAL={get active(){return active},sync:syncTheme,chooseMode:selectMode};
})();