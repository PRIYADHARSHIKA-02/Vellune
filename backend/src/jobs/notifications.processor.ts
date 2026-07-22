import Queue from 'bull'
import { client } from '../db/connection.js'

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
const notificationQueue = new Queue('notifications', redisUrl)

// local compatibility wrapper for raw queries using postgres-js
const db = {
  query: async (queryText: string, params: any[] = []) => {
    const result = await client.unsafe(queryText, params);
    return { rows: result };
  }
}

notificationQueue.process(async (job) => {
  const { userId } = job.data

  const result = await db.query(`
    SELECT
      cm.circle_id,
      rc.name AS circle_name,
      COUNT(dp.id) AS new_post_count
    FROM circle_members cm
    JOIN reading_circles rc ON rc.id = cm.circle_id
    JOIN discussion_threads dt ON dt.circle_id = cm.circle_id
    JOIN discussion_posts dp ON dp.thread_id = dt.id
    WHERE cm.user_id = $1
      AND cm.notification_preference IN ('digest', 'all')
      AND dp.created_at > NOW() - INTERVAL '24 hours'
      AND dp.page_reference <= cm.current_progress
    GROUP BY cm.circle_id, rc.name
    HAVING COUNT(dp.id) > 0
  `, [userId])

  if (!result.rows.length) return

  // Send push notification or email
  // Replace with your notification provider (Expo Push, FCM, etc.)
  console.log(`Digest for ${userId}:`, result.rows)
})

export { notificationQueue }
