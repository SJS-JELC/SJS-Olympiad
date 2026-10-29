import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
const directory = fileURLToPath(new URL('../src/questions/l6p5/assets/', import.meta.url));
const provenance = JSON.parse(await fs.readFile(directory + '/provenance.json', 'utf8'));
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const executablePath = await fs.access(edge).then(() => edge, () => undefined);
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
const maps = {
 'newman-example': { 'cls-18':'C', 'cls-3':'C', 'cls-23':'Cl', 'cls-16':'Cl', 'cls-13':'H', 'cls-12':'H', 'cls-17':'H', 'cls-15':'H', 'cls-2':'Cl', 'cls-21':'Cl', 'cls-20':'H', 'cls-22':'H', 'cls-19':'H', 'cls-4':'H', 'cls-1':'0°', 'cls-14':'180°' },
 'newman-question': { 'cls-13':'H', 'cls-9':'H', 'cls-7':'H', 'cls-6':'Cl', 'cls-10':'Cl', 'cls-8':'Cl', 'cls-1':'Cl', 'cls-12':'H', 'cls-11':'H' },
};
const hash = value => createHash('sha256').update(value).digest('hex');
const outputs = [];
try {
 const page = await browser.newPage();
 for (const [name, mapping] of Object.entries(maps)) {
  const source = await fs.readFile(directory + '/' + name + '.svg', 'utf8');
  if (hash(source) !== provenance.assets.find(asset => asset.file === name + '.svg').sha256) throw Error('Source artwork changed: ' + name);
  await page.setContent(source);
  const result = await page.evaluate(({ name, mapping }) => {
   const svg = document.querySelector('svg');
   const labels = [];
   const targets = [...svg.querySelectorAll('g[class], text')];
   if (targets.length !== (name === 'newman-example' ? 17 : 11)) throw Error('Unexpected source lettering groups');
   // Save every non-lettering shape, then verify removal leaves its geometry byte-for-byte intact.
   const shapes = [...svg.querySelectorAll('path,line,circle,rect,polygon,polyline,ellipse')].filter(node => !node.closest('defs') && !targets.some(target => target.contains(node)));
   const geometryBefore = shapes.map(node => node.outerHTML).join('');
   for (const element of targets) {
    const key = element.getAttribute('class');
    if (name === 'newman-example' && key === 'cls-24') {
     labels.push(...[
      { text:'Most Stable', x:1060.7, y:87 }, { text:'Conformation', x:1060.7, y:113 },
      { text:'Least Stable', x:1060.7, y:184 }, { text:'Conformation', x:1060.7, y:210 },
     ].map(label => ({...label, role:'caption'})));
    } else {
     const text = element.tagName === 'text' ? element.textContent.trim() : mapping[key];
     if (!text) throw Error('Unmapped lettering: ' + key);
     const box = element.getBBox();
     const matrix = svg.getScreenCTM().inverse().multiply(element.getScreenCTM());
     const point = new DOMPoint(box.x + box.width/2, box.y + box.height/2).matrixTransform(matrix);
     labels.push({ text, x:Math.round(point.x*100)/100, y:Math.round(point.y*100)/100, role:text.includes('°')?'angle':'atom' });
    }
    element.remove();
   }
   if (shapes.map(node=>node.outerHTML).join('') !== geometryBefore) throw Error('Chemical geometry changed');
   // Typography is now live React text. Remove obsolete source font declarations from the geometry-only asset.
   for (const style of svg.querySelectorAll('style')) style.textContent = style.textContent.replace(/(?:font(?:-[a-z-]+)?|letter-spacing|line-height):[^;]+;/g, '');
   return { geometry:svg.outerHTML, viewBox:svg.getAttribute('viewBox'), labels, preservedGeometry:geometryBefore };
  }, { name, mapping });
  await fs.writeFile(directory + '/' + name + '-geometry.svg', result.geometry + '\n');
  await fs.writeFile(directory + '/' + name + '-labels.json', JSON.stringify({ viewBox:result.viewBox, labels:result.labels }, null, 2) + '\n');
  outputs.push({ source:name+'.svg', sourceSha256:hash(source), geometry:name+'-geometry.svg', geometrySha256:hash(result.geometry+'\n'), preservedShapeSha256:hash(result.preservedGeometry), labelCount:result.labels.length });
 }
 await fs.writeFile(directory+'/live-labels-provenance.json',JSON.stringify({ generator:'scripts/create-newman-diagrams.mjs', treatment:'Remove source lettering only; retain all chemical bond, wedge, circle, arrow and eye geometry. Render mapped labels through app-wide live SVG typography.', outputs },null,2)+'\n');
} finally { await browser.close(); }
