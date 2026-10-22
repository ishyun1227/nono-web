/* NONO Moonlit Grove — a standalone presentation layer.
 * We move the existing live setup and game elements instead of cloning them.
 * This preserves puzzle input, keyboard focus, saved games and Firebase listeners. */
(function(){
'use strict';
const setup=document.getElementById('setup');
const game=document.getElementById('game');
const toast=document.getElementById('toast');
const picker=document.getElementById('puzzle');
const originalModes=[...document.querySelectorAll('.mode-card[data-mode]')];
if(!setup||!game||!picker||!originalModes.length)return;

const root=document.createElement('div');
root.id='forest-experience';root.hidden=true;
root.setAttribute('aria-label','NONO 달빛 정령의 숲');
root.innerHTML=`
<header class="fg-header">
  <button class="fg-logo" id="fg-logo" type="button" aria-label="달빛 숲 홈"><span class="fg-logo-mark">✧</span><span>NONO<small>MOONLIT GROVE</small></span></button>
  <nav class="fg-nav" aria-label="숲속 탐험 메뉴">
    <button type="button" data-forest-nav="home">숲속 광장</button>
    <button type="button" data-forest-nav="paths">탐험의 길</button>
    <button type="button" data-forest-nav="puzzles">퍼즐 도감</button>
  </nav>
  <div class="fg-header-actions">
    <span id="fg-connection" class="fg-online" aria-live="polite"></span>
    <button type="button" class="fg-iconbtn" id="fg-theme" title="테마 선택">✿ <span>테마</span></button>
    <button type="button" class="fg-iconbtn" id="fg-settings" title="게임 설정">⚙ <span>설정</span></button>
  </div>
</header>
<main class="fg-main">
  <div class="fg-home" id="fg-home">
    <section class="fg-forest-scene" id="fg-scene" aria-labelledby="fg-title">
      <div class="fg-scene-vignette"></div>
      <div class="fg-hero-copy">
        <p class="fg-eyebrow">❧  NONO · MOONLIT GROVE  ❧</p>
        <h1 id="fg-title">달빛 아래 숨겨진<br><em>작은 이야기.</em></h1>
        <p>숲속에 잠든 그림을 한 칸씩 깨워보세요.<br>숫자를 따라가면 정령의 비밀이 드러나요.</p>
        <button type="button" class="fg-bloom-button" id="fg-start">✦ &nbsp; 숲속 퍼즐 시작하기 <span>➜</span></button>
      </div>
      <div class="fg-scene-foot">
        <span>✧ &nbsp; 나만의 속도로 즐기는 노노그램</span>
        <button type="button" id="fg-explore">아래로 탐험하기 ↓</button>
      </div>
    </section>

    <section class="fg-trails" id="fg-paths" aria-labelledby="fg-trail-title">
      <div class="fg-trail-intro">
        <span class="fg-kicker">FOUR PATHS</span>
        <h2 id="fg-trail-title">어느 길로 떠날까요?</h2>
        <p>서로 다른 네 가지 숲속 모험. 원하는 플레이 방식부터 골라보세요.</p>
      </div>
      <div class="fg-trail-grid" role="group" aria-label="플레이 방식">
        <button type="button" class="fg-trail-card" data-forest-mode="practice" aria-pressed="true">
          <span class="fg-trail-art fg-trail-solo" aria-hidden="true"><span>☾</span></span>
          <span class="fg-trail-number">01 / THE QUIET PATH</span><strong>고요한 오솔길</strong>
          <small>혼자 풀기 · 내 속도로</small><span class="fg-trail-arrow">→</span>
        </button>
        <button type="button" class="fg-trail-card" data-forest-mode="race" aria-pressed="false">
          <span class="fg-trail-art fg-trail-race" aria-hidden="true"><span>⚡</span></span>
          <span class="fg-trail-number">02 / THE CHALLENGE</span><strong>반딧불이 경주</strong>
          <small>실시간 대결 · 먼저 완성하기</small><span class="fg-trail-arrow">→</span>
        </button>
        <button type="button" class="fg-trail-card" data-forest-mode="coop" aria-pressed="false">
          <span class="fg-trail-art fg-trail-coop" aria-hidden="true"><span>❀</span></span>
          <span class="fg-trail-number">03 / TOGETHER</span><strong>함께 피우는 꽃</strong>
          <small>협동 플레이 · 한 판을 함께</small><span class="fg-trail-arrow">→</span>
        </button>
        <button type="button" class="fg-trail-card" data-forest-mode="record" aria-pressed="false">
          <span class="fg-trail-art fg-trail-record" aria-hidden="true"><span>✧</span></span>
          <span class="fg-trail-number">04 / THE CHRONICLE</span><strong>별빛 기록관</strong>
          <small>기록 경쟁 · 나의 최고 기록</small><span class="fg-trail-arrow">→</span>
        </button>
      </div>
    </section>

    <section class="fg-hollow" id="fg-hollow" aria-labelledby="fg-hollow-title">
      <div class="fg-hollow-badge" aria-hidden="true">❈</div>
      <div class="fg-hollow-header">
        <span class="fg-kicker">YOUR NEXT ADVENTURE</span>
        <h2 id="fg-hollow-title">모험 준비하기</h2>
        <p id="fg-mode-description">퍼즐을 고르고 고요한 숲에서 시작해 보세요.</p>
      </div>
      <div class="fg-setup-mount" id="fg-setup-mount"></div>
    </section>

    <section class="fg-field-guide" id="fg-puzzles" aria-labelledby="fg-field-title">
      <div><span class="fg-kicker">THE GLOWING ARCHIVE</span><h2 id="fg-field-title">달빛 도감</h2><p>실제 플레이 가능한 퍼즐 목록이에요. 고르면 위의 모험 준비에 반영돼요.</p></div>
      <div class="fg-puzzle-list" id="fg-puzzle-list"></div>
    </section>
  </div>
  <section class="fg-playing" id="fg-playing" hidden aria-label="달빛 숲 노노그램 게임">
    <div class="fg-playing-top"><div><span class="fg-kicker">THE HIDDEN PICTURE</span><h2>숲에 숨겨진 그림</h2></div><span class="fg-leaf-mark" aria-hidden="true">❧</span></div>
    <div class="fg-game-mount" id="fg-game-mount"></div>
  </section>
</main>
<footer class="fg-footer"><span>✧  NONO · MOONLIT GROVE</span><span>한 칸씩 밝혀지는 작은 모험</span></footer>
<div id="fg-toast-mount"></div>
`;
document.body.append(root);
const sources={setup,game,toast};
const anchors={};
for(const [name,node] of Object.entries(sources)){if(!node)continue;anchors[name]=document.createComment('NONO original '+name+' position');node.parentNode.insertBefore(anchors[name],node)}
function move(node,mount){if(node && node.parentElement!==mount)mount.append(node)}
function mount(){
 move(setup,root.querySelector('#fg-setup-mount'));
 move(game,root.querySelector('#fg-game-mount'));
 if(toast)move(toast,root.querySelector('#fg-toast-mount'));
}
function restore(){
 for(const [name,node] of Object.entries(sources)){
  const anchor=anchors[name];if(node&&anchor?.parentNode)anchor.parentNode.insertBefore(node,anchor.nextSibling);
 }
}
const modeLabels={
 practice:'퍼즐을 고르고 고요한 숲에서 시작해 보세요.',
 race:'다른 플레이어와 함께 같은 퍼즐을 먼저 완성해 보세요.',
 coop:'친구와 하나의 퍼즐을 함께 밝혀 나가요.',
 record:'가장 빠른 완성 기록으로 이름을 남겨보세요.'
};
function syncMode(){
 const selected=originalModes.find(b=>b.classList.contains('selected'))?.dataset.mode||'practice';
 for(const b of root.querySelectorAll('[data-forest-mode]')){
   const on=b.dataset.forestMode===selected;b.classList.toggle('is-selected',on);b.setAttribute('aria-pressed',String(on));
 }
 root.querySelector('#fg-mode-description').textContent=modeLabels[selected];
}
function selectMode(mode){
 const b=originalModes.find(n=>n.dataset.mode===mode);
 if(b)b.click();
 syncMode();
 root.querySelector('#fg-hollow').scrollIntoView({behavior:'smooth',block:'center'});
}
root.querySelectorAll('[data-forest-mode]').forEach(b=>b.addEventListener('click',()=>selectMode(b.dataset.forestMode)));
root.querySelector('#fg-start').addEventListener('click',()=>root.querySelector('#fg-paths').scrollIntoView({behavior:'smooth'}));
root.querySelector('#fg-explore').addEventListener('click',()=>root.querySelector('#fg-paths').scrollIntoView({behavior:'smooth'}));
root.querySelector('#fg-logo').addEventListener('click',()=>document.getElementById('brand-home')?.click());
root.querySelectorAll('[data-forest-nav]').forEach(b=>b.addEventListener('click',()=>{
 const key=b.dataset.forestNav;
 if(key==='home'){
    if(!game.classList.contains('hidden'))document.getElementById('leave-game')?.click();
    window.scrollTo({top:0,behavior:'smooth'});
 }else{
    if(!game.classList.contains('hidden'))document.getElementById('leave-game')?.click();
    root.querySelector(key==='paths'?'#fg-paths':'#fg-puzzles').scrollIntoView({behavior:'smooth'});
 }
}));
root.querySelector('#fg-theme').addEventListener('click',()=>window.NONO_THEMES?.open?.());
root.querySelector('#fg-settings').addEventListener('click',()=>document.getElementById('nono-open-settings')?.click());
const originalConnection=document.getElementById('connection'),display=root.querySelector('#fg-connection');
function syncConnection(){display.textContent=originalConnection?.textContent?.trim()||'로컬 체험'}
if(originalConnection)new MutationObserver(syncConnection).observe(originalConnection,{subtree:true,childList:true,characterData:true});
syncConnection();
function refreshGuide(){
 const list=root.querySelector('#fg-puzzle-list');list.replaceChildren();
 const items=[...picker.options].filter(x=>x.value);
 for(const [i,opt] of items.entries()){
  const b=document.createElement('button');b.type='button';b.className='fg-puzzle-tile';
  const symbol=document.createElement('span');symbol.className='fg-puzzle-symbol';symbol.textContent=['✳','☽','✧','❀','✶','◇'][i%6];
  const name=document.createElement('strong');name.textContent=opt.textContent.trim();
  const subtitle=document.createElement('small');subtitle.textContent='퍼즐 선택 →';
  b.append(symbol,name,subtitle);
  b.addEventListener('click',()=>{picker.value=opt.value;picker.dispatchEvent(new Event('change',{bubbles:true}));root.querySelector('#fg-hollow').scrollIntoView({behavior:'smooth',block:'center'});picker.focus({preventScroll:true})});
  list.append(b);
 }
}
refreshGuide();
function syncScreen(){
 const playing=!game.classList.contains('hidden');
 root.querySelector('#fg-home').hidden=playing;
 root.querySelector('#fg-playing').hidden=!playing;
 root.classList.toggle('fg-game-active',playing);
}
new MutationObserver(syncScreen).observe(game,{attributes:true,attributeFilter:['class']});
originalModes.forEach(b=>new MutationObserver(syncMode).observe(b,{attributes:true,attributeFilter:['class']}));
let active=false;
function syncTheme(){
 const next=document.body.dataset.nonoTheme==='enchanted';
 if(next===active)return;
 active=next;
 if(active){mount();root.hidden=false;syncMode();syncConnection();refreshGuide();syncScreen()}
 else{root.hidden=true;restore()}
}
new MutationObserver(syncTheme).observe(document.body,{attributes:true,attributeFilter:['data-nono-theme']});
syncTheme();
window.NONO_FOREST={get active(){return active},home:()=>root.querySelector('#fg-home'),selectMode};
})();