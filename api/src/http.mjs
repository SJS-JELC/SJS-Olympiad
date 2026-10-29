import { createService, ApiError } from './service.mjs';
const origins = new Set(['https://olympiad.masters-of-chemistry.app', 'https://lively-coast-06a373f0f.2.azurestaticapps.net']);
let servicePromise;
async function service() {
  if (!servicePromise) servicePromise = (async () => {
    const config = { code:process.env.OLYMPIAD_EVENT_CODE, eventId:process.env.OLYMPIAD_EVENT_ID, endsAt:Date.parse(process.env.OLYMPIAD_EVENT_END || '') };
    createService({},config); // Validate before connecting to storage.
    const { connect } = await import('./storage.mjs');
    return createService(await connect(process.env.OLYMPIAD_STORAGE_CONNECTION_STRING),config);
  })().catch(error => { servicePromise = undefined; throw error; });
  return servicePromise;
}
export async function handle(req, getService = service) {
  const headers = {'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
  try {
    const action = req.params?.action;
    const method = req.method.toUpperCase();
    if (!(method === 'GET' && action === 'session') && !(method === 'POST' && ['teams','claim','submit'].includes(action))) throw new ApiError(404,'Not found.');
    if (method === 'POST' && (!origins.has(req.headers.origin) || req.headers['content-type']?.split(';')[0] !== 'application/json')) throw new ApiError(403,'Use the Olympiad website to submit.');
    if (method === 'POST' && (Buffer.byteLength(req.rawBody ?? JSON.stringify(req.body ?? {})) > 4096 || !req.body || typeof req.body !== 'object' || Array.isArray(req.body))) throw new ApiError(400,'Invalid request.');
    const api = await getService();
    const token = /(?:^|;\s*)__Host-olympiad=([a-zA-Z0-9.-]+)/.exec(req.headers.cookie ?? '')?.[1];
    let body;
    if (action === 'session') body = await api.session(token);
    else if (action === 'submit') {
      const current = await api.session(token);
      await api.throttle('submit-' + current.team.id, 30);
      body = await api.submit(token, req.body);
    } else {
      await api.throttle('join',120);
      if (action === 'teams') body = await api.teams(req.body.code);
      else {
        const result = await api.claim(req.body,token);
        body = result.state;
        headers['Set-Cookie'] = `__Host-olympiad=${result.token}; Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age=${Math.max(1,Math.floor((body.eventEndsAt-Date.now())/1000))}`;
      }
    }
    return {status:200,headers,body};
  } catch(error) { return {status:error instanceof ApiError ? error.status : 503,headers,body:{error:error instanceof ApiError ? error.message : 'The score service is unavailable. Please retry shortly.'}}; }
}
