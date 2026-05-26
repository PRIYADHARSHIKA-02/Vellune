'use client';

import React from 'react';
import { useStore } from '../store';
import { useBooks, useSessions, useNotes, useCircles } from '../hooks/queries';
import { Play, Sparkles, BookOpen, Quote, ChevronRight, Landmark, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const { 
    activeSession, startReadingSession, setSelectedBookIdForDetail, user 
  } = useStore();
  
  const router = useRouter();

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
        <div className="glass bento-card bento-col-4" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '160px' }}>
          <div className="flex-between">
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Reading Streak</span>
            <span style={{ fontSize: '1.25rem' }}>🔥</span>
          </div>
          <div style={{ margin: '1rem 0' }}>
            <span style={{ fontSize: '2.5rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--accent-primary)' }}>{streakCount}</span>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>days in a row</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {streakCount > 0 ? 'Keep it up! Consistency builds strong habits.' : 'Start a session today to begin a new streak!'}
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

                    <div style={{ flexShrink: 0 }}>
                      {isTimerActive ? (
                        <button 
                          className="btn btn-primary animate-pulse-glow" 
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', color: '#091A1E', fontWeight: 700 }}
                          onClick={(e) => { e.stopPropagation(); router.push('/track'); }}
                        >
                          Active
                        </button>
                      ) : (
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', display: 'flex', gap: '0.25rem', alignItems: 'center' }}
                          onClick={(e) => { e.stopPropagation(); handleStartQuickSession(book.id); }}
                        >
                          <Play size={10} fill="currentColor" /> Start Timer
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Quotes & Circles */}
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

          {/* Reading Circles Preview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="flex-between">
              <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)' }}>Active Circles</h2>
              <button className="btn btn-text" onClick={() => router.push('/groups')} style={{ padding: 0, fontSize: '0.8rem' }}>
                View Circles
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {circles.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Join circles to start spoiler-safe discussions.</p>
              ) : (
                circles.slice(0, 2).map(circle => (
                  <div key={circle.id} className="glass" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{circle.name}</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                        👥 {circle.members?.length || 1} members
                      </p>
                    </div>
                    <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => router.push('/groups')}>
                      Open
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
