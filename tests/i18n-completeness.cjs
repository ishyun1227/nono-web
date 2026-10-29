/* Verify that all currently catalogued UI strings have direct translations in
 * each of the nine expansion languages, rather than relying on English fallback.
 * Native English and Japanese also receive their own legacy dictionaries.
 */
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const load=name=>fs.readFileSync(path.join(root,name),'utf8');
const window={};
const ctx=vm.createContext({window});
for(const name of ['locale-packs.js','locale-settings-packs.js','locale-descriptions-packs.js',
  'locale-core-packs.js','locale-controls-packs.js','locale-options-packs.js',
  'locale-navigation-packs.js','locale-world-packs.js','locale-dynamics.js']){
 vm.runInContext(load(name),ctx,{filename:name});
}
const keyPattern=/\[\s*'((?:\\.|[^'])+)'\s*,\s*'/g;
const keySources=[load('locale.js'),load('locale-en-extra.js')];
const sources=new Set(keySources.flatMap(s=>[...s.matchAll(keyPattern)].map(x=>x[1]))
 .filter(key=>/[가-힣]/.test(key)));
if(sources.size<450)throw Error('Unexpectedly small source string catalog: '+sources.size);
const native=window.NONO_LOCALE_PACKS;
const expected=window.NONO_LOCALE_OPTIONS.map(([id])=>id).filter(id=>!['ko','en','ja'].includes(id));
if(expected.length!==9)throw Error('Expected nine expansion locales: '+expected.join(', '));
for(const locale of expected){
 const dict=native[locale]||{};
 const missing=[...sources].filter(key=>typeof dict[key]!=='string'||!dict[key].trim());
 if(missing.length)throw Error(locale+' lacks '+missing.length+' native translations: '+missing.slice(0,12).join(' | '));
 const hangul=Object.entries(dict).filter(([k,v])=>/[가-힣]/.test(v));
 if(hangul.length)throw Error(locale+' contains untranslated Korean: '+JSON.stringify(hangul.slice(0,5)));
 const wrongScript=locale==='th'?/[\u3400-\u9fff\u3040-\u30ff]/:
   locale.startsWith('zh')?/[\u0e00-\u0e7f\uac00-\ud7a3]/:
   /[\u0e00-\u0e7f\u3400-\u9fff\u3040-\u30ff\uac00-\ud7a3]/;
 const errors=Object.entries(dict).filter(([k,v])=>wrongScript.test(v));
 if(errors.length)throw Error(locale+' has wrong-script strings: '+JSON.stringify(errors.slice(0,5)));
 const dynam=window.NONO_DYNAMIC_LOCALE;
 const samples=['1 / 3 달성','3일차','오늘은 3일차 · 출석하고 40 P 받기',
  '🎁 오늘 출석 보상 받기 · +40 P','+50 P 받기','받음 ✓','진행률 42%',
  '포인트 부족 · 1,200 P 필요','🪙 400 P로 잠금 해제','🪙 1,050 체험 P',
  '7행 9열','행 2 · 열 6','25×25 · 퍼즐 03','25×25 · 크기 테스트',
  '셀 이동키 이미지로 설명보기','정령의 숲 미리보기','4칸 초과'];
 for(const source of samples){
  const result=dynam.format(source,locale,s=>dict[s]||s);
  if(typeof result!=='string'||!result.trim()||/[가-힣]/.test(result))
   throw Error(locale+' dynamic translation missing '+source+': '+JSON.stringify(result));
 }
 console.log('I18N_COMPLETE '+locale+' '+sources.size+' native strings + '+samples.length+' dynamic sample checks');
}
console.log('I18N_COMPLETE 9 locale packs contain translations for all '+sources.size+' catalogued strings.');
