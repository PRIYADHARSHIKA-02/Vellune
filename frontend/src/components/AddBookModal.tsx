import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { useShelves, useAddBook } from '../hooks/queries';
import { X, Sparkles, BookOpen, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '../lib/api';

const PRIMARY_GENRES = ['Romance', 'Dark', 'Psychothriller', 'Self Help', 'Fiction', 'Fantasy'];

const bookBaseSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  author: z.string().min(1, 'Author is required'),
  isbn: z.string().optional(),
  coverUrl: z.string().optional(),
  format: z.enum(['physical', 'ebook', 'audiobook', 'library']),
  status: z.enum(['to-read', 'reading', 'finished']),
  currentPage: z.number().min(0, 'Current page cannot be negative'),
  pageCount: z.number().min(1, 'Page count must be at least 1'),
  platform: z.string().optional(),
  shelfLocation: z.string().optional(),
  dueDate: z.string().optional(),
  customShelfIds: z.array(z.string()),
  genres: z.array(z.string()),
  description: z.string().optional(),
});

const bookSchema = bookBaseSchema.refine(data => data.currentPage <= data.pageCount, {
  message: "Current page cannot exceed total pages",
  path: ["currentPage"]
});

type BookFormValues = z.infer<typeof bookBaseSchema>;

interface AddBookModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddBookModal: React.FC<AddBookModalProps> = ({ isOpen, onClose }) => {
  const { data: shelves = [] } = useShelves();
  const addBookMutation = useAddBook();
  const { defaultAddBookStatus, setFinishedBookToRate } = useStore();

  // Autocomplete Search States
  const [apiSearchQuery, setApiSearchQuery] = useState('');
  const [apiResults, setApiResults] = useState<any[]>([]);
  const [isSearchingApi, setIsSearchingApi] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<BookFormValues>({
    resolver: zodResolver(bookSchema),
    defaultValues: {
      title: '',
      author: '',
      isbn: '',
      coverUrl: '',
      format: 'physical',
      status: 'to-read',
      currentPage: 0,
      pageCount: 300,
      platform: '',
      shelfLocation: '',
      dueDate: '',
      customShelfIds: [],
      genres: [],
    }
  });

  const formatType = watch('format');
  const selectedShelves = watch('customShelfIds') || [];
  const selectedGenres = watch('genres') || [];

  useEffect(() => {
    if (isOpen) {
      reset({
        title: '',
        author: '',
        isbn: '',
        coverUrl: '',
        format: 'physical',
        status: defaultAddBookStatus || 'to-read',
        currentPage: 0,
        pageCount: 300,
        platform: '',
        shelfLocation: '',
        dueDate: '',
        customShelfIds: [],
        genres: [],
      });
    }
  }, [isOpen, defaultAddBookStatus, reset]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced live search
  useEffect(() => {
    if (!apiSearchQuery.trim()) {
      setApiResults([]);
      setShowDropdown(false);
      setSearchError(null);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      setIsSearchingApi(true);
      setSearchError(null);
      try {
        const response = await api.post('/books/search', { query: apiSearchQuery.trim() });
        setApiResults(response.data || []);
        setShowDropdown(true);
      } catch (err: any) {
        console.error('Error fetching search suggestions:', err);
        setSearchError(err.response?.data?.error || err.message || 'Failed to search');
        setApiResults([]);
        setShowDropdown(true);
      } finally {
        setIsSearchingApi(false);
      }
    }, 450);

    return () => clearTimeout(delayDebounceFn);
  }, [apiSearchQuery]);

  const handleSelectApiBook = (apiBook: any) => {
    setValue('title', apiBook.title);
    setValue('author', apiBook.author);
    setValue('isbn', apiBook.isbn || '');
    setValue('coverUrl', apiBook.coverUrl || apiBook.cover_url || '');
    setValue('pageCount', apiBook.pageCount || 300);
    setValue('genres', apiBook.genres || []);
    setValue('description', apiBook.description || '');
    setShowDropdown(false);
    setApiSearchQuery('');
  };

  if (!isOpen) return null;

