import {beforeEach,describe,expect,it} from 'vitest';
import {beginActionTiming,beginApiTiming,clearApiTimings,recentActionTimings,recentApiTimings} from '../../src/cloud/performance';

describe('page-local request timings',()=>{
 beforeEach(clearApiTimings);
 it('never retains query parameters, unknown actions or arbitrary header text',()=>{
  const timing=beginApiTiming('teams?eventId=secret-record');
  timing.response(new Response('{}',{headers:{'X-Request-Id':'secret-token','Server-Timing':'total;dur=12.5'}}));timing.finish();
  beginApiTiming('secret-payload').finish(new Error('sensitive detail'));
  const history=recentApiTimings();expect(history[1]).toMatchObject({action:'teams',requestId:null,serverMs:12.5});
  expect(JSON.stringify(history)).not.toMatch(/secret|sensitive/);
 });
 it('bounds histories and returns detached snapshots',()=>{
  for(let i=0;i<110;i++){beginApiTiming('session').finish();beginActionTiming('team-remove')('confirmed');}
  expect(recentApiTimings()).toHaveLength(100);expect(recentActionTimings()).toHaveLength(100);
  recentApiTimings()[0].action='changed';expect(recentApiTimings()[0].action).toBe('session');
 });
 it('records aborts separately from HTTP and network failures',()=>{
  const aborted=new Error('private');aborted.name='AbortError';beginApiTiming('question').finish(aborted);
  const http=beginApiTiming('submit');http.response(new Response('{}',{status:409}));http.finish(new Error('private'));
  expect(recentApiTimings().map(x=>x.outcome)).toEqual(['http-error','aborted']);
 });
});
