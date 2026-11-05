// Evidence-only comparison against the accepted pre-J08 migrations. This is
// intentionally outside build/API/CI: it needs the isolated baseline Git object.
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {presentationCatalogue,presentationRecord} from '../api/src/presentation/registry.mjs';
import {fixedAsset} from '../api/src/presentation/record.mjs';
const baseline='5f5c69b471937cbf0ba13d724466733ef7815a3c';
const original=path=>execFileSync('git',['-c','safe.directory='+resolve('.'),'show',baseline+':'+path],{encoding:'utf8'});
const renames={L6P4:{orbitals:'panels',phaseAssets:'choiceAssets',phaseLabel:'valueLabel'},L6P5:{conformations:'captions'},U5P8:{flask:'diagram',cap:'referenceDiagram'},U6P1:{nmr:'detail'},U6P8:{slowLabel:'annotation'}};
const gcAliases=JSON.parse(readFileSync(new URL('../.scratch/protected-question-content/evidence/j10-aliases.json',import.meta.url),'utf8'));
renames.U5P5=gcAliases.keys;
const selectors={...gcAliases.selectors,'u5p8-flask':'u5p8-diagram','u5p8-cap':'u5p8-reference-diagram'};
function normalize(value,id,path=[]){
 if(Array.isArray(value))return value.map((v,index)=>normalize(v,id,[...path,index]));
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>!(id==='U5P2'&&path.join('.')==='editor'&&key==='layoutId')).map(([key,v])=>[(renames[id]??{})[key]??key,normalize(v,id,[...path,key])]));
 if(typeof value==='string'&&path.at(-1)==='className')return value.split(' ').map(v=>selectors[v]??v).join(' ');
 return value;
}
function projected(current,expected){
 if(Array.isArray(expected)){assert.equal(current.length,expected.length);return current.map((v,i)=>projected(v,expected[i]));}
 if(expected&&typeof expected==='object')return Object.fromEntries(Object.entries(expected).map(([key,v])=>[key,projected(current[key],v)]));
 return current;
}
const checked=[];
for(const kind of ['question','practical'])for(const {id}of presentationCatalogue(kind)){
 const path='api/src/presentation/records/'+id.toLowerCase()+'.mjs';
 const code=original(path).replace(/^import .*;\s*$/gm,'').replace(/export const (\w+)\s*=/,'module.value=').replaceAll('import.meta.url',JSON.stringify(pathToFileURL(resolve(path)).href));
 const module={};new Function('fixedAsset','module',code)(fixedAsset,module);
 const previous=module.value,current=presentationRecord(kind,id),expected=normalize(previous.presentation,id),actual=normalize(current.presentation,id);
 assert.deepEqual(projected(actual,expected),expected,id+' scientific values changed');
 assert.equal(current.assets.length,previous.assets.length,id+' asset count');
 for(let i=0;i<current.assets.length;i++){assert.equal(current.assets[i].id,previous.assets[i].id);assert.deepEqual(current.assets[i].body,previous.assets[i].body,id+' scientific asset bytes changed');}
 checked.push({kind,id,previousVersion:previous.version,version:current.version,exactScientificValues:true,exactAssets:true});
}
const gc=original('src/questions/u5p5/GcInstrument.tsx'),start=gc.indexOf('const column ='),end=gc.indexOf('const sampleTravelFraction'),geometry=new Function(gc.slice(start,end)+'; return {tube,sampleTube};')();
const currentGc=presentationRecord('question','U5P5').presentation;
// Map the explicit key-only aliases back for the independent original geometry checks.
const reverseAliases=Object.fromEntries(Object.entries(gcAliases.keys).map(([old,key])=>[key,old]));
function originalKeys(value){if(Array.isArray(value))return value.map(originalKeys);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,v])=>[reverseAliases[key]??key,originalKeys(v)]));return value;}
const presentation=originalKeys(currentGc);
assert.equal(presentation.instrument.tube,geometry.tube);assert.equal(presentation.instrument.sampleTube,geometry.sampleTube);
assert.equal(presentation.instrument.viewBox,/<svg viewBox="([^"]+)"/.exec(gc)[1]);
const paths=[...gc.matchAll(/<path (?:[^>]*? )?d="([^"]+)"/g)].map(m=>m[1]);
assert.deepEqual([presentation.instrument.carrierInlet,presentation.instrument.injectorStem,presentation.instrument.injectorCap,presentation.instrument.detectorWave],paths);
for(const [tag,key]of [['ellipse','carrierTop'],['circle','detectorLight']]){const text=new RegExp('<'+tag+' ([^>]+)').exec(gc)[1],attributes=Object.fromEntries([...text.matchAll(/(cx|cy|r|rx|ry)="(-?[\d.]+)"/g)].map(m=>[m[1],Number(m[2])]));assert.deepEqual(presentation.instrument[key],attributes);}
const shapeNames=['housing','carrierBody','injectorBody','detectorBody'];
const rects=[...gc.matchAll(/<rect ([^>]+?)(?:\/>|>)/g)].map(m=>Object.fromEntries([...m[1].matchAll(/(x|y|width|height|rx)="(-?[\d.]+)"/g)].map(m=>[m[1],Number(m[2])])));
for(let i=0;i<shapeNames.length;i++)assert.deepEqual(presentation.instrument[shapeNames[i]],rects[i]);
const labels=[...gc.matchAll(/<text x="(-?[\d.]+)" y="(-?[\d.]+)"/g)].map(m=>({x:Number(m[1]),y:Number(m[2])}));
assert.deepEqual(Object.values(presentation.instrument.labels),labels);
const css=original('src/questions/u5p5/ScentsAndScentsibility.css');
for(let i=0;i<presentation.formulationColours.length;i++)assert.ok(css.includes('.gc-mixture-segment--'+i+', .gc-swatch--'+i+' { background: '+presentation.formulationColours[i]+'; }'));
const result={baseline,records:checked,instrumentPaths:true,instrumentRectangles:true,instrumentLabels:true,formulationColours:true,permittedSchemaChanges:renames,permittedSelectorChanges:selectors,removedMetadata:'U5P2 editor.layoutId: generic layout configuration replaces the named legacy selector'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n');
console.log('Exact scientific value/assets invariants passed for all38 records; GC apparatus paths, shapes, label positions and formulation colours match the accepted source.');
