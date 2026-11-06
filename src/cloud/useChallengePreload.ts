import {useEffect,useReducer} from 'react';
import {useCompetitionSecurity} from '../security';
import {questionCatalog} from '../questions/catalog';
import {findPractical} from '../practicals/catalog';
import type {ContentStore} from './content-store';

export function useChallengePreload(store:ContentStore) {
 const security=useCompetitionSecurity(),s=security.server,e=s?.activeEvent;
 const [retry,again]=useReducer(n=>n+1,0);
 const ids=questionCatalog.filter(q=>q.definition.year===e?.year).map(q=>q.definition.id);
 const practical=!!(findPractical(e?.year) && e?.practicalStartsAt!=null);
 const eligible=s?.role==='competitor' && !!s.team && !!e && e.status!=='ended' && security.session.status!=='LOCKED';
 const key=[s?.expiresAt,s?.team?.id,s?.team?.claimGeneration,e?.id,e?.year,s?.competition.epoch,eligible,retry].join('|');
 useEffect(()=>{
  if(!eligible || !e)return;
  let stopped=false;
  const jobs:[('question'|'practical'),string][]=[...ids.map(id=>['question',id] as ['question',string]),...(practical?[['practical',e.year] as ['practical',string]]:[])];
  async function worker(){while(!stopped && jobs.length){const job=jobs.shift()!;await store.load(...job);}}
  void Promise.all(Array.from({length:4},worker));
  return()=>{stopped=true;};
 },[key,store]);
 return {theoryReady:eligible && ids.length>0 && ids.every(id=>!!store.get('question',id).value),practicalReady:eligible && practical && !!store.get('practical',e!.year).value,
  error:ids.map(id=>store.get('question',id).error).find(Boolean) || (practical?store.get('practical',e!.year).error:undefined),retry:again};
}
