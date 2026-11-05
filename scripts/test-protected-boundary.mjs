import {writeFileSync,unlinkSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {presentationRecord} from '../api/src/presentation/registry.mjs';
const probe=resolve('dist/.protected-audit-negative.js');
if(existsSync(probe))throw Error('Refusing to overwrite an existing audit probe.');
const records=['L6P5','U5P3'].map(id=>presentationRecord('question',id));
const probes=[
 ['short scientific identifier','const clue="HOMO";'],
 ['escaped scientific identifier','const clue="\\u0073n1";'],
 ['short scientific payload label',JSON.stringify(presentationRecord('question','U6P9').presentation.parts[0].label)],
 ['prose in source map',JSON.stringify({version:3,sources:['source.ts'],sourcesContent:[records[0].presentation.paragraphs[0]]})],
 ['original SVG bytes',records[0].assets[0].body],
 ['base64 SVG bytes',JSON.stringify(records[0].assets[0].body.toString('base64'))],
 ['SVG path equivalent',JSON.stringify(/\bd="([^"]{40,})"/.exec(records[0].assets[0].body.toString())[1])],
 ['molecular graph equivalent','const graph='+JSON.stringify(records[1].presentation.graph)+';'],
 ['apparatus path equivalent',JSON.stringify(presentationRecord('question','U5P5').presentation.graphic.path1)],
 ['code-only chart selector','const className="gc-chromatogram";'],
 ['escaped code-only selector','const className="gc-\\u0063arrier-source";'],
 ['code-only apparatus property','const geometry={carrierInlet:null};'],
 ['quoted apparatus key','const geometry={"carrier":null};'],
 ['computed apparatus key','const geometry=record["detector"];'],
 ['code-only chart property','const values=record.retentionTimes;'],
 ['coordinate geometry equivalent','const coordinates='+JSON.stringify(presentationRecord('question','L6P4').presentation.panels[0].positions)+';'],
];
const results=[];
try{
 const clean=spawnSync(process.execPath,['scripts/check-protected-presentations.mjs'],{encoding:'utf8'});assert.equal(clean.status,0,clean.stderr);
 for(const [name,body]of probes){writeFileSync(probe,body);const result=spawnSync(process.execPath,['scripts/check-protected-presentations.mjs'],{encoding:'utf8'});results.push({name,detected:result.status===1});assert.equal(result.status,1,name+' escaped the production gate');}
}finally{if(existsSync(probe))unlinkSync(probe);}
if(process.env.PROTECTED_NEGATIVE_REPORT)writeFileSync(process.env.PROTECTED_NEGATIVE_REPORT,JSON.stringify({cleanPass:true,probes:results},null,2)+'\n');
console.log('Protected boundary negative checks passed: '+results.length+' planted equivalents detected; clean public build passed.');
