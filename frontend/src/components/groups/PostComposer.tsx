import React, { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { useCircleStore } from '../../store/circles.store'

interface Props {
  circleId: string
  threadId: string
  myCurrentPage: number
  myCurrentChapter: string
  editingPost?: any
  onCancelEdit?: () => void
  onPostCreated?: () => void
}

export function PostComposer({
  circleId,
  threadId,
  myCurrentPage,
  myCurrentChapter,
  editingPost,
  onCancelEdit,
  onPostCreated
}: Props) {
  const { addPost, setThreadPosts, threads } = useCircleStore()
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Pre-fill content if editing
  useEffect(() => {
    if (editingPost) {
      setContent(editingPost.content || '')
    } else {
      setContent('')
    }
    setError('')
  }, [editingPost])

  async function handleSubmit() {
    if (!content.trim()) return
    setIsSubmitting(true)
    setError('')

    try {
      if (editingPost) {
        // Edit Mode: PATCH /api/v1/circles/posts/:id
        const res = await api.patch(`/circles/posts/${editingPost.id}`, {
          content: content.trim()
        })
        const updatedPost = res.data.post || res.data
        
        // Update post in store threads list
        const posts = threads[threadId] ?? []
        const updatedPosts = posts.map((p) => (p.id === editingPost.id ? { ...p, content: updatedPost.content, is_edited: true } : p))
        setThreadPosts(threadId, updatedPosts)
        
        if (onCancelEdit) onCancelEdit()
      } else {
        // Create Mode: POST /api/v1/circles/:circleId/threads/:threadId/posts
        const res = await api.post(`/circles/${circleId}/threads/${threadId}/posts`, {
          content: content.trim(),
          chapter_tag: myCurrentChapter || `Page ${myCurrentPage}`,
          page_reference: myCurrentPage,
        })
        const post = res.data.post || res.data
        
        // Add to Zustand store
        addPost(threadId, post)
      }

      setContent('')
      if (onPostCreated) onPostCreated()
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to submit post')
    } finally {
      setIsSubmitting(false)
    }
  }

  const chapterDisplay = editingPost 
    ? (editingPost.chapterTag || `p. ${editingPost.pageReference}`) 
    : (myCurrentChapter || `p. ${myCurrentPage}`)

  return (
    <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Pre-filled progress tags (always visible and non-editable) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Posting about:</span>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              background: 'rgba(212, 178, 111, 0.12)',
              color: 'var(--accent-primary)',
              border: '1px solid rgba(212, 178, 111, 0.2)',
              padding: '0.15rem 0.5rem',
              borderRadius: 'var(--radius-full)'
            }}
          >
            {chapterDisplay}
          </span>
        </div>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          {editingPost ? '(based on original post)' : '(based on logged progress)'}
        </span>
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Share a thought about this chapter..."
        maxLength={1000}
        className="form-textarea"
        style={{
          height: '90px',
          resize: 'none',
          fontSize: '0.9rem',
          lineHeight: 1.4
        }}
      />

      {/* Character count at 800+ */}
      {content.length >= 800 && (
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'right', margin: 0 }}>
          {1000 - content.length} characters left
        </p>
      )}

      {error && (
        <p style={{ fontSize: '0.75rem', color: '#ef4444', margin: 0 }}>{error}</p>
      )}

      <div style={{ display: 'flex', gap: '0.65rem' }}>
        {editingPost && (
          <button
            onClick={onCancelEdit}
            className="btn btn-secondary"
            style={{ flexGrow: 1, padding: '0.55rem' }}
            disabled={isSubmitting}
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={!content.trim() || isSubmitting}
          className="btn btn-primary"
          style={{ flexGrow: 2, padding: '0.55rem', color: '#091A1E', fontWeight: 700 }}
        >
          {isSubmitting ? 'Submitting...' : editingPost ? 'Update thought' : 'Post thought'}
        </button>
      </div>
    </div>
  )
}
