/* Independent SAT/CNF uniqueness cross-check for generated nonograms.
 * Experimental benchmark implementation: NOT used to publish or accept puzzles.
 * Each clue line is compiled to a finite-state acceptor with Tseitin implications.
 * The CNF contains a blocking clause excluding the known reference solution.
 * SAT => second solution, UNSAT => unique; any exhausted budget => unknown.
 * This module has no external dependencies, browser or Node compatible.
 */
(function(root){
'use strict';
function runs(bits){const result=[];let count=0;for(const c of bits){if(c==='1')count++;else if(count){result.push(count);count=0;}}if(count)result.push(count);return result;}
function validLine(line,n){if(Array.isArray(line)&&line.length===1&&line[0]===0)return true;return Array.isArray(line)&&line.length>0&&line.every(x=>Number.isInteger(x)&&x>=1&&x<=n)&&line.reduce((a,b)=>a+b,0)+line.length-1<=n;}
function automaton(clue){
  if(clue.length===1&&clue[0]===0)clue=[];
  const gaps=Array.from({length:clue.length+1},(_,i)=>i),run=clue.map(()=>[]);
  let total=gaps.length;
  for(let j=0;j<clue.length;j++)for(let k=1;k<=clue[j];k++)run[j][k]=total++;
  const zero=new Int32Array(total).fill(-1),one=new Int32Array(total).fill(-1);
  for(let j=0;j<gaps.length;j++){zero[gaps[j]]=gaps[j];if(j<clue.length)one[gaps[j]]=run[j][1];}
  for(let j=0;j<clue.length;j++)for(let k=1;k<=clue[j];k++){
    const s=run[j][k];
    if(k<clue[j])one[s]=run[j][k+1];
    else zero[s]=gaps[j+1];
  }
  const accept=[gaps[clue.length]];
  if(clue.length)accept.push(run[clue.length-1][clue[clue.length-1]]);
  return {total,zero,one,accept};
}
function sameHint(actual,expected){return JSON.stringify(actual)===JSON.stringify(expected.length===1&&expected[0]===0?[]:expected);}
function buildCnf(puzzle,reference,maxVariables,maxClauses,deadline){
  const n=puzzle.size,cellCount=n*n,clauses=[],variables={count:cellCount};
  const cellVar=(axis,index,position)=>axis===0?index*n+position+1:position*n+index+1;
  const add=c=>{clauses.push(c);if(clauses.length>maxClauses)throw Error('budget');if((clauses.length&2047)===0&&Date.now()>=deadline)throw Error('time_budget');};
  function newVar(){if(++variables.count>maxVariables)throw Error('budget');if((variables.count&2047)===0&&Date.now()>=deadline)throw Error('time_budget');return variables.count;}
  for(let axis=0;axis<2;axis++)for(let index=0;index<n;index++){
    const m=automaton(axis===0?puzzle.rows[index]:puzzle.cols[index]);
    const fw=Array.from({length:n+1},()=>new Uint8Array(m.total));
    const bw=Array.from({length:n+1},()=>new Uint8Array(m.total));
    fw[0][0]=1;
    for(let i=0;i<n;i++)for(let s=0;s<m.total;s++)if(fw[i][s]){
      if(m.zero[s]>=0)fw[i+1][m.zero[s]]=1;
      if(m.one[s]>=0)fw[i+1][m.one[s]]=1;
    }
    for(const s of m.accept)bw[n][s]=1;
    for(let i=n-1;i>=0;i--)for(let s=0;s<m.total;s++){
      if((m.zero[s]>=0&&bw[i+1][m.zero[s]])||(m.one[s]>=0&&bw[i+1][m.one[s]]))bw[i][s]=1;
    }
    if(!bw[0][0])return {status:'invalid'};
    const states=Array.from({length:n+1},()=>new Int32Array(m.total));
    for(let i=0;i<=n;i++)for(let s=0;s<m.total;s++)if(fw[i][s]&&bw[i][s])states[i][s]=newVar();
    add([states[0][0]]);
    for(let i=0;i<n;i++)for(let s=0;s<m.total;s++)if(states[i][s]){
      const sv=states[i][s],cv=cellVar(axis,index,i);
      const z=m.zero[s]>=0?states[i+1][m.zero[s]]:0;
      const o=m.one[s]>=0?states[i+1][m.one[s]]:0;
      // If current state is active, the cell's choice forces the next state.
      // Invalid transitions are forbidden. Forward reachability means at
      // least one accepting DFA path is forced for every SAT assignment.
      add(z?[-sv,cv,z]:[-sv,cv]);
      add(o?[-sv,-cv,o]:[-sv,-cv]);
    }
  }
  // Require a different filled/empty value in at least one cell.
  add(Array.from({length:cellCount},(_,i)=>reference[i]==='1'?-(i+1):i+1));
  return {clauses,variables:variables.count,cellCount};
}
function dpll(cnf,reference,maxNodes,maxVisits,deadline){
  const clauses=cnf.clauses,size=cnf.variables,cellCount=cnf.cellCount;
  let nodes=0,visits=0,limited=false,timedOut=false,head=0;
  function checkTime(){if(Date.now()>=deadline){timedOut=true;limited=true;return true;}return false;}
  const assigned=new Int8Array(size+1),trail=[];
  const w1=new Uint16Array(clauses.length),w2=new Uint16Array(clauses.length);
  const watchers=Array.from({length:(size+1)*2+2},()=>[]);
  const watchIndex=l=>l>0?2*l:2*(-l)+1;
  const literalValue=l=>{const v=assigned[Math.abs(l)];return v===0?0:v===(l>0?1:-1)?1:-1;};
  function enqueue(lit){const varId=Math.abs(lit),value=lit>0?1:-1;
    if(assigned[varId]!==0)return assigned[varId]===value;
    assigned[varId]=value;trail.push(lit);return true;
  }
  for(let id=0;id<clauses.length;id++){
    const c=clauses[id];
    if(!c.length)return {status:'unsat',nodes:0,visits:0};
    const second=c.length>1?1:0;
    w1[id]=0;w2[id]=second;
    watchers[watchIndex(c[0])].push(id);
    if(second)watchers[watchIndex(c[1])].push(id);
    if(c.length===1&&!enqueue(c[0]))return {status:'unsat',nodes:0,visits:0};
  }
  function propagate(){
    while(head<trail.length){
      const falsified=-trail[head++],bucket=watchers[watchIndex(falsified)];
      for(let p=0;p<bucket.length;){
        if(++visits>maxVisits){limited=true;return false;}
        if((visits&1023)===0&&checkTime())return false;
        const id=bucket[p],c=clauses[id];
        const a=w1[id],b=w2[id];
        const isA=c[a]===falsified,watched=isA?a:b,other=isA?b:a;
        if(c[watched]!==falsified){p++;continue;}
        if(literalValue(c[other])===1){p++;continue;}
        let found=-1;
        for(let i=0;i<c.length;i++)if(i!==a&&i!==b&&literalValue(c[i])!==-1){found=i;break;}
        if(found>=0){
          if(isA)w1[id]=found;else w2[id]=found;
          bucket[p]=bucket[bucket.length-1];bucket.pop();
          watchers[watchIndex(c[found])].push(id);
          continue;
        }
        if(literalValue(c[other])===-1||!enqueue(c[other]))return false;
        p++;
      }
    }
    return true;
  }
  const priority=Array.from({length:cellCount},(_,i)=>i+1);
  const degree=new Uint32Array(cellCount+1);
  for(const c of clauses)for(const lit of c)if(Math.abs(lit)<=cellCount)degree[Math.abs(lit)]++;
  priority.sort((a,b)=>degree[b]-degree[a]||a-b);
  function backtrack(saved){
    while(trail.length>saved){const l=trail.pop();assigned[Math.abs(l)]=0;}
    head=trail.length;
  }
  // Explicit decision stack avoids JavaScript call-stack overflow on 75x75+ boards.
  function solve(){
    const branches=[];
    let entering=true;
    for(;;){
      if(entering){
        if(++nodes>maxNodes){limited=true;return false;}
        if((nodes&31)===0&&checkTime())return false;
        if(propagate()){
          let decision=0;
          for(const id of priority)if(assigned[id]===0){decision=id;break;}
          if(!decision)return true;
          const first=reference[decision-1]==='1'?-decision:decision;
          branches.push({saved:trail.length,first,second:false});
          if(enqueue(first)){entering=true;continue;}
        }
        if(limited)return false;
        entering=false;
      }
      // Either current assignment contradicted a clause or a child failed.
      // Undo to the saved branch point; try the opposite value exactly once.
      while(branches.length){
        const frame=branches[branches.length-1];
        backtrack(frame.saved);
        if(!frame.second){
          frame.second=true;
          if(enqueue(-frame.first)){entering=true;break;}
        }else branches.pop();
      }
      if(entering)continue;
      return false;
    }
  }
  const satisfiable=solve();
  if(limited)return {status:'unknown',reason:timedOut?'time_budget':'search_budget',nodes,visits};
  if(!satisfiable)return {status:'unsat',nodes,visits};
  return {status:'sat',nodes,visits,
    alternative:Array.from({length:cellCount},(_,i)=>assigned[i+1]===1?'1':'0').join('')};
}
function check(puzzle,reference,options={}){
  const n=puzzle?.size;
  if(!Number.isInteger(n)||n<5||n>100||!Array.isArray(puzzle.rows)||!Array.isArray(puzzle.cols)||
      puzzle.rows.length!==n||puzzle.cols.length!==n||
      typeof reference!=='string'||reference.length!==n*n||!/^[01]+$/.test(reference)||
      ![...puzzle.rows,...puzzle.cols].every(line=>validLine(line,n)))
    return {status:'invalid',nodes:0,visits:0};
  for(let index=0;index<n;index++){
    const row=runs(reference.slice(index*n,(index+1)*n));
    const col=runs(Array.from({length:n},(_,y)=>reference[y*n+index]).join(''));
    if(!sameHint(row,puzzle.rows[index])||
       !sameHint(col,puzzle.cols[index]))
      return {status:'invalid',nodes:0,visits:0};
  }
  const maxMs=Number.isFinite(options.maxMs)&&options.maxMs>=0?Math.min(options.maxMs,5000):Infinity;
  const deadline=maxMs===Infinity?Infinity:Date.now()+maxMs;
  const maxVariables=Number.isInteger(options.maxVariables)?options.maxVariables:40000;
  const maxClauses=Number.isInteger(options.maxClauses)?options.maxClauses:120000;
  let cnf;
  try{cnf=buildCnf(puzzle,reference,maxVariables,maxClauses,deadline);}
  catch(e){if(e.message==='budget'||e.message==='time_budget')return {status:'unknown',reason:e.message==='budget'?'encoding_budget':'time_budget',nodes:0,visits:0};throw e;}
  if(cnf.status==='invalid')return {status:'invalid',nodes:0,visits:0};
  if(Date.now()>=deadline)return {status:'unknown',reason:'time_budget',nodes:0,visits:0};
  const result=dpll(cnf,reference,
    Number.isInteger(options.maxNodes)?options.maxNodes:1200,
    Number.isInteger(options.maxVisits)?options.maxVisits:180000,deadline);
  const status=result.status==='sat'?'multiple':result.status==='unsat'?'unique':result.status;
  if(status==='multiple'){
    const other=result.alternative;
    if(other===reference)throw Error('SAT blocking clause violated');
    for(let index=0;index<n;index++){
      if(!sameHint(runs(other.slice(index*n,(index+1)*n)),puzzle.rows[index])||
         !sameHint(runs(Array.from({length:n},(_,y)=>other[y*n+index]).join('')),puzzle.cols[index]))
        throw Error('SAT produced an invalid alternate answer');
    }
  }
  return {status,method:'sat-dfa-blocking-dpll-v1',nodes:result.nodes,visits:result.visits,
    variables:cnf.variables,clauses:cnf.clauses.length,
    ...(result.reason?{reason:result.reason}:{}),
    ...(result.alternative?{alternative:result.alternative}:{})};
}

/** Compile a nonogram + blocked reference into CNF for an external CDCL solver.
 * No JavaScript DPLL is run here. Returns invalid/unknown rather than a proof
 * when the reference, clues or resource limits cannot be verified.
 */
function encode(puzzle,reference,options={}){
  const n=puzzle?.size;
  if(!Number.isInteger(n)||n<5||n>100||!Array.isArray(puzzle.rows)||!Array.isArray(puzzle.cols)||
     puzzle.rows.length!==n||puzzle.cols.length!==n||
     typeof reference!=='string'||reference.length!==n*n||!/^[01]+$/.test(reference)||
     ![...puzzle.rows,...puzzle.cols].every(line=>validLine(line,n)))
    return {status:'invalid'};
  for(let index=0;index<n;index++){
    const row=runs(reference.slice(index*n,(index+1)*n));
    const col=runs(Array.from({length:n},(_,y)=>reference[y*n+index]).join(''));
    if(!sameHint(row,puzzle.rows[index])||
       !sameHint(col,puzzle.cols[index]))
      return {status:'invalid'};
  }
  const remaining=Number.isFinite(options.maxMs)&&options.maxMs>=0?Math.min(options.maxMs,10000):10000;
  const deadline=Date.now()+remaining;
  let result;
  try{
    result=buildCnf(puzzle,reference,
      Number.isInteger(options.maxVariables)?options.maxVariables:700000,
      Number.isInteger(options.maxClauses)?options.maxClauses:1600000,
      deadline);
  }catch(e){
    if(e.message==='budget'||e.message==='time_budget')
      return {status:'unknown',reason:e.message==='budget'?'encoding_budget':'time_budget'};
    throw e;
  }
  if(result.status==='invalid')return {status:'invalid'};
  if(Date.now()>=deadline)return {status:'unknown',reason:'time_budget'};
  return {status:'encoded',clauses:result.clauses,variables:result.variables,cellCount:result.cellCount};
}
const api={check,encode};
root.NONO_RANDOM_SAT=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
