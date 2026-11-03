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
// Version 2 uses solver feedback to refine the originally constructed ribbons.
// Mutations change a small rectangle in the same puzzle, not a new random candidate.
// The bounded edits are deterministic so every multiplayer client reconstructs the same clues.
const paperSolver=root.NONO_RANDOM_SOLVER||(typeof require==='function'?require('./random-puzzle-solver.js'):null);
function rowsAndCols(mask,n){
  return {size:n,rows:Array.from({length:n},(_,y)=>clues(mask.slice(y*n,(y+1)*n))),
    cols:Array.from({length:n},(_,x)=>clues(Array.from({length:n},(_,y)=>mask[y*n+x])))};
}
function assess(mask,n,difficulty){
  return paperSolver?paperSolver.evaluate({...rowsAndCols(mask,n),difficulty}):
    {status:'not_evaluated',funScore:null,difficultyScore:null};
}
function improveMask(base,n,difficulty,seed){
  if(n>30||!paperSolver)return base;
  const random=rng(seed^0xCE11E0ED),level=LEVELS.indexOf(difficulty);
  const candidates=n<=10?10:n<=20?7:5;
  let best=base.slice(),result=assess(best,n,difficulty);
  const rank=r=>r.status==='solved'&&r.funScore!==null
    ?r.funScore-.015*Math.abs(r.difficultyScore-n*(2.8+level*1.1)):-100000;
  let score=rank(result);
  for(let step=0;step<candidates;step++){
    const cells=best.slice(),span=Math.min(n-1,n<=10?2:4);
    const w=1+Math.floor(random()*span),h=1+Math.floor(random()*span);
    const x=Math.floor(random()*(n-w+1)),y=Math.floor(random()*(n-h+1));
    for(let row=y;row<y+h;row++)for(let col=x;col<x+w;col++)
      cells[row*n+col]^=1;
    const puzzle=rowsAndCols(cells,n);
    if(puzzle.rows.some(c=>c[0]===0)||puzzle.cols.some(c=>c[0]===0))continue;
    const evaluated=paperSolver.evaluate({...puzzle,difficulty});
    if(rank(evaluated)>score){best=cells;score=rank(evaluated);}
  }
  return best;
}

// V3: Construct geometric paths using only the static black/white balance term.
// B=4*b*w/(b+w)^2 is maximized near an even split. No solving trace or
// rejection search is involved; B is not a human-enjoyment rating.
function balancedDesign(spec){
  const n=spec.size,level=LEVELS.indexOf(spec.difficulty),random=rng(spec.seed^0x6A1CE5B3);
  const pi=Math.PI,phaseV=random()*2*pi,phaseH=random()*2*pi;
  const bend=[.10,.16,.22,.28][level],frequency=[1.2,1.7,2.4,3.1][level];
  const centerV=.5+(random()-.5)*.12,centerH=.5+(random()-.5)*.12;
  const ribbon=[.14,.125,.11,.10][level],motif=Math.floor(random()*4);
  const cx=.30+random()*.40,cy=.28+random()*.44,rx=.18+random()*.11,ry=.16+random()*.13;
  const motifPhase=random()*2*pi;
  const centerX=v=>centerV+bend*Math.sin(v*frequency*pi+phaseV)+.04*Math.cos(v*2*pi+phaseH);
  const centerY=u=>centerH+bend*.82*Math.sin(u*(frequency-.25)*pi+phaseH)+.04*Math.sin(u*2*pi+phaseV);
  const scores=new Array(n*n);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const u=(x+.5)/n,v=(y+.5)/n;
    const vertical=1-Math.abs(u-centerX(v))/ribbon;
    const horizontal=1-Math.abs(v-centerY(u))/ribbon;
    const ellipse=Math.hypot((u-cx)/rx,(v-cy)/ry);
    const loop=.84-Math.abs(ellipse-1)/(.27+.04*level);
    const fork=.9-Math.abs(v-(.25+.21*(u-.5)+.07*Math.sin(u*3*pi+motifPhase)))/(ribbon*.82);
    const shelf=.88-Math.abs(v-(.26+.19*Math.sin(u*2*pi+motifPhase)))/(ribbon*.82);
    let side=motif===0?loop:motif===1?fork:motif===2?shelf:Math.max(loop-.15,fork-.1);
    if((motif===1||motif===2)&&(u<.12||u>.88))side=-3;
    const wave=.10*Math.sin(u*(2+level)*pi+phaseV)*Math.cos(v*(2+level)*pi+phaseH);
    scores[y*n+x]=Math.max(vertical,horizontal,side)+wave;
  }
  // Both crossing paths intersect every row and column by construction.
  for(let y=0;y<n;y++){
    const x=Math.max(0,Math.min(n-1,Math.round(centerX((y+.5)/n)*n-.5)));
    scores[y*n+x]=Math.max(scores[y*n+x],3);
  }
  for(let x=0;x<n;x++){
    const y=Math.max(0,Math.min(n-1,Math.round(centerY((x+.5)/n)*n-.5)));
    scores[y*n+x]=Math.max(scores[y*n+x],3);
  }
  const area=n*n,target=Math.round(area*(.47+.06*random()));
  const order=Array.from({length:area},(_,i)=>i).sort((a,b)=>scores[b]-scores[a]||a-b);
  const mask=new Array(area).fill(0);
  for(let i=0;i<target;i++)mask[order[i]]=1;
  const data=rowsAndCols(mask,n);
  return {...data,mask:mask.join(''),evaluation:null};
}


