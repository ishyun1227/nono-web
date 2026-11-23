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
const difficultyOf=p=>{const level=p.generated?p.difficulty:p.trialOnly?'미평가':(p.difficulty==='미평가'&&legacy[p.id]?legacy[p.id]:p.difficulty||legacy[p.id]);return difficulties.includes(level)||level==='미평가'?level:null;};
const catalog=()=>typeof PUZZLES!=='undefined'?PUZZLES.filter(p=>p&&p.id&&!p.sizeTest&&Number.isInteger(p.size)&&difficultyOf(p)):[];
const supportsMode=p=>mode()==='practice'||(p.generated&&(mode()==='race'||mode()==='coop'))||(!p.trialOnly&&p.size<30);
const inGroup=p=>p.size>=sizeGroups[state.group].min&&p.size<=sizeGroups[state.group].max;
const eligible=p=>inGroup(p)&&difficultyOf(p)===state.level&&supportsMode(p);
const state={group:0,level:'보통'};
const origin=$('nono-mode-origin');
const navigation=$('nono-workbench-nav');
/* Resume stays below the mode cards; no separate top navigation tab. */
const ui=document.createElement('div');
ui.className='nono-apple-setup';
ui.innerHTML=[
  '<div class="nono-apple-selector">',
  '<div class="nono-apple-text-picker">',
  '<div class="nono-apple-text-group"><h2 id="nono-apple-size-heading">퍼즐 크기</h2><div class="nono-apple-text-size" role="group" aria-labelledby="nono-apple-size-heading"></div></div>',
  '<div class="nono-apple-text-group"><h2 id="nono-apple-level-heading">난이도</h2><div class="nono-apple-text-level" role="group" aria-labelledby="nono-apple-level-heading"></div></div>',
  '</div>',
  '<div class="nono-apple-matrix-section">',
  '<div class="nono-apple-matrix-scroll"><table class="nono-apple-matrix" aria-labelledby="nono-apple-size-heading nono-apple-level-heading">',
  '<thead><tr><th scope="col" class="nono-apple-matrix-corner" aria-hidden="true">↘</th>',
  difficulties.map((d,i)=>'<th id="nono-apple-matrix-col-'+i+'" scope="col"><button type="button" class="nono-apple-axis-button nono-apple-axis-col" data-difficulty="'+d+'"><span>'+d+'</span><small class="nono-apple-axis-clue" aria-hidden="true"></small></button></th>').join(''),
  '</tr></thead><tbody></tbody></table></div>',
  '</div>',
  '</div>',
  '<div class="nono-apple-puzzles"><h2>퍼즐</h2><div class="nono-apple-puzzle-choices" role="group" aria-label="퍼즐 번호"></div></div>'
].join('');
setup.querySelector('.setup-description')?.after(ui);
const sizeTabs=ui.querySelector('.nono-apple-text-size');
const levelTabs=ui.querySelector('.nono-apple-text-level');
const matrixHead=ui.querySelector('.nono-apple-matrix thead tr');
const matrixBody=ui.querySelector('.nono-apple-matrix tbody');
const puzzleRow=ui.querySelector('.nono-apple-puzzle-choices');
/* One omitted selected square within an otherwise-filled 4x4 nonogram.
   Row 2, column 3 gives columns 4/4/1,2/4 and rows 4/2,1/4/4. */
