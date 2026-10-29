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
// Classifications already used by the existing launcher. New puzzles without
// explicit metadata remain '미지정' rather than being assigned a made-up level.
const legacyDifficulty={
  heart5:'쉬움',cat10:'보통',rocket10:'어려움',
  vox_crabino_front:'보통',vox_crabino_side:'보통',vox_crabino_top:'보통'
};
const supportedPuzzleModes=new Set(['practice','record','race','coop']);
const puzzleCatalog=()=>Array.isArray(PUZZLES)?PUZZLES.filter(p=>p&&p.id&&Number.isInteger(p.size)&&p.size>0):[];
function difficultyOf(p){
  const raw=p.difficulty||legacyDifficulty[p.id];
  return difficulties.includes(raw)?raw:'미지정';
}
function availablePuzzles(size,difficulty){
  const mode=activeMode();
  return puzzleCatalog().filter(p=>p.size===Number(size)&&difficultyOf(p)===difficulty&&
    (mode==='practice'||(p.size<30 && supportedPuzzleModes.has(mode))));
}
function selectableSizes(){
  return [...new Set([...sizes,...puzzleCatalog().map(p=>p.size)])].sort((a,b)=>a-b);
}
function levelsForSize(size){
  const levels=[...new Set(puzzleCatalog().filter(p=>p.size===Number(size)).map(difficultyOf))];
  return [...difficulties,'미지정'].filter(d=>levels.includes(d));
}
let selectedSize=10,selectedDifficulty='보통';
const wrap=document.createElement('div');
wrap.className='nono-quick-setup';
wrap.innerHTML=[
  '<div class="nono-quick-block" id="nono-quick-options">',
  '<label class="nono-quick-group" id="nono-quick-sizes"><span class="nono-quick-label">퍼즐 크기</span><select id="nono-quick-size" aria-label="퍼즐 크기"></select></label>',
  '<label class="nono-quick-group" id="nono-quick-difficulties"><span class="nono-quick-label">난이도</span><select id="nono-quick-difficulty" aria-label="난이도"></select></label>',
  '<div class="nono-quick-group" id="nono-quick-variants" role="group" aria-label="퍼즐 선택"></div>',
  '</div>'
].join('');
setup.querySelector('.setup-description')?.after(wrap);
function setNativePuzzle(id){
  if(!id||!Array.from(picker.options).some(option=>option.value===id))return;
  if(picker.value!==id){picker.value=id;picker.dispatchEvent(new Event('change',{bubbles:true}));}
}
function syncPuzzleFromSelection(){
  const chosen=puzzleCatalog().find(p=>p.id===picker.value);
  if(chosen){selectedSize=chosen.size;selectedDifficulty=difficultyOf(chosen);}
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
function chooseFirstMatchingPuzzle(){
  const candidates=availablePuzzles(selectedSize,selectedDifficulty);
  if(!candidates.some(p=>p.id===picker.value)&&candidates.length)setNativePuzzle(candidates[0].id);
}
function renderChoices(){
  const allSizes=selectableSizes();
  fillSelect($('nono-quick-size'),allSizes.map(n=>[n,n+'×'+n]),selectedSize,
    n=>availablePuzzles(n,levelsForSize(n)[0]).length>0);
  const levelChoices=[...difficulties];
  if(levelsForSize(selectedSize).includes('미지정'))levelChoices.push('미지정');
  fillSelect($('nono-quick-difficulty'),levelChoices.map(d=>[d,d]),selectedDifficulty,
    d=>availablePuzzles(selectedSize,d).length>0);
  const group=$('nono-quick-variants');
  const list=availablePuzzles(selectedSize,selectedDifficulty);
  group.replaceChildren();
  const label=document.createElement('span');
  label.className='nono-quick-label';label.textContent='퍼즐';
  group.append(label);
  for(let i=0;i<list.length;i++){
    const p=list[i],number=String(i+1).padStart(2,'0');
    const button=document.createElement('button');
    button.type='button';button.className='nono-quick-choice';
    button.textContent=number;button.dataset.puzzleId=p.id;
    button.setAttribute('aria-label',selectedSize+'×'+selectedSize+' '+selectedDifficulty+' 퍼즐 '+number);
    button.setAttribute('aria-pressed',String(picker.value===p.id));
    button.addEventListener('click',()=>setNativePuzzle(p.id));
    group.append(button);
  }
  if(!list.length){
    const empty=document.createElement('span');
    empty.className='nono-quick-empty';
    empty.textContent='이 조건에는 선택 가능한 퍼즐이 없어요.';
    group.append(empty);
  }
}
function screen(){
  if(!on())return;
  const mode=activeMode();
  if(!availablePuzzles(selectedSize,selectedDifficulty).length){
    const first=puzzleCatalog().find(p=>p.size<30||mode==='practice');
    if(first){selectedSize=first.size;selectedDifficulty=difficultyOf(first);setNativePuzzle(first.id);}
  }
  nativeStart.textContent=mode==='record'?'기록 도전 →':'퍼즐 시작 →';
  const heading=$('setup-heading');
  if(heading&&heading.textContent!==MODE_NAMES[mode])heading.textContent=MODE_NAMES[mode];
  renderChoices();
}
$('nono-quick-size').addEventListener('change',event=>{
  selectedSize=Number(event.target.value);
  const levels=levelsForSize(selectedSize);
  if(!availablePuzzles(selectedSize,selectedDifficulty).length)selectedDifficulty=levels.find(d=>availablePuzzles(selectedSize,d).length)||levels[0]||'미지정';
  chooseFirstMatchingPuzzle();
  renderChoices();
});
$('nono-quick-difficulty').addEventListener('change',event=>{
  selectedDifficulty=event.target.value;
  chooseFirstMatchingPuzzle();
  renderChoices();
});
modeButtons.forEach(btn=>{
  btn.setAttribute('aria-label',MODE_NAMES[btn.dataset.mode]);
  btn.addEventListener('click',screen);
  new MutationObserver(()=>{if(on())screen();}).observe(btn,{attributes:true,attributeFilter:['class']});
});
picker.addEventListener('change',()=>{if(on()){syncPuzzleFromSelection();renderChoices();}});
const title=$('game-title');
if(title){
  const hideAnswer=()=>{
    if(!on()||$('game').classList.contains('hidden'))return;
    // The puzzle engine owns completion state; never parse translated status text.
    const solved=typeof finished==='boolean'&&finished;
    const hiddenTitle=window.NONO_I18N?.translate?.('숨겨진 그림')||'숨겨진 그림';
    if(!solved&&title.textContent!==hiddenTitle)title.textContent=hiddenTitle;
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