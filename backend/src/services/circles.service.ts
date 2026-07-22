import { client } from '../db/connection.js'
import { applySpoilerFilter } from '../middlewares/spoilerFilter.js'

// local compatibility wrapper for raw queries using postgres-js
const db = {
  query: async (queryText: string, params: any[] = []) => {
    const result = await client.unsafe(queryText, params);
    return { rows: result };
  }
};

export class CirclesService {

  // Get all circles for a user with member progress
  async getUserCircles(userId: string) {
    const circles = await db.query(`
      SELECT
        rc.id,
        rc.name,
        rc.description,
        rc.type,
        rc.current_book_id,
        b.title         AS book_title,
        b.cover_url     AS book_cover,
        cm_me.current_progress  AS my_progress,
        cm_me.role,
        cm_me.notification_preference,
        COUNT(cm_all.user_id)  AS member_count,
        AVG(cm_all.current_progress) FILTER (
          WHERE cm_all.user_id != $1
        ) AS others_avg_progress,
        (
          SELECT COUNT(*)
          FROM discussion_posts dp
          JOIN discussion_threads dt ON dp.thread_id = dt.id
          WHERE dt.circle_id = rc.id
            AND dp.created_at > (
              SELECT COALESCE(MAX(last_seen_at), NOW() - INTERVAL '30 days')
              FROM circle_last_seen
              WHERE user_id = $1 AND circle_id = rc.id
            )
        ) AS unread_post_count
      FROM reading_circles rc
      JOIN circle_members cm_me
        ON cm_me.circle_id = rc.id AND cm_me.user_id = $1
      JOIN circle_members cm_all
        ON cm_all.circle_id = rc.id
      LEFT JOIN books b ON b.id = rc.current_book_id
      GROUP BY
        rc.id, rc.name, rc.description, rc.type,
        rc.current_book_id, b.title, b.cover_url,
        cm_me.current_progress, cm_me.role,
        cm_me.notification_preference
      ORDER BY rc.updated_at DESC
    `, [userId])

    return circles.rows
  }

  // Get posts for a thread — filtered by viewer's progress SERVER SIDE
  async getThreadPosts(
    threadId: string,
    viewerUserId: string,
    circleId: string,
    revealPostIds: string[] = []
  ) {
    // Step 1: get viewer's current progress in this circle
    const memberResult = await db.query(`
      SELECT current_progress
      FROM circle_members
      WHERE user_id = $1 AND circle_id = $2
    `, [viewerUserId, circleId])

    const viewerProgress = memberResult.rows[0]?.current_progress ?? 0

    // Step 2: fetch all posts with author info
    const postsResult = await db.query(`
      SELECT
        dp.id,
        dp.content,
        dp.chapter_tag,
        dp.page_reference,
        dp.user_id,
        dp.reactions,
        dp.parent_post_id,
        dp.is_edited,
        dp.edit_expires_at,
        dp.created_at,
        u.username AS author_username
      FROM discussion_posts dp
      JOIN users u ON u.id = dp.user_id
      WHERE dp.thread_id = $1
      ORDER BY dp.created_at ASC
    `, [threadId])

    // Step 3: apply server-side spoiler filter
    // Posts beyond viewer progress are stripped of all identifying info
    return applySpoilerFilter(postsResult.rows, viewerProgress, revealPostIds)
  }

