import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../src/', import.meta.url));
const violations = [];
const styles = new Set(['display', 'outlined', 'heading', 'body', 'label', 'caption']);
async function visit(directory) {
 for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
  const file = path.join(directory, entry.name);
  if (entry.isDirectory()) { await visit(file); continue; }
  if (!/\.(css|tsx)$/.test(file)) continue;
  const source = await fs.readFile(file, 'utf8');
  const relative = path.relative(root, file);
  for (const match of source.matchAll(/(?<![\w-])type-([a-z]+(?:-[a-z]+)*)/g)) {
   if (!styles.has(match[1])) violations.push(relative + ': unknown typography style ' + match[0]);
  }
  if (relative === 'typography.css') continue;
  if (file.endsWith('.css')) {
   const css = source.replace(/\/\*[\s\S]*?\*\//g, '');
   if (/@font-face\b|(?:^|[;{])\s*(?:font(?:-[a-z-]+)?|line-height|letter-spacing|text-transform|--font-[a-z-]+)\s*:/m.test(css)) violations.push(relative + ': define typography in src/typography.css');
  } else if (/\b(?:fontFamily|fontSize|fontWeight|fontStyle|lineHeight|letterSpacing)\s*[:=]|\bfont-(?:family|size|weight|style)=/.test(source)) {
   violations.push(relative + ': use a shared typography role instead of inline font declarations');
  }
 }
}
await visit(root);
if (violations.length) { console.error(violations.join('\n')); process.exitCode = 1; }
else console.log('Typography audit passed: all live UI font declarations are centralised.');