  const onSubmit = async (values: BookFormValues) => {
    try {
      const createdBook = await addBookMutation.mutateAsync({
        title: values.title,
        author: values.author,
        isbn: values.isbn || null,
        coverUrl: values.coverUrl || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=200',
        format: values.format,
        status: values.status,
        currentPage: values.currentPage,
        pageCount: values.pageCount,
        customShelfIds: values.customShelfIds,
        genres: values.genres,
        description: values.description || null,
        platform: values.platform || null,
        metadata: {
          shelfLocation: values.format === 'physical' ? values.shelfLocation : undefined,
          platform: (values.format === 'ebook' || values.format === 'audiobook') ? values.platform : undefined,
          dueDate: values.format === 'library' && values.dueDate ? new Date(values.dueDate).toISOString() : undefined
        }
      });

      // Reset Form and close
      reset();
      setApiSearchQuery('');
      setApiResults([]);
      onClose();

      if (values.status === 'finished') {
        setFinishedBookToRate(createdBook);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add book to library.');
    }
  };

  const toggleShelfInSelection = (shelfId: string) => {
    if (selectedShelves.includes(shelfId)) {
      setValue('customShelfIds', selectedShelves.filter(id => id !== shelfId));
    } else {
      setValue('customShelfIds', [...selectedShelves, shelfId]);
    }
  };

  const toggleGenreInSelection = (genre: string) => {
    if (selectedGenres.includes(genre)) {
      setValue('genres', selectedGenres.filter(g => g !== genre));
    } else {
      setValue('genres', [...selectedGenres, genre]);
    }
  };

  return (
    <div className="modal-overlay" style={{ display: 'flex' }}>
      <div className="modal-content glass animate-fade-in" style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
        <button className="modal-close" onClick={onClose}>
          <X size={18} />
        </button>

        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.25rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem', fontFamily: 'var(--font-display)' }}>
          Add New Book
        </h2>

        {/* Smart Import Section */}
        <div className="glass" style={{ padding: '1rem', background: 'rgba(212, 178, 111, 0.03)', border: '1px solid rgba(212, 178, 111, 0.2)', marginBottom: '1.5rem', position: 'relative' }}>
          <h3 style={{ fontSize: '0.9rem', display: 'flex', gap: '0.4rem', alignItems: 'center', marginBottom: '0.5rem', color: 'var(--accent-primary)', fontWeight: 700 }}>
            <Sparkles size={14} />
            Smart Book Import (Google Books & Open Library)
          </h3>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="form-input"
              style={{ paddingRight: '2.5rem' }}
              placeholder="Search title, author, or ISBN to auto-fill..."
              value={apiSearchQuery}
              onChange={e => {
                setApiSearchQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => {
                if (apiSearchQuery.trim()) {
                  setShowDropdown(true);
                }
              }}
            />
            {isSearchingApi && (
              <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-primary)', display: 'flex' }}>
                <Loader2 size={16} className="animate-spin" />
              </span>
            )}
            
            {/* Live Autocomplete suggestions dropdown overlay */}
            {showDropdown && apiSearchQuery.trim() && (
              <div 
                ref={dropdownRef}
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'rgba(9, 26, 30, 0.98)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: 'var(--radius-md)',
                  marginTop: '0.5rem',
                  maxHeight: '220px',
                  overflowY: 'auto',
                  zIndex: 50,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
                  scrollbarWidth: 'thin'
                }}
              >
                {isSearchingApi && apiResults.length === 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    <Loader2 size={16} className="animate-spin" style={{ marginRight: '0.5rem' }} />
                    Searching books...
                  </div>
                )}
                {searchError && (
                  <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-dnf)', fontSize: '0.8rem' }}>
                    {searchError}
                  </div>
                )}
                {!isSearchingApi && !searchError && apiResults.length === 0 && (
                  <div style={{ padding: '1.25rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    No books found
                  </div>
                )}
                {apiResults.map((r, i) => (
                  <div
                    key={i}
                    onClick={() => handleSelectApiBook(r)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.6rem 0.8rem',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      cursor: 'pointer',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(212, 178, 111, 0.08)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <img 
                      src={r.coverUrl || '/fallback-book.png'} 
                      onError={(e) => { (e.target as HTMLImageElement).src = '/fallback-book.png'; }}
                      loading="lazy"
                      style={{ width: '24px', height: '36px', objectFit: 'cover', borderRadius: '2px', flexShrink: 0 }} 
                      alt="cover" 
                    />
                    <div style={{ flexGrow: 1, minWidth: 0, fontSize: '0.8rem' }}>
                      <div style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>{r.title}</div>
                      <div style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>by {r.author}</div>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', fontWeight: 600, flexShrink: 0 }}>
                      Select & Autofill
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Manual Entry Form */}
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Title</label>
              <input type="text" className="form-input" {...register('title')} placeholder="e.g. The Hobbit" />
              {errors.title && <span style={{ color: 'var(--color-dnf)', fontSize: '0.75rem', marginTop: '0.2rem', display: 'block' }}>{errors.title.message}</span>}
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Author</label>
              <input type="text" className="form-input" {...register('author')} placeholder="e.g. J.R.R. Tolkien" />
              {errors.author && <span style={{ color: 'var(--color-dnf)', fontSize: '0.75rem', marginTop: '0.2rem', display: 'block' }}>{errors.author.message}</span>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>ISBN-13 (Optional)</label>
              <input type="text" className="form-input" {...register('isbn')} placeholder="e.g. 9780261102217" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Cover Image URL (Optional)</label>
              <input type="text" className="form-input" {...register('coverUrl')} placeholder="Paste link..." />
              {errors.coverUrl && <span style={{ color: 'var(--color-dnf)', fontSize: '0.75rem', marginTop: '0.2rem', display: 'block' }}>{errors.coverUrl.message}</span>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Format</label>
              <select className="form-select" {...register('format')}>
                <option value="physical">Physical Book</option>
                <option value="ebook">Ebook (Kindle, PDF)</option>
                <option value="audiobook">Audiobook</option>
                <option value="library">Library Loan</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Status</label>
              <select className="form-select" {...register('status')}>
                <option value="to-read">To Read (TBR)</option>
                <option value="reading">Currently Reading</option>
                <option value="finished">Finished</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Current Page</label>
              <input type="number" className="form-input" {...register('currentPage', { valueAsNumber: true })} />
              {errors.currentPage && <span style={{ color: 'var(--color-dnf)', fontSize: '0.75rem', marginTop: '0.2rem', display: 'block' }}>{errors.currentPage.message}</span>}
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Total Pages</label>
              <input type="number" className="form-input" {...register('pageCount', { valueAsNumber: true })} />
              {errors.pageCount && <span style={{ color: 'var(--color-dnf)', fontSize: '0.75rem', marginTop: '0.2rem', display: 'block' }}>{errors.pageCount.message}</span>}
            </div>
          </div>

          {/* Format-Specific Panels */}
          {formatType === 'physical' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Shelf Location</label>
              <input type="text" className="form-input" placeholder="e.g. Living Room Shelf B" {...register('shelfLocation')} />
            </div>
          )}

          {formatType === 'library' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Due Date</label>
              <input type="date" className="form-input" {...register('dueDate')} />
            </div>
          )}

          {(formatType === 'ebook' || formatType === 'audiobook') && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Platform (e.g. Kindle, Audible, Spotify)</label>
              <input type="text" className="form-input" placeholder="e.g. Kindle" {...register('platform')} />
            </div>
          )}

          {/* Genre Checkboxes */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Genres / Categories</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              {PRIMARY_GENRES.map(g => {
                const isSelected = selectedGenres.map(x => x.toLowerCase()).includes(g.toLowerCase());
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => toggleGenreInSelection(g)}
                    style={{
                      padding: '0.35rem 0.65rem',
                      fontSize: '0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? 'rgba(212, 178, 111, 0.12)' : 'transparent',
                      borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-glass)',
                      color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                      transition: 'all 0.15s ease',
                      textTransform: 'capitalize'
                    }}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          </div>

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
            <button type="submit" className="btn btn-primary" style={{ color: '#091A1E', fontWeight: 700 }} disabled={addBookMutation.isPending}>
              {addBookMutation.isPending ? 'Saving...' : 'Save Book'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