  // Create a post — validates chapter_tag is present and not ahead of progress
  async createPost(data: {
    threadId: string
    userId: string
    circleId: string
    content: string
    chapterTag: string
    pageReference: number
    parentPostId?: string
  }) {
    // Validate: user cannot tag a page ahead of their own logged progress
    const memberResult = await db.query(`
      SELECT current_progress FROM circle_members
      WHERE user_id = $1 AND circle_id = $2
    `, [data.userId, data.circleId])

    const memberProgress = memberResult.rows[0]?.current_progress ?? 0

    if (data.pageReference > memberProgress) {
      throw new Error(
        'You cannot post about a page you have not reached yet. ' +
        'Update your reading progress first.'
      )
    }

    const result = await db.query(`
      INSERT INTO discussion_posts
        (thread_id, user_id, content, chapter_tag,
         page_reference, parent_post_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      data.threadId,
      data.userId,
      data.content,
      data.chapterTag,
      data.pageReference,
      data.parentPostId ?? null,
    ])

    // Update circle's updated_at so it floats to top of list
    await db.query(`
      UPDATE reading_circles
      SET updated_at = NOW()
      WHERE id = $1
    `, [data.circleId])

    // Fetch the new post with author username
    const newPostId = result.rows[0].id
    const fullPostResult = await db.query(`
      SELECT
        dp.id,
        dp.content,
        dp.chapter_tag,
        dp.page_reference,
        dp.user_id,
        dp.reactions,
        dp.parent_post_id,
        dp.is_edited,
        dp.edit_expires_at,
        dp.created_at,
        u.username AS author_username
      FROM discussion_posts dp
      JOIN users u ON u.id = dp.user_id
      WHERE dp.id = $1
    `, [newPostId])

    return fullPostResult.rows[0]
  }

  // Update member's reading progress in a circle
  async updateMemberProgress(
    userId: string,
    circleId: string,
    currentPage: number
  ) {
    await db.query(`
      UPDATE circle_members
      SET current_progress = $1
      WHERE user_id = $2 AND circle_id = $3
    `, [currentPage, userId, circleId])
  }

  // Create a new circle (3-step flow result)
  async createCircle(data: {
    name: string
    description?: string
    creatorId: string
    type: 'same_book' | 'different_books'
    currentBookId?: string
  }) {
    // Check user is not already in 20 circles
    const countResult = await db.query(`
      SELECT COUNT(*) FROM circle_members WHERE user_id = $1
    `, [data.creatorId])

    if (parseInt(countResult.rows[0].count) >= 20) {
      throw new Error('You can be a member of at most 20 circles.')
    }

    // Generate a unique 8-character uppercase invite code
    let inviteCode = ''
    let isUnique = false
    while (!isUnique) {
      inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase()
      const codeCheck = await db.query(`
        SELECT id FROM reading_circles WHERE invite_code = $1
      `, [inviteCode])
      if (codeCheck.rows.length === 0) {
        isUnique = true;
      }
    }

    const circleResult = await db.query(`
      INSERT INTO reading_circles
        (name, description, creator_id, type, current_book_id, invite_code)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      data.name,
      data.description ?? null,
      data.creatorId,
      data.type,
      data.currentBookId ?? null,
      inviteCode
    ])

    const circle = circleResult.rows[0]

    // Auto-join creator as admin
    await db.query(`
      INSERT INTO circle_members (circle_id, user_id, role)
      VALUES ($1, $2, 'admin')
    `, [circle.id, data.creatorId])

