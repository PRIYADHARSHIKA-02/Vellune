import React, { useState } from 'react';
import { useStore, Book } from '../store';
import { X, Sparkles, BookOpen } from 'lucide-react';

interface AddBookModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddBookModal: React.FC<AddBookModalProps> = ({ isOpen, onClose }) => {
  const { shelves, addBook } = useStore();

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

  if (!isOpen) return null;

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
    onClose();
  };

  const toggleShelfInSelection = (shelfId: string) => {
    if (selectedShelves.includes(shelfId)) {
      setSelectedShelves(selectedShelves.filter(id => id !== shelfId));
    } else {
      setSelectedShelves([...selectedShelves, shelfId]);
    }
  };

  return (
    <div className="modal-overlay" style={{ display: 'flex' }}>
      <div className="modal-content glass animate-fade-in" style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
        <button className="modal-close" onClick={onClose}>
          <X size={18} />
        </button>

        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.25rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem' }}>
          Add New Book
        </h2>

        {/* Smart Import Section */}
        <div className="glass" style={{ padding: '1rem', background: 'rgba(212, 178, 111, 0.03)', border: '1px solid rgba(212, 178, 111, 0.2)', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.9rem', display: 'flex', gap: '0.4rem', alignItems: 'center', marginBottom: '0.5rem', color: 'var(--accent-primary)' }}>
            <Sparkles size={14} />
            Smart Import (Open Library API Lookup)
          </h3>
          <form onSubmit={handleSearchOpenLibrary} style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search title, author, or ISBN..."
              value={apiSearchQuery}
              onChange={e => setApiSearchQuery(e.target.value)}
            />
            <button type="submit" className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>
              {isSearchingApi ? 'Searching...' : 'Search'}
            </button>
          </form>

          {/* API Results */}
          {apiResults.length > 0 && (
            <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto' }}>
              {apiResults.map((r, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.4rem',
                    borderRadius: '4px',
                    background: 'rgba(255,255,255,0.03)',
                    cursor: 'pointer'
                  }}
                  onClick={() => handleSelectApiBook(r)}
                >
                  {r.coverUrl ? (
                    <img src={r.coverUrl} style={{ width: '24px', height: '36px', objectFit: 'cover', borderRadius: '2px' }} />
                  ) : (
                    <BookOpen size={16} />
                  )}
                  <div style={{ flexGrow: 1, minWidth: 0, fontSize: '0.8rem' }}>
                    <div style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>{r.title}</div>
                    <div style={{ color: 'var(--text-secondary)' }}>by {r.author}</div>
                  </div>
                  <span style={{ fontSize: '0.7rem', background: 'var(--accent-primary)', padding: '0.15rem 0.4rem', borderRadius: '4px', color: '#091A1E', fontWeight: 600 }}>
                    Select
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Manual Entry Form */}
        <form onSubmit={handleCreateBook} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Title</label>
              <input type="text" className="form-input" value={title} onChange={e => setTitle(e.target.value)} required placeholder="e.g. The Hobbit" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Author</label>
              <input type="text" className="form-input" value={author} onChange={e => setAuthor(e.target.value)} required placeholder="e.g. J.R.R. Tolkien" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>ISBN-13 (Optional)</label>
              <input type="text" className="form-input" value={isbn} onChange={e => setIsbn(e.target.value)} placeholder="e.g. 9780261102217" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Cover Image URL (Optional)</label>
              <input type="text" className="form-input" value={coverUrl} onChange={e => setCoverUrl(e.target.value)} placeholder="Paste link..." />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Format</label>
              <select className="form-select" value={formatType} onChange={e => setFormatType(e.target.value as any)}>
                <option value="physical">Physical Book</option>
                <option value="ebook">Ebook (Kindle, PDF)</option>
                <option value="audiobook">Audiobook</option>
                <option value="library">Library Loan</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Status</label>
              <select className="form-select" value={status} onChange={e => setStatus(e.target.value as any)}>
                <option value="to-read">To Read (TBR)</option>
                <option value="reading">Currently Reading</option>
                <option value="finished">Finished</option>
                <option value="on-hold">On Hold</option>
                <option value="dnf">Did Not Finish (DNF)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Current Page</label>
              <input type="number" className="form-input" value={currentPage} onChange={e => setCurrentPage(parseInt(e.target.value) || 0)} min={0} max={pageCount} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Total Pages</label>
              <input type="number" className="form-input" value={pageCount} onChange={e => setPageCount(parseInt(e.target.value) || 1)} min={1} required />
            </div>
          </div>

          {/* Format-Specific Panels */}
          {formatType === 'physical' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Shelf Location</label>
              <input type="text" className="form-input" placeholder="e.g. Living Room Shelf B" value={shelfLocation} onChange={e => setShelfLocation(e.target.value)} />
            </div>
          )}

          {formatType === 'library' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Due Date</label>
              <input type="date" className="form-input" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          )}

          {(formatType === 'ebook' || formatType === 'audiobook') && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Platform (e.g. Kindle, Audible, Spotify)</label>
              <input type="text" className="form-input" placeholder="e.g. Kindle" value={platform} onChange={e => setPlatform(e.target.value)} />
            </div>
          )}

          {/* Shelves Checkboxes */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Categorize under Shelves</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {shelves.map(s => {
                const isSelected = selectedShelves.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleShelfInSelection(s.id)}
                    style={{
                      padding: '0.35rem 0.65rem',
                      fontSize: '0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? 'rgba(212, 178, 111, 0.12)' : 'transparent',
                      borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-glass)',
                      color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {s.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ color: '#091A1E', fontWeight: 700 }}>
              Save Book
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
