// Test-only loader: permits the real TS/TSX React boundary to run under node:test
// without a native bundler. It never participates in the frontend build.
const fs=require('node:fs');
const ts=require('typescript');
for(const extension of ['.ts','.tsx'])require.extensions[extension]=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{
 fileName:filename,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},
}).outputText,filename);
require.extensions['.css']=module=>{module.exports={};};
