import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validateRecord} from '../src/presentation/record.mjs';
const records=await Promise.all(Array.from({length:9},async(_,i)=>(await import(`../src/presentation/records/u6p${i+1}.mjs`))[`u6p${i+1}Presentation`]));
const root=new URL('../../',import.meta.url);
const read=relative=>readFileSync(new URL(relative,root),'utf8');
const files=url=>readdirSync(url,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(new URL(entry.name+'/',url)):[new URL(entry.name,url)]);
const digest=body=>createHash('sha256').update(body).digest('hex');
const originals={U6P1:['nmr.svg'],U6P3:['spiros.svg'],U6P4:['resonance.svg'],U6P5:['stereoisomers.svg'],U6P8:['sn1-mechanism.svg','sn2-mechanism.svg']};
for(const record of records){
 test(record.id+' validates payload and exact original protected assets',()=>{
  assert.equal(validateRecord(record),record);
  const ids=new Set(record.assets.map(asset=>asset.id));
  assert.throws(()=>record.validate({...record.presentation,text:[]},ids));
  assert.throws(()=>record.validate({...record.presentation,parts:[]},ids));
  if(record.assets.length)assert.throws(()=>record.validate(record.presentation,new Set()));
  const names=originals[record.id]??[];assert.equal(record.assets.length,names.length);
  names.forEach((name,index)=>assert.equal(digest(record.assets[index].body),digest(readFileSync(new URL(`src/questions/${record.id.toLowerCase()}/assets/${name}`,root)))));
 });
 test(record.id+' neutral fail-closed renderer has no static scientific dependency',()=>{
  const key=record.id.toLowerCase(),definition=read(`src/questions/${key}/definition.ts`),view=read(`src/questions/${key}/U6Problem${record.id.slice(-1)}.tsx`);
  assert.match(definition,/protectedContent:\s*true/);assert.match(definition,/title:\s*'Question \d'/);assert.match(view,/requirePresentation/);assert.match(view,/presentedDefinition/);
  const source=files(new URL(`src/questions/${key}/`,root)).filter(url=>/\.(tsx?|css)$/.test(url.pathname)).map(url=>readFileSync(url,'utf8')).join('\n');
  assert.doesNotMatch(source,/from ['"][^'"]+\/assets\/(?!spiro-dragon|powerapp\/flipped-eagle\.svg)/);
  const markers=[record.presentation.title,...record.presentation.text.filter(text=>text.trim().length>18),...(record.presentation.options??[])];
  for(const marker of markers)assert.equal(source.includes(marker),false,marker);
  const dist=new URL('dist/',root);
  if(existsSync(dist))for(const file of files(dist)){
   const body=readFileSync(file),text=body.toString('utf8');
   for(const marker of markers)assert.equal(text.includes(marker),false,file.pathname+': '+marker);
   for(const asset of record.assets){assert.equal(body.includes(asset.body),false);assert.equal(text.includes(asset.body.toString('base64')),false);}
  }
 });
}
test('NMR, overlay geometry and point-group options fail closed',()=>{
 const [nmr,overlay,groups]=[records[0],records[7],records[8]];
 assert.throws(()=>nmr.validate({...detail.presentation,detail:{...detail.presentation.detail,initialCenter:999}},new Set(['spectrum'])));
 assert.throws(()=>overlay.validate({...overlay.presentation,annotation:{}},new Set(['diagram0','diagram1'])));
 assert.throws(()=>groups.validate({...groups.presentation,options:[]},new Set()));
 assert.throws(()=>groups.validate({...groups.presentation,operations:[]},new Set()));
});
