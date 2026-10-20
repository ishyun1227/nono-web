// Generate a live-backend variant of the same browser scenarios.
const fs=require('node:fs');
let source=fs.readFileSync('tests/browser-multiplayer.cjs','utf8');
source=source.replace(/ const env=await initializeTestEnvironment\([\s\S]*?await env.withSecurityRulesDisabled\([^\n]+\n/,
 " const env={cleanup:async()=>{}};const manifest={rooms:[],uids:[]};\n");
source=source.replace(/if\(file==='\/firebase-config.js'\)return res.end\([^\n]*?;const target=/,
 "if(file==='/firebase-config.js')return res.end(fs.readFileSync('firebase-config.js'));const target=");
source=source.replace(/a.goto\('http:\/\/127.0.0.1:4173'\),b.goto\('http:\/\/127.0.0.1:4173'\)/,
 "a.goto(process.env.NONO_LIVE_URL||'http://127.0.0.1:4173'),b.goto(process.env.NONO_LIVE_URL||'http://127.0.0.1:4173')");
source=source.replace("await a.fill('#nickname','Alice');await b.fill('#nickname','Bob');",
 "manifest.uids=await Promise.all([a.evaluate(()=>currentId()),b.evaluate(()=>currentId())]);await a.fill('#nickname','NONO-QA-A');await b.fill('#nickname','NONO-QA-B');");
source=source.replace("const coop=new URL(a.url()).searchParams.get('room');", "const coop=new URL(a.url()).searchParams.get('room');manifest.rooms.push(coop);");
source=source.replace("const race=new URL(a.url()).searchParams.get('room');", "const race=new URL(a.url()).searchParams.get('room');manifest.rooms.push(race);");
source=source.replaceAll("getByText('Alice')","getByText('NONO-QA-A')").replaceAll("getByText('1위 Alice')","getByText('1위 NONO-QA-A')");
source=source.replaceAll("path:'test-results/", "path:'test-results/live-");
source=source.replace("}finally{await browser.close();", "}finally{fs.writeFileSync('test-results/live-manifest.json',JSON.stringify(manifest));await browser.close();");
fs.writeFileSync('tests/live-generated.cjs',source);
