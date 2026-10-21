/* NONO cosmetic themes. Purchases/point balances are intentionally not implemented here. */
(function(){
'use strict';
const TRIAL_KEY='nono-theme-session-trial-v1';
const themes=[
  {id:'neon',tier:'color',label:'네온 다크',desc:'기본 · 기존 NONO 디자인',price:0,colors:['#0c142c','#283a69','#b7a0f5','#7689c8','#f5f0ff']},
  {id:'aurora',tier:'color',label:'오로라 네온',desc:'기존 구조 그대로 · 청록·남보라',price:300,colors:['#071629','#163450','#51e9dc','#376d8e','#effbff']},
  {id:'pastel',tier:'color',label:'크림 라벤더',desc:'기존 구조 그대로 · 크림·라벤더',price:450,colors:['#faf6f0','#efe9fc','#9f8bcf','#d6cdea','#4a406d']},
  {id:'retro',tier:'color',label:'레트로 그린',desc:'기존 디자인에 초록빛 픽셀 감성',price:400,colors:['#09160e','#1b3926','#b9ef62','#42664a','#d5ffd3']},
  {id:'forest',tier:'color',label:'포레스트 그린',desc:'기존 디자인에 깊은 초록과 황금빛',price:500,colors:['#09221a','#1c4d36','#8dd9ab','#446f59','#e7fff0']},
  {id:'arcade',tier:'world',label:'픽셀 시티 아케이드',desc:'네온 게임기·픽셀 UI·아케이드 모니터',price:2500,colors:['#100625','#2d1054','#ff51ba','#4f7cea','#f9f1ff']},
  {id:'library',tier:'world',label:'신비로운 도서관',desc:'별자리 창문·양피지·황금빛 서고 전체 개편',price:3500,colors:['#0b0f21','#2c233d','#f5c97b','#a78656','#f8e6bd']},
  {id:'enchanted',tier:'world',label:'정령의 숲',desc:'달빛 숲, 나무 액자, 판타지 서체와 장식',price:4500,colors:['#09241e','#28503a','#eaca83','#6d986e','#fff3d2']},
  {id:'cosmos',tier:'world',label:'우주 관제실',desc:'우주선, 홀로그램 HUD, 관제 콘솔형 배치',price:5500,colors:['#06182d','#143754','#72dff4','#517996','#f3faff']}
];
const byId=Object.fromEntries(themes.map(t=>[t.id,t]));
const savedTrial=(()=>{
  try{return sessionStorage.getItem(TRIAL_KEY)}catch{return null}
})();
let activeTheme=byId[savedTrial]?savedTrial:'neon'; // Session trial is not a purchase and grants no ownership or server privileges.
let modal=null,selection=activeTheme,previousTheme=activeTheme;
const previewArt=['00100','01110','11111','01110','00100'].join('');
const themeColor={neon:'#0c1225',aurora:'#071629',pastel:'#faf6f0',retro:'#080e0c',forest:'#071a14',arcade:'#09091e',library:'#0b0f21',enchanted:'#091b18',cosmos:'#071727'};
const hero=document.querySelector('.hero');
if(hero){const scene=document.createElement('div');scene.className='nono-world-scene';scene.setAttribute('aria-hidden','true');hero.append(scene);}
const headline=document.querySelector('#hero-title');
const description=document.querySelector('.hero-copy p');
const slogan=document.querySelector('.hero-copy .eyebrow');
const originals={
  headline:headline?.innerHTML||'',description:description?.textContent||'',
  slogan:slogan?.textContent||''
};
const premiumCopy={
  arcade:{headline:'픽셀 도시에서<br><span>최고 점수에 도전.</span>',description:'코인을 넣고 퍼즐을 풀어 보세요. 오늘의 기록은 당신의 것!',slogan:'NONO ARCADE · INSERT COIN'},
  library:{headline:'별빛 서고에 잠든<br><span>새로운 그림.</span>',description:'오래된 별자리와 숫자의 비밀. 한 칸씩 펼쳐지는 퍼즐 이야기.',slogan:'NONO · THE CELESTIAL LIBRARY'},
  enchanted:{headline:'숨겨진 그림을 찾는<br><span>마법의 여행.</span>',description:'숫자와 작은 칸을 따라, 정령의 숲 깊은 곳으로 떠나 보세요.',slogan:'NONO ENCHANTED · THE LOST GROVE'},
  cosmos:{headline:'퍼즐 미션,<br><span>지금 시작합니다.</span>',description:'탐사선의 관제사가 되어 우주 속 비밀 그림을 완성하세요.',slogan:'NONO ORBIT · MISSION CONTROL'}
};
function syncHeroText(theme){
  const copy=premiumCopy[theme];
  if(headline)headline.innerHTML=copy?.headline||originals.headline;
  if(description)description.textContent=copy?.description||originals.description;
  if(slogan)slogan.textContent=copy?.slogan||originals.slogan;
}

function applyTheme(id){
  const theme=byId[id]?id:'neon';
  document.body.dataset.nonoTheme=theme;
  document.documentElement.dataset.nonoTheme=theme;
  document.documentElement.style.colorScheme=theme==='pastel'?'light':'dark';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',themeColor[theme]);
  syncHeroText(theme);
  return theme;
}
function showMessage(){
  if(!modal)return;
  const t=byId[selection];
  modal.querySelectorAll('.nono-theme-card').forEach(btn=>{
    const selected=btn.dataset.themeId===selection;
    btn.setAttribute('aria-pressed',String(selected));
    btn.querySelector('.nono-theme-price').textContent=btn.dataset.themeId===activeTheme?'사용 중':btn.dataset.themeId==='neon'?'기본 무료':byId[btn.dataset.themeId].price.toLocaleString()+' P 예정';
  });
  modal.querySelector('.nono-theme-message').textContent=t.id==='neon'
    ?'기본 테마는 무료로 계속 사용할 수 있어요.'
    :t.label+' '+(t.tier==='world'?'월드 테마':'색상 테마')+' 미리보기 · 포인트 구매는 아직 연결되지 않았습니다. 무료 체험은 현재 탭에서만 유지됩니다.';
  const action=modal.querySelector('.nono-theme-use');
  action.textContent=selection===activeTheme?'선택한 테마 사용 중':t.id==='neon'?'기본 테마 적용':'무료 체험 적용';
}
function chooseTheme(id){
  selection=applyTheme(id);
  showMessage();
}
function closeTheme(keepPreview){
  if(!modal)return;
  if(keepPreview){
    activeTheme=selection;
    try{if(activeTheme==='neon')sessionStorage.removeItem(TRIAL_KEY);else sessionStorage.setItem(TRIAL_KEY,activeTheme)}catch{}
  }else applyTheme(previousTheme);
  modal.remove();modal=null;
  document.removeEventListener('keydown',onKey,true);
  openButton?.focus({preventScroll:true});
}
function onKey(e){if(e.key==='Escape'){e.preventDefault();closeTheme(false)}}
const openButton=document.createElement('button');
openButton.type='button';openButton.id='nono-theme-open';openButton.className='nono-theme-open';
openButton.textContent='🎨 테마';
openButton.title='사이트 전체 테마 미리보기';
openButton.setAttribute('aria-haspopup','dialog');
function openTheme(){
  if(modal)return;
  previousTheme=activeTheme;selection=activeTheme;
  modal=document.createElement('div');modal.className='nono-theme-overlay';modal.id='nono-theme-overlay';
  const panel=document.createElement('section');
  panel.className='nono-theme-dialog';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','nono-theme-title');
  panel.innerHTML='<div class="nono-theme-head"><div><h2 class="nono-theme-title" id="nono-theme-title">🎨 NONO 테마 상점</h2><p class="nono-theme-subtitle">색상 테마는 저렴하게, 월드 테마는 완전히 다른 사이트 분위기로!<br>지금은 가격만 표시하며 모두 무료 미리보기로 체험할 수 있습니다.</p></div><button type="button" class="nono-theme-close" id="nono-theme-close">닫기</button></div><div class="nono-theme-groups" id="nono-theme-groups"></div><div class="nono-theme-foot"><p class="nono-theme-message" id="nono-theme-message"></p><button type="button" class="nono-theme-use" id="nono-theme-use">적용</button></div>';
  const groups=panel.querySelector('#nono-theme-groups'),lists={};
  for(const [tier,title,info] of [
    ['color','🎨 색상 테마','레이아웃은 유지 · 0 ~ 500 P 예정'],
    ['world','✨ 프리미엄 테마','배경·메뉴·카드·게임판 전면 재설계 · 2,500 ~ 5,500 P 예정']
  ]){
    const section=document.createElement('section');section.className='nono-theme-section';
    const heading=document.createElement('div');heading.className='nono-theme-section-heading';
    const h3=document.createElement('h3');h3.textContent=title;
    const small=document.createElement('small');small.textContent=info;
    heading.append(h3,small);
    const list=document.createElement('div');list.className='nono-theme-list';
    lists[tier]=list;section.append(heading,list);groups.append(section);
  }
  for(const theme of themes){
    const btn=document.createElement('button');
    btn.type='button';btn.className='nono-theme-card';btn.dataset.themeId=theme.id;btn.dataset.tier=theme.tier;
    const [bg,bg2,fill,line,ink]=theme.colors;
    btn.innerHTML='<div class="nono-theme-sample" aria-hidden="true"><span class="nono-theme-preview-text">NONO</span><span class="nono-theme-pixels">'+Array.from(previewArt,(v)=>'<i class="'+(v==='1'?'fill':'')+'"></i>').join('')+'</span></div><span class="nono-theme-card-info"><span class="nono-theme-card-top"><strong></strong><span class="nono-theme-price"></span></span><small></small></span>';
    const swatch=btn.querySelector('.nono-theme-sample');
    swatch.style.setProperty('--sample-bg',bg);swatch.style.setProperty('--sample-panel',bg2);swatch.style.setProperty('--sample-fill',fill);swatch.style.setProperty('--sample-line',line);swatch.style.setProperty('--sample-text',ink);
    btn.querySelector('strong').textContent=theme.label;
    btn.querySelector('small').textContent=theme.desc;
    btn.setAttribute('aria-label',theme.label+' 미리보기');
    btn.addEventListener('click',()=>chooseTheme(theme.id));
    lists[theme.tier].append(btn);
  }
  modal.append(panel);document.body.append(modal);
  modal.addEventListener('click',e=>{if(e.target===modal)closeTheme(false)});
  panel.querySelector('#nono-theme-close').addEventListener('click',()=>closeTheme(false));
  panel.querySelector('#nono-theme-use').addEventListener('click',()=>closeTheme(true));
  document.addEventListener('keydown',onKey,true);
  showMessage();
  panel.querySelector('#nono-theme-close').focus();
}
openButton.addEventListener('click',openTheme);
const header=document.querySelector('.header-right');
if(header)header.insertBefore(openButton,document.getElementById('nono-open-settings')||header.firstChild);
applyTheme(activeTheme);
window.NONO_THEMES={open:openTheme,get current(){return activeTheme},list:themes.map(({id,label,price,tier})=>({id,label,price,tier}))};
})();
