import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { readingSessions, books, notes } from '../db/schema.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router();

// GET /api/v1/sessions - Fetch all sessions of the user
router.get('/', authMiddleware, async (req, res) => {
  const tokenUser = (req as any).user;
  try {
    const list = await db.query.readingSessions.findMany({
      where: eq(readingSessions.userId, tokenUser.id),
      orderBy: (s, { desc }) => [desc(s.startTime)]
    });
    return res.json(list);
  } catch (error: any) {
    console.error('Fetch sessions error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/v1/sessions - Add a completed reading session
router.post('/', authMiddleware, async (req, res) => {
  const tokenUser = (req as any).user;
  const { 
    bookId, startTime, endTime, durationMinutes, 
    pagesStart, pagesEnd, pagesRead, formatUsed, 
    location, moodBefore, moodAfter, notes: sessionNotes 
  } = req.body;

  if (!bookId || !startTime || !endTime) {
    return res.status(400).json({ error: 'Book ID, start time, and end time are required.' });
  }

  try {
    // Check if book exists and user owns it
    const book = await db.query.books.findFirst({
      where: and(eq(books.id, bookId), eq(books.userId, tokenUser.id))
    });

    if (!book) {
      return res.status(404).json({ error: 'Associated book not found.' });
    }

    // Insert reading session
    const [newSession] = await db.insert(readingSessions).values({
      userId: tokenUser.id,
      bookId,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      durationMinutes: durationMinutes ? parseInt(durationMinutes) : 0,
      pagesStart: pagesStart ? parseInt(pagesStart) : 0,
      pagesEnd: pagesEnd ? parseInt(pagesEnd) : 0,
      pagesRead: pagesRead ? parseInt(pagesRead) : 0,
      formatUsed: formatUsed || book.format,
      location: location || 'unknown',
      moodBefore: moodBefore || 'neutral',
      moodAfter: moodAfter || 'neutral',
      notes: sessionNotes || null,
    }).returning();

    // Update book status and progress
    const isFinished = (pagesEnd ? parseInt(pagesEnd) : 0) >= (book.pageCount || 0);
    const bookUpdates: Partial<typeof books.$inferInsert> = {
      currentPage: pagesEnd ? parseInt(pagesEnd) : 0,
      status: isFinished ? 'finished' : 'reading',
      updatedAt: new Date(),
    };

    if (book.status === 'to-read') {
      bookUpdates.dateStarted = new Date(startTime);
    }
    if (isFinished && book.status !== 'finished') {
      bookUpdates.dateFinished = new Date(endTime);
      bookUpdates.progressPercentage = '100.00';
    } else if (book.pageCount && book.pageCount > 0) {
      const p = parseFloat(((bookUpdates.currentPage! / book.pageCount) * 100).toFixed(2));
      bookUpdates.progressPercentage = p.toString();
    }

    await db.update(books)
      .set(bookUpdates)
      .where(eq(books.id, bookId));

    // If session note was added, insert it in the notes table
    if (sessionNotes) {
      await db.insert(notes).values({
        userId: tokenUser.id,
        bookId,
        type: 'thought',
        content: sessionNotes,
        pageNumber: pagesEnd ? parseInt(pagesEnd) : null,
        tags: [location ? location.toLowerCase() : 'session-reflect'],
        isFavorite: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return res.status(201).json(newSession);
  } catch (error: any) {
    console.error('Create session error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/v1/sessions/stats - Aggregate reading statistics
router.get('/stats', authMiddleware, async (req, res) => {
  const tokenUser = (req as any).user;

  try {
    // Fetch books
    const userBooks = await db.query.books.findMany({
      where: eq(books.userId, tokenUser.id)
    });

    // Aggregate reading sessions
    const sessions = await db.query.readingSessions.findMany({
      where: eq(readingSessions.userId, tokenUser.id)
    });

    const totalPages = sessions.reduce((sum, s) => sum + (s.pagesRead || 0), 0);
    const totalMinutes = sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
    const booksFinished = userBooks.filter(b => b.status === 'finished').length;
    const booksReading = userBooks.filter(b => b.status === 'reading').length;
    
    // Breakdown of formats
    const formatBreakdown: Record<string, number> = {};
    userBooks.forEach(b => {
      formatBreakdown[b.format] = (formatBreakdown[b.format] || 0) + 1;
    });

    // Breakdown of locations
    const locationBreakdown: Record<string, number> = {};
    sessions.forEach(s => {
      if (s.location) {
        locationBreakdown[s.location] = (locationBreakdown[s.location] || 0) + 1;
      }
    });

    // Breakdown of moods
    const moodBreakdown: Record<string, number> = {};
    sessions.forEach(s => {
      if (s.moodAfter) {
        moodBreakdown[s.moodAfter] = (moodBreakdown[s.moodAfter] || 0) + 1;
      }
    });

    return res.json({
      booksFinished,
      booksReading,
      totalSessions: sessions.length,
      totalPagesRead: totalPages,
      totalHoursRead: parseFloat((totalMinutes / 60).toFixed(1)),
      formatBreakdown,
      locationBreakdown,
      moodBreakdown
    });
  } catch (error: any) {
    console.error('Fetch stats error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
