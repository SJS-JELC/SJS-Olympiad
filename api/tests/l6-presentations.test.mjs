import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateRecord} from '../src/presentation/record.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const numbers=[1,2,3,4,6,7,8,9];
const records=await Promise.all(numbers.map(async number=>(await import(`../src/presentation/records/l6p${number}.mjs`))[`l6p${number}Presentation`]));
const baseline=JSON.parse(readFileSync(resolve(root,'.scratch/protected-question-content/evidence/baseline-render-1920.json'),'utf8'));
for(const record of records){
 test(record.id+' validates complete presentation, rejects missing renderer data, and preserves baseline prose/labels',()=>{
  assert.equal(validateRecord(record),record);
  assert.throws(()=>record.validate({},new Set(record.assets.map(a=>a.id))));
  if(record.assets.length)assert.throws(()=>record.validate(record.presentation,new Set()));
  const capture=baseline.captures.find(item=>item.id===record.id);
  assert.ok(capture.text.toLowerCase().includes(record.presentation.title.toLowerCase()));
  for(const text of record.presentation.paragraphs??[])assert.ok(capture.text.includes(text),text);
  for(const item of record.presentation.parts??[])for(const field of item.fields){
   assert.ok(capture.text.includes(field.label) || capture.labels.some(label=>label.label===field.label || label.label?.startsWith(field.label+':')),field.label);
  }
 });
 test(record.id+' fixed assets preserve scientific source bytes and remain outside public imports',()=>{
  const number=record.id.slice(3),source=resolve(root,`src/questions/l6p${number}`);
  const originals=existsSync(resolve(source,'assets'))?readdirSync(resolve(source,'assets')).filter(name=>name.endsWith('.svg')).map(name=>readFileSync(resolve(source,'assets',name))):[];
  for(const asset of record.assets)assert.ok(originals.some(original=>original.equals(asset.body)),asset.id);
  const files=readdirSync(source).filter(name=>/\.(tsx?|css)$/.test(name));
  const text=files.map(name=>readFileSync(resolve(source,name),'utf8')).join('\n');
  assert.match(text,/protectedContent: true/);
  assert.match(text,new RegExp('requirePresentation<.*>\\(.*[\x27\x22]'+record.id+'[\x27\x22]'));
  assert.doesNotMatch(text,/from ['"]\.\/assets\/(?!the-ring|GO|RedCross|Tick)/);
  assert.doesNotMatch(text,/import .*presentation\/records/);
  assert.ok(!text.includes(record.presentation.title));
  for(const phrase of record.presentation.paragraphs??[])assert.ok(!text.includes(phrase));
 });
}
test('L6P3 static presentation contains no current or future oxyanion row data',()=>{
 const content=records.find(record=>record.id==='L6P3').presentation;
 assert.deepEqual(Object.keys(content).sort(),['renderer','title','parts','instructions','goLabel','revealPrefix','timerLabel','progressTotal','progressSuffix','progressJoin','answerLabel','submitLabel'].sort());
 const source=readFileSync(resolve(root,'src/questions/l6p3/L6Problem3.tsx'),'utf8');
 assert.match(source,/active \? run\?\.formula : null/);assert.match(source,/\{run\.revealed\}/);
});
test('L6P4 protected orbital hit geometry and accessible descriptions remain source exact',()=>{
 const content=records.find(record=>record.id==='L6P4').presentation;
 assert.deepEqual(content.panels.map(orbital=>orbital.positions),[
 [[19,50,46],[96,25,41],[168,50,45],[243,25,46],[317,50,46],[392,25,46]],
 [[20,50,46],[97,25,41],[170,50,45],[243,25,46],[317,50,46],[392,25,46]]]);
 for(const orbital of content.panels){assert.equal(orbital.viewWidth,448);assert.equal(orbital.viewHeight,169);}
 const broken=structuredClone(content);broken.panels[0].positions[0][0]=null;
 assert.throws(()=>records.find(record=>record.id==='L6P4').validate(broken,new Set(['example','reference1','reference2','empty','phase1','phase2'])));
});
test('L6 protected phrases and original scientific SVG bytes are absent from production output when built',()=>{
 const dist=resolve(root,'dist/assets');if(!existsSync(dist))return;
 const output=readdirSync(dist).map(name=>readFileSync(resolve(dist,name)));
 for(const record of records){
  for(const asset of record.assets)assert.ok(!output.some(bytes=>bytes.equals(asset.body) || bytes.toString('utf8').includes(asset.body.toString('base64')) || bytes.toString('utf8').includes(encodeURIComponent(asset.body.toString('utf8')))),record.id+':'+asset.id);
  for(const paragraph of record.presentation.paragraphs??[]){const line=paragraph.split('\n').sort((a,b)=>b.length-a.length)[0].slice(0,80);assert.ok(!output.some(bytes=>bytes.toString('utf8').includes(line)),record.id);}
 }
});
