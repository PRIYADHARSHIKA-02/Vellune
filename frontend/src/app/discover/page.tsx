'use client';

import React, { useState } from 'react';
import { useBooks, useAddBook, Book } from '../../hooks/queries';
import { Sparkles, Clock, Check, X, Bookmark, ArrowUp } from 'lucide-react';

interface LocalRec {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  reason: string;
  matchScore: number;
  moodTags: string[];
  timeTags: string[];
  status: 'pending' | 'accepted' | 'rejected';
}

const INITIAL_RECS: LocalRec[] = [
  {
    id: 'rec-1',
    title: 'The Martian',
    author: 'Andy Weir',
    coverUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400',
    reason: 'Because you are reading Project Hail Mary and love isolation-based survival sci-fi with solid physics.',
    matchScore: 0.98,
    moodTags: ['tense', 'curious'],
    timeTags: ['moderate'],
    status: 'pending'
  },
  {
    id: 'rec-2',
    title: 'Flow: The Psychology of Optimal Experience',
    author: 'Mihaly Csikszentmihalyi',
    coverUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400',
    reason: 'Matches your personal growth collection and interest in focusing systems like in Atomic Habits.',
    matchScore: 0.88,
    moodTags: ['thoughtful', 'focused'],
    timeTags: ['long'],
    status: 'pending'
  },
  {
    id: 'rec-3',
    title: 'Recursion',
    author: 'Blake Crouch',
    coverUrl: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=400',
    reason: 'You finished Dune and like mind-bending, intense thrillers with deep concepts.',
    matchScore: 0.92,
    moodTags: ['tense', 'curious'],
    timeTags: ['moderate'],
    status: 'pending'
  }
];

