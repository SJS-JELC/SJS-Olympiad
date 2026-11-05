import {describe,it,expect} from 'vitest';
import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import baseline from '../../.scratch/protected-question-content/evidence/baseline-render-1920.json';
// @ts-expect-error Node-only protected records must never enter the browser dependency graph.
import {u5p2Presentation} from '../../api/src/presentation/records/u5p2.mjs';
// @ts-expect-error Node-only protected record.
import {u5p3Presentation} from '../../api/src/presentation/records/u5p3.mjs';
// @ts-expect-error Node-only protected record.
import {u5p4Presentation} from '../../api/src/presentation/records/u5p4.mjs';
// @ts-expect-error Node-only protected record.
import {u5p5Presentation} from '../../api/src/presentation/records/u5p5.mjs';
// @ts-expect-error Node-only protected record.
import {u5p6Presentation} from '../../api/src/presentation/records/u5p6.mjs';
// @ts-expect-error Node-only protected record.
import {u5p7Presentation} from '../../api/src/presentation/records/u5p7.mjs';
// @ts-expect-error Node-only protected record.
import {u5p8Presentation} from '../../api/src/presentation/records/u5p8.mjs';
// @ts-expect-error Node-only protected record.
import {u5p9Presentation} from '../../api/src/presentation/records/u5p9.mjs';
// @ts-expect-error Node-only record schema validator.
import {validateRecord} from '../../api/src/presentation/record.mjs';
import {presentedDefinition} from '../../src/contracts/presentation';
import {questionCatalog} from '../../src/questions/catalog';

const records=[u5p2Presentation,u5p3Presentation,u5p4Presentation,u5p5Presentation,u5p6Presentation,u5p7Presentation,u5p8Presentation,u5p9Presentation];
describe('protected U5 scientific records',()=>{
 it.each(records.map(record=>[record.id,record] as const))('%s has a validated exact catalogue ID and neutral public definition',(_id,record)=>{
  expect(validateRecord(record)).toBe(record);
  const definition=questionCatalog.find(question=>question.definition.id===record.id)!.definition;
  expect(definition.protectedContent).toBe(true);
  expect(definition.title).toBe(`Question ${definition.number}`);
  expect(definition.parts.flatMap(part=>[part.label,...part.fields.map(field=>field.label)])).toEqual(expect.arrayContaining(['Response']));
  expect(presentedDefinition(definition,record.presentation).title).toBe(record.presentation.title);
  const capture=baseline.captures.find(capture=>capture.id===record.id)!;
  expect(capture.text).toContain(record.presentation.title.toUpperCase());
  for(const paragraph of record.presentation.paragraphs??[])expect(capture.text).toContain(paragraph);
  const ids=new Set<string>(record.assets.map((asset:{id:string})=>asset.id));
  expect(()=>record.validate({...record.presentation,renderer:'U5P1'},ids)).toThrow();
  expect(()=>record.validate(record.presentation,new Set([...ids,'unexpected']))).toThrow();
  const core=record.id==='U5P7'?'items':'paragraphs';
  expect(()=>record.validate({...record.presentation,[core]:[]},ids)).toThrow();
 });
 it('preserves Unicode, the original ring PNG and fixed references without GC recipe or future traces',()=>{
  expect(u5p2Presentation.presentation.paragraphs.join(' ')).toContain('N₂O');
  expect(u5p6Presentation.presentation.paragraphs.join(' ')).toContain('C₈H₈');
  expect(u5p8Presentation.presentation.paragraphs.join(' ')).toContain('mol/dm³');
  expect(u5p4Presentation.assets[0].body).toEqual(readFileSync(new URL('../../src/questions/u5p4/assets/heterocyclic-naming-original.png',import.meta.url)));
  expect(JSON.stringify(u5p5Presentation)).not.toMatch(/gcTraces|recipe|answerKey|expectedComposition|485/);
  expect(u5p7Presentation.presentation.items.map((item:{id:string})=>item.id)).toEqual(['C4H8','C3H4O','C10H22O','C2H2O','C4H11N','C2H6','C5H10','C2H5N','C50H98']);
 });
 it('rejects broken molecular connectivity and active/external diagram markup',()=>{
  const source=u5p3Presentation.presentation;
  expect(()=>u5p3Presentation.validate({...source,graph:{...source.graph,bonds:[{a:-1,b:2,order:1}]}},new Set())).toThrow();
  const sphere=u5p8Presentation.presentation;
  expect(()=>u5p8Presentation.validate({...sphere,diagram:{tag:'script',attributes:{},children:[]}},new Set())).toThrow();
  expect(()=>u5p8Presentation.validate({...sphere,diagram:{...sphere.diagram,attributes:{href:'https://example.com'}}},new Set())).toThrow();
 });
});

/** Audit actual transitive local imports; the intentional pilot help is a public exception. */
function dependencySources(entry:string,visited=new Map<string,string>()):Map<string,string>{
 const file=path.resolve(entry);if(visited.has(file))return visited;
 const source=readFileSync(file,'utf8');visited.set(file,source);
 if(!/\.[cm]?[jt]sx?$/.test(file))return visited;
 const runtime=source.replace(/^import\s+type\b[\s\S]*?;\s*/gm,'');
 for(const match of runtime.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)){
  const target=path.resolve(path.dirname(file),match[1]);
  const resolved=[target,...['.ts','.tsx','.js','.json','.css','/index.ts','/index.tsx'].map(extension=>target+extension)].find(candidate=>existsSync(candidate));
  if(resolved && /\.[cm]?[jt]sx?$|\.css$|\.json$/.test(resolved))dependencySources(resolved,visited);
 }
 return visited;
}
it('keeps competition payloads/assets outside editor/pilot and U5 browser imports',()=>{
 const entries=['src/pilot/Pilot.tsx','src/questions/u5p2/CrossYourFingers.tsx','src/questions/u5p3/Chainspotting.tsx','src/questions/u5p4/U5Problem4.tsx','src/questions/u5p5/ScentsAndScentsibility.tsx','src/questions/u5p6/U5Problem6.tsx','src/questions/double-trouble/DoubleTrouble.tsx','src/questions/u5p8/U5Problem8.tsx','src/questions/u5p7/U5Problem7.tsx'];
 for(const entry of entries){
  const files=dependencySources(entry);
  expect([...files.keys()].some(file=>/api[\\/]src[\\/]presentation/.test(file))).toBe(false);
  const combined=[...files.values()].join('\n');
  for(const record of records)for(const paragraph of record.presentation.paragraphs??[])expect(combined.includes(paragraph),entry+' duplicates '+record.id).toBe(false);
  expect(combined).not.toMatch(/heterocyclic-naming-original\.png|ozonolysis-products\.source\.json|polymer\.svg/);
 }
 expect(readFileSync('src/pilot/SkeletalHelp.tsx','utf8')).toContain('Butane · C₄H₁₀');
});
