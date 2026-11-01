import { createHash } from 'node:crypto';
import { createService, ApiError } from './service.mjs';
const origins = new Set(['https://olympiad.masters-of-chemistry.app','https://lively-coast-06a373f0f.2.azurestaticapps.net']);
const gets = new Set(['session','events','teams','leaderboard']);
const posts = new Set(['login','logout','event-create','event-update','event-year-change','event-activate','event-draft','event-end','codes-update','practice-start','team-add','team-release','team-delete','claim','start','breach','recovery','resume','hydrate','question','draft','submit','action','practical','practical-save']);
const methods = {'event-year-change':'eventChangeYear','event-draft':'eventDraft','event-create':'eventCreate','event-update':'eventUpdate','event-activate':'eventActivate','event-end':'eventEnd','codes-update':'codesUpdate','team-add':'teamAdd','team-release':'teamRelease','team-delete':'teamDelete','practical-save':'practicalSave'};
const COOKIE='__Host-olympiad-session';
function validateBody(body) {
  if(!body || typeof body!=='object' || Array.isArray(body))throw new ApiError(400,'Invalid request.');
  // Check parsed JSON iteratively before stringify or canonicalization. Answer
  // graphs are bounded strings, so ordinary scientific drawings retain their
  // existing format while hostile nested request objects fail as client errors.
  const pending=[{value:body,depth:0}];let nodes=0;
  while(pending.length) {
    const {value,depth}=pending.pop();
    if(++nodes>5000 || depth>20)throw new ApiError(400,'Invalid request.');
    if(value && typeof value==='object') {
      const children=Object.values(value);
      if(children.length>1000)throw new ApiError(400,'Invalid request.');
      for(const child of children)pending.push({value:child,depth:depth+1});
    } else if(typeof value==='number' && !Number.isFinite(value) || !['string','number','boolean','object'].includes(typeof value))throw new ApiError(400,'Invalid request.');
  }
}
let servicePromise;
async function service() {
  if (!servicePromise) servicePromise = (async () => {
    const config={eventId:process.env.OLYMPIAD_EVENT_ID,endsAt:Date.parse(process.env.OLYMPIAD_EVENT_END || '')};
    const { connect }=await import('./storage.mjs');
    return createService(await connect(process.env.OLYMPIAD_STORAGE_CONNECTION_STRING),config);
  })().catch(error=>{servicePromise=undefined;throw error;});
  return servicePromise;
}
const cookie=(raw,name)=>new RegExp('(?:^|;\\s*)'+name+'=([a-zA-Z0-9._-]+)').exec(raw || '')?.[1];
export async function handle(req,getService=service) {
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
  try {
    const action=req.params?.action,method=(req.method || '').toUpperCase();
    if (!(method==='GET'&&gets.has(action)) && !(method==='POST'&&posts.has(action)))throw new ApiError(404,'Not found.');
    const requestHeaders=Object.fromEntries(Object.entries(req.headers || {}).map(([key,value])=>[key.toLowerCase(),value]));
    if(method==='POST') {
      if(!origins.has(requestHeaders.origin) || requestHeaders['content-type']?.split(';')[0].trim()!=='application/json')throw new ApiError(403,'Use the Olympiad website to submit.');
      validateBody(req.body);
      if(Buffer.byteLength(req.rawBody ?? JSON.stringify(req.body))>64000)throw new ApiError(400,'Invalid request.');
    }
    const api=await getService(),token=cookie(requestHeaders.cookie,COOKIE);
    let body;
    if(action==='practice-start') {
      await api.throttle('mutate-'+(token || 'anonymous'),180);
      const result=await api.practiceStart(token,req.body);body=result.state;
      headers['Set-Cookie']=`${COOKIE}=${result.token}; Secure; HttpOnly; SameSite=Strict; Path=/`;
    } else if(action==='login') {
      const address=String(requestHeaders['x-forwarded-for'] || req.ip || 'unknown').split(',')[0];
      await api.throttle('login-global',120);
      await api.throttle('login-'+createHash('sha256').update(address).digest('hex'),10);
      const result=await api.login({...req.body,legacyToken:cookie(requestHeaders.cookie,'__Host-olympiad')});
      body=result.state;
      headers['Set-Cookie']=`${COOKIE}=${result.token}; Secure; HttpOnly; SameSite=Strict; Path=/`;
    } else {
      if(method==='POST')await api.throttle((['recovery','resume'].includes(action)?'recovery-':'mutate-')+(token || 'anonymous'),['recovery','resume'].includes(action)?10:180);
      if(action==='session')body=await api.session(token,{restore:req.query?.restore==='1' || req.query?.restore===1,interrupt:req.query?.interrupt==='1' || req.query?.interrupt===1});
      else if(action==='logout') {
        body=await api.logout(token);
        headers['Set-Cookie']=`${COOKIE}=; Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`;
      } else body=await api[methods[action] || action](token,method==='GET'?{eventId:req.query?.eventId}:req.body);
    }
    return {status:200,headers,body};
  } catch(error) {
    const explicitClear=req.params?.action==='logout' || req.params?.action==='session' && (req.query?.restore==='1' || req.query?.restore===1);
    if(error instanceof ApiError && error.status===401 && explicitClear)headers['Set-Cookie']=`${COOKIE}=; Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`;
    if(error instanceof ApiError && error.status===429)headers['Retry-After']='60';
    return {status:error instanceof ApiError?error.status:503,headers,body:{error:error instanceof ApiError?error.message:'The score service is unavailable. Please retry shortly.'}};
  }
}
