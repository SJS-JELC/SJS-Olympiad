import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {dirname,resolve,relative,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const files=directory=>readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(resolve(directory,entry.name)):[resolve(directory,entry.name)]);
const failures=[];
const privateIdentifiers=/\b(?:expectedMonomers|matchesMonomers|matchesContributor|markDiagram|fragmentKeys|orbitalKeys|pointGroupKeys)\b/;
// Distinct textual keys, never common scientific numbers or visible source formulae.
const privateText=/vanadium|bicyclo\[4\.3\.1\]decane|4-hydroxycyclohexanone|6-methylspiro\[2\.3\]hexan-4-ol|zbut2enedioicacid|H,H=F,H/i;
for(const path of files(resolve(root,'src')).filter(path=>/\.[cm]?[jt]sx?$/.test(path)&&!path.endsWith('.d.ts'))){
 const source=readFileSync(path,'utf8');
 const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const ast=ts.createSourceFile(path,compiled,ts.ScriptTarget.Latest,true);
 const checkImport=spec=>{
   const target=spec.startsWith('.')?resolve(dirname(path),spec):'';
   const apiRelative=target?relative(resolve(root,'api'),target):'../outside';
   if((target&&!apiRelative.startsWith('..'))||/^api\//.test(spec)||/private-(?:gc|oxyanions)|\/private\//.test(spec))failures.push(relative(root,path)+': imports server-private module '+spec);
 };
 const visit=node=>{
   if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier&&ts.isStringLiteral(node.moduleSpecifier))checkImport(node.moduleSpecifier.text);
   if(ts.isCallExpression(node)&&node.expression.kind===ts.SyntaxKind.ImportKeyword&&node.arguments.length&&ts.isStringLiteral(node.arguments[0]))checkImport(node.arguments[0].text);
   ts.forEachChild(node,visit);
 };visit(ast);
 if(/questions[\\/].*[\\/]definition\.ts$/.test(path)&&/\bevaluate\s*:/.test(source))failures.push(relative(root,path)+': public evaluator');
 if(privateIdentifiers.test(compiled)||privateText.test(compiled))failures.push(relative(root,path)+': private marker key in browser source');
}
if(!process.argv.includes('--source-only')){
 const dist=resolve(root,'dist');
 if(!existsSync(dist))failures.push('Build dist before running the production bundle gate.');
 else for(const path of files(dist).filter(path=>['.js','.mjs'].includes(extname(path)))){
   const source=readFileSync(path,'utf8');
   if(privateIdentifiers.test(source)||privateText.test(source)||/private-(?:gc|oxyanions)|api\/src\/private/.test(source))failures.push(relative(root,path)+': private marker material in production JavaScript');
 }
}
if(failures.length){console.error(failures.join('\n'));process.exitCode=1;}
else console.log('Private marking boundary passed'+(process.argv.includes('--source-only')?' (source only).':' (source and production JavaScript).'));
