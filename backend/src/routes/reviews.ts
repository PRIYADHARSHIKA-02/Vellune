import { Router } from 'express';
import { eq, and, isNull, inArray, ne } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { books, externalReviews, bookRatingAggregates, userBookReviews, circleMembers } from '../db/schema.js';
import { authMiddleware } from '../middlewares/auth.js';
import { ReviewsService } from '../services/reviews-service.js';
import { ReviewQueueService } from '../services/review-queue.js';

const router = Router();

// GET /api/v1/books/:id/reviews - Fetch reviews & aggregate (Database UUID or ISBN supported)
router.get('/books/:id/reviews', authMiddleware, async (req, res) => {
  const tokenUser = (req as any).user;
  const { id } = req.params; // Can be UUID or ISBN
  const { source } = req.query; // Optional filter

  try {
    let bookIsbn = '';
    let targetBookId: string | null = null;

    let extSource: string | undefined = undefined;
    if (source) {
      const s = String(source).toLowerCase().trim();
      if (s === 'the guardian') {
        extSource = 'guardian';
      } else if (s === 'your friends') {
        extSource = 'Your friends';
      } else {
        extSource = s;
      }
    }

    const dbSourceFilter = (extSource && extSource !== 'all' && extSource !== 'Your friends') ? extSource : undefined;

    // Check if :id is a UUID or ISBN
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    
    if (isUuid) {
      const book = await db.query.books.findFirst({
        where: eq(books.id, id)
      });
      if (book) {
        bookIsbn = book.isbn || '';
        targetBookId = book.id;
      }
    } else {
      bookIsbn = id;
    }

    if (!bookIsbn && !targetBookId) {
      return res.status(400).json({ error: 'Valid ISBN or Book ID is required.' });
    }

    if (bookIsbn) {
      // 1. Fetch aggregate statistics
      const aggregate = await ReviewsService.getCombinedAggregate(bookIsbn, targetBookId || undefined);

      // If not cached or aggregate last updated > 7 days ago, trigger background fetch
      const expired = aggregate && (Date.now() - new Date(aggregate.lastUpdatedAt).getTime() > 7 * 24 * 60 * 60 * 1000);
      
      if (!aggregate || expired) {
        console.log(`[Reviews Router] Cache miss or expired for ISBN: ${bookIsbn}. Launching background fetch...`);
        await ReviewQueueService.addReviewFetchJob(bookIsbn, targetBookId || undefined);
        
        // If we already have some cached data, we can serve it while refreshing in background.
        // Otherwise, return "fetching" status so the frontend shows skeleton loaders.
        if (!aggregate) {
          // Find if user already has a review for their book
          let userReview = null;
          if (targetBookId) {
            userReview = await db.query.userBookReviews.findFirst({
              where: and(
                eq(userBookReviews.bookId, targetBookId),
                eq(userBookReviews.userId, tokenUser.id),
                isNull(userBookReviews.deletedAt)
              )
            });
          }

          return res.json({
            status: 'fetching',
            aggregate: null,
            sentiment: { positive: 70, neutral: 20, critical: 10 },
            reviews: [],
            user_review: userReview
          });
        }
      }

      // 2. Fetch external reviews
      let extQuery = db.select().from(externalReviews);
      if (targetBookId) {
        extQuery.where(
          dbSourceFilter 
            ? and(eq(externalReviews.bookId, targetBookId), eq(externalReviews.source, dbSourceFilter))
            : eq(externalReviews.bookId, targetBookId)
        );
      } else {
        extQuery.where(
          dbSourceFilter 
            ? and(eq(externalReviews.isbn, bookIsbn), eq(externalReviews.source, dbSourceFilter))
            : eq(externalReviews.isbn, bookIsbn)
        );
      }
      const extReviews = await extQuery;

      // 3. Fetch current user's review for this book (if exists)
      let userReview = null;
      if (targetBookId) {
        userReview = await db.query.userBookReviews.findFirst({
          where: and(
            eq(userBookReviews.bookId, targetBookId),
            eq(userBookReviews.userId, tokenUser.id),
            isNull(userBookReviews.deletedAt)
          )
        });
      } else {
        // Find the user's book with this ISBN first
        const userBook = await db.query.books.findFirst({
          where: and(eq(books.isbn, bookIsbn), eq(books.userId, tokenUser.id))
        });
        if (userBook) {
          userReview = await db.query.userBookReviews.findFirst({
            where: and(
              eq(userBookReviews.bookId, userBook.id),
              eq(userBookReviews.userId, tokenUser.id),
              isNull(userBookReviews.deletedAt)
            )
          });
        }
      }

      // 4. Fetch Reading Circle Friend reviews (Your friends tab)
      // Find all reading circles this user is a member of
      const userCircles = await db.query.circleMembers.findMany({
        where: eq(circleMembers.userId, tokenUser.id)
      });
      
      let friendReviews: any[] = [];
      if (userCircles.length > 0) {
        const circleIds = userCircles.map(c => c.circleId);
        
        // Find all fellow members in those circles
        const fellowMembers = await db.query.circleMembers.findMany({
          where: and(
            inArray(circleMembers.circleId, circleIds),
            ne(circleMembers.userId, tokenUser.id)
          )
        });
        
        if (fellowMembers.length > 0) {
          const friendUserIds = Array.from(new Set(fellowMembers.map(m => m.userId)));
          
          // Find their shared reviews for books matching this ISBN
          const rawFriendReviews = await db.select({
            id: userBookReviews.id,
            userId: userBookReviews.userId,
            starRating: userBookReviews.starRating,
            moodTags: userBookReviews.moodTags,
            recommend: userBookReviews.recommend,
            reviewText: userBookReviews.reviewText,
            isShared: userBookReviews.isShared,
            createdAt: userBookReviews.createdAt,
            updatedAt: userBookReviews.updatedAt,
            bookId: userBookReviews.bookId,
          })
          .from(userBookReviews)
          .innerJoin(books, eq(userBookReviews.bookId, books.id))
          .where(
            and(
              inArray(userBookReviews.userId, friendUserIds),
              eq(books.isbn, bookIsbn),
              eq(userBookReviews.isShared, true),
              isNull(userBookReviews.deletedAt)
            )
          );

          friendReviews = rawFriendReviews.map(r => ({
            ...r,
            source: 'Your friends',
            reviewerType: 'community',
            starRating: r.starRating,
            excerpt: r.reviewText || '',
            helpfulVotes: 0,
          }));
        }
      }

      // 5. Combine and Sort reviews as requested:
      // Default "All" horizontal scrollable filter:
      // - Editorial reviews (NYT, Guardian, etc.) first, max 2
      // - Highest-upvoted Goodreads/LibraryThing reviews next, 3-4
      // - Most recent user reviews (internal/friends) last
      let combinedReviews: any[] = [];

      // Map external reviews to display format
      const formattedExt = extReviews.map(r => ({
        id: r.id,
        source: r.source,
        starRating: r.starRating ? parseFloat(r.starRating) : null,
        excerpt: r.excerpt,
        reviewerType: r.reviewerType,
        helpfulVotes: r.helpfulVotes || 0,
        sourceUrl: r.sourceUrl,
        createdAt: r.fetchedAt
      }));

      if (extSource === 'Your friends') {
        combinedReviews = friendReviews;
      } else if (extSource && extSource !== 'all') {
        combinedReviews = formattedExt.filter(r => r.source === extSource);
      } else {
        // Default "All" curated mix
        const editorials = formattedExt.filter(r => r.reviewerType === 'editorial').slice(0, 2);
        const community = formattedExt.filter(r => r.reviewerType === 'community')
          .sort((a, b) => b.helpfulVotes - a.helpfulVotes)
          .slice(0, 4);
        
        combinedReviews = [...editorials, ...community, ...friendReviews];
      }

      return res.json({
        status: 'success',
        aggregate,
        sentiment: {
          positive: aggregate.positivePct,
          neutral: aggregate.neutralPct,
          critical: aggregate.criticalPct
        },
        reviews: combinedReviews,
        user_review: userReview
      });
    } else {
      // Local-only reviews (No ISBN available)
      let userReview = null;
      if (targetBookId) {
        userReview = await db.query.userBookReviews.findFirst({
          where: and(
            eq(userBookReviews.bookId, targetBookId),
            eq(userBookReviews.userId, tokenUser.id),
            isNull(userBookReviews.deletedAt)
          )
        });
      }

      return res.json({
        status: 'success',
        aggregate: null,
        sentiment: { positive: 0, neutral: 0, critical: 0 },
        reviews: [],
        user_review: userReview
      });
    }

  } catch (error: any) {
    console.error('Fetch book reviews error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/v1/books/:id/reviews/aggregate - Fetch rating statistics only
router.get('/books/:id/reviews/aggregate', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    let bookIsbn = id;
    let targetBookId: string | null = null;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    if (isUuid) {
      const book = await db.query.books.findFirst({
        where: eq(books.id, id)
      });
      if (book) {
        bookIsbn = book.isbn || '';
        targetBookId = book.id;
      }
    }

    if (!bookIsbn) {
      return res.status(400).json({ error: 'ISBN or Book ID is required.' });
    }

    const aggregate = await ReviewsService.getCombinedAggregate(bookIsbn, targetBookId || undefined);
    if (!aggregate) {
      return res.json({
        weightedAvgScore: '0.0',
        totalRatingCount: 0,
        positivePct: 0,
        neutralPct: 0,
        criticalPct: 0,
        ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      });
    }

    return res.json(aggregate);
  } catch (error: any) {
    console.error('Fetch reviews aggregate error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/v1/books/:id/reviews - Create or update UserBookReview (upsert on user_id + book_id)
router.post('/books/:id/reviews', authMiddleware, async (req, res) => {
  const tokenUser = (req as any).user;
  const { id } = req.params; // Must be book UUID
  const { star_rating, mood_tags, recommend, review_text, is_shared } = req.body;

  if (star_rating === undefined || star_rating === null || parseFloat(star_rating) < 0.5) {
    return res.status(400).json({ error: 'Star rating is required and must be at least 0.5 stars.' });
  }

  try {
    // Verify book exists
    const book = await db.query.books.findFirst({
      where: and(eq(books.id, id), eq(books.userId, tokenUser.id))
    });

    if (!book) {
      return res.status(404).json({ error: 'Book not found on your shelf.' });
    }

    // Check if review already exists
    const existingReview = await db.query.userBookReviews.findFirst({
      where: and(eq(userBookReviews.bookId, id), eq(userBookReviews.userId, tokenUser.id))
    });

    const ratingVal = parseFloat(star_rating).toFixed(1);
    const moods = mood_tags || [];

    let savedReview;
    if (existingReview) {
      // Update
      const [updated] = await db.update(userBookReviews)
        .set({
          starRating: ratingVal,
          moodTags: moods,
          recommend: recommend || null,
          reviewText: review_text || null,
          isShared: !!is_shared,
          deletedAt: null, // Undelete if soft-deleted
          updatedAt: new Date()
        })
        .where(eq(userBookReviews.id, existingReview.id))
        .returning();
      savedReview = updated;
    } else {
      // Create
      const [created] = await db.insert(userBookReviews)
        .values({
          userId: tokenUser.id,
          bookId: id,
          starRating: ratingVal,
          moodTags: moods,
          recommend: recommend || null,
          reviewText: review_text || null,
          isShared: !!is_shared,
        })
        .returning();
      savedReview = created;
    }

    // Trigger rating aggregate recalculation asynchronously
    if (book.isbn) {
      ReviewsService.fetchAndCacheReviews(book.isbn, book.id).catch(err => {
        console.error('[ReviewsService] Async recache error:', err);
      });
    }

    return res.status(existingReview ? 200 : 201).json(savedReview);

  } catch (error: any) {
    console.error('Upsert review error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PATCH /api/v1/reviews/:id - Edit own review
router.patch('/reviews/:id', authMiddleware, async (req, res) => {
  const tokenUser = (req as any).user;
  const { id } = req.params;
  const { star_rating, mood_tags, recommend, review_text, is_shared } = req.body;

  try {
    const existing = await db.query.userBookReviews.findFirst({
      where: and(eq(userBookReviews.id, id), eq(userBookReviews.userId, tokenUser.id))
    });

    if (!existing) {
      return res.status(404).json({ error: 'Review not found or unauthorized.' });
    }

    const updates: Partial<typeof userBookReviews.$inferInsert> = {
      updatedAt: new Date()
    };

    if (star_rating !== undefined) {
      updates.starRating = parseFloat(star_rating).toFixed(1);
    }
    if (mood_tags !== undefined) {
      updates.moodTags = mood_tags;
    }
    if (recommend !== undefined) {
      updates.recommend = recommend;
    }
    if (review_text !== undefined) {
      updates.reviewText = review_text;
    }
    if (is_shared !== undefined) {
      updates.isShared = !!is_shared;
    }

    const [updated] = await db.update(userBookReviews)
      .set(updates)
      .where(eq(userBookReviews.id, id))
      .returning();

    // Trigger aggregate recache
    const book = await db.query.books.findFirst({
      where: eq(books.id, existing.bookId)
    });
    if (book && book.isbn) {
      ReviewsService.fetchAndCacheReviews(book.isbn, book.id).catch(err => {
        console.error('[ReviewsService] Recache error:', err);
      });
    }

    return res.json(updated);

  } catch (error: any) {
    console.error('Edit review error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE /api/v1/reviews/:id - Soft-delete own review (sets deleted_at)
router.delete('/reviews/:id', authMiddleware, async (req, res) => {
  const tokenUser = (req as any).user;
  const { id } = req.params;

  try {
    const existing = await db.query.userBookReviews.findFirst({
      where: and(eq(userBookReviews.id, id), eq(userBookReviews.userId, tokenUser.id))
    });

    if (!existing) {
      return res.status(404).json({ error: 'Review not found or unauthorized.' });
    }

    // Perform soft delete by setting deletedAt
    const [deleted] = await db.update(userBookReviews)
      .set({ deletedAt: new Date() })
      .where(eq(userBookReviews.id, id))
      .returning();

    // Trigger aggregate recache
    const book = await db.query.books.findFirst({
      where: eq(books.id, existing.bookId)
    });
    if (book && book.isbn) {
      ReviewsService.fetchAndCacheReviews(book.isbn, book.id).catch(err => {
        console.error('[ReviewsService] Recache error:', err);
      });
    }

    return res.json({ message: 'Review deleted successfully.', review: deleted });

  } catch (error: any) {
    console.error('Delete review error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
