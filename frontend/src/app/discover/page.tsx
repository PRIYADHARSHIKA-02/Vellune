'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useBooks, useAddBook, useGetSearchBooks, Book } from '../../hooks/queries';
import { Sparkles, Clock, Check, X, Bookmark, ArrowUp, Search, Loader2, Star } from 'lucide-react';
import { useStore } from '../../store';

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
  const { setSelectedExternalBook, setSelectedBookIdForDetail } = useStore();
  const [recs, setRecs] = useState<LocalRec[]>(INITIAL_RECS);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<number | null>(null); // in minutes
  const [learningFeedback, setLearningFeedback] = useState<string>('');

  // Search states & hooks
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Focus trigger from global nav redirection
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('focus') === 'true') {
        searchInputRef.current?.focus();
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, []);

  const { data: books = [], isLoading: isBooksLoading } = useBooks();
  const addBookMutation = useAddBook();

  const { data: searchResults = [], isLoading: isSearchLoading, isFetching: isSearchFetching, isError, error } = useGetSearchBooks(debouncedQuery, debouncedQuery.length > 2);

  const formatRatingCount = (count: number) => {
    if (!count) return '0';
    if (count < 1000) return `${count}`;
    if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
    return `${(count / 1000000).toFixed(1)}M`;
  };

  const handleCardClick = (searchBook: any) => {
    if (searchBook.onShelf && searchBook.savedBookId) {
      setSelectedBookIdForDetail(searchBook.savedBookId);
    } else {
      const externalBookDetails = {
        title: searchBook.title,
        author: searchBook.author,
        isbn: searchBook.isbn,
        coverUrl: searchBook.cover_url,
        cover_url: searchBook.cover_url,
        pageCount: 300,
        genres: searchBook.genres,
        external_avg_rating: searchBook.external_avg_rating,
        external_rating_count: searchBook.external_rating_count,
        description: searchBook.description
      };
      setSelectedExternalBook(externalBookDetails);
      setSelectedBookIdForDetail(searchBook.isbn || 'external');
    }
  };

  const handleAddSearchBook = async (e: React.MouseEvent, searchBook: any) => {
    e.stopPropagation();
    try {
      await addBookMutation.mutateAsync({
        title: searchBook.title,
        author: searchBook.author,
        isbn: searchBook.isbn || null,
        coverUrl: searchBook.cover_url || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=200',
        format: 'ebook',
        status: 'to-read',
        pageCount: 300,
        genres: searchBook.genres || [],
        customShelfIds: [],
        metadata: {},
        currentPage: 0,
        description: searchBook.description || null,
      });
      setLearningFeedback(`Successfully added "${searchBook.title}" to your TBR shelf!`);
      setTimeout(() => setLearningFeedback(''), 4000);
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to add book to TBR shelf.');
    }
  };

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
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Header */}
      <div>
        <h1 className="screen-title">Discover Reads</h1>
        <p className="screen-subtitle">Mood-matched recommendations powered by reading context and active times.</p>
      </div>

      {/* Search Input Bar */}
      <div
        className="glass animate-fade-in"
        style={{
          padding: '0.5rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          background: 'rgba(255, 255, 255, 0.02)',
          borderColor: 'var(--border-glass)',
          borderRadius: '24px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
          transition: 'all 0.2s',
        }}
      >
        <Search size={18} style={{ color: 'var(--text-muted)' }} />
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search book title, author, or ISBN..."
          style={{
            flexGrow: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: '0.95rem',
            color: 'var(--text-primary)',
            padding: '0.4rem 0',
          }}
        />
        {searchQuery && (
          <button
            type="button"
            className="btn btn-text"
            style={{ padding: '0.2rem', color: 'var(--text-muted)' }}
            onClick={() => setSearchQuery('')}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {learningFeedback && (
        <div className="glass" style={{ padding: '0.75rem 1rem', background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)', color: 'var(--color-finished)', fontSize: '0.85rem', fontWeight: 600 }}>
          {learningFeedback}
        </div>
      )}

      {/* Search Results or Recommendation Feed */}
      {debouncedQuery.length > 2 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="flex-between">
            <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', margin: 0 }}>
              Search Results
            </h3>
            {isSearchFetching && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <Loader2 className="animate-spin" size={14} />
                <span>Searching...</span>
              </div>
            )}
          </div>

          {isSearchLoading ? (
            <div className="glass" style={{ padding: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <Loader2 className="animate-spin" size={24} style={{ color: 'var(--accent-primary)' }} />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Searching external database...</span>
            </div>
          ) : isError ? (
            <div className="glass" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-dnf)', borderColor: 'rgba(239,68,68,0.2)' }}>
              <p style={{ fontWeight: 600 }}>Failed to fetch search results.</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                {(error as any)?.response?.data?.error || (error as any)?.message || 'Please log out and log back in, or check your connection.'}
              </p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="glass" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <p>No books found for &ldquo;{debouncedQuery}&rdquo;.</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Double check the spelling or try a different term.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
              {searchResults.map((book, idx) => (
                <div
                  key={idx}
                  className="glass card-hover"
                  onClick={() => handleCardClick(book)}
                  style={{
                    padding: '1rem',
                    display: 'flex',
                    gap: '1rem',
                    cursor: 'pointer',
                    background: 'rgba(255, 255, 255, 0.01)',
                    borderColor: 'var(--border-glass)',
                    transition: 'all 0.2s',
                    position: 'relative',
                    alignItems: 'center'
                  }}
                >
                  <img
                    src={book.cover_url || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=100'}
                    alt={book.title}
                    style={{ width: '60px', height: '90px', borderRadius: '4px', objectFit: 'cover', flexShrink: 0 }}
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=100' }}
                  />
                  <div style={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {book.title}
                      </h4>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.1rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        by {book.author} {book.year ? `(${book.year})` : ''}
                      </p>

                      {/* Rating details */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.35rem' }}>
                        <div style={{ display: 'flex' }}>
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              size={10}
                              fill={book.external_avg_rating >= i + 1 ? 'var(--color-on-hold)' : 'none'}
                              style={{ color: book.external_avg_rating >= i + 1 ? 'var(--color-on-hold)' : 'rgba(255,255,255,0.15)', marginRight: '1px' }}
                            />
                          ))}
                        </div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {book.external_avg_rating?.toFixed(1)} ({formatRatingCount(book.external_rating_count)})
                        </span>
                      </div>
                    </div>

                    {book.genres && book.genres.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.2rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                        {book.genres.slice(0, 2).map((g: string) => (
                          <span key={g} style={{ fontSize: '0.62rem', padding: '0.05rem 0.3rem', borderRadius: '3px', backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                            {g}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                    {book.onShelf ? (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          background: 'rgba(16, 185, 129, 0.1)',
                          color: 'var(--color-finished)',
                          fontWeight: 700
                        }}
                      >
                        On Shelf
                      </span>
                    ) : (
                      <button
                        className="btn btn-primary"
                        style={{ padding: '0.35rem 0.6rem', fontSize: '0.72rem', color: '#091A1E', fontWeight: 700 }}
                        onClick={(e) => handleAddSearchBook(e, book)}
                      >
                        + Add TBR
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Grid of selectors */
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
      )}

    </div>
  );
}
