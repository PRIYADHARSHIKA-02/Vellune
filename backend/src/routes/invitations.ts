import { Router } from 'express';
import { eq, and, ne } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { 
  circleInvitations, 
  readingCircles, 
  circleMembers, 
  users, 
  books 
} from '../db/schema.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router();

// GET /api/v1/invitations - Fetch pending invitations for the logged-in user
router.get('/', authMiddleware, async (req, res) => {
  const tokenUser = (req as any).user;

  try {
    const list = await db.query.circleInvitations.findMany({
      where: and(
        eq(circleInvitations.invitedUserId, tokenUser.id),
        eq(circleInvitations.status, 'pending')
      ),
      orderBy: (ci, { desc }) => [desc(ci.createdAt)],
      with: {
        circle: {
          with: {
            currentBook: true,
            members: {
              with: {
                user: {
                  columns: {
                    id: true,
                    username: true
                  }
                }
              }
            }
          }
        },
        invitedByUser: {
          columns: {
            id: true,
            username: true,
            avatarUrl: true
          }
        }
      }
    });

    // Format list for presentation
    const formatted = list.filter(invite => {
      // Filter out expired invites
      return new Date(invite.expiresAt) > new Date();
    }).map(invite => {
      return {
        id: invite.id,
        circleId: invite.circleId,
        circleName: invite.circle?.name,
        type: invite.circle?.type,
        maxMembers: invite.circle?.maxMembers,
        membersCount: invite.circle?.members?.length || 0,
        bookTitle: invite.circle?.currentBook?.title || null,
        bookCoverUrl: invite.circle?.currentBook?.coverUrl || null,
        invitedByUsername: invite.invitedByUser?.username || 'Someone',
        invitedByUserAvatar: invite.invitedByUser?.avatarUrl || null,
        createdAt: invite.createdAt,
        expiresAt: invite.expiresAt
      };
    });

    return res.json(formatted);
  } catch (error: any) {
    console.error('Fetch invitations error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/v1/invitations/:code/accept - Join circle via invite code or invitation ID
router.post('/:code/accept', authMiddleware, async (req, res) => {
  const { code } = req.params;
  const tokenUser = (req as any).user;

  try {
    // 1. Check if user is already in 20 circles
    const memberships = await db.query.circleMembers.findMany({
      where: eq(circleMembers.userId, tokenUser.id)
    });

    if (memberships.length >= 20) {
      return res.status(400).json({ error: 'You can be in a maximum of 20 circles simultaneously.' });
    }

    // 2. Find circle either by invitation inviteLinkCode, circle inviteCode, or invitation ID
    let targetCircleId: string | null = null;
    let invitationId: string | null = null;

    // Check if code matches invitation by inviteLinkCode
    const inviteLink = await db.query.circleInvitations.findFirst({
      where: eq(circleInvitations.inviteLinkCode, code)
    });

    if (inviteLink) {
      if (new Date(inviteLink.expiresAt) < new Date()) {
        return res.status(400).json({ error: 'This invitation has expired.' });
      }
      targetCircleId = inviteLink.circleId;
      invitationId = inviteLink.id;
    } else {
      // Check if code matches direct circle inviteCode
      const circleByCode = await db.query.readingCircles.findFirst({
        where: eq(readingCircles.inviteCode, code)
      });

      if (circleByCode) {
        targetCircleId = circleByCode.id;
      } else {
        // Check if code is invitation uuid
        const inviteByUuid = await db.query.circleInvitations.findFirst({
          where: eq(circleInvitations.id, code)
        });

        if (inviteByUuid) {
          targetCircleId = inviteByUuid.circleId;
          invitationId = inviteByUuid.id;
        }
      }
    }

    if (!targetCircleId) {
      return res.status(404).json({ error: 'Invalid invitation link or code.' });
    }

    // 3. Load circle to verify members limit
    const circle = await db.query.readingCircles.findFirst({
      where: eq(readingCircles.id, targetCircleId),
      with: {
        members: true
      }
    });

    if (!circle) {
      return res.status(404).json({ error: 'Reading circle not found.' });
    }

    if (circle.members.length >= 10) {
      return res.status(400).json({ error: 'This reading circle is full (limit: 10 members).' });
    }

    // 4. Check if already a member
    const existingMember = circle.members.some(m => m.userId === tokenUser.id);
    if (existingMember) {
      return res.status(400).json({ error: 'You are already a member of this circle.' });
    }

    // 5. Join circle
    await db.insert(circleMembers).values({
      circleId: circle.id,
      userId: tokenUser.id,
      role: 'member',
      currentProgress: 0,
      notificationPreference: 'daily'
    });

    // 6. Update invitation status if applicable
    if (invitationId) {
      await db.update(circleInvitations)
        .set({ status: 'accepted' })
        .where(eq(circleInvitations.id, invitationId));
    }

    return res.json({ 
      message: 'Joined circle successfully.', 
      circle: {
        id: circle.id,
        name: circle.name
      } 
    });
  } catch (error: any) {
    console.error('Accept invitation error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/v1/invitations/:id/decline - Decline invitation
router.post('/:id/decline', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const tokenUser = (req as any).user;

  try {
    const invite = await db.query.circleInvitations.findFirst({
      where: and(
        eq(circleInvitations.id, id),
        eq(circleInvitations.invitedUserId, tokenUser.id)
      )
    });

    if (!invite) {
      return res.status(404).json({ error: 'Invitation not found.' });
    }

    await db.update(circleInvitations)
      .set({ status: 'declined' })
      .where(eq(circleInvitations.id, id));

    return res.json({ message: 'Invitation declined.' });
  } catch (error: any) {
    console.error('Decline invitation error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/v1/invitations/:id/undo - Undo decline (restore pending status)
router.post('/:id/undo', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const tokenUser = (req as any).user;

  try {
    const invite = await db.query.circleInvitations.findFirst({
      where: and(
        eq(circleInvitations.id, id),
        eq(circleInvitations.invitedUserId, tokenUser.id)
      )
    });

    if (!invite) {
      return res.status(404).json({ error: 'Invitation not found.' });
    }

    await db.update(circleInvitations)
      .set({ status: 'pending' })
      .where(eq(circleInvitations.id, id));

    return res.json({ message: 'Decline undone. Invitation restored to pending.' });
  } catch (error: any) {
    console.error('Undo decline error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
