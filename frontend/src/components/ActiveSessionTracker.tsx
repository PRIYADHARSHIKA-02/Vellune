import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { Play, Square, Timer, MapPin, Smile } from 'lucide-react';

interface ActiveSessionTrackerProps {
  onLogOpen: () => void;
}

export const ActiveSessionTracker: React.FC<ActiveSessionTrackerProps> = ({ onLogOpen }) => {
  const { activeSession, books, cancelReadingSession } = useStore();
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  useEffect(() => {
    if (!activeSession) return;

    const calculateElapsed = () => {
      const start = new Date(activeSession.startTime).getTime();
      const now = new Date().getTime();
      return Math.max(0, Math.floor((now - start) / 1000));
    };

    setSecondsElapsed(calculateElapsed());

    const timer = setInterval(() => {
      setSecondsElapsed(calculateElapsed());
    }, 1000);

    return () => clearInterval(timer);
  }, [activeSession]);

  if (!activeSession) return null;

  const book = books.find(b => b.id === activeSession.bookId);
  if (!book) return null;

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return [
      hours > 0 ? String(hours).padStart(2, '0') : null,
      String(minutes).padStart(2, '0'),
      String(seconds).padStart(2, '0')
    ].filter(Boolean).join(':');
  };

  return (
    <div className="active-tracker-bar animate-pulse-glow">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0 }}>
        <img 
          src={book.cover_url} 
          alt={book.title} 
          style={{ width: '32px', height: '48px', borderRadius: '4px', objectFit: 'cover' }} 
        />
        <div style={{ minWidth: 0 }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            Reading {book.title}
          </h4>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
              <MapPin size={10} /> {activeSession.location}
            </span>
            <span>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
              <Smile size={10} /> {activeSession.moodBefore}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-primary)', fontWeight: 700, fontFamily: 'monospace', fontSize: '1rem' }}>
          <Timer size={14} className="animate-pulse-soft" />
          <span>{formatTime(secondsElapsed)}</span>
        </div>
        
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button 
            className="btn btn-secondary" 
            style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', border: 'none', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--color-dnf)' }}
            onClick={() => {
              if (confirm('Cancel this reading session? Your progress will not be logged.')) {
                cancelReadingSession();
              }
            }}
          >
            Cancel
          </button>
          <button 
            className="btn btn-primary" 
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
            onClick={onLogOpen}
          >
            <Square size={10} fill="currentColor" style={{ marginRight: '4px' }} />
            Stop & Log
          </button>
        </div>
      </div>
    </div>
  );
};