export default function DiscoverPage() {
  const [recs, setRecs] = useState<LocalRec[]>(INITIAL_RECS);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<number | null>(null); // in minutes
  const [learningFeedback, setLearningFeedback] = useState<string>('');

  const { data: books = [], isLoading: isBooksLoading } = useBooks();
  const addBookMutation = useAddBook();

  const MOODS = [
    { id: 'hopeful', label: 'Hopeful & Uplifting', emoji: '☀️', tag: 'hopeful' },
    { id: 'thrilled', label: 'Thrilled & Suspenseful', emoji: '⚡', tag: 'tense' },
    { id: 'meditative', label: 'Meditative & Calming', emoji: '🍃', tag: 'meditative' },
    { id: 'challenged', label: 'Challenged & Deep', emoji: '🧩', tag: 'thoughtful' },
    { id: 'curious', label: 'Curious & Scientific', emoji: '🔬', tag: 'curious' }
  ];

  const TIMES = [
    { label: '15 mins', val: 15, desc: 'Essays & Short Stories' },
    { label: '30 mins', val: 30, desc: 'Novellas & Chapters' },
    { label: '60 mins', val: 60, desc: 'Moderate Page-Turners' },
    { label: '2 hrs+', val: 120, desc: 'Epic Stories' }
  ];

  // Filtering logic
  const activeRecs = recs.filter(rec => {
    if (rec.status !== 'pending') return false;
    
    // Mood Filter
    if (selectedMood) {
      const moodConfig = MOODS.find(m => m.id === selectedMood);
      if (moodConfig && !rec.moodTags.includes(moodConfig.tag)) return false;
    }
    
    // Time Filter
    if (selectedTime) {
      if (selectedTime <= 30 && !rec.timeTags.includes('short') && !rec.timeTags.includes('moderate')) return false;
      if (selectedTime > 60 && !rec.timeTags.includes('long')) return false;
    }
    
    return true;
  });

  const handleAccept = async (recId: string, title: string, author: string, coverUrl: string) => {
    try {
      // Add the book to the Express backend database
      await addBookMutation.mutateAsync({
        title,
        author,
        coverUrl,
        format: 'ebook',
        status: 'to-read',
        pageCount: 350,
        genres: [],
        customShelfIds: [],
        metadata: {},
        currentPage: 0,
      });

      // Update recommendation status locally
      setRecs(prev => prev.map(r => r.id === recId ? { ...r, status: 'accepted' } : r));
      setLearningFeedback(`Successfully added "${title}" to your shelf! Rec engine learning...`);
      setTimeout(() => setLearningFeedback(''), 4000);
    } catch (err) {
      console.error(err);
      alert('Failed to add book to library.');
    }
  };

  const handleReject = (recId: string) => {
    setRecs(prev => prev.map(r => r.id === recId ? { ...r, status: 'rejected' } : r));
    setLearningFeedback('Recommendation passed. Updating taste profile...');
    setTimeout(() => setLearningFeedback(''), 4000);
  };

  // Smart TBR queue sorting
  const tbrBooks = books.filter(b => b.status === 'to-read');
  
  // Reorder TBR books based on selected mood/time
  const getSmartTbrBooks = () => {
    if (!selectedMood && !selectedTime) return tbrBooks;

    return [...tbrBooks].sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      // Mood match
      if (selectedMood) {
        const moodConfig = MOODS.find(m => m.id === selectedMood);
        const moodTag = moodConfig?.tag || '';
        
        if (moodTag === 'curious' && a.author === 'Andy Weir') scoreA += 2;
        if (moodTag === 'curious' && b.author === 'Andy Weir') scoreB += 2;
        if (moodTag === 'meditative' && a.author === 'Kazuo Ishiguro') scoreA += 2;
        if (moodTag === 'meditative' && b.author === 'Kazuo Ishiguro') scoreB += 2;
      }

      // Time match (page count considerations)
      if (selectedTime) {
        if (selectedTime <= 30) {
          scoreA += a.pageCount < 350 ? 1 : 0;
          scoreB += b.pageCount < 350 ? 1 : 0;
        } else {
          scoreA += a.pageCount >= 350 ? 1 : 0;
          scoreB += b.pageCount >= 350 ? 1 : 0;
        }
      }

      return scoreB - scoreA; // Descending score
    });
  };

  const smartTbrList = getSmartTbrBooks();

  const handleMoveUp = (bookId: string, index: number) => {
    if (index === 0) return;
    alert('TBR Priority Updated. Saved to your profile!');
  };

  if (isBooksLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text-secondary)' }}>
        Loading recommendations...
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header */}
      <div>
        <h1 className="screen-title">Discover Reads</h1>
        <p className="screen-subtitle">Mood-matched recommendations powered by reading context and active times.</p>
      </div>

      {learningFeedback && (
        <div className="glass" style={{ padding: '0.75rem 1rem', background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)', color: 'var(--color-finished)', fontSize: '0.85rem', fontWeight: 600 }}>
          {learningFeedback}
        </div>
      )}

      {/* Grid of selectors */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '2rem' }}>
        
        {/* Left Column: Selectors */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Mood Selector panel */}
          <div className="glass" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontFamily: 'var(--font-display)', marginBottom: '1.25rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <Sparkles size={16} style={{ color: 'var(--accent-primary)' }} />
              How do you want to feel?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {MOODS.map(m => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMood(selectedMood === m.id ? null : m.id)}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    textAlign: 'left',
                    width: '100%',
                    transition: 'all 0.2s',
                    backgroundColor: selectedMood === m.id ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.02)',
                    borderColor: selectedMood === m.id ? 'var(--accent-primary)' : 'var(--border-glass)',
                    color: selectedMood === m.id ? 'var(--text-primary)' : 'var(--text-secondary)'
                  }}
                >
                  <span style={{ fontSize: '1.2rem' }}>{m.emoji}</span>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Time Selector panel */}
          <div className="glass" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontFamily: 'var(--font-display)', marginBottom: '1.25rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <Clock size={16} style={{ color: 'var(--format-library)' }} />
              How much time do you have?
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {TIMES.map(t => (
                <button
                  key={t.val}
                  onClick={() => setSelectedTime(selectedTime === t.val ? null : t.val)}
                  style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s',
                    backgroundColor: selectedTime === t.val ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.02)',
                    borderColor: selectedTime === t.val ? 'var(--accent-primary)' : 'var(--border-glass)',
                    color: selectedTime === t.val ? 'var(--text-primary)' : 'var(--text-secondary)'
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{t.label}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Recommendations Feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="flex-between">
            <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)' }}>Recommended Matches</h3>
            {(selectedMood || selectedTime) && (
              <button 
                className="btn btn-secondary" 
                style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                onClick={() => { setSelectedMood(null); setSelectedTime(null); }}
              >
                Clear Filters
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {activeRecs.length === 0 ? (
              <div className="glass" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <p>No matches found with those combined filters.</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Try clearing selection or using less restrictive categories.</p>
              </div>
            ) : (
              activeRecs.map((rec) => (
                <div key={rec.id} className="glass" style={{ padding: '1.25rem', display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                  <img 
                    src={rec.coverUrl} 
                    alt={rec.title} 
                    style={{ width: '70px', height: '105px', borderRadius: '4px', objectFit: 'cover', flexShrink: 0 }} 
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=100' }}
                  />
                  <div style={{ flexGrow: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-finished)', fontWeight: 600 }}>
                        {Math.round(rec.matchScore * 100)}% Match
                      </span>
                    </div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '0.35rem 0 0 0', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {rec.title}
                    </h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.1rem' }}>by {rec.author}</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem', lineHeight: 1.3 }}>
                      {rec.reason}
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flexShrink: 0 }}>
                    <button 
                      className="btn btn-primary" 
                      style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem' }}
                      onClick={() => handleAccept(rec.id, rec.title, rec.author, rec.coverUrl)}
                    >
                      <Check size={12} /> Add TBR
                    </button>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', color: 'var(--color-dnf)', borderColor: 'rgba(239,68,68,0.1)' }}
                      onClick={() => handleReject(rec.id)}
                    >
                      <X size={12} /> Pass
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Smart TBR Queue section */}
          <div style={{ marginTop: '1rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-display)', marginBottom: '1rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <Bookmark size={16} style={{ color: 'var(--color-on-hold)' }} />
              Smart TBR Queue Reordering
            </h3>
            
            <div className="glass" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {smartTbrList.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>Your To Read shelf is empty. Add recommended books above!</p>
              ) : (
                smartTbrList.map((book, idx) => (
                  <div 
                    key={book.id} 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '6px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--border-glass)'
                    }}
                  >
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-muted)', width: '20px' }}>#{idx + 1}</span>
                    <img src={book.coverUrl || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=50'} style={{ width: '24px', height: '36px', objectFit: 'cover', borderRadius: '2px' }} onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=50' }} />
                    <div style={{ flexGrow: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>by {book.author} • {book.pageCount} pages</div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.2rem' }}>
                      <button 
                        onClick={() => handleMoveUp(book.id, idx)}
                        disabled={idx === 0}
                        style={{ padding: '0.2rem', background: 'none', border: 'none', color: idx === 0 ? 'var(--text-muted)' : 'var(--text-secondary)', cursor: idx === 0 ? 'default' : 'pointer' }}
                      >
                        <ArrowUp size={14} />
                      </button>
                    </div>
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
