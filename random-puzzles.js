/* Constructive, image-independent NONO puzzle patterns.
 * Motifs and route crossings are placed directly, never candidate-scored/rejected.
 * Difficulty labels are design intent; logic solvability and user enjoyment are not proven.
 */
(function(root){
'use strict';
const KEY='nono-random-puzzles-v1',LEVELS=['쉬움','보통','어려움','전문가'],LIMIT=100;
function rng(seed){let s=seed>>>0;return ()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
function clues(bits){const a=[];let run=0;for(const bit of bits){if(bit)run++;else if(run){a.push(run);run=0;}}if(run)a.push(run);return a.length?a:[0];}
function validSpec(value){
  return !!value&&Number.isInteger(value.size)&&value.size>=5&&value.size<=100&&
    LEVELS.includes(value.difficulty)&&Number.isInteger(value.seed)&&value.seed>=0&&value.seed<=4294967295;
}
// Small-board uniqueness is repaired constructively by adding crossing rails.
// No alternative candidate board is generated, discarded or scored.
const lineOptionsCache=new Map();
function uniqueOnSmallBoard(mask,n){
  if(n>10)return null; // Large-board uniqueness needs a dedicated scalable solver.
  let options=lineOptionsCache.get(n);
  if(!options){
    options=new Map();
    for(let bits=0;bits<1<<n;bits++){
      const runs=clues(Array.from({length:n},(_,i)=>(bits>>i)&1)).join(',');
      if(!options.has(runs))options.set(runs,[]);
      options.get(runs).push(bits);
    }
    lineOptionsCache.set(n,options);
  }
  const row=Array.from({length:n},(_,r)=>options.get(clues(mask.slice(r*n,(r+1)*n)).join(','))||[]);
  const col=Array.from({length:n},(_,c)=>options.get(clues(Array.from({length:n},(_,r)=>mask[r*n+c])).join(','))||[]);
  let solutions=0;
  function search(y,possible){
    if(solutions>=2)return;
    if(y===n){solutions++;return;}
    for(const bits of row[y]){
      const narrowed=possible.map((values,x)=>values.filter(candidate=>((candidate>>y)&1)===((bits>>x)&1)));
      if(narrowed.every(values=>values.length))search(y+1,narrowed);
      if(solutions>=2)return;
    }
  }
  search(0,col);
  return solutions===1;
}
function addClueAnchors(mask,n){
  if(n>10)return;
  if(uniqueOnSmallBoard(mask,n))return;
  // Rails always intersect the original route composition, supplying
  // strong starting deductions without generating replacement candidates.
  const priorities=[0,n-1,Math.floor(n/2),...Array.from({length:n},(_,i)=>i)];
  const seen=new Set();
  for(const line of priorities){
    if(seen.has(line))continue;seen.add(line);
    for(let i=0;i<n;i++){mask[line*n+i]=1;mask[i*n+line]=1;}
    if(uniqueOnSmallBoard(mask,n))return;
  }
}
function design(spec){
  if(!validSpec(spec))throw Error('잘못된 랜덤 퍼즐 생성 정보입니다.');
  const {size:n,difficulty,seed}=spec,level=LEVELS.indexOf(difficulty),random=rng(seed),pi=Math.PI;
  // Continuous ribbons guarantee every row and column has meaningful entry points.
  const turn=[.6,1.1,1.7,2.4][level],width=[.19,.155,.125,.105][level];
  const vPhase=random()*2*pi,hPhase=random()*2*pi;
  const vCenter=.5+(random()-.5)*.12,hCenter=.5+(random()-.5)*.12;
  const vAmp=[.11,.16,.20,.23][level],hAmp=[.09,.14,.18,.20][level];
  const vFreq=1+Math.round(turn),hFreq=1+Math.round(turn*.8);
  const motif=Math.floor(random()*4);
  const cx=.36+random()*.28,cy=.34+random()*.30,rx=.18+random()*.12,ry=.17+random()*.12;
  const loopWidth=[.085,.07,.055,.045][level];
  const forkDirection=random()>.5?1:-1;
  const mask=new Array(n*n);
  function centerV(v){return vCenter+vAmp*Math.sin(v*vFreq*pi+vPhase)+.055*Math.cos(v*2*pi+hPhase);}
  function centerH(u){return hCenter+hAmp*Math.sin(u*hFreq*pi+hPhase)+.05*Math.sin(u*2*pi+vPhase);}
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const u=(x+.5)/n,v=(y+.5)/n;
    const vertical=Math.abs(u-centerV(v))<width*(.9+.2*Math.cos(v*2*pi));
    const horizontal=Math.abs(v-centerH(u))<width*(.9+.2*Math.sin(u*2*pi));
    const d=Math.hypot((u-cx)/rx,(v-cy)/ry);
    // One of four deliberately composed side-motifs: loop, branching fork, bay or terrace.
    const loop=Math.abs(d-1)<loopWidth/Math.min(rx,ry)*.46;
    const bay=d<.78;
    const fork=Math.abs(v-(.25+forkDirection*.21*(u-.5)+.08*Math.sin(u*3*pi+vPhase)))<
      width*.56 && u>.10 && u<.90;
    const terrace=Math.abs(v-(.27+.19*Math.sin(u*2*pi+hPhase)))<width*.52&&u>.12&&u<.88;
    let filled=vertical||horizontal||(motif===0?loop:motif===1?fork:motif===2?terrace:loop||fork);
    if(level>=1&&motif===2&&bay&&Math.abs(u-cx)<rx*.68&&Math.abs(v-cy)<ry*.68)filled=false;
    if(level>=2&&motif!==2&&d<.43&&Math.abs(u-centerV(v))>width*.4)filled=false;
    if(level>=3){
      // Intentional enclosed windows, not scattered random pixels.
      const a=.2+.6*randomStatic(seed,4),b=.15+.7*randomStatic(seed,5);
      if(Math.abs(u-a)<.037&&Math.abs(v-b)<.08&&Math.abs(u-centerV(v))>width*.3)filled=false;
    }
    mask[y*n+x]=filled?1:0;
  }
  // Construct entry anchors by extending the existing continuous ribbons.
  // This is a deterministic part of generation, not a retry/filter stage.
  for(let y=0;y<n;y++){
    if(mask.slice(y*n,(y+1)*n).some(Boolean))continue;
    const mid=Math.max(0,Math.min(n-1,Math.floor(centerV((y+.5)/n)*n)));
    mask[y*n+mid]=1;
  }
  for(let x=0;x<n;x++){
    let has=false;for(let y=0;y<n;y++)if(mask[y*n+x]){has=true;break;}
    if(!has){const mid=Math.max(0,Math.min(n-1,Math.floor(centerH((x+.5)/n)*n)));mask[mid*n+x]=1;}
  }
  addClueAnchors(mask,n);
  const rows=Array.from({length:n},(_,y)=>clues(mask.slice(y*n,(y+1)*n)));
  const cols=Array.from({length:n},(_,x)=>clues(Array.from({length:n},(_,y)=>mask[y*n+x])));
  return {rows,cols,mask:mask.join(''),size:n};
}
function randomStatic(seed,salt){return rng((seed^Math.imul(salt,0x9e3779b9))>>>0)();}
function validPuzzle(p){
  if(!p||!/^random-[a-z0-9-]{1,85}$/.test(p.id)||!validSpec(p))return false;
  if(!Array.isArray(p.rows)||!Array.isArray(p.cols)||p.rows.length!==p.size||p.cols.length!==p.size)return false;
  for(const line of [...p.rows,...p.cols]){
    if(!Array.isArray(line)||line.length===0||line.some(n=>!Number.isInteger(n)||n<1||n>p.size)||
        line.reduce((s,n)=>s+n,0)+line.length-1>p.size)return false;
  }
  return p.rows.flat().reduce((s,n)=>s+n,0)===p.cols.flat().reduce((s,n)=>s+n,0);
}
function readList(){try{const list=JSON.parse(root.localStorage?.getItem(KEY)||'[]');return Array.isArray(list)?list.filter(validPuzzle).slice(0,LIMIT):[];}catch{return [];}}
function restore(){return readList().map(p=>({...p,generated:true,trialOnly:true}));}
function fromSpec(spec){
  if(!validSpec(spec))throw Error('지원하지 않는 크기·난이도·시드입니다.');
  const data=design(spec);
  const id=typeof spec.id==='string'&&/^random-[a-z0-9-]{1,85}$/.test(spec.id)?
    spec.id:'random-'+spec.seed.toString(36)+'-'+spec.size+'-'+LEVELS.indexOf(spec.difficulty);
  return {id,name:'랜덤 '+spec.size+'×'+spec.size,size:spec.size,width:spec.size,height:spec.size,
    difficulty:spec.difficulty,seed:spec.seed,rows:data.rows,cols:data.cols,
    generated:true,trialOnly:true,designVersion:1};
}
function answerFor(spec){
  if(!validSpec(spec))throw Error('잘못된 정답 생성 정보입니다.');
  return design(spec).mask;
}
function register(p){
  if(!validPuzzle(p))throw Error('랜덤 퍼즐 형식이 올바르지 않습니다.');
  const exact=fromSpec(p);
  if(JSON.stringify(exact.rows)!==JSON.stringify(p.rows)||JSON.stringify(exact.cols)!==JSON.stringify(p.cols))
    throw Error('퍼즐 힌트가 생성 정보와 일치하지 않습니다.');
  const old=readList().filter(item=>item.id!==exact.id);
  if(old.length>=LIMIT)throw Error('저장된 랜덤 퍼즐이 100개입니다. 기존 퍼즐 정리 후 다시 시도하세요.');
  try{
    if(!root.localStorage)throw Error('브라우저 저장소를 사용할 수 없습니다.');
    root.localStorage.setItem(KEY,JSON.stringify([exact,...old]));
  }catch{throw Error('퍼즐 저장에 실패했습니다. 저장 공간을 확인해 주세요.');}
  return exact;
}
function generate({size,difficulty,seed}){
  size=Number(size);
  seed=seed===undefined?(root.crypto?.getRandomValues?.(new Uint32Array(1))[0]??Math.floor(Math.random()*4294967296)):(Number(seed)>>>0);
  if(!validSpec({size,difficulty,seed}))throw Error('지원하지 않는 크기 또는 난이도입니다.');
  const spec={size,difficulty,seed,id:'random-'+Date.now().toString(36)+'-'+seed.toString(36)};
  return register(fromSpec(spec));
}
const api={generate,restore,register,fromSpec,answerFor,validSpec,LEVELS};
root.NONO_RANDOM_PUZZLES=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
