import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Local vector repair: no rasterisation, global coarse grid, or mirrored eagle.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const input = path.join(root, 'src/assets/powerapp/asset-26.svg');
const source = await readFile(input, 'utf8');
const sourceHash = createHash('sha256').update(source).digest('hex');
if (sourceHash !== '28c08d95540b76fe2a437491726a6eacfe9efcef5b3c993bca9155e75d08854f') throw new Error('Original logo changed; inspect before regenerating.');
// Inferred original one-pixel spacing; these undo tiny export scaling only.
const sx = .99929, sy = .99864;
const palette = Object.fromEntries([...source.matchAll(/\.cls-(\d+)\s*\{\s*fill:\s*(#[\da-f]+);/g)].map(m => [m[1],m[2]]));
const dist = (a,b) => Math.hypot(a[0]-b[0], a[1]-b[1]);
function lineDistance(p,a,b) {
  const dx=b[0]-a[0],dy=b[1]-a[1],l=dx*dx+dy*dy;
  const t=l ? Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/l)) : 0;
  return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);
}
function simplify(points,tol) {
  if(points.length<3)return points;
  let max=0,idx=0;
  for(let i=1;i<points.length-1;i++){const d=lineDistance(points[i],points[0],points.at(-1));if(d>max){max=d;idx=i;}}
  if(max<=tol)return [points[0],points.at(-1)];
  return [...simplify(points.slice(0,idx+1),tol).slice(0,-1),...simplify(points.slice(idx),tol)];
}
function flattenCubic(p,a,b,q,out,depth=0){
  if(depth>10 || Math.max(lineDistance(a,p,q),lineDistance(b,p,q))<.22){out.push(q);return;}
  const mid=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
  const pa=mid(p,a),ab=mid(a,b),bq=mid(b,q),u=mid(pa,ab),v=mid(ab,bq),m=mid(u,v);
  flattenCubic(p,pa,u,m,out,depth+1);flattenCubic(m,v,bq,q,out,depth+1);
}
function parse(d){
  const ts=d.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g)||[];
  let i=0,cmd='',p=[0,0],start=p,control=null,previous='',parts=[],part=[];
  const n=()=>Number(ts[i++]);
  while(i<ts.length){
    if(/[a-zA-Z]/.test(ts[i]))cmd=ts[i++];
    const rel=cmd===cmd.toLowerCase(),c=cmd.toUpperCase();
    const point=()=>{let q=[n(),n()];return rel?[q[0]+p[0],q[1]+p[1]]:q;};
    if(c==='M'){if(part.length)parts.push(part);p=point();start=p;part=[p];cmd=rel?'l':'L';}
    else if(c==='Z'){if(part.length)parts.push(part);part=[];p=start;cmd='';}
    else if(c==='L'){p=point();part.push(p);}
    else if(c==='H'){p=[n()+(rel?p[0]:0),p[1]];part.push(p);}
    else if(c==='V'){p=[p[0],n()+(rel?p[1]:0)];part.push(p);}
    else if(c==='C'){const a=point(),b=point(),q=point();flattenCubic(p,a,b,q,part);p=q;control=b;}
    else if(c==='S'){const a=(previous==='C'||previous==='S')?[2*p[0]-control[0],2*p[1]-control[1]]:p;const b=point(),q=point();flattenCubic(p,a,b,q,part);p=q;control=b;}
    else if(c==='Q'){const a=point(),q=point();flattenCubic(p,[p[0]+2/3*(a[0]-p[0]),p[1]+2/3*(a[1]-p[1])],[q[0]+2/3*(a[0]-q[0]),q[1]+2/3*(a[1]-q[1])],q,part);p=q;control=a;}
    else throw new Error('Unsupported path command '+cmd);
    previous=c;
  }
  if(part.length)parts.push(part);
  return parts;
}
const area = p => p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-b[0]*a[1];},0)/2;
function compact(p){
  p=p.filter((a,i)=>i===0||dist(a,p[i-1])>.01);
  if(p.length>1 && dist(p[0],p.at(-1))<.01)p.pop();
  let changed=true;
  while(changed&&p.length>3){changed=false;for(let i=0;i<p.length;i++){let a=p[(i+p.length-1)%p.length],b=p[i],c=p[(i+1)%p.length];if(lineDistance(b,a,c)<.01){p.splice(i,1);changed=true;break;}}}
  return p;
}
function repair(points,tol){
  let p=compact(points.map(([x,y])=>[x/sx,y/sy]));
  if(p.length<3)return p;
  // Split the closed contour at two distant vertices to preserve closure.
  let k=0;for(let i=1;i<p.length;i++)if(dist(p[i],p[0])>dist(p[k],p[0]))k=i;
  p=[...simplify(p.slice(0,k+1),tol).slice(0,-1),...simplify([...p.slice(k),p[0]],tol).slice(0,-1)];
  // Replace short traced corner bevels with the intersection of neighbouring edges.
  for(let pass=0;pass<2;pass++)for(let i=0;i<p.length && p.length>4;i++){
    const a=p[(i+p.length-1)%p.length],b=p[i],c=p[(i+1)%p.length],d=p[(i+2)%p.length];
    const vertical=Math.abs(a[0]-b[0])<.8&&Math.abs(c[1]-d[1])<.8;
    const horizontal=Math.abs(a[1]-b[1])<.8&&Math.abs(c[0]-d[0])<.8;
    if(dist(b,c)<3.2&&(vertical||horizontal)&&i+1<p.length){p.splice(i,2,vertical?[b[0],c[1]]:[c[0],b[1]]);}
  }
  p=p.map(([x,y])=>[Math.round(x),Math.round(y)]);
  // Align almost-horizontal/vertical edges, only within one original pixel.
  for(let i=0;i<p.length;i++){
    const a=p[i],b=p[(i+1)%p.length],dx=Math.abs(a[0]-b[0]),dy=Math.abs(a[1]-b[1]);
    if(dx<=1&&dy>=4){const x=Math.round((a[0]+b[0])/2);a[0]=b[0]=x;}
    else if(dy<=1&&dx>=4){const y=Math.round((a[1]+b[1])/2);a[1]=b[1]=y;}
  }
  return compact(p);
}
const shapes=[];let sourceIndex=0,removed=0;
for(const m of source.matchAll(/<(path|rect|polygon)\b([^>]+)\/>/g)){
  const attrs=Object.fromEntries([...m[2].matchAll(/([\w-]+)="([^"]*)"/g)].map(a=>[a[1],a[2]]));
  const fill=palette[attrs.class?.match(/cls-(\d+)/)?.[1]];if(!fill)throw Error('Unknown fill');
  let parts;
  if(m[1]==='path')parts=parse(attrs.d);
  else if(m[1]==='polygon'){const ns=attrs.points.trim().split(/[ ,]+/).map(Number);parts=[Array.from({length:ns.length/2},(_,i)=>ns.slice(i*2,i*2+2))];}
  else{const x=+attrs.x,y=+attrs.y,w=+attrs.width,h=+attrs.height;parts=[[[x,y],[x+w,y],[x+w,y+h],[x,y+h]]];}
  const cleaned=parts.map(p=>repair(p,Math.min(...p.map(q=>q[1]))<480?.8:1.1)).filter(p=>{if(p.length<3||Math.abs(area(p))<.5){removed++;return false;}return true;});
  shapes.push({sourceIndex:sourceIndex++,fill,parts:cleaned});
}
function pathData(parts){return parts.map(p=>{let d='M'+p[0].join(' ');for(let i=1;i<p.length;i++){const a=p[i-1],b=p[i];d+=a[0]===b[0]?'V'+b[1]:a[1]===b[1]?'H'+b[0]:'L'+b.join(' ');}return d+'Z';}).join('');}
// Convex clipping splits paths shared by unrelated objects while retaining winding.
const rect=(x0,y0,x1,y1)=>[[x0,y0],[x1,y0],[x1,y1],[x0,y1]];
const cross=(a,b,p)=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
function halfPlane(points,a,b,inside=true){
  const output=[];if(!points.length)return output;
  for(let i=0;i<points.length;i++){
    const p=points[i],q=points[(i+1)%points.length],u=cross(a,b,p),v=cross(a,b,q);
    const pi=inside?u>=-1e-7:u<=1e-7,qi=inside?v>=-1e-7:v<=1e-7;
    if(pi)output.push(p);
    if(pi!==qi){const t=u/(u-v);output.push([p[0]+t*(q[0]-p[0]),p[1]+t*(q[1]-p[1])]);}
  }
  return compact(output);
}
function clip(points,mask){let p=points;for(let i=0;i<mask.length&&p.length;i++)p=halfPlane(p,mask[i],mask[(i+1)%mask.length]);return p;}
function subtract(points,mask){
  let remainder=points;const outside=[];
  for(let i=0;i<mask.length&&remainder.length;i++){
    const part=halfPlane(remainder,mask[i],mask[(i+1)%mask.length],false);
    if(part.length>=3&&Math.abs(area(part))>.1)outside.push(part);
    remainder=halfPlane(remainder,mask[i],mask[(i+1)%mask.length]);
  }
  return outside;
}
const valid=p=>p.length>=3&&Math.abs(area(p))>.1;
const clipped=(items,masks)=>items.map(s=>({...s,parts:s.parts.flatMap(p=>masks.map(m=>clip(p,m))).filter(valid)})).filter(s=>s.parts.length);
const without=(items,masks)=>items.map(s=>({...s,parts:masks.reduce((ps,m)=>ps.flatMap(p=>subtract(p,m)),s.parts)})).filter(s=>s.parts.length);
// Regions follow the existing shoulders and head; there is no mirrored/redrawn wing.
const leftWing=[[0,0],[401,0],[465,202],[433,322],[0,322]];
const rightWing=[[634,0],[1039,0],[1039,322],[602,322],[568,202]];
const head=[[409,75],[558,75],[569,190],[539,240],[449,240],[409,177]];
// Assign original connected shapes before any region clipping. Two black source
// contours genuinely join objects; only those need object-boundary splitting.
const owned=Object.fromEntries(['eagle','flask-green','flask-yellow','flask-blue','flask-red','wordmark-main','wordmark-subtitle'].map(n=>[n,[]]));
// Trim hidden tracing bridges on the two shared black outlines. These bands
// follow the existing stepped vessel contours, not neighbouring letter edges.
const blueOutlineMasks=[rect(0,430,98,543),rect(0,543,87,578),rect(0,578,93,590),rect(0,590,105,602),rect(0,602,114,650),rect(5,650,108,656),rect(11,656,102,662),rect(17,662,96,668),rect(23,668,90,674),rect(29,674,84,680)];
const redOutlineMasks=[rect(950,430,1039,578),rect(944,578,1027,586),rect(938,586,1033,592),rect(932,592,1039,598),rect(925,598,1039,650),rect(932,650,1033,662),rect(938,662,1027,668),rect(944,668,1021,674),rect(950,674,1015,680)];
const glassColours=new Set(['#9ed0d8','#d2e6e4','#6facc0','#a4dbe0','#f5f7f7','#fcfcfc','#fcfdfd']);
for(const shape of shapes){
  if(!shape.parts.length)continue;
  if(shape.sourceIndex===0){owned['flask-red'].push(...clipped([shape],redOutlineMasks));owned['wordmark-subtitle'].push(...clipped([shape],[rect(559,643,925,697)]));owned['wordmark-main'].push(...clipped(without([shape],redOutlineMasks),[rect(98,499,944,641)]));continue;}
  if(shape.sourceIndex===3){owned['flask-blue'].push(...clipped([shape],blueOutlineMasks));owned['wordmark-main'].push(...clipped(without([shape],blueOutlineMasks),[rect(98,500,940,641)]));continue;}
  if(shape.sourceIndex===4){owned['flask-green'].push(shape);continue;}
  if(shape.sourceIndex===6){owned['flask-yellow'].push(shape);continue;}
  const points=shape.parts.flat(),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  const x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys),cx=(x0+x1)/2,cy=(y0+y1)/2;
  let owner;
  if(y0<322)owner='eagle';
  else if(y1<=485&&cx>=355&&cx<=683)owner='eagle';
  else if(cx< (cy<580?98:114)&&cy>=430)owner='flask-blue';
  else if(cy>=430&&(cx>938||(cx>=925&&glassColours.has(shape.fill))))owner='flask-red';
  else if(cx>=234&&cx<=355&&cy<535&&(cy<501||cx>329||['#78c55c','#4caf4f'].includes(shape.fill)||glassColours.has(shape.fill)))owner='flask-green';
  else if(cx>=683&&cx<=803&&cy<505&&y0<499)owner='flask-yellow';
  else if(cy>=641)owner='wordmark-subtitle';
  else if(cy>=499)owner='wordmark-main';
  else throw new Error('Unassigned original contour '+shape.sourceIndex);
  owned[owner].push(shape);
}
const eagle=owned.eagle;