    return circle
  }

  // Generate an invite for a circle (supporting public inviteCode registration or direct user invite)
  async createInvite(circleId: string, invitedByUserId: string, username?: string, customInviteCode?: string) {
    // Get the circle's invite code
    const circleResult = await db.query(`
      SELECT invite_code FROM reading_circles WHERE id = $1
    `, [circleId])
    if (!circleResult.rows.length) {
      throw new Error('Circle not found.')
    }
    const circleInviteCode = circleResult.rows[0].invite_code

    // Resolve which invite code to use (custom or circle's default)
    const inviteCodeToUse = customInviteCode || circleInviteCode

    let invitedUserId = null
    if (username) {
      // Direct invite: Look up the user
      const userResult = await db.query(`
        SELECT id FROM users WHERE username = $1
      `, [username])
      if (!userResult.rows.length) {
        throw new Error(`User "${username}" not found.`)
      }
      invitedUserId = userResult.rows[0].id

      // Check if user is already a member of the circle
      const memberCheck = await db.query(`
        SELECT id FROM circle_members WHERE circle_id = $1 AND user_id = $2
      `, [circleId, invitedUserId])
      if (memberCheck.rows.length > 0) {
        throw new Error(`User "${username}" is already a member of this circle.`)
      }

      // Check if there is already a pending invitation for this user in this circle
      const inviteCheck = await db.query(`
        SELECT id FROM circle_invitations 
        WHERE circle_id = $1 AND invited_user_id = $2 AND status = 'pending' AND expires_at > NOW()
      `, [circleId, invitedUserId])
      if (inviteCheck.rows.length > 0) {
        throw new Error(`User "${username}" already has a pending invitation to this circle.`)
      }
    }

    const result = await db.query(`
      INSERT INTO circle_invitations
        (circle_id, invited_by_user_id, invited_user_id, invite_code, expires_at)
      VALUES ($1, $2, $3, $4, NOW() + INTERVAL '30 days')
      RETURNING *
    `, [circleId, invitedByUserId, invitedUserId, inviteCodeToUse])

    return result.rows[0]
  }

  // Accept invite — join the circle
  async acceptInvite(inviteCode: string, userId: string) {
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(inviteCode);
    
    let inviteResult;
    if (isUuid) {
      inviteResult = await db.query(`
        SELECT ci.*, rc.max_members,
          (SELECT COUNT(*) FROM circle_members WHERE circle_id = ci.circle_id) AS current_members
        FROM circle_invitations ci
        JOIN reading_circles rc ON rc.id = ci.circle_id
        WHERE ci.id = $1 AND ci.status = 'pending' AND ci.expires_at > NOW()
      `, [inviteCode]);
    } else {
      inviteResult = await db.query(`
        SELECT ci.*, rc.max_members,
          (SELECT COUNT(*) FROM circle_members WHERE circle_id = ci.circle_id) AS current_members
        FROM circle_invitations ci
        JOIN reading_circles rc ON rc.id = ci.circle_id
        WHERE ci.invite_code = $1 AND ci.status = 'pending' AND ci.expires_at > NOW()
      `, [inviteCode]);
    }

    let circleId;
    let inviteId = null;

    if (inviteResult.rows.length > 0) {
      const invite = inviteResult.rows[0];
      if (invite.current_members >= invite.max_members) {
        throw new Error('This circle is full.');
      }
      circleId = invite.circle_id;
      inviteId = invite.id;
    } else {
      // Try to find circle directly by invite code
      const circleResult = await db.query(`
        SELECT rc.id, rc.max_members,
          (SELECT COUNT(*) FROM circle_members WHERE circle_id = rc.id) AS current_members
        FROM reading_circles rc
        WHERE rc.invite_code = $1
      `, [inviteCode]);

      if (circleResult.rows.length === 0) {
        throw new Error('Invite is invalid or has expired.');
      }

      const circle = circleResult.rows[0];
      if (circle.current_members >= circle.max_members) {
        throw new Error('This circle is full.');
      }
      circleId = circle.id;
    }

    // Check user not already a member
    const existingResult = await db.query(`
      SELECT id FROM circle_members
      WHERE circle_id = $1 AND user_id = $2
    `, [circleId, userId])

    if (existingResult.rows.length) {
      throw new Error('You are already in this circle.')
    }

    // Join + mark invite accepted (transaction)
    await db.query('BEGIN')
    try {
      await db.query(`
        INSERT INTO circle_members (circle_id, user_id, role)
        VALUES ($1, $2, 'member')
      `, [circleId, userId])

      if (inviteId) {
        await db.query(`
          UPDATE circle_invitations
          SET status = 'accepted'
          WHERE id = $1
        `, [inviteId])
      }

      await db.query('COMMIT')
    } catch (err) {
      await db.query('ROLLBACK')
      throw err
    }

    return { circle_id: circleId }
  }

  // Get pending invitations for a user
  async getPendingInvitations(userId: string) {
    const result = await db.query(`
      SELECT
        ci.id,
        ci.invite_code,
        ci.created_at,
        ci.expires_at,
        rc.id         AS circle_id,
        rc.name       AS circle_name,
        b.title       AS book_title,
        b.cover_url   AS book_cover,
        u.username    AS invited_by_username,
        (SELECT COUNT(*) FROM circle_members
         WHERE circle_id = rc.id) AS member_count
      FROM circle_invitations ci
      JOIN reading_circles rc ON rc.id = ci.circle_id
      JOIN users u ON u.id = ci.invited_by_user_id
      LEFT JOIN books b ON b.id = rc.current_book_id
      WHERE ci.invited_user_id = $1
        AND ci.status = 'pending'
        AND ci.expires_at > NOW()
      ORDER BY ci.created_at DESC
    `, [userId])

    return result.rows
  }

  // Decline invite
  async declineInvite(inviteId: string, userId: string) {
    await db.query(`
      UPDATE circle_invitations
      SET status = 'declined'
      WHERE id = $1 AND invited_user_id = $2
    `, [inviteId, userId])
  }

  // Undo decline invite
  async undoDeclineInvite(inviteId: string, userId: string) {
    await db.query(`
      UPDATE circle_invitations
      SET status = 'pending'
      WHERE id = $1 AND invited_user_id = $2
    `, [inviteId, userId])
  }

  // Edit post within 5-min window
  async editPost(postId: string, userId: string, content: string) {
    const postResult = await db.query(`
      SELECT user_id, edit_expires_at FROM discussion_posts WHERE id = $1
    `, [postId])

    if (!postResult.rows.length) {
      throw new Error('Post not found.')
    }

    const post = postResult.rows[0]
    if (post.user_id !== userId) {
      throw new Error('You can only edit your own posts.')
    }

    if (new Date() > new Date(post.edit_expires_at)) {
      throw new Error('Post edit window has expired (5-minute limit).')
    }

    const result = await db.query(`
      UPDATE discussion_posts
      SET content = $1, is_edited = TRUE, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [content, postId])

    return result.rows[0]
  }

  // Delete post
  async deletePost(postId: string, userId: string) {
    const postResult = await db.query(`
      SELECT user_id FROM discussion_posts WHERE id = $1
    `, [postId])

    if (!postResult.rows.length) {
      throw new Error('Post not found.')
    }

    const post = postResult.rows[0]
    if (post.user_id !== userId) {
      throw new Error('You can only delete your own posts.')
    }

    await db.query(`
      DELETE FROM discussion_posts WHERE id = $1
    `, [postId])
  }

  // Toggle reaction (reactions is a JSONB containing counts)
  async toggleReaction(postId: string, reaction: string) {
    const postResult = await db.query(`
      SELECT reactions FROM discussion_posts WHERE id = $1
    `, [postId])

    if (!postResult.rows.length) {
      throw new Error('Post not found.')
    }

    const reactions = postResult.rows[0].reactions || {}
    const currentCount = parseInt(reactions[reaction] || 0)
    const newCount = currentCount > 0 ? currentCount - 1 : currentCount + 1
    
    const updatedReactions = {
      ...reactions,
      [reaction]: newCount
    }

    const result = await db.query(`
      UPDATE discussion_posts
      SET reactions = $1
      WHERE id = $2
      RETURNING *
    `, [JSON.stringify(updatedReactions), postId])

    return result.rows[0]
  }

  // Get circle details
  async getCircleDetails(circleId: string, userId: string) {
    const circleResult = await db.query(`
      SELECT rc.*, b.title AS book_title, b.cover_url AS book_cover, b.page_count AS book_pages
      FROM reading_circles rc
      LEFT JOIN books b ON b.id = rc.current_book_id
      WHERE rc.id = $1
    `, [circleId])

    if (!circleResult.rows.length) {
      throw new Error('Circle not found.')
    }

    const circle = circleResult.rows[0]

    const membersResult = await db.query(`
      SELECT cm.*, u.username, u.avatar_url, u.full_name
      FROM circle_members cm
      JOIN users u ON u.id = cm.user_id
      WHERE cm.circle_id = $1
    `, [circleId])

    const threadsResult = await db.query(`
      SELECT dt.*
      FROM discussion_threads dt
      WHERE dt.circle_id = $1
      ORDER BY dt.created_at DESC
    `, [circleId])

    const pageCount = circle.book_pages || 0
    const ownMember = membersResult.rows.find((m: any) => m.user_id === userId)
    const userProgress = ownMember?.current_progress || 0
    const userProgressPercentage = pageCount > 0 ? Math.min(100, Math.round((userProgress / pageCount) * 100)) : 0

    const otherMembers = membersResult.rows.filter((m: any) => m.user_id !== userId)
    let othersAvgProgress = 0
    let othersAvgPercentage = 0

    if (otherMembers.length > 0) {
      const sumProgress = otherMembers.reduce((acc: number, m: any) => acc + (m.current_progress || 0), 0)
      othersAvgProgress = Math.round(sumProgress / otherMembers.length)
      othersAvgPercentage = pageCount > 0 ? Math.min(100, Math.round((othersAvgProgress / pageCount) * 100)) : 0
    }

    return {
      id: circle.id,
      name: circle.name,
      description: circle.description,
      creatorId: circle.creator_id,
      currentBookId: circle.current_book_id,
      type: circle.type,
      isPrivate: circle.is_private,
      inviteCode: circle.invite_code,
      maxMembers: circle.max_members,
      createdAt: circle.created_at,
      updatedAt: circle.updated_at,
      currentBook: circle.current_book_id ? {
        id: circle.current_book_id,
        title: circle.book_title,
        coverUrl: circle.book_cover,
        pageCount: circle.book_pages
      } : null,
      members: membersResult.rows.map((m: any) => ({
        id: m.id,
        circleId: m.circle_id,
        userId: m.user_id,
        role: m.role,
        currentProgress: m.current_progress,
        joinedAt: m.joined_at,
        notificationPreference: m.notification_preference,
        muteUntilPage: m.mute_until_page,
        user: {
          id: m.user_id,
          username: m.username,
          avatarUrl: m.avatar_url,
          fullName: m.full_name
        }
      })),
      threads: threadsResult.rows.map((t: any) => ({
        id: t.id,
        circleId: t.circle_id,
        bookId: t.book_id,
        creatorId: t.creator_id,
        title: t.title,
        chapterTag: t.chapter_tag,
        spoilerPage: t.spoiler_page,
        createdAt: t.created_at,
        updatedAt: t.updated_at
      })),
      userProgress,
      userProgressPercentage,
      othersAvgProgress,
      othersAvgPercentage,
      isAhead: userProgressPercentage > othersAvgPercentage,
      isBehind: userProgressPercentage < othersAvgPercentage,
      notificationPreference: ownMember?.notification_preference || 'digest',
      muteUntilPage: ownMember?.mute_until_page || null
    }
  }

  // Create discussion thread
  async createThread(circleId: string, userId: string, data: {
    title: string
    bookId?: string
    chapterTag?: string
    spoilerPage?: number
  }) {
    const result = await db.query(`
      INSERT INTO discussion_threads (circle_id, creator_id, title, book_id, chapter_tag, spoiler_page)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      circleId,
      userId,
      data.title,
      data.bookId || null,
      data.chapterTag || 'General',
      data.spoilerPage || 0
    ])

    return result.rows[0]
  }

  // Get circle members progress
  async getCircleMembers(circleId: string) {
    const result = await db.query(`
      SELECT cm.*, u.username, u.avatar_url, u.full_name
      FROM circle_members cm
      JOIN users u ON u.id = cm.user_id
      WHERE cm.circle_id = $1
    `, [circleId])

    return result.rows.map((m: any) => ({
      id: m.id,
      circleId: m.circle_id,
      userId: m.user_id,
      role: m.role,
      currentProgress: m.current_progress,
      joinedAt: m.joined_at,
      user: {
        id: m.user_id,
        username: m.username,
        avatarUrl: m.avatar_url,
        fullName: m.full_name
      }
    }))
  }

  // Update circle general details
  async updateCircleSettings(circleId: string, userId: string, data: {
    name?: string
    description?: string
    currentBookId?: string | null
  }) {
    const circleResult = await db.query(`
      SELECT creator_id FROM reading_circles WHERE id = $1
    `, [circleId])

    if (!circleResult.rows.length) {
      throw new Error('Circle not found.')
    }

    const membershipResult = await db.query(`
      SELECT role FROM circle_members WHERE circle_id = $1 AND user_id = $2
    `, [circleId, userId])

    const role = membershipResult.rows[0]?.role
    if (circleResult.rows[0].creator_id !== userId && role !== 'admin') {
      throw new Error('Only admins can modify circle settings.')
    }

    const updates: string[] = []
    const params: any[] = []
    let counter = 1

    if (data.name !== undefined) {
      updates.push(`name = $${counter++}`)
      params.push(data.name)
    }
    if (data.description !== undefined) {
      updates.push(`description = $${counter++}`)
      params.push(data.description)
    }
    if (data.currentBookId !== undefined) {
      updates.push(`current_book_id = $${counter++}`)
      params.push(data.currentBookId)
    }

    if (updates.length === 0) return

    params.push(circleId)
    await db.query(`
      UPDATE reading_circles
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $${counter}
    `, params)
  }

  // Update member settings
  async updateMemberSettings(circleId: string, userId: string, data: {
    currentProgress?: number
    notificationPreference?: string
    muteUntilPage?: number | null
  }) {
    const updates: string[] = []
    const params: any[] = []
    let counter = 1

    if (data.currentProgress !== undefined) {
      updates.push(`current_progress = $${counter++}`)
      params.push(data.currentProgress)
    }
    if (data.notificationPreference !== undefined) {
      updates.push(`notification_preference = $${counter++}`)
      params.push(data.notificationPreference)
    }
    if (data.muteUntilPage !== undefined) {
      updates.push(`mute_until_page = $${counter++}`)
      params.push(data.muteUntilPage)
    }

    if (updates.length === 0) return

    params.push(userId)
    params.push(circleId)
    
    await db.query(`
      UPDATE circle_members
      SET ${updates.join(', ')}
      WHERE user_id = $${counter++} AND circle_id = $${counter}
    `, params)
  }

  // Delete circle
  async deleteCircle(circleId: string, userId: string) {
    const circleResult = await db.query(`
      SELECT creator_id FROM reading_circles WHERE id = $1
    `, [circleId])

    if (!circleResult.rows.length) {
      throw new Error('Circle not found.')
    }

    if (circleResult.rows[0].creator_id !== userId) {
      throw new Error('Only the creator can delete this circle.')
    }

    await db.query(`
      DELETE FROM reading_circles WHERE id = $1
    `, [circleId])
  }

  // Leave circle
  async leaveCircle(circleId: string, userId: string) {
    await db.query(`
      DELETE FROM circle_members WHERE circle_id = $1 AND user_id = $2
    `, [circleId, userId])

    const membersCount = await db.query(`
      SELECT COUNT(*) FROM circle_members WHERE circle_id = $1
    `, [circleId])

    if (parseInt(membersCount.rows[0].count) === 0) {
      await db.query(`
        DELETE FROM reading_circles WHERE id = $1
      `, [circleId])
    }
  }
}
