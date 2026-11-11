/* Server-only v6 random nonogram candidate generator.
 * Adaptive classifies HUMAN-LOGICAL solvability, whereas a separately blocked
 * CaDiCaL UNSAT proof certifies a single mathematical answer.
 * No proof: no publication. This module never writes to Firebase.
 */
import {randomBytes} from 'node:crypto';
import {createRequire} from 'node:module';
import {Cadical} from 'cadical-wasm';
const require=createRequire(import.meta.url);
const random=require('../random-puzzles.js');
const adaptive=require('../adaptive-nonogram-solver.js');
const sat=require('../sat-nonogram-solver.js');

export const SIZES=Object.freeze([5,10,15,20,25,30,50,75,100]);
export const DIFFICULTIES=Object.freeze(['쉬움','보통','어려움','전문가']);
export const BUCKETS=Object.freeze(SIZES.flatMap(size=>DIFFICULTIES.map(difficulty=>({
  size,difficulty,key:size+'_'+difficulty
}))));
export function classify(size,logic){
  // Conservative: only a genuine logical fixpoint is "expert".
  // A timeout, step-budget, contradiction or malformed result is ungraded.
  if(logic?.status==='partial'&&logic.reason!=='target_fraction')
    return {difficulty:'전문가',score:null,method:'adaptive_stall'};
  if(logic?.status!=='solved'||logic.solved!==size*size||
     !Number.isInteger(logic.stats?.iterations))return null;
  // Provisional, reproducible normalized line-analysis effort (NOT a
  // validated measure of human difficulty). May be calibrated later.
  const score=logic.stats.iterations/(2*size);
  return {
    difficulty:score<=1.25?'쉬움':score<=1.8?'보통':'어려움',
    score:Math.round(score*10000)/10000,method:'adaptive_line_passes_v1'
  };
}
export function randomSeed(){return randomBytes(4).readUInt32LE(0);}
export function puzzleSpec(size,difficulty,seed){
  if(!SIZES.includes(size)||!DIFFICULTIES.includes(difficulty)||
     !Number.isSafeInteger(seed)||seed<0||seed>0xffffffff)
    throw Error('Invalid puzzle generator parameters');
  return {
    id:'random-'+size+'-'+DIFFICULTIES.indexOf(difficulty)+'-'+seed.toString(36),
    version:6,size,difficulty,seed
  };
}
export async function proveUnique(puzzle,reference,{maxMs=4000,createSolver=()=>Cadical.create({quiet:true})}={}){
  const started=Date.now(),deadline=started+maxMs;
  const cnf=sat.encode(puzzle,reference,{maxMs});
  if(cnf.status!=='encoded')return {status:'unknown',reason:'encode_'+(cnf.reason||cnf.status)};
  let solver;
  try{
    if(Date.now()>=deadline)return {status:'unknown',reason:'proof_time_budget'};
    solver=await createSolver();
    solver.setTerminate(()=>Date.now()>=deadline);
    solver.addClauses(cnf.clauses);
    if(Date.now()>=deadline)return {status:'unknown',reason:'proof_time_budget'};
    const result=solver.solve();
    if(Date.now()>=deadline)return {status:'unknown',reason:'proof_time_budget'};
    return result==='unsatisfiable'
      ?{status:'unique',proof:'reference_blocked_unsat',elapsedMs:Date.now()-started}
      :result==='satisfiable'?{status:'multiple'}:{status:'unknown',reason:'sat_unknown'};
  }catch(error){
    return {status:'unknown',reason:'sat_error',detail:String(error?.message||error).slice(0,120)};
  }finally{try{solver?.dispose();}catch{}}
}
export async function attempt({size,difficulty,seed=randomSeed(),logicMs=1500,proofMs=4000,
  solveLogic=adaptive.solve,certify=proveUnique}={}){
  const spec=puzzleSpec(size,difficulty,seed);
  const puzzle=random.fromSpec(spec),reference=random.answerFor(spec);
  const logic=solveLogic(puzzle,{maxMs:logicMs,captureTrace:false});
  const grade=classify(size,logic);
  if(!grade)return {status:'rejected',reason:'logic_unknown_or_invalid',spec,
    logicStatus:logic?.status,logicReason:logic?.reason};
  if(grade.difficulty!==difficulty)return {status:'rejected',reason:'wrong_difficulty',spec,grade};
  if(logic.status==='solved'&&logic.cells.join('')!==reference)
    return {status:'rejected',reason:'logic_solution_mismatch',spec};
  const proof=await certify(puzzle,reference,{maxMs:proofMs});
  if(proof.status!=='unique')
    return {status:'rejected',reason:'uniqueness_'+proof.status,spec,grade,proof};
  return {status:'accepted',spec:{
    ...spec,verified:true,verifiedBy:'cadical_reference_blocking_unsat_v1',
    difficultyMethod:grade.method,createdAt:Date.now(),
    ...(grade.score!==null?{logicScore:grade.score}:{})
  },grade,proof};
}
