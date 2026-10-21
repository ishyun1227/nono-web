/* Premium-theme-only home sections: real puzzle selector links, never fabricated rankings. */
(function () {
  'use strict';
  const modeContainer=document.querySelector('.home-content');
  const heroCopy=document.querySelector('.hero-copy');
  const picker=document.getElementById('puzzle');
  const setup=document.getElementById('setup');
  if(!modeContainer||!heroCopy||!picker||!setup)return;

  const cta=document.createElement('button');
  cta.type='button';cta.className='nono-world-cta';
  cta.textContent='퍼즐 선택하기  →';
  cta.addEventListener('click',()=>{
    setup.scrollIntoView({behavior:'smooth',block:'center'});
    picker.focus({preventScroll:true});
  });
  heroCopy.append(cta);

  const section=document.createElement('section');
  section.className='nono-world-extras';section.setAttribute('aria-label','테마별 퍼즐 둘러보기');
  const puzzles=document.createElement('div');puzzles.className='nono-world-panel';
  const heading=document.createElement('h3');heading.id='nono-world-heading';
  const explanation=document.createElement('p');explanation.id='nono-world-explanation';
  const grid=document.createElement('div');grid.className='nono-world-grid';
  puzzles.append(heading,explanation,grid);

  const shop=document.createElement('div');shop.className='nono-world-panel';
  const shopTitle=document.createElement('h3');shopTitle.id='nono-world-shop-title';
  const shopSubtitle=document.createElement('p');shopSubtitle.id='nono-world-shop-subtitle';
  const shopButton=document.createElement('button');shopButton.type='button';
  shopButton.className='nono-world-shop';
  const label=document.createElement('span');label.textContent='테마 둘러보기';
  const price=document.createElement('span');price.textContent='체험하기  ↗';
  shopButton.append(label,price);
  shopButton.addEventListener('click',()=>window.NONO_THEMES?.open?.());
  shop.append(shopTitle,shopSubtitle,shopButton);
  section.append(puzzles,shop);
  modeContainer.append(section);

  const glyph=['✧','▦','✦','◈','⌘'];
  function populate(){
    grid.replaceChildren();
    for(const [index,option] of Array.from(picker.options).filter(o=>o.value).slice(0,5).entries()){
      const button=document.createElement('button');button.className='nono-world-puzzle';button.type='button';
      const icon=document.createElement('span');icon.textContent=glyph[index%glyph.length];icon.setAttribute('aria-hidden','true');
      const title=document.createElement('strong');title.textContent=option.textContent.trim();
      const hint=document.createElement('small');hint.textContent='퍼즐 고르기  →';
      button.append(icon,title,hint);
      button.setAttribute('aria-label',option.textContent.trim()+' 선택');
      button.addEventListener('click',()=>{
        picker.value=option.value;
        picker.dispatchEvent(new Event('change',{bubbles:true}));
        setup.scrollIntoView({behavior:'smooth',block:'center'});
        picker.focus({preventScroll:true});
      });
      grid.append(button);
    }
  }
  const copy={
    arcade:['★ SELECT STAGE','실제로 플레이할 수 있는 퍼즐을 선택하고 최고 기록에 도전하세요.','★ PLAYER BONUS','모든 테마는 지금 무료 체험할 수 있어요. 잠금 해제·포인트 결제는 아직 준비 중이에요.'],
    library:['✧ 숫자의 서고','한 권의 오래된 도감처럼, 퍼즐 한 장을 천천히 펼쳐 보세요.','✦ 숨겨진 세계','색상 테마와 프리미엄 테마를 만나 보세요. 실제 구매·포인트 지급은 아직 연결되지 않았어요.'],
    enchanted:['❧ 모험의 기록','오늘은 어떤 숨겨진 그림을 발견할까요?','✧ 또 다른 풍경','세계를 바꾸는 프리미엄 테마를 둘러보세요. 지금은 무료 체험만 할 수 있어요.'],
    cosmos:['MISSION SELECT','관측할 퍼즐을 고르면 지구와 우주의 작은 수수께끼가 시작됩니다.','THEME SYSTEM','관제실 말고도 다른 세계를 선택할 수 있어요. 구매 기능은 아직 연결되지 않았어요.']
  };
  function sync(){
    const selected=copy[document.body.dataset.nonoTheme]||copy.arcade;
    heading.textContent=selected[0];explanation.textContent=selected[1];
    shopTitle.textContent=selected[2];shopSubtitle.textContent=selected[3];
  }
  populate();sync();
  const observer=new MutationObserver(sync);
  observer.observe(document.body,{attributes:true,attributeFilter:['data-nono-theme']});
})();