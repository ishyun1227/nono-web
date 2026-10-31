/* Image-independent, locally generated NONO practice puzzles. No answer masks are published or stored. */
(function(root){
'use strict';
const KEY='nono-random-puzzles-v1';
const LEVELS=['쉬움','보통','어려움','전문가'];
const LIMIT=100;
function rng(seed){
  let s=seed>>>0;
  return ()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
}
function clues(bits){
  const answer=[];let run=0;
  for(const bit of bits){if(bit){run++;}else if(run){answer.push(run);run=0;}}
  if(run)answer.push(run);
  return answer.length?answer:[0];
}
function interpolate(a,b,t){const s=t*t*(3-2*t);return a+(b-a)*s;}
function noiseGrid(points,w,h,random){
  const grid=Array.from({length:(w+1)*(h+1)},()=>random());
  return (x,y)=>{
    const gx=x*w,gy=y*h,px=Math.min(w-1,Math.floor(gx)),py=Math.min(h-1,Math.floor(gy));
    const fx=gx-px,fy=gy-py,k=py*(w+1)+px;
    return interpolate(interpolate(grid[k],grid[k+1],fx),interpolate(grid[k+w+1],grid[k+w+2],fx),fy);
  };
}
function maskFor(size,level,random){
  const complexity=[2.3,3.4,4.7,6.2][level],target=[.51,.47,.43,.40][level]+(random()-.5)*.075;
  const coarse=noiseGrid(null,Math.ceil(complexity),Math.ceil(complexity),random);
  const medium=noiseGrid(null,Math.ceil(complexity*2),Math.ceil(complexity*2),random);
  const detail=noiseGrid(null,Math.ceil(complexity*3.2),Math.ceil(complexity*3.2),random);
  const waveX=2+random()*3,waveY=2+random()*3,phase=random()*Math.PI*2;
  const values=new Array(size*size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const u=(x+.5)/size,v=(y+.5)/size;
    values[y*size+x]=.53*coarse(u,v)+.34*medium(u,v)+.13*detail(u,v)
      + .043*Math.sin(u*waveX*Math.PI+phase)*Math.cos(v*waveY*Math.PI-phase);
  }
  const sorted=values.slice().sort((a,b)=>b-a);
  const threshold=sorted[Math.max(0,Math.min(sorted.length-1,Math.floor(size*size*target)))];
  return values.map(v=>v>=threshold?1:0);
}
function detailsFor(mask,n){
  const rows=[],cols=[],counts=[],signatures=[];
  for(let y=0;y<n;y++){
    const line=mask.slice(y*n,(y+1)*n),c=clues(line);rows.push(c);counts.push(c.length);signatures.push(line.join(''));
  }
  for(let x=0;x<n;x++){
    const line=Array.from({length:n},(_,y)=>mask[y*n+x]),c=clues(line);cols.push(c);counts.push(c.length);
  }
  const filled=mask.reduce((a,b)=>a+b,0);
  const density=filled/(n*n);
  const runMean=counts.reduce((a,b)=>a+b,0)/counts.length;
  const uniqueRows=new Set(signatures).size/n;
  let adjacentSame=0;for(let y=1;y<n;y++)if(signatures[y]===signatures[y-1])adjacentSame++;
  let isolated=0;
  for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(mask[y*n+x]){
    let neighbors=0;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)
      if((dx||dy)&&x+dx>=0&&x+dx<n&&y+dy>=0&&y+dy<n&&mask[(y+dy)*n+x+dx])neighbors++;
    if(!neighbors)isolated++;
  }
  const quadrants=[0,0,0,0];for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(mask[y*n+x])quadrants[(y>=n/2?2:0)+(x>=n/2?1:0)]++;
  return {rows,cols,density,runMean,uniqueRows,adjacentSame,isolated,quadrants,filled};
}
/* Scores are structural heuristics, NOT measured human enjoyment or guaranteed difficulty. */
function evaluate(mask,size,difficulty){
  const level=LEVELS.indexOf(difficulty);
  if(!Number.isInteger(size)||size<5||size>100||level<0||!Array.isArray(mask)||mask.length!==size*size)return null;
  const d=detailsFor(mask,size);
  if(d.rows.some(c=>c[0]===0)||d.cols.some(c=>c[0]===0))return null;
  if(d.density<.28||d.density>.68||d.isolated>d.filled*.025)return null;
  if(d.adjacentSame>Math.max(1,Math.floor(size*.1)))return null;
  const minQuadrant=d.filled*.055;
  if(Math.min(...d.quadrants)<minQuadrant)return null;
  const targetRuns=[1.75,2.15,2.6,3.15][level]*Math.pow(size/10,.12);
  const deviation=Math.abs(d.runMean-targetRuns)/targetRuns;
  if(deviation>.40||d.uniqueRows<.68)return null;
  const targetFill=[.51,.47,.43,.40][level];
  const score=Math.round(100-20*deviation-72*Math.abs(d.density-targetFill)
     -25*(1-d.uniqueRows)-40*d.isolated/Math.max(1,d.filled)-9*d.adjacentSame/Math.max(1,size));
  if(score<80)return null;
  return {rows:d.rows,cols:d.cols,quality:score,metrics:{density:+d.density.toFixed(3),runMean:+d.runMean.toFixed(2),distinctRows:+d.uniqueRows.toFixed(2)}};
}
function readList(){
  try{
    const value=JSON.parse(root.localStorage?.getItem(KEY)||'[]');
    return Array.isArray(value)?value.filter(p=>p&&/^random-[a-z0-9-]+$/.test(p.id)&&
      Number.isInteger(p.size)&&p.size>=5&&p.size<=100&&
      LEVELS.includes(p.difficulty)&&Array.isArray(p.rows)&&Array.isArray(p.cols)&&
      p.rows.length===p.size&&p.cols.length===p.size&&
      [...p.rows,...p.cols].every(line=>Array.isArray(line)&&line.length>0&&
        line.every(n=>Number.isInteger(n)&&n>=0&&n<=p.size)&&
        line.reduce((a,n)=>a+n,0)+line.length-1<=p.size)&&
      p.rows.flat().reduce((a,b)=>a+b,0)===p.cols.flat().reduce((a,b)=>a+b,0)
    ).slice(0,LIMIT):[];
  }catch{return [];}
}
function restore(){return readList().map(p=>({...p,generated:true,trialOnly:true}));}
function generate({size,difficulty,seed}){
  size=Number(size);
  if(!Number.isInteger(size)||size<5||size>100||!LEVELS.includes(difficulty))
    throw new Error('지원하지 않는 퍼즐 크기 또는 난이도입니다.');
  const history=readList();
  if(history.length>=LIMIT)throw new Error('저장된 랜덤 퍼즐이 100개입니다. 기존 퍼즐을 정리한 뒤 다시 시도하세요.');
  const initial=(seed===undefined?(root.crypto?.getRandomValues?.(new Uint32Array(1))[0]??Math.floor(Math.random()*4294967295)):Number(seed))>>>0;
  const random=rng(initial);
  let best=null;
  for(let attempt=0;attempt<(size<=30?220:125);attempt++){
    const mask=maskFor(size,LEVELS.indexOf(difficulty),random);
    const evaluated=evaluate(mask,size,difficulty);
    if(evaluated&&(!best||evaluated.quality>best.quality))best=evaluated;
    if(best&&best.quality>=92)break;
  }
  if(!best)throw new Error('품질 기준을 만족하는 퍼즐을 생성하지 못했습니다. 다시 시도해 주세요.');
  const id='random-'+Date.now().toString(36)+'-'+initial.toString(36)+'-'+Math.floor(random()*1e7).toString(36);
  const p={id,name:'랜덤 '+size+'×'+size,size,width:size,height:size,difficulty,
    rows:best.rows,cols:best.cols,generated:true,trialOnly:true,quality:best.quality,
    qualityMetrics:best.metrics,createdAt:Date.now()};
  try{
    if(!root.localStorage)throw Error('Storage unavailable');
    root.localStorage.setItem(KEY,JSON.stringify([p,...history]));
  }catch{throw new Error('퍼즐 저장에 실패했습니다. 브라우저 저장 공간을 확인해 주세요.');}
  return p;
}
const api={generate,restore,evaluate,LEVELS};
root.NONO_RANDOM_PUZZLES=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
