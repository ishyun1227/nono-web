/* NONO cosmetic themes. Purchases/point balances are intentionally not implemented here. */
(function(){
'use strict';
const THEME_KEY='nono-theme-equipped-v1';
const themes=[
  {id:'neon',label:'네온 다크',desc:'기본 · 기존 NONO 디자인',price:0,colors:['#0c142c','#283a69','#b7a0f5','#7689c8','#f5f0ff']},
  {id:'pastel',label:'파스텔 드림',desc:'밝은 분홍·라벤더 분위기',price:500,colors:['#fff7fc','#e9d7f4','#be85e2','#dac6e6','#382d50']},
  {id:'retro',label:'레트로 아케이드',desc:'옛 게임기처럼 선명한 픽셀 감성',price:1000,colors:['#09160e','#1b3926','#b9ef62','#42664a','#d5ffd3']},
  {id:'forest',label:'마법의 숲',desc:'깊은 초록과 은은한 마법빛',price:2000,colors:['#09221a','#1c4d36','#8dd9ab','#446f59','#e7fff0']}
];
const byId=Object.fromEntries(themes.map(t=>[t.id,t]));
const saved=(()=>{
  try{return localStorage.getItem(THEME_KEY)}catch{return null}
})();
let activeTheme=saved==='neon'?'neon':'neon'; // Point purchases have not been implemented; never trust client-side ownership claims.
let modal=null,selection=activeTheme,previousTheme=activeTheme;
const previewArt=['00100','01110','11111','01110','00100'].join('');
const themeColor={neon:'#0c1225',pastel:'#fff7fc',retro:'#080e0c',forest:'#071a14'};
function applyTheme(id){
  const theme=byId[id]?id:'neon';
  document.body.dataset.nonoTheme=theme;
  document.documentElement.dataset.nonoTheme=theme;
  document.documentElement.style.colorScheme=theme==='pastel'?'light':'dark';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',themeColor[theme]);
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
    :t.label+' 미리보기 · 포인트 구매 기능은 아직 없습니다. 무료 체험은 새로고침하면 해제됩니다.';
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
    if(activeTheme==='neon'){try{localStorage.setItem(THEME_KEY,'neon')}catch{}}
  }else applyTheme(previousTheme);
  modal.remove();modal=null;
  document.removeEventListener('keydown',onKey);
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
  panel.innerHTML='<div class="nono-theme-head"><div><h2 class="nono-theme-title" id="nono-theme-title">🎨 사이트 테마</h2><p class="nono-theme-subtitle">테마를 눌러 홈·퍼즐판·설정창 디자인을 미리 보세요.<br>구매 기능을 만들기 전에는 무료 체험만 가능합니다.</p></div><button type="button" class="nono-theme-close" id="nono-theme-close">닫기</button></div><div class="nono-theme-list" id="nono-theme-list"></div><div class="nono-theme-foot"><p class="nono-theme-message" id="nono-theme-message"></p><button type="button" class="nono-theme-use" id="nono-theme-use">적용</button></div>';
  const list=panel.querySelector('#nono-theme-list');
  for(const theme of themes){
    const btn=document.createElement('button');
    btn.type='button';btn.className='nono-theme-card';btn.dataset.themeId=theme.id;
    const [bg,bg2,fill,line,ink]=theme.colors;
    btn.innerHTML='<div class="nono-theme-sample" aria-hidden="true"><span class="nono-theme-preview-text">NONO</span><span class="nono-theme-pixels">'+Array.from(previewArt,(v)=>'<i class="'+(v==='1'?'fill':'')+'"></i>').join('')+'</span></div><span class="nono-theme-card-info"><span class="nono-theme-card-top"><strong></strong><span class="nono-theme-price"></span></span><small></small></span>';
    const swatch=btn.querySelector('.nono-theme-sample');
    swatch.style.setProperty('--sample-bg',bg);swatch.style.setProperty('--sample-panel',bg2);swatch.style.setProperty('--sample-fill',fill);swatch.style.setProperty('--sample-line',line);swatch.style.setProperty('--sample-text',ink);
    btn.querySelector('strong').textContent=theme.label;
    btn.querySelector('small').textContent=theme.desc;
    btn.setAttribute('aria-label',theme.label+' 미리보기');
    btn.addEventListener('click',()=>chooseTheme(theme.id));
    list.append(btn);
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
window.NONO_THEMES={open:openTheme,get current(){return activeTheme},list:themes.map(({id,label,price})=>({id,label,price}))};
})();
