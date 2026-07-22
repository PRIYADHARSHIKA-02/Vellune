import { useEffect } from 'react'
import { api } from '../lib/api'
import { useCircleStore } from '../store/circles.store'

export function useCircleRealtime(circleId: string, threadId: string, revealPostIds: string[] = []) {
  const { setThreadPosts, updateMemberProgress } = useCircleStore()

  useEffect(() => {
    if (!circleId || !threadId) return

    const refetchPosts = async () => {
      try {
        const res = await api.get(`/circles/${circleId}/threads/${threadId}/posts`, {
          params: {
            reveal_post_ids: revealPostIds.join(',')
          }
        })
        const posts = res.data.posts || res.data
        setThreadPosts(threadId, posts)
      } catch (err) {
        console.error('Failed to refetch posts:', err)
      }
    }

    const refetchMembers = async () => {
      try {
        const res = await api.get(`/circles/${circleId}/members`)
        const members = res.data
        if (Array.isArray(members)) {
          members.forEach((m: any) => {
            updateMemberProgress(m.userId, m.currentProgress)
          })
        }
      } catch (err) {
        console.error('Failed to refetch members:', err)
      }
    }

    // Initial fetch
    refetchPosts()
    refetchMembers()

    // Polling interval
    const interval = setInterval(() => {
      refetchPosts()
      refetchMembers()
    }, 5000)

    return () => clearInterval(interval)
  }, [circleId, threadId, setThreadPosts, updateMemberProgress, revealPostIds])
}