// Preserve four source-pixel shoulder underlaps for later rigging work.
// The movement diagnostic still exposes a seam; wing animation is not enabled.
// These are existing adjacent artwork, not invented or mirrored feathers.
const insetHead=head.map(([x,y])=>[x+(500-x)*.055,y+(155-y)*.055]);
const eagleBody=without(eagle,[leftWing.map(([x,y])=>[x-4,y]),rightWing.map(([x,y])=>[x+4,y]),insetHead]);
// Clipping a concave outline can join disconnected pieces with retraced,
// zero-area bridges. Split/cancel those edges before adding overlap strokes.
function contourLoops(p){
  const key=q=>q.join(','),edges=new Map();
  for(let i=0;i<p.length;i++){
    const a=p[i],b=p[(i+1)%p.length],length=dist(a,b);if(length<.01)continue;
    const cuts=p.filter(q=>lineDistance(q,a,b)<.005).map(q=>({q,t:dist(a,q)/length})).filter(c=>c.t<1.00001).sort((u,v)=>u.t-v.t);
    const points=cuts.map(c=>c.q).filter((q,j,ps)=>j===0||dist(q,ps[j-1])>.005);
    for(let j=0;j<points.length-1;j++){
      const u=points[j],v=points[j+1],forward=key(u)+'>'+key(v),reverse=key(v)+'>'+key(u);
      if(edges.has(reverse)){const reverseEdges=edges.get(reverse);reverseEdges.pop();if(!reverseEdges.length)edges.delete(reverse);}
      else {const list=edges.get(forward)||[];list.push([u,v]);edges.set(forward,list);}
    }
  }
  const adjacency=new Map();for(const list of edges.values())for(const edge of list){const k=key(edge[0]),out=adjacency.get(k)||[];out.push(edge);adjacency.set(k,out);}
  const loops=[];
  while(adjacency.size){
    const first=adjacency.values().next().value[0][0],loop=[first];let here=first,guard=0;
    do {const outgoing=adjacency.get(key(here));if(!outgoing?.length)throw Error('Open repaired contour');const edge=outgoing.pop();if(!outgoing.length)adjacency.delete(key(here));here=edge[1];loop.push(here);if(++guard>10000)throw Error('Contour traversal overflow');}while(key(here)!==key(first));
    const cleaned=compact(loop);if(valid(cleaned))loops.push(cleaned);
  }
  return loops;
}
function rounded(parts){return parts.map(p=>compact(p.map(([x,y])=>[Math.round(x*100)/100,Math.round(y*100)/100]))).filter(valid).flatMap(contourLoops);}
function serialise(items){
  // Merge adjacent equal-colour paths only; never reorder paint layers.
  const runs=[];for(const s of items){const ps=rounded(s.parts);if(!ps.length)continue;const previous=runs.at(-1);if(previous?.fill===s.fill)previous.parts.push(...ps);else runs.push({fill:s.fill,parts:[...ps]});}
  return runs.map(s=>'<path fill="'+s.fill+'" stroke="'+s.fill+'" d="'+pathData(s.parts)+'"/>').join('\n');
}
function group(name,body){return '<g data-part="'+name+'">\n'+body+'\n</g>';}
const liquidColours=new Set(['#3189cb','#1f5eb8','#78c55c','#4caf4f','#e6b935','#f1d968','#e5c35a','#dc9817','#dc4032','#b91c1f','#9e1829','#931732','#631c1e','#cf9a3b']);
const highlightColours=new Set(['#fcfcfc','#fcfdfd','#f5f7f7','#d2e6e4','#a4dbe0']);
function flask(name,neckY){
  const items=owned[name];const bubbles=clipped(items,[rect(0,0,1039,neckY)]);
  const vessel=clipped(items,[rect(0,neckY,1039,697)]);
  const runs=[];
  for(const s of vessel){
    const part=liquidColours.has(s.fill)?'liquid':highlightColours.has(s.fill)?'highlights':'glass';
    const last=runs.at(-1);if(last?.part===part)last.items.push(s);else runs.push({part,items:[s]});
  }
  return group(name,group('bubbles',serialise(bubbles))+'\n'+runs.map(r=>group(r.part,serialise(r.items))).join('\n'));
}
const eagleMarkup=group('eagle',group('wing-left',serialise(without(clipped(eagle,[leftWing]),[head])))+'\n'+group('wing-right',serialise(without(clipped(eagle,[rightWing]),[head])))+'\n'+group('body',serialise(eagleBody))+'\n'+group('head',serialise(clipped(eagle,[head]))));
const markup=[eagleMarkup,
  flask('flask-green',377),
  flask('flask-yellow',377),
  flask('flask-blue',517),
  flask('flask-red',517),
  group('wordmark-main',serialise(owned['wordmark-main'])),
  group('wordmark-subtitle',serialise(owned['wordmark-subtitle'])),
].join('\n');
const finalSvg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1039 697">\n'+
  '<g stroke-width="1.2" stroke-linejoin="miter" stroke-miterlimit="2">\n'+markup+'\n</g>\n</svg>\n';
