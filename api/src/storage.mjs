import { TableClient, TableTransaction } from '@azure/data-tables';
export async function connect(connectionString) {
  if (!connectionString) throw Error('Storage is not configured');
  const client = TableClient.fromConnectionString(connectionString, 'OlympiadPilot');
  await client.createTable();
  return {
    async get(partitionKey, rowKey) { try { return await client.getEntity(partitionKey,rowKey); } catch(error) { if (error.statusCode === 404) return null; throw error; } },
    async write(entity, etag) { return etag ? client.updateEntity(entity,'Replace',{etag}) : client.createEntity(entity); },
    async commit(team, etag, attempt) {
      const { etag: ignored, timestamp, ...entity } = team;
      const transaction = new TableTransaction();
      transaction.updateEntity(entity,'Replace',{etag});
      transaction.createEntity(attempt);
      await client.submitTransaction(transaction.actions);
    },
  };
}
