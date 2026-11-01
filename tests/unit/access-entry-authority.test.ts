// @vitest-environment jsdom
import {act,createElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {CompetitorEntry} from '../../src/components/AccessGate';
import {CompetitionSecurityContext} from '../../src/security/CompetitionSecurityProvider';
import {SecurityController} from '../../src/security/SecurityController';
import {type SessionState,type request} from '../../src/cloud/api';

let root:Root,host:HTMLDivElement;
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
const base=():SessionState=>({role:'competitor',expiresAt:Date.now()+100000,serverNow:Date.now(),configRevision:1,activeEvent:{id:'event',year:'L6',name:'Event',endsAt:Date.now()+100000,status:'active',revision:1},team:null,competition:{status:'NOT_STARTED',epoch:0},score:0,attempts:{}});
beforeEach(()=>{(globalThis as {IS_REACT_ACT_ENVIRONMENT?:boolean}).IS_REACT_ACT_ENVIRONMENT=true;host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();});
async function fixture(){let server=base();const controller=new SecurityController((async()=>server) as typeof request);await controller.initialize();await controller.login("1234");const responses:Array<(response:Response)=>void>=[];vi.stubGlobal('fetch',vi.fn(()=>new Promise<Response>(resolve=>responses.push(resolve))));await act(async()=>root.render(createElement(CompetitionSecurityContext.Provider,{value:controller},createElement(CompetitorEntry))));return {controller,responses,set:(value:SessionState)=>server=value};}

it('ignores stale overlapping team-list 401 and body while keeping the latest list',async()=>{
    const f=await fixture();await act(async()=>{Array.from(host.querySelectorAll('button')).find(button=>button.getAttribute('aria-label')==='Refresh teams')!.click();});
    await act(async()=>f.responses[1](reply({teams:[{id:'new',name:'New team',eventId:'event',year:'L6',claimGeneration:0}]})));
    await act(async()=>f.responses[0](reply({error:'Old list expired'},401)));
    expect(f.controller.getSnapshot().server?.role).toBe('competitor');expect(host.querySelector('.team-tile__name')?.textContent).toBe('New team');expect(host.textContent).not.toContain('Old list expired');
});
it.each([200,401])('ignores old team-list %s after replacement authentication',async(status)=>{
    const f=await fixture();f.set({...base(),role:'teacher',expiresAt:Date.now()+200000});await act(async()=>f.controller.login('5678','teacher'));
    await act(async()=>f.responses[0](status===401?reply({error:'Old list expired'},401):reply({teams:[{id:'old',name:'Old team',eventId:'event',year:'L6',claimGeneration:0}]})));
    expect(f.controller.getSnapshot().server?.role).toBe('teacher');expect(host.textContent).not.toContain('Old team');expect(host.textContent).not.toContain('Old list expired');
});
