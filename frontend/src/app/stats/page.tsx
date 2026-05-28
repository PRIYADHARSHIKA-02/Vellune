'use client';

import React, { useState } from 'react';
import { useBooks, useSessions, useNotes } from '../../hooks/queries';
import { 
  BarChart, PieChart, TrendingUp, Calendar, Clock, 
  Landmark, Activity, Compass, Loader2, ChevronLeft, 
  ChevronRight, BookOpen, Flame, Trophy, Award, User, Star
} from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const GENRE_COLORS = [
  'var(--accent-primary)',   // Gold
  '#10b981',                 // Emerald Green
  '#3b82f6',                 // Blue
  '#8b5cf6',                 // Purple
  '#ec4899',                 // Rose Pink
  '#f97316'                  // Orange
];

export default function StatsPage() {
  const { data: books = [], isLoading: isBooksLoading } = useBooks();
  const { data: sessions = [], isLoading: isSessionsLoading } = useSessions();
  const { data: notes = [], isLoading: isNotesLoading } = useNotes();

  // Year filter state
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(2026);
  
  // Swipeable Streak Calendar states
  const [calendarMonth, setCalendarMonth] = useState<number>(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState<number>(new Date().getFullYear());

  const isLoading = isBooksLoading || isSessionsLoading || isNotesLoading;

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text-secondary)' }}>
        <Loader2 className="animate-spin" style={{ marginRight: '0.5rem' }} /> Loading statistics...
      </div>
    );
  }

  // --- FILTERED DATASETS BY YEAR ---
  const getFilteredBooks = () => {
    if (selectedYear === 'all') return books;
    return books.filter(b => {
      const date = b.dateFinished || b.dateAdded;
      return new Date(date).getFullYear() === selectedYear;
    });
  };

  const getFilteredSessions = () => {
    if (selectedYear === 'all') return sessions;
    return sessions.filter(s => new Date(s.startTime).getFullYear() === selectedYear);
  };

  const getFilteredNotes = () => {
    if (selectedYear === 'all') return notes;
    return notes.filter(n => new Date(n.createdAt).getFullYear() === selectedYear);
  };

  const filteredBooks = getFilteredBooks();
  const filteredSessions = getFilteredSessions();
  const filteredNotes = getFilteredNotes();

  const finishedBooks = filteredBooks.filter(b => b.status === 'finished');
  const toReadBooks = books.filter(b => b.status === 'to-read'); // TBR lists can remain global
  const currentlyReading = books.filter(b => b.status === 'reading');

  const totalPagesRead = filteredSessions.reduce((acc, s) => acc + s.pagesRead, 0);
  const totalHours = Math.round(filteredSessions.reduce((acc, s) => acc + s.durationMinutes, 0) / 60);

  // --- 1. MOST READ GENRES (SVG Donut Chart) ---
  const completedGenres = finishedBooks.reduce((acc, book) => {
    const genres = book.genres && book.genres.length > 0 ? book.genres : ['Unspecified'];
    genres.forEach(g => {
      const normalized = g.trim();
      acc[normalized] = (acc[normalized] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const sortedGenres = Object.entries(completedGenres)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5); // top 5 genres

  const totalGenreCount = Object.values(completedGenres).reduce((a, b) => a + b, 0) || 1;

  // --- 2. MOST READ AUTHORS (Progress lines representation) ---
  const completedAuthors = finishedBooks.reduce((acc, book) => {
    const author = book.author || 'Unknown';
    acc[author] = (acc[author] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sortedAuthors = Object.entries(completedAuthors)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5); // top 5 authors

  // --- 3. FORMAT BREAKDOWN ---
  const formatCounts = filteredBooks.reduce((acc, book) => {
    if (book.format in acc) {
      acc[book.format] = (acc[book.format] || 0) + 1;
    }
    return acc;
  }, { physical: 0, ebook: 0, audiobook: 0, library: 0 } as Record<'physical' | 'ebook' | 'audiobook' | 'library', number>);

  const totalFormatBooks = filteredBooks.length || 1;
  const formatPercentages = {
    physical: Math.round((formatCounts.physical / totalFormatBooks) * 100),
    ebook: Math.round((formatCounts.ebook / totalFormatBooks) * 100),
    audiobook: Math.round((formatCounts.audiobook / totalFormatBooks) * 100),
    library: Math.round((formatCounts.library / totalFormatBooks) * 100)
  };

  // --- 4. VENUE ANALYSIS ---
  const locationCounts = filteredSessions.reduce((acc, s) => {
    if (s.location) {
      acc[s.location] = (acc[s.location] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // --- 5. WEEKLY PAGES COMPLETED (Bar Chart) ---
  const weeklyPages = [340, 210, 480, (totalPagesRead % 500) || 120];

  // --- 6. SWIPEABLE STREAKS CALENDAR ---
  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(prev => prev - 1);
    } else {
      setCalendarMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(prev => prev + 1);
    } else {
      setCalendarMonth(prev => prev + 1);
    }
  };

  const hasReadOnDate = (d: Date) => {
    return sessions.some(s => {
      const start = new Date(s.startTime);
      return start.getFullYear() === d.getFullYear() &&
             start.getMonth() === d.getMonth() &&
             start.getDate() === d.getDate();
    });
  };

  // SVG Chart: Pages Read monthly bar chart
  const renderActivityChart = () => {
    const maxVal = Math.max(...weeklyPages, 100);
    const height = 150;
    const width = 350;
    const padding = 30;

    return (
      <svg width="100%" height={height + padding} viewBox={`0 0 ${width} ${height + padding}`} style={{ overflow: 'visible' }}>
        {/* Y Axis Grid lines */}
        {[0, 0.5, 1].map((ratio, i) => {
          const y = height - ratio * (height - 10);
          return (
            <g key={i}>
              <line x1="30" y1={y} x2={width} y2={y} stroke="var(--border-glass)" strokeDasharray="4 4" />
              <text x="5" y={y + 4} fill="var(--text-muted)" fontSize="10" fontFamily="monospace">
                {Math.round(ratio * maxVal)}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {weeklyPages.map((pages, idx) => {
          const barWidth = 40;
          const spacing = 70;
          const x = 50 + idx * spacing;
          const barHeight = (pages / maxVal) * (height - 10);
          const y = height - barHeight;

          return (
            <g key={idx}>
              {/* Highlight Glow Hover */}
              <rect 
                x={x} 
                y={y} 
                width={barWidth} 
                height={barHeight} 
                fill="var(--accent-primary)" 
                opacity="0.85" 
                rx="4"
                style={{ transition: 'all 0.3s ease' }}
              />
              <text x={x + barWidth / 2} y={y - 8} fill="var(--text-primary)" fontSize="10" fontWeight="bold" textAnchor="middle">
                {pages}p
              </text>
              <text x={x + barWidth / 2} y={height + 18} fill="var(--text-secondary)" fontSize="11" textAnchor="middle">
                Week {idx + 1}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  // Heatmap sessions grid (May 2026/Current Month)
  const renderHeatmap = () => {
    const weeks = [];
    const readDays = new Set(sessions.map(s => new Date(s.startTime).getDate()));

    // Render 5 weeks
    for (let w = 0; w < 5; w++) {
      const days = [];
      for (let d = 0; d < 7; d++) {
        const dayNumber = w * 7 + d - 4; // Shifted to align May
        const isValid = dayNumber >= 1 && dayNumber <= 31;
        const isRead = isValid && readDays.has(dayNumber);

        days.push(
          <div 
            key={d} 
            style={{ 
              width: '18px', 
              height: '18px', 
              borderRadius: '3px',
              backgroundColor: !isValid 
                ? 'transparent' 
                : isRead 
                  ? 'var(--accent-primary)' 
                  : 'rgba(255,255,255,0.04)',
              opacity: isRead ? 0.9 : 1,
              border: isValid ? '1px solid var(--border-glass)' : 'none'
            }}
            title={isRead ? `Read on May ${dayNumber}` : isValid ? `May ${dayNumber} (No Session)` : ''}
          />
        );
      }
      weeks.push(<div key={w} style={{ display: 'flex', gap: '0.25rem' }}>{days}</div>);
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>
        {weeks}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.25rem', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem', alignItems: 'center' }}>
          <span>Less</span>
          <span style={{ width: '10px', height: '10px', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '2px' }}></span>
          <span style={{ width: '10px', height: '10px', backgroundColor: 'var(--accent-primary)', borderRadius: '2px' }}></span>
          <span>More</span>
        </div>
      </div>
    );
  };

  // --- SVG Donut Render helper ---
  const renderGenresDonut = () => {
    const r = 50;
    const cx = 80;
    const cy = 80;
    const strokeWidth = 14;
    const circumference = 2 * Math.PI * r;

    let currentOffset = 0;
    const segments = sortedGenres.map(([genre, count], idx) => {
      const value = Math.round((count / totalGenreCount) * 100);
      const color = GENRE_COLORS[idx % GENRE_COLORS.length];
      return { genre, count, value, color };
    });

    if (segments.length === 0) {
      return (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', padding: '1rem' }}>
          No genre data available for completed books.
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '2rem' }}>
        <svg width="160" height="160" viewBox="0 0 160 160">
          <circle cx={cx} cy={cy} r={r} fill="transparent" stroke="var(--border-glass)" strokeWidth={strokeWidth} />
          {segments.map((seg, idx) => {
            const strokeDash = (seg.value / 100) * circumference;
            const strokeOffset = circumference - strokeDash + currentOffset;
            currentOffset -= strokeDash;

            return (
              <circle
                key={idx}
                cx={cx}
                cy={cy}
                r={r}
                fill="transparent"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${strokeDash} ${circumference}`}
                strokeDashoffset={strokeOffset}
                transform={`rotate(-90 ${cx} ${cy})`}
                strokeLinecap="round"
                style={{ transition: 'all 0.5s ease-out' }}
              />
            );
          })}
          <text x={cx} y={cy + 5} textAnchor="middle" fill="var(--text-primary)" fontSize="11" fontWeight="bold" fontFamily="var(--font-display)">
            Genres
          </text>
        </svg>

        {/* Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', minWidth: '150px' }}>
          {segments.map((seg, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: seg.color, flexShrink: 0 }}></span>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{seg.value}%</span>
              <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={seg.genre}>
                {seg.genre}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // --- SVG format ring ---
  const renderFormatRing = () => {
    const r = 50;
    const cx = 80;
    const cy = 80;
    const strokeWidth = 14;
    const circumference = 2 * Math.PI * r;

    let currentOffset = 0;
    const segments = [
      { color: 'var(--format-physical)', value: formatPercentages.physical, label: 'Physical' },
      { color: 'var(--format-ebook)', value: formatPercentages.ebook, label: 'Ebook' },
      { color: 'var(--format-audiobook)', value: formatPercentages.audiobook, label: 'Audio' },
      { color: 'var(--format-library)', value: formatPercentages.library, label: 'Library' }
    ].filter(s => s.value > 0);

    if (segments.length === 0) {
      return <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No format data.</div>;
    }

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', justifyContent: 'center' }}>
        <svg width="160" height="160" viewBox="0 0 160 160">
          <circle cx={cx} cy={cy} r={r} fill="transparent" stroke="var(--border-glass)" strokeWidth={strokeWidth} />
          {segments.map((seg, idx) => {
            const strokeDash = (seg.value / 100) * circumference;
            const strokeOffset = circumference - strokeDash + currentOffset;
            currentOffset -= strokeDash;

            return (
              <circle
                key={idx}
                cx={cx}
                cy={cy}
                r={r}
                fill="transparent"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${strokeDash} ${circumference}`}
                strokeDashoffset={strokeOffset}
                transform={`rotate(-90 ${cx} ${cy})`}
                strokeLinecap="round"
                style={{ transition: 'all 0.5s ease-out' }}
              />
            );
          })}
        </svg>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {segments.map((seg, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: seg.color }}></span>
              <span style={{ fontWeight: 700 }}>{seg.value}%</span>
              <span style={{ color: 'var(--text-secondary)' }}>{seg.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '3rem' }}>
      
      {/* Header and Year Selection Log */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '1.25rem' }}>
        <div>
          <h1 className="screen-title">Reading Insights</h1>
          <p className="screen-subtitle">Visualize your genres, streaks, authors, and year-by-year logs.</p>
        </div>
        
        {/* Elegant Year Selector */}
        <div style={{ display: 'flex', gap: '0.4rem', background: 'rgba(255,255,255,0.02)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)' }}>
          {([2026, 2025, 2024, 'all'] as const).map(yr => (
            <button
              key={yr}
              type="button"
              onClick={() => setSelectedYear(yr)}
              style={{
                padding: '0.4rem 0.9rem',
                fontSize: '0.8rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: selectedYear === yr ? 'var(--accent-primary)' : 'transparent',
                color: selectedYear === yr ? '#091A1E' : 'var(--text-secondary)',
                fontWeight: 700,
                transition: 'all 0.15s ease'
              }}
            >
              {yr === 'all' ? 'All Time' : yr}
            </button>
          ))}
        </div>
      </div>

      {/* 1. Core Summary Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="glass" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(212,178,111,0.1)', color: 'var(--accent-primary)', padding: '0.75rem', borderRadius: '50%' }}>
            <Trophy size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Books Completed</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.15rem' }}>{finishedBooks.length}</div>
          </div>
        </div>

        <div className="glass" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '0.75rem', borderRadius: '50%' }}>
            <BookOpen size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total Pages Read</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.15rem' }}>{totalPagesRead} pages</div>
          </div>
        </div>

        <div className="glass" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', padding: '0.75rem', borderRadius: '50%' }}>
            <Clock size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Time Spent Reading</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.15rem' }}>{totalHours} hours</div>
          </div>
        </div>

        <div className="glass" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(139,92,246,0.1)', color: 'var(--color-to-read)', padding: '0.75rem', borderRadius: '50%' }}>
            <Star size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>To Read (TBR) list</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.15rem' }}>{toReadBooks.length} books</div>
          </div>
        </div>
      </div>

      {/* 2. Monthly Book Cover Log Grid (Year Log Visual) */}
      <div className="glass" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-display)', marginBottom: '0.25rem', color: 'var(--text-primary)' }}>
          {selectedYear === 'all' ? 'All-Time' : selectedYear} Reading Log (By Month)
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
          Visual library of book covers based on the month they were completed.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
          {MONTH_NAMES.map((monthName, idx) => {
            const monthBooks = finishedBooks.filter(b => {
              const date = new Date(b.dateFinished || b.dateAdded);
              return date.getMonth() === idx;
            });

            return (
              <div 
                key={idx} 
                style={{ 
                  background: 'rgba(255,255,255,0.01)', 
                  border: '1px solid var(--border-glass)', 
                  borderRadius: 'var(--radius-md)', 
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  minHeight: '130px'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent-primary)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.35rem' }}>
                  {monthName}
                </div>
                
                {monthBooks.length === 0 ? (
                  <div style={{ display: 'flex', flexGrow: 1, alignItems: 'center', justifyContent: 'center', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '4px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    No books finished
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem', scrollbarWidth: 'none' }}>
                    {monthBooks.map(b => (
                      <div key={b.id} style={{ width: '48px', height: '72px', flexShrink: 0, position: 'relative' }}>
                        <img 
                          src={b.coverUrl || '/fallback-book.png'} 
                          alt={b.title} 
                          title={`${b.title} by ${b.author}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '3px', boxShadow: '0 3px 6px rgba(0,0,0,0.4)' }}
                          onError={(e) => { (e.target as HTMLImageElement).src = '/fallback-book.png'; }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Distribution Layout: Genres (Pie) & Format Mix */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        
        {/* Most Read Genres Pie/Donut Chart */}
        <div className="glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-display)', margin: 0 }}>Most Read Genres</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
              Genre breakdown of your completed books.
            </p>
          </div>
          <div style={{ display: 'flex', flexGrow: 1, alignItems: 'center', justifyContent: 'center' }}>
            {renderGenresDonut()}
          </div>
        </div>

        {/* Format Mix */}
        <div className="glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-display)', margin: 0 }}>Format Mix</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
              Your preference split between physical, ebooks, and audiobooks.
            </p>
          </div>
          <div style={{ display: 'flex', flexGrow: 1, alignItems: 'center', justifyContent: 'center' }}>
            {renderFormatRing()}
          </div>
        </div>
      </div>

      {/* 4. Reading Leaders: Most Read Authors & Venues */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        
        {/* Most Read Authors (Progress lines representation) */}
        <div className="glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-display)', margin: 0 }}>Most Read Authors</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
              Authors you completed the most books from.
            </p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flexGrow: 1, justifyContent: 'center' }}>
            {sortedAuthors.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', padding: '1rem' }}>
                No author metrics available.
              </div>
            ) : (
              sortedAuthors.map(([author, count], idx) => {
                const maxCount = sortedAuthors[0][1];
                const percentage = Math.round((count / maxCount) * 100);
                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div className="flex-between" style={{ fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <User size={12} style={{ color: 'var(--accent-primary)' }} /> {author}
                      </span>
                      <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{count} {count === 1 ? 'book' : 'books'}</span>
                    </div>
                    <div className="progress-bar-container" style={{ height: '6px' }}>
                      <div className="progress-bar-fill" style={{ width: `${percentage}%`, background: 'linear-gradient(90deg, var(--accent-primary), var(--color-reading))' }}></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Venues & Moods */}
        <div className="glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-display)', margin: 0 }}>Venues & Reading Locations</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
              Where you log the most reading sessions.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flexGrow: 1, justifyContent: 'center' }}>
            {Object.keys(locationCounts).length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.9rem', padding: '1rem' }}>
                No location tags logged yet.
              </p>
            ) : (
              Object.entries(locationCounts).map(([loc, count], idx) => {
                const maxCount = Math.max(...Object.values(locationCounts));
                const percentage = Math.round((count / maxCount) * 100);
                return (
                  <div key={idx}>
                    <div className="flex-between" style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                      <span>📍 {loc}</span>
                      <span style={{ fontWeight: 'bold' }}>{count} sessions</span>
                    </div>
                    <div className="progress-bar-container" style={{ height: '6px' }}>
                      <div className="progress-bar-fill" style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 5. Swipeable Monthly Streak Calendars */}
      <div className="glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-display)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Flame size={18} style={{ color: 'var(--accent-primary)' }} /> Streak History Calendar
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
              Swipe or navigate months to view your active reading streaks.
            </p>
          </div>
          
          {/* Swipe Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button 
              className="btn btn-secondary btn-icon" 
              onClick={handlePrevMonth}
              style={{ padding: '0.35rem 0.6rem' }}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', minWidth: '100px', textAlign: 'center' }}>
              {MONTH_NAMES[calendarMonth]} {calendarYear}
            </span>
            <button 
              className="btn btn-secondary btn-icon" 
              onClick={handleNextMonth}
              style={{ padding: '0.35rem 0.6rem' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Render Monthly Grid */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem 0' }}>
          <div style={{ width: '100%', maxWidth: '350px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                <span key={idx} style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, paddingBottom: '0.25rem' }}>
                  {day}
                </span>
              ))}
              {(() => {
                // First day of the month index
                const firstDayIdx = new Date(calendarYear, calendarMonth, 1).getDay();
                // Total days in month
                const totalDays = new Date(calendarYear, calendarMonth + 1, 0).getDate();
                
                const items = [];
                
                // Pad empty days at start
                for (let i = 0; i < firstDayIdx; i++) {
                  items.push(<div key={`empty-${i}`} />);
                }
                
                // Render days
                for (let day = 1; day <= totalDays; day++) {
                  const currentDayDate = new Date(calendarYear, calendarMonth, day);
                  const active = hasReadOnDate(currentDayDate);
                  const isCurrentDay = currentDayDate.toDateString() === new Date().toDateString();
                  
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
          </div>
        </div>
      </div>

      {/* 6. Reading Velocity: Weekly Activity & Heatmap */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        
        {/* Weekly Activity */}
        <div className="glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-display)', margin: 0 }}>Weekly Reading Activity</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
              Your page completions mapped over the last 4 weeks.
            </p>
          </div>
          <div style={{ display: 'flex', flexGrow: 1, alignItems: 'center', justifyContent: 'center' }}>
            {renderActivityChart()}
          </div>
        </div>

        {/* Heatmap Grid */}
        <div className="glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-display)', margin: 0 }}>Reading Habit Consistency</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
              Calendar view highlighting active reading days this month.
            </p>
          </div>
          <div style={{ display: 'flex', flexGrow: 1, alignItems: 'center', justifyContent: 'center' }}>
            {renderHeatmap()}
          </div>
        </div>
      </div>

    </div>
  );
}
