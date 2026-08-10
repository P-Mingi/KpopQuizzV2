import { spawn } from 'node:child_process';
const chrome=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--remote-debugging-pipe','--disable-gpu','--hide-scrollbars','--window-size=1440,900','--user-data-dir=/tmp/ver-prof','--no-first-run','about:blank'],{stdio:['ignore','inherit','inherit','pipe','pipe']});
const wp=chrome.stdio[3],rp=chrome.stdio[4];let id=1;const pend=new Map();let buf=Buffer.alloc(0);
rp.on('data',c=>{buf=Buffer.concat([buf,c]);let i;while((i=buf.indexOf(0))!==-1){const m=buf.subarray(0,i).toString();buf=buf.subarray(i+1);if(!m)continue;let o;try{o=JSON.parse(m)}catch{continue}if(o.id&&pend.has(o.id)){const{resolve,reject}=pend.get(o.id);pend.delete(o.id);o.error?reject(new Error(JSON.stringify(o.error))):resolve(o.result)}}});
const send=(m,p={},s)=>{const i=id++;const q={id:i,method:m,params:p};if(s)q.sessionId=s;return new Promise((res,rej)=>{pend.set(i,{resolve:res,reject:rej});wp.write(JSON.stringify(q)+'\0');setTimeout(()=>{if(pend.has(i)){pend.delete(i);rej(new Error('t'))}},25000)})};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
await sleep(700);
const {targetInfos}=await send('Target.getTargets');const t=targetInfos.find(x=>x.type==='page');
const {sessionId:S}=await send('Target.attachToTarget',{targetId:t.targetId,flatten:true});
await send('Page.enable',{},S);await send('Runtime.enable',{},S);
await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false},S);
const probe=`(()=>{const s=document.querySelector('.v-sidenav'),f=document.querySelector('footer'),m=document.querySelector('.v-navmain');
 const sb=s&&s.getBoundingClientRect(),fb=f&&f.getBoundingClientRect(),mb=m&&m.getBoundingClientRect();const y=window.scrollY;
 const open=document.querySelector('.v-side-open'),rail=document.querySelector('.v-side-rail');
 return JSON.stringify({path:location.pathname,sidebarTop:sb?Math.round(sb.top+y):null,gapToFooter:(sb&&fb)?Math.round(fb.top-sb.bottom):null,
  sidebarW:sb?Math.round(sb.width):null, contentLeft:mb?Math.round(mb.left):null,
  state: open&&getComputedStyle(open).display!=='none'?'OPEN':(rail&&getComputedStyle(rail).display!=='none'?'RAIL':'?'),
  footerBg:f?getComputedStyle(f).backgroundColor:null, htmlAttr:document.documentElement.getAttribute('data-verse-nav')});})()`;
const go=async(url)=>{await send('Page.navigate',{url},S);await sleep(2000);const r=await send('Runtime.evaluate',{expression:probe,returnByValue:true},S);console.log(r.result.value);};
console.log('--- defaults (no cookie) ---');
await go('http://localhost:3021/verse/bts');            // home -> OPEN
await go('http://localhost:3021/verse/bts/jamais-vu');  // short content -> RAIL
await go('http://localhost:3021/verse/bts/love-yourself');
console.log('--- after clicking EXPAND on a content page (cookie=open) ---');
await send('Runtime.evaluate',{expression:`document.querySelector('.v-rail-toggle').click()`},S);await sleep(400);
await send('Runtime.evaluate',{expression:probe,returnByValue:true},S).then(r=>console.log(r.result.value));
console.log('--- navigate to ANOTHER content page: should STAY open ---');
await go('http://localhost:3021/verse/bts/jamais-vu');
console.log('--- fold again (cookie=rail), then check the HOME obeys it ---');
await send('Runtime.evaluate',{expression:`document.querySelector('.v-side-collapse').click()`},S);await sleep(400);
await go('http://localhost:3021/verse/bts');
chrome.kill();process.exit(0);