function nonogramRuns(values){
  const groups=[];let run=0;
  for(const filled of values){if(filled)run++;else if(run){groups.push(run);run=0;}}
  if(run)groups.push(run);
  return groups.length?groups.join(','):'0';
}
function selectionClues(){
  const col=difficulties.indexOf(state.level);
  const filled=(r,c)=>r!==state.group||c!==col;
  return {
    rows:sizeGroups.map((_,r)=>nonogramRuns(difficulties.map((_,c)=>filled(r,c)))),
    cols:difficulties.map((_,c)=>nonogramRuns(sizeGroups.map((_,r)=>filled(r,c))))
  };
}
function textTab(name,selected,click){
  const b=document.createElement('button');
  b.type='button';b.className='nono-apple-text-tab';
  b.textContent=name;b.setAttribute('aria-pressed',String(selected));
  if(selected)b.classList.add('is-current');
  b.addEventListener('click',click);
  return b;
}
function previewPoints(group,difficulty){
  const policy=window.NONO_REWARD_POLICY;
  if(!policy?.reward)return null;
  const result=policy.reward(mode()==='coop'?'coop':'solo',group.min,difficulty,false,0);
  return Number.isFinite(result?.completion)?result.completion:null;
}
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
    if(tabs.parentNode!==navigation)navigation.append(tabs);
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
  const clues=selectionClues();
  sizeTabs.replaceChildren();
  levelTabs.replaceChildren();
  sizeGroups.forEach((group,i)=>{
    sizeTabs.append(textTab(group.name,state.group===i,()=>{state.group=i;render();}));
  });
  difficulties.forEach(difficulty=>{
    levelTabs.append(textTab(difficulty,state.level===difficulty,()=>{state.level=difficulty;render();}));
  });
  matrixHead.querySelectorAll('button.nono-apple-axis-col').forEach((axis,index)=>{
    const difficulty=difficulties[index];
    axis.setAttribute('aria-pressed',String(state.level===difficulty));
    axis.classList.toggle('is-current',state.level===difficulty);
    axis.querySelector('.nono-apple-axis-clue').textContent=clues.cols[index];
    axis.onclick=()=>{state.level=difficulty;render();};
  });
  matrixBody.replaceChildren();
  sizeGroups.forEach((group,groupIndex)=>{
    const row=document.createElement('tr');
    const label=document.createElement('th');
    label.scope='row';label.id='nono-apple-matrix-row-'+groupIndex;
    const axis=document.createElement('button');
    axis.type='button';axis.className='nono-apple-axis-button nono-apple-axis-row';
    axis.setAttribute('aria-pressed',String(state.group===groupIndex));
    if(state.group===groupIndex)axis.classList.add('is-current');
    const name=document.createElement('span');name.textContent=group.name;
    const clue=document.createElement('small');clue.className='nono-apple-axis-clue';
    clue.setAttribute('aria-hidden','true');clue.textContent=clues.rows[groupIndex];
    axis.append(name,clue);
    axis.addEventListener('click',()=>{state.group=groupIndex;render();});
    label.append(axis);row.append(label);
    difficulties.forEach((difficulty,difficultyIndex)=>{
      const selected=state.group===groupIndex&&state.level===difficulty;
      const cell=document.createElement('td');
      const choice=document.createElement('button');
      choice.type='button';choice.className='nono-apple-matrix-cell';
      choice.dataset.sizeGroup=String(groupIndex);
      choice.dataset.difficulty=difficulty;
      choice.setAttribute('aria-pressed',String(selected));
      choice.setAttribute('aria-labelledby',label.id+' nono-apple-matrix-col-'+difficultyIndex);
      if(selected){
        choice.classList.add('is-selected');
        const points=previewPoints(group,difficulty);
        const reward=document.createElement('span');reward.className='nono-apple-cell-reward';
        if(points===null){
          reward.textContent='보상 미정';
        }else{
          const caption=document.createElement('small');caption.textContent='완료';
          const amount=document.createElement('strong');amount.textContent='+'+points+' P';
          reward.append(caption,amount);
        }
        reward.setAttribute('aria-hidden','true');choice.append(reward);
      }else{
        const cross=document.createElement('span');
        cross.className='nono-apple-cell-x';
        cross.textContent='×';
        cross.setAttribute('aria-hidden','true');
        choice.append(cross);
      }
      choice.addEventListener('click',()=>{state.group=groupIndex;state.level=difficulty;render();});
      cell.append(choice);row.append(cell);
    });
    matrixBody.append(row);
  });
  const choices=allowed.filter(eligible);
  const chosen=choices.find(p=>p.id===picker.value);
  if(!chosen&&choices.length)selectPuzzle(choices[0]);
  puzzleRow.replaceChildren();
  choices.forEach((p,i)=>{
    const number=String(i+1).padStart(2,'0');
    const label=p.generated?p.name:p.trialOnly?p.name:'퍼즐 '+number;
    const b=makeButton(label,picker.value===p.id,false,()=>{selectPuzzle(p);render();});
    b.dataset.puzzleId=p.id;
    const dimensions=document.createElement('small');dimensions.textContent=(p.width||p.size)+' × '+(p.height||p.size);b.append(dimensions);
    b.setAttribute('aria-label',(p.trialOnly?p.name:'퍼즐 '+number)+', '+(p.width||p.size)+'×'+(p.height||p.size));
    puzzleRow.append(b);
  });
  if(mode()!=='record'){
    const make=makeButton('✦ 새 랜덤 퍼즐 생성',false,false,async()=>{
      if(!window.NONO_RANDOM_ALLOCATION?.choose){
        toast('랜덤 생성기를 불러오지 못했어요.');return;
      }
      const requestedGroup=state.group,requestedLevel=state.level,requestedMode=mode();
      if(requestedMode!=='practice'&&!window.NONO_ACCOUNT?.require())return;
      make.disabled=true;make.textContent='퍼즐 생성 중…';
      await new Promise(resolve=>requestAnimationFrame(resolve));
      try{
        const assigned=await window.NONO_RANDOM_ALLOCATION.choose({
          group:requestedGroup,difficulty:requestedLevel,localPuzzles:PUZZLES
        });
        if(requestedGroup!==state.group||requestedLevel!==state.level||requestedMode!==mode()){
          toast('선택 조건이 변경됐어요. 다시 눌러 주세요.');render();return;
        }
        const selected=assigned.puzzle;
        if(assigned.source==='bank'){
          // The shared bank is immutable and server-published; save only a
          // local reproducible spec so unfinished sessions can be resumed.
          try{window.NONO_RANDOM_PUZZLES.register(selected);}
          catch(error){console.warn('공용 퍼즐 로컬 캐시 저장 실패',error);}
        }
        const idx=PUZZLES.findIndex(p=>p.id===selected.id);
        if(idx<0)PUZZLES.push(selected);
        else PUZZLES[idx]=selected;
        if(!Array.from(picker.options).some(option=>option.value===selected.id)){
          const option=document.createElement('option');
          option.value=selected.id;option.textContent=selected.name+' · '+selected.difficulty;
          picker.append(option);
        }
        selectPuzzle(selected);render();
        if(requestedMode==='practice')await startAlone();
        else await createRoom({requireUnseen:true});
      }catch(error){
        console.error('랜덤 퍼즐 배정 실패',error);
        toast(error?.message||'퍼즐을 생성하지 못했어요.');
        render();
      }
    });
    make.classList.add('nono-apple-random-generate');
    make.setAttribute('aria-label',sizeGroups[state.group].name+' 크기 '+state.level+' 난이도의 새 랜덤 퍼즐 생성'+(mode()==='practice'?'':' 및 방 만들기'));
    make.textContent=mode()==='practice'?'새 랜덤 퍼즐 만들기':'랜덤 퍼즐로 방 만들기';
    puzzleRow.append(make);
  }
  if(!choices.length){
    const msg=document.createElement('p');msg.className='nono-apple-empty';
    msg.textContent=mode()!=='record'?'등록된 퍼즐이 없어도 위 버튼으로 새 퍼즐을 만들 수 있어요.':'이 조건의 퍼즐은 아직 준비 중이에요.';
    puzzleRow.append(msg);
  }
  start.disabled=choices.length===0;
  const m=mode();
  const heading=$('setup-heading'),description=$('setup-description');
  const titles={practice:'퍼즐 선택',race:'대결 퍼즐',coop:'협동 퍼즐',record:'기록 도전'};
  if(heading&&heading.textContent!==titles[m])heading.textContent=titles[m];
  if(description)description.textContent='';
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
window.addEventListener('nono:reward-policy-ready',()=>{if(neon())render();});
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
    // Progress may be rendered in Korean or another selected UI language.
    const rate=Number(detail.textContent.match(/(\d+)%/)?.[1]||0);
    detail.textContent=modeName;
    const track=document.createElement('div');track.className='nono-apple-progress';
    const fill=document.createElement('span');fill.style.width=Math.max(0,Math.min(100,rate))+'%';
    track.append(fill);card.querySelector('.nono-resume-card-copy').append(track);
    button.textContent='이어 풀기';button.setAttribute('aria-label',full+' 이어하기');
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