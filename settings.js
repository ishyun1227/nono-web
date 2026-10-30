/* NONO web settings port: based on roblox-nonogram CURRENT-DECISIONS.md and SETTINGS.md (2026-10-20) */
(function(){
'use strict';
const KEY='nono-web-preferences-v1',SAVE='nono-web-puzzle-v1:';
const device=/Mobi|Android|iPad/i.test(navigator.userAgent)?'touch':'desktop';
const defaults={move:'arrows',quick:'Shift',altClueQuickFade:true,repeat:'normal',repeatWait:'normal',wrap:true,
 rowHighlight:true,pointerFollow:true,hintHud:true,dragHud:true,filledRunCount:false,filledRunThreshold:10,autoHintFade:true,completeLines:true,
 undoButtons:true,guide:'start',progress:'both',lastInput:'always',color:'#77d5fb',
 gridWidth:'normal',majorStrength:'normal',majorEvery:'5',bothClues:false,showTimer:false,lineNumbers:true,lineInterval:5,pinnedClues:false,minimap:false,
 overviewSize:'normal',overviewPosition:'center',overviewInfo:'percent',
 errorMode:'manual',errorDelay:10,errorStages:false,errorExact:false,errorStrength:'normal',
 dragPolicy:'skip',hintLine:true,hintExplanation:true,hintCell:false,
 soundInput:false,soundTheme:'basic',soundFinish:true,soundWrong:false,soundClick:false,soundHint:true,soundHover:false,volume:40,inputVolume:70,uiVolume:40,effectVolume:70,
 animation:'basic',
 zoomWheel:false,zoomSpeed:'normal',follow:'edge',followSpeed:'normal',
 focusEntry:'current',hudBg:'normal',hudSize:'normal',hudLayouts:{},overviewAnimated:false,feedback:'off',
 multiplayerCursor:'normal',multiplayerNames:true,otherInput:'1',hintsManual:{}};
const schema=[
 ['조작',[
 ['move','셀 이동키','choice',['arrows:방향키','wasd:WASD'],'셀 이동용 방향키 묶음'],
 ['quick','빠른 셀 이동','choice',['Shift','Control:Ctrl','Alt','none:없음'],'보조키를 누른 동안 5칸씩 이동'],
 ['repeat','셀 반복 속도','choice',['slow:느림','normal:기본','fast:빠름'],'키를 누른 채 이동할 때 반복 주기'],
 ['repeatWait','연속 이동 시작 대기','choice',['short:짧게','normal:기본','long:길게'],'키를 길게 눌렀을 때 반복을 시작하는 시간'],
 ['wrap','끝에서 반대편 이동','bool',null,'퍼즐 경계를 지나면 반대편 칸으로 이동'],
 ['altClueQuickFade','Alt + ←/→ 힌트 흐림','bool',null,'Alt를 누른 채 ←로 왼쪽 행 힌트에 진입하고 추가 방향키로 숫자를 선택합니다. →는 오른쪽 힌트가 켜져 있을 때만 사용합니다. Alt를 놓으면 흐림/복원합니다.'],
 ['dragPolicy','드래그의 기존 표시','choice',['skip:기존 표시 건너뜀','overwrite:반대 표시 덮어쓰기'],'기존에 표시된 칸을 드래그할 때의 처리. 손을 떼기 전에 지나온 경로로 돌아가면 그 구간이 원래 상태로 복원됩니다.'],
 ['guide','조작 도움말','choice',['always:항상','start:시작할 때만','off:끄기'],'퍼즐 시작 시 10초 동안 도움말 표시 가능']]],
 ['편의성·힌트',[
 ['rowHighlight','현재 행·열 강조','bool',null,'선택 셀이 속한 행과 열을 강조'],
 ['pointerFollow','마우스 실시간 선택','bool',null,'마우스가 지나간 칸을 현재 선택 칸으로 즉시 따라가게 합니다. 드래그 입력은 별도로 유지됩니다.'],
 ['color','강조 색상','color',null,'선택/최근 입력 하이라이트 색상'],
 ['hudSize','HUD 크기','choice',['small:작게','normal:기본','large:크게'],'HUD의 글자 크기'],
 ['hudBg','HUD 배경','choice',['weak:연하게','normal:기본','strong:진하게'],'HUD 배경 농도'],
 ['autoHintFade','완료된 숫자 자동 흐림','bool',null,'X/경계로 닫히고 힌트 순서가 유일할 때만 자동 처리; 수동 지정 우선'],
 ['completeLines','완료된 행·열 표시','bool',null,'완전히 해결된 줄의 배경을 은은하게 흐림'],
 ['hintHud','현재 행·열 숫자 HUD','bool',null,'선택한 칸의 행/열 힌트를 작은 안내창에 표시'],
 ['dragHud','드래그 칸 수 HUD','bool',null,'연속 입력한 칸 수 표시'],
 ['filledRunCount','연속 색칠 칸 수 표시','bool',null,'설정한 개수를 넘는 연속 검은 칸 구간에 숫자로 길이를 표시합니다. 가로와 세로 구간 모두 적용합니다.'],
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
 ['showTimer','진행 시간 표시','bool',null,'기본은 숨김. 기록 계산은 계속하고 게임 화면의 시계만 표시하거나 감춥니다.'],
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
 ['멀티플레이',[
 ['multiplayerCursor','다른 플레이어 커서 (온라인 연동 예정)','choice',['off:꺼짐','weak:연하게','normal:기본','strong:진하게'],'서버의 커서 좌표 동기화가 연결된 뒤 적용'],
 ['multiplayerNames','다른 플레이어 이름 (온라인 연동 예정)','bool',null,'실시간 커서 좌표 기능이 필요'],
 ['otherInput','다른 플레이어 최근 입력 (온라인 연동 예정)','choice',['off:꺼짐','1:1초','3:3초','5:5초'],'협동 방의 최근 입력 이벤트 동기화가 필요']]]
];
let profiles={};try{profiles=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch{}
let prefs=Object.assign({},defaults,profiles[device]||{});
// Remove obsolete graphics/performance preferences saved by earlier builds.
for(const key of ['quality','shadow','highlightQuality','lod','autoQuality','autoThreshold'])delete prefs[key];
const manualClues={};let overviewOpen=false,hintMode=false,altClueSelection=null,hintIndex=0,hintAxis='row',hintNumber=0,hintStage=0,lastInput=-1,lastInputTime=0,errorAt=0,errorFor='',dragStart=null,dragAxis='',dragBaseline=0,keyboardDrag=null,dragCount=0,autofollow=false,autoTimer=null,overviewZoom=1,helpTarget=-1,helpLine=null,settingsOpen=false;
let fastDrag=null;
let soundContext=null,toolAction='1',cellZoom=41,hudEdit=false,hudSelected='hints';
function E(tag,cls,txt){const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e;}
function persist(){profiles[device]=Object.assign({},prefs);try{localStorage.setItem(KEY,JSON.stringify(profiles))}catch{}}
persist();
function saveKey(){return SAVE+puzzle.id;}
// Single base board for resume + numeric change records for undo/redo.
// Each record: [changesBefore, changesAfter, selectionBefore, selectionAfter,
//               [[cellIndex, oldValue*3+newValue], ...]].
const HISTORY_FORMAT=2;
function encodeHistoryAction(action){
 if(!action||!Array.isArray(action.cells))return null;
 return [action.beforeChanges,action.afterChanges,action.beforeSelected,action.afterSelected,
  action.cells.map(([index,before,after])=>[index,Number(before)*3+Number(after)])];
}
function decodeHistoryAction(data){
 if(!Array.isArray(data)||data.length!==5||!Array.isArray(data[4]))return null;
 const n=puzzle.size*(puzzle.height||puzzle.size);
 const [beforeChanges,afterChanges,beforeSelected,afterSelected,items]=data;
 if(![beforeChanges,afterChanges,beforeSelected,afterSelected].every(Number.isSafeInteger)||
  beforeChanges<0||afterChanges<0||beforeSelected<0||beforeSelected>=n||
  afterSelected<0||afterSelected>=n||items.length>n)return null;
 const seen=new Set(),cells=[];
 for(const entry of items){
  if(!Array.isArray(entry)||entry.length!==2)return null;
  const [index,encoded]=entry;
  if(!Number.isSafeInteger(index)||index<0||index>=n||seen.has(index)||
   !Number.isSafeInteger(encoded)||encoded<0||encoded>8)return null;
  seen.add(index);
  const before=String(Math.floor(encoded/3)),after=String(encoded%3);
  if(before===after)return null;
  cells.push([index,before,after]);
 }
 return {cells,beforeChanges,afterChanges,beforeSelected,afterSelected};
}
// The old save format contains whole-board snapshots. Convert it once on load;
// all subsequent saves write only numeric per-cell changes.
function unpackLegacyHistoryState(data){
 if(!Array.isArray(data)||data.length!==3||typeof data[0]!=='string')return null;
 const length=puzzle.size*(puzzle.height||puzzle.size);
 if(!Number.isFinite(data[1])||data[1]<0||!Number.isInteger(data[2])||data[2]<0||data[2]>=length)return null;
 try{
  const bytes=atob(data[0]);
  if(bytes.length!==Math.ceil(length/4))return null;
  const result=new Array(length);
  for(let i=0;i<length;i++){
   const value=(bytes.charCodeAt(i>>2)>>(2*(i&3)))&3;
   if(value===3)return null;
   result[i]=String(value);
  }
  return {board:result,changes:data[1],selected:data[2]};
 }catch{return null;}
}
function convertLegacyAction(before,after){
 const cells=[];
 for(let i=0;i<before.board.length;i++)
  if(before.board[i]!==after.board[i])cells.push([i,before.board[i],after.board[i]]);
 return {cells,beforeChanges:before.changes,afterChanges:after.changes,
  beforeSelected:before.selected,afterSelected:after.selected};
}
function restoredHistory(data,kind){
 const entries=data[kind];
 if(!Array.isArray(entries))return [];
 if(data.historyFormat===HISTORY_FORMAT)
  return entries.slice(-150).map(decodeHistoryAction).filter(Boolean);
 const states=entries.slice(-150).map(unpackLegacyHistoryState).filter(Boolean);
 const result=new Array(states.length);
 let current={board:data.board.split(''),changes:Number.isFinite(data.changes)?data.changes:0,
  selected:Number.isInteger(data.selected)?data.selected:0};
 for(let i=states.length-1;i>=0;i--){
  const next=states[i];
  result[i]=kind==='undo'?convertLegacyAction(next,current):convertLegacyAction(current,next);
  current=next;
 }
 return result;
}
function saveBoard(){
 if(mode!=='practice'||roomCode||!board||!puzzle||puzzle.sizeTest)return;
 const data={board:board.join(''),startedAt,finishedAt,selected,changes,
  historyFormat:HISTORY_FORMAT,manual:manualClues[puzzle.id]||{},savedAt:Date.now()};
 // Preserve the latest actions first if browser storage becomes full.
 for(const limit of [150,75,30,0]){
  try{
   data.undo=limit?undoStack.slice(-limit).map(encodeHistoryAction).filter(Boolean):[];
   data.redo=limit?redoStack.slice(-limit).map(encodeHistoryAction).filter(Boolean):[];
   localStorage.setItem(saveKey(),JSON.stringify(data));
   window.dispatchEvent(new Event('nono:local-record-changed'));
   return;
  }catch(error){if(limit===0)console.warn('퍼즐 진행 상태를 저장하지 못했어요.',error);}
 }
}
// Migrate legacy standalone playtest progress once, without deleting its
// original localStorage entry. All new play uses the canonical numeric history.
function importOldTrialSave(){
 const id=puzzle.id,n=puzzle.size*(puzzle.height||puzzle.size);
 const legacyKey=id==='winter-snowman-trial-v1'?'nono-winter-snowman-trial-v1':
  id==='trial_rabbit_53x73'?'nono-source-playtest-20261029-rabbit':
  id==='trial_samurai_72x72'?'nono-source-playtest-20261029-samurai':null;
 if(!legacyKey)return null;
 try{
  const old=JSON.parse(localStorage.getItem(legacyKey)||'null');
  if(!old)return null;
  let values=Array(n).fill('0'),actions=[],future=[],started=Date.now(),done=0;
  const validAction=([i,b,a])=>Number.isInteger(i)&&i>=0&&i<n&&
   Number.isInteger(b)&&b>=0&&b<=2&&Number.isInteger(a)&&a>=0&&a<=2&&b!==a;
  if(id==='winter-snowman-trial-v1'){
   if(old.version!==1)return null;
   const decode=b64=>{
    const bytes=atob(b64||'');if(bytes.length%3||bytes.length>n*30)throw Error('Invalid old snowman moves');
    const arr=[];for(let k=0;k<bytes.length;k+=3){
     const i=bytes.charCodeAt(k)*256+bytes.charCodeAt(k+1),x=bytes.charCodeAt(k+2);
     const step=[i,x>>2,x&3];if(!validAction(step))throw Error('Invalid old snowman move');
     arr.push(step);
    }return arr;
   };
   actions=decode(old.undo);future=decode(old.redo);
   for(const [i,b,a] of actions){if(values[i]!==String(b))throw Error('Old snowman history mismatch');values[i]=String(a);}
   started=Number(old.startedAt)||Date.now();done=Number(old.finishedAt)||0;
  }else{
   if(old.v!==1||typeof old.marks!=='string')return null;
   const bytes=atob(old.marks);if(bytes.length!==Math.ceil(n/4))return null;
   values=Array.from({length:n},(_,i)=>String((bytes.charCodeAt(i>>2)>>((i&3)*2))&3));
   if(values.some(v=>v==='3'))return null;
   actions=Array.isArray(old.undo)?old.undo.filter(validAction):[];
   future=Array.isArray(old.redo)?old.redo.filter(validAction):[];
   const elapsed=Number.isFinite(old.elapsed)?Math.max(0,old.elapsed):0;
   started=Date.now()-elapsed;done=old.completed?Date.now():0;
  }
  const convert=(list)=>list.slice(-150).map(([i,b,a],k)=>[
   k,k+1,i,i,[[i,b*3+a]]
  ]);
  const data={board:values.join(''),startedAt:started,finishedAt:done,selected:0,
   changes:actions.length,historyFormat:HISTORY_FORMAT,undo:convert(actions),
   redo:convert(future),manual:{},savedAt:Date.now()};
  // Never mutate the old playtest save and never expose its original solutions.
  localStorage.setItem(saveKey(),JSON.stringify(data));
  return data;
 }catch(error){console.warn('옛 퍼즐 진행 데이터 이전 실패',error);return null;}
}
function readBoard(){
 try{
  const data=JSON.parse(localStorage.getItem(saveKey())||'null')||importOldTrialSave();
  return data&&typeof data.board==='string'&&data.board.length===puzzle.size*(puzzle.height||puzzle.size)&&/^[012]+$/.test(data.board)?data:null;
 }catch{return null;}
}
function dropSave(){try{localStorage.removeItem(saveKey())}catch{}}
function setPref(k,v,keepControl){prefs[k]=v;persist();apply();if(settingsOpen&&!keepControl)drawSettings();}
function playSound(which,variation){const active={input:prefs.soundInput,finish:prefs.soundFinish,wrong:prefs.soundWrong&&prefs.errorMode==='immediate',ui:prefs.soundClick,hint:prefs.soundHint,hover:prefs.soundHover};if(!active[which]||!prefs.volume)return;try{soundContext=soundContext||new(window.AudioContext||window.webkitAudioContext)();const o=soundContext.createOscillator(),g=soundContext.createGain(),t=soundContext.currentTime;const vol=prefs.volume/100*((which==='input'?prefs.inputVolume:which==='ui'||which==='hover'?prefs.uiVolume:prefs.effectVolume)/100)*.085;const base=which==='finish'?790:which==='wrong'?240:which==='hint'?650:which==='ui'?520:which==='hover'?410:variation==='2'?340:500;o.type=prefs.soundTheme==='pop'?'square':prefs.soundTheme==='soft'?'sine':'triangle';o.frequency.setValueAtTime(base,t);o.frequency.exponentialRampToValueAtTime(base*(which==='wrong'?.62:1.3),t+.085);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+.11);o.connect(g);g.connect(soundContext.destination);o.start(t);o.stop(t+.12)}catch{}}
function mount(){
const css=E('style');css.textContent=String.raw`
.nono-settings-toggle{border:1px solid #4e5a86;border-radius:12px;padding:9px 13px;background:#151d37;color:#ecf0ff;font-weight:750;cursor:pointer}
.nono-settings-toggle:hover{border-color:#8d91fa}.nono-options{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.nono-settings-overlay{position:fixed;inset:0;background:#050a17c9;z-index:10000;display:grid;place-items:center;padding:16px}
.nono-settings{width:min(820px,98vw);max-height:92vh;display:flex;flex-direction:column;background:#121c35;border:1px solid #42517e;border-radius:21px;box-shadow:0 26px 90px #000a;color:#eaf0ff;overflow:hidden}
.nono-settings-head{flex:0 0 auto;padding:17px 21px;border-bottom:1px solid #303e62;display:flex;justify-content:space-between;align-items:center;gap:14px}
.nono-settings-head h2{font-size:21px;margin:0}.nono-settings-head small{color:#a9b7d7}
.nono-settings-tabs{flex:0 0 auto;min-height:62px;padding:10px 18px;display:flex;align-items:center;gap:8px;overflow-x:auto;overflow-y:hidden;scrollbar-width:thin;scrollbar-color:#485a87 transparent;border-bottom:1px solid #293756;overscroll-behavior-x:contain}
.nono-settings-tabs button{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;min-height:38px;padding:8px 16px;background:#1a2946;border:1px solid #39486c;border-radius:11px;color:#cbd5f8;font-size:13px;font-weight:650;line-height:1.3;white-space:nowrap;cursor:pointer;transition:background .15s,border-color .15s,color .15s}
.nono-settings-tabs button.is-active{background:#4648a9;color:#fff;border-color:#9691ff;box-shadow:inset 0 0 0 1px #b6b0ff20}
.nono-settings-content{flex:1 1 auto;min-height:0;padding:12px 19px;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain}
.nono-setting{min-height:55px;padding:10px 2px;display:flex;justify-content:space-between;align-items:center;gap:18px;border-bottom:1px solid #ffffff14}
.nono-setting label{font-size:13px;flex:1;cursor:help}.nono-setting small{font-size:11px;color:#98a9cf;display:block;margin-top:2px;line-height:1.4}
.nono-setting select,.nono-setting input[type=number]{background:#1e2b4a;color:#fff;border:1px solid #48577d;border-radius:9px;padding:9px;max-width:180px}
.nono-setting input[type=checkbox]{width:20px;height:20px;accent-color:#806cfa}.nono-setting input[type=range]{accent-color:#8e72fe;width:144px}
.nono-settings-foot{flex:0 0 auto;padding:12px 20px;background:#0f1930;display:flex;justify-content:space-between;gap:8px;align-items:center;color:#9fb0d1;font-size:12px}
.nono-modal-btn{border:1px solid #6074aa;border-radius:9px;background:#252f58;color:#e9eeff;padding:8px 12px;cursor:pointer}
.nono-fade-clue{opacity:.29}.nono-hint-target{background:#50478580!important;border-radius:5px}
.nono-extra-hud{font-size:12px;color:#eaf0ff;background:#1b2848db;border:1px solid #596d9c;border-radius:9px;padding:8px 10px;margin:8px 0;display:flex;gap:15px;align-items:center;justify-content:center}
.nono-error{outline:2px solid #ff5671!important;outline-offset:-2px}.nono-error-line{background-color:#7b2b4366!important}
body[data-error-intensity=weak] .nono-error{outline-width:1px!important}body[data-error-intensity=strong] .nono-error{outline-width:4px!important}body[data-error-intensity=strong] .nono-error-line{box-shadow:inset 0 0 0 3px #fa6688!important}
#board .cell.active{outline-color:var(--nono-accent,#77d5fb)}
#board > .corner,#board > .col-clues,#board > .row-clues{background-color:var(--nono-clue-bg,#131f37)}
#board .col-clue{border-right:1px solid #354766}
#board .row-clue{border-bottom:1px solid #354766}
/* Individual clue numbers also get subtle dividers, not only row/column boundaries. */
#board .col-clue{gap:0;padding-bottom:0}
#board .col-clue > span{display:grid;place-items:center;width:100%;height:19px;border-bottom:1px solid #354766}
#board .row-clue{gap:0}
#board .row-clue > span{display:grid;place-items:center;min-width:22px;height:100%;border-left:1px solid #354766}
#board .col-clue.nono-clue-major{border-right:var(--nono-major,3px) solid #8695d4}
#board .row-clue.nono-clue-major{border-bottom:var(--nono-major,3px) solid #8695d4}
#board .nono-alt-hint-target{background:#504785b8!important;outline:2px solid #75dbff;outline-offset:1px;border-radius:4px}

.nono-last{box-shadow:inset 0 0 0 3px var(--nono-accent,#77d5fb)!important}
.nono-selected-row{background-color:#1f355e!important}.nono-done-line{opacity:.55}
.nono-lines-bold{border-right:var(--nono-major) solid #8695d4!important}.nono-lines-bottom{border-bottom:var(--nono-major) solid #8695d4!important}
.nono-overview{position:fixed;inset:0;z-index:11000;display:grid;place-items:center;background:#060d21da;padding:15px}
.nono-overview[data-position=topright]{place-items:start end}.nono-overview[data-position=topleft]{place-items:start}
.nono-overview-card{background:#182440;border:1px solid #7185bb;border-radius:18px;box-shadow:0 20px 80px #000a;padding:15px;max-width:94vw;max-height:91vh;overflow:auto}
/* Explicit equal-size tracks prevent rows with X glyphs from becoming taller. */
.nono-overview-grid{display:grid;gap:1px;width:min(62vw,600px);aspect-ratio:1/1;grid-auto-rows:minmax(0,1fr);grid-auto-columns:minmax(0,1fr);align-content:stretch;justify-content:stretch;min-width:0;min-height:0;overflow:hidden}
.nono-overview[data-size=small] .nono-overview-grid{width:min(40vw,400px)}
.nono-overview[data-size=large] .nono-overview-grid{width:min(83vw,850px)}
.nono-overview-grid i{min-width:0;min-height:0;overflow:hidden;background:#22304b;display:grid;place-items:center;color:#92a8c8;font-style:normal;font-size:clamp(7px,1vw,17px);line-height:1}
.nono-overview-grid i.is-filled{background:#b1a3f8}
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

/* Drag counter is an overlay, never a flow row that resizes the puzzle. */
#nono-drag-hud{position:fixed;top:205px;left:12px;z-index:120;pointer-events:none;width:max-content;min-width:110px;margin:0}
#nono-drag-hud.nono-hud-target{pointer-events:auto!important}
#nono-drag-hud.nono-drag-active{
 display:flex!important;position:fixed!important;z-index:120!important;
 left:var(--drag-live-x,12px)!important;top:var(--drag-live-y,12px)!important;
 width:max-content!important;min-width:62px!important;max-width:180px!important;
 padding:7px 12px!important;pointer-events:none!important;
 border:1px solid #9389ff!important;border-radius:20px!important;
 background:#18264df5!important;color:#f5f3ff!important;
 font-weight:800!important;font-variant-numeric:tabular-nums!important;
 box-shadow:0 4px 20px #050d23ac!important;
}
#nono-drag-hud.nono-drag-active[hidden]{display:none!important}
.nono-hud-target{outline:2px dashed #78d9ff!important;cursor:move!important;touch-action:none;z-index:10050!important}
.nono-hud-target[data-selected=true]{outline-color:#fab5ff!important;box-shadow:0 0 0 4px #a974fc66!important}
.nono-hud-editor{position:fixed;z-index:10060;left:50%;transform:translateX(-50%);bottom:16px;background:#0c162af5;border:1px solid #546f9d;border-radius:14px;padding:12px;display:flex;gap:9px;align-items:center;flex-wrap:wrap;max-width:95vw;justify-content:center;box-shadow:0 12px 40px #000a}
.nono-hud-editor label{font-size:12px}.nono-hud-editor select{background:#1e2b48;color:#fff;border:1px solid #526da4;border-radius:7px;padding:7px}
#board .cell.nono-input-pop{animation:nono-pop .2s ease-out}#board .cell.nono-input-ink{animation:nono-ink .28s ease-out}#board .cell.nono-input-mechanic{animation:nono-mech .17s ease-out}
#board .cell.nono-anim-cross.nono-input-pop{animation-name:nono-cross-pop}#board .cell.nono-anim-cross.nono-input-ink{animation-name:nono-cross-ink}#board .cell.nono-anim-cross.nono-input-mechanic{animation-name:nono-cross-mech}
@keyframes nono-cross-pop{from{transform:rotate(-12deg) scale(.82)}to{transform:rotate(0deg) scale(1)}}
@keyframes nono-cross-ink{from{opacity:.3;filter:blur(3px)}to{opacity:1;filter:blur(0)}}
@keyframes nono-cross-mech{from{transform:translateX(-2px)}to{transform:none}}
@keyframes nono-pop{from{transform:scale(.72)}to{transform:scale(1)}}@keyframes nono-ink{from{opacity:.45;filter:blur(2px)}to{opacity:1;filter:blur(0)}}@keyframes nono-mech{from{transform:translateY(-2px)}to{transform:none}}
.nono-settings-btn-dark{background:#212b48!important}#nono-overview[hidden],#nono-minimap[hidden],#nono-hud[hidden],#nono-drag-hud[hidden]{display:none!important}
@media(max-width:650px){.nono-setting{align-items:flex-start;flex-direction:column;gap:7px}.nono-setting select{max-width:100%}.nono-settings-foot{flex-wrap:wrap}.nono-overview-grid{width:min(86vw,460px)}}

/* Fit entire puzzle and its hints within available browser viewport. */
body.nono-fit-playing #game{padding-top:6px!important}
body.nono-fit-playing footer{display:none!important}
body.nono-fit-playing .shell{padding-bottom:0!important}
body.nono-fit-playing #game .game-header{margin-bottom:7px!important}
body.nono-fit-playing #game .board-card{padding:9px!important}
body.nono-fit-playing #game .board-top{padding-bottom:5px!important}
body.nono-fit-playing #game .board-scroll{overflow:visible!important;max-width:100%;padding:3px!important;margin:3px 0!important}
body.nono-fit-playing #game .board-caption{padding:3px 0!important}
body.nono-fit-playing #game .board-footer{padding-top:5px!important}
body.nono-fit-playing #game .bottom-row{padding-top:5px!important}
body.nono-fit-playing #game .board-card .tool-button{min-width:54px;padding:5px 10px}
body.nono-fit-playing #game .rules{margin:4px 0!important}
#board.nono-board-fit{max-width:100%;--nono-fit-item-width:12px;--nono-fit-line-height:11px}
#board.nono-board-fit>.corner{width:var(--nono-fit-row-width)!important;height:var(--nono-fit-col-height)!important}
#board.nono-board-fit>.row-clues,#board.nono-board-fit>.nono-extra-row{width:var(--nono-fit-row-width)!important}
#board.nono-board-fit>.col-clues,#board.nono-board-fit>.nono-extra-col{height:var(--nono-fit-col-height)!important}
#board.nono-board-fit .row-clue{
  box-sizing:border-box;width:var(--nono-fit-row-width)!important;min-width:var(--nono-fit-row-width)!important;
  height:var(--cell-size)!important;padding:0 2px!important;gap:0!important;overflow:hidden;
  font-size:var(--nono-fit-font)!important;line-height:1!important
}
#board.nono-board-fit .col-clue{
  width:var(--cell-size)!important;min-height:var(--nono-fit-col-height)!important;
  max-height:var(--nono-fit-col-height)!important;gap:0!important;padding:0!important;
  font-size:var(--nono-fit-font)!important;line-height:1!important;overflow:hidden
}
#board.nono-board-fit .row-clue>span{
  box-sizing:border-box;flex:0 0 var(--nono-fit-item-width);min-width:0!important;height:100%;
  border-left:1px solid #354766;display:grid;place-items:center
}
#board.nono-board-fit .col-clue>span{
  box-sizing:border-box;flex:0 0 var(--nono-fit-line-height);height:var(--nono-fit-line-height)!important;
  border-bottom:1px solid #354766;display:grid;place-items:center;width:100%
}
#board.nono-board-fit .cell{width:var(--cell-size)!important;height:var(--cell-size)!important;min-width:0!important;
  font-size:clamp(7px,calc(var(--cell-size)*.65),21px)!important;border-right-width:.65px!important;border-bottom-width:.65px!important}
#board.nono-board-fit .cell.nono-lines-bold{border-right-width:1.4px!important}
#board.nono-board-fit .cell.nono-lines-bottom{border-bottom-width:1.4px!important}
#board .nono-clue-index::before{display:none!important}
#board .cell[data-row-coordinate]::after{
  content:attr(data-row-coordinate);position:absolute;right:0;bottom:-2px;z-index:5;
  color:#a9dfff;background:#13213abf;padding:1px 2px;border-radius:2px;
  font-size:clamp(7px,calc(var(--cell-size)*.73),10px);line-height:1;
  font-weight:800;pointer-events:none;text-shadow:0 1px 1px #000
}


/* Playing view: use virtually the whole browser width instead of the old 900px card. */
body.nono-fit-playing .topbar{
 height:52px!important;min-height:52px!important;
 margin-bottom:3px!important;padding-top:0!important;padding-bottom:0!important
}
body.nono-fit-playing #game{
 padding-top:4px!important;width:100%;max-width:none!important
}
body.nono-fit-playing #game .game-header{
 display:flex!important;align-items:center!important;
 min-height:33px!important;gap:10px!important;
 margin:0 0 5px!important;padding:0 3px!important;
}
body.nono-fit-playing #game .game-header>div:first-child{
 display:flex;align-items:center;flex-wrap:wrap;gap:8px;min-width:0
}
body.nono-fit-playing #game .game-header h1{
 margin:0!important;font-size:18px!important;line-height:1.3!important
}
body.nono-fit-playing #game .game-header .game-crumb{
 font-size:11px!important;line-height:1.3!important
}
body.nono-fit-playing #game .game-header .text-button{font-size:11px!important}
body.nono-fit-playing #game .game-quick{gap:6px!important}
body.nono-fit-playing #game .play-area,
body.nono-fit-playing #game .play-area.has-sidebar{
 box-sizing:border-box;
 width:calc(100vw - 28px)!important;
 max-width:none!important;
 margin-left:calc(50% - 50vw + 14px)!important;
 margin-right:0!important;
}
body.nono-fit-playing #game .board-card{
 min-width:0!important;width:100%;
}
body.nono-fit-playing #game .board-scroll{justify-content:center!important}
@media(max-width:640px){
 body.nono-fit-playing #game .play-area,
 body.nono-fit-playing #game .play-area.has-sidebar{
  width:calc(100vw - 12px)!important;
  margin-left:calc(50% - 50vw + 6px)!important
 }
 body.nono-fit-playing #game .game-header .game-crumb{display:none}
}

/* Make large puzzles the dominant area, not a tiny grid over stacked toolbars. */
body.nono-fit-playing #game .board-card{display:grid!important;grid-template-columns:minmax(0,1fr) max-content;align-items:center;gap:3px 8px;padding:7px 10px!important}
body.nono-fit-playing #game .board-card>:is(.board-top,#nono-hud,#nono-drag-hud,.board-scroll,.board-caption,.bottom-row,.rules){grid-column:1/-1;min-width:0}
body.nono-fit-playing #game .board-top{padding:2px 0 5px!important}
body.nono-fit-playing #game #nono-hud{padding:4px 6px!important;margin:0!important}
body.nono-fit-playing #game #nono-drag-hud{padding:3px!important;margin:0!important}
body.nono-fit-playing #game .board-scroll{width:100%;min-width:0;max-width:100%;padding:2px!important;margin:0!important;overflow:visible!important;justify-content:center!important}
body.nono-fit-playing #game .board-scroll.nono-zoomed{max-height:var(--nono-visible-board-height,65vh);overflow:auto!important;justify-content:flex-start!important;overscroll-behavior:contain}
body.nono-fit-playing #game .board-scroll.nono-zoomed #board{max-width:none}
body.nono-fit-playing #game .board-footer{grid-column:1;display:flex!important;justify-content:flex-end!important;align-items:center!important;gap:5px!important;margin:0!important;padding:4px 0 0!important}
body.nono-fit-playing #game .board-footer .tool-button{min-width:0!important;min-height:32px!important;padding:5px 8px!important;flex-direction:row!important;gap:5px!important}
body.nono-fit-playing #game .board-footer .tool-icon{font-size:15px!important}
body.nono-fit-playing #game #nono-actions{grid-column:2;display:flex!important;align-items:center!important;flex-wrap:nowrap!important;margin:0!important;gap:5px!important;padding:4px 0 0!important}
body.nono-fit-playing #game #nono-actions button{font-size:11px!important;padding:7px!important}
body.nono-fit-playing #game #nono-hint-status:empty{display:none}
body.nono-fit-playing #game .board-caption{margin:0!important;padding:2px 0!important}
body.nono-fit-playing #game .bottom-row{padding:3px 0 0!important}
body.nono-fit-playing #game .rules{margin:0!important;padding:3px 0!important}
.nono-board-zoom{display:inline-flex;align-items:center;gap:5px;margin-left:auto;white-space:nowrap}
.nono-board-zoom button{min-width:30px;height:30px;padding:4px 7px;border-radius:7px;border:1px solid #52618a;background:#1d2b48;color:#e4edff;cursor:pointer;font:750 13px sans-serif}
.nono-board-zoom button:hover{background:#34476f}
.nono-board-zoom button:disabled{opacity:.4;cursor:default}
.nono-board-zoom button:focus-visible{outline:2px solid #bbaaff;outline-offset:2px}
.nono-board-zoom #nono-zoom-fit{font-size:11px;min-width:68px}
.nono-board-zoom #nono-zoom-label{font-size:11px;color:#cbd9fb;min-width:39px;text-align:center}
@media(max-width:750px){
 body.nono-fit-playing #game .board-card{display:flex!important;flex-direction:column;align-items:stretch}
 body.nono-fit-playing #game #nono-actions{justify-content:center!important;flex-wrap:wrap!important}
 body.nono-fit-playing #game .board-footer{justify-content:center!important}
 body.nono-fit-playing #game .board-top{flex-wrap:wrap;gap:6px}
 .nono-board-zoom{gap:3px}
}

/* The complete puzzle, including every hint number, takes precedence over chrome. */
body.nono-fit-playing{overflow:hidden!important}
body.nono-fit-playing .shell{min-height:0!important;padding-bottom:0!important}
body.nono-fit-playing #game .board-scroll,body.nono-fit-playing #game .board-scroll.nono-zoomed{
 box-sizing:border-box!important;width:100%!important;height:var(--nono-fit-scroller-height,auto)!important;
 max-height:var(--nono-fit-scroller-height,none)!important;
 overflow:hidden!important;overflow-x:hidden!important;overflow-y:hidden!important;
 display:flex!important;align-items:center!important;justify-content:center!important;
 padding:1px!important;margin:0!important
}
body.nono-fit-playing #board.nono-board-fit{
 width:max-content!important;min-width:0!important;max-width:none!important;margin:auto!important;
 grid-template-columns:var(--nono-fit-row-width) var(--nono-fit-grid-width)!important;
 grid-template-rows:var(--nono-fit-col-height) var(--nono-fit-grid-height)!important
}
body.nono-fit-playing #board.nono-board-fit.nono-both{
 grid-template-columns:var(--nono-fit-row-width) var(--nono-fit-grid-width) var(--nono-fit-row-width)!important;
 grid-template-rows:var(--nono-fit-col-height) var(--nono-fit-grid-height) var(--nono-fit-col-height)!important
}
#board.nono-board-fit .row-clues{
 height:var(--nono-fit-grid-height)!important;align-self:start;
 grid-template-rows:repeat(var(--nono-fit-height),var(--cell-size))!important
}
#board.nono-board-fit .col-clues{height:var(--nono-fit-col-height)!important;align-items:end}
#board.nono-board-fit .row-clue,#board.nono-board-fit .col-clue{
 overflow:visible!important;text-overflow:clip!important;
 font-size:var(--nono-fit-font)!important;letter-spacing:-.025em!important;
 font-variant-numeric:tabular-nums!important;line-height:1!important
}
#board.nono-board-fit .row-clue>span,#board.nono-board-fit .col-clue>span{
 box-sizing:border-box!important;overflow:visible!important;white-space:nowrap!important;
 min-width:0!important;font-size:inherit!important;line-height:1!important;
 text-align:center!important
}
#board.nono-board-fit .row-clue>span{
 flex:0 0 var(--nono-fit-item-width)!important;width:var(--nono-fit-item-width)!important;
 height:100%!important;padding:0!important;border-left-width:.5px!important
}
#board.nono-board-fit .col-clue>span{
 flex:0 0 var(--nono-fit-line-height)!important;width:100%!important;
 height:var(--nono-fit-line-height)!important;padding:0!important;border-bottom-width:.5px!important
}
body.nono-fit-playing .topbar,body.nono-fit-playing #game .game-header{
 box-sizing:border-box!important;position:relative!important;left:50%!important;
 transform:translateX(-50%)!important;width:calc(100vw - 28px)!important;
 max-width:none!important;margin-left:0!important;margin-right:0!important
}
#nono-zoom-center{font-size:11px!important}
@media(max-width:640px){
 body.nono-fit-playing .topbar,body.nono-fit-playing #game .game-header{width:calc(100vw - 12px)!important}
}


/* True puzzle-first fit: page chrome no longer consumes most of the viewport. */
body.nono-fit-playing #game .board-card{
 position:fixed!important;top:var(--nono-board-card-top,96px)!important;
 bottom:6px!important;left:14px!important;right:14px!important;
 width:auto!important;height:auto!important;max-height:none!important;
 padding:6px 9px 45px!important;
 display:flex!important;flex-direction:column!important;align-items:stretch!important;
 gap:2px!important;overflow:hidden!important;z-index:5!important
}
body.nono-fit-playing #game .board-top{
 flex:0 0 auto!important;min-height:32px!important;max-height:40px!important
}
body.nono-fit-playing #game #nono-hud{
 position:absolute!important;z-index:3!important;
 top:9px!important;left:25%!important;width:40%!important;
 padding:5px 7px!important;margin:0!important;
 pointer-events:none!important;overflow:hidden!important;
 font-size:10px!important;white-space:nowrap!important;text-overflow:ellipsis!important
}
body.nono-fit-playing #game #nono-drag-hud{
 position:absolute!important;z-index:4!important;top:43px!important;
 right:12px!important;padding:4px 7px!important;margin:0!important;
 pointer-events:none!important
}
body.nono-fit-playing #game .board-scroll,
body.nono-fit-playing #game .board-scroll.nono-zoomed{
 flex:1 1 0!important;min-height:0!important;max-height:none!important;
 height:auto!important;margin:0!important;padding:0!important;
 overflow:hidden!important;align-items:center!important;justify-content:center!important
}
body.nono-fit-playing #game .board-caption{display:none!important}
body.nono-fit-playing #game .board-footer{
 position:absolute!important;bottom:6px!important;left:10px!important;right:auto!important;
 width:auto!important;min-height:32px!important;flex:none!important;
 padding:0!important;margin:0!important;border:0!important;
 display:flex!important;align-items:center!important;gap:4px!important
}
body.nono-fit-playing #game #nono-actions{
 position:absolute!important;bottom:6px!important;right:9px!important;left:auto!important;
 width:auto!important;flex:none!important;padding:0!important;margin:0!important;
 display:flex!important;gap:4px!important;align-items:center!important
}
body.nono-fit-playing #game .bottom-row{
 position:absolute!important;bottom:7px!important;left:50%!important;
 transform:translateX(-50%)!important;display:flex!important;
 padding:0!important;margin:0!important;z-index:3!important;align-items:center!important
}
body.nono-fit-playing #game .bottom-row .control-summary{display:none!important}
body.nono-fit-playing #game .rules{display:none!important}
body.nono-fit-playing #game .bottom-row #restart{padding:6px 8px!important;font-size:11px!important}
@media(max-width:900px){
 body.nono-fit-playing #game .board-card{
  left:6px!important;right:6px!important;
  padding-bottom:76px!important
 }
 body.nono-fit-playing #game .bottom-row{bottom:42px!important}
 body.nono-fit-playing #game .board-footer{bottom:5px!important}
 body.nono-fit-playing #game #nono-actions{bottom:41px!important}
 body.nono-fit-playing #game #nono-hud{display:none!important}
}


/* FULL VIEWPORT LARGE PUZZLES: chrome is floated at the sides of the entire board,
   not stacked above/below it. Zero reserved vertical whitespace. */
body.nono-fit-playing #game .board-card{
 position:fixed!important;inset:0!important;box-sizing:border-box!important;
 width:100vw!important;height:100dvh!important;max-height:none!important;
 padding:0!important;margin:0!important;gap:0!important;
 display:block!important;border:0!important;border-radius:0!important;
 overflow:hidden!important;z-index:5!important
}
body.nono-fit-playing #game .board-scroll,
body.nono-fit-playing #game .board-scroll.nono-zoomed{
 position:absolute!important;inset:0!important;box-sizing:border-box!important;
 width:100%!important;height:100%!important;min-height:100%!important;
 max-height:100%!important;flex:none!important;overflow:hidden!important;
 padding:0!important;margin:0!important;
 display:flex!important;align-items:center!important;justify-content:center!important;
 background:transparent!important
}
body.nono-fit-playing .topbar{
 position:fixed!important;top:0!important;left:0!important;right:0!important;
 transform:none!important;width:100vw!important;max-width:none!important;
 height:42px!important;min-height:0!important;margin:0!important;
 padding:0 9px!important;border:0!important;background:transparent!important;
 z-index:12!important;pointer-events:none!important
}
body.nono-fit-playing .topbar>*{pointer-events:auto!important}
body.nono-fit-playing #game .game-header{
 position:fixed!important;top:43px!important;left:8px!important;right:8px!important;
 transform:none!important;width:calc(100vw - 16px)!important;
 height:32px!important;min-height:0!important;max-width:none!important;
 margin:0!important;padding:0!important;background:transparent!important;
 border:0!important;z-index:12!important;pointer-events:none!important
}
body.nono-fit-playing #game .game-header :is(button,a){pointer-events:auto!important}
body.nono-fit-playing #game .board-top{
 position:fixed!important;inset:0!important;height:0!important;min-height:0!important;
 max-height:0!important;padding:0!important;margin:0!important;
 border:0!important;display:block!important;z-index:11!important;
 background:transparent!important;pointer-events:none!important
}
body.nono-fit-playing #game .board-top :is(.mini-stat,.timer-stat){
 position:fixed!important;top:88px!important;left:8px!important;
 padding:5px 7px!important;margin:0!important;
 background:#17223bdb!important;border-radius:7px!important;
 max-width:200px!important;pointer-events:none!important
}
body.nono-fit-playing #game .board-top .timer-stat{top:118px!important}
body.nono-fit-playing #game #nono-board-zoom{
 position:fixed!important;top:86px!important;right:8px!important;
 margin:0!important;padding:0!important;z-index:12!important;
 display:flex!important;flex-direction:column!important;
 align-items:stretch!important;gap:4px!important;
 pointer-events:auto!important
}
body.nono-fit-playing #game #nono-board-zoom button,
body.nono-fit-playing #game #nono-board-zoom span{
 min-width:82px!important;min-height:26px!important;
 box-sizing:border-box!important;padding:4px!important;text-align:center!important;
 background:#182745e8!important
}
body.nono-fit-playing #game #nono-hud{
 position:fixed!important;top:154px!important;left:8px!important;right:auto!important;
 width:min(215px,17vw)!important;max-width:215px!important;min-width:0!important;
 margin:0!important;padding:5px!important;z-index:11!important;
 font-size:10px!important;white-space:normal!important;overflow:hidden!important;
 pointer-events:none!important
}
body.nono-fit-playing #game #nono-drag-hud{
 position:fixed!important;top:205px!important;left:8px!important;right:auto!important;
 max-width:min(220px,18vw)!important;z-index:11!important
}
body.nono-fit-playing #game .board-footer{
 position:fixed!important;top:235px!important;bottom:auto!important;
 left:8px!important;right:auto!important;width:auto!important;
 display:flex!important;flex-direction:column!important;
 align-items:stretch!important;gap:4px!important;border:0!important;
 padding:0!important;margin:0!important;z-index:11!important
}
body.nono-fit-playing #game .board-footer .tool-button{
 min-width:92px!important;min-height:28px!important;max-height:34px!important;
 padding:3px 7px!important;flex-direction:row!important;
 background:#1a2947e9!important
}
body.nono-fit-playing #game #nono-actions{
 position:fixed!important;top:310px!important;bottom:auto!important;
 right:8px!important;left:auto!important;width:auto!important;
 display:flex!important;flex-direction:column!important;align-items:stretch!important;
 padding:0!important;margin:0!important;gap:5px!important;
 background:transparent!important;z-index:11!important
}
body.nono-fit-playing #game #nono-actions button{
 padding:6px!important;background:#1c2b4bea!important
}
body.nono-fit-playing #game .bottom-row{
 position:fixed!important;top:auto!important;bottom:6px!important;
 left:8px!important;right:auto!important;transform:none!important;
 width:auto!important;margin:0!important;padding:0!important;z-index:11!important
}
body.nono-fit-playing #game .bottom-row #restart{
 padding:5px 7px!important;background:#192744df!important;border-radius:6px!important
}
body.nono-fit-playing #game .board-caption,
body.nono-fit-playing #game .rules{display:none!important}
@media(max-width:900px){
 body.nono-fit-playing #game .board-footer{
  top:auto!important;bottom:5px!important;left:4px!important;
  flex-direction:row!important;gap:2px!important
 }
 body.nono-fit-playing #game .board-footer .tool-button{
  min-width:0!important;padding:2px 4px!important;font-size:9px!important
 }
 body.nono-fit-playing #game #nono-actions{top:auto!important;bottom:38px!important;right:4px!important}
 body.nono-fit-playing #game #nono-board-zoom{top:66px!important;right:4px!important}
 body.nono-fit-playing #game .bottom-row{display:none!important}
 body.nono-fit-playing #game #nono-hud{display:none!important}
}


/* Active-cell and recent-input borders scale with the actual cell, including tiny 100x100 boards. */
#board{--nono-select-line:clamp(.55px,calc(var(--cell-size)*.11),3px)}
#board .cell.active{
 outline:var(--nono-select-line) solid var(--nono-accent,#77d5fb)!important;
 outline-offset:calc(-1*var(--nono-select-line))!important;
 box-shadow:inset 0 0 calc(var(--cell-size)*.18) #75e8fb44!important
}
#board .cell.nono-last:not(.active){box-shadow:inset 0 0 0 var(--nono-select-line) var(--nono-accent,#77d5fb)!important}
#board .cell.nono-highlight-now{outline-width:var(--nono-select-line)!important;outline-offset:calc(-1*var(--nono-select-line))!important}
.nono-setting-visual{flex:0 0 auto;border:1px solid #54638f;border-radius:7px;
 background:#243255;color:#f3f5ff;padding:5px 8px;cursor:pointer;
 font-size:11px;white-space:nowrap}
.nono-setting-visual:hover,.nono-setting-visual:focus-visible{background:#42538a;outline:1px solid #aca5ff}


/* Native PAGE scrolling is allowed; the puzzle container itself never scrolls.
   Zooming past fit enlarges document dimensions so no puzzle content is inaccessible. */
html:has(body.nono-fit-playing){overflow-x:auto!important;overflow-y:auto!important}
html:has(body.nono-fit-playing:not(.nono-zoom-exceeded)){overflow-x:hidden!important;overflow-y:hidden!important}
body.nono-fit-playing:not(.nono-zoom-exceeded){overflow-x:hidden!important;overflow-y:hidden!important}
.nono-setting-run .nono-run-controls{display:flex;align-items:center;gap:10px;flex:0 1 auto;min-width:0}
.nono-setting-run .nono-run-controls input[type="checkbox"]{flex:0 0 20px}
.nono-setting-run .nono-run-controls input[type="range"]{width:clamp(95px,14vw,180px);max-width:100%;min-width:45px}
.nono-setting-run .nono-run-controls output{white-space:nowrap;min-width:65px;text-align:right}
@media(max-width:650px){.nono-setting-run .nono-run-controls{width:100%;max-width:100%}
 .nono-setting-run .nono-run-controls input[type="range"]{flex:1}}
body.nono-fit-playing #game{padding-top:0!important;margin-top:0!important}
body.nono-fit-playing{overflow-x:auto!important;overflow-y:auto!important}
body.nono-fit-playing #game{
 position:relative!important;
 min-height:var(--nono-page-height,100dvh)!important;
 height:var(--nono-page-height,100dvh)!important;
 width:100%!important;
}
body.nono-fit-playing #game #play-area{
 box-sizing:border-box!important;display:block!important;
 width:var(--nono-page-width,100vw)!important;
 max-width:none!important;
 min-width:var(--nono-page-width,100vw)!important;
 height:var(--nono-page-height,100dvh)!important;
 min-height:var(--nono-page-height,100dvh)!important;
 margin-left:calc(50% - 50vw)!important;margin-right:0!important
}
body.nono-fit-playing #game .board-card{
 position:relative!important;top:auto!important;bottom:auto!important;
 left:auto!important;right:auto!important;inset:auto!important;
 width:var(--nono-page-width,100vw)!important;
 min-width:var(--nono-page-width,100vw)!important;
 height:var(--nono-page-height,100dvh)!important;
 min-height:var(--nono-page-height,100dvh)!important;
 margin:0!important;
}
body.nono-fit-playing #game .board-scroll,
body.nono-fit-playing #game .board-scroll.nono-zoomed{
 overflow:hidden!important;overflow-x:hidden!important;overflow-y:hidden!important;
 height:100%!important;min-height:100%!important;max-height:100%!important;
 width:100%!important
}
body.nono-fit-playing #game .board-scroll #board{max-width:none!important}
/* Exact-fit large puzzles must start at the viewport top, not at the 32px
   layout position inherited from the surrounding shell. Zoomed boards retain
   normal document scrolling through the earlier relative-position rule. */
body.nono-fit-playing:not(.nono-zoom-exceeded) #game{
 position:fixed!important;inset:0!important;
 width:100vw!important;max-width:none!important;
 height:100dvh!important;min-height:100dvh!important;
 margin:0!important;padding:0!important
}
/* A selected row/column uses TWO composited overlays; mouse movement never
   loops over 10,000 cell elements just to move the highlight. */
#board .cells{position:relative;isolation:isolate}
#board .cells.nono-hover-lines::before,
#board .cells.nono-hover-lines::after{
 content:"";position:absolute;left:0;top:0;z-index:2;pointer-events:none;
 will-change:transform;background:rgba(56,94,158,.38);
}
#board .cells.nono-hover-lines::before{
 width:100%;height:var(--cell-size);
 transform:translate3d(0,var(--nono-hover-row-y,0px),0)
}
#board .cells.nono-hover-lines::after{
 width:var(--cell-size);height:100%;
 transform:translate3d(var(--nono-hover-col-x,0px),0,0)
}
#board .cells .cell.active{position:relative;z-index:3!important}

#board .cells .nono-run-labels{position:absolute;inset:0;z-index:4;pointer-events:none;overflow:visible}
#board .cells .nono-run-number{position:absolute;display:block;transform:translate(-50%,-50%);box-sizing:border-box;min-width:0;padding:0 1px;border-radius:2px;background:#10172dcf;color:#fff;font-weight:800;line-height:1.02;text-align:center;font-variant-numeric:tabular-nums;white-space:nowrap;text-shadow:0 1px #060d16}
#board .cells .nono-run-number[data-axis=col]{color:#b7eaff;background:#112e40c9}
.nono-visual-help-button{white-space:nowrap;background:#28345d;border:1px solid #8d91ce;color:#fff;
  border-radius:9px;padding:8px 11px;font-size:12px;font-weight:750;cursor:pointer}
.nono-guide-overlay{position:fixed;inset:0;z-index:12010;background:#050a18e8;display:grid;place-items:center;padding:14px}
.nono-guide-dialog{width:min(850px,97vw);max-height:90vh;min-height:0;display:flex;flex-direction:column;
  background:transparent;border:0;border-radius:0;color:#eaf0ff;box-shadow:none}
.nono-guide-head{display:flex;justify-content:flex-end;align-items:center;gap:0;padding:0 12px 8px;
  border:0;background:transparent}
.nono-guide-head .nono-modal-btn{border-radius:50%;min-width:32px;width:32px;height:32px;padding:0;font-size:24px;
  background:#263452d9;border:1px solid #647ba6;color:#fff;line-height:1;cursor:pointer}
.nono-guide-desc{padding:10px 18px 0;margin:0;font-size:12px;color:#aebcdb}
.nono-guide-items{padding:14px;overflow-y:auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:10px}
.nono-guide-item{border:1px solid #38486c;background:#192541;border-radius:12px;padding:12px;min-width:0}
.nono-guide-item h4{font-size:13px;margin:0 0 4px}
.nono-guide-item p{font-size:11px;line-height:1.5;color:#b8c5df;margin:0 0 10px}
.nono-guide-pair{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.nono-guide-sample{border:1px solid #405579;border-radius:8px;background:#0c1730;padding:5px;min-width:0}
.nono-guide-sample strong{display:block;text-align:center;font-size:10px;margin:0 0 4px;color:#d8ddff}
.nono-guide-approved-image{display:block;width:100%;max-width:640px;max-height:min(68vh,560px);height:auto;object-fit:contain;margin:0 auto;border:0;border-radius:8px;background:transparent;image-rendering:auto}
.nono-guide-dialog:has(.nono-guide-approved-image){width:min(720px,95vw);max-height:90vh}
.nono-guide-items:has(.nono-guide-approved-image){display:block;padding:10px 14px 14px;overflow:auto}
.nono-guide-item:has(.nono-guide-approved-image){grid-column:1/-1;padding:0;border:0;background:transparent}
@media(max-height:650px){.nono-guide-approved-image{max-height:65vh}}
.nono-guide-sample svg{display:block;width:100%;height:auto;max-height:100px}
@media(max-width:530px){.nono-settings-head{gap:8px;padding:12px}.nono-settings-head h2{font-size:16px}
 .nono-guide-items{grid-template-columns:1fr}.nono-visual-help-button{padding:7px;font-size:11px}}
`;document.head.append(css);
const top=document.querySelector('.header-right');const b=E('button','nono-settings-toggle','⚙ 설정');b.id='nono-open-settings';top.insertBefore(b,top.firstChild);b.addEventListener('click',openSettings);
const bar=E('div','nono-actions');bar.id='nono-actions';bar.innerHTML='<button type="button" id="nono-hint-action">💡 도움 힌트</button><button type="button" id="nono-check-action">✓ 오답 검사</button><span id="nono-hint-status" class="nono-keys-hint" aria-live="polite"></span>';
document.querySelector('.board-footer').after(bar);
document.getElementById('nono-hint-action').onclick=logicHint;
document.getElementById('nono-check-action').onclick=()=>notifyWrong('direct');
const zoom=E('div','nono-board-zoom');
zoom.id='nono-board-zoom';zoom.setAttribute('role','group');zoom.setAttribute('aria-label','퍼즐판 크기 조절');
zoom.innerHTML='<button type="button" id="nono-zoom-out" aria-label="퍼즐판 축소">−</button><span id="nono-zoom-label" aria-live="polite">맞춤</span><button type="button" id="nono-zoom-in" aria-label="퍼즐판 확대">＋</button><button type="button" id="nono-zoom-center">가운데 두기</button><button type="button" id="nono-zoom-fit">화면 맞춤</button>';
document.querySelector('#game .board-top').append(zoom);
$('nono-zoom-out').onclick=()=>setBoardZoom(-.1);
$('nono-zoom-in').onclick=()=>setBoardZoom(.1);
$('nono-zoom-center').onclick=centerBoard;
$('nono-zoom-fit').onclick=()=>{boardZoom=1;scheduleBoardFit();requestAnimationFrame(centerBoard)};
const h=E('div','nono-extra-hud');h.id='nono-hud';document.querySelector('.board-top').after(h);const d=E('div','nono-extra-hud');d.id='nono-drag-hud';d.hidden=true;h.after(d);
const m=E('div','nono-minimap');m.id='nono-minimap';m.hidden=true;document.body.append(m);
const o=E('div','nono-overview');o.id='nono-overview';o.hidden=true;o.innerHTML='<div class="nono-overview-card"><div class="nono-options" style="justify-content:space-between"><strong>전체보기 · 현재 입력</strong><button class="nono-modal-btn" id="nono-overview-close">닫기 (Tab)</button></div><p id="nono-overview-info" class="nono-keys-hint"></p><div class="nono-overview-grid" id="nono-overview-grid"></div></div>';document.body.append(o);
document.getElementById('nono-overview-close').onclick=closeOverview;o.addEventListener('click',e=>{if(e.target===o)closeOverview()});
document.addEventListener('click',e=>{if(e.target.closest('button')&&e.target.id!=='nono-open-settings')playSound('ui')});
document.addEventListener('mouseover',e=>{if(e.target.closest('button'))playSound('hover')});
document.addEventListener('visibilitychange',()=>{if(document.hidden)saveBoard()});window.addEventListener('pagehide',saveBoard);
}
function drawSettings(){const body=document.querySelector('#nono-settings-content');if(!body)return;const tab=Number(document.querySelector('.nono-settings-tabs .is-active')?.dataset.tab||0);body.innerHTML='';for(const [key,label,type,choices,help] of schema[tab][1]){
 const row=E('div','nono-setting'),l=E('label',null,label),sub=E('small',null,help);
 l.title=help;l.append(sub);row.append(l);
 if(key==='filledRunCount'){
  row.classList.add('nono-setting-run');
  const controls=E('div','nono-run-controls');
  const enabled=E('input');enabled.type='checkbox';enabled.checked=!!prefs.filledRunCount;
  enabled.setAttribute('aria-label','연속 색칠 칸 수 표시');
  enabled.onchange=()=>{setPref('filledRunCount',enabled.checked,true);limit.disabled=!enabled.checked;};
  const slider=E('input');slider.type='range';slider.min=2;slider.max=100;slider.step=1;
  slider.value=String(prefs.filledRunThreshold);slider.disabled=!prefs.filledRunCount;
  slider.setAttribute('aria-label','연속 칸 숫자 표시 기준');
  const value=E('output','nono-keys-hint',slider.value+'칸 초과');value.htmlFor='nono-run-threshold';
  slider.id='nono-run-threshold';
  const limit=slider;
  slider.oninput=()=>{value.textContent=slider.value+'칸 초과';setPref('filledRunThreshold',Number(slider.value),true);};
  controls.append(enabled,slider,value);row.append(controls);
  const illustration=E('button','nono-setting-visual','🖼 설명');
  illustration.type='button';illustration.setAttribute('aria-label',label+' 이미지로 설명보기');
  illustration.onclick=()=>openVisualGuides(key);row.append(illustration);body.append(row);
  continue;
 }
 let input;if(type==='color'){input=E('input');input.type='color';input.value=String(prefs[key]);input.oninput=()=>setPref(key,input.value,true);}else if(type==='bool'){input=E('input');input.type='checkbox';input.checked=!!prefs[key];input.onchange=()=>setPref(key,input.checked);}else if(type==='choice'){input=E('select');for(const item of choices){const p=String(item).split(':');const op=E('option',null,p.length>1?p.slice(1).join(':'):p[0]);op.value=p[0];input.append(op);}input.value=String(prefs[key]);input.onchange=()=>setPref(key,input.value);}else{input=E('input');input.type='range';input.min=choices[0];input.max=choices[1];input.step=choices[2];input.value=prefs[key];let val=E('span','nono-keys-hint',String(input.value));input.oninput=()=>{val.textContent=input.value;setPref(key,Number(input.value),true);};row.append(val);}input.setAttribute('aria-label',label);row.append(input);const illustration=E('button','nono-setting-visual','🖼 설명');illustration.type='button';illustration.setAttribute('aria-label',label+' 이미지로 설명보기');illustration.onclick=()=>openVisualGuides(key);row.append(illustration);body.append(row);}
if(tab===0){
 const panel=E('div');panel.innerHTML='<h3 style="font-size:15px;margin-top:18px">키 설정 · 기본키 / 보조키</h3><p class="nono-keys-hint">키를 클릭한 뒤 새 키를 누르세요. 다른 기능과 중복되면 경고만 표시합니다. Escape는 취소합니다.</p>';
 const grid=E('div');for(const action of Object.keys(standardKeys)){const row=E('div','nono-setting');row.append(E('label',null,shortcutNames[action]));shortcut(action).forEach((code,slot)=>{const b=E('button','nono-modal-btn',code?displayKey(code):'+ 키');b.onclick=()=>editBinding(action,slot,b);row.append(b)});const illustration=E('button','nono-setting-visual','🖼 설명');illustration.type='button';illustration.setAttribute('aria-label',shortcutNames[action]+' 이미지로 설명보기');illustration.onclick=()=>openVisualGuides('keyboard-'+action);row.append(illustration);grid.append(row)}panel.append(grid);body.append(panel);
}
if(tab===1){const b=E('button','nono-modal-btn','▦ HUD 편집 · 위치/크기/배경');b.style.marginTop='15px';b.onclick=()=>{if($('game').classList.contains('hidden')){toast('게임을 시작한 후 HUD 위치를 편집할 수 있어요.');return;}closeSettings();beginHudEdit();};body.append(b);}
if(tab===5){body.append(E('p','nono-keys-hint','멀티 커서·플레이어 이름·최근 입력은 현재 서버가 좌표 이벤트를 전송하지 않아 아직 적용되지 않습니다.'));}
}

/* Small illustrative diagrams are drawn from controls, not from solution screenshots. */
function guideIllustration(key,enabled){
 const sound=/^sound|Volume$|volume$|^feedback/.test(key);
 const accent=enabled?'#aeb2ff':'#566784';
 const base='<rect width="175" height="100" rx="10" fill="#101c33"/>';
 if(sound){
  const opacity=enabled?'1':'.24';
  let bars='';
  for(let i=0;i<5;i++)bars+='<rect x="'+(91+i*12)+'" y="'+(64-(i+1)*8)+'" width="7" height="'+((i+1)*8)+'" rx="3" fill="'+accent+'" opacity="'+opacity+'"/>';
  return '<svg viewBox="0 0 175 100" role="img" aria-label="소리 및 진동 수준 그림">'+base+
   '<path d="M29 40h16l21-18v55L45 60H29Z" fill="#d7e1ff"/>'+bars+
   (enabled?'<path d="M77 35q22 15 0 31 M84 28q35 23 0 46" stroke="#aeb2ff" stroke-width="3" fill="none"/>':'<path d="M24 18L79 79" stroke="#f0a0ba" stroke-width="3"/>')+'</svg>';
 }
 let body='';
 const x=29,y=23,step=11,focusR=2,focusC=4;
 if(enabled&&['rowHighlight','lastInput','color','multiplayerCursor','otherInput'].includes(key)){
  body+='<rect x="'+(x-2)+'" y="'+(y+step*focusR)+'" width="79" height="11" fill="#6477bc" opacity=".55"/>'+
   '<rect x="'+(x+step*focusC)+'" y="'+(y-2)+'" width="11" height="57" fill="#6477bc" opacity=".45"/>';
 }
 for(let row=0;row<5;row++)for(let col=0;col<7;col++){
  const focus=(row===focusR&&col===focusC);
  const marked=enabled&&((['hintCell','animation','completeLines','progress','toolFill'].includes(key)&&row===3&&col>=2&&col<=4)||focus);
  body+='<rect x="'+(x+step*col)+'" y="'+(y+step*row)+'" width="11" height="11" stroke="#526786" stroke-width=".75" fill="'+(marked?'#b5a2f3':'#1a2d48')+'"/>';
 }
 if(enabled&&['gridWidth','majorEvery','majorStrength'].includes(key)){
  body+='<path d="M84 23v55M29 67h77" stroke="#e3e4ff" stroke-width="2.5"/>';
 }
 if(enabled&&['bothClues','autoHintFade','altClueQuickFade','hintHud','pinnedClues','hintLine','hintExplanation','hintCell','lineNumbers'].includes(key)){
  body+='<text x="16" y="40" font-size="9" font-family="sans-serif" fill="'+accent+'">3</text>'+
   '<text x="16" y="60" font-size="9" font-family="sans-serif" fill="'+accent+'">2</text>'+
   '<text x="50" y="16" font-size="9" font-family="sans-serif" fill="'+accent+'">2</text>';
 }
 if(enabled&&key==='bothClues')body+='<text x="114" y="40" font-size="10" fill="#c8b5ff">3</text><text x="114" y="60" font-size="10" fill="#c8b5ff">2</text>';
 if(enabled&&key==='lineNumbers')body+='<text x="99" y="77" text-anchor="end" font-size="9" font-weight="bold" fill="#8bdeff">5</text>';
 if(enabled&&['altClueQuickFade','autoHintFade'].includes(key))body+='<rect x="13" y="30" width="10" height="20" fill="#15243a" opacity=".8"/><path d="M15 41h8" stroke="#a89bba"/>';
 if(enabled&&['hintHud','pinnedClues'].includes(key))body+='<rect x="15" y="83" width="95" height="11" rx="3" fill="#556ca0"/><text x="21" y="91" font-size="8" fill="#fff">3 2  ·  4 1</text>';
 if(enabled&&key==='minimap')body+='<rect x="128" y="15" width="33" height="33" rx="3" fill="#25395e" stroke="#8196dc"/><path d="M137 15v33M148 15v33M128 26h33M128 37h33" stroke="#6b85b4"/>';
 if(enabled&&['progress','overviewInfo','overviewSize','overviewPosition'].includes(key))body+='<rect x="20" y="84" width="88" height="8" rx="4" fill="#344c74"/><rect x="20" y="84" width="48" height="8" rx="4" fill="#9c8bfa"/>';
 if(enabled&&key==='showTimer')body+='<rect x="110" y="17" width="52" height="22" rx="5" fill="#415b81"/><text x="116" y="32" font-size="12" fill="#fff">01:25</text>';
 if(enabled&&['zoomWheel','zoomSpeed','overviewAnimated'].includes(key))body+='<circle cx="136" cy="58" r="16" fill="none" stroke="#c7c7ff" stroke-width="4"/><path d="m147 71 13 15" stroke="#c7c7ff" stroke-width="5"/>';
 if(enabled&&['errorMode','errorExact','errorStrength','errorDelay','errorStages'].includes(key))body+='<path d="M31 22h13v12H31Z" fill="#f07188"/><path d="M35 26l5 5m0-5-5 5" stroke="#fff"/>';
 if(enabled&&(['move','repeat','repeatWait','quick','wrap','follow','followSpeed','dragPolicy','focusEntry','pointerFollow'].includes(key)||key.startsWith('keyboard-')))body+='<path d="M130 47h32m-8-8 8 8-8 8" stroke="#c9b8ff" stroke-width="4" fill="none"/>';
 if(enabled&&['undoButtons','toolCross'].includes(key))body+='<path d="M126 45a17 17 0 1 1-4 19 M122 64l-3-10-9 8" stroke="#c9b8ff" stroke-width="4" fill="none"/>';
 if(enabled&&['multiplayerCursor','multiplayerNames'].includes(key))body+='<circle cx="130" cy="36" r="8" fill="#eaa1bf"/><text x="117" y="55" font-size="9" fill="#f5bbdf">친구</text>';
 if(key==='pointerFollow'){
  body+='<path d="M111 48L127 64l-2-11 10-5Z" fill="#fff" stroke="#7aa5d6" stroke-width="2"/>'+
   (enabled?'<rect x="73" y="45" width="11" height="11" stroke="#70ebff" stroke-width="3" fill="none"/>':
    '<rect x="73" y="45" width="11" height="11" stroke="#5d6b87" stroke-width=".8" fill="none"/>');
 }
 if(key==='dragPolicy'){
  body+='<path d="M37 57h11m11 0h11m11 0h11" fill="none" stroke="#eacb94" stroke-width="3"/>'+
   (enabled?'<path d="m83 48-7 9 7 9" fill="none" stroke="#9cf1fb" stroke-width="3"/>':'');
 }
 return '<svg viewBox="0 0 175 100" role="img" aria-label="노노그램 기능 적용 예시">'+base+body+'</svg>';
}
const approvedGuideImage={
 rowHighlight:'./assets/setting-guides/row-highlight.svg',
 pointerFollow:'./assets/setting-guides/pointer-follow.svg?v=approved-original-20261029',
 hintHud:'./assets/setting-guides/hint-hud.svg',
 filledRunCount:'./assets/setting-guides/filled-run.svg',
 dragHud:'./assets/setting-guides/drag-hud.svg'
};
function openVisualGuides(focusKey){
 const existing=$('nono-guide-overlay');if(existing){existing.remove();return;}
 const tab=Number(document.querySelector('.nono-settings-tabs .is-active')?.dataset.tab||0);
 const pane=E('div','nono-guide-overlay');pane.id='nono-guide-overlay';
 const dialog=E('section','nono-guide-dialog');dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');
 const header=E('div','nono-guide-head');
 const close=E('button','nono-modal-btn','×');close.type='button';close.setAttribute('aria-label','닫기');close.onclick=()=>pane.remove();
 header.append(close);dialog.append(header);
 const area=E('div','nono-guide-items');
 let list=schema[tab][1].map(([key,label,type,options,help])=>({key,label,type,options,help}));
 if(tab===0)for(const action of Object.keys(standardKeys))list.push({key:'keyboard-'+action,label:shortcutNames[action],type:'choice',help:'선택한 키를 눌러 단축키를 지정하며 기존 퍼즐 그림과 답은 바뀌지 않습니다.'});
 if(typeof focusKey==='string')list=list.filter(info=>info.key===focusKey);
 for(const info of list){
  const card=E('article','nono-guide-item');
  const imagePath=approvedGuideImage[info.key];
  if(!imagePath)card.append(E('h4',null,info.label),E('p',null,info.help));
  if(imagePath){
   const picture=E('img','nono-guide-approved-image');
   picture.src=imagePath;
   picture.alt=info.label+' 끄기와 켜기 비교 이미지';
   picture.loading='eager';
   picture.decoding='async';
   card.append(picture);
   area.append(card);
   continue;
  }
  const pair=E('div','nono-guide-pair');
  for(const isActive of [false,true]){
   const preview=E('div','nono-guide-sample');
   const optionLabel=(value)=>String(value??'').split(':').slice(-1)[0];
   const variants=info.type==='bool'?['OFF','ON']:
    info.type==='range'?[String(info.options?.[0]),String(info.options?.[1])]:
    info.type==='choice'?[optionLabel(info.options?.[0]),optionLabel(info.options?.at(-1))]:
    ['기본','변경'];
   preview.append(E('strong',null,variants[isActive?1:0]));
   const holder=E('div');
   holder.innerHTML=guideIllustration(info.key,isActive);
   preview.append(holder);pair.append(preview);
  }
  card.append(pair);area.append(card);
 }
 dialog.append(area);pane.append(dialog);document.body.append(pane);
 pane.addEventListener('click',event=>{if(event.target===pane)pane.remove()});
 pane.addEventListener('keydown',event=>{if(event.key==='Escape'){event.stopPropagation();pane.remove()}});
 close.focus();
}

function openSettings(){if(settingsOpen)return;settingsOpen=true;const overlay=E('div','nono-settings-overlay');overlay.id='nono-settings-overlay';overlay.innerHTML='<div class="nono-settings" role="dialog" aria-modal="true" aria-label="노노그램 설정"><div class="nono-settings-head"><div><h2>⚙ 노노그램 설정</h2><small>변경 즉시 적용 · 장치별 브라우저 저장 · '+(device==='touch'?'터치':'PC')+' 프로필</small></div><button class="nono-modal-btn" id="nono-settings-close">닫기</button></div><div class="nono-settings-tabs"></div><div class="nono-settings-content" id="nono-settings-content"></div><div class="nono-settings-foot"><span>※ (시험/보류) 옵션은 사용하면서 평가할 기능입니다.</span><button class="nono-modal-btn" id="nono-settings-default">현재 장치 설정 초기화</button></div></div>';document.body.append(overlay);
const tabs=overlay.querySelector('.nono-settings-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','설정 분류');schema.forEach(([title],i)=>{const b=E('button',i===0?'is-active':'',title);b.type='button';b.setAttribute('role','tab');b.setAttribute('aria-selected',String(i===0));b.dataset.tab=i;b.onclick=()=>{const prev=tabs.querySelector('.is-active');if(prev){prev.classList.remove('is-active');prev.setAttribute('aria-selected','false')}b.classList.add('is-active');b.setAttribute('aria-selected','true');b.scrollIntoView({block:'nearest',inline:'nearest'});drawSettings()};tabs.append(b)});
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
function notifyWrong(kind){if(puzzle.sizeTest){if(kind==='direct')toast('크기 테스트 퍼즐은 오답 검사를 제공하지 않습니다.');return;}const bad=wrongCells();if(!bad.length){if(kind==='direct')toast('현재 표시된 오답이 없어요.');return}let detail=kind==='direct'||kind==='immediate'||prefs.errorExact?'정확한 칸':kind==='line'?'행·열':'전체';if(!prefs.errorExact&&detail==='정확한 칸')detail='개수';toast('오답 '+bad.length+'개 · '+detail+' 알림');const until=performance.now()+1250;const cells=document.querySelectorAll('#board .cell');if(prefs.errorExact){for(const i of bad)cells[i]?.classList.add('nono-error');setTimeout(()=>bad.forEach(i=>cells[i]?.classList.remove('nono-error')),1200)}else if(kind==='line'){for(const i of bad){cells[i]?.classList.add('nono-error-line');setTimeout(()=>cells[i]?.classList.remove('nono-error-line'),1200)}}else{$('board').classList.add('nono-error');setTimeout(()=>$('board').classList.remove('nono-error'),800)}if(kind==='immediate')playSound('wrong');}
function scheduleWrong(){if(prefs.errorMode!=='delay')return;clearTimeout(autoTimer);const original=wrongCells().join(',');if(!original)return;autoTimer=setTimeout(()=>{if(wrongCells().join(',')!==original)return;notifyWrong('delayed');if(prefs.errorStages){setTimeout(()=>{if(wrongCells().join(',')===original)notifyWrong('line')},prefs.errorDelay*1000);if(prefs.errorExact)setTimeout(()=>{if(wrongCells().join(',')===original)notifyWrong('direct')},prefs.errorDelay*2000)}},prefs.errorDelay*1000);}
function hintsForLine(axis,i){return axis==='row'?puzzle.rows[i]:puzzle.cols[i]}
function lineValues(axis,i){const n=puzzle.size,len=axis==='row'?n:(puzzle.height||n);return Array.from({length:len},(_,j)=>axis==='row'?board[i*n+j]:board[j*n+i]);}
function lineSolved(axis,i){const bits=lineValues(axis,i);return lineHints(bits.map(v=>v==='1'?1:0)).join(',')===hintsForLine(axis,i).join(',')}
function canFade(axis,i,j){const values=lineValues(axis,i),clues=hintsForLine(axis,i);let segments=[],start=-1;for(let k=0;k<=values.length;k++){if(values[k]==='1'&&start<0)start=k;if(values[k]!=='1'&&start>=0){segments.push({start,len:k-start,end:k-1});start=-1}}const segment=segments[j];if(!segment||segment.len!==clues[j])return false;if(segment.start>0&&values[segment.start-1]!=='2')return false;if(segment.end<values.length-1&&values[segment.end+1]!=='2')return false;for(let k=0;k<segment.start;k++)if(values[k]==='0')return false;return segments.slice(0,j).every((seg,k)=>seg.len===clues[k]);}
function updateBoard(){if($('game').classList.contains('hidden'))return;const n=puzzle.size,h=puzzle.height||n,cells=$('board').querySelectorAll('.cell'),hi=String(prefs.majorEvery);$('board').style.setProperty('--nono-accent',prefs.color);$('board').style.setProperty('--nono-major',prefs.majorStrength==='strong'?'4px':prefs.majorStrength==='weak'?'2px':'3px');$('board').classList.toggle('nono-thin',prefs.gridWidth==='thin');$('board').classList.toggle('nono-thick',prefs.gridWidth==='thick');let ratio=board.filter(x=>x==='1').length,black=totalBlack(puzzle),progress=Math.min(100,Math.round(ratio/Math.max(1,black)*100));let hud= prefs.progress==='off'?'':prefs.progress==='percent'?progress+'%':prefs.progress==='cells'?ratio+'/'+black:progress+'% · '+ratio+'/'+black;
$('progress').textContent=hud;$('progress').style.display=prefs.progress==='off'?'none':'';
$('undo').style.display=prefs.undoButtons?'':'none';$('redo').style.display=prefs.undoButtons?'':'none';
$('nono-hint-action').style.display=(prefs.hintLine||prefs.hintExplanation||prefs.hintCell)?'':'none';
const hintGuide=document.querySelector('.board-caption');if(hintGuide)hintGuide.hidden=prefs.guide==='off';
cells.forEach((c,i)=>{const r=Math.floor(i/n),col=i%n;c.classList.toggle('nono-selected-row',false);c.classList.toggle('nono-done-line',!!prefs.completeLines&&(lineSolved('row',r)||lineSolved('col',col)));c.classList.toggle('nono-last',i===lastInput&&(prefs.lastInput==='always'||(prefs.lastInput!=='off'&&Date.now()-lastInputTime<Number(prefs.lastInput)*1000)));c.classList.toggle('nono-lines-bold',(col+1)%Number(hi)===0&&col<n-1);c.classList.toggle('nono-lines-bottom',(r+1)%Number(hi)===0&&r<h-1);
const atEdge=col===n-1&&prefs.lineNumbers&&(r+1)%Math.max(1,Number(prefs.lineInterval)||5)===0;
if(atEdge)c.dataset.rowCoordinate=String(r+1);else delete c.dataset.rowCoordinate;});
for(const axis of ['row','col']){const elems=$('board').querySelectorAll(axis==='row'?'#board > .row-clues:not(.nono-extra-row) .row-clue':'#board > .col-clues:not(.nono-extra-col) .col-clue');elems.forEach((el,i)=>{el.querySelectorAll('span').forEach((span,j)=>{const stored=(manualClues[puzzle.id]||{})[axis+':'+i+':'+j];span.classList.toggle('nono-fade-clue',stored===true||(stored!==false&&prefs.autoHintFade&&canFade(axis,i,j)));span.classList.toggle('nono-hint-target',hintMode&&hintAxis===axis&&hintIndex===i&&j===hintNumber);});});}
const hints='행 '+hintsForLine('row',Math.floor(selected/n)).join(' ')+' · 열 '+hintsForLine('col',selected%n).join(' ');
$('nono-hud').textContent=hints;
$('nono-hud').hidden=!hudEdit&&!(prefs.hintHud||prefs.pinnedClues||getHudConfig('hints').show===true)||getHudConfig('hints').show===false&&!hudEdit;
$('nono-drag-hud').textContent=dragCount>0?'드래그 '+dragCount+'칸':'드래그 칸 수';
$('nono-drag-hud').hidden=!hudEdit&&(!prefs.dragHud||dragCount===0)||getHudConfig('drag').show===false&&!hudEdit;
$('nono-hud').style.fontSize=prefs.hudSize==='large'?'16px':prefs.hudSize==='small'?'10px':'12px';
$('nono-hud').style.background=prefs.hudBg==='weak'?'#1b284866':prefs.hudBg==='strong'?'#111b33':'#1b2848db';
$('nono-hud').style.position=prefs.pinnedClues?'sticky':'';$('nono-hud').style.top=prefs.pinnedClues?'0':'';$('nono-hud').style.zIndex=prefs.pinnedClues?'30':'';
for(const key of ['hints','drag','progress'])applyHudConfig(key);
updateClueDecor();
updateHighlightOverlay(selected);
renderFilledRunCounts();
drawMinimap();
}


function getHudConfig(key){const config=(prefs.hudLayouts&&prefs.hudLayouts[key])||{};return key==='drag'?{...config,show:!!prefs.dragHud}:config}
function hudElement(key){return key==='hints'?$('nono-hud'):key==='drag'?$('nono-drag-hud'):$('progress').parentElement}
function applyHudConfig(key){
 const e=hudElement(key),c=getHudConfig(key);if(!e)return;
 if(c.size)e.style.fontSize=c.size==='large'?'18px':c.size==='small'?'11px':'14px';
 if(c.bg)e.style.background=c.bg==='weak'?'#14203a66':c.bg==='strong'?'#0b1124':'#1a2748df';
 if(c.x!=null&&c.y!=null){e.style.position='fixed';e.style.left=c.x+'px';e.style.top=c.y+'px';e.style.zIndex='150';}
 if(key==='progress'&&c.show===false&&!hudEdit)e.style.display='none';
 else if(key==='progress')e.style.display='';
}
function saveHudField(key,field,value){
 if(key==='drag'&&field==='show')prefs.dragHud=!!value;
 prefs.hudLayouts=prefs.hudLayouts||{};
 prefs.hudLayouts[key]=Object.assign({},prefs.hudLayouts[key]||{});
 prefs.hudLayouts[key][field]=value;persist();updateBoard();
}
function endHudEdit(){
 hudEdit=false;$('nono-hud-editor')?.remove();
 for(const key of ['hints','drag','progress']){const e=hudElement(key);e?.classList.remove('nono-hud-target');if(e){e.dataset.selected='false';if(e.__nonoHudMove){e.removeEventListener('pointerdown',e.__nonoHudMove);delete e.__nonoHudMove;delete e.dataset.nonoDragBound;}}}
 updateBoard();
}
function beginHudEdit(){
 if(hudEdit)return;hudEdit=true;hudSelected='hints';const bar=E('div','nono-hud-editor');bar.id='nono-hud-editor';
 const select=E('select');for(const [v,t] of [['hints','행·열 숫자'],['drag','드래그 칸 수'],['progress','진행도']]){const option=E('option',null,t);option.value=v;select.append(option)}select.onchange=()=>{hudSelected=select.value;bar.querySelectorAll('[data-selected]').forEach(el=>el.dataset.selected='false');hudElement(hudSelected).dataset.selected='true';sync()};
 const visibility=E('input');visibility.type='checkbox';visibility.onchange=()=>saveHudField(hudSelected,'show',visibility.checked);
 const size=E('select');for(const [v,t] of [['small','작게'],['normal','기본'],['large','크게']]){const option=E('option',null,t);option.value=v;size.append(option)}size.onchange=()=>saveHudField(hudSelected,'size',size.value);
 const bg=E('select');for(const [v,t] of [['weak','연하게'],['normal','기본'],['strong','진하게']]){const option=E('option',null,t);option.value=v;bg.append(option)}bg.onchange=()=>saveHudField(hudSelected,'bg',bg.value);
 const reset=E('button','nono-modal-btn','선택 HUD 초기화');reset.onclick=()=>{delete prefs.hudLayouts[hudSelected];persist();const el=hudElement(hudSelected);el.style.left='';el.style.top='';el.style.position='';updateBoard();sync();};
 const all=E('button','nono-modal-btn','전체 초기화');all.onclick=()=>{if(!confirm('모든 HUD 위치와 모양을 초기화할까요?'))return;prefs.hudLayouts={};persist();for(const key of ['hints','drag','progress']){const e=hudElement(key);e.style.left='';e.style.top='';e.style.position='';}updateBoard();sync();};
 const done=E('button','nono-modal-btn','✓ 편집 완료');done.onclick=endHudEdit;
 const labeled=(label,input)=>{const e=E('label');e.textContent=label+' ';e.append(input);return e};
 bar.append(labeled('대상',select),labeled('보이기',visibility),labeled('크기',size),labeled('배경',bg),reset,all,done);document.body.append(bar);
 function sync(){const c=getHudConfig(hudSelected);visibility.checked=c.show!==false;size.value=c.size||'normal';bg.value=c.bg||'normal';for(const key of ['hints','drag','progress'])hudElement(key).dataset.selected=key===hudSelected?'true':'false';}
 for(const key of ['hints','drag','progress']){const e=hudElement(key);e.classList.add('nono-hud-target');e.hidden=false;
  const move=(event)=>{
   if(!hudEdit)return;if(event.button!==0)return;const rect=e.getBoundingClientRect(),ox=event.clientX-rect.left,oy=event.clientY-rect.top;
   hudSelected=key;select.value=key;sync();e.setPointerCapture(event.pointerId);
   const dragging=(ev)=>{const x=Math.max(0,Math.min(window.innerWidth-60,ev.clientX-ox)),y=Math.max(0,Math.min(window.innerHeight-32,ev.clientY-oy));e.style.position='fixed';e.style.left=x+'px';e.style.top=y+'px';e.style.zIndex='10050';};
   const stop=(ev)=>{e.removeEventListener('pointermove',dragging);e.removeEventListener('pointerup',stop);saveHudField(key,'x',parseFloat(e.style.left));saveHudField(key,'y',parseFloat(e.style.top));};
   e.addEventListener('pointermove',dragging);e.addEventListener('pointerup',stop,{once:true});
  };
  if(!e.dataset.nonoDragBound){e.addEventListener('pointerdown',move);e.__nonoHudMove=move;e.dataset.nonoDragBound='1';}
 }
 updateBoard();sync();
}
function renderFilledRunCounts(){
 const cells=$('board').querySelector('.cells');
 if(!cells)return;
 let layer=cells.querySelector('.nono-run-labels');
 if(!prefs.filledRunCount){layer?.remove();return;}
 if(!layer){layer=E('div','nono-run-labels');layer.setAttribute('aria-hidden','true');cells.append(layer);}
 layer.replaceChildren();
 const n=puzzle.size,h=puzzle.height||n,threshold=Math.max(1,Number(prefs.filledRunThreshold)||10);
 const cellPx=parseFloat($('board').dataset.fitCellSize)||parseFloat($('board').style.getPropertyValue('--cell-size'))||41;
 const font=Math.max(4,Math.min(14,cellPx*.72));
 const add=(axis,line,start,length)=>{
  if(length<=threshold)return;
  const half=start+(length-1)/2;
  const x=axis==='row'?half+.5:line+.5,y=axis==='row'?line+.5:half+.5;
  const label=E('span','nono-run-number',String(length));
  label.dataset.axis=axis;label.style.left=(x*cellPx).toFixed(2)+'px';
  label.style.top=((y+(axis==='row'?.15:-.17))*cellPx).toFixed(2)+'px';
  label.style.fontSize=font.toFixed(1)+'px';
  layer.append(label);
 };
 for(const axis of ['row','col'])for(let line=0;line<(axis==='row'?h:n);line++){
  let begin=-1;
  const length=axis==='row'?n:h;
  for(let i=0;i<=length;i++){
   const at=axis==='row'?line*n+i:i*n+line;
   const painted=i<length&&board[at]==='1';
   if(painted&&begin<0)begin=i;
   if(!painted&&begin>=0){add(axis,line,begin,i-begin);begin=-1;}
  }
 }
}

function updateClueDecor(){
 const target=$('board'),n=puzzle.size,h=puzzle.height||n;
 target.classList.toggle('nono-both',!!prefs.bothClues);
 target.querySelector('.nono-extra-row')?.remove();target.querySelector('.nono-extra-col')?.remove();
 const r=target.querySelector('.row-clues'),c=target.querySelector('.col-clues');
 if(!r||!c)return;
 r.querySelectorAll('.row-clue').forEach((el,i)=>{el.classList.toggle('nono-clue-major',(i+1)%Number(prefs.majorEvery)===0&&i<h-1);el.classList.toggle('nono-clue-index',false);el.dataset.lineNumber=(i+1)%prefs.lineInterval===0?String(i+1):'';});
 c.querySelectorAll('.col-clue').forEach((el,i)=>{el.classList.toggle('nono-clue-major',(i+1)%Number(prefs.majorEvery)===0&&i<n-1);el.classList.toggle('nono-clue-index',false);el.dataset.lineNumber=(i+1)%prefs.lineInterval===0?String(i+1):'';});
 if(prefs.bothClues){const rc=r.cloneNode(true),cc=c.cloneNode(true);rc.classList.add('nono-extra-row');cc.classList.add('nono-extra-col');target.append(rc,cc);}
  if(altClueSelection){
    const region=altClueSelection.side==='right'?target.querySelector('.nono-extra-row'):r;
    const clue=region?.children[altClueSelection.line]?.querySelectorAll('span')[altClueSelection.number];
    clue?.classList.add('nono-alt-hint-target');
  }
}

let fitRequest=0,boardZoom=1;
function setBoardZoom(delta){
 // The largest permitted size is the fully visible one: no hidden cells or internal scroll.
 boardZoom=Math.max(.4,Math.min(3,Math.round((boardZoom+delta)*10)/10));
 scheduleBoardFit();
}
function centerBoard(){
 const area=document.querySelector('#game .board-scroll'),grid=$('board');
 if(!area||!grid||$('game').classList.contains('hidden'))return;
 area.scrollLeft=0;area.scrollTop=0;grid.style.margin='auto';
 window.scrollTo({left:0,top:0,behavior:'instant'});
}
function scheduleBoardFit(){
 if($('game').classList.contains('hidden')||fitRequest)return;
 fitRequest=requestAnimationFrame(()=>{fitRequest=0;fitBoardToViewport()});
}
function fitBoardToViewport(){
 if($('game').classList.contains('hidden'))return;
 const grid=$('board'),area=document.querySelector('#game .board-scroll'),card=document.querySelector('#game .board-card');
 if(!grid||!area||!card)return;
 const n=puzzle.size,h=puzzle.height||n,isLarge=Math.max(n,h)>=30;
 document.body.classList.toggle('nono-fit-playing',isLarge);
 document.body.classList.toggle('nono-zoom-exceeded',isLarge&&boardZoom>1.000001);
 grid.classList.add('nono-board-fit');
 const maxRow=Math.max(1,...puzzle.rows.map(a=>a.length));
 const maxCol=Math.max(1,...puzzle.cols.map(a=>a.length));
 const maxNumber=Math.max(1,...puzzle.rows.flat(),...puzzle.cols.flat());
 const digits=String(maxNumber).length,sides=prefs.bothClues?2:1;
 const css=getComputedStyle(area),padW=parseFloat(css.paddingLeft)+parseFloat(css.paddingRight);
 const padH=parseFloat(css.paddingTop)+parseFloat(css.paddingBottom);
 // Fullscreen board gets 100% of the viewport; toolbars float in the side gutters.
 // Use visualViewport when available so browser zoom/resizing is reflected.
 const viewportW=window.visualViewport?.width||window.innerWidth;
 const viewportH=window.visualViewport?.height||window.innerHeight;
 // A landscape control deck sits to the left, a portrait deck sits below.
 const touchDock=document.body.classList.contains('nono-touch-pad-visible');
 const sideDock=touchDock&&window.matchMedia('(max-height:470px) and (orientation:landscape) and (pointer:coarse)').matches;
 const availW=Math.max(30,viewportW-padW-(sideDock?235:0)-2);
 let reservedControls=touchDock&&!sideDock?178:0;
 if(reservedControls){
  const controls=['#nono-mobile-pad .nono-dpad','#nono-mobile-pad .nono-pad-actions','#nono-floating-zone']
    .map(selector=>document.querySelector(selector))
    .filter(el=>el&&getComputedStyle(el).display!=='none');
  for(const el of controls){
    const top=el.getBoundingClientRect().top;
    if(Number.isFinite(top))reservedControls=Math.max(reservedControls,Math.ceil(viewportH-top+5));
  }
  reservedControls=Math.min(Math.max(0,viewportH-120),reservedControls);
 }
 document.documentElement.style.setProperty('--nono-mobile-pad-reserve',reservedControls+'px');
 const availH=Math.max(30,viewportH-padH-reservedControls-2);
 const cap=n<=5?60:n<=10?41:n<=25?34:26;
 function dimensions(cell){
  const font=Math.max(2.8,Math.min(14,cell*.69));
  const slotWidth=Math.max(3.5,Math.min(24,font*(digits===3?1.95:digits===2?1.38:1.05)+1));
  const slotHeight=Math.max(3.5,Math.min(22,cell*.90,font+1));
  return {font,slotWidth,slotHeight,rowWidth:maxRow*slotWidth+10,colHeight:maxCol*slotHeight+10};
 }
 let low=.5,high=cap;
 for(let k=0;k<35;k++){
  const mid=(low+high)/2,d=dimensions(mid);
  if(n*mid+d.rowWidth*sides+4<=availW&&h*mid+d.colHeight*sides+4<=availH)low=mid;
  else high=mid;
 }
 const fit=Math.max(.5,low),cell=fit*boardZoom,d=dimensions(cell);
 const renderedWidth=n*cell+d.rowWidth*sides+8;
 const renderedHeight=h*cell+d.colHeight*sides+8;
 const pageWidth=boardZoom<=1?Math.ceil(viewportW):Math.ceil(Math.max(viewportW,renderedWidth+4));
 const pageHeight=boardZoom<=1?Math.ceil(viewportH):Math.ceil(Math.max(viewportH,renderedHeight+4));
 // Scroll the DOCUMENT, never the puzzle container.
 // Keep fit centered and allow extra-zoom content to extend the document.
 if(isLarge){
  const game=$('game');
  game.style.setProperty('--nono-page-width',pageWidth+'px');
  game.style.setProperty('--nono-page-height',pageHeight+'px');
 }
 area.classList.remove('nono-zoomed');
 area.style.setProperty('--nono-fit-scroller-height',availH.toFixed(2)+'px');
 area.style.removeProperty('--nono-visible-board-height');
 const props={
  '--cell-size':cell.toFixed(3)+'px',
  '--nono-fit-size':String(n),
  '--nono-fit-height':String(h),
  '--nono-fit-grid-width':(cell*n).toFixed(3)+'px',
  '--nono-fit-grid-height':(cell*h).toFixed(3)+'px',
  '--nono-fit-item-width':d.slotWidth.toFixed(3)+'px',
  '--nono-fit-line-height':d.slotHeight.toFixed(3)+'px',
  '--nono-fit-font':d.font.toFixed(3)+'px',
  '--nono-fit-row-width':d.rowWidth.toFixed(3)+'px',
  '--nono-fit-col-height':d.colHeight.toFixed(3)+'px'
 };
 for(const [key,value] of Object.entries(props))grid.style.setProperty(key,value,'important');
 grid.dataset.fitCellSize=cell.toFixed(2);
 grid.dataset.fitMax=fit.toFixed(2);
 updateHighlightOverlay(selected);
 renderFilledRunCounts();
 $('nono-zoom-label').textContent=boardZoom===1?'맞춤':Math.round(boardZoom*100)+'%';
 $('nono-zoom-fit').disabled=false;
 $('nono-zoom-out').disabled=boardZoom<=.4;
 $('nono-zoom-in').disabled=boardZoom>=3;
 if(isLarge)centerBoard();
}
function apply(){const timer=document.querySelector('.timer-stat');if(timer)timer.style.display=prefs.showTimer?'':'none';document.body.dataset.errorIntensity=prefs.errorStrength;document.documentElement.style.setProperty('--nono-accent',prefs.color);document.getElementById('nono-minimap').hidden=!prefs.minimap||overviewOpen||$('game').classList.contains('hidden');updateBoard();scheduleBoardFit();}
function drawMinimap(){const e=document.getElementById('nono-minimap');if(!e||!prefs.minimap||overviewOpen||$('game').classList.contains('hidden'))return;const n=puzzle.size,h=puzzle.height||n;e.innerHTML='<b style="font-size:11px">미니맵 · '+n+'×'+h+'</b>';const g=E('div','nono-minimap-grid');g.style.aspectRatio=n+' / '+h;g.style.gridTemplateColumns='repeat('+n+',1fr)';board.forEach(v=>{const i=E('i',v==='1'?'is-filled':v==='2'?'is-cross':'');g.append(i)});e.append(g);}
function openOverview(){
 if($('game').classList.contains('hidden'))return;
 overviewOpen=true;
 const modal=$('nono-overview');
 modal.hidden=false;modal.dataset.position=prefs.overviewPosition;modal.dataset.size=prefs.overviewSize;
 // A completed puzzle is a clean answer picture: never display only some X marks.
 // The underlying player's X/empty marks remain unchanged for saved history.
 const completed=!!finished;
 modal.querySelector('.nono-options strong').textContent=completed?'전체보기 · 완성된 퍼즐':'전체보기 · 현재 입력';
 const n=puzzle.size,filled=board.filter(v=>v==='1').length,black=totalBlack(puzzle),pr=Math.round(filled/Math.max(1,black)*100);
 $('nono-overview-info').textContent=prefs.overviewInfo==='off'?'':prefs.overviewInfo==='percent'?pr+'%':prefs.overviewInfo==='filled'?filled+'칸':prefs.overviewInfo==='remaining'?Math.max(0,black-filled)+'칸':'진행 '+pr+'% · 칠함 '+filled+'칸 · 남음 '+Math.max(0,black-filled)+'칸';
 const g=$('nono-overview-grid');
 g.replaceChildren();
 g.style.gridTemplateColumns='repeat('+n+',minmax(0,1fr))';
 g.style.gridTemplateRows='repeat('+(puzzle.height||n)+',minmax(0,1fr))';g.style.aspectRatio=n+' / '+(puzzle.height||n);
 board.forEach(v=>{g.append(E('i',v==='1'?'is-filled':'',!completed&&v==='2'?'×':''))});
 apply();
}
function closeOverview(){overviewOpen=false;$('nono-overview').hidden=true;apply();}
function enumerateLine(hints,values){const n=values.length,states=[],out=[];function go(i,at){if(i===hints.length){const row=Array(n).fill('2');for(const [start,end] of states)for(let k=start;k<end;k++)row[k]='1';if(row.every((v,k)=>values[k]==='0'||values[k]===v))out.push(row);return}const remaining=hints.slice(i+1).reduce((s,v)=>s+v+1,0);for(let start=at;start<=n-hints[i]-remaining;start++){states.push([start,start+hints[i]]);go(i+1,start+hints[i]+1);states.pop();if(out.length>30000)return}}go(0,0);return out}
function logicHint(){if(puzzle.sizeTest){toast('크기 테스트 퍼즐은 풀이 힌트를 제공하지 않습니다.');return;}hintStage++;let found=null;for(let axis of ['row','col']){for(let i=0;i<(axis==='row'?(puzzle.height||puzzle.size):puzzle.size);i++){const values=lineValues(axis,i),poss=enumerateLine(hintsForLine(axis,i),values);if(!poss.length)continue;for(let j=0;j<values.length;j++){if(values[j]!=='0')continue;const v=poss[0][j];if(poss.every(line=>line[j]===v)){found={axis,i,j,v,count:poss.length};break}}if(found)break}if(found)break}if(!found){toast('현재 논리적으로 확실한 칸이 없어요.');return;}
const phase=[];if(prefs.hintLine)phase.push('line');if(prefs.hintExplanation)phase.push('explain');if(prefs.hintCell)phase.push('cell');if(!phase.length)return;const step=phase[(hintStage-1)%phase.length];helpTarget=found.axis==='row'?found.i*puzzle.size+found.j:found.j*puzzle.size+found.i;helpLine=found;const text=step==='line'?(found.axis==='row'?'행 ':'열 ')+(found.i+1)+'번에 확실한 칸이 있어요.':step==='explain'?'힌트 숫자를 놓는 가능한 '+found.count+'가지 배치 모두에 공통되는 칸이 있어요.':(found.v==='1'?'채울':'X 표시할')+' 수 있는 확실한 칸을 강조했어요.';toast(text);$('nono-hint-status').textContent=text;if(step==='cell'){document.querySelectorAll('#board .cell')[helpTarget]?.classList.add('nono-highlight-now');setTimeout(()=>document.querySelectorAll('#board .cell')[helpTarget]?.classList.remove('nono-highlight-now'),4500)}playSound('hint');}
function moveSelection(dir,quick){
 const n=puzzle.size,h=puzzle.height||n,r=Math.floor(selected/n),c=selected%n,delta=quick?5:1;
 let row=r,col=c;
 if(dir==='up')row-=delta;else if(dir==='down')row+=delta;
 else if(dir==='left')col-=delta;else col+=delta;
 row=prefs.wrap?(row+h*5)%h:Math.max(0,Math.min(h-1,row));
 col=prefs.wrap?(col+n*5)%n:Math.max(0,Math.min(n-1,col));
 selected=row*n+col;
 render();
 keepSelectionInsideBoard($('board').querySelectorAll('.cell')[selected]);
}
function keepSelectionInsideBoard(cell){
 if(!cell)return;
 const scroller=cell.closest('.board-scroll');
 if(!scroller)return;
 const style=getComputedStyle(scroller);
 const canX=/auto|scroll/.test(style.overflowX)&&scroller.scrollWidth>scroller.clientWidth+1;
 const canY=/auto|scroll/.test(style.overflowY)&&scroller.scrollHeight>scroller.clientHeight+1;
 if(!canX&&!canY)return; // A fitted puzzle must never scroll the entire page.
 const frame=scroller.getBoundingClientRect(),rect=cell.getBoundingClientRect();
 let left=scroller.scrollLeft,top=scroller.scrollTop;
 if(prefs.follow==='center'){
  if(canX)left+=rect.left+rect.width/2-(frame.left+frame.width/2);
  if(canY)top+=rect.top+rect.height/2-(frame.top+frame.height/2);
 }else{
  if(canX){if(rect.left<frame.left)left+=rect.left-frame.left;else if(rect.right>frame.right)left+=rect.right-frame.right;}
  if(canY){if(rect.top<frame.top)top+=rect.top-frame.top;else if(rect.bottom>frame.bottom)top+=rect.bottom-frame.bottom;}
 }
 if(Math.abs(left-scroller.scrollLeft)>.5||Math.abs(top-scroller.scrollTop)>.5)
  scroller.scrollTo({left,top,behavior:prefs.followSpeed==='fast'?'instant':'smooth'});
}

const standardKeys={
 up:['ArrowUp',''],down:['ArrowDown',''],left:['ArrowLeft',''],right:['ArrowRight',''],
 fill:['Space',''],cross:['KeyX',''],clear:['Backspace','Delete'],
 undo:['Comma',''],redo:['Period',''],hint:['KeyH',''],overview:['Tab',''],
 toolFill:['Digit1',''],toolCross:['Digit2','']
};
const shortcutNames={up:'위로 이동',down:'아래로 이동',left:'왼쪽 이동',right:'오른쪽 이동',
 fill:'칸 칠하기',cross:'X 표시',clear:'칸 지우기',undo:'되돌리기',redo:'다시 실행',hint:'힌트 선택 모드',overview:'전체보기',toolFill:'칠하기 도구',toolCross:'X 도구'};
let bindingCapture=null,moveHeld='',moveDirection=null,moveQuick=false,movePhase='idle',moveTimer=null,moveWait=null;
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
function moveOne(dir,fast){moveSelection(dir,fast);if(keyboardDrag){paint(selected,keyboardDrag.to,true);keyboardDrag.steps++;}}
function stopMoveRepeat(){
 if(moveTimer!==null)clearInterval(moveTimer);
 if(moveWait!==null)clearTimeout(moveWait);
 moveTimer=null;moveWait=null;
}
function releaseMove(){
 stopMoveRepeat();
 moveHeld='';moveDirection=null;moveQuick=false;movePhase='idle';
}
function beginMove(code,dir,quick){
 if(moveHeld===code)return;
 releaseMove();
 moveHeld=code;moveDirection=dir;moveQuick=quick;movePhase='pending';
 moveOne(dir,quick);
 const delay={short:170,normal:330,long:550}[prefs.repeatWait]||330;
 const speed={slow:165,normal:85,fast:45}[prefs.repeat]||85;
 moveWait=setTimeout(()=>{
  moveWait=null;
  if(moveHeld!==code||movePhase!=='pending')return;
  movePhase='repeating';
  moveTimer=setInterval(()=>{if(moveHeld===code&&movePhase==='repeating')moveOne(dir,quick)},speed);
 },delay);
}
function beginAltClue(direction){
  if(direction==='right'&&!prefs.bothClues)return;
  const line=Math.floor(selected/puzzle.size),side=direction==='left'?'left':'right',len=hintsForLine('row',line).length;
  let number=direction==='left'?len-1:0;
  if(altClueSelection&&altClueSelection.line===line&&altClueSelection.side===side){
    number=(altClueSelection.number+(direction==='left'?-1:1)+len)%len;
  }
  altClueSelection={axis:'row',line,number,side};
  updateBoard();
}
function commitAltClue(){
  if(!altClueSelection)return;
  const {axis,line,number}=altClueSelection;
  const key=axis+':'+line+':'+number;
  manualClues[puzzle.id]=manualClues[puzzle.id]||{};
  manualClues[puzzle.id][key]=!manualClues[puzzle.id][key];
  altClueSelection=null;
  saveBoard();render();
}
function keyDown(e){if(settingsOpen||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;const key=e.key.toLowerCase(),ctrl=e.ctrlKey||e.metaKey;if(overviewOpen){if(key==='tab'||key==='escape'){e.preventDefault();e.stopImmediatePropagation();closeOverview()}return}
if($('game').classList.contains('hidden')||!$('lobby').classList.contains('hidden'))return;
if(matches('overview',e)||matches('hint',e)){e.preventDefault();e.stopImmediatePropagation();if(matches('overview',e)){openOverview()}else{hintMode=!hintMode;hintIndex=hintMode?Math.floor(selected/puzzle.size):0;hintAxis='row';hintNumber=0;toast(hintMode?'힌트 선택: 방향키로 숫자 선택 · Space 흐림/복원 · H 복귀':'셀 이동 모드');render()}return}
if(!hintMode&&prefs.altClueQuickFade&&e.altKey&&!ctrl&&(matches('left',e)||matches('right',e))){
  e.preventDefault();e.stopImmediatePropagation();
  if(!e.repeat||altClueSelection)beginAltClue(matches('left',e)?'left':'right');
  return;
 }
 if(hintMode){if(key===' '||key==='spacebar'){e.preventDefault();e.stopImmediatePropagation();const k=hintAxis+':'+hintIndex+':'+hintNumber;manualClues[puzzle.id]=manualClues[puzzle.id]||{};manualClues[puzzle.id][k]=!manualClues[puzzle.id][k];saveBoard();render();return}if(key.startsWith('arrow')){e.preventDefault();e.stopImmediatePropagation();if(key==='arrowleft'||key==='arrowright'){hintNumber=(hintNumber+(key==='arrowright'?1:-1)+hintsForLine(hintAxis,hintIndex).length)%hintsForLine(hintAxis,hintIndex).length;}else{hintIndex=(hintIndex+(key==='arrowdown'?1:-1)+(hintAxis==='row'?(puzzle.height||puzzle.size):puzzle.size))%(hintAxis==='row'?(puzzle.height||puzzle.size):puzzle.size);hintNumber=0;}if(e.shiftKey){hintAxis=hintAxis==='row'?'col':'row';hintNumber=0;}render();return}}
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
  // Holding Space/X must not toggle a cell repeatedly on native key-repeat.
  if(e.repeat)return;
  if(moveHeld){
   if(movePhase==='pending'){
    // Before auto-repeat begins, mark this cell and stop the pending repeat.
    stopMoveRepeat();
    movePhase='manual';
   }else if(movePhase==='manual'){
    // A fresh Space/X press advances one square when the initial repeat was canceled.
    moveSelection(moveDirection,moveQuick);
   }
   // Once auto-repeat has begun, keep it running; moveOne paints every new cell
   // only while Space/X is held (keyboardDrag is cleared on keyup).
  }
  if(keyboardDrag&&keyboardDrag.to!==to){squashHistory(keyboardDrag.first);keyboardDrag=null;}
  if(!keyboardDrag)keyboardDrag={to,first:undoStack.length,steps:1};
  paint(selected,to,movePhase==='repeating');return;
 }
}
function endKeyboard(e){
 if((e.key==='Alt'||e.code==='AltLeft'||e.code==='AltRight')&&altClueSelection){
  e.preventDefault();e.stopImmediatePropagation();commitAltClue();
 }
 if(e.code===moveHeld)releaseMove();if(!keyboardDrag)return;if((keyboardDrag.to==='1'&&matches('fill',e))||(keyboardDrag.to==='2'&&matches('cross',e))||(keyboardDrag.to==='0'&&matches('clear',e))){squashHistory(keyboardDrag.first);keyboardDrag=null;render();}}
function squashHistory(first){
 if(!['practice','record'].includes(mode)||undoStack.length<=first+1)return;
 const actions=undoStack.splice(first);
 const merged=new Map();
 for(const action of actions)for(const [index,before,after] of action.cells){
  const previous=merged.get(index);
  if(previous)previous[2]=after;
  else merged.set(index,[index,before,after]);
 }
 const firstAction=actions[0],lastAction=actions[actions.length-1];
 undoStack.push({cells:[...merged.values()].filter(([,before,after])=>before!==after),
  beforeChanges:firstAction.beforeChanges,afterChanges:lastAction.afterChanges,
  beforeSelected:firstAction.beforeSelected,afterSelected:lastAction.afterSelected});
 saveBoard();
}

/* High-performance stroke handling. The original per-cell render() and updateBoard()
   crossed 10,000 cells on every mouse event. Here a stroke updates only changed DOM
   cells and selected lines, then commits one changed-cell delta + one full render on release.
   The path is freeform: it is not locked to the first row or column. */
function updateHighlightOverlay(index){
 const grid=$('board'),region=grid.querySelector('.cells');
 if(!region||!puzzle)return;
 const n=puzzle.size;
 const cellSize=parseFloat(grid.dataset.fitCellSize)||parseFloat(grid.style.getPropertyValue('--cell-size'))||41;
 region.classList.toggle('nono-hover-lines',!!prefs.rowHighlight);
 region.style.setProperty('--nono-hover-row-y',(Math.floor(index/n)*cellSize).toFixed(2)+'px');
 region.style.setProperty('--nono-hover-col-x',((index%n)*cellSize).toFixed(2)+'px');
}
function updateLiveSelection(next,cells){
 const previous=selected;
 if(next===previous)return;
 // Constant-time DOM update. No per-row/per-column classList loops.
 cells[previous]?.classList.remove('active');
 cells[previous]?.setAttribute('aria-selected','false');
 selected=next;
 cells[next]?.classList.add('active');
 cells[next]?.setAttribute('aria-selected','true');
 updateHighlightOverlay(next);
 const hud=$('nono-hud');
 if(hud)hud.textContent='행 '+hintsForLine('row',Math.floor(next/puzzle.size)).join(' ')+' · 열 '+hintsForLine('col',next%puzzle.size).join(' ');
}
function startFastDrag(e,index){
 if(fastDrag||startingAlone||finished||finishing||!board||
  $('game').classList.contains('hidden')||$('play-area').classList.contains('hidden'))return;
 if(mode==='race'&&(startingRace||meta?.status!=='playing'))return;
 const cells=$('board').querySelector('.cells')?.children;
 if(!cells)return;
 const original=board.slice(),to=e.button===2?'2':tool;
 const value=original[index]===to&&to!=='0'?'0':to;
 const initialChanges=changes,initialSelected=selected;
 const history=['practice','record'].includes(mode);
 const n=puzzle.size,rect=$('board').querySelector('.cells').getBoundingClientRect();
 fastDrag={id:e.pointerId,cells,initial:original,target:value,
  start:index,axis:null,end:index%n,row:Math.floor(index/n),col:index%n,
  startX:e.clientX,startY:e.clientY,originX:e.clientX,originY:e.clientY,
  rect:{left:rect.left,top:rect.top,width:rect.width,height:rect.height},
  touched:new Set(),replayChanges:[],filled:original.filter(v=>v==='1').length,
  history,count:1,hasExtended:false,initialChanges,initialSelected};
 pointerDown=false;dragCount=1;lastInput=-1;
 setFastDragValue(index,value);
 updateLiveSelection(index,cells);
 syncFastDragProgress();
 setLiveDragHudPosition(e);
 try{$('board').setPointerCapture(e.pointerId);}catch{}
}
function setFastDragValue(index,value){
 const d=fastDrag;if(!d)return;
 const prev=board[index];if(prev===value)return;
 if(prev==='1')d.filled--;
 if(value==='1')d.filled++;
 board[index]=value;d.touched.add(index);
 d.replayChanges.push([index,Number(prev),Number(value)]);
 const cell=d.cells[index];if(cell){
  cell.classList.toggle('filled',value==='1');
  cell.classList.toggle('cross',value==='2');
  cell.textContent=value==='2'?'×':'';
 }
}
function setLiveDragHudPosition(event){
 const hud=$('nono-drag-hud');
 if(!hud||!event)return;
 const stored=getHudConfig('drag');
 if(stored.x!=null&&stored.y!=null){
  hud.style.setProperty('--drag-live-x',Math.max(0,Math.min(innerWidth-70,Number(stored.x)))+'px');
  hud.style.setProperty('--drag-live-y',Math.max(0,Math.min(innerHeight-42,Number(stored.y)))+'px');
  return;
 }
 // Floating label tracks the actual pointer rather than staying behind the side controls.
 hud.style.setProperty('--drag-live-x',Math.round(Math.min(innerWidth-90,Math.max(8,event.clientX+19)))+'px');
 hud.style.setProperty('--drag-live-y',Math.round(Math.min(innerHeight-40,Math.max(8,event.clientY-43)))+'px');
}
function syncFastDragProgress(){
 const d=fastDrag;if(!d)return;
 dragCount=d.count;
 const nBlack=Math.max(1,totalBlack(puzzle));
 const percent=Math.min(100,Math.round(d.filled/nBlack));
 const display=prefs.progress==='off'?'':prefs.progress==='percent'?percent+'%':
  prefs.progress==='cells'?d.filled+'/'+nBlack:percent+'% · '+d.filled+'/'+nBlack;
 $('progress').textContent=display;
 const hud=$('nono-drag-hud');
 if(hud){
  const allow=!!prefs.dragHud&&getHudConfig('drag').show!==false;
  hud.textContent=dragCount+'칸';
  hud.hidden=!allow;
  hud.classList.toggle('nono-drag-active',allow);
  hud.setAttribute('aria-label','드래그한 칸 '+dragCount+'개');
}
}
function updateFastDragEndpoint(nextCoord){
 const d=fastDrag;if(!d||!d.axis)return;
 const n=puzzle.size,start=d.axis==='row'?d.col:d.row,previous=d.end;
 const lo=Math.min(start,nextCoord),hi=Math.max(start,nextCoord);
 const oldLo=Math.min(start,previous),oldHi=Math.max(start,previous);
 for(let coord=Math.min(lo,oldLo);coord<=Math.max(hi,oldHi);coord++){
  const at=d.axis==='row'?d.row*n+coord:coord*n+d.col;
  const inStroke=coord>=lo&&coord<=hi;
  const value=inStroke&&(prefs.dragPolicy!=='skip'||d.initial[at]==='0'||at===d.start)?
   d.target:d.initial[at];
  setFastDragValue(at,value);
 }
 d.end=nextCoord;d.count=Math.abs(nextCoord-start)+1;
 const current=d.axis==='row'?d.row*n+nextCoord:nextCoord*n+d.col;
 updateLiveSelection(current,d.cells);
 syncFastDragProgress();
}
function moveFastDrag(e){
 const d=fastDrag;if(!d||e.pointerId!==d.id)return;
 setLiveDragHudPosition(e);
 if(e.pointerType==='mouse'&&!(e.buttons&3)){endFastDrag();return;}
 const n=puzzle.size,dx=e.clientX-d.startX,dy=e.clientY-d.startY;
 if(!d.axis){
  const threshold=Math.max(2,Math.min(7,d.rect.width/n*.36));
  if(Math.max(Math.abs(dx),Math.abs(dy))<threshold)return;
  d.axis=Math.abs(dx)>=Math.abs(dy)?'row':'col';
  d.end=d.axis==='row'?d.col:d.row;
 }
 // The pointer may leave the original row/column and even the board.
 // Only its projection onto the locked axis matters.
 const raw=d.axis==='row'?
  (e.clientX-d.rect.left)/(d.rect.width/n):
  (e.clientY-d.rect.top)/(d.rect.height/(puzzle.height||n));
 const end=Math.max(0,Math.min((d.axis==='row'?n:(puzzle.height||n))-1,Math.floor(raw)));
 const originCoord=d.axis==='row'?d.col:d.row;
 if(end!==d.end){
  updateFastDragEndpoint(end);
  if(end!==originCoord)d.hasExtended=true;
 }
 const nearOrigin=Math.abs(e.clientX-d.originX)<=d.rect.width/n*.55 &&
  Math.abs(e.clientY-d.originY)<=d.rect.height/n*.55;
 // The pointer may have reached the original column while still far from the
 // starting CELL. Release the lock when it later physically enters that cell.
 // Check on EVERY move, including moves where the projected endpoint is unchanged.
 if(end===originCoord&&d.hasExtended&&nearOrigin){
  d.axis=null;d.startX=e.clientX;d.startY=e.clientY;d.hasExtended=false;
 }
}
function endFastDrag(e){
 const d=fastDrag;if(!d||e&&e.pointerId!==d.id)return;
 fastDrag=null;pointerDown=false;dragCount=0;
 const dragHud=$('nono-drag-hud');
 if(dragHud){dragHud.hidden=true;dragHud.classList.remove('nono-drag-active');}
 try{if($('board').hasPointerCapture(d.id))$('board').releasePointerCapture(d.id);}catch{}
 const changedCells=[];
 for(const index of d.touched)
  if(board[index]!==d.initial[index])changedCells.push([index,d.initial[index],board[index]]);
 if(changedCells.length){
  if(d.history)pushHistory(changedCells,d.initialChanges,changes+changedCells.length,d.initialSelected,selected);
  changes+=changedCells.length;
  lastInput=selected;lastInputTime=Date.now();
  playSound('input',d.target);
  saveBoard();
  if(d.replayChanges.length)window.dispatchEvent(new CustomEvent('nono:replay-stroke',{detail:{changes:d.replayChanges,at:Date.now()}}));
  const solved=isSolved(board,puzzle);
  if(mode==='race')queueRaceState(solved,changedCells);
  else if(solved)finishLocal();
  if(mode==='practice')renderLive();
  if(prefs.errorMode==='immediate')notifyWrong('immediate');
  else scheduleWrong();
 }
 render();
}
function setupPointer(){
 const target=$('board');
 // Suppress the legacy per-cell pointerenter renderer during the optimized stroke.
 target.addEventListener('pointerenter',e=>{if(fastDrag)e.stopImmediatePropagation();},true);
 target.addEventListener('pointerdown',e=>{
  const cell=e.target.closest('.cell');if(!cell||!cell.closest('#board'))return;
  if(e.button!==0&&e.button!==2)return;
  const index=Number(cell.dataset.index);
  // Cooperative boards keep their existing Firebase transaction semantics.
  if(mode==='coop'){dragStart=index;dragAxis='';dragBaseline=undoStack.length;dragCount=1;return;}
  if(finished||finishing||startingAlone||startingRace&&mode==='race')return;
  e.preventDefault();e.stopImmediatePropagation();
  startFastDrag(e,index);
 },true);
 document.addEventListener('pointermove',moveFastDrag,true);
 const end=e=>{if(fastDrag){endFastDrag(e);return;}
  if(dragStart!==null){squashHistory(dragBaseline);dragStart=null;dragAxis='';dragCount=0;render();}
 };
 document.addEventListener('pointerup',end,true);
 document.addEventListener('pointercancel',end,true);
 window.addEventListener('blur',()=>{if(fastDrag)endFastDrag();});
}
const oldPaint=paint;paint=function(index,to,drag){if(drag&&dragStart!==null){if(mode==='coop'){oldPaint(index,to,true);return;}const n=puzzle.size;const ar=Math.floor(dragStart/n),ac=dragStart%n,r=Math.floor(index/n),c=index%n;if(!dragAxis){dragAxis=Math.abs(c-ac)>=Math.abs(r-ar)?'row':'col'}if((dragAxis==='row'&&r!==ar)||(dragAxis==='col'&&c!==ac))return;const from=selected;const start=dragAxis==='row'?from%n:Math.floor(from/n),end=dragAxis==='row'?c:r,step=end>=start?1:-1;for(let k=start;k!==end+step;k+=step){const at=dragAxis==='row'?ar*n+k:k*n+ac;if(prefs.dragPolicy==='skip'&&board[at]!=='0'&&at!==dragStart)continue;oldPaint(at,to,true);dragCount++}updateBoard();return;}
const prev=board[index];oldPaint(index,to,drag);if(board[index]!==prev){lastInput=index;lastInputTime=Date.now();if(prefs.lastInput==='3'||prefs.lastInput==='5')setTimeout(()=>{if(Date.now()-lastInputTime>=Number(prefs.lastInput)*1000)updateBoard()},Number(prefs.lastInput)*1000+50);playSound('input',to);if(prefs.errorMode==='immediate'&&wrongCells().length)notifyWrong('immediate');else scheduleWrong();saveBoard();const cl=$('board').querySelectorAll('.cell')[index];if(cl&&prefs.animation!=='basic'){const style='nono-input-'+prefs.animation;cl.classList.remove(style,'nono-anim-cross','nono-anim-fill');void cl.offsetWidth;cl.classList.add(style,to==='2'?'nono-anim-cross':'nono-anim-fill');}if(prefs.feedback!=='off'&&navigator.vibrate)navigator.vibrate(prefs.feedback==='strong'?45:prefs.feedback==='normal'?25:12)}updateBoard();};
const oldRender=render;render=function(){oldRender();updateBoard()};
// Undo/redo must update the persistent resume snapshot, not only the live board.
const oldRestoreHistory=restoreHistory;
restoreHistory=function(source,target){
 const changed=['practice','record'].includes(mode)&&!roomCode&&!finished&&source.length>0;
 oldRestoreHistory(source,target);
 if(changed&&mode==='practice')saveBoard();
};
const oldShow=showGame;showGame=function(){boardZoom=1;oldShow();cellZoom=41;releaseMove();keyboardDrag=null;hintMode=false;altClueSelection=null;hintStage=0;lastInput=-1;const saved=mode==='practice'&&!puzzle.sizeTest?readBoard():null;if(saved){board=saved.board.split('');selected=saved.selected||0;startedAt=saved.startedAt||Date.now();changes=Number.isFinite(saved.changes)?saved.changes:0;manualClues[puzzle.id]=saved.manual||{};undoStack=restoredHistory(saved,'undo');redoStack=restoredHistory(saved,'redo');finished=isSolved(board,puzzle);finishedAt=finished?(saved.finishedAt||saved.savedAt||Date.now()):0;oldRender();toast('저장된 퍼즐을 이어서 시작했어요.');}apply();scheduleBoardFit();if(prefs.guide==='start')setTimeout(()=>{if(prefs.guide==='start'&&!$('game').classList.contains('hidden'))document.querySelector('.board-caption').hidden=true},10000);};
const oldLeave=leaveGame;leaveGame=async function(){altClueSelection=null;releaseMove();keyboardDrag=null;saveBoard();closeOverview();document.body.classList.remove('nono-fit-playing');return oldLeave()};
const oldFinish=finishLocal;finishLocal=function(){oldFinish();saveBoard();playSound('finish');setTimeout(()=>openOverview(),300)};
document.addEventListener('keydown',keyDown,true);document.addEventListener('keyup',endKeyboard,true);
window.addEventListener('blur',releaseMove);
document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseMove()});
document.addEventListener('click',e=>{if(e.target.closest('#restart')){e.preventDefault();e.stopImmediatePropagation();if(roomCode)return;if(!confirm('퍼즐을 초기화할까요? 현재 진행 상황이 지워집니다.'))return;if(mode==='practice'){dropSave();delete manualClues[puzzle.id];}startAlone().then(saveBoard).catch(firebaseError);}},true);
document.addEventListener('click',e=>{if(e.target.closest('#leave-game')){e.preventDefault();e.stopImmediatePropagation();if(!confirm('로비로 나갈까요? 진행 상황은 자동 저장됩니다.'))return;leaveGame()}},true);

const oldCheck=checkBoard;checkBoard=function(){notifyWrong('direct')};
// Pointer hover updates only the selection and intersecting rows/columns.
// Avoid full re-render on each hover: a 100×100 board has 10,000 cells.
function followPointerSelection(event){
 if(!prefs.pointerFollow||pointerDown||dragStart!==null||fastDrag||hintMode||overviewOpen||hudEdit)return;
 const cell=event.target.closest('.cell');
 if(!cell||!cell.closest('#board'))return;
 const next=Number(cell.dataset.index),cells=$('board').querySelector('.cells')?.children;
 if(!cells||!Number.isInteger(next)||next<0||next>=puzzle.size*(puzzle.height||puzzle.size))return;
 updateLiveSelection(next,cells);
}
mount();setupPointer();window.addEventListener('resize',scheduleBoardFit);new MutationObserver(scheduleBoardFit).observe(document.body,{attributes:true,attributeFilter:['data-nono-theme']});
$('board').addEventListener('pointermove',followPointerSelection,{passive:true});
window.addEventListener('blur',()=>{altClueSelection=null;releaseMove();keyboardDrag=null;});
$('board').addEventListener('wheel',e=>{if(!prefs.zoomWheel||!e.ctrlKey)return;e.preventDefault();
 const inc={slow:.05,normal:.1,fast:.2}[prefs.zoomSpeed]||.1;
 setBoardZoom(e.deltaY<0?inc:-inc);
}, {passive:false});
apply();
})();
