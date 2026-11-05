import { readFileSync } from 'node:fs';
const types=new Set(['image/svg+xml','image/png','image/jpeg','image/webp']);
const identifier=value=>typeof value==='string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value);
export function fixedAsset(id,mimeType,url) {
 if(!identifier(id) || !types.has(mimeType) || !(url instanceof URL) || url.protocol!=='file:')throw new Error('Invalid fixed presentation asset.');
 const body=readFileSync(url);
 if(mimeType==='image/svg+xml') {
  const svg=body.toString('utf8');
  // Trusted geometry is image-only: no scripts, event handlers, embedded documents,
  // entities, stylesheets, external resources or external CSS URL references.
  if(!/<svg[\s>]/i.test(svg) || /<(?:script|foreignObject|iframe|object|embed|image|use|animate|set)\b|\bon[a-z]+\s*=|@import|expression\s*\(|<!ENTITY|<!DOCTYPE|<\?xml-stylesheet|(?:href|src)\s*=|url\s*\(\s*[^#]/i.test(svg))throw new Error('Unsafe presentation SVG: '+id);
 }
 return Object.freeze({id,mimeType,body});
}
export function validateRecord(record) {
 if(!['question','practical'].includes(record.kind) || !identifier(record.id) || record.schemaVersion!==1 || !identifier(record.version) || !record.presentation || record.presentation.renderer!==record.id || typeof record.presentation.title!=='string' || !record.presentation.title.trim() || !Array.isArray(record.assets))throw new Error('Invalid presentation record.');
 const ids=new Set();
 for(const asset of record.assets){if(!identifier(asset.id) || ids.has(asset.id) || !types.has(asset.mimeType) || !Buffer.isBuffer(asset.body))throw new Error('Invalid presentation asset manifest.');ids.add(asset.id);}
 if(record.presentation.parts)for(const part of record.presentation.parts){if(!identifier(part.id) || typeof part.label!=='string' || !Array.isArray(part.fields))throw new Error('Invalid presentation parts.');for(const field of part.fields)if(!identifier(field.id) || typeof field.label!=='string')throw new Error('Invalid presentation field.');}
 if(typeof record.validate!=='function')throw new Error('Presentation must validate its renderer fields.');
 record.validate(record.presentation,ids);
 JSON.stringify(record.presentation);
 return record;
}
export function publicRecord(record,serverNow) {
 return {kind:record.kind,id:record.id,schemaVersion:record.schemaVersion,version:record.version,serverNow,presentation:record.presentation,assets:record.assets.map(({id,mimeType,body})=>({id,mimeType,bytes:body.length}))};
}
