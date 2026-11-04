import { memoryRepository as createMemoryRepository } from '../src/memory-storage.mjs';

/** Test-only fault injection around the same adapter used by local preview. */
export function memoryRepository(initial = []) {
  const repo = createMemoryRepository(initial), batch = repo.batch;
  repo.beforeBatch = null;
  repo.failBatch = false;
  repo.batch = async operations => {
    if (repo.beforeBatch) {
      const callback = repo.beforeBatch;
      repo.beforeBatch = null;
      await callback(operations);
    }
    if (repo.failBatch) throw Error('Storage transaction failed');
    return batch(operations);
  };
  // Captured legacy handlers still use this method in write-fence regressions.
  repo.commit = (team, etag, attempt) => repo.batch([{ entity: team, etag }, { entity: attempt }]);
  return repo;
}
