import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { notes, books } from '../db/schema.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router();

// GET /api/v1/notes - Fetch notes, optional query parameter bookId
router.get('/', authMiddleware, async (req, res) => {
  const tokenUser = (req as any).user;
  const { bookId } = req.query;

  try {
    const condition = bookId 
      ? and(eq(notes.userId, tokenUser.id), eq(notes.bookId, bookId as string))
      : eq(notes.userId, tokenUser.id);

    const list = await db.query.notes.findMany({
      where: condition,
      orderBy: (n, { desc }) => [desc(n.createdAt)]
    });

    return res.json(list);
  } catch (error: any) {
    console.error('Fetch notes error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/v1/notes - Create new note
router.post('/', authMiddleware, async (req, res) => {
  const tokenUser = (req as any).user;
  const { 
    bookId, type, content, pageNumber, chapter, 
    timestampInBook, tags, isFavorite 
  } = req.body;

  if (!bookId || !type || !content) {
    return res.status(400).json({ error: 'Book ID, note type, and content are required.' });
  }

  try {
    // Check if book exists and user owns it
    const book = await db.query.books.findFirst({
      where: and(eq(books.id, bookId), eq(books.userId, tokenUser.id))
    });

    if (!book) {
      return res.status(404).json({ error: 'Associated book not found.' });
    }

    const [newNote] = await db.insert(notes).values({
      userId: tokenUser.id,
      bookId,
      type,
      content,
      pageNumber: pageNumber ? parseInt(pageNumber) : null,
      chapter: chapter || null,
      timestampInBook: timestampInBook ? parseInt(timestampInBook) : null,
      tags: tags || [],
      isFavorite: isFavorite || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    return res.status(201).json(newNote);
  } catch (error: any) {
    console.error('Create note error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PATCH /api/v1/notes/:id - Update note
router.patch('/:id', authMiddleware, async (req, res) => {
  const tokenUser = (req as any).user;
  const { id } = req.params;
  const updates = req.body;

  try {
    const existing = await db.query.notes.findFirst({
      where: and(eq(notes.id, id), eq(notes.userId, tokenUser.id))
    });

    if (!existing) {
      return res.status(404).json({ error: 'Note not found.' });
    }

    const [updatedNote] = await db.update(notes)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(eq(notes.id, id), eq(notes.userId, tokenUser.id)))
      .returning();

    return res.json(updatedNote);
  } catch (error: any) {
    console.error('Update note error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE /api/v1/notes/:id - Delete note
router.delete('/:id', authMiddleware, async (req, res) => {
  const tokenUser = (req as any).user;
  const { id } = req.params;

  try {
    const existing = await db.query.notes.findFirst({
      where: and(eq(notes.id, id), eq(notes.userId, tokenUser.id))
    });

    if (!existing) {
      return res.status(404).json({ error: 'Note not found.' });
    }

    await db.delete(notes).where(and(eq(notes.id, id), eq(notes.userId, tokenUser.id)));

    return res.json({ message: 'Note deleted successfully.' });
  } catch (error: any) {
    console.error('Delete note error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