const metrics={
  source:'powerapp/asset-26.svg', sourceSha256:sourceHash,
  derived:'olympiad-logo.svg', derivedSha256:createHash('sha256').update(finalSvg).digest('hex'),
  generator:'scripts/clean-olympiad-logo.mjs',
  sourceBytes:Buffer.byteLength(source), cleanedBytes:Buffer.byteLength(finalSvg),
  sourceGzipBytes:gzipSync(source).length, cleanedGzipBytes:gzipSync(finalSvg).length,
  sourceShapes:shapes.length, cleanedPaths:(finalSvg.match(/<path /g)||[]).length,
  removedDegenerateContours:removed,
  treatment:'Local vector contour repair; no raster resampling, mirrored wings, or changed palette. Partial shoulder/head underlaps retain adjacent source geometry; a small wing-translation diagnostic still exposes a shoulder seam, so wing motion requires further rigging. A 1.2-unit same-colour stroke closes subpixel cracks. Repeated flask subgroups preserve original painter order.',
  viewBox:[0,0,1039,697],
};
const outputs=[['src/assets/olympiad-logo.svg',finalSvg],['src/assets/olympiad-logo.provenance.json',JSON.stringify(metrics,null,2)+'\n']];
if(process.argv.includes('--check')){
  for(const [file,expected] of outputs){if(await readFile(path.join(root,file),'utf8')!==expected)throw new Error('Generated output differs: '+file);}
  console.log('Logo outputs match the generator and pinned source.');
}else{
  for(const [file,content] of outputs)await writeFile(path.join(root,file),content);
  console.log(JSON.stringify(metrics,null,2));
}
