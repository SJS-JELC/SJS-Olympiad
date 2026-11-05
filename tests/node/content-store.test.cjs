const test=require('node:test');
const assert=require('node:assert/strict');
const {ContentStore}=require('../../src/cloud/content-store.ts');
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
const record=(assets=[])=>({kind:'question',id:'L6P5',schemaVersion:1,version:'v1',serverNow:100,presentation:{renderer:'L6P5',title:'Protected title'},assets});
function fixture(){
 const calls=[],revoked=[],created=[];let count=0,allowed=true;
 const io={record:async(...args)=>{calls.push(['record',...args]);return record([{id:'diagram',mimeType:'image/svg+xml',bytes:6}]);},asset:async(...args)=>{calls.push(['asset',...args]);return new Blob(['<svg/>'],{type:'image/svg+xml'});},create:blob=>{const value='blob:local/'+(++count);created.push(value);return value;},revoke:url=>revoked.push(url)};
 const store=new ContentStore(io);store.configure('identity:event',()=>allowed,{eventId:'event'});
 return {store,io,calls,revoked,created,setAllowed:value=>{allowed=value;}};
}

test('content first-open deduplicates the whole record+assets flight, revisit uses pinned version without requests',async()=>{
 const f=fixture(),pending=deferred();f.io.record=async(...args)=>{f.calls.push(['record',...args]);return pending.promise;};
 const first=f.store.load('question','L6P5'),second=f.store.load('question','L6P5');
 assert.equal(f.calls.length,1);pending.resolve(record([{id:'diagram',mimeType:'image/svg+xml',bytes:6}]));
 await Promise.all([first,second]);assert.equal(f.calls.length,2);
 assert.equal(f.store.get('question','L6P5').value.record.version,'v1');assert.equal(f.store.get('question','L6P5').value.assets.diagram,'blob:local/1');
 assert.equal(f.calls[1][1].version,'v1');assert.equal(f.calls[1][1].eventId,'event');
 await f.store.load('question','L6P5');assert.equal(f.calls.length,2);
});

test('failed record is retryable and never cached; partial asset failure revokes every created blob',async()=>{
 const f=fixture();let fail=true;
 f.io.record=async()=>{if(fail)throw new Error('Connection lost');return record([{id:'first',mimeType:'image/svg+xml',bytes:6},{id:'second',mimeType:'image/svg+xml',bytes:6}]);};
 await f.store.load('question','L6P5');assert.match(f.store.get('question','L6P5').error,/Connection lost/);assert.equal(f.store.get('question','L6P5').value,undefined);
 fail=false;f.io.asset=async body=>{if(body.assetId==='second')throw new Error('Diagram failed');return new Blob(['<svg/>'],{type:'image/svg+xml'});};
 await f.store.load('question','L6P5');assert.deepEqual(f.revoked,['blob:local/1']);assert.match(f.store.get('question','L6P5').error,/Diagram failed/);
 f.io.asset=async()=>new Blob(['<svg/>'],{type:'image/svg+xml'});
 await f.store.load('question','L6P5');assert.ok(f.store.get('question','L6P5').value);assert.equal(f.store.get('question','L6P5').error,undefined);
});

for(const change of ['logout','lock','context','deadline'])test(`${change} aborts and fences a late record even when transport ignores AbortSignal`,async()=>{
 const f=fixture(),pending=deferred();let signal;
 f.io.record=async(a,b,s)=>{signal=s;return pending.promise;};
 const flight=f.store.load('question','L6P5');
 if(change==='deadline'){f.setAllowed(false);f.store.get('question','L6P5');}
 else f.store.configure(change,()=>change==='context',{});
 assert.equal(signal.aborted,true);
 pending.resolve(record([{id:'diagram',mimeType:'image/svg+xml',bytes:6}]));await flight;
 assert.equal(f.store.get('question','L6P5').value,undefined);assert.equal(f.created.length,0);
});

test('lock immediately revokes partially loaded and successful blobs; recovery reauthorizes and reloads',async()=>{
 const f=fixture(),second=deferred();let number=0;
 f.io.record=async()=>record([{id:'first',mimeType:'image/svg+xml',bytes:6},{id:'second',mimeType:'image/svg+xml',bytes:6}]);
 f.io.asset=async()=>++number===1?new Blob(['<svg/>'],{type:'image/svg+xml'}):second.promise;
 const loading=f.store.load('question','L6P5');
 while(f.created.length===0)await new Promise(resolve=>setImmediate(resolve));
 f.store.configure('locked',()=>false,{});assert.deepEqual(f.revoked,['blob:local/1']);
 second.resolve(new Blob(['<svg/>'],{type:'image/svg+xml'}));await loading;assert.equal(f.created.length,1);
 f.store.configure('recovered',()=>true,{});f.io.record=async()=>record([{id:'diagram',mimeType:'image/svg+xml',bytes:6}]);f.io.asset=async()=>new Blob(['<svg/>'],{type:'image/svg+xml'});
 await f.store.load('question','L6P5');assert.ok(f.store.get('question','L6P5').value);
 f.store.clear();assert.deepEqual(f.revoked,['blob:local/1','blob:local/2']);
});

test('deadline after the final asset await fences content without waiting for a security notification',async()=>{
 const f=fixture();f.io.asset=async()=>{f.setAllowed(false);return new Blob(['<svg/>'],{type:'image/svg+xml'});};
 await f.store.load('question','L6P5');assert.equal(f.store.get('question','L6P5').value,undefined);assert.equal(f.created.length,0);
});

for(const invalid of ['record','duplicate','mime','bytes','version'])test(`invalid ${invalid} response cannot become successful content`,async()=>{
 const f=fixture();
 if(invalid==='record')f.io.record=async()=>({...record(),id:'L6P4'});
 if(invalid==='duplicate')f.io.record=async()=>record([{id:'same',mimeType:'image/svg+xml',bytes:6},{id:'same',mimeType:'image/svg+xml',bytes:6}]);
 if(invalid==='version')f.io.record=async()=>({...record(),version:'../v1'});
 if(invalid==='mime')f.io.asset=async()=>new Blob(['<svg/>'],{type:'text/html'});
 if(invalid==='bytes')f.io.asset=async()=>new Blob(['wrong'],{type:'image/svg+xml'});
 await f.store.load('question','L6P5');assert.equal(f.store.get('question','L6P5').value,undefined);assert.ok(f.store.get('question','L6P5').error);assert.deepEqual(f.revoked,f.created);
});
