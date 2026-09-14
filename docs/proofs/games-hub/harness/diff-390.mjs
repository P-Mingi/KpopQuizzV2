import fs from 'fs'; import { PNG } from 'pngjs'; import pixelmatch from 'pixelmatch';
const mine=PNG.sync.read(fs.readFileSync(process.argv[2]));
const orac=PNG.sync.read(fs.readFileSync(process.argv[3]));
const my=parseInt(process.argv[4]),oc=parseInt(process.argv[5]),H=parseInt(process.argv[6]||'900');
function crop(src,ox,oy,w,h){const d=new PNG({width:w,height:h});for(let y=0;y<h;y++)for(let x=0;x<w;x++){const si=((oy+y)*src.width+(ox+x))<<2;const di=(y*w+x)<<2;d.data[di]=src.data[si];d.data[di+1]=src.data[si+1];d.data[di+2]=src.data[si+2];d.data[di+3]=src.data[si+3];}return d;}
const W=390;const A=crop(mine,0,my,W,H),B=crop(orac,0,oc,W,H);
const d=new PNG({width:W,height:H});const n=pixelmatch(A.data,B.data,d.data,W,H,{threshold:0.14,includeAA:false,alpha:0.4});
fs.writeFileSync(process.argv[7],PNG.sync.write(d));
console.log('top'+H+' mismatch='+(100*n/(W*H)).toFixed(2)+'%');
