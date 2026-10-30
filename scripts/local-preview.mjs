import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createService } from '../api/src/service.mjs';
import { handle } from '../api/src/http.mjs';
import { memoryRepository } from '../api/tests/helpers.mjs';

// Development-only adapter. It never opens Azure storage or changes the
// production handler's origin, cookie, authentication or marking contracts.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.LOCAL_PREVIEW_PORT || 5173);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error('Invalid LOCAL_PREVIEW_PORT.');
// Cookies are host-scoped, not port-scoped. Preserve the original preview's
// name on 5173 and isolate additional previews so they cannot replace its login.
const localCookie = 'olympiad-local-preview-session' + (port === 5173 ? '' : `-${port}`);
const productionCookie = '__Host-olympiad-session';
const hosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
const peers = new Set(['127.0.0.1', '::ffff:127.0.0.1', '::1']);
const service = createService(memoryRepository());
const teacher = await service.login({ role: 'teacher', code: '5678' });
const seeded = await service.eventCreate(teacher.token, {
  name:'Upper 6th December 2026', year:'U6',
  practicalStartsAt:Date.parse('2026-12-09T16:40:00Z'), practicalEndsAt:Date.parse('2026-12-09T17:20:00Z'),
  theoryStartsAt:Date.parse('2026-12-09T17:30:00Z'), theoryEndsAt:Date.parse('2026-12-09T18:20:00Z'),
});
for(let i=1;i<=3;i++)await service.teamAdd(teacher.token,{eventId:seeded.createdEventId,name:'Test team '+i});
await service.eventActivate(teacher.token,{eventId:seeded.createdEventId,expectedRevision:1,confirm:true});

function respond(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers });
  res.end(JSON.stringify(body));
}
function incomingCookie(raw = '') {
  return raw.split(';').map(value => value.trim()).filter(value => !value.startsWith(productionCookie + '='))
    .map(value => value.startsWith(localCookie + '=') ? productionCookie + value.slice(localCookie.length) : value).join('; ');
}
async function api(req, res, next) {
  if (!req.url?.startsWith('/api/')) return next();
  if (!hosts.has(req.headers.host) || !peers.has(req.socket.remoteAddress)) return respond(res, 403, { error: 'Local preview accepts loopback requests only.' });
  const url = new URL(req.url, 'http://' + req.headers.host);
  const match = /^\/api\/olympiad\/([a-z-]+)$/.exec(url.pathname);
  if (!match) return respond(res, 404, { error: 'Not found.' });
  if (req.method === 'POST' && req.headers.origin !== 'http://' + req.headers.host) return respond(res, 403, { error: 'Use this local preview to submit.' });
  try {
    let rawBody = '';
    if (req.method === 'POST') {
      const chunks = []; let bytes = 0;
      for await (const chunk of req) {
        bytes += chunk.length;
        if (bytes > 64000) throw Error('Request body is too large.');
        chunks.push(chunk);
      }
      rawBody = Buffer.concat(chunks).toString('utf8');
    }
    const response = await handle({
      method: req.method, params: { action: match[1] }, query: Object.fromEntries(url.searchParams),
      headers: {
        ...req.headers, cookie: incomingCookie(req.headers.cookie),
        // Only a validated same-origin loopback request crosses this adapter.
        origin: 'https://olympiad.masters-of-chemistry.app',
      },
      ...(req.method === 'POST' ? { rawBody, body: JSON.parse(rawBody) } : {}),
      ip: req.socket.remoteAddress,
    }, () => service);
    const headers = { ...response.headers };
    if (headers['Set-Cookie']) {
      // HTTP loopback uses a distinct HttpOnly cookie. Secure __Host- cookies
      // remain unchanged in production and are never issued by this adapter.
      headers['Set-Cookie'] = headers['Set-Cookie'].replace(productionCookie + '=', localCookie + '=').replace(/; Secure\b/, '');
    }
    respond(res, response.status, response.body, headers);
  } catch {
    req.resume();
    respond(res, 400, { error: 'Invalid local preview request.' });
  }
}

const server = await createServer({
  root, server: { host: '127.0.0.1', port, strictPort: true, allowedHosts: ['localhost'] },
  plugins: [{ name: 'olympiad-loopback-api', configureServer(vite) { vite.middlewares.use(api); } }],
});
await server.listen();
console.log(`Local preview: http://127.0.0.1:${port}`);
console.log('Upper 6th December 2026: 9 December practical 16:40-17:20, theory 17:30-18:20 Europe/London. Three test teams.');
console.log('Competitor: 1234. Teacher: 5678. Competitors see the real countdown; teachers can preview all questions.');
console.log('Data stays in memory until this process stops. Azure is not connected.');
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await server.close(); process.exit(0); });
