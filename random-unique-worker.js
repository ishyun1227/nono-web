/* CaDiCaL CDCL SAT verification runs only in this module Worker.
 * Production generator registers a random puzzle ONLY if this Worker proves
 * UNSAT for "same row/column clues AND differs from known answer".
 * Encoding or solver errors, timeouts, and unknown are never approved.
 */
import { Cadical } from './vendor/cadical/index.js';
import './sat-nonogram-solver.js';

function lineRuns(bits){
  const result=[];let count=0;
  for(const bit of bits){
    if(bit==='1')count++;
    else if(count){result.push(count);count=0;}
  }
  if(count)result.push(count);
  return result;
}
function validAlternative(puzzle,reference,alternative){
  const n=puzzle.size;
  if(typeof alternative!=='string'||alternative.length!==reference.length||
     alternative===reference||!/^[01]+$/.test(alternative))return false;
  for(let i=0;i<n;i++){
    const row=lineRuns(alternative.slice(i*n,(i+1)*n));
    const col=lineRuns(Array.from({length:n},(_,y)=>alternative[y*n+i]).join(''));
    if(JSON.stringify(row)!==JSON.stringify(puzzle.rows[i])||
       JSON.stringify(col)!==JSON.stringify(puzzle.cols[i]))return false;
  }
  return true;
}
self.onmessage=async event=>{
  const {id,puzzle,mask,maxMs}=event.data||{};
  const started=Date.now(),budget=Math.min(5000,Math.max(0,Number(maxMs)||0));
  const deadline=started+budget;
  const send=(status,detail)=>self.postMessage({id,status,...(detail||{})});
  let solver;
  try{
    if(budget<=0){send('unknown',{reason:'time_budget'});return;}
    const compiled=self.NONO_RANDOM_SAT?.encode(puzzle,mask,{
      maxMs:Math.max(0,deadline-Date.now()),
      maxVariables:700000,maxClauses:1600000
    });
    if(!compiled||compiled.status!=='encoded'){
      send(compiled?.status||'error',{reason:compiled?.reason||'encoding_failed'});return;
    }
    if(Date.now()>=deadline){send('unknown',{reason:'time_budget'});return;}
    solver=await Cadical.create({quiet:true});
    if(Date.now()>=deadline){send('unknown',{reason:'time_budget'});return;}
    solver.setTerminate(()=>Date.now()>=deadline);
    solver.addClauses(compiled.clauses);
    if(Date.now()>=deadline){send('unknown',{reason:'time_budget'});return;}
    const decision=solver.solve();
    if(Date.now()>=deadline){send('unknown',{reason:'time_budget'});return;}
    if(decision==='unsatisfiable'){
      send('unique',{method:'cadical-cdcl-wasm'});return;
    }
    if(decision==='satisfiable'){
      const alternative=Array.from({length:mask.length},(_,i)=>solver.value(i+1)?'1':'0').join('');
      if(!validAlternative(puzzle,mask,alternative))
        throw Error('CaDiCaL alternate solution failed independent clue validation');
      send('multiple',{method:'cadical-cdcl-wasm'});return;
    }
    send('unknown',{reason:'solver_budget'});
  }catch(error){
    send('error',{reason:error?.message||'professional_solver_error'});
  }finally{
    try{solver?.dispose();}catch{}
  }
};
