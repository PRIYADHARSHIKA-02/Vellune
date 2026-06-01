import Queue from 'bull';
import { ReviewsService } from './reviews-service.js';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
let reviewQueue: Queue.Queue | null = null;
let queueEnabled = false;

try {
  reviewQueue = new Queue('book-reviews', redisUrl, {
    redis: {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
    }
  });

  reviewQueue.on('error', (err) => {
    console.warn('[Bull Queue] Connection failed, switching to synchronous in-process review fetching:', err.message);
    queueEnabled = false;
  });

  reviewQueue.on('ready', () => {
    queueEnabled = true;
    console.log('[Bull Queue] Connected and active.');
  });

  // Process queue jobs
  reviewQueue.process(async (job) => {
    const { isbn, bookId } = job.data;
    console.log(`[Bull Queue] Starting review fetch for ISBN: ${isbn}, Book ID: ${bookId}`);
    await ReviewsService.fetchAndCacheReviews(isbn, bookId);
    console.log(`[Bull Queue] Completed review fetch for ISBN: ${isbn}`);
  });

} catch (e: any) {
  console.warn('[Bull Queue] Could not initialize, using synchronous fallback:', e.message);
  queueEnabled = false;
}

export class ReviewQueueService {
  static async addReviewFetchJob(isbn: string, bookId?: string): Promise<void> {
    if (queueEnabled && reviewQueue) {
      try {
        // Prevent duplicate active/waiting jobs for the same isbn
        const activeJobs = await reviewQueue.getActive();
        const waitingJobs = await reviewQueue.getWaiting();
        const exists = [...activeJobs, ...waitingJobs].some(
          job => job.data.isbn === isbn
        );

        if (exists) {
          console.log(`[Bull Queue] Job already exists for ISBN: ${isbn}. Skipping add.`);
          return;
        }

        await reviewQueue.add({ isbn, bookId }, { removeOnComplete: true, removeOnFail: true });
        console.log(`[Bull Queue] Job added for ISBN: ${isbn}`);
        return;
      } catch (err: any) {
        console.warn('[Bull Queue] Failed to queue job, falling back to sync fetch:', err.message);
      }
    }

    // Fallback: execute in background asynchronously (without blocking request thread)
    console.log(`[Queue Fallback] Fetching reviews asynchronously in background for ISBN: ${isbn}`);
    ReviewsService.fetchAndCacheReviews(isbn, bookId).catch(err => {
      console.error('[Queue Fallback] Error fetching reviews in background:', err);
    });
  }
}
