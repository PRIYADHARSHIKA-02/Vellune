import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth.js'
import { CirclesService } from '../services/circles.service.js'

const router = Router()
const service = new CirclesService()

// All routes require authentication
router.use(authMiddleware)

// GET /api/v1/invitations — pending invites for current user
router.get('/', async (req: any, res) => {
  try {
    const invitations = await service.getPendingInvitations(req.user.id)
    return res.json(invitations)
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
})

// POST /api/v1/invitations/:code/accept
router.post('/:code/accept', async (req: any, res) => {
  try {
    const result = await service.acceptInvite(req.params.code, req.user.id)
    return res.json({
      message: 'Joined circle successfully.',
      circle: {
        id: result.circle_id
      }
    })
  } catch (err: any) {
    return res.status(400).json({ error: err.message })
  }
})

// POST /api/v1/invitations/:id/decline
router.post('/:id/decline', async (req: any, res) => {
  try {
    await service.declineInvite(req.params.id, req.user.id)
    return res.json({ message: 'Invitation declined.' })
  } catch (err: any) {
    return res.status(400).json({ error: err.message })
  }
})

// POST /api/v1/invitations/:id/undo
router.post('/:id/undo', async (req: any, res) => {
  try {
    await service.undoDeclineInvite(req.params.id, req.user.id)
    return res.json({ message: 'Decline undone. Invitation restored to pending.' })
  } catch (err: any) {
    return res.status(400).json({ error: err.message })
  }
})

export default router
