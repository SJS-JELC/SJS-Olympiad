// Whole-catalogue browser graph and emitted-file boundary gate.
import {readFileSync,readdirSync,existsSync,statSync,writeFileSync} from 'node:fs';
import {resolve,dirname,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import {presentationRecord,presentationCatalogue} from '../api/src/presentation/registry.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),failures=[];
const files=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(resolve(dir,e.name)):[resolve(dir,e.name)]);
const name=p=>relative(root,p).replaceAll('\\','/'),sha=b=>createHash('sha256').update(b).digest('hex');
const inventory=JSON.parse(readFileSync(resolve(root,'.scratch/protected-question-content/evidence/baseline-inventory.json'),'utf8'));
const records=['question','practical'].flatMap(kind=>presentationCatalogue(kind).map(({id})=>presentationRecord(kind,id)));
const expected=['L5','U5','L6','U6'].flatMap(year=>Array.from({length:9},(_,i)=>year+'P'+(i+1))).filter(id=>id!=='U5P1');
if(records.length!==38 || expected.some(id=>!presentationRecord('question',id)) || ['L5','L6','U6'].some(id=>!presentationRecord('practical',id)) || presentationRecord('question','U5P1') || presentationRecord('practical','U5'))failures.push('Registry must contain exactly 35 theory and three practical records.');
const decoration=new Set(['src/questions/l5p4/assets/goblin.png','src/questions/u6p3/assets/spiro-dragon.png','src/questions/u5p6/assets/cubone.svg','src/questions/l6p7/assets/the-ring.png','src/assets/powerapp/flipped-eagle.svg','src/practicals/assets/cuttlefish.png']);
const references=new Set((inventory.files??[]).filter(f=>/\/(?:assets\/|protocols\.json$)|\.source\.json$/.test(f.path)&&/src\/(?:questions|practicals)\//.test(f.path)&&!decoration.has(f.path)&&!/l6p3\/assets\/(?:GO|RedCross|Tick)\.svg$/.test(f.path)).map(f=>f.path));
// Universally applicable interface words, SVG grammar and full-bank editor
// vocabulary. These exemptions do not exempt scientific IDs or configurations.
const generic=new Set('answer|question|response|name|count|diagram|drawing|drawings|groups|group|select|reset|example|reference|close|run|running|time|point|line|path|rect|svg|text|circle|polygon|polyline|defs|title|description|img|slider|dot|cross|triangle|hydrogen|carbon|nitrogen|oxygen|fluorine|chlorine|bromine|iodine|sulfur|sodium|magnesium|aluminium|silicon|phosphorus|lithium|potassium|calcium|boron|part|true|false|none|white|black|transparent|currentcolor|middle|start|end|evenodd|round|square|butt|bevel|miter|nonzero|xmidymid meet|xmidymid slice|visible|hidden|inherit|auto|bold|normal|italic|left|right|top|bottom|center|baseline|alphabetic|degrees|phase|empty|full|molecule|number|composition|atom|caption|element|correct|igcse|molecular drawing|molecular drawings|displayed|add|type-heading|type-caption|type-body|clippath|lineargradient|stop|marker|userspaceonuse|structures|skeletal|first|second|numpracticalresponse1|numpracticalresponse2|numpracticalresponse3|numpracticalresponse4'.split('|'));
const norm=s=>s.normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim(),markers=new Map();
function collect(v,id){if(typeof v==='string'){const s=norm(v);if((s.length>=3||/^\d+[a-z]/i.test(s))&&/[a-z\u0370-\u03ff]/i.test(s)&&!generic.has(s)&&!/^(?:#[a-f\d]{3,8}|(?:question|diagram|asset|part|field|response|group|item|label|image|table)\d+|[lu][56](?:p\d)?)$/i.test(s))markers.set(s,id);}else if(Array.isArray(v))v.forEach(x=>collect(x,id));else if(v&&typeof v==='object')Object.values(v).forEach(x=>collect(x,id));}
records.forEach(r=>collect(r.presentation,r.id));
// Compare semantic graph values and coordinate arrays, including rewritten JS
// object literals (property quoting/whitespace/minification do not bypass this).
const graphKeys=new Map(),coordinateKeys=new Map();
function graphKey(v){
 if(!v||!Array.isArray(v.atoms)||!Array.isArray(v.bonds)||!v.atoms.length)return;
 const coordinates=a=>a.position??[a.x,a.y];
 const atoms=[...v.atoms].sort((a,b)=>JSON.stringify([coordinates(a),a.element]).localeCompare(JSON.stringify([coordinates(b),b.element])));
 const indices=new Map(atoms.map((a,i)=>[a.id,i]));
 return JSON.stringify([atoms.map(a=>[a.element,coordinates(a),a.hydrogens??null,a.charge??null]),v.bonds.map(b=>{const left=indices.get(Array.isArray(b)?v.atoms[b[0]]?.id:b.a),right=indices.get(Array.isArray(b)?v.atoms[b[1]]?.id:b.b);return [Math.min(left,right),Math.max(left,right),Array.isArray(b)?1:b.order];}).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))]);
}
function scientificValues(v,id){if(!v||typeof v!=='object')return;const key=graphKey(v);if(key)graphKeys.set(key,id);if(Array.isArray(v)&&v.length>=3&&v.every(row=>Array.isArray(row)&&row.every(Number.isFinite))&&v.flat().length>=9)coordinateKeys.set(JSON.stringify(v),id);Object.values(v).forEach(x=>scientificValues(x,id));}
records.forEach(r=>scientificValues(r.presentation,r.id));
function staticValue(node){
 if(ts.isStringLiteralLike(node))return node.text;
 if(ts.isNumericLiteral(node))return Number(node.text);
 if(node.kind===ts.SyntaxKind.NullKeyword)return null;
 if(node.kind===ts.SyntaxKind.TrueKeyword)return true;
 if(node.kind===ts.SyntaxKind.FalseKeyword)return false;
 if(ts.isPrefixUnaryExpression(node)&&ts.isNumericLiteral(node.operand))return node.operator===ts.SyntaxKind.MinusToken?-Number(node.operand.text):Number(node.operand.text);
 if(ts.isArrayLiteralExpression(node)){const rows=node.elements.map(staticValue);return rows.some(v=>v===undefined)?undefined:rows;}
 if(ts.isObjectLiteralExpression(node)){const result={};for(const p of node.properties){if(!ts.isPropertyAssignment(p))return;const value=staticValue(p.initializer);if(value===undefined)return;result[p.name.text]=value;}return result;}
}
function checkValues(ast,label){function walk(node){if(ts.isObjectLiteralExpression(node)||ts.isArrayLiteralExpression(node)){const v=staticValue(node),g=graphKey(v);if(g&&graphKeys.has(g))failures.push(label+': protected molecular graph '+graphKeys.get(g));if(Array.isArray(v)&&coordinateKeys.has(JSON.stringify(v)))failures.push(label+': protected coordinate geometry '+coordinateKeys.get(JSON.stringify(v)));}ts.forEachChild(node,walk);}walk(ast);}

// Runtime property names and CSS selectors are code, so payload-value harvesting
// cannot discover them. Inspect parsed emitted/source code as a separate boundary.
const scientificRuntimeNames=new Set(['retentionTimes','carrier','injector','detector','carrierInlet','carrierBody','carrierTop','injectorStem','injectorCap','injectorBody','injectorSuffix','detectorWave','detectorBody','detectorLight','carrierDurationMs','carrierSpacing','carrierParticles','RETENTION_TIMES','Chromatogram','GcInstrument']);
function checkRuntimeNames(ast,label){function walk(node){if(ts.isIdentifier(node)&&scientificRuntimeNames.has(node.text) || ts.isStringLiteralLike(node)&&scientificRuntimeNames.has(node.text)&&((ts.isPropertyAssignment(node.parent)&&node.parent.name===node)||ts.isElementAccessExpression(node.parent)))failures.push(label+': protected scientific runtime key '+node.text);ts.forEachChild(node,walk);}walk(ast);}
const graph=new Map(),literals=new Map();
function dependency(parent,spec){if(!spec.startsWith('.'))return;const target=resolve(dirname(parent),spec.split('?')[0]),found=[target,...['.ts','.tsx','.js','.json','.css','/index.ts','/index.tsx'].map(e=>target+e)].find(p=>existsSync(p)&&statSync(p).isFile());if(found)visit(found);else failures.push(name(parent)+': unresolved import '+spec);}
function visit(p){if(graph.has(p))return;const bytes=readFileSync(p),source=bytes.toString('utf8');graph.set(p,bytes);if(name(p).startsWith('api/')||references.has(name(p)))failures.push(name(p)+': protected browser dependency');if(/\.css$/.test(p)){for(const m of source.matchAll(/(?:@import\s*|url\()\s*['"]?(\.[^'"\s)]+)/g))dependency(p,m[1]);return;}if(!/\.[cm]?[jt]sx?$/.test(p))return;const code=ts.transpileModule(source,{compilerOptions:{target:99,module:99,jsx:4}}).outputText,ast=ts.createSourceFile(p,code,99,true);function walk(n){if(ts.isStringLiteralLike(n)){const s=norm(n.text);if(!literals.has(s))literals.set(s,new Set());literals.get(s).add(name(p));}if((ts.isImportDeclaration(n)||ts.isExportDeclaration(n))&&n.moduleSpecifier&&ts.isStringLiteral(n.moduleSpecifier))dependency(p,n.moduleSpecifier.text);if(ts.isCallExpression(n)&&n.expression.kind===ts.SyntaxKind.ImportKeyword&&ts.isStringLiteral(n.arguments[0]))dependency(p,n.arguments[0].text);ts.forEachChild(n,walk);}walk(ast);if(!name(p).startsWith('src/pilot/')){checkValues(ast,name(p));checkRuntimeNames(ast,name(p));}}
visit(resolve(root,'src/main.tsx'));
for(const [s,id]of markers){const hits=[...(literals.get(s)??[])].filter(p=>!p.startsWith('src/pilot/') && !(s==='cubone' && p==='src/questions/u5p6/definition.ts' && /alt:\s*'Cubone'/.test(graph.get(resolve(root,p)).toString('utf8'))));if(hits.length)failures.push(id+': protected literal '+JSON.stringify(s)+' in '+hits.join(', '));}
const strict=/(?:c2h4o|c4h8|c3h9n|mass47|mass74|mass45|perovskite|\bgan\b|\bhomo\b|\blumo\b|\bmonomers\b|\bsn1\b|\bsn2\b|hclo|sf4|pcl5|\bn2o\b|phosphorus-pentachloride|sulfur-hexafluoride|citrus|floral|woody|mystery|u6p1-nmr|l6p4-orbital|l6p5-conformations|u5p8-flask|u6p8-rate-data|gc-chromatogram|gc-instrument|gc-tube-inner|gc-reduced-coil|retentionTimes|gc-carrier|gc-inject|gc-detector|carrierInlet|carrierBody|carrierTop|injectorStem|injectorCap|injectorBody|detectorWave|detectorBody|detectorLight)/i;
for(const [p,b]of graph)if(/\.[cm]?[jt]sx?$|\.css$/.test(p)){const s=b.toString('utf8'),code=/\.css$/.test(p)?s:ts.transpileModule(s,{compilerOptions:{target:99,module:99,jsx:4}}).outputText;if(strict.test(code))failures.push(name(p)+': clue-bearing runtime identifier/default');}
const bodies=records.flatMap(r=>r.assets.map(a=>a.body));for(const p of references)if(existsSync(resolve(root,p)))bodies.push(readFileSync(resolve(root,p)));
const hashes=new Set(bodies.map(sha)),geometries=new Set(bodies.filter(b=>b.toString('utf8').includes('<svg')).flatMap(b=>[...b.toString('utf8').matchAll(/\b(?:d|points)="([^"]{40,})"/g)].map(m=>norm(m[1]))));
const emitted=files(resolve(root,'dist'));
for(const p of emitted){const b=readFileSync(p),source=b.toString('utf8'),decoded=source.replace(/\\u([a-f\d]{4})/gi,(_,h)=>String.fromCharCode(parseInt(h,16))).replace(/\\["'\\]/g,m=>m[1]),text=norm(decoded);if(hashes.has(sha(b))||bodies.some(a=>source.includes(a.toString('base64'))))failures.push(name(p)+': protected asset bytes/base64');if(/\.(?:js|css|map|json|html|svg)$/.test(p)){if(/\.(?:js|map|json)$/.test(p)){const ast=ts.createSourceFile(p,decoded,99,true);checkValues(ast,name(p));checkRuntimeNames(ast,name(p));}if(strict.test(decoded))failures.push(name(p)+': clue-bearing emitted identifier/default');for(const [s,id]of markers)if(s.length>=16&&text.includes(s)&&!([...literals.get(s)??[]].length&&[...literals.get(s)].every(p=>p.startsWith('src/pilot/'))))failures.push(name(p)+': protected '+id+' text/geometry '+JSON.stringify(s.slice(0,90)));for(const s of geometries)if(text.includes(s))failures.push(name(p)+': protected SVG geometry');}}
const result={records:records.map(({kind,id,version})=>({kind,id,version})),browserGraph:[...graph].map(([p,b])=>({path:name(p),sha256:sha(b)})),emitted:emitted.map(p=>({path:name(p),bytes:readFileSync(p).length,sha256:sha(readFileSync(p))})),protectedRuntimeNames:[...scientificRuntimeNames],protectedGraphValues:graphKeys.size,protectedCoordinateArrays:coordinateKeys.size,protectedMarkers:markers.size,protectedAssetHashes:hashes.size,svgGeometryFragments:geometries.size,failures:[...new Set(failures)]};
if(process.env.PROTECTED_AUDIT_REPORT)writeFileSync(process.env.PROTECTED_AUDIT_REPORT,JSON.stringify(result,null,2)+'\n');
if(result.failures.length){console.error(result.failures.join('\n'));process.exitCode=1;}else console.log(`Protected boundary passed: ${records.length} records, ${graph.size} browser dependencies, ${emitted.length} emitted files, ${markers.size} text/ID markers, ${hashes.size} asset hashes, ${geometries.size} SVG fragments.`);
