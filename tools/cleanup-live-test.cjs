// Remove only the rooms and leaderboard entries captured by our live test.
const fs=require('node:fs'),cp=require('node:child_process'),path=require('node:path');
const project=process.argv[2];
if(project!=='nono-web-ishyun-20261020')throw Error('Specify the NONO project ID explicitly.');
const manifest=JSON.parse(fs.readFileSync('test-results/live-manifest.json','utf8'));
if(!manifest.rooms.every(v=>/^[A-HJ-NP-Z2-9]{6}$/.test(v))||!manifest.uids.every(v=>/^[\w-]{1,128}$/.test(v)))throw Error('Invalid test manifest');
const targets=[...manifest.rooms.map(v=>`/rooms/${v}`),...manifest.uids.flatMap(v=>[`/runs/heart5/${v}`,`/scores/heart5/${v}`])];
for(const target of targets)cp.execFileSync(process.execPath,[path.join(__dirname,'../node_modules/firebase-tools/lib/bin/firebase.js'),'database:remove',target,'--project',project,'--force'],{stdio:'inherit'});
console.log('Removed only the captured live-test rooms and records.');
