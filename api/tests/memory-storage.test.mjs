import test from 'node:test';
import assert from 'node:assert/strict';
import { memoryRepository } from '../src/memory-storage.mjs';

test('memory transactions reject cross-partition writes before changing rows', async () => {
  const repo = memoryRepository([{ partitionKey: 'team-a', rowKey: 'summary', score: 1 }]);
  const before = await repo.list();
  await assert.rejects(repo.batch([
    { entity: { ...before[0], score: 2 }, etag: before[0].etag },
    { entity: { partitionKey: 'team-b', rowKey: 'receipt', accepted: true } },
  ]), /Cross partition/);
  assert.deepEqual(await repo.list(), before);
});

test('memory transactions with a failed ETag preserve every update, deletion and insert', async () => {
  const repo = memoryRepository([
    { partitionKey: 'team', rowKey: 'summary', score: 1 },
    { partitionKey: 'team', rowKey: 'question', solved: false },
  ]);
  const before = await repo.list();
  await assert.rejects(repo.batch([
    { entity: { ...before[0], score: 2 }, etag: before[0].etag },
    { entity: { partitionKey: 'team', rowKey: 'receipt', accepted: true } },
    { entity: before[1], etag: 'stale-etag', remove: true },
  ]), { statusCode: 412 });
  assert.deepEqual(await repo.list(), before);
});

test('memory repository isolates nested values on seed, write, batch, get and list', async () => {
  const seed = { partitionKey: 'team', rowKey: 'seed', state: { values: [1] } };
  const repo = memoryRepository([seed]);
  seed.state.values.push(2);
  const written = { partitionKey: 'team', rowKey: 'write', state: { values: [3] } };
  await repo.write(written);
  written.state.values.push(4);
  const batched = { partitionKey: 'team', rowKey: 'batch', state: { values: [5] } };
  await repo.batch([{ entity: batched }]);
  batched.state.values.push(6);
  const read = await repo.get('team', 'seed');
  read.state.values.push(7);
  const listed = await repo.list({ partitionKey: 'team' });
  for (const row of listed) row.state.values.push(8);
  assert.deepEqual((await repo.list({ partitionKey: 'team' })).map(row => row.state.values), [[1], [3], [5]]);
});
