'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { useBooks, useSessions } from '../../hooks/queries';
import { MapPin, Smile, Clock, Calendar, BarChart, Play } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const AMBIENT_SOUNDS = [
  { id: 'rain', name: 'Autumn Rain', icon: '🌧️', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { id: 'cafe', name: 'Cozy Cafe', icon: '☕', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },
  { id: 'woods', name: 'Deep Woods', icon: '🌲', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3' },
  { id: 'lofi', name: 'Lo-Fi Beats', icon: '🎧', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
];

export default function TrackPage() {
  const { 
    activeSession, startReadingSession, cancelReadingSession, setSelectedBookIdForDetail
  } = useStore();

  const [selectedBookId, setSelectedBookId] = useState('');
  const [location, setLocation] = useState('Home');
  const [moodBefore, setMoodBefore] = useState('focused');
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  // Cozy Ambient Mixer state
  const [playingTracks, setPlayingTracks] = useState<Record<string, boolean>>({});
  const [volumes, setVolumes] = useState<Record<string, number>>({
    rain: 0.5,
    cafe: 0.5,
    woods: 0.5,
    lofi: 0.5,
  });
  const [audioElements, setAudioElements] = useState<Record<string, HTMLAudioElement>>({});

  const togglePlayTrack = (trackId: string) => {
    const isPlaying = !playingTracks[trackId];
    setPlayingTracks(prev => ({ ...prev, [trackId]: isPlaying }));

    let audio = audioElements[trackId];
    if (!audio) {
      const track = AMBIENT_SOUNDS.find(t => t.id === trackId);
      if (track) {
        audio = new Audio(track.url);
        audio.loop = true;
        audio.volume = volumes[trackId];
        setAudioElements(prev => ({ ...prev, [trackId]: audio }));
      }
    }

    if (audio) {
      if (isPlaying) {
        audio.play().catch(err => console.error('Audio play failed:', err));
      } else {
        audio.pause();
      }
    }
  };

  const handleVolumeChange = (trackId: string, volume: number) => {
    setVolumes(prev => ({ ...prev, [trackId]: volume }));
    const audio = audioElements[trackId];
    if (audio) {
      audio.volume = volume;
    }
  };

  // Pause audio on unmount
  useEffect(() => {
    return () => {
      Object.values(audioElements).forEach(audio => {
        audio.pause();
      });
    };
  }, [audioElements]);

  // Pause audio when session ends
  useEffect(() => {
    if (!activeSession) {
      Object.values(audioElements).forEach(audio => {
        audio.pause();
      });
      setPlayingTracks({});
    }
  }, [activeSession, audioElements]);

  // Queries
  const { data: books = [], isLoading: isBooksLoading } = useBooks();
  const { data: sessions = [], isLoading: isSessionsLoading } = useSessions();

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
  }, [books, targetBooks, selectedBookId]);

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

  // Dynamic Calendar Generator for Current Month
  const renderCalendar = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); // 0-indexed
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = new Date(year, month, 1).getDay(); // (0=Sun, 1=Mon, etc.)
    const monthName = format(today, 'MMMM yyyy');

    const days = [];
    
    // Empty cells for offset
    for (let i = 0; i < startOffset; i++) {
      days.push(<div key={`empty-${i}`} style={{ width: '35px', height: '35px' }}></div>);
    }

    // Active reading days from sessions
    const readDays = new Set(
      sessions
        .filter(s => {
          const sDate = new Date(s.startTime);
          return sDate.getFullYear() === year && sDate.getMonth() === month;
        })
        .map(s => new Date(s.startTime).getDate())
    );

    for (let day = 1; day <= daysInMonth; day++) {
      const isRead = readDays.has(day);
      const isToday = day === today.getDate();

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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ textAlign: 'center', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
          {monthName}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', justifyItems: 'center' }}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
            <div key={d} style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', width: '35px', textAlign: 'center', marginBottom: '0.25rem' }}>{d}</div>
          ))}
          {days}
        </div>
      </div>
    );
  };

  const isLoading = isBooksLoading || isSessionsLoading;

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text-secondary)' }}>
        Loading session tracker...
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Page Header */}
      <div>
        <h1 className="screen-title">Reading Sessions</h1>
        <p className="screen-subtitle">Track your time and pace, log thoughts, and review insights.</p>
      </div>

      {activeSession && activeBook ? (
        /* Active Timer View */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', alignItems: 'stretch' }}>
          
          {/* Main Active Timer Box */}
          <div className="glass" style={{ padding: '2.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', border: '1px solid rgba(99,102,241,0.3)', boxShadow: 'var(--shadow-glow)' }}>
            <div>
              <span className="status-pill" style={{ background: 'rgba(99, 102, 241, 0.12)', color: 'var(--accent-primary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Active Reading Session
              </span>
              <h2 style={{ fontSize: '1.8rem', marginTop: '0.5rem', fontFamily: 'var(--font-display)' }}>{activeBook.title}</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>by {activeBook.author}</p>
            </div>

            <img 
              src={activeBook.coverUrl || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=100'} 
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
              <button 
                className="btn btn-primary"
                style={{ boxShadow: 'var(--shadow-glow)' }}
                onClick={() => {
                  const btn = document.querySelector('.active-tracker-bar button.btn-primary') as HTMLButtonElement;
                  if (btn) btn.click();
                }}
              >
                Stop & Log Progress
              </button>
            </div>
          </div>

          {/* Cozy Ambient Mixer Box */}
          <div className="glass" style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', border: '1px solid var(--border-glass)', justifyContent: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', margin: 0, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                🎧 Cozy Ambient Mixer
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '0.25rem' }}>
                Mix background soundscapes to create your perfect reading sanctuary.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', margin: '0.5rem 0' }}>
              {AMBIENT_SOUNDS.map(track => {
                const isPlaying = playingTracks[track.id] || false;
                const volume = volumes[track.id];
                return (
                  <div key={track.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                    <span style={{ fontSize: '1.5rem' }}>{track.icon}</span>
                    <div style={{ flexGrow: 1, minWidth: 0 }}>
                      <div className="flex-between" style={{ marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>{track.name}</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{Math.round(volume * 100)}%</span>
                      </div>
                      <input 
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={(e) => handleVolumeChange(track.id, parseFloat(e.target.value))}
                        style={{ width: '100%', height: '4px', cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                      />
                    </div>
                    <button
                      type="button"
                      className="btn"
                      style={{
                        padding: '0.4rem 0.8rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: isPlaying ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.05)',
                        color: isPlaying ? '#091A1E' : 'var(--text-primary)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '4px',
                        transition: 'all 0.2s ease',
                      }}
                      onClick={() => togglePlayTrack(track.id)}
                    >
                      {isPlaying ? 'PAUSE' : 'PLAY'}
                    </button>
                  </div>
                );
              })}
            </div>
            
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0, textAlign: 'center' }}>
              💡 Adjust volumes of multiple tracks to mix rain with lo-fi beats!
            </p>
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
                        <option key={b.id} value={b.id}>{b.title} (p. {b.currentPage})</option>
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
                Reading History
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
                [...sessions].reverse().map(session => {
                  const book = books.find(b => b.id === session.bookId);
                  return (
                    <div key={session.id} className="glass" style={{ padding: '1.25rem' }}>
                      <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                        <div>
                          <h4 
                            style={{ 
                              fontSize: '0.95rem', 
                              fontWeight: 700, 
                              margin: 0,
                              cursor: book ? 'pointer' : 'default',
                              color: book ? 'var(--accent-primary)' : 'var(--text-primary)',
                            }}
                            onClick={() => book && setSelectedBookIdForDetail(book.id)}
                            onMouseEnter={(e) => { if (book) e.currentTarget.style.textDecoration = 'underline'; }}
                            onMouseLeave={(e) => { if (book) e.currentTarget.style.textDecoration = 'none'; }}
                          >
                            {book ? book.title : 'Deleted Book'}
                          </h4>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            by {book ? book.author : 'Unknown'}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {formatDistanceToNow(new Date(session.startTime))} ago
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.01)', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-glass)', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                        <span>⏱️ {session.durationMinutes} min read</span>
                        <span>📖 Page {session.pagesStart} - {session.pagesEnd} (+{session.pagesRead})</span>
                        <span>📍 {session.location}</span>
                        <span>😊 Mood: {session.moodAfter}</span>
                      </div>

                      {session.notes && (
                        <div 
                          style={{ 
                            fontSize: '0.85rem', 
                            color: 'var(--text-secondary)', 
                            fontStyle: 'italic', 
                            borderLeft: '2px solid var(--accent-primary)', 
                            paddingLeft: '0.5rem', 
                            margin: '0.5rem 0 0 0' 
                          }}
                          dangerouslySetInnerHTML={{ __html: session.notes }}
                        />
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
}
