import { randomUUID } from 'node:crypto';
import logger from './logger';

export type IngestJobStatus = 'queued' | 'running' | 'failed' | 'done';

export interface IngestResult {
  status: 'success' | 'partial_success';
  chunks_inserted: number;
  chunks_failed: number;
}

export interface IngestJob {
  id: string;
  url: string;
  requestId: string;
  status: IngestJobStatus;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  result?: IngestResult;
  error?: string;
}

export type IngestRunner = (url: string) => Promise<IngestResult>;
export type ScheduledIngestTask = () => void | Promise<void>;
export type IngestScheduler = (task: ScheduledIngestTask, delayMs?: number) => void;

export interface IngestJobQueueOptions {
  runIngest: IngestRunner;
  schedule?: IngestScheduler;
  now?: () => Date;
  idFactory?: () => string;
  maxAttempts?: number;
  retryDelayMs?: number;
}

export interface QueueIngestJobResult {
  job: IngestJob;
  reused: boolean;
}

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY_MS = 1000;

function defaultSchedule(task: ScheduledIngestTask, delayMs = 0): void {
  if (delayMs > 0) {
    setTimeout(() => {
      void task();
    }, delayMs);
    return;
  }

  setImmediate(() => {
    void task();
  });
}

function normalizeUrl(url: string): string {
  return new URL(url).href;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function isRetryableIngestError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();

  if (
    message.includes('404') ||
    message.includes('400') ||
    message.includes('invalid url')
  ) {
    return false;
  }

  return (
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('econnreset') ||
    message.includes('etimedout') ||
    message.includes('enotfound') ||
    message.includes('network') ||
    message.includes('429') ||
    message.includes('408') ||
    /\b5\d\d\b/.test(message)
  );
}

export function toPublicIngestJob(job: IngestJob): IngestJob {
  return { ...job };
}

export class IngestJobQueue {
  private readonly jobs = new Map<string, IngestJob>();
  private readonly activeJobByUrl = new Map<string, string>();
  private pendingWork = 0;

  constructor(private readonly options: IngestJobQueueOptions) {}

  queueJob(url: string, requestId: string): QueueIngestJobResult {
    const normalizedUrl = normalizeUrl(url);
    const activeJobId = this.activeJobByUrl.get(normalizedUrl);
    const activeJob = activeJobId ? this.jobs.get(activeJobId) : null;

    if (activeJob && (activeJob.status === 'queued' || activeJob.status === 'running')) {
      return {
        job: toPublicIngestJob(activeJob),
        reused: true,
      };
    }

    const timestamp = this.nowIso();
    const job: IngestJob = {
      id: this.options.idFactory?.() ?? randomUUID(),
      url: normalizedUrl,
      requestId,
      status: 'queued',
      attempts: 0,
      maxAttempts: this.options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.jobs.set(job.id, job);
    this.activeJobByUrl.set(normalizedUrl, job.id);
    this.scheduleJob(job.id);

    logger.info('ingest_job_queued', {
      jobId: job.id,
      requestId,
      url: normalizedUrl,
    });

    return {
      job: toPublicIngestJob(job),
      reused: false,
    };
  }

  getJob(jobId: string): IngestJob | null {
    const job = this.jobs.get(jobId);
    return job ? toPublicIngestJob(job) : null;
  }

  resetForTests(): void {
    this.jobs.clear();
    this.activeJobByUrl.clear();
  }

  async waitForIdleForTests(timeoutMs = 2000): Promise<void> {
    const startedAt = Date.now();

    while (this.pendingWork > 0) {
      if (Date.now() - startedAt > timeoutMs) {
        throw new Error('Timed out waiting for ingest jobs to settle');
      }

      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  }

  private nowIso(): string {
    return (this.options.now?.() ?? new Date()).toISOString();
  }

  private setJobStatus(job: IngestJob, status: IngestJobStatus): void {
    job.status = status;
    job.updatedAt = this.nowIso();
  }

  private scheduleJob(jobId: string, delayMs = 0): void {
    this.pendingWork += 1;
    const schedule = this.options.schedule ?? defaultSchedule;

    schedule(async () => {
      try {
        await this.processJob(jobId);
      } finally {
        this.pendingWork -= 1;
      }
    }, delayMs);
  }

  private async processJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);

    if (!job || job.status !== 'queued') {
      return;
    }

    this.setJobStatus(job, 'running');
    job.attempts += 1;
    job.startedAt ??= this.nowIso();

    logger.info('ingest_job_started', {
      jobId: job.id,
      requestId: job.requestId,
      url: job.url,
      attempt: job.attempts,
      maxAttempts: job.maxAttempts,
    });

    try {
      const result = await this.options.runIngest(job.url);
      job.result = result;
      job.error = undefined;
      job.completedAt = this.nowIso();
      this.setJobStatus(job, 'done');
      this.activeJobByUrl.delete(job.url);

      logger.info('ingest_job_completed', {
        jobId: job.id,
        requestId: job.requestId,
        result,
        attempts: job.attempts,
      });
    } catch (error) {
      const message = getErrorMessage(error);
      job.error = message;

      if (job.attempts < job.maxAttempts && isRetryableIngestError(error)) {
        this.setJobStatus(job, 'queued');
        this.scheduleJob(job.id, this.options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS);

        logger.warn('ingest_job_retry_scheduled', {
          jobId: job.id,
          requestId: job.requestId,
          error: message,
          attempt: job.attempts,
          maxAttempts: job.maxAttempts,
        });
        return;
      }

      job.completedAt = this.nowIso();
      this.setJobStatus(job, 'failed');
      this.activeJobByUrl.delete(job.url);

      logger.error('ingest_job_failed', {
        jobId: job.id,
        requestId: job.requestId,
        error: message,
        attempts: job.attempts,
      });
    }
  }
}

export function createIngestJobQueue(options: IngestJobQueueOptions): IngestJobQueue {
  return new IngestJobQueue(options);
}
