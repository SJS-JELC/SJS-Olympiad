import type {DiagnosticSnapshot,StorageTiming} from './api';
import {recentActionTimings,recentApiTimings} from './performance';

const storage=(value:StorageTiming)=>({count:value.count,errors:value.errors,durationMs:value.durationMs,pages:value.pages,rows:value.rows,
 transactionEntities:value.transactionEntities,maxTransactionEntities:value.maxTransactionEntities,
 ...(value.queryClasses?{queryClasses:{point:value.queryClasses.point,partition:value.queryClasses.partition,range:value.queryClasses.range,unpartitioned:value.queryClasses.unpartitioned}}:{})});

/** Explicit performance-only projection: never copy diagnostic settings, event data or arbitrary fields. */
export function performanceReport(snapshot?:DiagnosticSnapshot){
 const server=snapshot?.performance;
 return JSON.stringify({report:'olympiad-api-performance',version:1,copiedAt:new Date().toISOString(),units:'milliseconds',
  notes:['Browser history is page-local and limited to 100 requests/actions.','Server snapshot is from one instance; refresh backend settings after reproducing the action.','Parallel durations overlap. Browser time includes network and response consumption.'],
  browser:{requests:recentApiTimings(),actions:recentActionTimings()},
  serverSnapshotAt:snapshot?.snapshotAt??null,
  server:server?{schemaVersion:server.schemaVersion,scope:server.scope,
   window:{capacity:server.window.capacity,count:server.window.count,startedAt:server.window.startedAt,endedAt:server.window.endedAt},totalRequests:server.totalRequests,
   routes:server.routes.map(route=>({action:route.action,method:route.method,requests:route.requests,errors:route.errors,
    durationMs:{mean:route.durationMs.mean,p50:route.durationMs.p50,p95:route.durationMs.p95,max:route.durationMs.max},
    phases:route.phases.map(phase=>({name:phase.name,count:phase.count,totalMs:phase.totalMs})),
    storage:{get:storage(route.storage.get),list:storage(route.storage.list),write:storage(route.storage.write),remove:storage(route.storage.remove),batch:storage(route.storage.batch)},
    conflictRetries:route.conflictRetries,transport:{attempts:route.transport.attempts,failures:route.transport.failures,durationMs:route.transport.durationMs}}))}:null},null,2);
}
