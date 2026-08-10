// Iteration 6 PART C proofs: per-type templates - release (tracklist), era (cover grid + prev/next),
// member (inherit shell), BU (violet accent). CDP over --remote-debugging-pipe.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const BASE=process.argv[2]??'http://localhost:3021', SLUG=process.argv[3]??'bts', OUT=process.argv[4]??'docs/proofs/v3nav-iter6c';
mkdirSync(OUT,{recursive:true});
const chrome=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--remote-debugging-pipe','--disable-gpu','--hide-scrollbars','--force-device-scale-factor=1','--window-size=1440,900','--user-data-dir=/tmp/iter6c-prof','--no-first-run','--no-default-browser-check','about:blank'],{stdio:['ignore','inherit','inherit','pipe','pipe']});
const wp=chrome.stdio[3],rp=chrome.stdio[4];let id=1;const pend=new Map();let buf=Buffer.alloc(0);
rp.on('data',c=>{buf=Buffer.concat([buf,c]);let i;while((i=buf.indexOf(0))!==-1){const m=buf.subarray(0,i).toString();buf=buf.subarray(i+1);if(!m)continue;let o;try{o=JSON.parse(m)}catch{continue}if(o.id&&pend.has(o.id)){const{resolve,reject}=pend.get(o.id);pend.delete(o.id);o.error?reject(new Error(JSON.stringify(o.error))):resolve(o.result)}}});
const send=(method,params={},s)=>{const i=id++;const p={id:i,method,params};if(s)p.sessionId=s;return new Promise((res,rej)=>{pend.set(i,{resolve:res,reject:rej});wp.write(JSON.stringify(p)+'\0');setTimeout(()=>{if(pend.has(i)){pend.delete(i);rej(new Error('t '+method))}},30000)})};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
await sleep(700);
const {targetInfos}=await send('Target.getTargets');const t=targetInfos.find(x=>x.type==='page');
const {sessionId:S}=await send('Target.attachToTarget',{targetId:t.targetId,flatten:true});
await send('Page.enable',{},S);await send('Runtime.enable',{},S);
await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false},S);
const evalJs=async e=>{const r=await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true},S);return r.result.value};
const goto=async u=>{await send('Page.navigate',{url:u},S);await sleep(2000)};
const shot=async(name)=>{const h=Math.min(await evalJs('Math.max(document.body.scrollHeight,document.documentElement.scrollHeight)'),2400);const{data}=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width:1440,height:h,scale:1}},S);writeFileSync(`${OUT}/${name}.png`,Buffer.from(data,'base64'));console.log('saved '+name)};
for (const [slug,name] of [['map-of-the-soul-persona','release-tracklist'],['love-yourself','era-chapter'],['the-notes','bu-violet'],['jungkook','member']]) { await goto(`${BASE}/verse/${SLUG}/${slug}`); await shot(name); }
chrome.kill();await sleep(200);console.log('DONE');process.exit(0);
