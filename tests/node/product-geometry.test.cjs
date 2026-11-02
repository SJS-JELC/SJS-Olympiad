const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
test('fixed products preserve all bonds and C-H vectors while extending C-C/C-O by 1.45',()=>{
 const base='scripts/u5p7-rdkit-base/',assets='src/questions/u5p7/assets/';
 const oldLabels=JSON.parse(read(base+'ozonolysis-products.labels.json')).labels;
 const newLabels=JSON.parse(read(assets+'ozonolysis-products.labels.json')).labels;
 assert.equal(newLabels.length,30);assert.deepEqual(newLabels.map(row=>row.text),oldLabels.map(row=>row.text));
 assert.equal(newLabels.filter(row=>row.text==='C').length,10);assert.equal(newLabels.filter(row=>row.text==='H').length,16);assert.equal(newLabels.filter(row=>row.text==='O').length,4);
 const groups=[...read(base+'ozonolysis-products.svg').matchAll(/<g\b[^>]*>([\s\S]*?)<\/g>/g)];
 const updated=[...read(assets+'ozonolysis-products.svg').matchAll(/<g\b[^>]*>([\s\S]*?)<\/g>/g)];
 assert.equal(groups.length,2);assert.equal(updated.length,2);
 let offset=0;
 for(let index=0;index<2;index++){
  const bonds=new Map([...groups[index][1].matchAll(/class="bond-(\d+) atom-(\d+) atom-(\d+)"/g)].map(match=>[match[1],[Number(match[2]),Number(match[3])]]));
  assert.deepEqual([...updated[index][1].matchAll(/class="(bond-\d+ atom-\d+ atom-\d+)"/g)].map(match=>match[1]),[...groups[index][1].matchAll(/class="(bond-\d+ atom-\d+ atom-\d+)"/g)].map(match=>match[1]));
  for(const [a,b] of bonds.values()){
   const oldA=oldLabels[offset+a],oldB=oldLabels[offset+b],newA=newLabels[offset+a],newB=newLabels[offset+b];
   const factor=oldA.text==='H'||oldB.text==='H'?1:1.45;
   for(const axis of ['x','y'])assert.ok(Math.abs((newB[axis]-newA[axis])-(oldB[axis]-oldA[axis])*factor)<.005,`Bond ${a}-${b} ${axis} vector changed`);
  }
  offset+=index===0?4:26;
 }
});
