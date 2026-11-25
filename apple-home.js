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
const state={group:0,level:'보통',view:'select'};
const origin=$('nono-mode-origin');
const navigation=$('nono-workbench-nav');
/* Resume stays below the mode cards; no separate top navigation tab. */
const ui=document.createElement('div');
ui.className='nono-apple-setup';
ui.innerHTML=[
  '<div class="nono-apple-switch" role="tablist" aria-label="새 퍼즐 방식">',
  '<button id="nono-apple-tab-select" type="button" role="tab" aria-controls="nono-apple-panel-select" aria-selected="true"><svg class="nono-apple-control-icon" viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><rect x="4" y="4" width="24" height="24" rx="2"/><path d="M12 4v24M20 4v24M4 12h24M4 20h24"/><path d="M4 4h8v8H4zM20 12h8v8h-8zM12 20h8v8h-8z" fill="currentColor" stroke="none"/></svg><span>퍼즐 선택</span></button>',
  '<button id="nono-apple-tab-random" type="button" role="tab" aria-controls="nono-apple-panel-random" aria-selected="false"><svg class="nono-apple-control-icon" viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h4c7 0 9 16 16 16h4m-5-5 5 5-5 5M4 24h4c3 0 5-3 7-7m3-5c2-3 4-4 6-4h4m-5-5 5 5-5 5"/></svg><span>랜덤 생성</span></button>',
  '</div>',
  '<div class="nono-apple-options" aria-label="공통 퍼즐 조건">',
  '<div class="nono-apple-option-group"><h2 id="nono-apple-size-heading">크기</h2><div class="nono-apple-size-options" role="group" aria-labelledby="nono-apple-size-heading"></div></div>',
  '<div class="nono-apple-option-group"><h2 id="nono-apple-level-heading">난이도</h2><div class="nono-apple-level-options" role="group" aria-labelledby="nono-apple-level-heading"></div></div>',
  '</div>',
  '<section id="nono-apple-panel-select" class="nono-apple-panel-select" role="tabpanel" aria-labelledby="nono-apple-tab-select">',
  '<div class="nono-apple-puzzles"><div class="nono-apple-puzzle-header"><h2>퍼즐 목록</h2><span class="nono-apple-current-filter"></span></div><div class="nono-apple-puzzle-choices" role="group" aria-label="퍼즐 번호"></div></div>',
  '<div class="nono-apple-selection-footer"><span class="nono-apple-points"></span><div class="nono-apple-launch-controls"></div></div>',
  '</section>',
  '<section id="nono-apple-panel-random" class="nono-apple-panel-random" role="tabpanel" aria-labelledby="nono-apple-tab-random" hidden>',
  '<span class="nono-apple-random-icon" aria-hidden="true">⤨</span>',
  '<h2>새로운 랜덤 퍼즐</h2>',
  '<p class="nono-apple-random-summary"></p>',
  '<p class="nono-apple-random-copy">선택한 크기와 난이도로 퍼즐을 배정하고 바로 시작합니다.</p>',
  '<div class="nono-apple-random-slot"></div>',
  '</section>'
].join('');
setup.querySelector('.setup-description')?.after(ui);
const sizeOptions=ui.querySelector('.nono-apple-size-options');
const levelOptions=ui.querySelector('.nono-apple-level-options');
const selectTab=ui.querySelector('#nono-apple-tab-select');
const randomTab=ui.querySelector('#nono-apple-tab-random');
const selectPanel=ui.querySelector('#nono-apple-panel-select');
const randomPanel=ui.querySelector('#nono-apple-panel-random');
const puzzleRow=ui.querySelector('.nono-apple-puzzle-choices');
const pointText=ui.querySelector('.nono-apple-points');
const filterText=ui.querySelector('.nono-apple-current-filter');
const randomSummary=ui.querySelector('.nono-apple-random-summary');
const randomSlot=ui.querySelector('.nono-apple-random-slot');
const actions=setup.querySelector('.setup-actions');
const actionsParent=actions?.parentNode,actionsNext=actions?.nextSibling;
function controlIcon(kind,index){
  const ns='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(ns,'svg');
  svg.setAttribute('class','nono-apple-control-icon');
  svg.setAttribute('aria-hidden','true');
  svg.setAttribute('focusable','false');
  const node=(tag,attrs)=>{
    const el=document.createElementNS(ns,tag);
    Object.entries(attrs).forEach(([key,val])=>el.setAttribute(key,String(val)));
    svg.append(el);
  };
  if(kind==='size'){
    svg.setAttribute('viewBox','0 0 60 60');
    const side=24+index*10,origin=(60-side)/2,divisions=index+3;
    node('rect',{x:origin,y:origin,width:side,height:side,fill:'none',stroke:'currentColor','stroke-width':1.8});
    for(let j=1;j<divisions;j++){
      const at=origin+j*side/divisions;
      node('path',{d:'M'+at+' '+origin+'v'+side+' M'+origin+' '+at+'h'+side,stroke:'currentColor','stroke-width':1.1});
    }
  }else{
    svg.setAttribute('viewBox','0 0 50 32');
    const colors=['#54a675','#d62976','#e78b36','#b34444'];
    for(let j=0;j<4;j++){
      const height=7+j*6;
      node('rect',{x:4+j*11,y:28-height,width:8,height,rx:2,fill:j<=index?colors[index]:'#e4e4e4'});
    }
  }
  return svg;
}
function optionButton(value,selected,click,kind,index){
  const b=document.createElement('button');
  b.type='button';b.className='nono-apple-option';
  const label=document.createElement('span');label.textContent=value;
  b.append(controlIcon(kind,index),label);b.setAttribute('aria-pressed',String(selected));
  if(selected)b.classList.add('is-current');
  b.addEventListener('click',click);
  return b;
}
function changeView(next){
  if(next==='random'&&mode()==='record')return;
  state.view=next;
  render();
}
selectTab.addEventListener('click',()=>changeView('select'));
randomTab.addEventListener('click',()=>changeView('random'));
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
    const launch=ui.querySelector('.nono-apple-launch-controls');
    if(actions&&actions.parentNode!==launch)launch.append(actions);
    const resume=$('nono-resume-view');
    if(resume&&resume.nextElementSibling!==setup)setup.before(resume);
  }else{
    if(tabs.parentNode!==origin.parentNode)origin.parentNode.insertBefore(tabs,origin.nextSibling);
    if(actions&&actionsParent&&actions.parentNode!==actionsParent)
      actionsParent.insertBefore(actions,actionsNext?.parentNode===actionsParent?actionsNext:null);
    const resume=$('nono-resume-view');
    if(resume&&setup.nextElementSibling!==resume)setup.after(resume);
    start.disabled=false;
  }
}
function render(){
  fixThemeNavigation();
  if(!neon())return;
  const all=catalog();
  const allowed=all.filter(supportsMode);
  if(mode()==='record'&&state.view==='random')state.view='select';
  selectTab.setAttribute('aria-selected',String(state.view==='select'));
  randomTab.setAttribute('aria-selected',String(state.view==='random'));
  randomTab.disabled=mode()==='record';
  selectTab.classList.toggle('is-current',state.view==='select');
  randomTab.classList.toggle('is-current',state.view==='random');
  selectPanel.hidden=state.view!=='select';
  randomPanel.hidden=state.view!=='random';
  sizeOptions.replaceChildren();
  levelOptions.replaceChildren();
  sizeGroups.forEach((group,i)=>{
    sizeOptions.append(optionButton(group.name,state.group===i,()=>{state.group=i;render();},'size',i));
  });
  difficulties.forEach((difficulty,i)=>{
    levelOptions.append(optionButton(difficulty,state.level===difficulty,()=>{state.level=difficulty;render();},'level',i));
  });
  const group=sizeGroups[state.group];
  const points=previewPoints(group,state.level);
  pointText.textContent=points===null?'보상 미정':'완료 +'+points+' P';
  filterText.replaceChildren(document.createTextNode(group.name),' · ',document.createTextNode(state.level));
  randomSummary.replaceChildren(document.createTextNode(group.name),' · ',document.createTextNode(state.level));
  randomSlot.replaceChildren();
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
    make.textContent=mode()==='practice'?'새 랜덤 퍼즐 만들기':'랜덤 퍼즐로 방 만들기';
    randomSlot.append(make);
  }
  if(!choices.length){
    const msg=document.createElement('p');msg.className='nono-apple-empty';
    msg.textContent=mode()!=='record'?'이 조건의 등록된 퍼즐이 없습니다. 랜덤 생성 탭에서 새 퍼즐을 만들 수 있어요.':'이 조건의 퍼즐은 아직 준비 중이에요.';
    puzzleRow.append(msg);
  }
  start.disabled=choices.length===0;
  const m=mode();
  const heading=$('setup-heading'),description=$('setup-description');
  const titles={practice:'새 퍼즐',race:'대결 퍼즐',coop:'협동 퍼즐',record:'기록 도전'};
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
    const raw=card.dataset.nonoResumeBoard||'';
    const w=Number(card.dataset.nonoResumeWidth),h=Number(card.dataset.nonoResumeHeight);
    let preview;
    if(Number.isInteger(w)&&Number.isInteger(h)&&w>=1&&h>=1&&w*h<=10000&&
       raw.length===w*h&&/^[012]+$/.test(raw)){
      preview=document.createElement('canvas');
      preview.width=w*4;preview.height=h*4;
      preview.className='nono-apple-resume-preview';
      preview.setAttribute('role','img');
      preview.setAttribute('aria-label','저장된 실제 퍼즐 진행 상태');
      const ctx=preview.getContext('2d');
      if(ctx){
        ctx.fillStyle='#fff';ctx.fillRect(0,0,preview.width,preview.height);
        for(let i=0;i<raw.length;i++){
          const x=(i%w)*4,y=Math.floor(i/w)*4,value=raw[i];
          if(value==='1'){
            ctx.fillStyle='#303030';ctx.fillRect(x,y,4,4);
          }else if(value==='2'){
            ctx.strokeStyle='#999';ctx.lineWidth=.65;
            ctx.beginPath();ctx.moveTo(x+.8,y+.8);ctx.lineTo(x+3.2,y+3.2);
            ctx.moveTo(x+3.2,y+.8);ctx.lineTo(x+.8,y+3.2);ctx.stroke();
          }
        }
        if(w<=20&&h<=20){
          ctx.strokeStyle='#e7e7e7';ctx.lineWidth=.3;
          for(let x=0;x<=w;x++){ctx.beginPath();ctx.moveTo(x*4,0);ctx.lineTo(x*4,h*4);ctx.stroke();}
          for(let y=0;y<=h;y++){ctx.beginPath();ctx.moveTo(0,y*4);ctx.lineTo(w*4,y*4);ctx.stroke();}
        }
      }
    }else{
      preview=document.createElement('span');
      preview.className='nono-apple-resume-preview nono-apple-resume-preview-placeholder';
      preview.textContent='미리보기 없음';
      preview.setAttribute('aria-label','현재 보드 상태를 가져올 수 없습니다');
    }
    const originalIcon=card.querySelector('.nono-resume-symbol');
    if(originalIcon)originalIcon.replaceWith(preview);else card.prepend(preview);
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