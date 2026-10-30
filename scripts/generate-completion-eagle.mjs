// Reproduce the coarse stamp silhouette from the retained source artwork.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {chromium} from '@playwright/test';
const source='src/assets/powerapp/flipped-eagle.svg';
const sourceUrl=new URL('../'+source,import.meta.url),output=new URL('../src/components/completion-eagle.json',import.meta.url);
const bytes=await readFile(sourceUrl),browser=await chromium.launch();
let path;
try {
 const page=await browser.newPage();
 path=await page.evaluate(async svg=>{
  const image=new Image();image.src='data:image/svg+xml;base64,'+svg;await image.decode();
  const canvas=document.createElement('canvas');canvas.width=32;canvas.height=18;
  const context=canvas.getContext('2d');context.drawImage(image,0,0,32,18);const data=context.getImageData(0,0,32,18).data;
  let path='';
  for(let y=0;y<18;y++)for(let x=0;x<32;){if(data[(y*32+x)*4+3]<96){x++;continue;}const start=x;while(x<32&&data[(y*32+x)*4+3]>=96)x++;path+=`M${start} ${y}h${x-start}v1h-${x-start}z`;}
  return path;
 },bytes.toString('base64'));
} finally {await browser.close();}
const result=JSON.stringify({source,sourceSha256:createHash('sha256').update(bytes).digest('hex'),grid:[32,18],alphaThreshold:96,path},null,2)+'\n';
if(process.argv.includes('--check')) {if(await readFile(output,'utf8')!==result)throw Error('Completion eagle differs; regenerate it.');console.log('Completion eagle reproduction passed.');}
else {await writeFile(output,result);console.log('Wrote '+fileURLToPath(output));}
