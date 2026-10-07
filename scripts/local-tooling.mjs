// Keep npm's thousands of generated files outside a synced source folder.
// This script uses only Node's standard library, so it works before npm ci.
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const localBase = process.platform === 'win32'
  ? process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local')
  : process.platform === 'darwin'
    ? path.join(os.homedir(), 'Library', 'Caches')
    : process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache');
const localRoot = path.join(localBase, 'SJS-Olympiad-Security-PoC');
const worktree = path.join(localRoot, 'worktree');
const manifestPath = path.join(worktree, '.sjs-source-manifest.json');
const installMarker = path.join(localRoot, 'installed-manifests.sha256');
const ignoredDirectories = new Set([
  '.git', '.npm-cache', '.verification', '.vite', 'node_modules', 'dist',
  'coverage', 'playwright-report', 'test-results',
]);
const ignoredFiles = new Set(['.sjs-source-manifest.json', 'Thumbs.db', '.DS_Store']);
const commands = new Set(['setup', 'migrate', 'dev', 'typecheck', 'test', 'test:browser', 'build', 'preview', 'install-browser']);

async function collectFiles(directory = sourceRoot, relative = '') {
  const files = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    if (ignoredFiles.has(entry.name) || entry.name.endsWith('.tsbuildinfo')) continue;
    const nextRelative = path.join(relative, entry.name);
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(fullPath, nextRelative));
    else if (entry.isFile()) files.push([nextRelative, fullPath]);
  }
  return files;
}

async function readManifest() {
  try {
    const value = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch (error) {
    if (error.code === 'ENOENT') return {};
    throw error;
  }
}

function safeDestination(relative) {
  const destination = path.resolve(worktree, relative);
  if (!destination.startsWith(`${worktree}${path.sep}`)) throw new Error('Invalid source manifest path');
  return destination;
}

async function syncSource() {
  await fs.mkdir(worktree, { recursive: true });
  const previous = await readManifest();
  const next = {};
  let copied = 0;
  for (const [relative, source] of await collectFiles()) {
    const stat = await fs.stat(source);
    const stamp = `${stat.size}:${stat.mtimeMs}`;
    const destination = safeDestination(relative);
    next[relative] = stamp;
    if (previous[relative] === stamp && await fs.access(destination).then(() => true, () => false)) continue;
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.copyFile(source, destination);
    copied++;
  }
  for (const relative of Object.keys(previous)) {
    if (!(relative in next)) await fs.rm(safeDestination(relative), { force: true });
  }
  await fs.writeFile(manifestPath, JSON.stringify(next, null, 2) + '\n');
  if (copied) console.log(`Copied ${copied} source files to ${worktree}`);
}

function npm(args) {
  return new Promise((resolve, reject) => {
    const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const child = spawn(command, args, {
      cwd: worktree,
      env: {
        ...process.env,
        npm_config_cache: path.join(localRoot, 'npm-cache'),
        PLAYWRIGHT_BROWSERS_PATH: path.join(localRoot, 'playwright-browsers'),
      },
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    child.once('error', reject);
    child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`${command} ${args.join(' ')} exited with ${code}`)));
  });
}

async function installIfNeeded() {
  const hash = createHash('sha256');
  hash.update(await fs.readFile(path.join(worktree, 'package.json')));
  hash.update(await fs.readFile(path.join(worktree, 'package-lock.json')));
  const fingerprint = hash.digest('hex');
  const installed = await fs.readFile(installMarker, 'utf8').catch(() => '');
  const viteExists = await fs.access(path.join(worktree, 'node_modules', 'vite', 'package.json')).then(() => true, () => false);
  if (installed === fingerprint && viteExists) return;
  console.log(`Installing dependencies in ${worktree}`);
  await npm(['ci']);
  await fs.writeFile(installMarker, fingerprint);
}

async function migrateGeneratedFiles() {
  const names = ['node_modules', '.npm-cache', '.verification', 'dist', 'test-results', 'playwright-report', 'coverage'];
  const backup = path.join(localRoot, 'previous-project-artifacts', new Date().toISOString().replaceAll(':', '-'));
  let moved = 0;
  for (const name of names) {
    const source = path.join(sourceRoot, name);
    if (!await fs.lstat(source).then(() => true, () => false)) continue;
    await fs.mkdir(backup, { recursive: true });
    await fs.rename(source, path.join(backup, name));
    moved++;
    console.log(`Moved ${name} outside the synced project.`);
  }
  if (moved) console.log(`Previous generated files are preserved at ${backup}`);
  else console.log('No generated folders remain in the synced project.');
}

async function main() {
  const command = process.argv[2] || 'setup';
  if (!commands.has(command) || process.argv.length > 3) {
    throw new Error(`Use: node scripts/local-tooling.mjs ${[...commands].join('|')}`);
  }
  if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('Node 24 or newer is required.');
  await fs.mkdir(localRoot, { recursive: true });
  await syncSource();
  await installIfNeeded();
  if (command === 'setup') {
    console.log(`Local setup is ready at ${worktree}`);
    return;
  }
  if (command === 'migrate') return migrateGeneratedFiles();
  if (command === 'install-browser') return npm(['exec', '--', 'playwright', 'install', 'chromium']);
  if (command === 'dev') {
    let syncing = false;
    const timer = setInterval(async () => {
      if (syncing) return;
      syncing = true;
      try { await syncSource(); }
      catch (error) { console.error('Source mirror failed:', error); }
      finally { syncing = false; }
    }, 1500);
    try { await npm(['run', 'dev']); }
    finally { clearInterval(timer); }
    return;
  }
  await npm(['run', command]);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
