/* Compact default NONO launcher. The real game, native selector, Firebase
 * mode buttons and room actions remain the single source of truth.
 * This adapter is intentionally inactive in premium/color themes. */
(function(){
'use strict';
const setup=document.getElementById('setup');
const picker=document.getElementById('puzzle');
const modeButtons=Array.from(document.querySelectorAll('.mode-card[data-mode]'));
const nativeStart=document.getElementById('play-alone');
if(!setup||!picker||modeButtons.length!==4||!nativeStart)return;

const MODE_NAMES={practice:'혼자 풀기',race:'실시간 대결',coop:'협동 플레이',record:'기록 경쟁'};
const sizes=[5,10,15,20,25,30];
const difficulties=['쉬움','보통','어려움'];
// Temporary grouping of the EXISTING three puzzles; the puzzle engine and
// verified difficulty-ranking logic are scheduled for the next phase.
const pool={
  '5':{'쉬움':'heart5'},
  '10':{'보통':'cat10','어려움':'rocket10'},
  '30':{'보통':'vox_crabino_front'}
};
const voxelIds=['vox_crabino_front','vox_crabino_side','vox_crabino_top'];
let selectedSize=10,selectedDifficulty='보통',selectedVariant=0,step='choose';
const wrap=document.createElement('div');
wrap.className='nono-quick-setup';
wrap.innerHTML=`
  <div class="nono-quick-room-options" id="nono-quick-room-options" hidden>
    <button type="button" id="nono-quick-create">＋ 방 만들기</button>
    <button type="button" id="nono-quick-join-open">↗ 방 참가하기</button>
  </div>
  <div class="nono-quick-join" id="nono-quick-join-form" hidden>
    <button type="button" class="nono-quick-back" id="nono-quick-join-back">← 뒤로</button>
    <input id="nono-quick-room-code" maxlength="6" autocomplete="off" placeholder="초대 코드 6자리" aria-label="초대 코드 6자리" />
    <button type="button" class="nono-quick-room-action" id="nono-quick-join-submit">참가</button>
  </div>
  <div class="nono-quick-block" id="nono-quick-options">
    <div class="nono-quick-group" id="nono-quick-sizes" role="group" aria-label="퍼즐 크기">
      <span class="nono-quick-label">크기</span>
    </div>
    <div class="nono-quick-group" id="nono-quick-difficulties" role="group" aria-label="난이도">
      <span class="nono-quick-label">난이도</span>
    </div>
    <div class="nono-quick-group" id="nono-quick-variants" role="group" aria-label="브레인롯 퍼즐" hidden></div>
  </div>
  <div id="nono-quick-create-actions" hidden>
    <button type="button" class="nono-quick-back" id="nono-quick-create-back">← 뒤로</button>
    <button type="button" class="nono-quick-room-action" id="nono-quick-create-submit">방 만들기 →</button>
  </div>
`;
setup.querySelector('.setup-description')?.after(wrap);
const $=id=>document.getElementById(id);
const on=()=>document.body.dataset.nonoTheme==='neon';
const activeMode=()=>modeButtons.find(b=>b.classList.contains('selected'))?.dataset.mode||'practice';
function setNativePuzzle(id){
  if(!id || !Array.from(picker.options).some(option=>option.value===id))return;
  if(picker.value!==id){
    picker.value=id;
    picker.dispatchEvent(new Event('change',{bubbles:true}));
  }
}
function syncPuzzleFromSelection(){
  const id=picker.value;
  if(id==='heart5'){selectedSize=5;selectedDifficulty='쉬움'}
  else if(id==='rocket10'){selectedSize=10;selectedDifficulty='어려움'}
  else if(id==='cat10'){selectedSize=10;selectedDifficulty='보통'}
  else if(voxelIds.includes(id)){selectedSize=30;selectedDifficulty='보통';selectedVariant=voxelIds.indexOf(id)}
}
function makeChoice(text,selected,disabled,handler,label){
  const button=document.createElement('button');
  button.type='button';button.className='nono-quick-choice';
  button.textContent=text;button.setAttribute('aria-pressed',String(selected));
  button.disabled=disabled;
  button.setAttribute('aria-label',label);
  if(disabled)button.title='해당 퍼즐은 아직 준비 중이에요';
  button.addEventListener('click',handler);
  return button;
}
function renderChoices(){
  const sizeGroup=$('nono-quick-sizes');
  const difficultyGroup=$('nono-quick-difficulties');
  const variantGroup=$('nono-quick-variants');
  sizeGroup.querySelectorAll('button').forEach(b=>b.remove());
  difficultyGroup.querySelectorAll('button').forEach(b=>b.remove());
  variantGroup.replaceChildren();
  for(const n of sizes){
    const has=!!pool[n],soloOnly=n===30&&activeMode()!=='practice';
    sizeGroup.append(makeChoice(n+'×'+n,n===selectedSize,!has||soloOnly,()=>{
      selectedSize=n;
      if(n===30){selectedDifficulty='보통';selectedVariant=0;setNativePuzzle(voxelIds[0]);}
      else{
        if(!pool[n][selectedDifficulty])selectedDifficulty=Object.keys(pool[n])[0];
        setNativePuzzle(pool[n][selectedDifficulty]);
      }
      renderChoices();
    },n+'×'+n+(has&&!soloOnly?' 선택':' 준비 중')));
  }
  difficultyGroup.hidden=selectedSize===30;
  if(selectedSize!==30){
    for(const d of difficulties){
      const available=!!pool[selectedSize]?.[d];
      difficultyGroup.append(makeChoice(d,d===selectedDifficulty,!available,()=>{
        selectedDifficulty=d;setNativePuzzle(pool[selectedSize][d]);renderChoices();
      },d+(available?' 선택':' 준비 중')));
    }
  }
  variantGroup.hidden=selectedSize!==30;
  if(selectedSize===30){
    const label=document.createElement('span');label.className='nono-quick-label';label.textContent='퍼즐';variantGroup.append(label);
    voxelIds.forEach((id,i)=>variantGroup.append(makeChoice('0'+(i+1),selectedVariant===i,false,()=>{
      selectedVariant=i;setNativePuzzle(id);renderChoices();
    },'30×30 브레인롯 퍼즐 0'+(i+1))));
  }
}
function screen(){
  if(!on())return;
  const mode=activeMode(),multi=mode==='race'||mode==='coop';
  if(mode!=='practice'&&selectedSize===30){selectedSize=10;selectedDifficulty='보통';setNativePuzzle('cat10');}
  const choose=multi&&step==='choose',join=multi&&step==='join',create=multi&&step==='create';
  $('nono-quick-room-options').hidden=!choose;
  $('nono-quick-join-form').hidden=!join;
  $('nono-quick-options').hidden=join||choose;
  $('nono-quick-create-actions').hidden=!create;
  $('nono-quick-options').style.display=(join||choose)?'none':'flex';
  $('nono-quick-create-actions').style.display=create?'flex':'none';
  $('nono-quick-create-actions').style.alignItems='center';
  $('nono-quick-create-actions').style.gap='8px';
  nativeStart.textContent=mode==='record'?'기록 도전 →':'퍼즐 시작 →';
  const heading=$('setup-heading');
  if(heading && heading.textContent!==MODE_NAMES[mode])heading.textContent=MODE_NAMES[mode];
  renderChoices();
}
function resetMode(){
  step='choose';screen();
}
modeButtons.forEach(btn=>{
  btn.setAttribute('aria-label',MODE_NAMES[btn.dataset.mode]);
  btn.addEventListener('click',resetMode);
  new MutationObserver(()=>{if(on())screen()})
    .observe(btn,{attributes:true,attributeFilter:['class']});
});
$('nono-quick-create').addEventListener('click',()=>{step='create';screen()});
$('nono-quick-join-open').addEventListener('click',()=>{step='join';screen();$('nono-quick-room-code').focus()});
$('nono-quick-create-back').addEventListener('click',()=>{step='choose';screen()});
$('nono-quick-join-back').addEventListener('click',()=>{step='choose';screen()});
$('nono-quick-create-submit').addEventListener('click',()=>{
  if(on())$('create-room')?.click();
});
function joinRoom(){
  const code=$('nono-quick-room-code').value.trim().toUpperCase();
  $('room-code').value=code;
  $('join-room')?.click();
}
$('nono-quick-join-submit').addEventListener('click',joinRoom);
$('nono-quick-room-code').addEventListener('keydown',e=>{if(e.key==='Enter')joinRoom()});
picker.addEventListener('change',()=>{
  if(on()){syncPuzzleFromSelection();renderChoices()}
});
// The account setting remains accessible: reveal the existing nickname field
// BEFORE its original click handler focuses it.
$('profile-button')?.addEventListener('click',()=>{
  if(on())setup.dataset.nonoProfileOpen=setup.dataset.nonoProfileOpen==='true'?'false':'true';
},true);
const title=$('game-title');
if(title){
  // The answer illustration/title must not be disclosed before solving.
  const hideAnswer=()=>{
    if(!on()||$('game').classList.contains('hidden'))return;
    const solved=/완성|성공|축하/.test($('board-status')?.textContent||'');
    if(!solved && title.textContent!=='숨겨진 그림')title.textContent='숨겨진 그림';
  };
  new MutationObserver(hideAnswer).observe(title,{childList:true,characterData:true,subtree:true});
  new MutationObserver(hideAnswer).observe($('game'),{attributes:true,attributeFilter:['class']});
  new MutationObserver(hideAnswer).observe($('board-status'),{childList:true,characterData:true,subtree:true});
}
new MutationObserver(()=>{
  if(on()){syncPuzzleFromSelection();screen()}
  else nativeStart.textContent='게임 시작 →';
}).observe(document.body,{attributes:true,attributeFilter:['data-nono-theme']});
// Existing index.html has already called initHome().
// Match the approved prototype's default 10×10 / 보통 choice.
if(on() && picker.value==='heart5')setNativePuzzle('cat10');
syncPuzzleFromSelection();screen();
})();