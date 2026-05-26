'use client';

import React, { useState } from 'react';
import { useBooks, useNotes, useUpdateNote, Note } from '../../hooks/queries';
import { Search, Quote, FileText, Star, Sparkles } from 'lucide-react';
import { format } from 'date-fns';

export default function RememberPage() {
  const { data: books = [], isLoading: isBooksLoading } = useBooks();
  const { data: notes = [], isLoading: isNotesLoading } = useNotes();
  const updateNoteMutation = useUpdateNote();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBookFilter, setSelectedBookFilter] = useState('all');
  const [selectedTagFilter, setSelectedTagFilter] = useState('all');

  // Collect all unique tags for filter
  const allTags = Array.from(new Set(
    notes.flatMap(n => n.tags || [])
  ));

  // Filter notes
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
  );
}
