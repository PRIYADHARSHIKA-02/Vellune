import React, { useRef } from 'react';
import { Book, useStore } from '../store';
import { Book as BookIcon, Smartphone, Headphones, Landmark, Play, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface BookCardProps {
  book: Book;
  onSelect?: (bookId: string) => void;
  showDelete?: boolean;
}

export const BookCard: React.FC<BookCardProps> = ({ book, onSelect, showDelete = false }) => {
  const { startReadingSession, deleteBook, sessions, activeSession, setScreen } = useStore();
  const cardRef = useRef<HTMLDivElement>(null);

  const getFormatIcon = (format: Book['format']) => {
    switch (format) {
      case 'physical': return <BookIcon size={12} />;
      case 'ebook': return <Smartphone size={12} />;
      case 'audiobook': return <Headphones size={12} />;
      case 'library': return <Landmark size={12} />;
    }
  };

  const getFormatLabel = (format: Book['format']) => {
    return format.charAt(0).toUpperCase() + format.slice(1);
  };

  // Find last session for this book
  const bookSessions = sessions
    .filter(s => s.book_id === book.id)
    .sort((a, b) => new Date(b.end_time).getTime() - new Date(a.end_time).getTime());
  
  const lastReadDate = bookSessions.length > 0 ? new Date(bookSessions[0].end_time) : null;

  const handleStartSession = (e: React.MouseEvent) => {
    e.stopPropagation();
    startReadingSession(book.id, 'Home', 'neutral');
    setScreen('track');
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete "${book.title}"?`)) {
      deleteBook(book.id);
    }
  };

  // 3D Tilt and Glare hover tracker
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Percentage relative to card dimensions
    const percentX = (x / rect.width) * 100;
    const percentY = (y / rect.height) * 100;
    
    cardRef.current.style.setProperty('--light-x', `${percentX}%`);
    cardRef.current.style.setProperty('--light-y', `${percentY}%`);

    // Calculate rotation angles (range: -10 to +10 degrees)
    const rotateY = ((x - rect.width / 2) / rect.width) * -12;
    const rotateX = ((y - rect.height / 2) / rect.height) * 12;

    const inner = cardRef.current.querySelector('.book-inner-3d') as HTMLDivElement;
    if (inner) {
      inner.style.transform = `rotateY(${rotateY}deg) rotateX(${rotateX}deg) scale(1.06)`;
      
      const moveX = (x - rect.width/2) / 8;
      const moveY = (y - rect.height/2) / 8;
      inner.style.boxShadow = `${-moveX}px ${-moveY}px 25px rgba(0,0,0,0.65), 0 0 15px rgba(212, 178, 111, 0.15)`;
    }
  };

  const handleMouseLeave = () => {
    if (!cardRef.current) return;
    const inner = cardRef.current.querySelector('.book-inner-3d') as HTMLDivElement;
    if (inner) {
      inner.style.transform = 'none';
      inner.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.4)';
    }
  };

  const isCurrentlyReading = book.status === 'reading';
  const showProgress = isCurrentlyReading || book.status === 'finished' || book.status === 'on-hold';

  const cardStyle: React.CSSProperties = {
    display: 'flex',
    gap: '1.5rem',
    padding: '1.25rem',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'visible', /* Allow 3D card rotation shadow over boundaries */
  };

  const coverContainerStyle: React.CSSProperties = {
    width: '90px',
    height: '135px',
    flexShrink: 0,
  };

  const detailsStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    flexGrow: 1,
    minWidth: 0,
  };

  return (
    <div 
      ref={cardRef}
      className="glass animate-fade-in book-card-3d" 
      style={cardStyle} 
      onClick={() => onSelect && onSelect(book.id)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* 3D Tactile Cover Area */}
      <div className="book-inner-3d" style={coverContainerStyle}>
        <div className="book-spine-3d"></div>
        {book.cover_url ? (
          <img 
            src={book.cover_url} 
            alt={book.title} 
            className="book-cover-image"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=100`;
            }}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%', background: 'rgba(255,255,255,0.02)', borderRadius: '0 12px 12px 0' }}>
            <BookIcon size={32} style={{ color: 'var(--text-muted)' }} />
          </div>
        )}
        <div className="book-glare-3d"></div>
      </div>

      {/* Details Area */}
      <div style={detailsStyle}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
              {book.title}
            </h3>
            {showDelete && (
              <button 
                onClick={handleDelete}
                style={{ background: 'transparent', border: 'none', color: 'var(--color-dnf)', cursor: 'pointer', opacity: 0.7 }}
                title="Delete book"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.15rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            by {book.author}
          </p>

          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
            <span className={`badge-format ${book.format}`}>
              {getFormatIcon(book.format)}
              {getFormatLabel(book.format)}
            </span>
            {book.status === 'reading' && (
              <span className="status-pill" style={{ background: 'rgba(212, 178, 111, 0.1)', color: 'var(--color-reading)' }}>
                <span className="status-dot" style={{ backgroundColor: 'var(--color-reading)' }}></span>
                Reading
              </span>
            )}
            {book.status === 'finished' && (
              <span className="status-pill" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-finished)' }}>
                <span className="status-dot" style={{ backgroundColor: 'var(--color-finished)' }}></span>
                Finished
              </span>
            )}
            {book.status === 'to-read' && (
              <span className="status-pill" style={{ background: 'rgba(74, 163, 169, 0.1)', color: 'var(--color-to-read)' }}>
                <span className="status-dot" style={{ backgroundColor: 'var(--color-to-read)' }}></span>
                TBR
              </span>
            )}
            {book.status === 'dnf' && (
              <span className="status-pill" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-dnf)' }}>
                <span className="status-dot" style={{ backgroundColor: 'var(--color-dnf)' }}></span>
                DNF
              </span>
            )}
          </div>
        </div>

        <div style={{ marginTop: '0.5rem' }}>
          {showProgress && (
            <div style={{ marginBottom: '0.5rem' }}>
              <div className="flex-between" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                <span>
                  {book.format === 'audiobook' 
                    ? `${Math.round(book.current_page)} min / ${book.page_count} min`
                    : `p. ${book.current_page} of ${book.page_count}`
                  }
                </span>
                <span style={{ fontWeight: 600 }}>{book.progress_percentage}%</span>
              </div>
              <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${book.progress_percentage}%` }}></div>
              </div>
            </div>
          )}

          <div className="flex-between" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span>
              {lastReadDate ? `Read ${formatDistanceToNow(lastReadDate)} ago` : 'Not read yet'}
            </span>

            {/* Quick Session Start */}
            {(book.status === 'reading' || book.status === 'to-read') && (!activeSession || activeSession.bookId !== book.id) && (
              <button 
                className="btn btn-secondary btn-icon"
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: 'var(--radius-sm)' }}
                onClick={handleStartSession}
                title="Start reading session"
              >
                <Play size={10} fill="currentColor" />
                <span style={{ marginLeft: '2px' }}>Start</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
