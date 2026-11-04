import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Public generic chemistry only. Private answer keys never flow to the browser.
const engines = [
  ['src/chemistry/molecule/core.js', 'api/src/private/molecule-core.mjs'],
  ['src/components/dot-cross/core.js', 'api/src/private/dot-cross-core.mjs'],
];
const mode = process.argv[2] ?? '--check';
if (!['--check', '--write'].includes(mode) || process.argv.length > 3)
  throw new Error('Use: node scripts/sync-chemistry-engines.mjs [--check|--write]');
const root = new URL('../', import.meta.url);
let drift = false;
for (const [source, destination] of engines) {
  const bytes = await readFile(new URL(source, root));
  const target = new URL(destination, root);
  if (mode === '--write') {
    await writeFile(target, bytes);
    console.log(`Derived ${destination} from ${source}`);
  } else {
    const actual = await readFile(target).catch(error => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
    if (!actual?.equals(bytes)) {
      console.error(`${fileURLToPath(target)} differs from ${source}; run npm run sync:engines.`);
      drift = true;
    }
  }
}
if (drift) process.exitCode = 1;
else if (mode === '--check') console.log('Both derived chemistry engines match their maintained sources.');
