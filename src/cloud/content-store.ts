import type { ContentKind, ContentRecord, LoadedPresentation } from '../contracts/presentation';
import { request, requestAsset } from './api';
type ContentState={value?:LoadedPresentation;error?:string;flight?:Promise<void>;abort?:AbortController;blobs?:Set<string>};
type Transport={record:(action:string,body:unknown,signal:AbortSignal)=>Promise<ContentRecord>;asset:(body:unknown,signal:AbortSignal)=>Promise<Blob>;create:(blob:Blob)=>string;revoke:(url:string)=>void};
const transport:Transport={record:request,asset:requestAsset,create:blob=>URL.createObjectURL(blob),revoke:url=>URL.revokeObjectURL(url)};
/** Visit memory only. Abort saves work; generation + permission checks are the authority fence. */
export class ContentStore {
 private generation=0;
 private identity='';
 private states=new Map<string,ContentState>();
 private listeners=new Set<()=>void>();
 private allowed:(kind:ContentKind)=>boolean=()=>false;
 private context:Record<string,unknown>={};
 private onError:(error:unknown)=>void=()=>{};
 constructor(private io:Transport=transport){}
 subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
 private emit=()=>{for(const listener of this.listeners)listener();};
 configure(identity:string,allowed:(kind:ContentKind)=>boolean,context:Record<string,unknown>,onError:(error:unknown)=>void=()=>{}) {
  this.allowed=allowed;this.context=context;this.onError=onError;
  if(identity!==this.identity){this.clear();this.identity=identity;}
  for(const kind of ['question','practical'] as const)if(!allowed(kind))this.clearKind(kind);
 }
 private release(state:ContentState){state.abort?.abort();for(const url of state.blobs ?? [])this.io.revoke(url);state.blobs?.clear();}
 private clearKind(kind:ContentKind){for(const [key,state] of this.states)if(key.startsWith(kind+':')){this.release(state);this.states.delete(key);}}
 clear=()=>{this.generation++;for(const state of this.states.values())this.release(state);this.states.clear();};
 get(kind:ContentKind,id:string):ContentState {
  if(!this.allowed(kind)){this.clearKind(kind);return {};}
  const key=kind+':'+id;
  let state=this.states.get(key);if(!state){state={};this.states.set(key,state);}return state;
 }
 async load(kind:ContentKind,id:string):Promise<void> {
  if(!this.allowed(kind))return;
  const key=kind+':'+id,state=this.get(kind,id);
  if(state.value)return;
  if(state.flight)return state.flight;
  const generation=this.generation,abort=new AbortController(),body={...this.context,...(kind==='question'?{questionId:id}:{contentId:id})};
  const valid=()=>generation===this.generation && this.states.get(key)===state && this.allowed(kind) && !abort.signal.aborted;
  state.abort=abort;state.error=undefined;state.blobs=new Set();
  state.flight=(async()=>{
   const urls:Record<string,string>={};
   try {
    const record=await this.io.record(kind+'-content',body,abort.signal);
    if(!valid())return;
    if(record.id!==id || record.kind!==kind || record.schemaVersion!==1 || typeof record.version!=='string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(record.version) || record.presentation?.renderer!==id || typeof record.presentation.title!=='string' || !Array.isArray(record.assets))throw new Error('The question content could not be verified.');
    const seen=new Set<string>();
    for(const asset of record.assets){
     if(!/^[a-zA-Z0-9_-]{1,80}$/.test(asset.id) || seen.has(asset.id) || !['image/svg+xml','image/png','image/jpeg','image/webp'].includes(asset.mimeType) || !Number.isSafeInteger(asset.bytes) || asset.bytes<0)throw new Error('The question asset manifest could not be verified.');
     seen.add(asset.id);
     const blob=await this.io.asset({...body,kind,version:record.version,assetId:asset.id},abort.signal);
     if(!valid())return;
     if(blob.type!==asset.mimeType || blob.size!==asset.bytes)throw new Error('The question diagram could not be verified.');
     urls[asset.id]=this.io.create(blob);state.blobs?.add(urls[asset.id]);
    }
    if(valid()){state.value={record,assets:urls};this.emit();}
   }catch(error){if(valid()){this.onError(error);if(!valid())return;state.error=error instanceof Error?error.message:'Unable to load question content.';this.emit();}}
   finally {
    if(!state.value){for(const url of state.blobs ?? [])this.io.revoke(url);state.blobs?.clear();}
    state.flight=undefined;state.abort=undefined;
    if(!this.allowed(kind))this.clearKind(kind);
   }
  })();
  this.emit();
  return state.flight;
 }
}
