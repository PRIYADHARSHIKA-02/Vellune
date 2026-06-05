'use client';

import React, { useState } from 'react';
import { useBooks, useNotes, useUpdateNote, Note } from '../../hooks/queries';
import { useStore } from '../../store';
import { Search, Quote, FileText, Star, Sparkles, Brain, Check, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

interface LeitnerCardState {
  box: number;
  nextReview: number;
}

export default function RememberPage() {
  const { user } = useStore();
  const { data: books = [], isLoading: isBooksLoading } = useBooks();
  const { data: notes = [], isLoading: isNotesLoading } = useNotes();
  const updateNoteMutation = useUpdateNote();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBookFilter, setSelectedBookFilter] = useState('all');
  const [selectedTagFilter, setSelectedTagFilter] = useState('all');

  const [activeSubTab, setActiveSubTab] = useState<'all' | 'recall'>('all');
  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);

  // Spaced Repetition Box timings (in days)
  const BOX_TIMINGS = [1, 2, 4, 7, 14];

  // Helper to load Leitner schedules
  const getLeitnerData = (): Record<string, LeitnerCardState> => {
    if (typeof window === 'undefined') return {};
    const data = localStorage.getItem(`vellune_leitner_${user?.id || 'default'}`);
    return data ? JSON.parse(data) : {};
  };

  const saveLeitnerData = (data: Record<string, LeitnerCardState>) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`vellune_leitner_${user?.id || 'default'}`, JSON.stringify(data));
  };

  const leitnerData = getLeitnerData();
  const now = Date.now();

  const dueNotes = notes.filter(note => {
    // Only review notes and quotes
    if (note.type !== 'note' && note.type !== 'quote') return false;

    const cardState = leitnerData[note.id];
    if (!cardState) return true; // Due immediately if new
    return cardState.nextReview <= now;
  });

  const handleReviewCard = (noteId: string, remembered: boolean) => {
    const data = getLeitnerData();
    const currentState = data[noteId] || { box: 1, nextReview: 0 };

    let newBox = currentState.box;
    if (remembered) {
      newBox = Math.min(5, currentState.box + 1);
    } else {
      newBox = 1; // Reset to Box 1
    }

    const intervalDays = BOX_TIMINGS[newBox - 1];
    const nextReviewTimestamp = Date.now() + intervalDays * 24 * 60 * 60 * 1000;

    data[noteId] = {
      box: newBox,
      nextReview: nextReviewTimestamp,
    };

    saveLeitnerData(data);
    setIsRevealed(false);

    // If we finished the last card, reset index or handle it
    if (currentCardIdx >= dueNotes.length - 1) {
      setCurrentCardIdx(0);
    }
  };

  const handleResetLeitner = () => {
    if (confirm('Reset all memory review schedules? This will return all cards to Box 1.')) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`vellune_leitner_${user?.id || 'default'}`);
        setCurrentCardIdx(0);
        setIsRevealed(false);
        // Force state refresh
        window.location.reload();
      }
    }
  };

  // Collect all unique tags for filter
  const allTags = Array.from(new Set(
    notes.flatMap(n => n.tags || [])
  ));

  // Filter notes for All Notes tab
  const filteredNotes = notes.filter(note => {
    // Search
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchesContent = note.content.toLowerCase().includes(q);
      const matchesTag = note.tags?.some(t => t.includes(q));
      if (!matchesContent && !matchesTag) return false;
    }
    // Book
    if (selectedBookFilter !== 'all' && note.bookId !== selectedBookFilter) return false;
    // Tag
    if (selectedTagFilter !== 'all' && !note.tags?.includes(selectedTagFilter)) return false;
    
    return true;
  });

  // Memory Prompt quote
  const getMemoryQuote = () => {
    const quotes = notes.filter(n => n.type === 'quote');
    if (quotes.length === 0) return null;
    return quotes[0];
  };

  const memoryQuote = getMemoryQuote();
  const memoryBook = memoryQuote ? books.find(b => b.id === memoryQuote.bookId) : null;

  // Markdown exporter
  const handleExportMarkdown = () => {
    if (notes.length === 0) {
      alert('You have no notes to export yet.');
      return;
    }

    const titleHeader = `# Vellune Reading Notes Export\nGenerated on ${new Date().toDateString()}\n\n`;
    const body = notes.map(n => {
      const book = books.find(b => b.id === n.bookId);
      const bookTitle = book ? book.title : 'Unknown Book';
      const bookAuthor = book ? book.author : 'Unknown Author';
      const typeLabel = n.type.toUpperCase();
      const pageLabel = n.pageNumber ? `Page ${n.pageNumber}` : 'N/A';
      const tagsList = n.tags && n.tags.length > 0 ? `Tags: ${n.tags.map(t => `#${t}`).join(' ')}` : '';

      return `## ${bookTitle} (${bookAuthor})\n**[${typeLabel} • ${pageLabel}]**\n\n> ${n.content}\n\n${tagsList}\n*Created: ${format(new Date(n.createdAt), 'MMMM dd, yyyy - h:mm a')}*\n\n---\n`;
    }).join('\n');

    const fullMarkdown = titleHeader + body;
    
    const blob = new Blob([fullMarkdown], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `vellune-reading-notes-${new Date().toISOString().substring(0,10)}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleFavorite = (noteId: string, currentFav: boolean) => {
    updateNoteMutation.mutate({ id: noteId, updates: { isFavorite: !currentFav } });
  };

  const isLoading = isBooksLoading || isNotesLoading;

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text-secondary)' }}>
        Loading notes timeline...
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header */}
      <div className="flex-between">
        <div>
          <h1 className="screen-title">Personal Memory</h1>
          <p className="screen-subtitle">Search notes, review old quotes, and export your reading collections.</p>
        </div>
        <button className="btn btn-secondary" onClick={handleExportMarkdown} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <FileText size={16} /> Export Markdown
        </button>
      </div>

      {/* Sub Tabs */}
      <div style={{ display: 'flex', gap: '1.5rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.25rem' }}>
        <button 
          className={`btn-text ${activeSubTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('all')}
          style={{ borderBottom: activeSubTab === 'all' ? '2px solid var(--accent-primary)' : 'none', borderRadius: 0, padding: '0.5rem 0', fontWeight: 600 }}
        >
          All Notes & Quotes
        </button>
        <button 
          className={`btn-text ${activeSubTab === 'recall' ? 'active' : ''}`}
          onClick={() => {
            setActiveSubTab('recall');
            setCurrentCardIdx(0);
            setIsRevealed(false);
          }}
          style={{ borderBottom: activeSubTab === 'recall' ? '2px solid var(--accent-primary)' : 'none', borderRadius: 0, padding: '0.5rem 0', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}
        >
          <Brain size={14} /> Leitner Recall Review ({dueNotes.length})
        </button>
      </div>

      {/* ALL NOTES TAB */}
      {activeSubTab === 'all' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.0rem' }}>
          {/* Memory Aid / Refresher */}
          {memoryQuote && memoryBook && (
            <div className="glass" style={{ padding: '1.5rem', background: 'rgba(99, 102, 241, 0.03)', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                <Sparkles size={14} />
                Memory Spark: What you captured in finished books
              </div>
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                <Quote size={28} style={{ color: 'var(--accent-primary)', opacity: 0.5, flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: '1.05rem', fontStyle: 'italic', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                    &ldquo;{memoryQuote.content}&rdquo;
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.75rem', fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: 700 }}>{memoryBook.title}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>by {memoryBook.author}</span>
                    <span style={{ color: 'var(--text-muted)' }}>• Page {memoryQuote.pageNumber}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Content Layout */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Filters Panel */}
            <div className="glass" style={{ padding: '1rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
              {/* Global search */}
              <div style={{ position: 'relative', flexGrow: 1, minWidth: '220px' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '2.25rem' }}
                  placeholder="Search quotes, reflections, or tags..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Book filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Book:</span>
                <select
                  className="form-select"
                  style={{ width: '180px', padding: '0.4rem 0.75rem' }}
                  value={selectedBookFilter}
                  onChange={e => setSelectedBookFilter(e.target.value)}
                >
                  <option value="all">All Books</option>
                  {books.map(b => (
                    <option key={b.id} value={b.id}>{b.title}</option>
                  ))}
                </select>
              </div>

              {/* Tag filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Tag:</span>
                <select
                  className="form-select"
                  style={{ width: '150px', padding: '0.4rem 0.75rem' }}
                  value={selectedTagFilter}
                  onChange={e => setSelectedTagFilter(e.target.value)}
                >
                  <option value="all">All Tags</option>
                  {allTags.map(t => (
                    <option key={t} value={t}>#{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Timeline Notes view */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filteredNotes.length === 0 ? (
                <div className="glass" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No notes found. Keep capturing quotes during reading sessions!
                </div>
              ) : (
                filteredNotes.map((note) => {
                  const book = books.find(b => b.id === note.bookId);
                  return (
                    <div 
                      key={note.id} 
                      className="glass animate-fade-in" 
                      style={{
                        padding: '1.25rem',
                        borderLeft: note.type === 'quote' ? '4px solid var(--accent-primary)' : '1px solid var(--border-glass)'
                      }}
                    >
                      <div className="flex-between" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                        <span style={{ textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          {note.type} {note.pageNumber && `• Page ${note.pageNumber}`}
                        </span>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span>{format(new Date(note.createdAt), 'MMMM dd, yyyy')}</span>
                          
                          <button
                            onClick={() => toggleFavorite(note.id, note.isFavorite)}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: note.isFavorite ? 'var(--color-on-hold)' : 'var(--text-muted)' }}
                          >
                            <Star size={14} fill={note.isFavorite ? 'currentColor' : 'none'} />
                          </button>
                        </div>
                      </div>

                      {/* Render content: If HTML (rich text), display HTML, otherwise regular text */}
                      {note.content.includes('<p>') || note.content.includes('<strong>') || note.content.includes('<em>') ? (
                        <div 
                          style={{ fontSize: '0.95rem', lineHeight: 1.5, color: 'var(--text-secondary)' }}
                          dangerouslySetInnerHTML={{ __html: note.content }} 
                        />
                      ) : (
                        <p style={{
                          fontSize: '0.95rem',
                          fontStyle: note.type === 'quote' ? 'italic' : 'normal',
                          lineHeight: 1.5,
                          color: note.type === 'quote' ? 'var(--text-primary)' : 'var(--text-secondary)',
                          marginTop: '0.25rem'
                        }}>
                          {note.type === 'quote' ? `"${note.content}"` : note.content}
                        </p>
                      )}

                      <div className="flex-between" style={{ marginTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '0.5rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {book ? book.title : 'Deleted Book'}
                        </span>

                        {note.tags && note.tags.length > 0 && (
                          <div style={{ display: 'flex', gap: '0.3rem' }}>
                            {note.tags.map(tag => (
                              <span key={tag} style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)' }}>
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* RECALL TAB */}
      {activeSubTab === 'recall' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Stats Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
            {[1, 2, 3, 4, 5].map(boxNum => {
              const count = notes.filter(n => (leitnerData[n.id]?.box || 1) === boxNum).length;
              return (
                <div key={boxNum} className="glass" style={{ padding: '0.75rem 0.5rem', background: 'rgba(255,255,255,0.01)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Box {boxNum}</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-primary)', marginTop: '0.2rem' }}>{count}</div>
                  <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>
                    {boxNum === 1 ? '1 day' : boxNum === 2 ? '2 days' : boxNum === 3 ? '4 days' : boxNum === 4 ? '7 days' : '14 days'}
                  </div>
                </div>
              );
            })}
          </div>

          {dueNotes.length === 0 ? (
            <div className="glass" style={{ padding: '4rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', borderColor: 'rgba(16, 185, 129, 0.25)' }}>
              <span style={{ fontSize: '3rem' }}>🎉</span>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>All caught up!</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.35rem', maxWidth: '400px', marginInline: 'auto' }}>
                  You have reviewed all due cards for today. Keep reading and adding notes/quotes to build your spaced repetition collection.
                </p>
              </div>
              <button className="btn btn-secondary" onClick={handleResetLeitner} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', padding: '0.4rem 0.8rem', fontSize: '0.72rem', marginTop: '0.5rem' }}>
                <RefreshCw size={12} /> Reset All Schedules
              </button>
            </div>
          ) : (
            <div>
              {/* Card Container */}
              {(() => {
                const currentCard = dueNotes[currentCardIdx];
                if (!currentCard) return null;
                const book = books.find(b => b.id === currentCard.bookId);
                const currentBox = leitnerData[currentCard.id]?.box || 1;

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '500px', marginInline: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <span>Card {currentCardIdx + 1} of {dueNotes.length} due</span>
                      <span className="status-pill" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)', fontSize: '0.7rem' }}>
                        Box {currentBox} Review
                      </span>
                    </div>

                    {/* Leitner Card UI */}
                    <div 
                      className="glass" 
                      style={{ 
                        padding: '2.5rem 2rem', 
                        minHeight: '260px', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        textAlign: 'center',
                        border: '1px solid var(--border-glass-focus)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      {/* Book header */}
                      <div style={{ position: 'absolute', top: '1rem', left: '1rem', right: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <span style={{ fontWeight: 700, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '280px' }}>
                          📖 {book ? book.title : 'Unknown Book'}
                        </span>
                        <span style={{ flexShrink: 0 }}>
                          {currentCard.pageNumber ? `p. ${currentCard.pageNumber}` : 'Takeaway'}
                        </span>
                      </div>

                      {!isRevealed ? (
                        /* FRONT OF CARD */
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
                          <Brain size={48} className="animate-pulse-soft" style={{ color: 'var(--accent-primary)', opacity: 0.8 }} />
                          <div>
                            <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>Recall this capture</div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '0.25rem', maxWidth: '300px' }}>
                              Try to recall the contents or concept of this saved {currentCard.type}.
                            </p>
                          </div>
                          <button 
                            className="btn btn-primary" 
                            onClick={() => setIsRevealed(true)}
                            style={{ padding: '0.5rem 1.25rem', fontSize: '0.8rem', fontWeight: 700 }}
                          >
                            Reveal Takeaway
                          </button>
                        </div>
                      ) : (
                        /* BACK OF CARD */
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <Quote size={20} style={{ color: 'var(--accent-primary)', opacity: 0.4 }} />
                          </div>
                          
                          {/* Card Content */}
                          <div style={{ maxHeight: '180px', overflowY: 'auto', padding: '0.25rem' }}>
                            {currentCard.content.includes('<p>') ? (
                              <div 
                                style={{ fontSize: '0.95rem', lineHeight: 1.5, color: 'var(--text-secondary)', textAlign: 'left' }}
                                dangerouslySetInnerHTML={{ __html: currentCard.content }} 
                              />
                            ) : (
                              <p style={{ fontSize: '0.95rem', fontStyle: currentCard.type === 'quote' ? 'italic' : 'normal', lineHeight: 1.5, color: 'var(--text-primary)', margin: 0 }}>
                                {currentCard.type === 'quote' ? `"${currentCard.content}"` : currentCard.content}
                              </p>
                            )}
                          </div>

                          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', fontWeight: 600 }}>
                              Did you remember this correctly?
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                              <button 
                                type="button"
                                className="btn" 
                                onClick={() => handleReviewCard(currentCard.id, false)}
                                style={{
                                  flex: 1,
                                  maxWidth: '120px',
                                  padding: '0.45rem 1rem',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                  color: 'var(--color-dnf)',
                                  border: '1px solid rgba(239, 68, 68, 0.25)',
                                  borderRadius: '4px'
                                }}
                              >
                                ❌ Forgot
                              </button>
                              <button 
                                type="button"
                                className="btn" 
                                onClick={() => handleReviewCard(currentCard.id, true)}
                                style={{
                                  flex: 1,
                                  maxWidth: '120px',
                                  padding: '0.45rem 1rem',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                  color: '#34d399',
                                  border: '1px solid rgba(16, 185, 129, 0.25)',
                                  borderRadius: '4px'
                                }}
                              >
                                ✅ Remembered
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Navigation buttons */}
                    <div className="flex-between" style={{ marginTop: '0.25rem' }}>
                      <button 
                        className="btn btn-text" 
                        disabled={currentCardIdx === 0}
                        onClick={() => {
                          setCurrentCardIdx(prev => prev - 1);
                          setIsRevealed(false);
                        }}
                        style={{ fontSize: '0.75rem', padding: '0.35rem' }}
                      >
                        ← Prev Card
                      </button>
                      
                      <button 
                        className="btn btn-text" 
                        onClick={handleResetLeitner}
                        style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}
                      >
                        Reset schedules
                      </button>

                      <button 
                        className="btn btn-text" 
                        disabled={currentCardIdx === dueNotes.length - 1}
                        onClick={() => {
                          setCurrentCardIdx(prev => prev + 1);
                          setIsRevealed(false);
                        }}
                        style={{ fontSize: '0.75rem', padding: '0.35rem' }}
                      >
                        Next Card →
                      </button>
                    </div>

                  </div>
                );
              })()}
            </div>
          )}

        </div>
      )}

    </div>
  );
}
