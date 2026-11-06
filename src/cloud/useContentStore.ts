import { useContext, useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';
import { CompetitionSecurityContext } from '../security/CompetitionSecurityProvider';
import { ContentStore } from './content-store';
/** One store at the authenticated router lifetime; context changes clear blobs synchronously. */
export function useContentStore(eventId:string|undefined) {
 const controller=useContext(CompetitionSecurityContext);
 if(!controller)throw new Error('CompetitionSecurityProvider is required');
 const [store]=useState(()=>new ContentStore());
 const [,render]=useReducer(n=>n+1,0),event=useRef(eventId);event.current=eventId;
 const synchronize=()=>{
  const view=controller.getSnapshot(),server=view.server;
  const identity=[server?.role,server?.expiresAt,server?.activeEvent?.id,server?.team?.eventId,server?.team?.id,server?.team?.claimGeneration,view.session.status==='LOCKED',event.current].join('|');
  store.configure(identity,kind=>{
   if(server?.role==='teacher')return kind==='question'?controller.canAccessTheory():controller.canAccessPractical();
   const e=server?.activeEvent;
   return !!(server?.team && e && e.status!=='ended' && view.session.status!=='LOCKED' && controller.serverNow()<server.expiresAt && controller.serverNow()<(kind==='question'?(e.theoryEndsAt ?? e.endsAt):(e.practicalEndsAt ?? 0)));
  },server?.role==='teacher'?{eventId:event.current}:{},error=>{controller.handleMutationError(error);});
 };
 synchronize();
 useLayoutEffect(()=>controller.subscribe(synchronize),[controller,store]);
 useEffect(()=>store.subscribe(render),[store]);
 useEffect(()=>()=>store.clear(),[store]);
 return store;
}
