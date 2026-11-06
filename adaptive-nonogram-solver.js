/* Adaptive, deterministic and sound nonogram line-propagation engine.
 *
 * For a small number of candidate layouts, enumerate complete line patterns.
 * Otherwise use an exact finite-state dynamic program: O(line length * states),
 * without materializing exponentially many layouts.
 *
 * Recheck only intersecting lines when a cell changes. Rank constrained lines
 * first; edge proximity is a deliberately small, optional tiebreaker.
 * Returns partial/timeout, NEVER a uniqueness verdict. CaDiCaL remains the
 * independent uniqueness certifier.
 *
 * No external dependencies; CommonJS and Web Worker compatible.
 */
(function(root){
'use strict';
const dfaCache=new Map(),ENUM_CAP=768,MAX_ENUM_CAP=3072;
function normalizeClue(line){return line.length===1&&line[0]===0?[]:line;}
function validClue(line,n){
  if(Array.isArray(line)&&line.length===1&&line[0]===0)return true;
  return Array.isArray(line)&&line.length>0&&line.every(x=>Number.isInteger(x)&&x>=1&&x<=n)&&
    line.reduce((a,b)=>a+b,0)+line.length-1<=n;
}
function validPuzzle(p){
  const n=p?.size;
  return Number.isInteger(n)&&n>=5&&n<=100&&
    Array.isArray(p.rows)&&Array.isArray(p.cols)&&p.rows.length===n&&p.cols.length===n&&
    [...p.rows,...p.cols].every(x=>validClue(x,n))&&
    p.rows.flat().reduce((a,b)=>a+b,0)===p.cols.flat().reduce((a,b)=>a+b,0);
}
function combinationsAtMost(n,k,cap){
  if(k<0||k>n)return 0;
  k=Math.min(k,n-k);
  let count=1;
  for(let i=1;i<=k;i++){count=count*(n-k+i)/i;if(count>cap)return cap+1;}
  return Math.round(count);
}
function upperBound(n,clue){
  clue=normalizeClue(clue);
  const slack=n-clue.reduce((a,b)=>a+b,0)-(clue.length-1);
  return combinationsAtMost(slack+clue.length,clue.length,1000000000);
}
function automaton(clue){
  const key=clue.join(',');
  let dfa=dfaCache.get(key);
  if(dfa)return dfa;
  const k=clue.length,gaps=Array.from({length:k+1},(_,i)=>i);
  const zero=[],one=[],run=[],separator=[];
  let count=k+1;
  for(let j=0;j<k;j++){
    run[j]=[];
    for(let used=1;used<clue[j];used++)run[j][used]=count++;
    if(j<k-1)separator[j]=count++;
  }
  for(let i=0;i<count;i++){zero[i]=-1;one[i]=-1;}
  for(let j=0;j<=k;j++){
    zero[gaps[j]]=gaps[j];
    if(j<k)one[gaps[j]]=clue[j]===1?(j===k-1?gaps[k]:separator[j]):run[j][1];
  }
  for(let j=0;j<k;j++)for(let used=1;used<clue[j];used++)
    one[run[j][used]]=used+1===clue[j]?(j===k-1?gaps[k]:separator[j]):run[j][used+1];
  for(let j=0;j<k-1;j++)zero[separator[j]]=gaps[j+1];
  dfa={count,zero:Int16Array.from(zero),one:Int16Array.from(one),end:gaps[k]};
  if(dfaCache.size>400)dfaCache.clear();
  dfaCache.set(key,dfa);
  return dfa;
}
function byDP(clue,known,deadline,cap){
  const n=known.length,a=automaton(clue),m=a.count,limit=Math.max(1,cap||MAX_ENUM_CAP)+1;
  const forward=Array.from({length:n+1},()=>new Int32Array(m));
  forward[0][0]=1;
  for(let pos=0;pos<n;pos++){
    if(Date.now()>=deadline)return {status:'timeout'};
    const current=forward[pos],next=forward[pos+1],v=known[pos];
    for(let s=0;s<m;s++)if(current[s]){
      const z=a.zero[s],o=a.one[s];
      if(v!==1&&z>=0)next[z]=Math.min(limit,next[z]+current[s]);
      if(v!==0&&o>=0)next[o]=Math.min(limit,next[o]+current[s]);
    }
  }
  const total=forward[n][a.end];
  if(!total)return {status:'contradiction'};
  const backward=Array.from({length:n+1},()=>new Uint8Array(m));
  backward[n][a.end]=1;
  for(let pos=n-1;pos>=0;pos--){
    if(Date.now()>=deadline)return {status:'timeout'};
    const current=backward[pos],next=backward[pos+1],v=known[pos];
    for(let s=0;s<m;s++)
      if((v!==1&&a.zero[s]>=0&&next[a.zero[s]])||
         (v!==0&&a.one[s]>=0&&next[a.one[s]]))current[s]=1;
  }
  if(!backward[0][0])return {status:'contradiction'};
  const forced=[];
  for(let pos=0;pos<n;pos++)if(known[pos]===-1){
    let canZero=false,canOne=false;
    for(let s=0;s<m;s++)if(forward[pos][s]){
      if(a.zero[s]>=0&&backward[pos+1][a.zero[s]])canZero=true;
      if(a.one[s]>=0&&backward[pos+1][a.one[s]])canOne=true;
      if(canZero&&canOne)break;
    }
    if(!canZero&&!canOne)return {status:'contradiction'};
    if(!canZero)forced.push({pos,value:1});
    else if(!canOne)forced.push({pos,value:0});
  }
  return {status:'ok',method:'dp',possibilities:total,exactCount:total<limit,forced};
}
function byEnumeration(clue,known,deadline,cap){
  const n=known.length,k=clue.length,white=new Int16Array(n+1),black=new Int16Array(n+1);
  for(let i=0;i<n;i++){white[i+1]=white[i]+(known[i]===1);black[i+1]=black[i]+(known[i]===0);}
  const validWhite=(a,b)=>white[b]===white[a],validBlack=(a,b)=>black[b]===black[a];
  const minRest=Array(k).fill(0);
  for(let j=k-1;j>=0;j--)minRest[j]=clue[j]+(j+1<k?1+minRest[j+1]:0);
  const starts=new Int16Array(k),positive=new Int32Array(n);
  let count=0,nodes=0,aborted=false,timedOut=false;
  function visit(j,minimum){
    if(aborted)return;
    if((++nodes&255)===0&&Date.now()>=deadline){aborted=true;timedOut=true;return;}
    if(j===k){
      if(!validWhite(minimum,n))return;
      if(++count>cap){aborted=true;return;}
      for(let block=0;block<k;block++)for(let p=starts[block];p<starts[block]+clue[block];p++)positive[p]++;
      return;
    }
    for(let p=minimum;p<=n-minRest[j]&&!aborted;p++){
      if(!validWhite(minimum,p)||!validBlack(p,p+clue[j]))continue;
      const next=p+clue[j],more=j+1<k;
      if(more&&!validWhite(next,next+1))continue;
      starts[j]=p;
      visit(j+1,next+(more?1:0));
    }
  }
  visit(0,0);
  if(timedOut||Date.now()>=deadline)return {status:'timeout'};
  if(aborted)return {status:'overflow'};
  if(!count)return {status:'contradiction'};
  const forced=[];
  for(let p=0;p<n;p++)if(known[p]===-1){
    if(positive[p]===count)forced.push({pos:p,value:1});
    else if(positive[p]===0)forced.push({pos:p,value:0});
  }
  return {status:'ok',method:'enumeration',possibilities:count,exactCount:true,forced};
}
function analyzeLine(clue,known,options={}){
  if(!Array.isArray(clue)||!Array.isArray(known)||!validClue(clue,known.length)||
     !known.every(v=>v===-1||v===0||v===1))return {status:'invalid'};
  const deadline=Number.isFinite(options.deadline)?options.deadline:Infinity;
  if(Date.now()>=deadline)return {status:'timeout'};
  const cap=Number.isInteger(options.enumerationCap)&&options.enumerationCap>0?
    Math.min(options.enumerationCap,MAX_ENUM_CAP):ENUM_CAP;
  clue=normalizeClue(clue);
  const knownCount=known.reduce((a,b)=>a+(b!==-1),0);
  const upper=upperBound(known.length,clue);
  const allowEnum=upper<=cap||(knownCount>known.length/2&&upper<=MAX_ENUM_CAP);
  if(allowEnum){
    const result=byEnumeration(clue,known,deadline,MAX_ENUM_CAP);
    if(result.status!=='overflow')return result;
  }
  return byDP(clue,known,deadline,MAX_ENUM_CAP);
}
function parseInput(puzzle){
  if(!validPuzzle(puzzle))return null;
  return {size:puzzle.size,rows:puzzle.rows,cols:puzzle.cols};
}
function matchesClues(cells,puzzle){
  const n=puzzle.size;
  function runs(axis,k){
    const result=[];let length=0;
    for(let p=0;p<n;p++){
      const value=axis==='row'?cells[k*n+p]:cells[p*n+k];
      if(value===1)length++;
      else if(length){result.push(length);length=0;}
    }
    if(length)result.push(length);
    return result;
  }
  for(let i=0;i<n;i++)
    if(JSON.stringify(runs('row',i))!==JSON.stringify(normalizeClue(puzzle.rows[i]))||
       JSON.stringify(runs('col',i))!==JSON.stringify(normalizeClue(puzzle.cols[i])))return false;
  return true;
}
function solve(puzzle,options={}){
  const verified=parseInput(puzzle);
  if(!verified)return {status:'invalid',reason:'invalid_clues',cells:[]};
  const n=verified.size,area=n*n,cells=Array(area).fill(-1);
  if(options.initialCells!==undefined){
    if(!Array.isArray(options.initialCells)||options.initialCells.length!==area||
       !options.initialCells.every(v=>v===-1||v===0||v===1))
      return {status:'invalid',reason:'invalid_initial_cells',cells:[]};
    for(let i=0;i<area;i++)cells[i]=options.initialCells[i];
  }
  const maxMs=Number.isFinite(options.maxMs)?Math.max(0,Math.min(10000,options.maxMs)):1000;
  const deadline=Date.now()+maxMs,withTrace=options.captureTrace!==false;
  const trace=[],dirty=Array(2*n).fill(true),modes=Array(2*n).fill(null);
  const useEdge=options.edgePriority!==false;
  const cap=options.enumerationCap??ENUM_CAP;
  let solved=cells.reduce((count,v)=>count+(v!==-1),0),
      iterations=0,modeSwitches=0,dpCalls=0,enumerationCalls=0;
  const stopAtCells=Number.isFinite(options.stopAtFraction)&&
    options.stopAtFraction>0&&options.stopAtFraction<1
    ?Math.ceil(area*options.stopAtFraction):area+1;
  // Opt-in exact handoff for benchmarks: cap committed cell deductions at the
  // requested count, even if a line deduction finds many forced cells at once.
  // When omitted, preserve legacy whole-line step behavior unchanged.
  const exactStopAtFraction=options.exactStopAtFraction===true;
  const maxSteps=Number.isInteger(options.maxSteps)&&options.maxSteps>0?
    Math.min(options.maxSteps,25000):25000;
  const get=(line,p)=>line<n?cells[line*n+p]:cells[p*n+line-n];
  const idx=(line,p)=>line<n?line*n+p:p*n+line-n;
  function score(line){
    const hint=line<n?verified.rows[line]:verified.cols[line-n];
    let known=0;for(let p=0;p<n;p++)known+=get(line,p)!==-1;
    const upper=upperBound(n,hint);
    const scarcity=n/(1+Math.log2(1+upper));
    const position=line%n,edge=Math.min(position,n-1-position);
    return known*3+scarcity*2+(useEdge?0.4/(1+edge):0);
  }
  if(exactStopAtFraction&&solved>=stopAtCells&&stopAtCells<=area)
    return {status:'partial',reason:'target_fraction',cells,solved,trace,
      stats:{iterations,dpCalls,enumerationCalls,modeSwitches}};
  while(dirty.some(Boolean)&&iterations<maxSteps){
    if(Date.now()>=deadline)return {status:'unknown',reason:'time_budget',cells,solved,trace,
      stats:{iterations,dpCalls,enumerationCalls,modeSwitches}};
    let selected=-1,best=-Infinity;
    for(let i=0;i<dirty.length;i++)if(dirty[i]){
      const rank=score(i);
      if(rank>best){selected=i;best=rank;}
    }
    if(selected<0)break;
    dirty[selected]=false;iterations++;
    const hint=selected<n?verified.rows[selected]:verified.cols[selected-n];
    const known=Array.from({length:n},(_,p)=>get(selected,p));
    const deduction=analyzeLine(hint,known,{deadline,enumerationCap:cap});
    if(deduction.status==='timeout')return {status:'unknown',reason:'time_budget',cells,solved,trace,
      stats:{iterations,dpCalls,enumerationCalls,modeSwitches}};
    if(deduction.status!=='ok')return {status:'invalid',reason:'line_contradiction',cells,solved,trace,
      stats:{iterations,dpCalls,enumerationCalls,modeSwitches}};
    if(deduction.method==='dp')dpCalls++;else enumerationCalls++;
    if(modes[selected]&&modes[selected]!==deduction.method)modeSwitches++;
    modes[selected]=deduction.method;
    const changes=[];
    for(const {pos,value} of deduction.forced){
      const id=idx(selected,pos);
      if(cells[id]!==-1&&cells[id]!==value)return {status:'invalid',reason:'conflicting_deduction',cells,solved,trace};
      if(cells[id]===-1){
        cells[id]=value;solved++;
        changes.push({row:Math.floor(id/n),col:id%n,value});
        // New information matters to the intersecting line only.
        dirty[selected<n?n+pos:pos]=true;
        if(exactStopAtFraction&&solved>=stopAtCells)break;
      }
    }
    if(changes.length&&withTrace)trace.push({
      axis:selected<n?'row':'col',index:selected%n,method:deduction.method,
      rule:deduction.method==='enumeration'?'compare_complete_patterns':'dfa_line_propagation',
      possibilities:deduction.possibilities,exactCount:deduction.exactCount,changes,
      edgeDistance:Math.min(selected%n,n-1-selected%n)
    });
    if(solved===area)break;
    if(solved>=stopAtCells)return {status:'partial',reason:'target_fraction',
      cells,solved,trace,stats:{iterations,dpCalls,enumerationCalls,modeSwitches}};
  }
  const complete=solved===area;
  if(complete&&!matchesClues(cells,verified))
    return {status:'invalid',reason:'result_clue_mismatch',cells,solved,trace};
  return {status:complete?'solved':iterations>=maxSteps?'unknown':'partial',
    ...(iterations>=maxSteps?{reason:'step_budget'}:{}),
    cells,solved,trace,stats:{iterations,dpCalls,enumerationCalls,modeSwitches}};
}
const api={solve,analyzeLine,validPuzzle,upperBound};
root.NONO_ADAPTIVE_SOLVER=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof self!=='undefined'?self:globalThis);
