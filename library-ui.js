/* Library world UI based on the reference composition.
   All navigation, puzzle controls and progress remain wired to actual game state. */
(function(){
'use strict';
const header=document.querySelector('.topbar'),right=header?.querySelector('.header-right');
const game=document.getElementById('game'),home=document.getElementById('home-view');
const picker=document.getElementById('puzzle'),setup=document.getElementById('setup');
const modeButtons=document.querySelectorAll('.mode-card[data-mode]');
const area=document.getElementById('play-area');
if(!header||!right||!game||!home||!picker||!setup||!area)return;
const nav=document.createElement('nav');
nav.className='nono-library-nav';nav.setAttribute('aria-label','신비로운 도서관 바로가기');
const links=[['홈',()=>document.getElementById('brand-home')?.click()],
['퍼즐하기',()=>setup.scrollIntoView({behavior:'smooth',block:'center'})],
['멀티플레이',()=>{document.querySelector('.mode-card[data-mode="race"]')?.click();setup.scrollIntoView({behavior:'smooth',block:'center'});}],
['기록 경쟁',()=>{document.querySelector('.mode-card[data-mode="record"]')?.click();setup.scrollIntoView({behavior:'smooth',block:'center'});}]];
for(const [label,action] of links){
  const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',action);nav.append(b);
}
header.insertBefore(nav,right);
// Interactive mission notes next to the actual game board: no invented players or chats.
const side=document.createElement('aside');side.className='nono-library-side';
side.setAttribute('aria-label','퍼즐 목표와 도움말');
const title=document.createElement('h2');title.textContent='✧ 퍼즐 목표';
const subtitle=document.createElement('p');subtitle.textContent='가로와 세로의 숫자를 따라 숨겨진 그림을 완성하세요.';
const meter=document.createElement('div');meter.className='nono-library-meter';
const progressLabel=document.createElement('span');progressLabel.textContent='진행률';
const progressText=document.createElement('strong');progressText.textContent='0%';
const progressTrack=document.createElement('div');progressTrack.className='nono-library-track';
const progressFill=document.createElement('span');progressFill.style.width='0%';
progressTrack.append(progressFill);meter.append(progressLabel,progressText,progressTrack);
const book=document.createElement('div');book.className='nono-library-book';book.setAttribute('aria-hidden','true');
book.textContent='✦';
const rules=document.createElement('details');rules.className='nono-library-note';
rules.innerHTML='<summary>✧ 퍼즐을 푸는 방법</summary><p>연속해서 칠할 칸의 수가 힌트 숫자예요. 숫자 덩어리 사이에는 빈칸이 하나 이상 필요합니다.</p><p>방향키로 이동하고 Space로 채우기, X로 빈칸을 표시해요.</p>';
const heading=document.createElement('div');heading.className='nono-library-side-header';heading.append(book,title);
const vignette=document.createElement('p');vignette.className='nono-library-quote';vignette.textContent='“작은 빛도, 어둠 속에서는 하나의 별이 된다.”';
side.append(heading,subtitle,meter,rules,vignette);
area.append(side);
const source=document.getElementById('progress');
function sync(){
  let text=source?.textContent?.trim()||'0%';
  if(!/^\d+(?:\.\d+)?%$/.test(text))text='0%';
  const value=Math.min(100,Math.max(0,Number.parseFloat(text)||0));
  progressText.textContent=text;
  progressFill.style.width=value+'%';
  side.hidden=(!document.body.matches('[data-nono-theme="library"]')||area.classList.contains('has-sidebar'));
}
new MutationObserver(sync).observe(source,{childList:true,characterData:true,subtree:true});
new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['data-nono-theme']});
new MutationObserver(sync).observe(area,{attributes:true,attributeFilter:['class']});
sync();
})();