import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { customShelves } from '../db/schema.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router();

// GET /api/v1/shelves - List all custom shelves for user
router.get('/', authMiddleware, async (req, res) => {
  const tokenUser = (req as any).user;
  try {
    const list = await db.query.customShelves.findMany({
      where: eq(customShelves.userId, tokenUser.id),
      orderBy: (s, { asc }) => [asc(s.sortOrder)]
    });
    return res.json(list);
  } catch (error: any) {
    console.error('Fetch shelves error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/v1/shelves - Create a custom shelf
router.post('/', authMiddleware, async (req, res) => {
  const tokenUser = (req as any).user;
  const { name, description, color, icon } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Shelf name is required.' });
  }

  try {
    const [newShelf] = await db.insert(customShelves).values({
      userId: tokenUser.id,
      name,
      description: description || null,
      color: color || '#d4b26f',
      icon: icon || 'Bookmark',
      isPublic: false,
    }).returning();

    return res.status(201).json(newShelf);
  } catch (error: any) {
    console.error('Create shelf error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
