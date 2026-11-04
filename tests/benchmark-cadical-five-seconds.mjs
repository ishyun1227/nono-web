/* Real CaDiCaL benchmark. npm ci && node tests/benchmark-cadical-five-seconds.mjs
 * Runs each size in an independent process. Deadline includes encoding, loading,
 * solving and model checking. 'unknown' is NEVER a uniqueness proof.
 */
import {spawnSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
const limit=5000,hardLimit=5200,sizes=[5,10,15,20,25,30,50,75,100];
const single=process.argv.indexOf('--single');
if(single>=0){
  const n=Number(process.argv[single+1]),fixture=process.argv.includes('--unique');
  const begin=performance.now(),deadline=Date.now()+limit;
  let solver;
  try{
    const {Cadical}=await import('cadical-wasm');
    const {createRequire}=await import('node:module');
    const require=createRequire(import.meta.url);
    const gen=require('../random-puzzles.js'),sat=require('../sat-nonogram-solver.js');
    const p=fixture?{size:n,rows:Array.from({length:n},()=>[n]),cols:Array.from({length:n},()=>[n])}:gen.fromSpec({size:n,difficulty:'보통',seed:100,version:4});
    const ref=fixture?'1'.repeat(n*n):gen.answerFor(p);
    const cnf=sat.encode(p,ref,{maxMs:Math.max(0,deadline-Date.now()),maxVariables:700000,maxClauses:1600000});
    let status='unknown',reason='';
    if(cnf.status==='encoded'&&Date.now()<deadline){
      solver=await Cadical.create({quiet:true});
      if(Date.now()<deadline){
        solver.setTerminate(()=>Date.now()>=deadline);
        solver.addClauses(cnf.clauses);
        const result=Date.now()>=deadline?'unknown':solver.solve();
        status=Date.now()>=deadline?'unknown':result==='unsatisfiable'?'unique':result==='satisfiable'?'multiple':'unknown';
        if(status==='multiple'){
          const other=Array.from({length:n*n},(_,i)=>solver.value(i+1)?'1':'0').join('');
          const clues=bits=>(bits.match(/1+/g)||[]).map(v=>v.length),equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
          if(other===ref)throw Error('Blocked reference returned');
          for(let i=0;i<n;i++)if(!equal(clues(other.slice(i*n,(i+1)*n)),p.rows[i])||
            !equal(clues(Array.from({length:n},(_,y)=>other[y*n+i]).join('')),p.cols[i]))
              throw Error('Invalid alternative model');
        }
        reason=status==='unknown'?'time_budget':'';
      }
    }else reason=cnf.reason||'time_budget';
    console.log(JSON.stringify({size:n,case:fixture?'unique_fixture':'random',status,reason,
      elapsedMs:+(performance.now()-begin).toFixed(1)}));
  }catch(error){
    console.error(error?.stack||error);process.exitCode=1;
  }finally{solver?.dispose();}
}else{
  const cases=[{n:5,fixture:true},{n:20,fixture:true},...sizes.map(n=>({n,fixture:false}))];
  const results=[];
  for(const {n,fixture} of cases){
    const start=performance.now(),args=[new URL(import.meta.url).pathname,'--single',String(n)];
    if(fixture)args.push('--unique');
    const proc=spawnSync(process.execPath,args,{encoding:'utf8',timeout:hardLimit,maxBuffer:1024*1024});
    let result;
    if(proc.error?.code==='ETIMEDOUT')result={size:n,case:fixture?'unique_fixture':'random',status:'unknown',reason:'hard_timeout'};
    else if(proc.status!==0)result={size:n,case:fixture?'unique_fixture':'random',status:'error',reason:(proc.stderr||proc.error?.message||'child_failure').slice(0,200)};
    else{try{result=JSON.parse(proc.stdout.trim().split('\n').at(-1));}
      catch{result={size:n,status:'error',reason:'invalid_child_output'};}}
    result.wallMs=+(performance.now()-start).toFixed(1);
    results.push(result);console.log(JSON.stringify(result));
  }
  console.table(results);
  if(results.some(x=>x.status==='error'))process.exitCode=1;
}
