// @vitest-environment jsdom
import {act,createElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {useRosterController} from '../../src/components/useRosterController';
import {request} from '../../src/cloud/api';
vi.mock('../../src/cloud/api',()=>({request:vi.fn(),HttpError:class extends Error{constructor(public status:number,message:string){super(message);}}}));
const initial={schools:[],progress:[],teams:[{id:'synthetic',name:'Synthetic',eventId:'event',year:'L6',claimGeneration:0}],removedTeams:[]};
const changed={...initial,teams:[],removedTeams:initial.teams};
let root:Root,container:HTMLDivElement,controller:ReturnType<typeof useRosterController>;
function Harness(){controller=useRosterController('event',1,()=>{});return createElement('p',{},controller.snapshot.teams.length);}
beforeEach(async()=>{
 vi.mocked(request).mockReset().mockResolvedValue(initial);container=document.createElement('div');document.body.append(container);root=createRoot(container);
 (globalThis as typeof globalThis&{IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
 await act(async()=>{root.render(createElement(Harness));});
});
afterEach(async()=>{await act(async()=>root.unmount());container.remove();});
it('loads one complete snapshot and commits a successful mutation without a follow-up GET',async()=>{
 expect(request).toHaveBeenCalledTimes(1);expect(request).toHaveBeenCalledWith('roster?eventId=event');
 vi.mocked(request).mockResolvedValueOnce({roster:{status:'complete',snapshot:changed}});
 await act(async()=>controller.start({action:'team-remove',label:'Remove',body:{requestId:'stable'}}));
 expect(request).toHaveBeenCalledTimes(2);expect(request).toHaveBeenLastCalledWith('team-remove',{requestId:'stable',rosterEventId:'event'});
 expect(controller.snapshot).toEqual(changed);expect(controller.operation).toBeNull();expect(controller.blocked).toBe(false);
});
it('keeps confirmed writes separate from readback failure; retry sends only GET',async()=>{
 vi.mocked(request).mockResolvedValueOnce({roster:{status:'failed',error:'Refresh unavailable'}});
 await act(async()=>controller.start({action:'team-remove',label:'Remove',body:{requestId:'stable'}}));
 expect(request).toHaveBeenCalledTimes(2);expect(controller.snapshot).toEqual(initial);expect(controller.operation?.outcome).toBe('saved');expect(controller.blocked).toBe(true);
 vi.mocked(request).mockResolvedValueOnce(changed);await act(async()=>{await controller.refresh();});
 expect(request).toHaveBeenLastCalledWith('roster?eventId=event');expect(request).toHaveBeenCalledTimes(3);expect(controller.snapshot).toEqual(changed);
});
it('freezes uncertain mutation payloads for replay and prevents double sends',async()=>{
 vi.mocked(request).mockRejectedValueOnce(new Error('lost response')).mockResolvedValueOnce(initial);
 const body={requestId:'same-id',items:[{teamId:'synthetic'}]};
 await act(async()=>{controller.start({action:'teams-batch',label:'Remove',body});controller.start({action:'teams-batch',label:'Remove',body});body.items[0].teamId='edited';});
 expect(controller.operation?.outcome).toBe('uncertain');
 vi.mocked(request).mockResolvedValueOnce({complete:true,roster:{status:'complete',snapshot:changed}});
 await act(async()=>{controller.retry();});
 const writes=vi.mocked(request).mock.calls.filter(([action])=>action==='teams-batch');expect(writes).toHaveLength(2);expect(writes[0][1]).toEqual(writes[1][1]);expect(writes[0][1]).toMatchObject({items:[{teamId:'synthetic'}]});
});
