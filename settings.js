/* NONO web settings port: based on roblox-nonogram CURRENT-DECISIONS.md and SETTINGS.md (2026-10-20) */
(function(){
'use strict';
const KEY='nono-web-preferences-v1',SAVE='nono-web-puzzle-v1:';
const device=/Mobi|Android|iPad/i.test(navigator.userAgent)?'touch':'desktop';
const defaults={move:'arrows',quick:'Shift',repeat:'normal',repeatWait:'normal',wrap:true,
 rowHighlight:true,hintHud:true,dragHud:true,autoHintFade:true,completeLines:true,
 undoButtons:true,guide:'start',progress:'both',lastInput:'always',color:'#77d5fb',
 gridWidth:'normal',majorStrength:'normal',majorEvery:'5',bothClues:false,lineNumbers:true,lineInterval:5,pinnedClues:false,minimap:false,
 overviewSize:'normal',overviewPosition:'center',overviewInfo:'percent',
 errorMode:'manual',errorDelay:10,errorStages:false,errorExact:false,errorStrength:'normal',
 dragPolicy:'skip',hintLine:true,hintExplanation:true,hintCell:false,
 soundInput:false,soundTheme:'basic',soundFinish:true,soundWrong:false,soundClick:false,soundHint:true,soundHover:false,volume:40,inputVolume:70,uiVolume:40,effectVolume:70,
 animation:'basic',shadow:true,quality:'normal',highlightQuality:'normal',lod:'normal',autoQuality:false,autoThreshold:'normal',
 zoomWheel:false,zoomSpeed:'normal',follow:'edge',followSpeed:'normal',
 focusEntry:'current',hudBg:'normal',hudSize:'normal',overviewAnimated:false,feedback:'off',
 multiplayerCursor:'normal',multiplayerNames:true,otherInput:'1',hintsManual:{}};
const schema=[
 ['조작',[
 ['move','셀 이동키','choice',['arrows:방향키','wasd:WASD'],'셀 이동용 방향키 묶음'],
 ['quick','빠른 셀 이동','choice',['Shift','Control:Ctrl','Alt','none:없음'],'보조키를 누른 동안 5칸씩 이동'],
 ['repeat','셀 반복 속도','choice',['slow:느림','normal:기본','fast:빠름'],'키를 누른 채 이동할 때 반복 주기'],
 ['repeatWait','연속 이동 시작 대기','choice',['short:짧게','normal:기본','long:길게'],'키를 길게 눌렀을 때 반복을 시작하는 시간'],
 ['wrap','끝에서 반대편 이동','bool',null,'퍼즐 경계를 지나면 반대편 칸으로 이동'],
 ['dragPolicy','드래그의 기존 표시','choice',['skip:기존 표시 건너뜀','overwrite:반대 표시 덮어쓰기'],'기존에 표시된 칸을 드래그할 때의 처리'],
 ['guide','조작 도움말','choice',['always:항상','start:시작할 때만','off:끄기'],'퍼즐 시작 시 10초 동안 도움말 표시 가능']]],
 ['편의성·힌트',[
 ['rowHighlight','현재 행·열 강조','bool',null,'선택 셀이 속한 행과 열을 강조'],
 ['color','강조 색상','color',null,'선택/최근 입력 하이라이트 색상'],
 ['hudSize','HUD 크기','choice',['small:작게','normal:기본','large:크게'],'HUD의 글자 크기'],
 ['hudBg','HUD 배경','choice',['weak:연하게','normal:기본','strong:진하게'],'HUD 배경 농도'],
 ['autoHintFade','완료된 숫자 자동 흐림','bool',null,'X/경계로 닫히고 힌트 순서가 유일할 때만 자동 처리; 수동 지정 우선'],
 ['completeLines','완료된 행·열 표시','bool',null,'완전히 해결된 줄의 배경을 은은하게 흐림'],
 ['hintHud','현재 행·열 숫자 HUD','bool',null,'선택한 칸의 행/열 힌트를 작은 안내창에 표시'],
 ['dragHud','드래그 칸 수 HUD','bool',null,'연속 입력한 칸 수 표시'],
 ['undoButtons','Undo / Redo 버튼','bool',null,'화면 버튼만 감추며 단축키는 유지'],
 ['progress','진행도 표시 형식','choice',['off:꺼짐','percent:퍼센트','cells:완료 칸 수','both:둘 다'],'게임 진행도 정보를 선택'],
 ['lastInput','내 최근 입력 강조','choice',['off:꺼짐','3:3초','5:5초','always:계속'],'가장 최근에 입력한 칸을 강조'],
 ['hintLine','도움 힌트: 풀 수 있는 줄','bool',null,'논리적으로 확정할 수 있는 한 줄만 안내'],
 ['hintExplanation','도움 힌트: 풀이 설명','bool',null,'숫자 힌트에 근거한 간단한 설명'],
 ['hintCell','도움 힌트: 확실한 한 칸','bool',null,'정답을 그대로 보여주지 않고 가능한 배치 모두에 공통인 한 칸만 강조'],
 ['errorMode','오답 알림 방식','choice',['immediate:즉시','delay:시간 지연','manual:직접 검사'],'오답을 언제 알려줄지 선택'],
 ['errorDelay','오답 알림 대기(초)','range',[1,60,1],'시간 지연: 1~60초'],
 ['errorStages','단계형 오답 알림','bool',null,'지연시간마다 전체 → 행/열 → 정확한 칸으로 알림 (정확한 칸 공개가 켜졌을 때만)'],
 ['errorExact','정확한 오답 칸 표시','bool',null,'끄면 정답의 구체적인 칸을 공개하지 않음'],
 ['errorStrength','오답 경고 강도','choice',['weak:약하게','normal:기본','strong:강하게'],'경고 시각효과의 세기']]],
 ['보드·화면',[
 ['gridWidth','일반 격자선 두께','choice',['thin:얇게','normal:기본','thick:두껍게'],'1칸 단위 선 두께'],
 ['majorStrength','굵은 구분선 강조','choice',['weak:약하게','normal:기본','strong:강하게'],'구분선 강조 세기'],
 ['majorEvery','굵은 구분선 간격','choice',['5','10','15','20','25'],'몇 칸마다 굵은 선을 표시할지 선택'],
 ['bothClues','힌트 숫자 양쪽 표시','bool',null,'왼쪽/위쪽 숫자를 오른쪽/아래쪽에도 표시'],
 ['lineNumbers','줄 번호 표시','bool',null,'보드의 행/열 번호 표시'],
 ['lineInterval','줄 번호 표시 간격','range',[1,25,1],'몇 줄마다 번호를 표시할지 설정'],
 ['pinnedClues','가장자리 고정 힌트','bool',null,'선택한 줄의 숫자를 화면에서 항상 확인'],
 ['minimap','상시 미니맵','bool',null,'우측 위에 전체 진행도를 표시; 전체보기 중 잠시 숨김'],
 ['overviewInfo','전체보기 진행정보','choice',['off:표시 안 함','percent:진행률','filled:채운 칸 수','remaining:남은 칸 수','all:전부'],'정답 그림은 노출하지 않음'],
 ['follow','키보드 셀 따라가기','choice',['edge:가장자리에서만','center:항상 중앙'],'키보드 셀 이동 시 스크롤 위치'],
 ['followSpeed','따라가기 속도 (시험/보류)','choice',['slow:느림','normal:기본','fast:빠름'],'완성 전 시험 기능'],
 ['overviewSize','전체보기 크기 (시험/보류)','choice',['small:작게','normal:기본','large:크게'],'전체보기와 미니맵 크기'],
 ['overviewPosition','전체보기 위치 (시험/보류)','choice',['center:중앙','topright:오른쪽 위','topleft:왼쪽 위'],'전체보기 표시 위치'],
 ['zoomWheel','휠 확대 (시험/보류)','bool',null,'보드 위에서 Ctrl+휠로 확대/축소 (기본 꺼짐)'],
 ['zoomSpeed','휠 확대 속도 (시험/보류)','choice',['slow:느림','normal:기본','fast:빠름'],'확대 비율 변경 속도'],
 ['focusEntry','전체보기 시작 위치 (시험/보류)','choice',['current:현재 셀','center:중앙'],'전체보기를 열 때 기준점']]],
 ['사운드·피드백',[
 ['soundInput','채우기·X 입력음','bool',null,'두 입력은 서로 다른 소리'],
 ['soundTheme','입력 소리 테마','choice',['basic:기본','pop:팝','soft:부드럽게'],'채우기와 X의 소리를 세트로 선택'],
 ['soundFinish','퍼즐 완료음','bool',null,'퍼즐을 완성했을 때 소리'],
 ['soundWrong','오답 경고음','bool',null,'즉시 오답 알림을 사용할 때만 작동'],
 ['soundClick','UI 클릭 소리','bool',null,'메뉴를 클릭할 때 소리'],
 ['soundHint','도움 힌트 사용음','bool',null,'실제 풀이 도움 힌트 사용 시만 작동'],
 ['soundHover','UI Hover 소리','bool',null,'버튼에 마우스를 올릴 때 소리'],
 ['volume','전체 효과음 음량','range',[0,100,5],'모든 소리의 음량'],
 ['inputVolume','입력 효과음 음량','range',[0,100,5],'채우기와 X 효과음'],
 ['uiVolume','UI 효과음 음량','range',[0,100,5],'클릭과 호버 효과음'],
 ['effectVolume','힌트·완료 음량','range',[0,100,5],'퍼즐 완료·힌트·오답 효과음'],
 ['animation','셀 입력 애니메이션 테마','choice',['basic:기본','pop:팝','ink:잉크','mechanic:기계식'],'채우기와 X는 각기 다른 효과를 사용'],
 ['feedback','진동 느낌 (시험/보류)','choice',['off:꺼짐','weak:약하게','normal:기본','strong:강하게'],'지원 기기에서만 진동; 카메라 흔들림은 없음']]],
 ['성능·멀티',[
 ['quality','화질 프리셋','choice',['low:낮음','normal:기본','high:높음','custom:사용자 지정'],'그림자·하이라이트·장식 강도 통합'],
 ['shadow','그림자','bool',null,'사이트 장식 그림자 표시'],
 ['highlightQuality','하이라이트 품질 (시험/보류)','choice',['low:낮음','normal:기본','high:높음'],'선택·행/열 하이라이트 표시 품질'],
 ['lod','대형 퍼즐 LOD (시험/보류)','choice',['low:약함','normal:기본','high:강함'],'큰 판을 축소했을 때 얇은 격자선 생략 강도'],
 ['autoQuality','자동 성능 조절','bool',null,'FPS가 낮아질 때 임시 효과를 줄임; 저장된 프리셋은 유지'],
 ['autoThreshold','자동 성능 조절 기준','choice',['quality:화질 우선','normal:기본','stability:안정성 우선'],'FPS 허용 기준'],
 ['multiplayerCursor','다른 플레이어 커서 (온라인 연동 예정)','choice',['off:꺼짐','weak:연하게','normal:기본','strong:진하게'],'서버의 커서 좌표 동기화가 연결된 뒤 적용'],
 ['multiplayerNames','다른 플레이어 이름 (온라인 연동 예정)','bool',null,'실시간 커서 좌표 기능이 필요'],
 ['otherInput','다른 플레이어 최근 입력 (온라인 연동 예정)','choice',['off:꺼짐','1:1초','3:3초','5:5초'],'협동 방의 최근 입력 이벤트 동기화가 필요']]]
];
let profiles={};try{profiles=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch{}
let prefs=Object.assign({},defaults,profiles[device]||{});
const manualClues={};let overviewOpen=false,hintMode=false,hintIndex=0,hintAxis='row',hintNumber=0,hintStage=0,lastInput=-1,lastInputTime=0,errorAt=0,errorFor='',dragStart=null,dragAxis='',dragBaseline=0,keyboardDrag=null,dragCount=0,autofollow=false,autoTimer=null,overviewZoom=1,helpTarget=-1,helpLine=null,settingsOpen=false;
let soundContext=null,toolAction='1',fps=60,frames=0,lastFrame=performance.now(),lowFpsMs=0,runtimeLow=false,cellZoom=41;
function E(tag,cls,txt){const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e;}
function persist(){profiles[device]=Object.assign({},prefs);try{localStorage.setItem(KEY,JSON.stringify(profiles))}catch{}}
function saveKey(){return SAVE+puzzle.id;}
function saveBoard(){if(mode!=='practice'||roomCode||!board||!puzzle)return;try{localStorage.setItem(saveKey(),JSON.stringify({board:board.join(''),startedAt,selected,manual:manualClues[puzzle.id]||{},savedAt:Date.now()}))}catch{}}
function readBoard(){try{const data=JSON.parse(localStorage.getItem(saveKey())||'null');return data&&typeof data.board==='string'&&data.board.length===puzzle.size*puzzle.size?data:null}catch{return null}}
function dropSave(){try{localStorage.removeItem(saveKey())}catch{}}
function setPref(k,v,keepControl){prefs[k]=v;if(k==='quality'&&v!=='custom'){prefs.shadow=v!=='low';prefs.highlightQuality=v==='high'?'high':v==='low'?'low':'normal';}else if(['shadow','highlightQuality'].includes(k))prefs.quality='custom';persist();apply();if(settingsOpen&&!keepControl)drawSettings();}
function playSound(which,variation){const active={input:prefs.soundInput,finish:prefs.soundFinish,wrong:prefs.soundWrong&&prefs.errorMode==='immediate',ui:prefs.soundClick,hint:prefs.soundHint,hover:prefs.soundHover};if(!active[which]||!prefs.volume)return;try{soundContext=soundContext||new(window.AudioContext||window.webkitAudioContext)();const o=soundContext.createOscillator(),g=soundContext.createGain(),t=soundContext.currentTime;const vol=prefs.volume/100*((which==='input'?prefs.inputVolume:which==='ui'||which==='hover'?prefs.uiVolume:prefs.effectVolume)/100)*.085;const base=which==='finish'?790:which==='wrong'?240:which==='hint'?650:which==='ui'?520:which==='hover'?410:variation==='2'?340:500;o.type=prefs.soundTheme==='pop'?'square':prefs.soundTheme==='soft'?'sine':'triangle';o.frequency.setValueAtTime(base,t);o.frequency.exponentialRampToValueAtTime(base*(which==='wrong'?.62:1.3),t+.085);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+.11);o.connect(g);g.connect(soundContext.destination);o.start(t);o.stop(t+.12)}catch{}}
function mount(){
const css=E('style');css.textContent=String.raw`
.nono-settings-toggle{border:1px solid #4e5a86;border-radius:12px;padding:9px 13px;background:#151d37;color:#ecf0ff;font-weight:750;cursor:pointer}
.nono-settings-toggle:hover{border-color:#8d91fa}.nono-options{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.nono-settings-overlay{position:fixed;inset:0;background:#050a17c9;z-index:10000;display:grid;place-items:center;padding:16px}
.nono-settings{width:min(820px,98vw);max-height:92vh;display:flex;flex-direction:column;background:#121c35;border:1px solid #42517e;border-radius:21px;box-shadow:0 26px 90px #000a;color:#eaf0ff;overflow:hidden}
.nono-settings-head{padding:17px 21px;border-bottom:1px solid #303e62;display:flex;justify-content:space-between;align-items:center;gap:14px}
.nono-settings-head h2{font-size:21px;margin:0}.nono-settings-head small{color:#a9b7d7}
.nono-settings-tabs{padding:12px;display:flex;gap:6px;overflow:auto;border-bottom:1px solid #293756}
.nono-settings-tabs button{background:#1a2946;border:1px solid #2a3a61;border-radius:10px;color:#cbd5f8;padding:9px 12px;white-space:nowrap;cursor:pointer}
.nono-settings-tabs button.is-active{background:#4545a4;color:#fff;border-color:#8687ff}
.nono-settings-content{padding:12px 19px;overflow:auto;min-height:100px}
.nono-setting{min-height:55px;padding:10px 2px;display:flex;justify-content:space-between;align-items:center;gap:18px;border-bottom:1px solid #ffffff14}
.nono-setting label{font-size:13px;flex:1;cursor:help}.nono-setting small{font-size:11px;color:#98a9cf;display:block;margin-top:2px;line-height:1.4}
.nono-setting select,.nono-setting input[type=number]{background:#1e2b4a;color:#fff;border:1px solid #48577d;border-radius:9px;padding:9px;max-width:180px}
.nono-setting input[type=checkbox]{width:20px;height:20px;accent-color:#806cfa}.nono-setting input[type=range]{accent-color:#8e72fe;width:144px}
.nono-settings-foot{padding:12px 20px;background:#0f1930;display:flex;justify-content:space-between;gap:8px;align-items:center;color:#9fb0d1;font-size:12px}
.nono-modal-btn{border:1px solid #6074aa;border-radius:9px;background:#252f58;color:#e9eeff;padding:8px 12px;cursor:pointer}
.nono-fade-clue{opacity:.29}.nono-hint-target{background:#50478580!important;border-radius:5px}
.nono-settings-status{color:#9de4d7;font-size:12px}
.nono-extra-hud{font-size:12px;color:#eaf0ff;background:#1b2848db;border:1px solid #596d9c;border-radius:9px;padding:8px 10px;margin:8px 0;display:flex;gap:15px;align-items:center;justify-content:center}
.nono-error{outline:2px solid #ff5671!important;outline-offset:-2px}.nono-error-line{background-color:#7b2b4366!important}
body[data-error-intensity=weak] .nono-error{outline-width:1px!important}body[data-error-intensity=strong] .nono-error{outline-width:4px!important}body[data-error-intensity=strong] .nono-error-line{box-shadow:inset 0 0 0 3px #fa6688!important}
#board .cell.active{outline-color:var(--nono-accent,#77d5fb)}body.nono-economy .nono-selected-row{background-color:#142845!important}
body.nono-economy .hero-art{filter:none!important}body.nono-economy .card,body.nono-economy .button{box-shadow:none!important}
body[data-nono-highlight=low] .nono-selected-row{box-shadow:none!important}body[data-nono-highlight=high] .nono-selected-row{box-shadow:inset 0 0 0 1px #78d3ff44!important}

.nono-last{box-shadow:inset 0 0 0 3px var(--nono-accent,#77d5fb)!important}
.nono-selected-row{background-color:#1f355e!important}.nono-done-line{opacity:.55}
.nono-lines-bold{border-right:var(--nono-major) solid #8695d4!important}.nono-lines-bottom{border-bottom:var(--nono-major) solid #8695d4!important}
.nono-overview{position:fixed;inset:0;z-index:11000;display:grid;place-items:center;background:#060d21da;padding:15px}
.nono-overview[data-position=topright]{place-items:start end}.nono-overview[data-position=topleft]{place-items:start}
.nono-overview-card{background:#182440;border:1px solid #7185bb;border-radius:18px;box-shadow:0 20px 80px #000a;padding:15px;max-width:94vw;max-height:91vh;overflow:auto}
.nono-overview-grid{display:grid;gap:1px;width:min(62vw,600px);aspect-ratio:1}.nono-overview[data-size=small] .nono-overview-grid{width:min(40vw,400px)}.nono-overview[data-size=large] .nono-overview-grid{width:min(83vw,850px)}
.nono-overview-grid i{background:#22304b;display:grid;place-items:center;color:#92a8c8;font-style:normal;font-size:clamp(7px,1vw,17px)}.nono-overview-grid i.is-filled{background:#b1a3f8}
.nono-minimap{position:fixed;right:15px;top:105px;z-index:100;background:#121d35e8;padding:9px;border:1px solid #536492;border-radius:13px;max-width:160px;box-shadow:0 8px 30px #0006}
.nono-minimap-grid{display:grid;width:120px;aspect-ratio:1;gap:1px}.nono-minimap-grid i{background:#243251}.nono-minimap-grid i.is-filled{background:#aa9dfa}.nono-minimap-grid i.is-cross{background:#445d7c}
.nono-actions{display:flex;gap:7px;flex-wrap:wrap;align-items:center;margin:8px 0}.nono-actions button{border-radius:9px;background:#202c50;border:1px solid #53649b;color:#f0f1ff;padding:8px 12px;cursor:pointer}
.nono-keys-hint{font-size:12px;color:#9faed0}.nono-highlight-now{outline:2px solid var(--nono-accent,#77d5fb);outline-offset:-2px}
#board.nono-thin .cell{border-width:.5px}#board.nono-thick .cell{border-width:2px}
.nono-clue-index{position:relative}.nono-clue-index:before{content:attr(data-line-number);position:absolute;left:3px;top:2px;color:#83cbff;font-size:9px}
#board.nono-both{grid-template-columns:max-content max-content max-content;grid-template-rows:max-content max-content max-content}
#board .nono-extra-row{grid-area:2 / 3;opacity:.8;border-left:2px solid #6074ae;border-right:0}
#board .nono-extra-col{grid-area:3 / 2;opacity:.8;border-top:2px solid #6074ae;border-bottom:0}
#board .nono-extra-row .row-clue{justify-content:flex-start}
#board .nono-extra-col .col-clue{justify-content:flex-start}
#board .nono-extra-row .row-clue.nono-fade-clue,#board .nono-extra-col .col-clue.nono-fade-clue{opacity:.3}
#board .cell.nono-input-pop{animation:nono-pop .2s ease-out}#board .cell.nono-input-ink{animation:nono-ink .28s ease-out}#board .cell.nono-input-mechanic{animation:nono-mech .17s ease-out}
@keyframes nono-pop{from{transform:scale(.72)}to{transform:scale(1)}}@keyframes nono-ink{from{opacity:.45;filter:blur(2px)}to{opacity:1;filter:blur(0)}}@keyframes nono-mech{from{transform:translateY(-2px)}to{transform:none}}
.nono-settings-btn-dark{background:#212b48!important}body.nono-no-shadow .card,body.nono-no-shadow .button{box-shadow:none!important}#nono-overview[hidden],#nono-minimap[hidden],#nono-hud[hidden]{display:none!important}
@media(max-width:650px){.nono-setting{align-items:flex-start;flex-direction:column;gap:7px}.nono-setting select{max-width:100%}.nono-settings-foot{flex-wrap:wrap}.nono-overview-grid{width:min(86vw,460px)}}
`;document.head.append(css);
const top=document.querySelector('.header-right');const b=E('button','nono-settings-toggle','⚙ 설정');b.id='nono-open-settings';top.insertBefore(b,top.firstChild);b.addEventListener('click',openSettings);
const bar=E('div','nono-actions');bar.id='nono-actions';bar.innerHTML='<button type="button" id="nono-hint-action">💡 도움 힌트</button><button type="button" id="nono-check-action">✓ 오답 검사</button><span id="nono-hint-status" class="nono-keys-hint" aria-live="polite"></span>';
document.querySelector('.board-footer').after(bar);
document.getElementById('nono-hint-action').onclick=logicHint;
document.getElementById('nono-check-action').onclick=()=>notifyWrong('direct');
const h=E('div','nono-extra-hud');h.id='nono-hud';document.querySelector('.board-top').after(h);
const m=E('div','nono-minimap');m.id='nono-minimap';m.hidden=true;document.body.append(m);
const o=E('div','nono-overview');o.id='nono-overview';o.hidden=true;o.innerHTML='<div class="nono-overview-card"><div class="nono-options" style="justify-content:space-between"><strong>전체보기 · 현재 입력</strong><button class="nono-modal-btn" id="nono-overview-close">닫기 (Tab)</button></div><p id="nono-overview-info" class="nono-keys-hint"></p><div class="nono-overview-grid" id="nono-overview-grid"></div></div>';document.body.append(o);
document.getElementById('nono-overview-close').onclick=closeOverview;o.addEventListener('click',e=>{if(e.target===o)closeOverview()});
document.addEventListener('click',e=>{if(e.target.closest('button')&&e.target.id!=='nono-open-settings')playSound('ui')});
document.addEventListener('mouseover',e=>{if(e.target.closest('button'))playSound('hover')});
document.addEventListener('visibilitychange',()=>{if(document.hidden)saveBoard()});window.addEventListener('pagehide',saveBoard);
}
function drawSettings(){const body=document.querySelector('#nono-settings-content');if(!body)return;const tab=Number(document.querySelector('.nono-settings-tabs .is-active')?.dataset.tab||0);body.innerHTML='';for(const [key,label,type,choices,help] of schema[tab][1]){const row=E('div','nono-setting'),l=E('label',null,label),sub=E('small',null,help);l.title=help;l.append(sub);row.append(l);let input;if(type==='color'){input=E('input');input.type='color';input.value=String(prefs[key]);input.oninput=()=>setPref(key,input.value,true);}else if(type==='bool'){input=E('input');input.type='checkbox';input.checked=!!prefs[key];input.onchange=()=>setPref(key,input.checked);}else if(type==='choice'){input=E('select');for(const item of choices){const p=String(item).split(':');const op=E('option',null,p.length>1?p.slice(1).join(':'):p[0]);op.value=p[0];input.append(op);}input.value=String(prefs[key]);input.onchange=()=>setPref(key,input.value);}else{input=E('input');input.type='range';input.min=choices[0];input.max=choices[1];input.step=choices[2];input.value=prefs[key];let val=E('span','nono-keys-hint',String(input.value));input.oninput=()=>{val.textContent=input.value;setPref(key,Number(input.value),true);};row.append(val);}input.setAttribute('aria-label',label);row.append(input);body.append(row);}
if(tab===0){
 const panel=E('div');panel.innerHTML='<h3 style="font-size:15px;margin-top:18px">키 설정 · 기본키 / 보조키</h3><p class="nono-keys-hint">키를 클릭한 뒤 새 키를 누르세요. 다른 기능과 중복되면 경고만 표시합니다. Escape는 취소합니다.</p>';
 const grid=E('div');for(const action of Object.keys(standardKeys)){const row=E('div','nono-setting');row.append(E('label',null,shortcutNames[action]));shortcut(action).forEach((code,slot)=>{const b=E('button','nono-modal-btn',code?displayKey(code):'+ 키');b.onclick=()=>editBinding(action,slot,b);row.append(b)});grid.append(row)}panel.append(grid);body.append(panel);
}
if(tab===5){const status=E('p','nono-settings-status','웹 화면에서 FPS: '+Math.round(fps)+' · 서버 Ping: Firebase 미연결');body.append(status);body.append(E('p','nono-keys-hint','멀티 커서·플레이어 이름·최근 입력은 현재 서버가 좌표 이벤트를 전송하지 않아 아직 적용되지 않습니다. Roblox 비행·1인칭 손/총 설정은 2D 웹판에 해당하지 않습니다.'));}
}
function openSettings(){if(settingsOpen)return;settingsOpen=true;const overlay=E('div','nono-settings-overlay');overlay.id='nono-settings-overlay';overlay.innerHTML='<div class="nono-settings" role="dialog" aria-modal="true" aria-label="노노그램 설정"><div class="nono-settings-head"><div><h2>⚙ 노노그램 설정</h2><small>변경 즉시 적용 · 장치별 브라우저 저장 · '+(device==='touch'?'터치':'PC')+' 프로필</small></div><button class="nono-modal-btn" id="nono-settings-close">닫기</button></div><div class="nono-settings-tabs"></div><div class="nono-settings-content" id="nono-settings-content"></div><div class="nono-settings-foot"><span>※ (시험/보류) 옵션은 사용하면서 평가할 기능입니다.</span><button class="nono-modal-btn" id="nono-settings-default">현재 장치 설정 초기화</button></div></div>';document.body.append(overlay);
const tabs=overlay.querySelector('.nono-settings-tabs');schema.forEach(([title],i)=>{const b=E('button',i===0?'is-active':'',title);b.dataset.tab=i;b.onclick=()=>{tabs.querySelector('.is-active')?.classList.remove('is-active');b.classList.add('is-active');drawSettings()};tabs.append(b)});
overlay.querySelector('#nono-settings-close').onclick=closeSettings;overlay.querySelector('#nono-settings-default').onclick=()=>{if(confirm('현재 장치의 설정을 기본값으로 되돌릴까요?')){prefs=Object.assign({},defaults);persist();apply();drawSettings();}};
overlay.addEventListener('click',e=>{if(e.target===overlay)closeSettings()});drawSettings();}
function closeSettings(){settingsOpen=false;document.getElementById('nono-settings-overlay')?.remove();}

let cachedSolutionId='',cachedSolution=null;
function exactSolution(){
 if(cachedSolutionId===puzzle.id)return cachedSolution;
 cachedSolutionId=puzzle.id;cachedSolution=null;
 // Derive from publicly available row/column clues; use only when solution is unique.
 if(puzzle.size>20)return null;
 const n=puzzle.size,empty=Array(n).fill('0'),choices=puzzle.rows.map(h=>enumerateLine(h,empty));let answers=[],columns=Array.from({length:n},()=>[]);
 function possiblePrefix(c,v){const h=puzzle.cols[c];const length=v.length;const options=enumerateLine(h,empty);return options.some(line=>line.slice(0,length).join('')===v.join(''));}
 function solve(row){
  if(answers.length>=2)return;
  if(row===n){answers.push(columns.map((_,c)=>columns[c].slice()));return}
  for(const bits of choices[row]){
   for(let c=0;c<n;c++)columns[c].push(bits[c]);
   if(columns.every((col,c)=>possiblePrefix(c,col)))solve(row+1);
   for(let c=0;c<n;c++)columns[c].pop();
   if(answers.length>=2)break;
  }
 }
 solve(0);
 if(answers.length!==1)return null;
 const cols=answers[0];cachedSolution=Array.from({length:n*n},(_,i)=>cols[i%n][Math.floor(i/n)]==='1');return cachedSolution;
}
function wrongCells(){
 const solution=exactSolution();if(!solution)return [];
 const out=[];for(let i=0;i<board.length;i++){
  if((board[i]==='1'&&!solution[i])||(board[i]==='2'&&solution[i]))out.push(i);
 }
 return out;
}
function notifyWrong(kind){const bad=wrongCells();if(!bad.length){if(kind==='direct')toast('현재 표시된 오답이 없어요.');return}let detail=kind==='direct'||kind==='immediate'||prefs.errorExact?'정확한 칸':kind==='line'?'행·열':'전체';if(!prefs.errorExact&&detail==='정확한 칸')detail='개수';toast('오답 '+bad.length+'개 · '+detail+' 알림');const until=performance.now()+1250;const cells=document.querySelectorAll('#board .cell');if(prefs.errorExact){for(const i of bad)cells[i]?.classList.add('nono-error');setTimeout(()=>bad.forEach(i=>cells[i]?.classList.remove('nono-error')),1200)}else if(kind==='line'){for(const i of bad){cells[i]?.classList.add('nono-error-line');setTimeout(()=>cells[i]?.classList.remove('nono-error-line'),1200)}}else{$('board').classList.add('nono-error');setTimeout(()=>$('board').classList.remove('nono-error'),800)}if(kind==='immediate')playSound('wrong');}
function scheduleWrong(){if(prefs.errorMode!=='delay')return;clearTimeout(autoTimer);const original=wrongCells().join(',');if(!original)return;autoTimer=setTimeout(()=>{if(wrongCells().join(',')!==original)return;notifyWrong('delayed');if(prefs.errorStages){setTimeout(()=>{if(wrongCells().join(',')===original)notifyWrong('line')},prefs.errorDelay*1000);if(prefs.errorExact)setTimeout(()=>{if(wrongCells().join(',')===original)notifyWrong('direct')},prefs.errorDelay*2000)}},prefs.errorDelay*1000);}
function hintsForLine(axis,i){return axis==='row'?puzzle.rows[i]:puzzle.cols[i]}
function lineValues(axis,i){const n=puzzle.size;return Array.from({length:n},(_,j)=>axis==='row'?board[i*n+j]:board[j*n+i]);}
function lineSolved(axis,i){const bits=lineValues(axis,i);return lineHints(bits.map(v=>v==='1'?1:0)).join(',')===hintsForLine(axis,i).join(',')}
function canFade(axis,i,j){const values=lineValues(axis,i),clues=hintsForLine(axis,i);let segments=[],start=-1;for(let k=0;k<=values.length;k++){if(values[k]==='1'&&start<0)start=k;if(values[k]!=='1'&&start>=0){segments.push({start,len:k-start,end:k-1});start=-1}}const segment=segments[j];if(!segment||segment.len!==clues[j])return false;if(segment.start>0&&values[segment.start-1]!=='2')return false;if(segment.end<values.length-1&&values[segment.end+1]!=='2')return false;for(let k=0;k<segment.start;k++)if(values[k]==='0')return false;return segments.slice(0,j).every((seg,k)=>seg.len===clues[k]);}
function updateBoard(){if($('game').classList.contains('hidden'))return;const n=puzzle.size,cells=$('board').querySelectorAll('.cell'),hi=String(prefs.majorEvery);$('board').style.setProperty('--nono-accent',prefs.color);$('board').style.setProperty('--nono-major',prefs.majorStrength==='strong'?'4px':prefs.majorStrength==='weak'?'2px':'3px');$('board').classList.toggle('nono-thin',prefs.gridWidth==='thin');$('board').classList.toggle('nono-thick',prefs.gridWidth==='thick');let ratio=board.filter(x=>x==='1').length,black=totalBlack(puzzle),progress=Math.min(100,Math.round(ratio/Math.max(1,black)*100));let hud= prefs.progress==='off'?'':prefs.progress==='percent'?progress+'%':prefs.progress==='cells'?ratio+'/'+black:progress+'% · '+ratio+'/'+black;
$('progress').textContent=hud;$('progress').style.display=prefs.progress==='off'?'none':'';
$('undo').style.display=prefs.undoButtons?'':'none';$('redo').style.display=prefs.undoButtons?'':'none';
$('nono-hint-action').style.display=(prefs.hintLine||prefs.hintExplanation||prefs.hintCell)?'':'none';
const hintGuide=document.querySelector('.board-caption');if(hintGuide)hintGuide.hidden=prefs.guide==='off';
cells.forEach((c,i)=>{const r=Math.floor(i/n),col=i%n;c.classList.toggle('nono-selected-row',!!prefs.rowHighlight&&(r===Math.floor(selected/n)||col===selected%n));c.classList.toggle('nono-done-line',!!prefs.completeLines&&(lineSolved('row',r)||lineSolved('col',col)));c.classList.toggle('nono-last',i===lastInput&&(prefs.lastInput==='always'||(prefs.lastInput!=='off'&&Date.now()-lastInputTime<Number(prefs.lastInput)*1000)));c.classList.toggle('nono-lines-bold',(col+1)%Number(hi)===0&&col<n-1);c.classList.toggle('nono-lines-bottom',(r+1)%Number(hi)===0&&r<n-1);});
for(const axis of ['row','col']){const elems=$('board').querySelectorAll(axis==='row'?'#board > .row-clues:not(.nono-extra-row) .row-clue':'#board > .col-clues:not(.nono-extra-col) .col-clue');elems.forEach((el,i)=>{el.querySelectorAll('span').forEach((span,j)=>{const stored=(manualClues[puzzle.id]||{})[axis+':'+i+':'+j];span.classList.toggle('nono-fade-clue',stored===true||(stored!==false&&prefs.autoHintFade&&canFade(axis,i,j)));span.classList.toggle('nono-hint-target',hintMode&&hintAxis===axis&&hintIndex===i&&j===hintNumber);});});}
const hints='행 '+hintsForLine('row',Math.floor(selected/n)).join(' ')+' · 열 '+hintsForLine('col',selected%n).join(' ');
$('nono-hud').textContent=(prefs.hintHud||prefs.pinnedClues?hints:'')+(prefs.dragHud&&dragCount>0?' · 드래그 '+dragCount+'칸':'');
$('nono-hud').style.fontSize=prefs.hudSize==='large'?'16px':prefs.hudSize==='small'?'10px':'12px';$('nono-hud').style.background=prefs.hudBg==='weak'?'#1b284866':prefs.hudBg==='strong'?'#111b33':'#1b2848db';
$('nono-hud').style.position=prefs.pinnedClues?'sticky':'';$('nono-hud').style.top=prefs.pinnedClues?'0':'';$('nono-hud').style.zIndex=prefs.pinnedClues?'30':'';
$('nono-hud').hidden=!(prefs.hintHud||prefs.pinnedClues||prefs.dragHud&&dragCount>0);
updateClueDecor();
drawMinimap();
}

function updateClueDecor(){
 const target=$('board'),n=puzzle.size;
 target.classList.toggle('nono-both',!!prefs.bothClues);
 target.querySelector('.nono-extra-row')?.remove();target.querySelector('.nono-extra-col')?.remove();
 const r=target.querySelector('.row-clues'),c=target.querySelector('.col-clues');
 if(!r||!c)return;
 r.querySelectorAll('.row-clue').forEach((el,i)=>{el.classList.toggle('nono-clue-index',prefs.lineNumbers&&(i+1)%prefs.lineInterval===0);el.dataset.lineNumber=(i+1)%prefs.lineInterval===0?String(i+1):'';});
 c.querySelectorAll('.col-clue').forEach((el,i)=>{el.classList.toggle('nono-clue-index',prefs.lineNumbers&&(i+1)%prefs.lineInterval===0);el.dataset.lineNumber=(i+1)%prefs.lineInterval===0?String(i+1):'';});
 if(prefs.bothClues){const rc=r.cloneNode(true),cc=c.cloneNode(true);rc.classList.add('nono-extra-row');cc.classList.add('nono-extra-col');target.append(rc,cc);}
}
function apply(){document.body.dataset.errorIntensity=prefs.errorStrength;document.body.dataset.nonoHighlight=prefs.highlightQuality;document.body.classList.toggle('nono-economy',runtimeLow||prefs.quality==='low');document.body.classList.toggle('nono-no-shadow',!prefs.shadow||prefs.quality==='low'||runtimeLow);document.documentElement.style.setProperty('--nono-accent',prefs.color);document.getElementById('nono-minimap').hidden=!prefs.minimap||overviewOpen||$('game').classList.contains('hidden');updateBoard();}
function drawMinimap(){const e=document.getElementById('nono-minimap');if(!e||!prefs.minimap||overviewOpen||$('game').classList.contains('hidden'))return;const n=puzzle.size;e.innerHTML='<b style="font-size:11px">미니맵 · '+n+'×'+n+'</b>';const g=E('div','nono-minimap-grid');g.style.gridTemplateColumns='repeat('+n+',1fr)';board.forEach(v=>{const i=E('i',v==='1'?'is-filled':v==='2'?'is-cross':'');g.append(i)});e.append(g);}
function openOverview(){if($('game').classList.contains('hidden'))return;overviewOpen=true;const modal=$('nono-overview');modal.hidden=false;modal.dataset.position=prefs.overviewPosition;modal.dataset.size=prefs.overviewSize;const n=puzzle.size,filled=board.filter(v=>v==='1').length,black=totalBlack(puzzle),pr=Math.round(filled/Math.max(1,black)*100);$('nono-overview-info').textContent=prefs.overviewInfo==='off'?'':prefs.overviewInfo==='percent'?pr+'%':prefs.overviewInfo==='filled'?filled+'칸':prefs.overviewInfo==='remaining'?Math.max(0,black-filled)+'칸':'진행 '+pr+'% · 칠함 '+filled+'칸 · 남음 '+Math.max(0,black-filled)+'칸';const g=$('nono-overview-grid');g.innerHTML='';g.style.gridTemplateColumns='repeat('+n+',1fr)';board.forEach(v=>{g.append(E('i',v==='1'?'is-filled':'',v==='2'?'×':''))});apply();}
function closeOverview(){overviewOpen=false;$('nono-overview').hidden=true;apply();}
function enumerateLine(hints,values){const n=values.length,states=[],out=[];function go(i,at){if(i===hints.length){const row=Array(n).fill('2');for(const [start,end] of states)for(let k=start;k<end;k++)row[k]='1';if(row.every((v,k)=>values[k]==='0'||values[k]===v))out.push(row);return}const remaining=hints.slice(i+1).reduce((s,v)=>s+v+1,0);for(let start=at;start<=n-hints[i]-remaining;start++){states.push([start,start+hints[i]]);go(i+1,start+hints[i]+1);states.pop();if(out.length>30000)return}}go(0,0);return out}
function logicHint(){hintStage++;let found=null;for(let axis of ['row','col']){for(let i=0;i<puzzle.size;i++){const values=lineValues(axis,i),poss=enumerateLine(hintsForLine(axis,i),values);if(!poss.length)continue;for(let j=0;j<puzzle.size;j++){if(values[j]!=='0')continue;const v=poss[0][j];if(poss.every(line=>line[j]===v)){found={axis,i,j,v,count:poss.length};break}}if(found)break}if(found)break}if(!found){toast('현재 논리적으로 확실한 칸이 없어요.');return;}
const phase=[];if(prefs.hintLine)phase.push('line');if(prefs.hintExplanation)phase.push('explain');if(prefs.hintCell)phase.push('cell');if(!phase.length)return;const step=phase[(hintStage-1)%phase.length];helpTarget=found.axis==='row'?found.i*puzzle.size+found.j:found.j*puzzle.size+found.i;helpLine=found;const text=step==='line'?(found.axis==='row'?'행 ':'열 ')+(found.i+1)+'번에 확실한 칸이 있어요.':step==='explain'?'힌트 숫자를 놓는 가능한 '+found.count+'가지 배치 모두에 공통되는 칸이 있어요.':(found.v==='1'?'채울':'X 표시할')+' 수 있는 확실한 칸을 강조했어요.';toast(text);$('nono-hint-status').textContent=text;if(step==='cell'){document.querySelectorAll('#board .cell')[helpTarget]?.classList.add('nono-highlight-now');setTimeout(()=>document.querySelectorAll('#board .cell')[helpTarget]?.classList.remove('nono-highlight-now'),4500)}playSound('hint');}
function moveSelection(dir,repeat){const n=puzzle.size,r=Math.floor(selected/n),c=selected%n;let row=r,col=c,delta=repeat?5:1;if(dir==='up')row-=delta;else if(dir==='down')row+=delta;else if(dir==='left')col-=delta;else col+=delta;row=prefs.wrap?(row+n*5)%n:Math.max(0,Math.min(n-1,row));col=prefs.wrap?(col+n*5)%n:Math.max(0,Math.min(n-1,col));selected=row*n+col;render();const cell=$('board').querySelectorAll('.cell')[selected];if(cell){cell.scrollIntoView({block:prefs.follow==='center'?'center':'nearest',inline:prefs.follow==='center'?'center':'nearest',behavior:prefs.followSpeed==='fast'?'instant':'smooth'});}}

const standardKeys={
 up:['ArrowUp',''],down:['ArrowDown',''],left:['ArrowLeft',''],right:['ArrowRight',''],
 fill:['Space',''],cross:['KeyX',''],clear:['Backspace','Delete'],
 undo:['Comma',''],redo:['Period',''],hint:['KeyH',''],overview:['Tab',''],
 toolFill:['Digit1',''],toolCross:['Digit2','']
};
const shortcutNames={up:'위로 이동',down:'아래로 이동',left:'왼쪽 이동',right:'오른쪽 이동',
 fill:'칸 칠하기',cross:'X 표시',clear:'칸 지우기',undo:'되돌리기',redo:'다시 실행',hint:'힌트 선택 모드',overview:'전체보기',toolFill:'칠하기 도구',toolCross:'X 도구'};
let bindingCapture=null,moveHeld='',moveTimer=null,moveWait=null;
function shortcut(action){
 let base=standardKeys[action]||['',''];if(['up','down','left','right'].includes(action)&&prefs.move==='wasd'){
  const m={up:'KeyW',down:'KeyS',left:'KeyA',right:'KeyD'};base=[m[action],''];
 }
 return prefs.keys&&Array.isArray(prefs.keys[action])?prefs.keys[action]:base;
}
function matches(action,e){return shortcut(action).includes(e.code)&&!e.isComposing}
function displayKey(k){return ({Space:'Space',KeyX:'X',KeyH:'H',Backspace:'Backspace',Delete:'Delete',Tab:'Tab',Comma:',',Period:'.',ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→'}[k]||k.replace(/^Key/,'').replace(/^Digit/,'')||'미지정')}
function editBinding(action,slot,button){
 bindingCapture={action,slot};button.textContent='새 키 입력…';
 const handle=function(e){if(!bindingCapture)return;e.preventDefault();e.stopImmediatePropagation();
  document.removeEventListener('keydown',handle,true);const capture=bindingCapture;bindingCapture=null;
  if(e.code==='Escape'){drawSettings();return}
  if(!prefs.keys)prefs.keys={};
  const old=shortcut(capture.action).slice();old[capture.slot]=e.code;prefs.keys[capture.action]=old;
  const conflict=Object.keys(standardKeys).filter(other=>other!==capture.action&&shortcut(other).includes(e.code));
  persist();drawSettings();
  if(conflict.length)toast('키 중복 경고: '+displayKey(e.code)+' · '+conflict.map(x=>shortcutNames[x]).join(', '));
 };
 document.addEventListener('keydown',handle,true);
}
function moveOne(dir,fast){moveSelection(dir,fast);if(keyboardDrag){paint(selected,keyboardDrag.to,true);keyboardDrag.steps++;dragCount=keyboardDrag.steps;render();}}
function releaseMove(){if(moveTimer!==null)clearInterval(moveTimer);if(moveWait!==null)clearTimeout(moveWait);moveTimer=null;moveWait=null;moveHeld='';}
function beginMove(code,dir,quick){
 if(moveHeld===code)return;
 releaseMove();moveHeld=code;moveOne(dir,quick);
 const delay={short:170,normal:330,long:550}[prefs.repeatWait]||330;
 const speed={slow:165,normal:85,fast:45}[prefs.repeat]||85;
 moveWait=setTimeout(()=>{moveWait=null;moveTimer=setInterval(()=>moveOne(dir,quick),speed)},delay);
}
function keyDown(e){if(settingsOpen||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;const key=e.key.toLowerCase(),ctrl=e.ctrlKey||e.metaKey;if(overviewOpen){if(key==='tab'||key==='escape'){e.preventDefault();e.stopImmediatePropagation();closeOverview()}return}
if($('game').classList.contains('hidden')||!$('lobby').classList.contains('hidden'))return;
if(matches('overview',e)||matches('hint',e)){e.preventDefault();e.stopImmediatePropagation();if(matches('overview',e)){openOverview()}else{hintMode=!hintMode;hintIndex=hintMode?Math.floor(selected/puzzle.size):0;hintAxis='row';hintNumber=0;toast(hintMode?'힌트 선택: 방향키로 숫자 선택 · Space 흐림/복원 · H 복귀':'셀 이동 모드');render()}return}
if(hintMode){if(key===' '||key==='spacebar'){e.preventDefault();e.stopImmediatePropagation();const k=hintAxis+':'+hintIndex+':'+hintNumber;manualClues[puzzle.id]=manualClues[puzzle.id]||{};manualClues[puzzle.id][k]=!manualClues[puzzle.id][k];saveBoard();render();return}if(key.startsWith('arrow')){e.preventDefault();e.stopImmediatePropagation();if(key==='arrowleft'||key==='arrowright'){hintNumber=(hintNumber+(key==='arrowright'?1:-1)+hintsForLine(hintAxis,hintIndex).length)%hintsForLine(hintAxis,hintIndex).length;}else{hintIndex=(hintIndex+(key==='arrowdown'?1:-1)+puzzle.size)%puzzle.size;hintNumber=0;}if(e.shiftKey){hintAxis=hintAxis==='row'?'col':'row';hintNumber=0;}render();return}}
if(ctrl&&(key==='z'||key==='y')){e.preventDefault();e.stopImmediatePropagation();restoreHistory(key==='y'||e.shiftKey?redoStack:undoStack,key==='y'||e.shiftKey?undoStack:redoStack);return}
if(matches('undo',e)||matches('redo',e)){e.preventDefault();e.stopImmediatePropagation();restoreHistory(matches('undo',e)?undoStack:redoStack,matches('undo',e)?redoStack:undoStack);return}
if(matches('toolFill',e)||matches('toolCross',e)){tool=matches('toolFill',e)?'1':'2';updateToolButtons();e.preventDefault();e.stopImmediatePropagation();return}

 let direction=null;for(const dir of ['up','down','left','right'])if(matches(dir,e)){direction=dir;break}
 if(direction){e.preventDefault();e.stopImmediatePropagation();
  const quick=(prefs.quick==='Shift'&&e.shiftKey)||(prefs.quick==='Control'&&e.ctrlKey)||(prefs.quick==='Alt'&&e.altKey);
  if(!e.repeat)beginMove(e.code,direction,quick);
  return;
 }
 const to=matches('fill',e)?'1':matches('cross',e)?'2':matches('clear',e)?'0':null;
 if(to!==null){e.preventDefault();e.stopImmediatePropagation();
  if(e.repeat&&keyboardDrag&&keyboardDrag.to===to)return;
  if(!keyboardDrag)keyboardDrag={to,first:undoStack.length,steps:1};
  paint(selected,to,false);dragCount=1;render();return;
 }
}
function endKeyboard(e){if(e.code===moveHeld)releaseMove();if(!keyboardDrag)return;if((keyboardDrag.to==='1'&&matches('fill',e))||(keyboardDrag.to==='2'&&matches('cross',e))||(keyboardDrag.to==='0'&&matches('clear',e))){squashHistory(keyboardDrag.first);keyboardDrag=null;dragCount=0;render();}}
function squashHistory(first){if(!['practice','record'].includes(mode)||undoStack.length<=first+1)return;undoStack.splice(first+1,undoStack.length-first-1)}
function setupPointer(){const target=$('board');target.addEventListener('pointerdown',e=>{if(!e.target.closest('.cell'))return;const index=Number(e.target.closest('.cell').dataset.index);dragStart=index;dragAxis='';dragBaseline=undoStack.length;dragCount=1},true);document.addEventListener('pointerup',()=>{if(dragStart!==null){squashHistory(dragBaseline);dragStart=null;dragAxis='';dragCount=0;render()}},true)}
const oldPaint=paint;paint=function(index,to,drag){if(drag&&dragStart!==null){const n=puzzle.size;const ar=Math.floor(dragStart/n),ac=dragStart%n,r=Math.floor(index/n),c=index%n;if(!dragAxis){dragAxis=Math.abs(c-ac)>=Math.abs(r-ar)?'row':'col'}if((dragAxis==='row'&&r!==ar)||(dragAxis==='col'&&c!==ac))return;const from=selected;const start=dragAxis==='row'?from%n:Math.floor(from/n),end=dragAxis==='row'?c:r,step=end>=start?1:-1;for(let k=start;k!==end+step;k+=step){const at=dragAxis==='row'?ar*n+k:k*n+ac;if(prefs.dragPolicy==='skip'&&board[at]!=='0'&&at!==dragStart)continue;oldPaint(at,to,true);dragCount++}updateBoard();return;}
const prev=board[index];oldPaint(index,to,drag);if(board[index]!==prev){lastInput=index;lastInputTime=Date.now();if(prefs.lastInput==='3'||prefs.lastInput==='5')setTimeout(()=>{if(Date.now()-lastInputTime>=Number(prefs.lastInput)*1000)updateBoard()},Number(prefs.lastInput)*1000+50);playSound('input',to);if(prefs.errorMode==='immediate'&&wrongCells().length)notifyWrong('immediate');else scheduleWrong();saveBoard();const cl=$('board').querySelectorAll('.cell')[index];if(cl&&prefs.animation!=='basic'&&prefs.quality!=='low'){const style='nono-input-'+prefs.animation;cl.classList.remove(style);void cl.offsetWidth;cl.classList.add(style);}if(prefs.feedback!=='off'&&navigator.vibrate)navigator.vibrate(prefs.feedback==='strong'?45:prefs.feedback==='normal'?25:12)}updateBoard();};
const oldRender=render;render=function(){oldRender();updateBoard()};
const oldShow=showGame;showGame=function(){oldShow();cellZoom=41;releaseMove();hintMode=false;hintStage=0;lastInput=-1;const saved=mode==='practice'?readBoard():null;if(saved){board=saved.board.split('');selected=saved.selected||0;startedAt=saved.startedAt||Date.now();manualClues[puzzle.id]=saved.manual||{};finished=isSolved(board,puzzle);if(finished)finishedAt=Date.now();oldRender();toast('저장된 퍼즐을 이어서 시작했어요.');}apply();if(prefs.guide==='start')setTimeout(()=>{if(prefs.guide==='start'&&!$('game').classList.contains('hidden'))document.querySelector('.board-caption').hidden=true},10000);};
const oldLeave=leaveGame;leaveGame=async function(){saveBoard();closeOverview();return oldLeave()};
const oldFinish=finishLocal;finishLocal=function(){oldFinish();saveBoard();playSound('finish');setTimeout(()=>openOverview(),300)};
document.addEventListener('keydown',keyDown,true);document.addEventListener('keyup',endKeyboard,true);
document.addEventListener('click',e=>{if(e.target.closest('#restart')){e.preventDefault();e.stopImmediatePropagation();if(!confirm('퍼즐을 초기화할까요? 현재 진행 상황이 지워집니다.'))return;dropSave();board=emptyBoard(puzzle);startedAt=Date.now();selected=0;finished=false;finishedAt=0;resetHistory();render();saveBoard();}},true);
document.addEventListener('click',e=>{if(e.target.closest('#leave-game')){e.preventDefault();e.stopImmediatePropagation();if(!confirm('로비로 나갈까요? 진행 상황은 자동 저장됩니다.'))return;leaveGame()}},true);

const oldCheck=checkBoard;checkBoard=function(){notifyWrong('direct')};
function loop(now){frames++;if(now-lastFrame>1300){fps=frames*1000/(now-lastFrame);frames=0;lastFrame=now;if(prefs.autoQuality){const minFps={quality:25,normal:40,stability:52}[prefs.autoThreshold]||40;if(fps<minFps)lowFpsMs+=1300;else lowFpsMs=Math.max(0,lowFpsMs-2100);const next=lowFpsMs>3600;if(next!==runtimeLow){runtimeLow=next;apply();}}else if(runtimeLow){runtimeLow=false;lowFpsMs=0;apply();}}requestAnimationFrame(loop)}requestAnimationFrame(loop);
mount();setupPointer();
$('board').addEventListener('wheel',e=>{if(!prefs.zoomWheel||!e.ctrlKey)return;e.preventDefault();
 const inc={slow:2,normal:4,fast:7}[prefs.zoomSpeed]||4;
 cellZoom=Math.min(68,Math.max(23,cellZoom+(e.deltaY<0?inc:-inc)));$('board').style.setProperty('--cell-size',cellZoom+'px');
}, {passive:false});
apply();
})();