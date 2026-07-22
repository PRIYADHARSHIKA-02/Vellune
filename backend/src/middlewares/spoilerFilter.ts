import { Request, Response, NextFunction } from 'express'

export interface RedactedPost {
  id: string
  is_hidden: true
  hidden_reason: 'past_progress'
  chapter_tag: string
}

export interface FullPost {
  id: string
  is_hidden: false
  content: string
  chapter_tag: string
  page_reference: number
  user_id: string
  author_username: string
  reactions: Record<string, number>
  parent_post_id: string | null
  is_edited: boolean
  edit_expires_at: string
  created_at: string
}

export type PostResponse = FullPost | RedactedPost

export function applySpoilerFilter(
  posts: any[],
  viewerProgress: number,
  revealPostIds: string[] = []
): PostResponse[] {
  return posts.map((post) => {
    if (post.page_reference > viewerProgress && !revealPostIds.includes(post.id)) {
      // Return NOTHING that could be a spoiler.
      // No author, no reactions, no hints about content.
      return {
        id: post.id,
        is_hidden: true as const,
        hidden_reason: 'past_progress' as const,
        chapter_tag: post.chapter_tag || 'General',
      }
    }
    return {
      id: post.id,
      is_hidden: false as const,
      content: post.content,
      chapter_tag: post.chapter_tag || 'General',
      page_reference: post.page_reference,
      user_id: post.user_id,
      author_username: post.author_username,
      reactions: post.reactions,
      parent_post_id: post.parent_post_id,
      is_edited: post.is_edited,
      edit_expires_at: post.edit_expires_at,
      created_at: post.created_at,
    }
  })
}
