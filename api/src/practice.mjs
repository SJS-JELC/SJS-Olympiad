import {randomBytes,createHash} from 'node:crypto';
import {memoryRepository} from './practice-memory.mjs';

// Every practice game owns a wholly separate in-memory service/repository.
// The real repository is read only here. Lost workers expire practice games.
export function attachPractice(api,{settings,createService,now,ApiError}) {
  const games=new Map();
  const prune=()=>{for(const [token,game] of games)if(game.expiresAt<=now())games.delete(token);};
  const decorate=(value)=>value && value.role ? {...value,practice:true} : value;
  const originalLogin=api.login.bind(api);
  const result={...api};
  async function createGame(s,event,expiresAt) {
    prune();
    if(games.size>=500)throw new ApiError(503,'Practice is busy. Please try again later.');
    const practiceEvent={...event,status:'active',theoryStartsAt:now()-1,theoryEndsAt:expiresAt,endsAt:expiresAt,
      practicalStartsAt:event.year==='U5'?null:now()-1,practicalEndsAt:event.year==='U5'?null:expiresAt};
    const {etag,...seed}=s;
    const store=memoryRepository([{...seed,events:[practiceEvent],testingEventId:null}]);
    const isolated=createService(store,{isolatedPractice:true},now);
    const innerToken=randomBytes(32).toString('hex');
    await store.write({partitionKey:'sessions',rowKey:createHash('sha256').update(innerToken).digest('hex'),kind:'session',role:'competitor',createdAt:now(),expiresAt,revoked:false,teamId:null,eventId:null,claimGeneration:null});
    const signed={token:innerToken,state:await isolated.session(innerToken)};
    const team={partitionKey:event.id+'-practice',rowKey:'team',kind:'team',schemaVersion:2,eventId:event.id,teamId:'practice',name:'Practice team',year:event.year,score:0,lastScoringAt:null,claimGeneration:0,securityEpoch:0,securityStatus:'NOT_STARTED',owner:null,legacySessionHash:null,legacyExpires:0,recovery:null};
    await store.write(team);
    const token='practice-'+randomBytes(32).toString('hex');
    games.set(token,{isolated,store,token:signed.token,eventId:event.id,revision:event.revision,expiresAt});
    return {token,state:decorate(signed.state)};
  };
  result.login=async input=>{
    const signed=await originalLogin(input);
    if(signed.state.role!=='competitor' || signed.state.activeEvent)return signed;
    const s=await settings(),drafts=s.events.filter(event=>event.status==='draft');
    if(s.events.some(event=>event.status==='active') || drafts.length!==1)return signed;
    const game=await createGame(s,drafts[0],signed.state.expiresAt);await api.logout(signed.token);return game;
  };
  result.practiceStart=async(token,input)=>{
    const session=await api.session(token),s=await settings();
    if(session.role!=='competitor' || session.team)throw new ApiError(403,'Sign in as a competitor to test a draft.');
    if(s.events.some(event=>event.status==='active'))throw new ApiError(409,'An event is now active. Sign in again to enter it.');
    const event=s.events.find(event=>event.id===input.eventId && event.status==='draft');
    if(!event)throw new ApiError(409,'This draft is no longer available. Sign in again.');
    const game=await createGame(s,event,session.expiresAt);await api.logout(token);return game;
  };
  const allowed=new Set(['session','logout','teams','claim','start','breach','recovery','resume','hydrate','question','draft','submit','action','practical','practicalSave']);
  for(const method of Object.keys(api)) {
    if(['login','throttle'].includes(method))continue;
    result[method]=async(token,...args)=>{
      if(typeof token!=='string' || !token.startsWith('practice-'))return api[method](token,...args);
      prune();
      const game=games.get(token);
      if(!game)throw new ApiError(401,'This temporary practice game has ended. Sign in to start again.');
      if(!allowed.has(method))throw new ApiError(403,'Practice cannot change competition settings.');
      const s=await settings(),event=s.events.find(e=>e.id===game.eventId);
      if(s.events.some(e=>e.status==='active') || event?.status!=='draft' || event.revision!==game.revision) {
        games.delete(token);throw new ApiError(401,'Draft testing has ended or changed. Sign in for the current event.');
      }
      // Recovery must always check the current teacher code.
      if(method==='recovery') {
        const old=await game.store.get('system','settings');
        await game.store.write({...old,teacherHash:s.teacherHash},old.etag);
      }
      try {return decorate(await game.isolated[method](game.token,...args));}
      finally {if(method==='logout' || method==='session' && args[0]?.restore)games.delete(token);}
    };
  }
  return result;
}
