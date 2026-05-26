'use client';

import React, { useState } from 'react';
import { useBooks, useSessions, useNotes } from '../../hooks/queries';
import { BarChart, PieChart, TrendingUp, Calendar, Clock, Landmark, Activity, Compass, Loader2 } from 'lucide-react';

export default function StatsPage() {
  const { data: books = [], isLoading: isBooksLoading } = useBooks();
  const { data: sessions = [], isLoading: isSessionsLoading } = useSessions();
  const { data: notes = [], isLoading: isNotesLoading } = useNotes();

  const [activeSubTab, setActiveSubTab] = useState<'activity' | 'formats' | 'themes' | 'growth' | 'time'>('activity');

  const isLoading = isBooksLoading || isSessionsLoading || isNotesLoading;

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text-secondary)' }}>
        <Loader2 className="animate-spin" style={{ marginRight: '0.5rem' }} /> Loading statistics...
      </div>
    );
  }

  // Stats Calculations
  const finishedBooks = books.filter(b => b.status === 'finished');
  const dnfBooks = books.filter(b => b.status === 'dnf');
  const currentlyReading = books.filter(b => b.status === 'reading');
  
  const totalPagesRead = sessions.reduce((acc, s) => acc + s.pagesRead, 0);
  const totalHours = Math.round(sessions.reduce((acc, s) => acc + s.durationMinutes, 0) / 60);

  // 1. Format Breakdown
  const formatCounts = books.reduce((acc, book) => {
    if (book.format in acc) {
      acc[book.format] = (acc[book.format] || 0) + 1;
    }
    return acc;
  }, { physical: 0, ebook: 0, audiobook: 0, library: 0 } as Record<'physical' | 'ebook' | 'audiobook' | 'library', number>);

  const totalFormatBooks = books.length || 1;
  const formatPercentages = {
    physical: Math.round((formatCounts.physical / totalFormatBooks) * 100),
    ebook: Math.round((formatCounts.ebook / totalFormatBooks) * 100),
    audiobook: Math.round((formatCounts.audiobook / totalFormatBooks) * 100),
    library: Math.round((formatCounts.library / totalFormatBooks) * 100)
  };

  // 2. Context Breakdown (Locations)
  const locationCounts = sessions.reduce((acc, s) => {
    if (s.location) {
      acc[s.location] = (acc[s.location] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // 3. Weekly Pages Data (Mocking past 4 weeks + current week pages synced)
  const weeklyPages = [340, 210, 480, (totalPagesRead % 500) || 120];

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

  // SVG Ring Chart: Format Distribution
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

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
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
          <text x={cx} y={cy + 5} textAnchor="middle" fill="var(--text-primary)" fontSize="12" fontWeight="bold" fontFamily="var(--font-display)">
            {books.length} Books
          </text>
        </svg>

        {/* Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {segments.map((seg, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: seg.color }}></span>
              <span style={{ fontWeight: 600 }}>{seg.value}%</span>
              <span style={{ color: 'var(--text-secondary)' }}>{seg.label}</span>
            </div>
          ))}
        </div>
      </div>
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

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header */}
      <div>
        <h1 className="screen-title">Reading Insights</h1>
        <p className="screen-subtitle">Visualize your reading dimensions, format preferences, and goal progress.</p>
      </div>

      {/* Stats Navigation Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-glass)', gap: '1.5rem', paddingBottom: '0.1rem', overflowX: 'auto' }}>
        {[
          { id: 'activity', label: 'Activity Overview', icon: Activity },
          { id: 'formats', label: 'Format Mix', icon: PieChart },
          { id: 'themes', label: 'Contexts & Venues', icon: Compass },
          { id: 'growth', label: 'Personal Growth', icon: TrendingUp },
          { id: 'time', label: 'Time Heatmap', icon: Calendar }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`btn-text ${activeSubTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveSubTab(tab.id as any)}
              style={{
                borderBottom: activeSubTab === tab.id ? '2px solid var(--accent-primary)' : 'none',
                borderRadius: 0,
                padding: '0.75rem 0.5rem',
                fontWeight: 600,
                display: 'flex',
                gap: '0.4rem',
                alignItems: 'center',
                whiteSpace: 'nowrap'
              }}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Dynamic Sub-tab Panel Contents */}
      <div className="glass" style={{ padding: '2rem' }}>
        
        {/* Activity Tab */}
        {activeSubTab === 'activity' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '3rem', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', marginBottom: '1rem' }}>Weekly Reading Activity</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                Your page completions mapped over the last 4 weeks. Keep logging sessions regularly to build steady progress!
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total Pages</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--accent-primary)' }}>{totalPagesRead} pages</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Time Spent</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--text-primary)' }}>{totalHours} hours</div>
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              {renderActivityChart()}
            </div>
          </div>
        )}

        {/* Format Mix Tab */}
        {activeSubTab === 'formats' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '3rem', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', marginBottom: '1rem' }}>Format Distribution</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                Your library format breakdown. Set format tags on your books to see your physical vs digital reading split.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div className="flex-between" style={{ fontSize: '0.85rem' }}>
                  <span>Ebooks ({formatCounts.ebook} books)</span>
                  <span style={{ color: 'var(--format-ebook)', fontWeight: 'bold' }}>{formatPercentages.ebook}%</span>
                </div>
                <div className="flex-between" style={{ fontSize: '0.85rem' }}>
                  <span>Physical ({formatCounts.physical} books)</span>
                  <span style={{ color: 'var(--format-physical)', fontWeight: 'bold' }}>{formatPercentages.physical}%</span>
                </div>
                <div className="flex-between" style={{ fontSize: '0.85rem' }}>
                  <span>Audiobooks ({formatCounts.audiobook} books)</span>
                  <span style={{ color: 'var(--format-audiobook)', fontWeight: 'bold' }}>{formatPercentages.audiobook}%</span>
                </div>
                <div className="flex-between" style={{ fontSize: '0.85rem' }}>
                  <span>Library Loans ({formatCounts.library} books)</span>
                  <span style={{ color: 'var(--format-library)', fontWeight: 'bold' }}>{formatPercentages.library}%</span>
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              {renderFormatRing()}
            </div>
          </div>
        )}

        {/* Contexts Tab */}
        {activeSubTab === 'themes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>Reading Venues & Moods</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Where you run the most reading sessions. Record locations when stopping timers to sync!
              </p>
            </div>

            {/* horizontal bars for locations */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '500px' }}>
              {Object.keys(locationCounts).length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No location tags captured yet. Log your next session to record them.</p>
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
                      <div className="progress-bar-container" style={{ height: '8px' }}>
                        <div className="progress-bar-fill" style={{ width: `${percentage}%` }}></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Growth Tab */}
        {activeSubTab === 'growth' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', marginBottom: '1rem' }}>Personal Reading Growth</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Progress towards annual metrics and notes collection density.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="flex-between" style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: '6px' }}>
                  <span>Completed Books</span>
                  <span style={{ fontWeight: 'bold' }}>{finishedBooks.length}</span>
                </div>
                <div className="flex-between" style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: '6px' }}>
                  <span>DNF Rate (Did Not Finish)</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--color-dnf)' }}>
                    {books.length > 0 ? Math.round((dnfBooks.length / books.length) * 100) : 0}%
                  </span>
                </div>
                <div className="flex-between" style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: '6px' }}>
                  <span>Captured Notes & Quotes</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>{notes.length}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
              <div 
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  border: '8px solid var(--border-glass)',
                  borderTopColor: 'var(--color-finished)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  transform: 'rotate(45deg)'
                }}
              >
                <div style={{ transform: 'rotate(-45deg)' }}>
                  {Math.round((finishedBooks.length / 12) * 100)}%
                </div>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Yearly Goal Completion</span>
            </div>
          </div>
        )}

        {/* Time Heatmap Tab */}
        {activeSubTab === 'time' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '3rem', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', marginBottom: '1rem' }}>Reading Consistency Density</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                Your session calendar highlighting daily active reading periods. Building strong habit patterns!
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Active Days</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--accent-primary)' }}>
                    {new Set(sessions.map(s => new Date(s.startTime).getDate())).size} days
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total Sessions</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--text-primary)' }}>{sessions.length}</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              {renderHeatmap()}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
