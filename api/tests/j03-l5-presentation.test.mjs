import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validateRecord} from '../src/presentation/record.mjs';

const root=new URL('../../',import.meta.url);
const baseline=JSON.parse(readFileSync(new URL('tests/fixtures/protected-l5-scientific.json',root),'utf8'));
const hash=body=>createHash('sha256').update(body).digest('hex');
for(let number=1;number<=9;number++) {
 const id='L5P'+number,slug=id.toLowerCase();
 const record=(await import('../src/presentation/records/'+slug+'.mjs'))[slug+'Presentation'];
 const expected=baseline.questions[id];
 test(id+' retains the pinned scientific text, fields, accessible descriptions and geometry',()=>{
  assert.equal(validateRecord(record),record);
  const content=record.presentation;
  assert.equal(content.title,expected.title);
  assert.deepEqual(content.parts,expected.parts);
  for(const [actual,key] of [['paragraphs','paragraphs'],['descriptions','descriptions'],['fieldLabels','labels'],['accessibleLabels','accessibleLabels']])assert.deepEqual(content[actual]??[],expected[key]);
  if(number===7)assert.deepEqual(content.captions,expected.captions);
  if(number===9){assert.equal(content.wording,expected.wording);assert.deepEqual(content.items.map(item=>item.label),expected.itemLabels);assert.deepEqual(content.items.map(item=>item.id),expected.itemIds);}
  const expectedHashes=Object.entries(expected.assets).filter(([name])=>name!=='gan.svg').map(([,digest])=>digest).sort();
  const actualHashes=record.assets.filter(asset=>number!==7 || asset.id!=='diagram2').map(asset=>hash(asset.body)).sort();
  assert.deepEqual(actualHashes,expectedHashes);
  if(number===7){const provenance=JSON.parse(readFileSync(new URL('api/src/presentation/assets/l5p7/raster-provenance.json',root),'utf8'));assert.equal(provenance.sourceSha256,expected.assets['gan.svg']);assert.equal(hash(record.assets.find(asset=>asset.id==='diagram2').body),provenance.outputSha256);}
 });
 test(id+' fails closed for missing renderer fields and asset references',()=>{
  const assetIds=new Set(record.assets.map(asset=>asset.id));
  const content=structuredClone(record.presentation);delete content[number===9?'items':'paragraphs'];
  assert.throws(()=>record.validate(content,assetIds));
  if(assetIds.size){assetIds.delete(assetIds.values().next().value);assert.throws(()=>record.validate(record.presentation,assetIds));}
 });
 test(id+' public renderer and definition contain no protected copy or asset import',()=>{
  const view=readFileSync(new URL('src/questions/'+slug+'/L5Problem'+number+'.tsx',root),'utf8');
  const definition=readFileSync(new URL('src/questions/'+slug+'/definition.ts',root),'utf8');
  assert.match(view,/requirePresentation</);assert.match(view,/presentedDefinition\(/);
  assert.match(definition,/protectedContent:\s*true/);assert.match(definition,new RegExp('Question '+number));
  assert.doesNotMatch(view,/from ['"]\.\/assets\//);
  assert.doesNotMatch(view+definition,/api\/src\/presentation|data:image|fallback/i);
  for(const text of [expected.title,...expected.paragraphs,...expected.descriptions,...expected.labels,...expected.accessibleLabels].filter(value=>value.length>3))assert.equal((view+definition).includes(text),false,'Public scientific copy: '+text);
  if(number===9){assert.doesNotMatch(definition,/l5p9Items/);for(const item of expected.itemIds)assert.equal((view+definition).includes(item),false);}
 });
}
