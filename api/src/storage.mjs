export const encode = entity => {
  const { partitionKey, rowKey, etag, timestamp, ...value } = entity;
  return { partitionKey, rowKey, kind:value.kind || '', eventId:value.eventId || '', payload:JSON.stringify(value) };
};
export const decode = entity => entity?.payload ? { ...JSON.parse(entity.payload), partitionKey:entity.partitionKey, rowKey:entity.rowKey, etag:entity.etag } : entity;
export async function connect(connectionString) {
  if (!connectionString) throw Error('Storage is not configured');
  const {TableClient,TableTransaction}=await import('@azure/data-tables');
  const client = TableClient.fromConnectionString(connectionString, 'OlympiadPilot');
  await client.createTable();
  return createRepository(client,TableTransaction);
}
export function createRepository(client,TableTransaction) {
  return {
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
    async batch(operations) {
      if (!operations.length || operations.length > 100 || new Set(operations.map(op=>op.entity.partitionKey)).size !== 1) throw Error('Invalid team transaction');
      const tx = new TableTransaction();
      for (const {entity,etag,remove} of operations) {
        if(remove) {if(!etag || etag==='*')throw Error('A conditional deletion is required');tx.deleteEntity(entity.partitionKey,entity.rowKey,{etag});}
        else if (etag) tx.updateEntity(encode(entity),'Replace',{etag});
        else tx.createEntity(encode(entity));
      }
      await client.submitTransaction(tx.actions);
    },
    async list({partitionKey,kind,eventId} = {}) {
      const clauses=[];
      const literal=value=>"'"+String(value).replaceAll("'","''")+"'";
      if (partitionKey !== undefined) clauses.push('PartitionKey eq '+literal(partitionKey));
      if (kind !== undefined) clauses.push('kind eq '+literal(kind));
      if (eventId !== undefined) clauses.push('eventId eq '+literal(eventId));
      const result=[];
      // Iteration follows every continuation page before filtering/ranking.
      for await (const entity of client.listEntities({queryOptions:{filter:clauses.join(' and ') || undefined}})) result.push(decode(entity));
      return result;
    },
  };
}
