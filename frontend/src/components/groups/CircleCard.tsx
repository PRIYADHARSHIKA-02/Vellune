import React from 'react'

interface CircleCardProps {
  circle: {
    id: string
    name: string
    member_count: number
    my_progress: number
    others_avg_progress: number
    unread_post_count: number
    book_title?: string
    book_cover?: string
  }
  onClick?: () => void
}

export function CircleCard({ circle, onClick }: CircleCardProps) {
  return (
    <div
      className="glass"
      style={{
        padding: '1.25rem',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
        position: 'relative'
      }}
      onClick={onClick}
    >
      {/* Circle name + member count */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {circle.book_cover ? (
            <img 
              src={circle.book_cover} 
              alt="Book Cover"
              style={{ width: '28px', height: '40px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-glass)' }}
              onError={(e: any) => e.target.src = '/fallback-book.png'}
            />
          ) : (
            <div style={{ width: '28px', height: '40px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              📚
            </div>
          )}
          <div>
            <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {circle.name}
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
              {circle.member_count} member{circle.member_count !== 1 ? 's' : ''}
              {circle.book_title ? ` · ${circle.book_title}` : ''}
            </p>
          </div>
        </div>
        {/* Unread badge */}
        {circle.unread_post_count > 0 && (
          <span style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            background: 'var(--accent-primary)',
            color: '#091A1E',
            padding: '0.15rem 0.5rem',
            borderRadius: 'var(--radius-full)'
          }}>
            {circle.unread_post_count} new
          </span>
        )}
      </div>

      {/* Progress Bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
        {/* Your progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', width: '75px' }}>Your progress</span>
          <div className="progress-bar-container" style={{ flexGrow: 1 }}>
            <div
              className="progress-bar-fill"
              style={{ width: `${circle.my_progress}%` }}
            />
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', width: '30px', textAlign: 'right' }}>
            {circle.my_progress}%
          </span>
        </div>

        {/* Others average */}
        {circle.others_avg_progress > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', width: '75px' }}>Others avg.</span>
            <div className="progress-bar-container" style={{ flexGrow: 1 }}>
              <div
                className="progress-bar-fill"
                style={{
                  width: `${circle.others_avg_progress}%`,
                  background: 'linear-gradient(90deg, #10b981 0%, #34d399 100%)',
                  opacity: 0.8
                }}
              />
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', width: '30px', textAlign: 'right' }}>
              {Math.round(circle.others_avg_progress)}%
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
