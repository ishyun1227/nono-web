/* Dedicated UI-safe puzzle solver Worker. This worker FINDS a valid grid;
 * it cannot certify uniqueness. Puzzle publication continues to use the
 * separate random-unique-worker.js reference-blocking UNSAT verifier.
 */
import {Cadical} from './vendor/cadical/index.js';
import './adaptive-nonogram-solver.js';
import './sat-nonogram-solver.js';
import './hybrid-nonogram-solver.js';

self.onmessage=async event=>{
  const {id,puzzle,maxMs,captureTrace}=event.data||{};
  try{
    const budget=Number.isFinite(Number(maxMs))?Math.min(10000,Math.max(0,Number(maxMs))):10000;
    const output=await self.NONO_HYBRID_SOLVER.solve(puzzle,{
      maxMs:budget,captureTrace:captureTrace===true,
      createSolver:()=>Cadical.create({quiet:true})
    });
    self.postMessage({id,...output});
  }catch(error){
    self.postMessage({id,status:'error',reason:'solve_worker_error',
      detail:String(error?.message||error).slice(0,160),
      uniqueness:'not_checked'});
  }
};
