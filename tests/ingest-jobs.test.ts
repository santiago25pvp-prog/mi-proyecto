import assert from 'node:assert/strict';
import test from 'node:test';
import { createIngestJobQueue, type ScheduledIngestTask } from '../services/ingest-jobs';

function createManualScheduler() {
  const tasks: ScheduledIngestTask[] = [];

  return {
    schedule(task: ScheduledIngestTask) {
      tasks.push(task);
    },
    async runNext() {
      const task = tasks.shift();
      assert.ok(task, 'expected a scheduled ingest task');
      await task();
    },
    get pending() {
      return tasks.length;
    },
  };
}

test('ingest job queue stores queued jobs and completes them in the worker', async () => {
  const scheduler = createManualScheduler();
  const queue = createIngestJobQueue({
    idFactory: () => 'job-1',
    runIngest: async (url) => {
      assert.equal(url, 'https://example.com/docs');
      return {
        status: 'success',
        chunks_inserted: 2,
        chunks_failed: 0,
      };
    },
    schedule: scheduler.schedule,
  });

  const { job, reused } = queue.queueJob('https://example.com/docs', 'req-1');

  assert.equal(reused, false);
  assert.equal(job.id, 'job-1');
  assert.equal(job.status, 'queued');
  assert.equal(scheduler.pending, 1);

  await scheduler.runNext();

  const completed = queue.getJob('job-1');
  assert.equal(completed?.status, 'done');
  assert.equal(completed?.attempts, 1);
  assert.deepEqual(completed?.result, {
    status: 'success',
    chunks_inserted: 2,
    chunks_failed: 0,
  });
});

test('ingest job queue retries transient failures before completing', async () => {
  const scheduler = createManualScheduler();
  let calls = 0;
  const queue = createIngestJobQueue({
    idFactory: () => 'job-retry',
    retryDelayMs: 0,
    runIngest: async () => {
      calls += 1;

      if (calls === 1) {
        throw new Error('HTTP 503 upstream unavailable');
      }

      return {
        status: 'success',
        chunks_inserted: 1,
        chunks_failed: 0,
      };
    },
    schedule: scheduler.schedule,
  });

  queue.queueJob('https://example.com/retry', 'req-retry');

  await scheduler.runNext();

  const queuedForRetry = queue.getJob('job-retry');
  assert.equal(queuedForRetry?.status, 'queued');
  assert.equal(queuedForRetry?.attempts, 1);
  assert.equal(queuedForRetry?.error, 'HTTP 503 upstream unavailable');
  assert.equal(scheduler.pending, 1);

  await scheduler.runNext();

  const completed = queue.getJob('job-retry');
  assert.equal(completed?.status, 'done');
  assert.equal(completed?.attempts, 2);
  assert.equal(calls, 2);
});

test('ingest job queue fails terminal errors without retrying', async () => {
  const scheduler = createManualScheduler();
  const queue = createIngestJobQueue({
    idFactory: () => 'job-terminal',
    runIngest: async () => {
      throw new Error('404 Not Found');
    },
    schedule: scheduler.schedule,
  });

  queue.queueJob('https://example.com/missing', 'req-terminal');

  await scheduler.runNext();

  const failed = queue.getJob('job-terminal');
  assert.equal(failed?.status, 'failed');
  assert.equal(failed?.attempts, 1);
  assert.equal(failed?.error, '404 Not Found');
  assert.equal(scheduler.pending, 0);
});

test('ingest job queue reuses active jobs for the same URL', () => {
  const scheduler = createManualScheduler();
  const queue = createIngestJobQueue({
    idFactory: () => 'job-idempotent',
    runIngest: async () => ({
      status: 'success',
      chunks_inserted: 0,
      chunks_failed: 0,
    }),
    schedule: scheduler.schedule,
  });

  const first = queue.queueJob('https://example.com/same', 'req-1');
  const second = queue.queueJob('https://example.com/same', 'req-2');

  assert.equal(first.reused, false);
  assert.equal(second.reused, true);
  assert.equal(second.job.id, first.job.id);
  assert.equal(scheduler.pending, 1);
});