// V4: shape-independent random cells. The only intentional constraints are
// a near-even black/white split and at least one black cell in each row/column.
// A shuffled column permutation supplies one randomly located cell per row
// and column. All remaining filled cells are sampled from a uniform shuffle.
// No drawn silhouettes, connected paths, solver scoring, or candidate rejection.
function shuffledDesign(spec){
  const n=spec.size,random=rng((spec.seed^0xD4B0F1A5)>>>0),area=n*n;
  const mask=new Array(area).fill(0);
  function shuffle(items){
    for(let i=items.length-1;i>0;i--){
      const j=Math.floor(random()*(i+1));
      [items[i],items[j]]=[items[j],items[i]];
    }
    return items;
  }
  // Build coverage without any silhouette or aesthetic structure.
  const columns=shuffle(Array.from({length:n},(_,i)=>i));
  for(let y=0;y<n;y++)mask[y*n+columns[y]]=1;
  const blackTarget=Math.round(area*(.47+.06*random()));
  const other=shuffle(Array.from({length:area},(_,i)=>i).filter(i=>mask[i]===0));
  for(let i=0;i<blackTarget-n;i++)mask[other[i]]=1;
  const cluesData=rowsAndCols(mask,n);
  return {...cluesData,mask:mask.join(''),evaluation:null};
}

const designedCache=new Map();
function copyDesign(data){return {rows:data.rows.map(c=>c.slice()),cols:data.cols.map(c=>c.slice()),
  mask:data.mask,size:data.size,evaluation:data.evaluation?{...data.evaluation,metrics:data.evaluation.metrics?{...data.evaluation.metrics,moveLengths:data.evaluation.metrics.moveLengths.slice()}:undefined}:null};}
function design(spec){
  if(!validSpec(spec))throw Error('잘못된 랜덤 퍼즐 생성 정보입니다.');
  if((spec.version??spec.designVersion??4)===2&&!paperSolver)
    throw Error('논문 기반 퍼즐 풀이기를 불러오지 못했습니다. 새로고침 후 다시 시도하세요.');
  const cacheKey=[spec.version??spec.designVersion??4,spec.size,spec.difficulty,spec.seed].join(':');
  if(designedCache.has(cacheKey))return copyDesign(designedCache.get(cacheKey));
  if((spec.version??spec.designVersion??4)===4){
    const output=shuffledDesign(spec);
    designedCache.set(cacheKey,copyDesign(output));
    if(designedCache.size>12)designedCache.delete(designedCache.keys().next().value);
    return output;
  }
  if((spec.version??spec.designVersion??4)===3){
    const output=balancedDesign(spec);
    designedCache.set(cacheKey,copyDesign(output));
    if(designedCache.size>12)designedCache.delete(designedCache.keys().next().value);
    return output;
  }
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
  const version=spec.version??spec.designVersion??4;
  const finished=version===2?improveMask(mask,n,difficulty,seed):mask;
  const data=rowsAndCols(finished,n);
  const evaluation=version===2?assess(finished,n,difficulty):null;
  const output={...data,mask:finished.join(''),evaluation};
  designedCache.set(cacheKey,copyDesign(output));
  if(designedCache.size>12)designedCache.delete(designedCache.keys().next().value);
  return output;
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
  const version=spec.version??spec.designVersion??4;
  if(version!==1&&version!==2&&version!==3&&version!==4)throw Error('지원하지 않는 퍼즐 생성기 버전입니다.');
  const data=design({...spec,version});
  const id=typeof spec.id==='string'&&/^random-[a-z0-9-]{1,85}$/.test(spec.id)?
    spec.id:'random-'+spec.seed.toString(36)+'-'+spec.size+'-'+LEVELS.indexOf(spec.difficulty);
  return {id,name:'랜덤 '+spec.size+'×'+spec.size,size:spec.size,width:spec.size,height:spec.size,
    difficulty:spec.difficulty,seed:spec.seed,rows:data.rows,cols:data.cols,
    generated:true,trialOnly:true,designVersion:version,
    paperFunScore:data.evaluation?.funScore??null,
    paperDifficultyScore:data.evaluation?.difficultyScore??null,
    paperSolverStatus:data.evaluation?.status??'not_evaluated',
    paperScoreMethod:version===2?'paper-inspired-line-dp-v1':null};
}
function answerFor(spec){
  if(!validSpec(spec))throw Error('잘못된 정답 생성 정보입니다.');
  const version=spec.version??spec.designVersion??4;
  if(version!==1&&version!==2&&version!==3&&version!==4)throw Error('지원하지 않는 퍼즐 생성기 버전입니다.');
  return design({...spec,version}).mask;
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
  const spec={size,difficulty,seed,version:4,id:'random-'+Date.now().toString(36)+'-'+seed.toString(36)};
  return register(fromSpec(spec));
}
const api={generate,restore,register,fromSpec,answerFor,validSpec,LEVELS};
root.NONO_RANDOM_PUZZLES=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
