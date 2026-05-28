import { Router } from 'express';
import { eq, and, ne, sql, desc, asc } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { 
  readingCircles, 
  circleMembers, 
  discussionThreads, 
  discussionPosts, 
  users, 
  circleInvitations,
  books 
} from '../db/schema.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router();

// Helper to calculate progress percentage
function calculatePercentage(progress: number, pageCount: number | null): number {
  if (!pageCount || pageCount <= 0) return 0;
  return Math.min(100, Math.round((progress / pageCount) * 100));
}

// GET /api/v1/circles - Fetch all circles the user is a member of
router.get('/', authMiddleware, async (req, res) => {
  const tokenUser = (req as any).user;

  try {
    // Find all memberships for this user
    const memberships = await db.query.circleMembers.findMany({
      where: eq(circleMembers.userId, tokenUser.id)
    });

    if (memberships.length === 0) {
      return res.json([]);
    }

    const circleIds = memberships.map(m => m.circleId);

    // Fetch the circles
    const circlesList = await db.query.readingCircles.findMany({
      where: (c, { inArray }) => inArray(c.id, circleIds),
      orderBy: (c, { desc }) => [desc(c.createdAt)],
      with: {
        currentBook: true,
        members: {
          with: {
            user: {
              columns: {
                id: true,
                username: true,
                avatarUrl: true,
                fullName: true
              }
            }
          }
        },
        threads: {
          orderBy: (t, { desc }) => [desc(t.createdAt)]
        }
      }
    });

    // Compute progress stats for each circle
    const circlesWithProgress = circlesList.map(circle => {
      const pageCount = circle.currentBook?.pageCount || 0;
      
      // User's own membership
      const ownMember = circle.members.find(m => m.userId === tokenUser.id);
      const userProgress = ownMember?.currentProgress || 0;
      const userProgressPercentage = calculatePercentage(userProgress, pageCount);

      // Others membership
      const otherMembers = circle.members.filter(m => m.userId !== tokenUser.id);
      let othersAvgProgress = 0;
      let othersAvgPercentage = 0;

      if (otherMembers.length > 0) {
        const sumProgress = otherMembers.reduce((acc, m) => acc + (m.currentProgress || 0), 0);
        othersAvgProgress = Math.round(sumProgress / otherMembers.length);
        othersAvgPercentage = calculatePercentage(othersAvgProgress, pageCount);
      }

      return {
        ...circle,
        userProgress,
        userProgressPercentage,
        othersAvgProgress,
        othersAvgPercentage,
        isAhead: userProgressPercentage > othersAvgPercentage,
        isBehind: userProgressPercentage < othersAvgPercentage
      };
    });

    return res.json(circlesWithProgress);
  } catch (error: any) {
    console.error('Fetch circles error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/v1/circles - Create a circle
router.post('/', authMiddleware, async (req, res) => {
  const tokenUser = (req as any).user;
  const { name, description, currentBookId, isPrivate, maxMembers, type } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Circle name is required.' });
  }

  try {
    // Enforce 20-circle membership limit
    const membershipsCount = await db.query.circleMembers.findMany({
      where: eq(circleMembers.userId, tokenUser.id)
    });

    if (membershipsCount.length >= 20) {
      return res.status(400).json({ error: 'You can be in a maximum of 20 circles simultaneously.' });
    }

    const code = `RC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Insert new reading circle
    const [newCircle] = await db.insert(readingCircles).values({
      name,
      description: description || null,
      creatorId: tokenUser.id,
      currentBookId: currentBookId || null,
      type: type || 'same_book',
      isPrivate: isPrivate !== undefined ? isPrivate : true,
      inviteCode: code,
      maxMembers: maxMembers ? parseInt(maxMembers) : 10,
    }).returning();

    // Auto-join creator as Admin member
    await db.insert(circleMembers).values({
      circleId: newCircle.id,
      userId: tokenUser.id,
      role: 'admin',
      currentProgress: 0,
      notificationPreference: 'daily'
    });

    return res.status(201).json(newCircle);
  } catch (error: any) {
    console.error('Create circle error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/v1/circles/:id - Get circle detail
router.get('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const tokenUser = (req as any).user;

  try {
    // Check if user is a member
    const membership = await db.query.circleMembers.findFirst({
      where: and(eq(circleMembers.circleId, id), eq(circleMembers.userId, tokenUser.id))
    });

    if (!membership) {
      return res.status(403).json({ error: 'You are not a member of this circle.' });
    }

    const circle = await db.query.readingCircles.findFirst({
      where: eq(readingCircles.id, id),
      with: {
        currentBook: true,
        threads: {
          orderBy: (t, { desc }) => [desc(t.createdAt)]
        },
        members: {
          with: {
            user: {
              columns: {
                id: true,
                username: true,
                avatarUrl: true,
                fullName: true
              }
            }
          }
        }
      }
    });

    if (!circle) {
      return res.status(404).json({ error: 'Reading circle not found.' });
    }

    // Compute progress stats
    const pageCount = circle.currentBook?.pageCount || 0;
    const ownMember = circle.members.find(m => m.userId === tokenUser.id);
    const userProgress = ownMember?.currentProgress || 0;
    const userProgressPercentage = calculatePercentage(userProgress, pageCount);

    const otherMembers = circle.members.filter(m => m.userId !== tokenUser.id);
    let othersAvgProgress = 0;
    let othersAvgPercentage = 0;

    if (otherMembers.length > 0) {
      const sumProgress = otherMembers.reduce((acc, m) => acc + (m.currentProgress || 0), 0);
      othersAvgProgress = Math.round(sumProgress / otherMembers.length);
      othersAvgPercentage = calculatePercentage(othersAvgProgress, pageCount);
    }

    const response = {
      ...circle,
      userProgress,
      userProgressPercentage,
      othersAvgProgress,
      othersAvgPercentage,
      isAhead: userProgressPercentage > othersAvgPercentage,
      isBehind: userProgressPercentage < othersAvgPercentage,
      notificationPreference: ownMember?.notificationPreference || 'daily',
      muteUntilChapter: ownMember?.muteUntilChapter || null
    };

    return res.json(response);
  } catch (error: any) {
    console.error('Fetch circle details error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PATCH /api/v1/circles/:id - Update circle details / settings
router.patch('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const tokenUser = (req as any).user;
  const { name, description, currentBookId } = req.body;

  try {
    // Only creator or admin member can edit
    const circle = await db.query.readingCircles.findFirst({
      where: eq(readingCircles.id, id)
    });

    if (!circle) {
      return res.status(404).json({ error: 'Circle not found.' });
    }

    const membership = await db.query.circleMembers.findFirst({
      where: and(eq(circleMembers.circleId, id), eq(circleMembers.userId, tokenUser.id))
    });

    if (!membership || (circle.creatorId !== tokenUser.id && membership.role !== 'admin')) {
      return res.status(403).json({ error: 'Only admins can modify circle settings.' });
    }

    const [updated] = await db.update(readingCircles)
      .set({
        name: name || circle.name,
        description: description !== undefined ? description : circle.description,
        currentBookId: currentBookId !== undefined ? currentBookId : circle.currentBookId,
        updatedAt: new Date()
      })
      .where(eq(readingCircles.id, id))
      .returning();

    return res.json(updated);
  } catch (error: any) {
    console.error('Update circle error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE /api/v1/circles/:id - Delete circle (admin only)
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const tokenUser = (req as any).user;

  try {
    const circle = await db.query.readingCircles.findFirst({
      where: eq(readingCircles.id, id)
    });

    if (!circle) {
      return res.status(404).json({ error: 'Circle not found.' });
    }

    if (circle.creatorId !== tokenUser.id) {
      return res.status(403).json({ error: 'Only the circle creator can delete this circle.' });
    }

    await db.delete(readingCircles).where(eq(readingCircles.id, id));
    return res.json({ message: 'Circle deleted successfully.' });
  } catch (error: any) {
    console.error('Delete circle error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/v1/circles/:id/leave - Leave circle
router.post('/:id/leave', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const tokenUser = (req as any).user;

  try {
    const membership = await db.query.circleMembers.findFirst({
      where: and(eq(circleMembers.circleId, id), eq(circleMembers.userId, tokenUser.id))
    });

    if (!membership) {
      return res.status(400).json({ error: 'You are not a member of this circle.' });
    }

    await db.delete(circleMembers).where(eq(circleMembers.id, membership.id));

    // If circle is empty, clean it up
    const remainingMembers = await db.query.circleMembers.findMany({
      where: eq(circleMembers.circleId, id)
    });

    if (remainingMembers.length === 0) {
      await db.delete(readingCircles).where(eq(readingCircles.id, id));
    } else if (membership.role === 'admin') {
      // Reassign admin role if creator left
      const nextMember = remainingMembers[0];
      await db.update(circleMembers)
        .set({ role: 'admin' })
        .where(eq(circleMembers.id, nextMember.id));
    }

    return res.json({ message: 'Left circle successfully.' });
  } catch (error: any) {
    console.error('Leave circle error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/v1/circles/:id/members - Get members
router.get('/:id/members', authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const list = await db.query.circleMembers.findMany({
      where: eq(circleMembers.circleId, id),
      with: {
        user: {
          columns: {
            id: true,
            username: true,
            avatarUrl: true,
            fullName: true
          }
        }
      }
    });

    return res.json(list);
  } catch (error: any) {
    console.error('Get members progress error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PATCH /api/v1/circles/:id/members/me - Update own progress & settings in circle
router.patch('/:id/members/me', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const tokenUser = (req as any).user;
  const { currentProgress, notificationPreference, muteUntilChapter } = req.body;

  try {
    const membership = await db.query.circleMembers.findFirst({
      where: and(eq(circleMembers.circleId, id), eq(circleMembers.userId, tokenUser.id))
    });

    if (!membership) {
      return res.status(404).json({ error: 'Membership not found.' });
    }

    const [updated] = await db.update(circleMembers)
      .set({
        currentProgress: currentProgress !== undefined ? parseInt(currentProgress) : membership.currentProgress,
        notificationPreference: notificationPreference || membership.notificationPreference,
        muteUntilChapter: muteUntilChapter !== undefined ? (muteUntilChapter ? parseInt(muteUntilChapter) : null) : membership.muteUntilChapter
      })
      .where(eq(circleMembers.id, membership.id))
      .returning();

    return res.json(updated);
  } catch (error: any) {
    console.error('Update member settings error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/v1/circles/:id/invite - Generate invite link or send direct invitation
router.post('/:id/invite', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const tokenUser = (req as any).user;
  const { username } = req.body;

  try {
    const circle = await db.query.readingCircles.findFirst({
      where: eq(readingCircles.id, id),
      with: {
        members: true
      }
    });

    if (!circle) {
      return res.status(404).json({ error: 'Circle not found.' });
    }

    if (circle.members.length >= 10) {
      return res.status(400).json({ error: 'Reading circle is already at its maximum capacity of 10 members.' });
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 72); // 72 hours expiration

    if (username) {
      const userToInvite = await db.query.users.findFirst({
        where: eq(users.username, username.trim())
      });

      if (!userToInvite) {
        return res.status(404).json({ error: `User with username "${username}" not found.` });
      }

      // Check if already in circle
      const isAlreadyMember = circle.members.some(m => m.userId === userToInvite.id);
      if (isAlreadyMember) {
        return res.status(400).json({ error: 'User is already a member of this circle.' });
      }

      // Check for pending invite
      const existingInvite = await db.query.circleInvitations.findFirst({
        where: and(
          eq(circleInvitations.circleId, circle.id),
          eq(circleInvitations.invitedUserId, userToInvite.id),
          eq(circleInvitations.status, 'pending')
        )
      });

      if (existingInvite && new Date(existingInvite.expiresAt) > new Date()) {
        return res.json({ message: 'Invitation already sent and is pending.', invitation: existingInvite });
      }

      const [invitation] = await db.insert(circleInvitations).values({
        circleId: circle.id,
        invitedByUserId: tokenUser.id,
        invitedUserId: userToInvite.id,
        status: 'pending',
        expiresAt
      }).returning();

      return res.status(201).json({ message: `Invitation sent to ${username}`, invitation });
    } else {
      // Link-based invite code
      const linkCode = `INV-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      
      const [invitation] = await db.insert(circleInvitations).values({
        circleId: circle.id,
        invitedByUserId: tokenUser.id,
        inviteLinkCode: linkCode,
        status: 'pending',
        expiresAt
      }).returning();

      return res.status(201).json({ 
        message: 'Shareable invite link generated.', 
        invitation,
        inviteCode: linkCode
      });
    }
  } catch (error: any) {
    console.error('Invite error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/v1/circles/:id/threads - Create a discussion thread
router.post('/:id/threads', authMiddleware, async (req, res) => {
  const tokenUser = (req as any).user;
  const { id } = req.params;
  const { title, bookId, chapter, chapterTag, spoilerLevelPage } = req.body;

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
      chapterTag: chapterTag || chapter || 'General',
      spoilerLevel: spoilerLevelPage ? parseInt(spoilerLevelPage) : 0,
      spoilerLevelPage: spoilerLevelPage ? parseInt(spoilerLevelPage) : 0,
    }).returning();

    return res.status(201).json(newThread);
  } catch (error: any) {
    console.error('Create thread error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/v1/threads/:id/posts - List posts in thread (spoiler-filtered)
router.get('/threads/:id/posts', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const tokenUser = (req as any).user;

  try {
    const thread = await db.query.discussionThreads.findFirst({
      where: eq(discussionThreads.id, id)
    });

    if (!thread) {
      return res.status(404).json({ error: 'Thread not found.' });
    }

    // Fetch user's membership progress for this circle
    const membership = await db.query.circleMembers.findFirst({
      where: and(eq(circleMembers.circleId, thread.circleId), eq(circleMembers.userId, tokenUser.id))
    });

    // Default viewer progress is the user's progress in circleMembers
    let viewerProgress = membership?.currentProgress || 0;

    // Or if the query param specifies, let's use that (restricted by their real progress unless they confirm override)
    // Wait! To make sure we support local confirmation overrides, we will return the posts. If we filter them, how does the frontend reveal them?
    // The instructions say: "This filtering must happen on the server, not the client, to prevent data inspection attacks.
    // Reveal anyway click: tapping shows a confirmation. If confirmed, post fades in.
    // Wait! If filtering happens on the server, how does the server know to reveal it?
    // We can accept a query param `override_revealed_posts` (a comma-separated list of post IDs) or we can allow a query param `viewer_progress` or `reveal_post_id` so that the server can return a specific post fully if requested.
    // Let's allow a query param: `reveal_post_ids` as a comma separated string of post IDs that the viewer has explicitly clicked to reveal.
    // That's perfect and extremely secure!
    const revealPostIds = (req.query.reveal_post_ids as string || '').split(',').filter(Boolean);

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

    const filteredPosts = posts.map(post => {
      const pageRef = post.pageReference || 0;
      
      // If post pageReference > viewerProgress AND not explicitly revealed
      if (pageRef > viewerProgress && !revealPostIds.includes(post.id)) {
        return {
          id: post.id,
          threadId: post.threadId,
          chapterTag: post.chapterTag || 'General',
          pageReference: post.pageReference,
          isHidden: true,
          hiddenReason: 'past_progress',
          createdAt: post.createdAt
        };
      }

      return post;
    });

    return res.json(filteredPosts);
  } catch (error: any) {
    console.error('Fetch posts error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/v1/threads/:id/posts - Add post/reply inside discussion thread
router.post('/threads/:id/posts', authMiddleware, async (req, res) => {
  const tokenUser = (req as any).user;
  const { id } = req.params;
  const { content, parentPostId, chapterTag, pageReference } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'Content is required.' });
  }

  if (!chapterTag) {
    return res.status(400).json({ error: 'Please tag which chapter this post relates to.' });
  }

  try {
    const thread = await db.query.discussionThreads.findFirst({
      where: eq(discussionThreads.id, id)
    });

    if (!thread) {
      return res.status(404).json({ error: 'Thread not found.' });
    }

    // Verify progress gate: Cannot tag post at pageReference greater than user's circle progress
    const membership = await db.query.circleMembers.findFirst({
      where: and(eq(circleMembers.circleId, thread.circleId), eq(circleMembers.userId, tokenUser.id))
    });

    const userProgress = membership?.currentProgress || 0;
    const targetPage = pageReference ? parseInt(pageReference) : 0;

    if (targetPage > userProgress) {
      return res.status(400).json({ error: 'You cannot tag posts at a chapter or page ahead of your logged progress.' });
    }

    // Set 5 minutes edit expiration
    const editWindowExpiresAt = new Date();
    editWindowExpiresAt.setMinutes(editWindowExpiresAt.getMinutes() + 5);

    const [newPost] = await db.insert(discussionPosts).values({
      threadId: id,
      userId: tokenUser.id,
      content,
      parentPostId: parentPostId || null,
      chapterTag,
      pageReference: targetPage,
      isEdited: false,
      editWindowExpiresAt,
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

// PATCH /api/v1/posts/:id - Edit post within 5-min window
router.patch('/posts/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const tokenUser = (req as any).user;
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'Content is required.' });
  }

  try {
    const post = await db.query.discussionPosts.findFirst({
      where: eq(discussionPosts.id, id)
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    if (post.userId !== tokenUser.id) {
      return res.status(403).json({ error: 'You can only edit your own posts.' });
    }

    // Check 5 minutes window
    if (!post.editWindowExpiresAt || new Date() > new Date(post.editWindowExpiresAt)) {
      return res.status(400).json({ error: 'Post edit window has expired (5-minute limit).' });
    }

    const [updated] = await db.update(discussionPosts)
      .set({
        content: content.trim(),
        isEdited: true,
        updatedAt: new Date()
      })
      .where(eq(discussionPosts.id, id))
      .returning();

    return res.json(updated);
  } catch (error: any) {
    console.error('Edit post error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE /api/v1/posts/:id - Delete own post
router.delete('/posts/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const tokenUser = (req as any).user;

  try {
    const post = await db.query.discussionPosts.findFirst({
      where: eq(discussionPosts.id, id)
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    if (post.userId !== tokenUser.id) {
      return res.status(403).json({ error: 'You can only delete your own posts.' });
    }

    await db.delete(discussionPosts).where(eq(discussionPosts.id, id));
    return res.json({ message: 'Post deleted successfully.' });
  } catch (error: any) {
    console.error('Delete post error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/v1/posts/:id/react - Toggle reaction
router.post('/posts/:id/react', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const tokenUser = (req as any).user;
  const { reaction } = req.body; // e.g. insight, feel, think, wow, laugh

  const validReactions = ['insight', 'feel', 'think', 'wow', 'laugh'];
  if (!validReactions.includes(reaction)) {
    return res.status(400).json({ error: 'Invalid reaction emoji type.' });
  }

  try {
    const post = await db.query.discussionPosts.findFirst({
      where: eq(discussionPosts.id, id)
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const currentReactions = (post.reactions as Record<string, string[]>) || {};
    
    // Each reaction key stores an array of userIds who reacted
    let userIds = currentReactions[reaction] || [];
    const index = userIds.indexOf(tokenUser.id);
    
    if (index > -1) {
      // Toggle off: remove user
      userIds.splice(index, 1);
    } else {
      // Toggle on: add user
      userIds.push(tokenUser.id);
    }

    const updatedReactions = {
      ...currentReactions,
      [reaction]: userIds
    };

    const [updated] = await db.update(discussionPosts)
      .set({
        reactions: updatedReactions
      })
      .where(eq(discussionPosts.id, id))
      .returning();

    return res.json(updated);
  } catch (error: any) {
    console.error('Toggle reaction error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
