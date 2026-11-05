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
  const identity=[server?.role,server?.expiresAt,server?.activeEvent?.id,server?.team?.eventId,server?.team?.id,server?.team?.claimGeneration,server?.competition?.epoch,view.session.status,view.phase,event.current].join('|');
  store.configure(identity,kind=>kind==='question'?controller.canAccessTheory():controller.canAccessPractical(),server?.role==='teacher'?{eventId:event.current}:{},error=>{controller.handleMutationError(error);});
 };
 synchronize();
 useLayoutEffect(()=>controller.subscribe(synchronize),[controller,store]);
 useEffect(()=>store.subscribe(render),[store]);
 useEffect(()=>()=>store.clear(),[store]);
 return store;
}
