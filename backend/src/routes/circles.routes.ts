import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth.js'
import { CirclesService } from '../services/circles.service.js'
import { z } from 'zod'

const router = Router()
const service = new CirclesService()

// All routes require authentication
router.use(authMiddleware)

// GET /api/v1/circles — user's circles list
router.get('/', async (req: any, res) => {
  try {
    const circles = await service.getUserCircles(req.user.id)
    return res.json({ circles })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
})

// POST /api/v1/circles — create new circle
const createCircleSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(500).optional(),
  type: z.enum(['same_book', 'different_books']),
  current_book_id: z.string().uuid().optional(),
})

router.post('/', async (req: any, res) => {
  const parsed = createCircleSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }

  try {
    const circle = await service.createCircle({
      name: parsed.data.name,
      description: parsed.data.description,
      type: parsed.data.type,
      currentBookId: parsed.data.current_book_id,
      creatorId: req.user.id,
    })
    return res.status(201).json({ circle })
  } catch (err: any) {
    return res.status(400).json({ error: err.message })
  }
})

// GET /api/v1/circles/:circleId/threads/:threadId/posts
// CRITICAL: viewer_progress comes from DB — not from query param (prevents bypass)
router.get(
  '/:circleId/threads/:threadId/posts',
  async (req: any, res) => {
    try {
      const revealPostIds = (req.query.reveal_post_ids as string || '').split(',').filter(Boolean);
      const posts = await service.getThreadPosts(
        req.params.threadId,
        req.user.id,
        req.params.circleId,
        revealPostIds
      )
      return res.json({ posts })
    } catch (err: any) {
      return res.status(500).json({ error: err.message })
    }
  }
)

// POST /api/v1/circles/:circleId/threads/:threadId/posts
const createPostSchema = z.object({
  content: z.string().min(1).max(1000),
  chapter_tag: z.string().min(1),
  page_reference: z.number().int().min(0),
  parent_post_id: z.string().uuid().optional(),
})

router.post(
  '/:circleId/threads/:threadId/posts',
  async (req: any, res) => {
    const parsed = createPostSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() })
    }

    try {
      const post = await service.createPost({
        threadId: req.params.threadId,
        circleId: req.params.circleId,
        userId: req.user.id,
        content: parsed.data.content,
        chapterTag: parsed.data.chapter_tag,
        pageReference: parsed.data.page_reference,
        parentPostId: parsed.data.parent_post_id,
      })
      return res.status(201).json({ post })
    } catch (err: any) {
      return res.status(400).json({ error: err.message })
    }
  }
)

