import { instrumentRepository, recordListPage, tableTelemetryOptions } from './telemetry.mjs';
export const encode = entity => {
  const { partitionKey, rowKey, etag, timestamp, ...value } = entity;
  return { partitionKey, rowKey, kind:value.kind || '', eventId:value.eventId || '', payload:JSON.stringify(value) };
};
export const decode = entity => entity?.payload ? { ...JSON.parse(entity.payload), partitionKey:entity.partitionKey, rowKey:entity.rowKey, etag:entity.etag } : entity;
export function validateListFilter({partitionKey,rowKeyFrom,rowKeyTo}={}) {
  if(typeof partitionKey!=='string' || !partitionKey)throw Error('A partition-scoped query is required');
  if((rowKeyFrom!==undefined && typeof rowKeyFrom!=='string') || (rowKeyTo!==undefined && typeof rowKeyTo!=='string') || (rowKeyFrom!==undefined && rowKeyTo!==undefined && rowKeyFrom>=rowKeyTo))throw Error('Invalid row range');
}
/** data-tables submitTransaction drops delete ETags. Every batch containing a
 * remove must explicitly name a conditional UPDATE in that same transaction.
 * That row is the caller's lifecycle/operation fence; deletion ETags alone are
 * NOT a concurrency guarantee. Single-row removals use conditional deleteEntity.
 */
export function validateDeleteGuard(operations,{deleteGuard}={}) {
  if(!operations.some(operation=>operation.remove))return;
  if(!deleteGuard || typeof deleteGuard.etag!=='string' || !deleteGuard.etag || deleteGuard.etag==='*' || !operations.some(operation=>!operation.remove && operation.etag===deleteGuard.etag && operation.entity.rowKey===deleteGuard.rowKey))throw Error('Batch deletions require an explicit conditional update fence');
}
export async function connect(connectionString) {
  if (!connectionString) throw Error('Storage is not configured');
  const {TableClient,TableTransaction}=await import('@azure/data-tables');
  const client = TableClient.fromConnectionString(connectionString, 'OlympiadPilot', tableTelemetryOptions());
  // Provisioning/reset owns table creation. Runtime must find a valid manifest.
  return Object.assign(createRepository(client,TableTransaction),{requiresLayout:true});
}
export function createRepository(client,TableTransaction) {
  return instrumentRepository({
    async get(partitionKey, rowKey) {
      try { return decode(await client.getEntity(partitionKey,rowKey)); }
      catch(error) { if (error.statusCode === 404) return null; throw error; }
    },
    async write(entity, etag) { return etag ? client.updateEntity(encode(entity),'Replace',{etag}) : client.createEntity(encode(entity)); },
    async remove(partitionKey,rowKey,etag) {
      if(!etag || etag==='*')throw Error('A conditional deletion is required');
      try { await client.deleteEntity(partitionKey,rowKey,{etag}); }
      catch(error) { if(error.statusCode!==404)throw error; }
    },
    async batch(operations,options) {
      if (!operations.length || operations.length > 100 || new Set(operations.map(op=>op.entity.partitionKey)).size !== 1) throw Error('Invalid team transaction');
      validateDeleteGuard(operations,options);
      const tx = new TableTransaction();
      for (const {entity,etag,remove} of operations) {
        if(remove) {if(!etag || etag==='*')throw Error('A conditional deletion is required');tx.deleteEntity(entity.partitionKey,entity.rowKey);}
        else if (etag) tx.updateEntity(encode(entity),'Replace',{etag});
        else tx.createEntity(encode(entity));
      }
      await client.submitTransaction(tx.actions);
    },
    async list({partitionKey,kind,eventId,rowKeyFrom,rowKeyTo} = {}) {
      validateListFilter({partitionKey,rowKeyFrom,rowKeyTo});
      const clauses=[];
      const literal=value=>"'"+String(value).replaceAll("'","''")+"'";
      if (partitionKey !== undefined) clauses.push('PartitionKey eq '+literal(partitionKey));
      if (kind !== undefined) clauses.push('kind eq '+literal(kind));
      if (eventId !== undefined) clauses.push('eventId eq '+literal(eventId));
      if (rowKeyFrom !== undefined) clauses.push('RowKey ge '+literal(rowKeyFrom));
      if (rowKeyTo !== undefined) clauses.push('RowKey lt '+literal(rowKeyTo));
      const result=[];
      // Iteration follows every continuation page before filtering/ranking.
      const entities=client.listEntities({queryOptions:{filter:clauses.join(' and ') || undefined}});
      if(typeof entities.byPage==='function') {
        for await(const page of entities.byPage()) {
          recordListPage(page.length);
          for(const entity of page)result.push(decode(entity));
        }
      } else {
        // Lightweight injected clients may expose only entity iteration. Do not
        // invent page counts for those adapters.
        for await(const entity of entities){recordListPage(1,false);result.push(decode(entity));}
      }
      return result;
    },
  },{pagedList:true});
}
