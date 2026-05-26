'use client';

import React, { useState } from 'react';
import { useStore } from '../../store';
import { useBooks, useShelves, useAddShelf, Book } from '../../hooks/queries';
import { BookCard } from '../../components/BookCard';
import { Search, Plus, BookOpen, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const shelfSchema = z.object({
  name: z.string().min(1, 'Collection name is required.'),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format.'),
});

type ShelfFormValues = z.infer<typeof shelfSchema>;

export default function ShelfPage() {
  const { setSelectedBookIdForDetail } = useStore();

  // State filters
  const [activeTab, setActiveTab] = useState<Book['status'] | 'all'>('all');
  const [selectedFormat, setSelectedFormat] = useState<Book['format'] | 'all'>('all');
  const [selectedShelf, setSelectedShelf] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isShelfCreateOpen, setIsShelfCreateOpen] = useState(false);

  // Queries & Mutations
  const { data: books = [], isLoading: isBooksLoading } = useBooks();
  const { data: shelves = [], isLoading: isShelvesLoading } = useShelves();
  const addShelfMutation = useAddShelf();

  // Form for custom shelf creation
  const {
    register: registerShelf,
    handleSubmit: handleShelfSubmit,
    formState: { errors: shelfErrors },
    reset: resetShelfForm,
  } = useForm<ShelfFormValues>({
    resolver: zodResolver(shelfSchema),
    defaultValues: {
      name: '',
      description: '',
      color: '#8b5cf6',
    }
  });

  const handleCreateShelf = async (data: ShelfFormValues) => {
    try {
      await addShelfMutation.mutateAsync({
        name: data.name,
        description: data.description || null,
        color: data.color,
      });
      setIsShelfCreateOpen(false);
      resetShelfForm();
    } catch (err) {
      console.error(err);
      alert('Failed to create shelf.');
    }
  };

  // Filter books
  const filteredBooks = books.filter(book => {
    // Status
    if (activeTab !== 'all' && book.status !== activeTab) return false;
    // Format
    if (selectedFormat !== 'all' && book.format !== selectedFormat) return false;
    // Shelf
    if (selectedShelf !== 'all' && !book.customShelfIds.includes(selectedShelf)) return false;
    // Search
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      const matchesTitle = book.title.toLowerCase().includes(query);
      const matchesAuthor = book.author.toLowerCase().includes(query);
      const matchesIsbn = book.isbn ? book.isbn.includes(query) : false;
      if (!matchesTitle && !matchesAuthor && !matchesIsbn) return false;
    }
    return true;
  });

  const isLoading = isBooksLoading || isShelvesLoading;

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text-secondary)' }}>
        Loading your library shelves...
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Page Header */}
      <div className="flex-between">
        <div>
          <h1 className="screen-title">Universal Shelf</h1>
          <p className="screen-subtitle">Manage, categorize, and organize your entire collection.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={() => setIsShelfCreateOpen(true)}>
            Create Collection
          </button>
          {/* We trigger the global FAB action or local modal open */}
          <button className="btn btn-primary" onClick={() => {
            const fab = document.querySelector('.global-fab') as HTMLButtonElement;
            if (fab) fab.click();
          }}>
            <Plus size={16} /> Add Book
          </button>
        </div>
      </div>

      {/* Tabs & Filters bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        
        {/* Status Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-glass)', overflowX: 'auto', gap: '1rem', paddingBottom: '0.1rem' }}>
          {(['all', 'reading', 'to-read', 'finished', 'on-hold', 'dnf'] as const).map(tab => (
            <button
              key={tab}
              className={`btn-text ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
              style={{
                borderBottom: activeTab === tab ? '2px solid var(--accent-primary)' : 'none',
                borderRadius: 0,
                padding: '0.75rem 0.5rem',
                textTransform: 'capitalize',
                fontWeight: 600
              }}
            >
              {tab === 'to-read' ? 'To Read' : tab === 'dnf' ? 'DNF' : tab}
            </button>
          ))}
        </div>

        {/* Action Filters Panel */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
          
          {/* Format quick buttons */}
          <div style={{ display: 'flex', gap: '0.4rem', background: 'rgba(255,255,255,0.02)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)' }}>
            {(['all', 'physical', 'ebook', 'audiobook', 'library'] as const).map(fmt => (
              <button
                key={fmt}
                type="button"
                onClick={() => setSelectedFormat(fmt)}
                style={{
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.8rem',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: selectedFormat === fmt ? 'var(--accent-primary)' : 'transparent',
                  color: selectedFormat === fmt ? '#ffffff' : 'var(--text-secondary)',
                  fontWeight: 500,
                  transition: 'all 0.15s ease'
                }}
              >
                {fmt === 'all' ? 'All Formats' : fmt.charAt(0).toUpperCase() + fmt.slice(1)}
              </button>
            ))}
          </div>

          {/* Collection Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Collection:</span>
            <select
              className="form-select"
              style={{ width: '180px', padding: '0.4rem 0.75rem' }}
              value={selectedShelf}
              onChange={e => setSelectedShelf(e.target.value)}
            >
              <option value="all">All Shelves</option>
              {shelves.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Search bar */}
          <div style={{ position: 'relative', flexGrow: 1, minWidth: '200px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '2.25rem' }}
              placeholder="Search by Title, Author, or ISBN..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

        </div>

      </div>

      {/* Books Grid */}
      {filteredBooks.length === 0 ? (
        <div className="glass" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <BookOpen size={48} style={{ margin: '0 auto 1.5rem auto', opacity: 0.25 }} />
          <h3>No books match your filters.</h3>
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>Try modifying search parameters or add a new book to your shelf.</p>
        </div>
      ) : (
        <div className="grid-cols-2">
          {filteredBooks.map(book => (
            <BookCard 
              key={book.id} 
              book={book} 
              onSelect={setSelectedBookIdForDetail} 
              showDelete 
            />
          ))}
        </div>
      )}

      {/* Create Shelf Custom Modal */}
      {isShelfCreateOpen && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-content glass" style={{ maxWidth: '400px' }}>
            <button className="modal-close" onClick={() => setIsShelfCreateOpen(false)}>
              <X size={18} />
            </button>

            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', fontFamily: 'var(--font-display)' }}>Create Custom Collection</h2>

            <form onSubmit={handleFormSubmit(handleCreateShelf)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Collection Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Classic Philosophy"
                  {...registerShelf('name')} 
                />
                {shelfErrors.name && <p style={{ color: 'red', fontSize: '0.75rem', marginTop: '0.2rem' }}>{shelfErrors.name.message}</p>}
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Description</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Old works to revisit"
                  {...registerShelf('description')} 
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Accent Color</label>
                <input 
                  type="color" 
                  style={{ width: '100%', height: '40px', border: '1px solid var(--border-glass)', borderRadius: '4px', background: 'none', cursor: 'pointer' }}
                  {...registerShelf('color')} 
                />
                {shelfErrors.color && <p style={{ color: 'red', fontSize: '0.75rem', marginTop: '0.2rem' }}>{shelfErrors.color.message}</p>}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsShelfCreateOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={addShelfMutation.isPending}>
                  {addShelfMutation.isPending ? 'Creating...' : 'Create Shelf'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );

  // Helper hook mapper to prevent TypeScript/React JSX syntax errors
  function handleFormSubmit(callback: (data: ShelfFormValues) => void) {
    return handleShelfSubmit(callback);
  }
}
