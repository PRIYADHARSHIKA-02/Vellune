import React, { useState } from 'react';
import { useStore, Book } from '../store';
import { BookCard } from '../components/BookCard';
import { AddBookModal } from '../components/AddBookModal';
import { Search, Plus, Filter, BookOpen, Smartphone, Headphones, Landmark, X, Sparkles, Check } from 'lucide-react';

export const Shelf: React.FC = () => {
  const { 
    books, shelves, addBook, setSelectedBookIdForDetail, addShelf 
  } = useStore();

  const [activeTab, setActiveTab] = useState<Book['status'] | 'all'>('all');
  const [selectedFormat, setSelectedFormat] = useState<Book['format'] | 'all'>('all');
  const [selectedShelf, setSelectedShelf] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isShelfCreateOpen, setIsShelfCreateOpen] = useState(false);

  // Search Results from Open Library API
  const [apiSearchQuery, setApiSearchQuery] = useState('');
  const [apiResults, setApiResults] = useState<any[]>([]);
  const [isSearchingApi, setIsSearchingApi] = useState(false);

  // New Book Form
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isbn, setIsbn] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [formatType, setFormatType] = useState<Book['format']>('physical');
  const [status, setStatus] = useState<Book['status']>('to-read');
  const [pageCount, setPageCount] = useState<number>(300);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [shelfLocation, setShelfLocation] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [platform, setPlatform] = useState('');
  const [selectedShelves, setSelectedShelves] = useState<string[]>([]);

  // Custom Shelf Create Form
  const [newShelfName, setNewShelfName] = useState('');
  const [newShelfDesc, setNewShelfDesc] = useState('');
  const [newShelfColor, setNewShelfColor] = useState('#8b5cf6');

  // Filter books
  const filteredBooks = books.filter(book => {
    // Status
    if (activeTab !== 'all' && book.status !== activeTab) return false;
    // Format
    if (selectedFormat !== 'all' && book.format !== selectedFormat) return false;
    // Shelf
    if (selectedShelf !== 'all' && !book.custom_shelf_ids.includes(selectedShelf)) return false;
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

  const handleSearchOpenLibrary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiSearchQuery.trim()) return;

    setIsSearchingApi(true);
    try {
      const response = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(apiSearchQuery)}&limit=5`);
      const data = await response.json();
      
      const formatted = data.docs.map((doc: any) => ({
        title: doc.title,
        author: doc.author_name ? doc.author_name[0] : 'Unknown Author',
        isbn: doc.isbn ? doc.isbn[0] : '',
        coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : '',
        pageCount: doc.number_of_pages_median || 350
      }));
      
      setApiResults(formatted);
    } catch (err) {
      console.error('Error fetching books from Open Library API:', err);
      alert('Could not retrieve results. Please verify your connection.');
    } finally {
      setIsSearchingApi(false);
    }
  };

  const handleSelectApiBook = (apiBook: any) => {
    setTitle(apiBook.title);
    setAuthor(apiBook.author);
    setIsbn(apiBook.isbn);
    setCoverUrl(apiBook.coverUrl);
    setPageCount(apiBook.pageCount);
    // Clear API search states
    setApiSearchQuery('');
    setApiResults([]);
  };

  const handleCreateBook = (e: React.FormEvent) => {
    e.preventDefault();

    addBook({
      title,
      author,
      isbn: isbn || undefined,
      cover_url: coverUrl || `https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=200`,
      format: formatType,
      status,
      platform: platform || undefined,
      current_page: currentPage,
      page_count: pageCount,
      custom_shelf_ids: selectedShelves,
      metadata: {
        shelf_location: formatType === 'physical' ? shelfLocation : undefined,
        device: formatType === 'ebook' ? platform : undefined,
        due_date: formatType === 'library' && dueDate ? new Date(dueDate).toISOString() : undefined
      }
    });

    // Reset Form
    setTitle('');
    setAuthor('');
    setIsbn('');
    setCoverUrl('');
    setFormatType('physical');
    setStatus('to-read');
    setPageCount(300);
    setCurrentPage(0);
    setShelfLocation('');
    setDueDate('');
    setPlatform('');
    setSelectedShelves([]);
    setIsAddOpen(false);
  };

  const handleCreateShelf = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShelfName.trim()) return;

    addShelf({
      name: newShelfName,
      description: newShelfDesc || undefined,
      color: newShelfColor,
      icon: 'Folder'
    });

    setNewShelfName('');
    setNewShelfDesc('');
    setIsShelfCreateOpen(false);
  };

  const toggleShelfInSelection = (shelfId: string) => {
    if (selectedShelves.includes(shelfId)) {
      setSelectedShelves(selectedShelves.filter(id => id !== shelfId));
    } else {
      setSelectedShelves([...selectedShelves, shelfId]);
    }
  };

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
          <button className="btn btn-primary" onClick={() => setIsAddOpen(true)}>
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
            <BookCard key={book.id} book={book} onSelect={setSelectedBookIdForDetail} showDelete />
          ))}
        </div>
      )}

      {/* Add Book Overlay Modal */}
      <AddBookModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />

      {/* Create Shelf Custom Modal */}
      {isShelfCreateOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass" style={{ maxWidth: '400px' }}>
            <button className="modal-close" onClick={() => setIsShelfCreateOpen(false)}>
              <X size={18} />
            </button>

            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', fontFamily: 'var(--font-display)' }}>Create Custom Collection</h2>

            <form onSubmit={handleCreateShelf} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Collection Name</label>
                <input type="text" className="form-input" value={newShelfName} onChange={e => setNewShelfName(e.target.value)} required placeholder="e.g. Classic Philosophy" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Description</label>
                <input type="text" className="form-input" value={newShelfDesc} onChange={e => setNewShelfDesc(e.target.value)} placeholder="e.g. Old works to revisit" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Accent Color</label>
                <input type="color" style={{ width: '100%', height: '40px', border: '1px solid var(--border-glass)', borderRadius: '4px', background: 'none', cursor: 'pointer' }} value={newShelfColor} onChange={e => setNewShelfColor(e.target.value)} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsShelfCreateOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Shelf</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
