import { writeFileSync } from 'node:fs';
// Deterministic, original vector interpretation of the Power Apps floor.
let seed = 419;
const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
const jitter = amount => (random() - .5) * amount;
const fmt = p => p.map(n => Math.round(n * 10) / 10).join(' ');
const rows = [0, 25, 59, 106, 167, 250];
const paths = [];
for (let row = 0; row < 5; row++) {
  let left = -420 + (row % 2) * 58 + jitter(24);
  while (left < 1800) {
    const right = left + 122 + jitter(32);
    const top = rows[row] + 2.5, bottom = rows[row + 1] - 2.5;
    const project = (x, y) => 768 + (x - 768) * (1 + y / 300);
    const pts = [[project(left,top)+3,top+jitter(3)], [project(right,top)-3,top+jitter(3)], [project(right,bottom)-4,bottom+jitter(3)], [project(left,bottom)+4,bottom+jitter(3)]];
    left = right;
    if (pts.every(p => p[0] < -60) || pts.every(p => p[0] > 1596)) continue;
    const starts = [], ends = [];
    for (let i=0;i<4;i++) {
      const p=pts[i], prev=pts[(i+3)%4], next=pts[(i+1)%4];
      const a=Math.hypot(prev[0]-p[0],prev[1]-p[1]), b=Math.hypot(next[0]-p[0],next[1]-p[1]);
      const radius=3+random()*4;
      starts.push([p[0]+(prev[0]-p[0])*radius/a,p[1]+(prev[1]-p[1])*radius/a]);
      ends.push([p[0]+(next[0]-p[0])*radius/b,p[1]+(next[1]-p[1])*radius/b]);
    }
    let d='M'+fmt(starts[0]);
    for(let i=0;i<4;i++) {
      const end=ends[i], next=starts[(i+1)%4];
      d+='Q'+fmt(pts[i])+' '+fmt(end);
      // Slight bows in each edge, with independently softened corners.
      d+='Q'+fmt([(end[0]+next[0])/2+jitter(3),(end[1]+next[1])/2+jitter(2.2)])+' '+fmt(next);
    }
    const fill=random()>.5?'#299fe9':'#d2f4ff';
    paths.push('<path d="'+d+'Z" fill="'+fill+'" fill-opacity="'+(.055+random()*.10).toFixed(3)+'"/>');
  }
}
const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1536 244" preserveAspectRatio="none"><!-- Derived visual direction: Power Apps Main Background. Regenerate with scripts/create-soft-tile-floor.mjs. --><defs><filter id="clay" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".07 .24" numOctaves="2" seed="19"/><feColorMatrix values="0 0 0 0 .12 0 0 0 0 .45 0 0 0 0 .75 .22 0 0 0 -.055"/></filter><filter id="mottle" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".012 .04" numOctaves="2" seed="7"/><feColorMatrix values="0 0 0 0 .15 0 0 0 0 .53 0 0 0 0 .85 .3 0 0 0 -.08"/></filter></defs><g stroke="#c4f1ff" stroke-opacity=".28" stroke-width="1.5">'+paths.join('')+'</g><path d="M0 0H1536V244H0Z" filter="url(#mottle)"/><path d="M0 0H1536V244H0Z" filter="url(#clay)"/></svg>';
writeFileSync(new URL('../src/assets/soft-tile-floor.svg', import.meta.url),svg);
console.log('Matte floor SVG: '+Buffer.byteLength(svg)+' bytes');
