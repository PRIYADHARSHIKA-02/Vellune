import React, { useState, useEffect } from 'react'
import { useCircleStore } from '../../store/circles.store'
import { useCircleRealtime } from '../../hooks/useCircleRealtime'
import { useStore } from '../../store'
import { api } from '../../lib/api'
import { EyeOff, Edit2, Trash2, Smile } from 'lucide-react'

interface Props {
  circleId: string
  threadId: string
  onStartEdit: (post: any) => void
}

const VALID_REACTIONS = ['insight', 'feel', 'think', 'wow', 'laugh']
const EMOJI_MAP: Record<string, string> = {
  insight: '💡',
  feel: '❤️',
  think: '🧠',
  wow: '😮',
  laugh: '😂'
}

export function DiscussionFeed({ circleId, threadId, onStartEdit }: Props) {
  const { user } = useStore()
  const { threads, setThreadPosts } = useCircleStore()
  const [revealedPostIds, setRevealedPostIds] = useState<string[]>([])
  const [now, setNow] = useState(new Date())

  // Subscribe to realtime polling updates
  useCircleRealtime(circleId, threadId, revealedPostIds)
  
  const posts = threads[threadId] ?? []

  // Keep now updated for edit timer calculations
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Reaction click handler
  const handleReact = async (postId: string, reaction: string) => {
    try {
      const res = await api.post(`/circles/posts/${postId}/react`, { reaction })
      const updatedPost = res.data.post || res.data
      
      // Update post in store
      const updatedPosts = posts.map((p) => (p.id === postId ? { ...p, reactions: updatedPost.reactions } : p))
      setThreadPosts(threadId, updatedPosts)
    } catch (err) {
      console.error('Failed to react:', err)
    }
  }

  // Delete post handler
  const handleDelete = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this thought?')) return
    try {
      await api.delete(`/circles/posts/${postId}`)
      // Remove from store
      setThreadPosts(threadId, posts.filter((p) => p.id !== postId))
    } catch (err) {
      console.error('Failed to delete post:', err)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      {posts.map((post) => {
        // Hidden post — spoiler placeholder
        if (post.is_hidden || post.isHidden) {
          return (
            <div
              key={post.id}
              className="glass"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.85rem 1rem',
                borderStyle: 'dashed',
                borderColor: 'var(--border-glass-focus)'
              }}
            >
              <EyeOff size={16} style={{ color: 'var(--text-muted)' }} />
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', flexGrow: 1, margin: 0 }}>
                Post contains content past your progress ({post.chapter_tag})
              </p>
              <button
                className="btn btn-secondary"
                style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem', color: 'var(--accent-primary)', borderColor: 'var(--border-glass)' }}
                onClick={() => {
                  if (confirm(
                    `This may contain spoilers for ${post.chapter_tag}.\nAre you sure you want to reveal it?`
                  )) {
                    setRevealedPostIds((prev) => [...prev, post.id])
                  }
                }}
              >
                Reveal
              </button>
            </div>
          )
        }

        // Check edit window remaining seconds
        const timeRemaining = Math.max(0, Math.floor((new Date(post.edit_expires_at || post.editExpiresAt || 0).getTime() - now.getTime()) / 1000))
        const isEditable = post.user_id === user?.id && timeRemaining > 0

        // Visible post
        return (
          <div
            key={post.id}
            className="glass"
            style={{
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem'
            }}
          >
            {/* Header info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'rgba(212, 178, 111, 0.12)',
                  border: '1px solid var(--accent-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'var(--accent-primary)'
                }}
              >
                {post.author_username ? post.author_username.charAt(0).toUpperCase() : 'U'}
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {post.author_username}
              </span>
              {post.is_edited && (
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  (edited)
                </span>
              )}
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                {post.chapter_tag} {post.page_reference > 0 ? `· p. ${post.page_reference}` : ''}
              </span>
            </div>

            {/* Content text */}
            <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.5, whiteSpace: 'pre-wrap', margin: 0 }}>
              {post.content}
            </p>

            {/* Reactions & actions row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
              {/* Reactions list */}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {VALID_REACTIONS.map((emoji) => {
                  const count = parseInt(post.reactions?.[emoji] || 0)
                  return (
                    <button
                      key={emoji}
                      onClick={() => handleReact(post.id, emoji)}
                      style={{
                        background: count > 0 ? 'rgba(212, 178, 111, 0.12)' : 'transparent',
                        border: '1px solid',
                        borderColor: count > 0 ? 'var(--accent-primary)' : 'var(--border-glass)',
                        color: count > 0 ? 'var(--accent-primary)' : 'var(--text-muted)',
                        padding: '0.15rem 0.45rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>{EMOJI_MAP[emoji] || '❓'}</span>
                      {count > 0 && <span>{count}</span>}
                    </button>
                  )
                })}
              </div>

              {/* Edit/Delete thought window */}
              {post.user_id === user?.id && (
                <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
                  {isEditable ? (
                    <button
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--accent-primary)',
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        cursor: 'pointer'
                      }}
                      onClick={() => onStartEdit(post)}
                    >
                      <Edit2 size={12} /> Edit ({timeRemaining}s)
                    </button>
                  ) : null}
                  <button
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#ef4444',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      cursor: 'pointer'
                    }}
                    onClick={() => handleDelete(post.id)}
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
