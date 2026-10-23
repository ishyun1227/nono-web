/* Default-only compact NONO launcher. Native mode/puzzle/Firebase state remains authoritative. */
(function(){
'use strict';
const setup=document.getElementById('setup');
const picker=document.getElementById('puzzle');
const modeButtons=Array.from(document.querySelectorAll('.mode-card[data-mode]'));
const nativeStart=document.getElementById('play-alone');
if(!setup||!picker||modeButtons.length!==4||!nativeStart)return;
const $=id=>document.getElementById(id);
const on=()=>document.body.dataset.nonoTheme==='neon';
const activeMode=()=>modeButtons.find(b=>b.classList.contains('selected'))?.dataset.mode||'practice';
const MODE_NAMES={practice:'혼자 풀기',race:'대결 로비',coop:'협동 로비',record:'기록'};
const sizes=[5,10,15,20,25,30];
const difficulties=['쉬움','보통','어려움'];
// Only the existing supported puzzle IDs are selectable. Difficulty labels are provisional.
const pool={'5':{'쉬움':'heart5'},'10':{'보통':'cat10','어려움':'rocket10'},'30':{'보통':'vox_crabino_front'}};
const voxelIds=['vox_crabino_front','vox_crabino_side','vox_crabino_top'];
let selectedSize=10,selectedDifficulty='보통',selectedVariant=0;
const wrap=document.createElement('div');
wrap.className='nono-quick-setup';
wrap.innerHTML=[
  '<div class="nono-quick-block" id="nono-quick-options">',
  '<label class="nono-quick-group" id="nono-quick-sizes"><span class="nono-quick-label">퍼즐 크기</span><select id="nono-quick-size" aria-label="퍼즐 크기"></select></label>',
  '<label class="nono-quick-group" id="nono-quick-difficulties"><span class="nono-quick-label">난이도</span><select id="nono-quick-difficulty" aria-label="난이도"></select></label>',
  '<div class="nono-quick-group" id="nono-quick-variants" role="group" aria-label="30×30 퍼즐 선택" hidden></div>',
  '</div>'
].join('');
setup.querySelector('.setup-description')?.after(wrap);
function setNativePuzzle(id){
  if(!id||!Array.from(picker.options).some(option=>option.value===id))return;
  if(picker.value!==id){picker.value=id;picker.dispatchEvent(new Event('change',{bubbles:true}));}
}
function syncPuzzleFromSelection(){
  const id=picker.value;
  if(id==='heart5'){selectedSize=5;selectedDifficulty='쉬움';}
  else if(id==='rocket10'){selectedSize=10;selectedDifficulty='어려움';}
  else if(id==='cat10'){selectedSize=10;selectedDifficulty='보통';}
  else if(voxelIds.includes(id)){selectedSize=30;selectedDifficulty='보통';selectedVariant=voxelIds.indexOf(id);}
}
function fillSelect(select,values,selected,allowed){
  select.replaceChildren();
  for(const [value,label] of values){
    const option=document.createElement('option');
    option.value=String(value);option.textContent=label;option.disabled=!allowed(value);
    select.append(option);
  }
  select.value=String(selected);
}
function renderChoices(){
  const multi=['race','coop'].includes(activeMode());
  fillSelect($('nono-quick-size'),sizes.map(n=>[n,n+'×'+n]),selectedSize,n=>!!pool[n]&&!(multi&&n===30));
  const difficultyGroup=$('nono-quick-difficulties');
  difficultyGroup.hidden=selectedSize===30;
  if(selectedSize!==30){
    fillSelect($('nono-quick-difficulty'),difficulties.map(d=>[d,d]),selectedDifficulty,d=>!!pool[selectedSize]?.[d]);
  }
  const variants=$('nono-quick-variants');
  variants.hidden=selectedSize!==30;
  variants.replaceChildren();
  if(selectedSize===30){
    const label=document.createElement('span');label.className='nono-quick-label';
    label.textContent='퍼즐';variants.append(label);
    voxelIds.forEach((id,i)=>{
      const button=document.createElement('button');button.type='button';
      button.className='nono-quick-choice';button.textContent='0'+(i+1);
      button.setAttribute('aria-label','30×30 브레인롯 퍼즐 0'+(i+1));
      button.setAttribute('aria-pressed',String(selectedVariant===i));
      button.addEventListener('click',()=>{selectedVariant=i;setNativePuzzle(id);renderChoices();});
      variants.append(button);
    });
  }
}
function screen(){
  if(!on())return;
  const mode=activeMode();
  if(mode!=='practice'&&selectedSize===30){
    selectedSize=10;selectedDifficulty='보통';setNativePuzzle('cat10');
  }
  nativeStart.textContent=mode==='record'?'기록 도전 →':'퍼즐 시작 →';
  const heading=$('setup-heading');
  if(heading&&heading.textContent!==MODE_NAMES[mode])heading.textContent=MODE_NAMES[mode];
  renderChoices();
}
$('nono-quick-size').addEventListener('change',event=>{
  selectedSize=Number(event.target.value);
  if(selectedSize===30){
    selectedDifficulty='보통';selectedVariant=0;setNativePuzzle(voxelIds[0]);
  }else{
    if(!pool[selectedSize][selectedDifficulty])selectedDifficulty=Object.keys(pool[selectedSize])[0];
    setNativePuzzle(pool[selectedSize][selectedDifficulty]);
  }
  renderChoices();
});
$('nono-quick-difficulty').addEventListener('change',event=>{
  selectedDifficulty=event.target.value;
  setNativePuzzle(pool[selectedSize]?.[selectedDifficulty]);
  renderChoices();
});
modeButtons.forEach(btn=>{
  btn.setAttribute('aria-label',MODE_NAMES[btn.dataset.mode]);
  btn.addEventListener('click',screen);
  new MutationObserver(()=>{if(on())screen();}).observe(btn,{attributes:true,attributeFilter:['class']});
});
picker.addEventListener('change',()=>{if(on()){syncPuzzleFromSelection();renderChoices();}});
$('profile-button')?.addEventListener('click',()=>{
  if(on())setup.dataset.nonoProfileOpen=setup.dataset.nonoProfileOpen==='true'?'false':'true';
},true);
const title=$('game-title');
if(title){
  const hideAnswer=()=>{
    if(!on()||$('game').classList.contains('hidden'))return;
    const solved=/완성|성공|축하/.test($('board-status')?.textContent||'');
    if(!solved&&title.textContent!=='숨겨진 그림')title.textContent='숨겨진 그림';
  };
  new MutationObserver(hideAnswer).observe(title,{childList:true,characterData:true,subtree:true});
  new MutationObserver(hideAnswer).observe($('game'),{attributes:true,attributeFilter:['class']});
  new MutationObserver(hideAnswer).observe($('board-status'),{childList:true,characterData:true,subtree:true});
}
new MutationObserver(()=>{
  if(on()){syncPuzzleFromSelection();screen();}
  else nativeStart.textContent='게임 시작 →';
}).observe(document.body,{attributes:true,attributeFilter:['data-nono-theme']});
if(on()&&picker.value==='heart5')setNativePuzzle('cat10');
syncPuzzleFromSelection();screen();
})();