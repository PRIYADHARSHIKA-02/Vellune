import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { books } from '../db/schema.js';
import { authMiddleware } from '../middlewares/auth.js';
import { CacheService } from '../services/cache.js';
import { BookAPIService } from '../services/book-apis.js';

const router = Router();

// GET /api/v1/books - List all books for authenticated user (Database Only - Phase 1)
router.get('/', authMiddleware, async (req, res) => {
  const tokenUser = (req as any).user;
  try {
    const userBooks = await db.query.books.findMany({
      where: eq(books.userId, tokenUser.id),
      orderBy: (b, { desc }) => [desc(b.dateAdded)],
      with: {
        userReviews: {
          where: (ur, { isNull }) => isNull(ur.deletedAt)
        }
      }
    });
    return res.json(userBooks);
  } catch (error: any) {
    console.error('Fetch books error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/v1/books/search - Search books (External APIs with Redis Caching - Phase 2)
router.post('/search', authMiddleware, async (req, res) => {
  const { query } = req.body;
  if (!query || query.trim() === '') {
    return res.status(400).json({ error: 'Search query is required.' });
  }

  const sanitizedQuery = query.trim().toLowerCase();
  const cacheKey = `search:query:${sanitizedQuery}`;
  const CACHE_TTL_SEARCH = 86400; // 24 hours

  try {
    // Attempt cache hit
    const cachedResults = await CacheService.get(cacheKey);
    if (cachedResults) {
      console.log(`[Redis] Cache Hit for query: "${sanitizedQuery}"`);
      return res.json(cachedResults);
    }

    // Cache miss - query external APIs
    console.log(`[Redis] Cache Miss for query: "${sanitizedQuery}". Fetching from external APIs...`);
    const results = await BookAPIService.search(sanitizedQuery);

    // Save results to Redis
    await CacheService.set(cacheKey, results, CACHE_TTL_SEARCH);

    return res.json(results);
  } catch (error: any) {
    console.error('Book search error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/v1/books/search - Search books (GET style, returns normalized info with shelf status)
router.get('/search', authMiddleware, async (req, res) => {
  const tokenUser = (req as any).user;
  const { q } = req.query;
  if (!q || String(q).trim() === '') {
    return res.status(400).json({ error: 'Search query parameter "q" is required.' });
  }

  const queryStr = String(q).trim();
  if (queryStr.length < 2) {
    return res.status(400).json({ error: 'Search query must be at least 2 characters.' });
  }

  const sanitizedQuery = queryStr.toLowerCase();
  const cacheKey = `search:query:get:${sanitizedQuery}`;
  const CACHE_TTL_SEARCH = 86400; // 24 hours

  try {
    const cachedResults = await CacheService.get(cacheKey);
    let results = cachedResults;

    if (!results) {
      console.log(`[Redis] Cache Miss for GET search: "${sanitizedQuery}". Fetching from external APIs...`);
      results = await BookAPIService.search(sanitizedQuery);
      await CacheService.set(cacheKey, results, CACHE_TTL_SEARCH);
    } else {
      console.log(`[Redis] Cache Hit for GET search: "${sanitizedQuery}"`);
    }

    const normalisedResults = results.map((book: any) => {
      let year = null;
      if (book.publishedDate) {
        const match = book.publishedDate.match(/^(\d{4})/);
        if (match) year = parseInt(match[1]);
      }

      return {
        title: book.title,
        author: book.author,
        isbn: book.isbn || null,
        cover_url: book.coverUrl || null,
        year: year,
        genres: book.genres || [],
        external_avg_rating: book.averageRating || 4.2,
        external_rating_count: book.ratingsCount || 120,
        onShelf: false,
        savedBookId: null
      };
    });

    return res.json(normalisedResults);
  } catch (error: any) {
    console.error('Book search GET error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/v1/books/:id - Retrieve details of a specific book (Database Only - Phase 1)
router.get('/:id', authMiddleware, async (req, res) => {
  const tokenUser = (req as any).user;
  const { id } = req.params;
  try {
    const book = await db.query.books.findFirst({
      where: and(eq(books.id, id), eq(books.userId, tokenUser.id)),
      with: {
        userReviews: {
          where: (ur, { isNull }) => isNull(ur.deletedAt)
        }
      }
    });
    if (!book) {
      return res.status(404).json({ error: 'Book not found.' });
    }
    return res.json(book);
  } catch (error: any) {
    console.error('Fetch book error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/v1/books - Create new book (Database Only - Phase 1)
router.post('/', authMiddleware, async (req, res) => {
  const tokenUser = (req as any).user;
  const { 
    title, author, isbn, coverUrl, pageCount, 
    publishedDate, publisher, description, genres, 
    language, status, format, platform, metadata, 
    currentPage, customShelfIds 
  } = req.body;

  if (!title || !author || !status || !format) {
    return res.status(400).json({ error: 'Title, author, status, and format are required.' });
  }

  const pages = pageCount ? parseInt(pageCount) : 0;
  const current = currentPage ? parseInt(currentPage) : 0;
  const progress = pages > 0 ? parseFloat(((current / pages) * 100).toFixed(2)) : 0;

  try {
    const [newBook] = await db.insert(books).values({
      userId: tokenUser.id,
      title,
      author,
      isbn: isbn || null,
      coverUrl: coverUrl || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400',
      pageCount: pages,
      publishedDate: publishedDate ? new Date(publishedDate) : null,
      publisher: publisher || null,
      description: description || null,
      genres: genres || [],
      language: language || 'en',
      status,
      format,
      platform: platform || null,
      metadata: metadata || {},
      currentPage: current,
      progressPercentage: progress.toString(),
      customShelfIds: customShelfIds || [],
      dateAdded: new Date(),
    }).returning();

    return res.status(201).json(newBook);
  } catch (error: any) {
    console.error('Create book error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PATCH /api/v1/books/:id - Update existing book (Database Only - Phase 1)
router.patch('/:id', authMiddleware, async (req, res) => {
  const tokenUser = (req as any).user;
  const { id } = req.params;
  const updates = req.body;

  try {
    const existing = await db.query.books.findFirst({
      where: and(eq(books.id, id), eq(books.userId, tokenUser.id))
    });

    if (!existing) {
      return res.status(404).json({ error: 'Book not found.' });
    }

    const payload: Partial<typeof books.$inferInsert> = {
      ...updates,
      updatedAt: new Date()
    };

    // Calculate progress
    const pages = updates.pageCount !== undefined ? parseInt(updates.pageCount) : existing.pageCount;
    const current = (updates.currentPage !== undefined ? parseInt(updates.currentPage) : existing.currentPage) || 0;
    if (pages !== null && pages > 0) {
      payload.progressPercentage = parseFloat(((current / pages) * 100).toFixed(2)).toString();
    }

    // Automate finished date triggers
    if (updates.status === 'finished' && existing.status !== 'finished') {
      payload.dateFinished = new Date();
      payload.currentPage = pages || existing.pageCount;
      payload.progressPercentage = '100.00';
    } else if (updates.status === 'reading' && existing.status === 'to-read') {
      payload.dateStarted = new Date();
    }

    const [updatedBook] = await db.update(books)
      .set(payload)
      .where(and(eq(books.id, id), eq(books.userId, tokenUser.id)))
      .returning();

    return res.json(updatedBook);
  } catch (error: any) {
    console.error('Update book error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE /api/v1/books/:id - Delete book (Database Only - Phase 1)
router.delete('/:id', authMiddleware, async (req, res) => {
  const tokenUser = (req as any).user;
  const { id } = req.params;

  try {
    const existing = await db.query.books.findFirst({
      where: and(eq(books.id, id), eq(books.userId, tokenUser.id))
    });

    if (!existing) {
      return res.status(404).json({ error: 'Book not found.' });
    }

    await db.delete(books).where(and(eq(books.id, id), eq(books.userId, tokenUser.id)));

    return res.json({ message: 'Book deleted successfully.' });
  } catch (error: any) {
    console.error('Delete book error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
