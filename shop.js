/* NONO consolidated store.
 * Theme purchases: browser-local mission points only.
 * Cash checkout and ad-free premium: catalog only until authenticated server payments exist.
 */
(()=>{'use strict';
const $=s=>document.querySelector(s);
const CATALOG=[
 {id:'points-small',points:1000,label:'1,000 P',subtitle:'소량 충전 패키지'},
 {id:'points-medium',points:5000,label:'5,000 P',subtitle:'테마 구매용 패키지'},
 {id:'points-large',points:10000,label:'10,000 P',subtitle:'월드 테마 구매용 패키지'}
];
const wallet=()=>window.NONO_DAILY_REWARDS;
const themeApi=()=>window.NONO_THEMES;
const display=n=>Number(n||0).toLocaleString('ko-KR');
let current=null;
function refresh(){
 if(!current||!current.root.isConnected)return;
 const {root}=current,api=wallet(),data=api?.getSnapshot?.()||{points:0,ownedThemes:[]};
 root.querySelector('#nono-shop-balance').textContent='🪙 '+display(data.points)+' 체험 P';
 root.querySelector('#nono-shop-wallet-note').textContent='출석·미션 보상으로 얻은 포인트 · 이 브라우저 전용';
 const selected=themeApi()?.selected||'neon';
 const entry=themeApi()?.list?.find(theme=>theme.id===selected);
 const owned=selected==='neon'||api?.ownsTheme?.(selected);
 const buy=root.querySelector('#nono-shop-buy-theme');
 if(entry&&entry.price>0&&!owned){
  buy.hidden=false;
  buy.disabled=!api||data.points<entry.price;
  buy.textContent=data.points>=entry.price?'🪙 '+display(entry.price)+' P로 잠금 해제':'포인트 부족 · '+display(entry.price)+' P 필요';
 }else{
  buy.hidden=true;buy.disabled=true;
 }
 root.querySelector('#nono-shop-local-notice').textContent=owned
  ?'이 테마는 이 브라우저에서 사용할 수 있어요. 계정 간 소유권 동기화는 아직 지원하지 않아요.'
  :'테마 카드에서 미리보기 후 포인트로 잠금 해제할 수 있어요. 체험으로 얻은 P만 사용됩니다.';
}
function enhance(modal){
 const panel=modal.querySelector('.nono-theme-dialog');
 if(!panel||panel.querySelector('.nono-shop-nav'))return;
 const header=panel.querySelector('.nono-theme-head');
 const groups=panel.querySelector('.nono-theme-groups');
 const footer=panel.querySelector('.nono-theme-foot');
 const nav=document.createElement('div');nav.className='nono-shop-nav';nav.setAttribute('role','tablist');nav.setAttribute('aria-label','상점 메뉴');
 nav.innerHTML=[
  '<button id="nono-shop-tab-themes" role="tab" type="button" aria-selected="true" data-shop-tab="themes">🎨 테마</button>',
  '<button id="nono-shop-tab-points" role="tab" type="button" aria-selected="false" data-shop-tab="points">🪙 포인트 충전</button>',
  '<button id="nono-shop-tab-premium" role="tab" type="button" aria-selected="false" data-shop-tab="premium">👑 광고 제거</button>'
 ].join('');
 header.after(nav);
 const balance=document.createElement('div');balance.className='nono-shop-wallet';
 balance.innerHTML='<strong id="nono-shop-balance">🪙 0 체험 P</strong><small id="nono-shop-wallet-note">이 브라우저 전용</small>';
 nav.after(balance);
 groups.id='nono-shop-themes';groups.setAttribute('role','tabpanel');groups.setAttribute('aria-labelledby','nono-shop-tab-themes');
 const note=document.createElement('p');note.id='nono-shop-local-notice';note.className='nono-shop-local-notice';
 groups.after(note);
 const points=document.createElement('section');points.id='nono-shop-points';points.className='nono-shop-panel';points.setAttribute('role','tabpanel');points.setAttribute('aria-labelledby','nono-shop-tab-points');points.hidden=true;
 const title=document.createElement('h3');title.textContent='🪙 포인트 충전';
 const desc=document.createElement('p');desc.textContent='현금으로 포인트를 충전할 상품이에요. 아직 결제 사업자·서버 승인 연동이 없어 실제 결제는 받지 않습니다.';
 const packs=document.createElement('div');packs.className='nono-shop-packs';
 for(const pack of CATALOG){
  const item=document.createElement('article');item.className='nono-shop-pack';
  const strong=document.createElement('strong');strong.textContent=pack.label;
  const small=document.createElement('small');small.textContent=pack.subtitle;
  const price=document.createElement('span');price.textContent='원화 판매가 미정';
  const button=document.createElement('button');button.type='button';button.disabled=true;button.textContent='결제 준비 중';button.setAttribute('aria-label',pack.label+' 현금 충전 준비 중');
  item.append(strong,small,price,button);packs.append(item);
 }
 const chargeInfo=document.createElement('p');chargeInfo.className='nono-shop-warning';
 chargeInfo.textContent='결제 승인 이후에만 서버 포인트가 적립되어야 합니다. 브라우저 체험 P는 현금 충전·환불·기기 간 이동 대상이 아닙니다.';
 points.append(title,desc,packs,chargeInfo);note.after(points);
 const premium=document.createElement('section');premium.id='nono-shop-premium';premium.className='nono-shop-panel';premium.setAttribute('role','tabpanel');premium.setAttribute('aria-labelledby','nono-shop-tab-premium');premium.hidden=true;
 const card=document.createElement('div');card.className='nono-shop-premium-card';
 const crown=document.createElement('span');crown.className='nono-shop-crown';crown.textContent='👑';
 const copy=document.createElement('div');const h=document.createElement('h3');h.textContent='광고 제거 프리미엄';
 const p=document.createElement('p');p.textContent='향후 사이트에 광고가 도입되면 광고 없는 플레이를 제공하는 상품으로 계획 중입니다.';
 const terms=document.createElement('small');terms.textContent='판매 가격 · 이용 기간 · 결제·환불 정책 미정';
 copy.append(h,p,terms);card.append(crown,copy);
 const premiumButton=document.createElement('button');premiumButton.type='button';premiumButton.disabled=true;premiumButton.textContent='프리미엄 구매 준비 중';premiumButton.className='nono-shop-premium-buy';
 const premiumNote=document.createElement('p');premiumNote.className='nono-shop-warning';premiumNote.textContent='현재 광고 제거 기능이나 결제 승인이 연동되지 않았습니다. 구매 완료/광고 차단 상태로 표시하지 않습니다.';
 premium.append(card,premiumButton,premiumNote);points.after(premium);
 const buy=document.createElement('button');buy.type='button';buy.id='nono-shop-buy-theme';buy.className='nono-shop-buy-theme';
 footer.insertBefore(buy,footer.querySelector('.nono-theme-use'));
 let tab='themes';
 const setTab=id=>{
  tab=id;
  for(const b of nav.querySelectorAll('[data-shop-tab]')){
   const selected=b.dataset.shopTab===id;
   b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;
  }
  groups.hidden=id!=='themes';note.hidden=id!=='themes';
  points.hidden=id!=='points';premium.hidden=id!=='premium';
  footer.hidden=id!=='themes';
 };
 nav.addEventListener('click',e=>{
  const item=e.target.closest('[data-shop-tab]');
  if(item)setTab(item.dataset.shopTab);
 });
 nav.addEventListener('keydown',e=>{
  if(!['ArrowRight','ArrowLeft'].includes(e.key))return;
  e.preventDefault();
  const tabs=[...nav.querySelectorAll('[data-shop-tab]')];
  const i=tabs.findIndex(b=>b.dataset.shopTab===tab);
  const target=tabs[(i+(e.key==='ArrowRight'?1:tabs.length-1))%tabs.length];
  setTab(target.dataset.shopTab);target.focus();
 });
 buy.addEventListener('click',()=>{
  const chosen=themeApi()?.selected,product=themeApi()?.list?.find(t=>t.id===chosen);
  if(!product||!product.price)return;
  const result=wallet()?.purchaseTheme?.(product.id);
  if(result?.ok){
   const msg='이 브라우저에서 '+product.label+' 테마 잠금 해제 완료 · -'+display(product.price)+' 체험 P';
   root.querySelector('.nono-theme-message').textContent=msg;
   refresh();
   themeApi()?.refresh?.();
  }else{
   root.querySelector('.nono-theme-message').textContent=result?.reason||'포인트를 확인할 수 없어요.';
   refresh();
  }
 });
 current={root:modal,refresh,setTab};
 refresh();
 window.addEventListener('nono:wallet-change',refresh,{signal:undefined});
}
window.NONO_SHOP={enhance,refresh};
})();