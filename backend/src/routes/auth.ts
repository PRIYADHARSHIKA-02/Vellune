import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { eq, or } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { users } from '../db/schema.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_dev_key_for_tokens_1234';

// POST /api/v1/auth/register
router.post('/register', async (req, res) => {
  const { email, username, password, fullName } = req.body;
  if (!email || !username || !password) {
    return res.status(400).json({ error: 'Email, username, and password are required.' });
  }

  try {
    const existingEmail = await db.query.users.findFirst({
      where: eq(users.email, email)
    });
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    const existingUsername = await db.query.users.findFirst({
      where: eq(users.username, username)
    });
    if (existingUsername) {
      return res.status(400).json({ error: 'Username already taken.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [newUser] = await db.insert(users).values({
      email,
      username,
      password: passwordHash,
      fullName: fullName || null,
      avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${username}`,
    }).returning();

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, username: newUser.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        fullName: newUser.fullName,
        avatarUrl: newUser.avatarUrl,
      }
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/v1/auth/login
router.post('/login', async (req, res) => {
  const { usernameOrEmail, password } = req.body;
  if (!usernameOrEmail || !password) {
    return res.status(400).json({ error: 'Username/email and password are required.' });
  }

  try {
    const user = await db.query.users.findFirst({
      where: or(eq(users.email, usernameOrEmail), eq(users.username, usernameOrEmail))
    });

    if (!user || !user.password) {
      return res.status(401).json({ error: 'Invalid username/email or password.' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid username/email or password.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/v1/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  const tokenUser = (req as any).user;
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, tokenUser.id)
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        preferences: user.preferences,
        readingGoalAnnual: user.readingGoalAnnual,
        timezone: user.timezone
      }
    });
  } catch (error: any) {
    console.error('Auth check error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PATCH /api/v1/auth/me
router.patch('/me', authMiddleware, async (req, res) => {
  const tokenUser = (req as any).user;
  const { fullName, avatarUrl, readingGoalAnnual, timezone, preferences } = req.body;

  try {
    const [updatedUser] = await db.update(users)
      .set({
        ...(fullName !== undefined ? { fullName } : {}),
        ...(avatarUrl !== undefined ? { avatarUrl } : {}),
        ...(readingGoalAnnual !== undefined ? { readingGoalAnnual } : {}),
        ...(timezone !== undefined ? { timezone } : {}),
        ...(preferences !== undefined ? { preferences } : {}),
        updatedAt: new Date()
      })
      .where(eq(users.id, tokenUser.id))
      .returning();

    return res.json({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        username: updatedUser.username,
        fullName: updatedUser.fullName,
        avatarUrl: updatedUser.avatarUrl,
        preferences: updatedUser.preferences,
        readingGoalAnnual: updatedUser.readingGoalAnnual,
        timezone: updatedUser.timezone
      }
    });
  } catch (error: any) {
    console.error('Profile update error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
