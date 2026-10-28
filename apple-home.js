/* Refined default launcher; original puzzle/Firebase engines remain authoritative. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const setup=$('setup'),picker=$('puzzle'),start=$('play-alone'),topbar=document.querySelector('.topbar');
const tabs=document.querySelector('.mode-select');
if(!setup||!picker||!start||!tabs||!topbar)return;
const neon=()=>document.body.dataset.nonoTheme==='neon';
const mode=()=>document.querySelector('.mode-card[data-mode].selected')?.dataset.mode||'practice';
const sizeGroups=[
  {name:'작음',min:1,max:10},
  {name:'중간',min:11,max:20},
  {name:'큼',min:21,max:34},
  {name:'거대',min:35,max:Infinity}
];
const difficulties=['쉬움','보통','어려움','전문가'];
const legacy={heart5:'쉬움',cat10:'보통',rocket10:'어려움',
  vox_crabino_front:'보통',vox_crabino_side:'보통',vox_crabino_top:'보통'};
const difficultyOf=p=>difficulties.includes(p.difficulty||legacy[p.id])?(p.difficulty||legacy[p.id]):null;
const catalog=()=>typeof PUZZLES!=='undefined'?PUZZLES.filter(p=>p&&p.id&&!p.sizeTest&&Number.isInteger(p.size)&&difficultyOf(p)):[];
const supportsMode=p=>mode()==='practice'||p.size<30;
const inGroup=p=>p.size>=sizeGroups[state.group].min&&p.size<=sizeGroups[state.group].max;
const eligible=p=>inGroup(p)&&difficultyOf(p)===state.level&&supportsMode(p);
const state={group:0,level:'보통'};
const origin=document.createComment('Original mode navigation location');
tabs.parentNode.insertBefore(origin,tabs);
const resumeTab=document.createElement('button');
resumeTab.type='button';
resumeTab.className='mode-card nono-apple-resume-tab';
resumeTab.textContent='이어하기';
resumeTab.setAttribute('aria-label','이어서 풀기 목록으로 이동');
tabs.insertBefore(resumeTab,tabs.querySelector('[data-mode="record"]'));
resumeTab.addEventListener('click',()=>{
  $('nono-resume-view')?.scrollIntoView({behavior:'smooth',block:'center'});
});
const ui=document.createElement('div');
ui.className='nono-apple-setup';
ui.innerHTML=[
  '<div class="nono-apple-filters">',
  '<div class="nono-apple-filter"><h4>퍼즐 크기</h4><div class="nono-apple-size-choices" role="group" aria-label="퍼즐 크기"></div></div>',
  '<div class="nono-apple-filter"><h4>난이도</h4><div class="nono-apple-difficulty-choices" role="group" aria-label="난이도"></div></div>',
  '</div>',
  '<div class="nono-apple-puzzles"><h4>퍼즐</h4><div class="nono-apple-puzzle-choices" role="group" aria-label="퍼즐 번호"></div></div>'
].join('');
setup.querySelector('.setup-description')?.after(ui);
const sizeRow=ui.querySelector('.nono-apple-size-choices');
const difficultyRow=ui.querySelector('.nono-apple-difficulty-choices');
const puzzleRow=ui.querySelector('.nono-apple-puzzle-choices');
function makeButton(text,pressed,disabled,click){
  const b=document.createElement('button');
  b.type='button';b.className='nono-apple-choice';
  b.textContent=text;b.setAttribute('aria-pressed',String(pressed));
  b.disabled=disabled;if(disabled)b.title='준비된 퍼즐이 없습니다';
  b.addEventListener('click',click);return b;
}
function selectPuzzle(p){
  if(!p||!Array.from(picker.options).some(o=>o.value===p.id))return;
  if(picker.value!==p.id){
    picker.value=p.id;picker.dispatchEvent(new Event('change',{bubbles:true}));
  }
}
function fixThemeNavigation(){
  if(neon()){
    if(tabs.parentNode!==topbar)topbar.insertBefore(tabs,topbar.querySelector('.header-right'));
  }else if(tabs.parentNode!==origin.parentNode){
    origin.parentNode.insertBefore(tabs,origin.nextSibling);
    start.disabled=false;
  }
}
function render(){
  fixThemeNavigation();
  if(!neon())return;
  const all=catalog();
  const allowed=all.filter(supportsMode);
  sizeRow.replaceChildren();
  sizeGroups.forEach((g,i)=>{
    const exists=allowed.some(p=>p.size>=g.min&&p.size<=g.max);
    sizeRow.append(makeButton(g.name,state.group===i,!exists,()=>{state.group=i;render();}));
  });
  difficultyRow.replaceChildren();
  difficulties.forEach(d=>{
    const available=allowed.some(p=>inGroup(p)&&difficultyOf(p)===d);
    difficultyRow.append(makeButton(d,state.level===d,!available,()=>{state.level=d;render();}));
  });
  const choices=allowed.filter(eligible);
  const chosen=choices.find(p=>p.id===picker.value);
  if(!chosen&&choices.length)selectPuzzle(choices[0]);
  puzzleRow.replaceChildren();
  choices.forEach((p,i)=>{
    const number=String(i+1).padStart(2,'0');
    const b=makeButton(number,picker.value===p.id,false,()=>{selectPuzzle(p);render();});
    b.setAttribute('aria-label','퍼즐 '+number+', '+p.size+'×'+p.size);
    puzzleRow.append(b);
  });
  if(!choices.length){
    const msg=document.createElement('p');msg.className='nono-apple-empty';
    msg.textContent='이 조건의 퍼즐은 아직 준비 중이에요.';
    puzzleRow.append(msg);
  }
  start.disabled=choices.length===0;
  const m=mode();
  const heading=$('setup-heading'),description=$('setup-description');
  const titles={practice:'오늘은 어떤 퍼즐?',race:'대결할 퍼즐을 골라주세요',coop:'함께 풀 퍼즐을 골라주세요',record:'기록에 도전해볼까요?'};
  if(heading&&heading.textContent!==titles[m])heading.textContent=titles[m];
  if(description)description.textContent='원하는 크기와 난이도를 선택하세요.';
}
function adoptExternalPuzzle(){
  if(!neon())return;
  const p=catalog().find(p=>p.id===picker.value);
  if(!p)return;
  if(inGroup(p)&&difficultyOf(p)===state.level){render();return;}
  const i=sizeGroups.findIndex(g=>p.size>=g.min&&p.size<=g.max);
  if(i>=0)state.group=i;
  state.level=difficultyOf(p);
  render();
}
picker.addEventListener('change',adoptExternalPuzzle);
document.querySelectorAll('.mode-card[data-mode]').forEach(b=>{
  b.addEventListener('click',()=>queueMicrotask(render));
  new MutationObserver(()=>queueMicrotask(render)).observe(b,{attributes:true,attributeFilter:['class']});
});
new MutationObserver(()=>queueMicrotask(render)).observe(document.body,{attributes:true,attributeFilter:['data-nono-theme']});
/* Keep real saved resume items and click handlers; change only their presentation. */
function decorateResume(){
  const root=$('nono-resume-items');if(!root)return;
  root.querySelectorAll('.nono-resume-card:not([data-apple-decorated])').forEach(card=>{
    card.dataset.appleDecorated='1';
    const strong=card.querySelector('.nono-resume-card-copy strong');
    const detail=card.querySelector('.nono-resume-card-copy span');
    const button=card.querySelector('.nono-resume-continue');
    if(!strong||!detail||!button)return;
    const full=strong.textContent;
    const match=full.match(/^(.*?) · (\d+×\d+)$/);
    const modeName=match?.[1]||full;
    if(match)strong.textContent=match[2];
    const rate=Number(detail.textContent.match(/진행률 (\d+)%/)?.[1]||0);
    detail.textContent=modeName;
    const track=document.createElement('div');track.className='nono-apple-progress';
    const fill=document.createElement('span');fill.style.width=Math.max(0,Math.min(100,rate))+'%';
    track.append(fill);card.querySelector('.nono-resume-card-copy').append(track);
    button.textContent='→';button.setAttribute('aria-label',full+' 이어하기');
    button.title=full+' 이어하기';
    card.dataset.nonoResumeMode=modeName==='대결'?'race':modeName==='협동'?'coop':'solo';
  });
}
const observeResume=()=>{
  const root=$('nono-resume-items');
  if(!root)return false;
  new MutationObserver(decorateResume).observe(root,{childList:true});
  decorateResume();return true;
};
if(!observeResume()){
  const observer=new MutationObserver(()=>{if(observeResume())observer.disconnect();});
  observer.observe(document.body,{subtree:true,childList:true});
}
const first=catalog().find(p=>p.id===picker.value);
if(first){
  state.group=Math.max(0,sizeGroups.findIndex(g=>first.size>=g.min&&first.size<=g.max));
  state.level=difficultyOf(first);
}
render();
})();