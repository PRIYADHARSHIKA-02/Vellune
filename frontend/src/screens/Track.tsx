import React, { useState, useEffect } from 'react';
import { useStore, Book } from '../store';
import { Play, Calendar, MapPin, Smile, Clock, Sparkles, ChevronLeft, ChevronRight, BarChart } from 'lucide-react';
import { format, formatDistanceToNow, subDays } from 'date-fns';

export const Track: React.FC = () => {
  const { 
    books, sessions, activeSession, startReadingSession, cancelReadingSession 
  } = useStore();

  const [selectedBookId, setSelectedBookId] = useState('');
  const [location, setLocation] = useState('Home');
  const [moodBefore, setMoodBefore] = useState('focused');
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  // Active Timer Calculation
  useEffect(() => {
    if (!activeSession) return;

    const calculateElapsed = () => {
      const start = new Date(activeSession.startTime).getTime();
      const now = new Date().getTime();
      return Math.max(0, Math.floor((now - start) / 1000));
    };

    setSecondsElapsed(calculateElapsed());
    const interval = setInterval(() => {
      setSecondsElapsed(calculateElapsed());
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession]);

  const activeBook = activeSession ? books.find(b => b.id === activeSession.bookId) : null;
  const targetBooks = books.filter(b => b.status === 'reading' || b.status === 'to-read');

  // Pre-fill first book in list
  useEffect(() => {
    if (targetBooks.length > 0 && !selectedBookId) {
      setSelectedBookId(targetBooks[0].id);
    }
  }, [books]);

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookId) return;
    startReadingSession(selectedBookId, location, moodBefore);
  };

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

  // Custom Calendar Generator for May 2026
  const renderCalendar = () => {
    const daysInMonth = 31;
    const startOffset = 5; // May 1st 2026 is a Friday (0=Sun, 1=Mon, ..., 5=Fri)
    const days = [];
    
    // Empty cells for offset
    for (let i = 0; i < startOffset; i++) {
      days.push(<div key={`empty-${i}`} style={{ width: '35px', height: '35px' }}></div>);
    }

    // Active reading days from sessions
    const readDays = new Set(
      sessions.map(s => new Date(s.start_time).getDate())
    );

    for (let day = 1; day <= daysInMonth; day++) {
      const isRead = readDays.has(day);
      const isToday = day === 25; // May 25, 2026

      days.push(
        <div 
          key={`day-${day}`} 
          style={{
            width: '35px',
            height: '35px',
            borderRadius: '6px',
            border: isToday ? '2px solid var(--accent-primary)' : '1px solid var(--border-glass)',
            backgroundColor: isRead ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.8rem',
            fontWeight: isRead || isToday ? 'bold' : 'normal',
            color: isRead ? 'var(--text-primary)' : 'var(--text-secondary)',
            boxShadow: isRead ? '0 0 8px rgba(99,102,241,0.2)' : 'none',
            position: 'relative'
          }}
          title={isRead ? 'You read today!' : 'No sessions recorded'}
        >
          {day}
          {isRead && <span style={{ width: '4px', height: '4px', background: 'var(--accent-primary)', borderRadius: '50%', position: 'absolute', bottom: '3px' }}></span>}
        </div>
      );
    }

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', justifyItems: 'center' }}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
          <div key={d} style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', width: '35px', textAlign: 'center', marginBottom: '0.25rem' }}>{d}</div>
        ))}
        {days}
      </div>
    );
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Page Header */}
      <div>
        <h1 className="screen-title">Reading Sessions</h1>
        <p className="screen-subtitle">Track your time and pace, log thoughts, and review insights.</p>
      </div>

      {activeSession && activeBook ? (
        /* Active Timer View */
        <div className="glass" style={{ padding: '2.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', border: '1px solid rgba(99,102,241,0.3)', boxShadow: 'var(--shadow-glow)' }}>
          <div>
            <span className="status-pill" style={{ background: 'rgba(99, 102, 241, 0.12)', color: 'var(--accent-primary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Active Reading Session
            </span>
            <h2 style={{ fontSize: '1.8rem', marginTop: '0.5rem', fontFamily: 'var(--font-display)' }}>{activeBook.title}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>by {activeBook.author}</p>
          </div>

          <img 
            src={activeBook.cover_url} 
            alt={activeBook.title} 
            style={{ width: '100px', height: '150px', borderRadius: '8px', objectFit: 'cover', boxShadow: '0 10px 20px rgba(0,0,0,0.4)' }}
            onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=100' }}
          />

          <div style={{ margin: '0.5rem 0' }}>
            <div style={{ fontSize: '3rem', fontWeight: 800, fontFamily: 'monospace', color: 'var(--text-primary)', letterSpacing: '0.02em' }}>
              {formatTime(secondsElapsed)}
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}><MapPin size={12} /> {activeSession.location}</span>
              <span>•</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}><Smile size={12} /> Feeling {activeSession.moodBefore}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              className="btn btn-secondary" 
              style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-dnf)', borderColor: 'rgba(239,68,68,0.2)' }}
              onClick={() => {
                if (confirm('Cancel this reading session? Your progress will not be logged.')) cancelReadingSession();
              }}
            >
              Cancel
            </button>
            {/* The actual end log button is managed by the main overlay trigger */}
            <button 
              className="btn btn-primary"
              style={{ boxShadow: 'var(--shadow-glow)' }}
              onClick={() => {
                // Trigger modal opening. This is managed by custom callback set in parent (app.tsx).
                // For direct access, we can set a click handler or rely on the floating bar.
                // We'll dispatch a click event to the main floating Stop button.
                const btn = document.querySelector('.active-tracker-bar button.btn-primary') as HTMLButtonElement;
                if (btn) btn.click();
              }}
            >
              Stop & Log Progress
            </button>
          </div>
        </div>
      ) : (
        /* Setup / History View */
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '2rem' }}>
          
          {/* Left Column: Start Form & Calendar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Start Timer Panel */}
            <div className="glass" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-display)', marginBottom: '1.25rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <Clock size={16} style={{ color: 'var(--accent-primary)' }} />
                Start a New Session
              </h3>

              {targetBooks.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Add books to your Currently Reading or TBR shelf to track active sessions.</p>
              ) : (
                <form onSubmit={handleStart} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Select Book</label>
                    <select 
                      className="form-select" 
                      value={selectedBookId}
                      onChange={e => setSelectedBookId(e.target.value)}
                      required
                    >
                      {targetBooks.map(b => (
                        <option key={b.id} value={b.id}>{b.title} (p. {b.current_page})</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Location</label>
                      <select className="form-select" value={location} onChange={e => setLocation(e.target.value)}>
                        <option value="Home">Home</option>
                        <option value="Commute">Commute</option>
                        <option value="Cafe">Cafe</option>
                        <option value="Library">Library</option>
                        <option value="Park">Park</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Current Mood</label>
                      <select className="form-select" value={moodBefore} onChange={e => setMoodBefore(e.target.value)}>
                        <option value="focused">Focused</option>
                        <option value="inspired">Inspired</option>
                        <option value="relaxed">Relaxed</option>
                        <option value="neutral">Neutral</option>
                        <option value="tired">Tired</option>
                      </select>
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                    Start Reading Timer
                  </button>
                </form>
              )}
            </div>

            {/* Calendar panel */}
            <div className="glass" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-display)', marginBottom: '1.25rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <Calendar size={16} style={{ color: 'var(--format-library)' }} />
                Reading History (May 2026)
              </h3>
              {renderCalendar()}
            </div>

          </div>

          {/* Right Column: Sessions History */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-display)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <BarChart size={16} style={{ color: 'var(--color-finished)' }} />
              Session Log & Insights
            </h3>

            {/* Session log timeline */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {sessions.length === 0 ? (
                <div className="glass" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No sessions tracked yet. Use the start timer or log retroactively inside book details.
                </div>
              ) : (
                sessions.slice().reverse().map(session => {
                  const book = books.find(b => b.id === session.book_id);
                  return (
                    <div key={session.id} className="glass" style={{ padding: '1.25rem' }}>
                      <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                        <div>
                          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>
                            {book ? book.title : 'Deleted Book'}
                          </h4>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            by {book ? book.author : 'Unknown'}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {formatDistanceToNow(new Date(session.start_time))} ago
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.01)', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-glass)', marginBottom: '0.5rem' }}>
                        <span>⏱️ {session.duration_minutes} min read</span>
                        <span>📖 Page {session.pages_start} - {session.pages_end} (+{session.pages_read})</span>
                        <span>📍 {session.location}</span>
                        <span>😊 Mood: {session.mood_after}</span>
                      </div>

                      {session.notes && (
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', borderLeft: '2px solid var(--accent-primary)', paddingLeft: '0.5rem', margin: '0.5rem 0 0 0' }}>
                          "{session.notes}"
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
