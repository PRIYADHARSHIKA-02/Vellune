'use client';

import React, { useState } from 'react';
import { useStore } from '../store';
import { useBooks, useSessions, useNotes, useCircles, useUpdateBook, useAddNote } from '../hooks/queries';
import { Play, Sparkles, BookOpen, Quote, ChevronRight, Landmark, Star, Flame, Users, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const { 
    activeSession, startReadingSession, setSelectedBookIdForDetail, setFinishedBookToRate, user 
  } = useStore();
  
  const router = useRouter();
  const [showMonthModal, setShowMonthModal] = useState(false);


  const updateBookMutation = useUpdateBook();
  const addNoteMutation = useAddNote();

  // React Query server state syncing
  const { data: books = [], isLoading: isBooksLoading } = useBooks();
  const { data: sessions = [], isLoading: isSessionsLoading } = useSessions();
  const { data: notes = [], isLoading: isNotesLoading } = useNotes();
  const { data: circles = [], isLoading: isCirclesLoading } = useCircles();

  const readingBooks = books.filter(b => b.status === 'reading');
  const finishedBooks = books.filter(b => b.status === 'finished');
  const latestNotes = [...notes]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  // Calculate Streak
  const calculateStreak = () => {
    if (sessions.length === 0) return 0;
    
    const uniqueSessionDates = Array.from(new Set(
      sessions.map(s => new Date(s.startTime).toDateString())
    )).map(d => new Date(d));

    // Sort descending
    uniqueSessionDates.sort((a, b) => b.getTime() - a.getTime());

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Check if the most recent session is today or yesterday
    const firstSessionDate = uniqueSessionDates[0];
    if (firstSessionDate.getTime() < yesterday.getTime()) {
      return 0; // Streak broken
    }

    const expectedDate = new Date(firstSessionDate);
    for (let i = 0; i < uniqueSessionDates.length; i++) {
      if (uniqueSessionDates[i].getTime() === expectedDate.getTime()) {
        streak++;
        expectedDate.setDate(expectedDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  };

  const streakCount = calculateStreak();

  // Helper to determine active streak days (last 7 days)
  const last7Days = Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - idx));
    return d;
  });

  const hasReadOnDate = (d: Date) => {
    return sessions.some(s => {
      const start = new Date(s.startTime);
      return start.getFullYear() === d.getFullYear() &&
             start.getMonth() === d.getMonth() &&
             start.getDate() === d.getDate();
    });
  };

  const handleStartQuickSession = (bookId: string) => {
    startReadingSession(bookId, 'Home', 'focused');
    router.push('/track');
  };



  const isLoading = isBooksLoading || isSessionsLoading || isNotesLoading || isCirclesLoading;

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text-secondary)' }}>
        Loading dashboard metrics...
      </div>
    );
  }

  // Fallback to name or username
  const displayName = user?.fullName || user?.username || 'Reader';

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Welcome Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="screen-title" style={{ fontSize: '2.2rem' }}>Welcome back, {displayName}</h1>
          <p className="screen-subtitle">Your library is updated. Ready for another chapter?</p>
        </div>
        <div className="glass" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderColor: 'var(--border-glass-focus)' }}>
          <Sparkles size={16} style={{ color: 'var(--accent-primary)' }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>TBR Rank: #3 In Circle</span>
        </div>
      </div>

      {/* Bento Grid of Widgets */}
      <div className="bento-grid">
        
        {/* Streak Widget */}
        <div 
          className="glass bento-card bento-col-4" 
          onClick={() => setShowMonthModal(true)}
          style={{ 
            padding: '1.5rem', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between', 
            minHeight: '160px',
            cursor: 'pointer',
            transition: 'transform 0.2s, border-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-glass)';
          }}
        >
          <div className="flex-between">
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Reading Streak</span>
            <Flame size={18} style={{ color: 'var(--accent-primary)' }} />
          </div>
          <div style={{ margin: '0.5rem 0' }}>
            <span style={{ fontSize: '2.5rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--accent-primary)' }}>{streakCount}</span>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>days in a row</span>
          </div>

          {/* Daily Streaks Weekly Dots */}
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', margin: '0.5rem 0 0.75rem 0', background: 'rgba(255,255,255,0.01)', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,255,255,0.05)' }}>
            {last7Days.map((d, idx) => {
              const active = hasReadOnDate(d);
              const dayLabel = d.toLocaleDateString('en-US', { weekday: 'narrow' });
              const isToday = d.toDateString() === new Date().toDateString();
              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                  <div 
                    style={{ 
                      width: '8px', 
                      height: '8px', 
                      borderRadius: '50%', 
                      background: active ? 'var(--accent-primary)' : 'rgba(255,255,255,0.15)',
                      boxShadow: active ? '0 0 6px var(--accent-primary)' : 'none',
                      border: isToday ? '1px solid var(--accent-primary)' : 'none'
                    }} 
                  />
                  <span style={{ fontSize: '0.6rem', color: isToday ? 'var(--accent-primary)' : 'var(--text-muted)', fontWeight: isToday ? 700 : 500 }}>
                    {dayLabel}
                  </span>
                </div>
              );
            })}
          </div>

          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>
            {streakCount > 0 ? 'Click to view monthly calendar streak.' : 'Start a session today to begin a new streak!'}
          </p>
        </div>

        {/* Annual Goal Widget */}
        <div className="glass bento-card bento-col-4" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '160px' }}>
          <div className="flex-between">
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>2026 Reading Goal</span>
            <BookOpen size={16} style={{ color: 'var(--accent-primary)' }} />
          </div>
          <div style={{ margin: '1rem 0' }}>
            <span style={{ fontSize: '2.5rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--accent-primary)' }}>{finishedBooks.length}</span>
            <span style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}> / {user?.readingGoalAnnual || 12}</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>books completed</span>
          </div>
          <div>
            <div className="progress-bar-container" style={{ height: '4px' }}>
              <div className="progress-bar-fill" style={{ width: `${Math.min(100, (finishedBooks.length / (user?.readingGoalAnnual || 12)) * 100)}%` }}></div>
            </div>
            <div className="flex-between" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              <span>{Math.round((finishedBooks.length / (user?.readingGoalAnnual || 12)) * 100)}% complete</span>
              <span>On track</span>
            </div>
          </div>
        </div>

        {/* Time Spent Widget */}
        <div className="glass bento-card bento-col-4" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '160px' }}>
          <div className="flex-between">
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Time Invested</span>
            <Landmark size={16} style={{ color: 'var(--format-library)' }} />
          </div>
          <div style={{ margin: '1rem 0' }}>
            <span style={{ fontSize: '2.5rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--accent-primary)' }}>
              {Math.round(sessions.reduce((acc, s) => acc + s.durationMinutes, 0) / 60)}
            </span>
            <span style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}> hrs</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
              over {sessions.length} sessions
            </span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Average session length: {sessions.length > 0 ? Math.round(sessions.reduce((acc, s) => acc + s.durationMinutes, 0) / sessions.length) : 0} minutes.
          </p>
        </div>

        {/* Currently Reading */}
        <div className="bento-card bento-col-8" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
          <div className="flex-between">
            <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)' }}>Currently Reading</h2>
            <button className="btn btn-text" onClick={() => router.push('/shelf')} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', padding: 0 }}>
              View Library Shelf <ChevronRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {readingBooks.length === 0 ? (
              <div className="glass" style={{ padding: '2rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>You aren&apos;t reading any books right now.</p>
                <button className="btn btn-primary" style={{ color: '#091A1E', fontWeight: 700 }} onClick={() => router.push('/shelf')}>Browse To Read list</button>
              </div>
            ) : (
              readingBooks.map(book => {
                const isTimerActive = activeSession?.bookId === book.id;
                return (
                  <div 
                    key={book.id} 
                    className="glass book-card-3d" 
                    style={{ padding: '1rem', display: 'flex', gap: '1.25rem', alignItems: 'center', transition: 'border-color 0.2s', overflow: 'visible' }} 
                    onClick={() => setSelectedBookIdForDetail(book.id)}
                  >
                    {/* 3D Tactile Cover */}
                    <div className="book-inner-3d" style={{ width: '60px', height: '90px', flexShrink: 0 }}>
                      <div className="book-spine-3d" style={{ left: '-8px', width: '16px' }}></div>
                      <img 
                        src={book.coverUrl || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=100'} 
                        alt={book.title} 
                        className="book-cover-image"
                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=100' }}
                      />
                      <div className="book-glare-3d"></div>
                    </div>

                    <div style={{ flexGrow: 1, minWidth: 0 }}>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                        {book.title}
                      </h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.15rem' }}>
                        by {book.author}
                      </p>
                      
                      <div style={{ marginTop: '0.5rem' }}>
                        <div className="flex-between" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                          <span>Page {book.currentPage} of {book.pageCount}</span>
                          <span>{book.progressPercentage}%</span>
                        </div>
                        <div className="progress-bar-container" style={{ height: '4px' }}>
                          <div className="progress-bar-fill" style={{ width: `${book.progressPercentage}%` }}></div>
                        </div>
                      </div>
                    </div>

                    <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'stretch' }}>
                      {isTimerActive ? (
                        <button 
                          className="btn btn-primary animate-pulse-glow" 
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', color: '#091A1E', fontWeight: 700, width: '100%', textAlign: 'center' }}
                          onClick={(e) => { e.stopPropagation(); router.push('/track'); }}
                        >
                          Active
                        </button>
                      ) : (
                        <>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', display: 'flex', gap: '0.25rem', alignItems: 'center', justifyContent: 'center', width: '100%' }}
                            onClick={(e) => { e.stopPropagation(); handleStartQuickSession(book.id); }}
                          >
                            <Play size={10} fill="currentColor" /> Start Timer
                          </button>
                          <button 
                            className="btn btn-primary" 
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', display: 'flex', gap: '0.25rem', alignItems: 'center', justifyContent: 'center', color: '#091A1E', fontWeight: 700, width: '100%' }}
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setFinishedBookToRate(book);
                            }}
                          >
                            Finished
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Quotes/Reflections */}
        <div className="bento-card bento-col-4" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '1rem' }}>
          
          {/* Notes Preview Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="flex-between">
              <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)' }}>Recent Reflections</h2>
              <button className="btn btn-text" onClick={() => router.push('/remember')} style={{ padding: 0, fontSize: '0.8rem' }}>
                All Notes
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {latestNotes.length === 0 ? (
                <div className="glass" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Quote size={20} style={{ marginBottom: '0.5rem', opacity: 0.3 }} />
                  <p style={{ fontSize: '0.85rem' }}>No highlights captured yet.</p>
                </div>
              ) : (
                latestNotes.map(note => {
                  const book = books.find(b => b.id === note.bookId);
                  return (
                    <div key={note.id} className="glass" style={{ padding: '1rem', background: 'rgba(255,255,255,0.01)', borderLeft: '3px solid var(--accent-primary)' }}>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontStyle: note.type === 'quote' ? 'italic' : 'normal', lineHeight: 1.4 }}>
                        {note.type === 'quote' ? `"${note.content}"` : note.content}
                      </p>
                      <div className="flex-between" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                        <span>{book ? book.title : 'Deleted Book'}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          {note.isFavorite && <Star size={10} fill="var(--color-on-hold)" style={{ color: 'var(--color-on-hold)' }} />}
                          Page {note.pageNumber}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Month Streak Modal Overlay */}
      {showMonthModal && (
        <div className="modal-overlay" style={{ display: 'flex', zIndex: 1000 }}>
          <div className="modal-content glass animate-fade-in" style={{ maxWidth: '380px', padding: '1.5rem' }}>
            <button className="modal-close" onClick={() => setShowMonthModal(false)}>
              <X size={18} />
            </button>
            
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <Flame size={18} style={{ color: 'var(--accent-primary)' }} />
                {new Date().toLocaleString('default', { month: 'long' })} {new Date().getFullYear()} Streaks
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Days you spent reading this month</p>
            </div>

            {/* Calendar Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                <span key={idx} style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, paddingBottom: '0.25rem' }}>
                  {day}
                </span>
              ))}
              {(() => {
                const today = new Date();
                const year = today.getFullYear();
                const month = today.getMonth();
                
                // First day of the month index (0 = Sunday, 1 = Monday...)
                const firstDayIdx = new Date(year, month, 1).getDay();
                // Total days in month
                const totalDays = new Date(year, month + 1, 0).getDate();
                
                const items = [];
                
                // Pad empty days at start
                for (let i = 0; i < firstDayIdx; i++) {
                  items.push(<div key={`empty-${i}`} />);
                }
                
                // Render days of the month
                for (let day = 1; day <= totalDays; day++) {
                  const currentDayDate = new Date(year, month, day);
                  const active = hasReadOnDate(currentDayDate);
                  const isCurrentDay = currentDayDate.toDateString() === today.toDateString();
                  
                  items.push(
                    <div
                      key={day}
                      style={{
                        aspectRatio: '1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        fontWeight: isCurrentDay ? 700 : 500,
                        background: active ? 'var(--accent-primary)' : 'rgba(255,255,255,0.02)',
                        color: active ? '#091A1E' : isCurrentDay ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        border: isCurrentDay ? '1px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.05)',
                        boxShadow: active ? '0 0 6px var(--accent-primary)' : 'none',
                      }}
                    >
                      {day}
                    </div>
                  );
                }
                
                return items;
              })()}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowMonthModal(false)} style={{ padding: '0.4rem 1.2rem', fontSize: '0.85rem' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}



    </div>
  );
}
