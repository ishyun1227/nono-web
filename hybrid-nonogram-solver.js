/* Runtime nonogram SOLVING strategy: Adaptive to a logical fixpoint,
 * followed by CaDiCaL if (and only if) line deductions are genuinely stuck.
 * Finding one solution is NOT a uniqueness proof. Uniqueness certification
 * remains an independent reference-blocking SAT/UNSAT operation.
 *
 * This engine is run in hybrid-solve-worker.js to keep WASM off the UI thread.
 * createSolver is injected so Node integration tests use the exact same code.
 */
(function(root){
'use strict';
const adaptive=root.NONO_ADAPTIVE_SOLVER||
  (typeof require==='function'?require('./adaptive-nonogram-solver.js'):null);
const sat=root.NONO_RANDOM_SAT||
  (typeof require==='function'?require('./sat-nonogram-solver.js'):null);
function runs(values){const a=[];let count=0;
  for(const value of values){if(value===1)count++;else if(count){a.push(count);count=0;}}
  if(count)a.push(count);
  return a;
}
function matchesClues(cells,puzzle){
  const n=puzzle.size;
  if(!Array.isArray(cells)||cells.length!==n*n||
     cells.some(x=>x!==0&&x!==1))return false;
  for(let k=0;k<n;k++){
    const row=runs(cells.slice(k*n,(k+1)*n));
    const col=runs(Array.from({length:n},(_,y)=>cells[y*n+k]));
    const expectedRow=puzzle.rows[k][0]===0?[]:puzzle.rows[k];
    const expectedCol=puzzle.cols[k][0]===0?[]:puzzle.cols[k];
    if(JSON.stringify(row)!==JSON.stringify(expectedRow)||
       JSON.stringify(col)!==JSON.stringify(expectedCol))return false;
  }
  return true;
}
async function solve(puzzle,options={}){
  const maxMs=Number.isFinite(options.maxMs)?
    Math.max(0,Math.min(10000,options.maxMs)):10000;
  const deadline=Date.now()+maxMs,now=()=>Math.max(0,deadline-Date.now());
  const incomplete=(status,reason,logic,details={})=>({
    status,reason,cells:logic?.cells??[],logicStatus:logic?.status??null,
    logicSolved:logic?.solved??0,satCalled:false,
    uniqueness:'not_checked',...details
  });
  if(!adaptive?.validPuzzle(puzzle)||!sat?.encodeForSolve)
    return incomplete('invalid','invalid_clues',null);
  if(maxMs===0)return incomplete('unknown','time_budget',null);
  const logic=adaptive.solve(puzzle,{maxMs:now(),captureTrace:options.captureTrace===true});
  if(logic.status==='invalid')return incomplete('invalid',logic.reason||'logic_contradiction',logic);
  if(logic.status==='solved'){
    if(!matchesClues(logic.cells,puzzle))
      return incomplete('invalid','logic_answer_invalid',logic);
    return {status:'solved',method:'adaptive',cells:logic.cells,
      logicStatus:'solved',logicSolved:logic.solved,satCalled:false,
      uniqueness:'not_checked',...(options.captureTrace?{trace:logic.trace}:{})};
  }
  if(logic.status!=='partial')return incomplete('unknown',logic.reason||'logic_budget',logic);
  // Do not transfer before genuine logical stagnation.
  if(now()<=0)return incomplete('unknown','time_budget',logic);
  const known=logic.cells;
  const encoded=sat.encodeForSolve(puzzle,{
    maxMs:now(),maxVariables:700000,maxClauses:1600000
  });
  if(encoded.status!=='encoded')
    return incomplete(encoded.status==='invalid'?'invalid':'unknown',
      encoded.reason||encoded.status,logic,{satCalled:false});
  for(let i=0;i<known.length;i++){
    if(known[i]===1)encoded.clauses.push([i+1]);
    else if(known[i]===0)encoded.clauses.push([-(i+1)]);
  }
  if(typeof options.createSolver!=='function')
    return incomplete('invalid','solver_factory_missing',logic);
  let instance,called=false;
  try{
    if(now()<=0)return incomplete('unknown','time_budget',logic);
    instance=await options.createSolver();
    if(!instance||typeof instance.setTerminate!=='function'||
       typeof instance.addClauses!=='function'||typeof instance.solve!=='function'||
       typeof instance.value!=='function')throw Error('invalid_cadical_instance');
    if(now()<=0)return incomplete('unknown','time_budget',logic);
    instance.setTerminate(()=>now()<=0);
    instance.addClauses(encoded.clauses);
    if(now()<=0)return incomplete('unknown','time_budget',logic);
    called=true;
    const verdict=instance.solve();
    if(now()<=0)return incomplete('unknown','time_budget',logic,{satCalled:true});
    if(verdict==='unsatisfiable')
      return incomplete('invalid','contradictory_clues_or_deductions',logic,{satCalled:true});
    if(verdict!=='satisfiable')
      return incomplete('unknown','sat_budget',logic,{satCalled:true});
    const cells=Array.from({length:puzzle.size*puzzle.size},(_,i)=>instance.value(i+1)?1:0);
    if(!matchesClues(cells,puzzle))
      return incomplete('invalid','sat_answer_clue_mismatch',logic,{satCalled:true});
    for(let i=0;i<known.length;i++)if(known[i]>=0&&known[i]!==cells[i])
      return incomplete('invalid','sat_answer_logic_mismatch',logic,{satCalled:true});
    return {status:'solved',method:'adaptive_then_cadical',cells,
      logicStatus:'partial',logicSolved:logic.solved,satCalled:true,
      uniqueness:'not_checked',...(options.captureTrace?{trace:logic.trace}:{})};
  }catch(error){
    return incomplete('error','sat_error',logic,{satCalled:called,
      detail:String(error?.message||error).slice(0,160)});
  }finally{
    try{instance?.dispose();}catch{}
  }
}
const api={solve,matchesClues};
root.NONO_HYBRID_SOLVER=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof self!=='undefined'?self:globalThis);
