/* Solver-derived nonogram enjoyment. Roucairol & Cazenave, CG 2024.
 * https://www.lamsade.dauphine.fr/~cazenave/papers/Nonogram2024.pdf
 * A documented approximation of their human-like line scheduler, not their source code.
 */
(function(root){
'use strict';
function machine(raw){
  const clue=raw[0]===0?[]:raw;
  const count=clue.length,gap=Array.from({length:count+1},(_,i)=>i);
  const run=clue.map(()=>[]);
  let total=count+1;
  for(let j=0;j<count;j++)for(let k=1;k<=clue[j];k++)run[j][k]=total++;
  const z=new Int16Array(total).fill(-1),o=new Int16Array(total).fill(-1);
  for(let j=0;j<=count;j++){z[gap[j]]=gap[j];if(j<count)o[gap[j]]=run[j][1];}
  for(let j=0;j<count;j++)for(let k=1;k<=clue[j];k++){
    const state=run[j][k];
    if(k<clue[j])o[state]=run[j][k+1];
    else z[state]=gap[j+1];
  }
  const accept=[gap[count]];
  if(count)accept.push(run[count-1][clue[count-1]]);
  return {z,o,total,accept};
}
function deduce(board,n,axis,index,m){
  const forward=Array.from({length:n+1},()=>new Uint8Array(m.total));
  const backward=Array.from({length:n+1},()=>new Uint8Array(m.total));
  forward[0][0]=1;
  const value=i=>board[axis===0?index*n+i:i*n+index];
  for(let i=0;i<n;i++){
    const next=forward[i+1],cur=forward[i],v=value(i);
    for(let j=0;j<m.total;j++)if(cur[j]){
      if(v!==1&&m.z[j]>=0)next[m.z[j]]=1;
      if(v!==0&&m.o[j]>=0)next[m.o[j]]=1;
    }
  }
  for(const i of m.accept)backward[n][i]=1;
  for(let i=n-1;i>=0;i--){
    const cur=backward[i],next=backward[i+1],v=value(i);
    for(let j=0;j<m.total;j++)
      if((v!==1&&m.z[j]>=0&&next[m.z[j]])||(v!==0&&m.o[j]>=0&&next[m.o[j]]))cur[j]=1;
  }
  if(!backward[0][0])return null;
  const result=[];
  for(let i=0;i<n;i++)if(value(i)===-1){
    let yes=false,no=false;
    for(let j=0;j<m.total;j++)if(forward[i][j]){
      if(m.o[j]>=0&&backward[i+1][m.o[j]])yes=true;
      if(m.z[j]>=0&&backward[i+1][m.z[j]])no=true;
      if(yes&&no)break;
    }
    if(!yes&&!no)return null;
    if(yes!==no)result.push([axis===0?index*n+i:i*n+index,yes?1:0]);
  }
  return result;
}
function propagation(board,n,machines,limit,record,budget){
  const queue=[],present=new Uint8Array(2*n);
  for(let i=0;i<2*n;i++){queue.push(i);present[i]=1;}
  const lengths=[],trace=[];let steps=0,d=0,scanned=0,misses=0,triggered=false,progress=false;
  while(queue.length){
    if(++scanned>limit||(budget&&++budget.checks>budget.maxChecks))return {status:'budget',board,lengths,trace,steps,d,scanned};
    const line=queue.shift();present[line]=0;
    const axis=line<n?0:1,index=line%n;
    const changes=deduce(board,n,axis,index,machines[line]);
    if(changes===null)return {status:'invalid',board,lengths,trace,steps,d,scanned};
    if(changes.length){
      progress=true;misses=0;triggered=false;steps++;
      if(record){lengths.push(changes.length);trace.push({axis:axis===0?'row':'col',index,length:changes.length});}
      const targets=new Set();
      for(const [pos,value] of changes){
        if(board[pos]!==-1&&board[pos]!==value)return {status:'invalid',board,lengths,trace,steps,d,scanned};
        board[pos]=value;
        targets.add(axis===0?n+pos%n:Math.floor(pos/n));
      }
      const toFront=[];
      for(const t of targets){
        if(!present[t]){present[t]=1;toFront.push(t);}
      }
      for(let i=toFront.length-1;i>=0;i--)queue.unshift(toFront[i]);
    }else if(progress&&!triggered&&++misses>=7){d++;triggered=true;}
  }
  let unknown=0;for(const value of board)if(value===-1)unknown++;
  return {status:unknown?'stuck':'solved',board,lengths,trace,steps,d,scanned,unknown};
}
function kurtosis(values){
  if(values.length<2)return null;
  const mean=values.reduce((a,b)=>a+b,0)/values.length;
  const variance=values.reduce((a,b)=>a+(b-mean)**2,0)/values.length;
  if(variance===0)return null;
  return values.reduce((a,b)=>a+(b-mean)**4,0)/values.length/(variance*variance);
}
function evaluate(puzzle,options={}){
  const n=Number(puzzle.size);
  if(!Number.isInteger(n)||n<5||n>100||!Array.isArray(puzzle.rows)||!Array.isArray(puzzle.cols)||
     puzzle.rows.length!==n||puzzle.cols.length!==n)
    return {status:'invalid',funScore:null,difficultyScore:null};
  if(n>30)return {status:'not_evaluated',funScore:null,difficultyScore:null,
    reason:'30×30 초과는 현 버전 풀이기 계산 비용이 너무 커서 논문 점수를 계산하지 않습니다.',
    method:'paper-inspired-line-dp-v1'};
  const lines=[...puzzle.rows,...puzzle.cols];
  if(lines.some(c=>!Array.isArray(c)||!c.length||c.some(v=>!Number.isInteger(v)||v<0||v>n)))return {status:'invalid',funScore:null,difficultyScore:null};
  const m=lines.map(machine),board=new Int8Array(n*n).fill(-1);
  const level=puzzle.difficulty||'보통',allowEdge=options.allowEdge===undefined?(['어려움','전문가'].includes(level)?(level==='전문가'?3:2):0):options.allowEdge;
  const maxChecks=Number.isInteger(options.maxChecks)?options.maxChecks:Math.max(400,n*n*10);
  let main=propagation(board,n,m,maxChecks,true),g=0;
  if(main.status==='stuck'&&allowEdge>0){
    const edge=[];
    for(let i=0;i<n;i++)for(const index of [i,(n-1)*n+i,i*n,i*n+n-1])
      if(board[index]===-1&&!edge.includes(index))edge.push(index);
    while(main.status==='stuck'&&g<allowEdge){
      let found=-1;
      for(const index of edge){
        if(board[index]!==-1)continue;
        const probe=board.slice();probe[index]=0;
        const simulation=propagation(probe,n,m,maxChecks,false);
        if(simulation.status==='invalid'){found=index;break;}
      }
      if(found<0)break;
      board[found]=1;g++;
      const previous=main;
      main=propagation(board,n,m,maxChecks,true);
      main.steps+=previous.steps;
      main.d+=previous.d;
      main.lengths.unshift(...previous.lengths,1);
      main.trace.unshift(...previous.trace,{axis:'edge',index:found,length:1});
    }
  }
  const status=main.status;
  const nSteps=main.lengths.length,d=main.d;
  const u=new Set(main.lengths).size,k=kurtosis(main.lengths);
  const cells=n*n;
  const blacks=puzzle.rows.flat().reduce((s,v)=>s+v,0);
  const whites=cells-blacks;
  // Paper's fun formula requires a completed human-like deduction trace.
  const valid=status==='solved'&&k!==null&&Number.isFinite(k);
  const funScore=valid?(4*blacks*whites/(cells*cells)-k)*u+5-Math.max(d,5)-g*g:null;
  const difficultyScore=status==='solved'?nSteps+50*Math.sqrt(g)+10*d:null;
  return {status,funScore:funScore===null?null:+funScore.toFixed(4),
    difficultyScore:difficultyScore===null?null:+difficultyScore.toFixed(4),
    metrics:{n:nSteps,g,d,k:k===null?null:+k.toFixed(4),u,black:blacks,white:whites,
      size:cells,moveLengths:main.lengths,scanned:main.scanned,unknown:main.unknown??0},
    method:'paper-inspired-line-dp-v1',trace:options.trace?main.trace:undefined};
}

// Independent exact solution count, capped at two answers. Used for validation,
// NOT for fun/difficulty grading. A bounded search returning 'unknown' is NEVER
// accepted as proof of uniqueness.
function countSolutions(puzzle,options={}){
  const n=puzzle?.size,rows=puzzle?.rows,cols=puzzle?.cols;
  if(!Number.isInteger(n)||n<5||n>100||!Array.isArray(rows)||!Array.isArray(cols)||
    rows.length!==n||cols.length!==n)return {status:'invalid',count:0,checks:0,nodes:0};
  const validLine=line=>Array.isArray(line)&&line.length>0&&line.every(v=>Number.isInteger(v)&&v>=1&&v<=n)&&
    line.reduce((a,b)=>a+b,0)+line.length-1<=n;
  if(![...rows,...cols].every(validLine))return {status:'invalid',count:0,checks:0,nodes:0};
  const machines=[...rows,...cols].map(machine);
  const maxChecks=Number.isInteger(options.maxChecks)&&options.maxChecks>=1?options.maxChecks:Math.max(600,n*n*30);
  const maxNodes=Number.isInteger(options.maxNodes)&&options.maxNodes>=1?options.maxNodes:Math.max(200,n*15);
  const budget={checks:0,maxChecks},seen={count:0,nodes:0,limited:false};
  const full=n*n;
  const reference=options.reference;
  if(reference!==undefined&&
      (typeof reference!=='string'||reference.length!==full||!/^[01]+$/.test(reference)))
    return {status:'invalid',count:0,checks:0,nodes:0};
  function dfs(current){
    if(seen.count>=2||seen.limited)return;
    if(++seen.nodes>maxNodes){seen.limited=true;return;}
    const settled=propagation(current,n,machines,Math.min(maxChecks,Math.max(n*n*6,400)),false,budget);
    if(settled.status==='budget'){seen.limited=true;return;}
    if(settled.status==='invalid')return;
    if(settled.status==='solved'){
      if(reference){
        for(let i=0;i<full;i++)if(current[i]!==Number(reference[i])){
          seen.count=2;return;
        }
      }
      seen.count++;
      return;
    }
    let best=-1,bestRank=Infinity;
    const unknownRows=new Uint16Array(n),unknownCols=new Uint16Array(n);
    for(let i=0;i<full;i++)if(current[i]<0){unknownRows[Math.floor(i/n)]++;unknownCols[i%n]++;}
    for(let i=0;i<full;i++)if(current[i]<0){
      const rank=unknownRows[Math.floor(i/n)]+unknownCols[i%n];
      if(rank<bestRank){best=i;bestRank=rank;}
    }
    if(best<0)return;
    for(const value of (reference?[Number(reference[best]),1-Number(reference[best])]:[0,1])){
      const branch=current.slice();branch[best]=value;dfs(branch);
      if(seen.count>=2||seen.limited)return;
    }
  }
  dfs(new Int8Array(full).fill(-1));
  return {status:seen.count>=2?'multiple':seen.limited?'unknown':seen.count===1?'unique':'invalid',
    count:seen.count,checks:budget.checks,nodes:seen.nodes};
}

const api={evaluate,kurtosis,countSolutions};
root.NONO_RANDOM_SOLVER=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
