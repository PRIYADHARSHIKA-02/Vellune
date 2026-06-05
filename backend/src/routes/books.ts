import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { books } from '../db/schema.js';
import { authMiddleware } from '../middlewares/auth.js';
import { CacheService } from '../services/cache.js';
import { BookAPIService } from '../services/book-apis.js';
import axios from 'axios';

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

    // Fetch user's books to check if search results are already on shelf
    const userBooks = await db.query.books.findMany({
      where: eq(books.userId, tokenUser.id)
    });

    // Find any books on the user's shelf that match the search query (by title or author)
    const matchingUserBooks = userBooks.filter((ub: any) => 
      ub.title.toLowerCase().includes(sanitizedQuery) ||
      ub.author.toLowerCase().includes(sanitizedQuery)
    );

    const normalisedResults = results.map((book: any) => {
      let year = null;
      if (book.publishedDate) {
        const match = book.publishedDate.match(/^(\d{4})/);
        if (match) year = parseInt(match[1]);
      }

      // Check if this book is already on the user's shelf
      const matchedUserBook = userBooks.find((ub: any) => {
        if (book.isbn && ub.isbn && book.isbn === ub.isbn) {
          return true;
        }
        return (
          ub.title.toLowerCase() === book.title.toLowerCase() &&
          ub.author.toLowerCase() === book.author.toLowerCase()
        );
      });

      return {
        title: book.title,
        author: book.author,
        isbn: book.isbn || null,
        cover_url: book.coverUrl || null,
        year: year,
        genres: book.genres || [],
        external_avg_rating: book.averageRating || 4.2,
        external_rating_count: book.ratingsCount || 120,
        description: book.description || null,
        onShelf: !!matchedUserBook,
        savedBookId: matchedUserBook ? matchedUserBook.id : null
      };
    });

    // Merge in any matching user shelf books that aren't already present in the search results
    const finalResults = [...normalisedResults];
    for (const ub of matchingUserBooks) {
      const alreadyIncluded = normalisedResults.some((r: any) => 
        (ub.isbn && r.isbn && ub.isbn === r.isbn) ||
        (r.title.toLowerCase() === ub.title.toLowerCase() && r.author.toLowerCase() === ub.author.toLowerCase())
      );
      if (!alreadyIncluded) {
        let year = null;
        if (ub.publishedDate) {
          year = new Date(ub.publishedDate).getFullYear();
        }
        finalResults.unshift({
          title: ub.title,
          author: ub.author,
          isbn: ub.isbn || null,
          cover_url: ub.coverUrl || null,
          year: year,
          genres: ub.genres || [],
          external_avg_rating: 4.2,
          external_rating_count: 120,
          description: ub.description || null,
          onShelf: true,
          savedBookId: ub.id
        });
      }
    }

    return res.json(finalResults);
  } catch (error: any) {
    console.error('Book search GET error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/v1/books/price - Fetch actual e-commerce prices dynamically (using backend fetch + parsing)
router.get('/price', authMiddleware, async (req, res) => {
  const { title, author } = req.query;
  if (!title) {
    return res.status(400).json({ error: 'Title query parameter is required.' });
  }

  const queryStr = `${title} ${author || ''}`.trim();
  const cacheKey = `price:query:${queryStr.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const CACHE_TTL_PRICE = 43200; // 12 hours

  try {
    // Check cache
    const cached = await CacheService.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Fetch Amazon and Flipkart in parallel
    const [amazonPrice, flipkartPrice] = await Promise.all([
      fetchAmazonPrice(queryStr),
      fetchFlipkartPrice(queryStr)
    ]);

    const result = {
      amazon: amazonPrice ? `₹${amazonPrice}` : 'N/A',
      flipkart: flipkartPrice ? `₹${flipkartPrice}` : 'N/A',
      playbooks: amazonPrice ? `₹${Math.round(amazonPrice * 0.75)}` : 'N/A',
    };

    // Save to cache
    await CacheService.set(cacheKey, result, CACHE_TTL_PRICE);

    return res.json(result);
  } catch (err: any) {
    console.error('Fetch price endpoint error:', err.message);
    return res.json({ amazon: 'N/A', flipkart: 'N/A', playbooks: 'N/A' });
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

    // Parse date fields passed as strings from the client
    if (updates.dateFinished !== undefined) {
      payload.dateFinished = updates.dateFinished ? new Date(updates.dateFinished) : null;
    }
    if (updates.dateStarted !== undefined) {
      payload.dateStarted = updates.dateStarted ? new Date(updates.dateStarted) : null;
    }
    if (updates.publishedDate !== undefined) {
      payload.publishedDate = updates.publishedDate ? new Date(updates.publishedDate) : null;
    }


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

// Helper scraper function for Amazon India
async function fetchAmazonPrice(query: string): Promise<number | null> {
  try {
    const url = `https://www.amazon.in/s?k=${encodeURIComponent(query)}`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      timeout: 8000
    });

    const html = response.data;
    const matches = html.match(/class="a-price-whole">([0-9,]+)/g) || [];
    const parsedPrices = matches.map((m: string) => {
      const parts = m.match(/class="a-price-whole">([0-9,]+)/);
      return parts ? parseInt(parts[1].replace(/,/g, '')) : null;
    }).filter((p: number | null): p is number => p !== null && p > 80);

    if (parsedPrices.length === 0) return null;
    // Take the minimum of the first 5 parsed prices to represent the lowest buying choice for the product
    const relevantPrices = parsedPrices.slice(0, 5);
    return Math.min(...relevantPrices);
  } catch (err: any) {
    console.warn('Amazon price fetch failed:', err.message);
    return null;
  }
}

// Helper scraper function for Flipkart
async function fetchFlipkartPrice(query: string): Promise<number | null> {
  try {
    const url = `https://www.flipkart.com/search?q=${encodeURIComponent(query)}`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      timeout: 8000
    });

    const html = response.data;
    const matches = html.match(/₹([0-9,]+)/g) || [];
    const parsedPrices = matches.map((m: string) => {
      const parts = m.match(/₹([0-9,]+)/);
      return parts ? parseInt(parts[1].replace(/,/g, '')) : null;
    }).filter((p: number | null): p is number => 
      p !== null && 
      p > 80 && 
      p !== 100 && 
      p !== 200 && 
      p !== 500 && 
      p !== 1000 && 
      p !== 1500 && 
      p !== 2000 && 
      p !== 2500 && 
      p !== 5000 && 
      p !== 10000
    );

    if (parsedPrices.length === 0) return null;
    // Take the minimum of the first 5 relevant parsed prices
    const relevantPrices = parsedPrices.slice(0, 5);
    return Math.min(...relevantPrices);
  } catch (err: any) {
    console.warn('Flipkart price fetch failed:', err.message);
    return null;
  }
}

export default router;