// PATCH /api/v1/circles/:circleId/members/me/progress
router.patch('/:circleId/members/me/progress', async (req: any, res) => {
  const { current_page } = req.body
  if (typeof current_page !== 'number') {
    return res.status(400).json({ error: 'current_page must be a number' })
  }
  try {
    await service.updateMemberProgress(
      req.user.id,
      req.params.circleId,
      current_page
    )
    return res.json({ success: true })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
})

// POST /api/v1/circles/:circleId/invite
router.post('/:circleId/invite', async (req: any, res) => {
  const { username, inviteCode } = req.body
  try {
    const invite = await service.createInvite(
      req.params.circleId,
      req.user.id,
      username,
      inviteCode
    )
    return res.json({
      invite_code: invite.invite_code,
      invite_url: `${process.env.APP_URL || 'http://localhost:3000'}/invite/${invite.invite_code}`,
      expires_at: invite.expires_at,
    })
  } catch (err: any) {
    return res.status(400).json({ error: err.message })
  }
})

// POST /api/v1/circles/join/:inviteCode
router.post('/join/:inviteCode', async (req: any, res) => {
  try {
    const result = await service.acceptInvite(
      req.params.inviteCode,
      req.user.id
    )
    return res.json({ circle_id: result.circle_id, circle: { id: result.circle_id } })
  } catch (err: any) {
    return res.status(400).json({ error: err.message })
  }
})

// POST /api/v1/circles/join (JSON body fallback)
router.post('/join', async (req: any, res) => {
  const { inviteCode } = req.body
  if (!inviteCode) {
    return res.status(400).json({ error: 'inviteCode is required' })
  }
  try {
    const result = await service.acceptInvite(
      inviteCode,
      req.user.id
    )
    return res.json({ circle_id: result.circle_id, circle: { id: result.circle_id } })
  } catch (err: any) {
    return res.status(400).json({ error: err.message })
  }
})

// GET /api/v1/invitations — pending invites for current user
router.get('/invitations', async (req: any, res) => {
  try {
    const invitations = await service.getPendingInvitations(req.user.id)
    return res.json({ invitations })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
})

// PATCH /api/v1/circles/posts/:id - Edit post within 5 min window
router.patch('/posts/:id', async (req: any, res) => {
  const { content } = req.body
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Content is required' })
  }
  try {
    const post = await service.editPost(req.params.id, req.user.id, content.trim())
    return res.json({ post })
  } catch (err: any) {
    return res.status(400).json({ error: err.message })
  }
})

// DELETE /api/v1/circles/posts/:id - Delete post
router.delete('/posts/:id', async (req: any, res) => {
  try {
    await service.deletePost(req.params.id, req.user.id)
    return res.json({ success: true })
  } catch (err: any) {
    return res.status(400).json({ error: err.message })
  }
})

// GET /api/v1/circles/:circleId — Get circle details
router.get('/:circleId', async (req: any, res) => {
  try {
    const circle = await service.getCircleDetails(req.params.circleId, req.user.id)
    return res.json(circle)
  } catch (err: any) {
    return res.status(404).json({ error: err.message })
  }
})

// POST /api/v1/circles/:circleId/threads — Create discussion thread
const createThreadSchema = z.object({
  title: z.string().min(1).max(255),
  bookId: z.string().uuid().optional(),
  chapterTag: z.string().max(100).optional(),
  spoilerPage: z.number().int().min(0).optional()
})

router.post('/:circleId/threads', async (req: any, res) => {
  const parsed = createThreadSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }
  try {
    const thread = await service.createThread(req.params.circleId, req.user.id, parsed.data)
    return res.status(201).json(thread)
  } catch (err: any) {
    return res.status(400).json({ error: err.message })
  }
})

// GET /api/v1/circles/:circleId/members — Get member progress list
router.get('/:circleId/members', async (req: any, res) => {
  try {
    const members = await service.getCircleMembers(req.params.circleId)
    return res.json(members)
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
})

// PATCH /api/v1/circles/:circleId — Update circle settings
const updateCircleSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(500).optional(),
  currentBookId: z.string().uuid().nullable().optional()
})

router.patch('/:circleId', async (req: any, res) => {
  const parsed = updateCircleSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }
  try {
    await service.updateCircleSettings(req.params.circleId, req.user.id, parsed.data)
    return res.json({ success: true })
  } catch (err: any) {
    return res.status(400).json({ error: err.message })
  }
})

// PATCH /api/v1/circles/:circleId/members/me — Update member settings/progress
const updateMemberSchema = z.object({
  currentProgress: z.number().int().min(0).optional(),
  notificationPreference: z.string().max(20).optional(),
  muteUntilPage: z.number().int().min(0).nullable().optional()
})

router.patch('/:circleId/members/me', async (req: any, res) => {
  const parsed = updateMemberSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }
  try {
    await service.updateMemberSettings(req.params.circleId, req.user.id, parsed.data)
    return res.json({ success: true })
  } catch (err: any) {
    return res.status(400).json({ error: err.message })
  }
})

// DELETE /api/v1/circles/:circleId — Delete circle
router.delete('/:circleId', async (req: any, res) => {
  try {
    await service.deleteCircle(req.params.circleId, req.user.id)
    return res.json({ message: 'Circle deleted successfully.' })
  } catch (err: any) {
    return res.status(400).json({ error: err.message })
  }
})

// POST /api/v1/circles/:circleId/leave — Leave circle
router.post('/:circleId/leave', async (req: any, res) => {
  try {
    await service.leaveCircle(req.params.circleId, req.user.id)
    return res.json({ message: 'Left circle successfully.' })
  } catch (err: any) {
    return res.status(400).json({ error: err.message })
  }
})

export default router
