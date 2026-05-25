import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { readingCircles, circleMembers, discussionThreads, discussionPosts, users } from '../db/schema.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router();

// GET /api/v1/circles - Fetch all circles
router.get('/', authMiddleware, async (req, res) => {
  try {
    const list = await db.query.readingCircles.findMany({
      orderBy: (c, { desc }) => [desc(c.createdAt)]
    });
    return res.json(list);
  } catch (error: any) {
    console.error('Fetch circles error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/v1/circles - Create a circle
router.post('/', authMiddleware, async (req, res) => {
  const tokenUser = (req as any).user;
  const { name, description, currentBookId, isPrivate, maxMembers } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Circle name is required.' });
  }

  const code = `RC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  try {
    // Insert new reading circle
    const [newCircle] = await db.insert(readingCircles).values({
      name,
      description: description || null,
      creatorId: tokenUser.id,
      currentBookId: currentBookId || null,
      isPrivate: isPrivate !== undefined ? isPrivate : true,
      inviteCode: code,
      maxMembers: maxMembers ? parseInt(maxMembers) : 10,
    }).returning();

    // Auto-join creator as Admin member
    await db.insert(circleMembers).values({
      circleId: newCircle.id,
      userId: tokenUser.id,
      role: 'admin',
    });

    return res.status(201).json(newCircle);
  } catch (error: any) {
    console.error('Create circle error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/v1/circles/join - Join circle by invite code
router.post('/join', authMiddleware, async (req, res) => {
  const tokenUser = (req as any).user;
  const { inviteCode } = req.body;

  if (!inviteCode) {
    return res.status(400).json({ error: 'Invite code is required.' });
  }

  try {
    const circle = await db.query.readingCircles.findFirst({
      where: eq(readingCircles.inviteCode, inviteCode)
    });

    if (!circle) {
      return res.status(404).json({ error: 'Reading circle not found with this code.' });
    }

    // Check membership
    const membership = await db.query.circleMembers.findFirst({
      where: and(eq(circleMembers.circleId, circle.id), eq(circleMembers.userId, tokenUser.id))
    });

    if (membership) {
      return res.status(400).json({ error: 'You are already a member of this circle.' });
    }

    // Insert membership
    await db.insert(circleMembers).values({
      circleId: circle.id,
      userId: tokenUser.id,
      role: 'member',
    });

    return res.json({ message: 'Joined circle successfully.', circle });
  } catch (error: any) {
    console.error('Join circle error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/v1/circles/:id - Get circle detail and threads
router.get('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const circle = await db.query.readingCircles.findFirst({
      where: eq(readingCircles.id, id),
      with: {
        threads: {
          orderBy: (t, { desc }) => [desc(t.createdAt)]
        },
        members: {
          with: {
            user: true
          }
        }
      }
    });

    if (!circle) {
      return res.status(404).json({ error: 'Reading circle not found.' });
    }

    return res.json(circle);
  } catch (error: any) {
    console.error('Fetch circle details error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/v1/circles/:id/threads - Create a discussion thread
router.post('/:id/threads', authMiddleware, async (req, res) => {
  const tokenUser = (req as any).user;
  const { id } = req.params;
  const { title, bookId, chapter, spoilerLevel } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Thread title is required.' });
  }

  try {
    const [newThread] = await db.insert(discussionThreads).values({
      circleId: id,
      title,
      bookId: bookId || null,
      creatorId: tokenUser.id,
      chapter: chapter || null,
      spoilerLevel: spoilerLevel ? parseInt(spoilerLevel) : 0,
    }).returning();

    return res.status(201).json(newThread);
  } catch (error: any) {
    console.error('Create thread error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/v1/threads/:id/posts - List posts in thread
router.get('/threads/:id/posts', authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const posts = await db.query.discussionPosts.findMany({
      where: eq(discussionPosts.threadId, id),
      orderBy: (p, { asc }) => [asc(p.createdAt)],
      with: {
        user: {
          columns: {
            id: true,
            username: true,
            avatarUrl: true
          }
        }
      }
    });

    return res.json(posts);
  } catch (error: any) {
    console.error('Fetch posts error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/v1/threads/:id/posts - Add post/reply inside discussion thread
router.post('/threads/:id/posts', authMiddleware, async (req, res) => {
  const tokenUser = (req as any).user;
  const { id } = req.params;
  const { content, parentPostId } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'Content is required.' });
  }

  try {
    const [newPost] = await db.insert(discussionPosts).values({
      threadId: id,
      userId: tokenUser.id,
      content,
      parentPostId: parentPostId || null,
      reactions: {},
    }).returning();

    const postWithUser = {
      ...newPost,
      user: {
        id: tokenUser.id,
        username: tokenUser.username,
        avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${tokenUser.username}`
      }
    };

    return res.status(201).json(postWithUser);
  } catch (error: any) {
    console.error('Create post error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
