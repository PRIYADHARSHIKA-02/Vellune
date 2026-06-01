import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { 
  useBooks, 
  useSessions, 
  useNotes, 
  useShelves, 
  useAddBook,
  useUpdateBook, 
  useDeleteBook, 
  useAddNote, 
  useAddSession,
  useBookReviews,
  useDeleteReview
} from '../hooks/queries';
import { X, Plus, Clock, Bookmark, Info, Edit3, Trash2, Calendar, Star, Loader2, BookOpen, ThumbsUp, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Editor } from './Editor';

const PRIMARY_GENRES = ['Romance', 'Dark', 'Psychothriller', 'Self Help', 'Fiction', 'Fantasy'];

interface BookDetailModalProps {
  bookId: string;
  onClose: () => void;
}

// Schemas
const noteSchema = z.object({
  content: z.string().min(1, 'Note content is required'),
  type: z.enum(['note', 'quote', 'bookmark']),
  pageNumber: z.union([z.number(), z.nan()]).transform(val => isNaN(val) ? null : val).nullable().optional(),
  tags: z.string().optional(),
  isFavorite: z.boolean().optional(),
});

const logPastSchema = z.object({
  pastDate: z.string(),
  pastDuration: z.number().min(1, 'Duration must be at least 1 minute'),
  pastPagesRead: z.number().min(0, 'Pages read cannot be negative'),
  pastLocation: z.string().min(1, 'Location is required'),
  pastMood: z.string().min(1, 'Mood is required'),
});

type NoteFormValues = z.infer<typeof noteSchema>;
type LogPastFormValues = z.infer<typeof logPastSchema>;

export const BookDetailModal: React.FC<BookDetailModalProps> = ({ bookId, onClose }) => {
  const { selectedExternalBook, setFinishedBookToRate } = useStore();
  
  const { data: books = [] } = useBooks();
  const { data: sessions = [] } = useSessions();
  const { data: notes = [] } = useNotes();
  const { data: shelves = [] } = useShelves();

  const addBookMutation = useAddBook();
  const updateBookMutation = useUpdateBook();
  const deleteBookMutation = useDeleteBook();
  const addNoteMutation = useAddNote();
  const addSessionMutation = useAddSession();
  const deleteReviewMutation = useDeleteReview();

  // Find if book is on shelf (DB match by ID only; do not match by ISBN when opened as external discover log)
  const shelfBook = books.find(b => b.id === bookId);
  const isShelfBook = !!shelfBook;
  
  // Use shelf book details if available, else fallback to external search result
  const book = shelfBook || selectedExternalBook;

  const [activeTab, setActiveTab] = useState<'about' | 'reviews' | 'similar'>('about');
  const [showLogPast, setShowLogPast] = useState(false);
  const [showFormatPicker, setShowFormatPicker] = useState(false);

  // Collapsible sections for shelf actions in "About" tab
  const [showProgressSection, setShowProgressSection] = useState(true);
  const [showNotesSection, setShowNotesSection] = useState(false);
  const [showSessionsSection, setShowSessionsSection] = useState(false);
  const [showEditSection, setShowEditSection] = useState(false);

  // Component A state
  const [selectedSource, setSelectedSource] = useState<string>('All');
  const [isBreakdownExpanded, setIsBreakdownExpanded] = useState<boolean>(false);
  const [selectedFullReview, setSelectedFullReview] = useState<any | null>(null);

  // Reviews Hook (only fetch for external books, not shelf books)
  const { data: reviewsResponse, isLoading: isReviewsLoading } = useBookReviews(!isShelfBook ? (book?.isbn || book?.id || null) : null, selectedSource === 'All' ? undefined : selectedSource);

  // Edit Book Form setup
  const editBookBaseSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    author: z.string().min(1, 'Author is required'),
    format: z.enum(['physical', 'ebook', 'audiobook', 'library']),
    status: z.enum(['to-read', 'reading', 'finished', 'on-hold', 'dnf']),
    currentPage: z.number().min(0, 'Current page cannot be negative'),
    pageCount: z.number().min(1, 'Page count must be at least 1'),
    platform: z.string().optional(),
    shelfLocation: z.string().optional(),
    dueDate: z.string().optional(),
    customShelfIds: z.array(z.string()),
    genres: z.array(z.string()),
  });

  const editBookSchema = editBookBaseSchema.refine(data => data.currentPage <= data.pageCount, {
    message: "Current page cannot exceed total pages",
    path: ["currentPage"]
  });

  type EditBookFormValues = z.infer<typeof editBookBaseSchema>;

  const editBookForm = useForm<EditBookFormValues>({
    resolver: zodResolver(editBookSchema),
    defaultValues: {
      title: '',
      author: '',
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

  // Populate edit form when book loads
  useEffect(() => {
    if (shelfBook) {
      editBookForm.reset({
        title: shelfBook.title,
        author: shelfBook.author,
        format: shelfBook.format,
        status: shelfBook.status,
        currentPage: shelfBook.currentPage,
        pageCount: shelfBook.pageCount,
        platform: shelfBook.platform || '',
        shelfLocation: shelfBook.metadata?.shelfLocation || '',
        dueDate: shelfBook.metadata?.dueDate ? shelfBook.metadata.dueDate.substring(0, 10) : '',
        customShelfIds: shelfBook.customShelfIds || [],
        genres: shelfBook.genres || [],
      });
    }
  }, [shelfBook, editBookForm]);

  // Reset tab to 'about' if it's a shelf book and activeTab is 'reviews'
  useEffect(() => {
    if (isShelfBook && activeTab === 'reviews') {
      setActiveTab('about');
    }
  }, [isShelfBook, activeTab]);

  // Note form
  const noteForm = useForm<NoteFormValues>({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      content: '',
      type: 'note',
      pageNumber: null,
      tags: '',
      isFavorite: false,
    }
  });

  // Log past form
  const logPastForm = useForm<LogPastFormValues>({
    resolver: zodResolver(logPastSchema),
    defaultValues: {
      pastDate: new Date().toISOString().substring(0, 10),
      pastDuration: 30,
      pastPagesRead: 15,
      pastLocation: 'Home',
      pastMood: 'focused',
    }
  });

  if (!book) return null;

  const bookSessions = isShelfBook ? sessions.filter(s => s.bookId === shelfBook.id) : [];
  const bookNotes = isShelfBook ? notes.filter(n => n.bookId === shelfBook.id) : [];

  const handleAddNoteSubmit = async (values: NoteFormValues) => {
    if (!isShelfBook || !shelfBook) return;
    try {
      await addNoteMutation.mutateAsync({
        bookId: shelfBook.id,
        type: values.type,
        content: values.content,
        pageNumber: values.pageNumber || null,
        tags: values.tags ? values.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean) : [],
        isFavorite: !!values.isFavorite
      });
      noteForm.reset({
        content: '',
        type: 'note',
        pageNumber: null,
        tags: '',
        isFavorite: false,
      });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to capture note.');
    }
  };

  const handleUpdateBookSubmit = async (values: EditBookFormValues) => {
    if (!isShelfBook || !shelfBook) return;
    try {
      if (values.status === 'finished' && shelfBook.status !== 'finished') {
        setFinishedBookToRate(shelfBook);
        onClose();
        return;
      }
      await updateBookMutation.mutateAsync({
        id: shelfBook.id,
        updates: {
          title: values.title,
          author: values.author,
          status: values.status,
          format: values.format,
          currentPage: values.currentPage,
          pageCount: values.pageCount,
          customShelfIds: values.customShelfIds,
          genres: values.genres,
          platform: values.platform || null,
          metadata: {
            ...shelfBook.metadata,
            shelfLocation: values.format === 'physical' ? values.shelfLocation : undefined,
            dueDate: values.format === 'library' && values.dueDate ? new Date(values.dueDate).toISOString() : undefined
          }
        }
      });
      alert('Book updated successfully!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update book.');
    }
  };

  const handleLogPastSessionSubmit = async (values: LogPastFormValues) => {
    if (!isShelfBook || !shelfBook) return;
    const start = new Date(values.pastDate);
    const end = new Date(start.getTime() + values.pastDuration * 60000);

    const startPage = shelfBook.currentPage;
    const endPage = shelfBook.currentPage + values.pastPagesRead;

    try {
      await addSessionMutation.mutateAsync({
        bookId: shelfBook.id,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        durationMinutes: values.pastDuration,
        pagesStart: startPage,
        pagesEnd: endPage,
        pagesRead: values.pastPagesRead,
        formatUsed: shelfBook.format,
        location: values.pastLocation,
        moodBefore: 'neutral',
        moodAfter: values.pastMood,
        notes: null
      });

      setShowLogPast(false);
      logPastForm.reset({
        pastDate: new Date().toISOString().substring(0, 10),
        pastDuration: 30,
        pastPagesRead: 15,
        pastLocation: 'Home',
        pastMood: 'focused',
      });

      if (endPage >= shelfBook.pageCount) {
        setFinishedBookToRate(shelfBook);
        onClose();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to record past session.');
    }
  };

  const handleAddToShelf = async (format: 'physical' | 'ebook' | 'audiobook' | 'library') => {
    try {
      await addBookMutation.mutateAsync({
        title: book.title,
        author: book.author,
        isbn: book.isbn || null,
        coverUrl: book.coverUrl || book.cover_url || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=200',
        format,
        status: 'to-read',
        pageCount: book.pageCount || 300,
        genres: book.genres || [],
        customShelfIds: [],
        metadata: {},
        currentPage: 0,
      });
      setShowFormatPicker(false);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add book to TBR shelf.');
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (confirm('Are you sure you want to delete your review?')) {
      try {
        await deleteReviewMutation.mutateAsync(reviewId);
      } catch (err: any) {
        alert(err.response?.data?.error || 'Failed to delete review.');
      }
    }
  };

  const toggleShelfSelection = (shelfId: string) => {
    const current = editBookForm.getValues('customShelfIds') || [];
    if (current.includes(shelfId)) {
      editBookForm.setValue('customShelfIds', current.filter(id => id !== shelfId));
    } else {
      editBookForm.setValue('customShelfIds', [...current, shelfId]);
    }
  };

  const toggleGenreSelection = (genre: string) => {
    const current = editBookForm.getValues('genres') || [];
    if (current.includes(genre)) {
      editBookForm.setValue('genres', current.filter(g => g !== genre));
    } else {
      editBookForm.setValue('genres', [...current, genre]);
    }
  };

  const handleDelete = async () => {
    if (!isShelfBook || !shelfBook) return;
    if (confirm(`Are you sure you want to permanently delete "${shelfBook.title}" from your library?`)) {
      try {
        await deleteBookMutation.mutateAsync(shelfBook.id);
        onClose();
      } catch (err: any) {
        alert(err.response?.data?.error || 'Failed to delete book.');
      }
    }
  };

  // Helper formatter for ratings
  const formatRatingCount = (count: number) => {
    if (count < 1000) return `${count} ratings`;
    if (count < 1000000) return `${(count / 1000).toFixed(1)}K ratings`;
    return `${(count / 1000000).toFixed(1)}M ratings`;
  };

  // Render 5-star visual
  const renderRatingStars = (score: number) => {
    return Array.from({ length: 5 }).map((_, idx) => {
      const starNum = idx + 1;
      const isFilled = score >= starNum;
      const isHalf = !isFilled && score >= starNum - 0.5;
      return (
        <Star 
          key={idx} 
          size={14} 
          fill={isFilled ? 'var(--color-on-hold)' : 'none'} 
          style={{ color: isFilled || isHalf ? 'var(--color-on-hold)' : 'rgba(255,255,255,0.2)', marginRight: '2px' }} 
        />
      );
    });
  };

  // Curate colors for reviews source badges
  const getSourceBadgeStyle = (source: string) => {
    const defaultStyle = { background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' };
    switch (source.toLowerCase()) {
      case 'goodreads': return { background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.2)' };
      case 'nyt': return { background: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.2)' };
      case 'the guardian': return { background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.2)' };
      case 'librarything': return { background: 'rgba(139, 92, 246, 0.1)', color: '#c084fc', border: '1px solid rgba(139, 92, 246, 0.2)' };
      case 'amazon': return { background: 'rgba(20, 184, 166, 0.1)', color: '#2dd4bf', border: '1px solid rgba(20, 184, 166, 0.2)' };
      case 'your friends': return { background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.2)' };
      default: return defaultStyle;
    }
  };

  // Get similar books mock list
  const similarBooks = [
    { title: "Project Hail Mary", author: "Andy Weir", coverUrl: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=100", rating: 4.6, reason: "Isolation-based sci-fi" },
    { title: "Dune", author: "Frank Herbert", coverUrl: "https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=100", rating: 4.5, reason: "Epic classics" },
    { title: "The Alchemist", author: "Paulo Coelho", coverUrl: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=100", rating: 4.3, reason: "Philosophical fiction" }
  ];

  const editFormatType = editBookForm.watch('format');
  const editBookShelves = editBookForm.watch('customShelfIds') || [];
  const editBookGenres = editBookForm.watch('genres') || [];
  const noteIsFavorite = noteForm.watch('isFavorite');

  // Aggregated reviews statistics
  const reviewsAggregate = reviewsResponse?.aggregate;
  const aggregateScore = reviewsAggregate ? parseFloat(reviewsAggregate.weightedAvgScore) : (book.external_avg_rating || 4.2);
  const totalRatingCount = reviewsAggregate ? reviewsAggregate.totalRatingCount : (book.external_rating_count || 1500);

  // Check if "Your friends" has reviews
  const friendReviews = reviewsResponse?.reviews.filter(r => r.source === 'Your friends') || [];
  const hasFriendReviews = friendReviews.length > 0;

  return (
    <div className="modal-overlay" style={{ zIndex: 2100 }}>
      <div className="modal-content glass animate-fade-in" style={{ maxWidth: '750px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <button className="modal-close" onClick={onClose}>
          <X size={18} />
        </button>

        {/* Persistent Book Header */}
        <div style={{ display: 'flex', gap: '1.5rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '1.25rem', position: 'relative' }}>
          <img 
            src={book.coverUrl || book.cover_url || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=100'} 
            alt={book.title} 
            style={{ width: '80px', height: '120px', borderRadius: '6px', objectFit: 'cover' }} 
            onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=100' }}
          />
          <div style={{ flexGrow: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-display)', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {book.title}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>by {book.author}</p>
            
            {/* Aggregated Score Badge row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {aggregateScore.toFixed(1)}
              </span>
              <div style={{ display: 'flex' }}>
                {renderRatingStars(aggregateScore)}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                ({formatRatingCount(totalRatingCount)})
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {isShelfBook ? (
                <>
                  <span className={`badge-format ${shelfBook.format}`}>{shelfBook.format.toUpperCase()}</span>
                  <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                    Progress: {shelfBook.status === 'finished' ? '100.00' : shelfBook.progressPercentage}% ({shelfBook.status === 'finished' ? shelfBook.pageCount : shelfBook.currentPage}/{shelfBook.pageCount} pages)
                  </span>
                  <span style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-finished)', fontWeight: 600 }}>
                    On your shelf
                  </span>
                </>
              ) : (
                <div style={{ position: 'relative' }}>
                  <button 
                    className="btn btn-primary" 
                    style={{ padding: '0.35rem 0.8rem', fontSize: '0.75rem', color: '#091A1E', fontWeight: 700 }}
                    onClick={() => setShowFormatPicker(!showFormatPicker)}
                  >
                    + Add to shelf
                  </button>
                  {showFormatPicker && (
                    <div 
                      className="glass" 
                      style={{ 
                        position: 'absolute', 
                        top: '100%', 
                        left: 0, 
                        marginTop: '0.5rem', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '0.25rem', 
                        padding: '0.5rem', 
                        zIndex: 100, 
                        width: '130px', 
                        boxShadow: '0 5px 15px rgba(0,0,0,0.5)' 
                      }}
                    >
                      {(['physical', 'ebook', 'audiobook', 'library'] as const).map(fmt => (
                        <button 
                          key={fmt} 
                          className="btn btn-text" 
                          style={{ padding: '0.3rem', fontSize: '0.72rem', textAlign: 'left', width: '100%' }}
                          onClick={() => handleAddToShelf(fmt)}
                        >
                          {fmt.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Restructured Main Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-glass)', marginTop: '1rem', gap: '1.5rem' }}>
          <button 
            className={`btn-text ${activeTab === 'about' ? 'active' : ''}`}
            onClick={() => setActiveTab('about')}
            style={{ borderBottom: activeTab === 'about' ? '2px solid var(--accent-primary)' : 'none', borderRadius: 0, padding: '0.75rem 0', fontWeight: 600 }}
          >
            About
          </button>
          {!isShelfBook && (
            <button 
              className={`btn-text ${activeTab === 'reviews' ? 'active' : ''}`}
              onClick={() => setActiveTab('reviews')}
              style={{ borderBottom: activeTab === 'reviews' ? '2px solid var(--accent-primary)' : 'none', borderRadius: 0, padding: '0.75rem 0', fontWeight: 600 }}
            >
              Reviews ({totalRatingCount > 1000 ? 'Curated' : reviewsResponse?.reviews.length || 0})
            </button>
          )}
          <button 
            className={`btn-text ${activeTab === 'similar' ? 'active' : ''}`}
            onClick={() => setActiveTab('similar')}
            style={{ borderBottom: activeTab === 'similar' ? '2px solid var(--accent-primary)' : 'none', borderRadius: 0, padding: '0.75rem 0', fontWeight: 600 }}
          >
            Similar Books
          </button>
        </div>

        {/* Tab Contents */}
        <div style={{ flexGrow: 1, overflowY: 'auto', padding: '1.25rem 0', maxHeight: '55vh' }}>
          
          {/* ABOUT TAB */}
          {activeTab === 'about' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Description</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {book.description || 'No description available for this book.'}
                </p>
              </div>

              {/* Book Metadata Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.01)', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Publisher</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '0.2rem' }}>{book.publisher || 'Unknown'}</div>
                </div>
                {book.publishedDate && (
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Published Date</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                      {format(new Date(book.publishedDate), 'MMMM dd, yyyy')}
                    </div>
                  </div>
                )}
                {book.pageCount && (
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Length</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '0.2rem' }}>{book.pageCount} pages</div>
                  </div>
                )}
                {book.isbn && (
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>ISBN-13</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '0.2rem' }}>{book.isbn}</div>
                  </div>
                )}
              </div>

              {/* If Shelf Book: Show reading progress + Collapsible Notes/Sessions/Manage panels */}
              {isShelfBook && shelfBook && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid var(--border-glass)', paddingTop: '1.25rem' }}>
                  
                  {/* Progress panel */}
                  <div className="glass" style={{ padding: '1rem' }}>
                    <div className="flex-between" onClick={() => setShowProgressSection(!showProgressSection)} style={{ cursor: 'pointer' }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Clock size={14} style={{ color: 'var(--accent-primary)' }} />
                        Your Shelf Progress
                      </h4>
                      {showProgressSection ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </div>
                    {showProgressSection && (
                      <div style={{ marginTop: '0.75rem' }}>
                        <div className="flex-between" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                          <span>Page {shelfBook.currentPage} of {shelfBook.pageCount}</span>
                          <span>{shelfBook.progressPercentage}%</span>
                        </div>
                        <div className="progress-bar-container" style={{ height: '6px' }}>
                          <div className="progress-bar-fill" style={{ width: `${shelfBook.progressPercentage}%` }}></div>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {shelfBook.dateStarted && <span>Started: {format(new Date(shelfBook.dateStarted), 'MMM dd, yyyy')}</span>}
                          {shelfBook.dateFinished && <span>Finished: {format(new Date(shelfBook.dateFinished), 'MMM dd, yyyy')}</span>}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Notes Collapsible Section */}
                  <div className="glass" style={{ padding: '1rem' }}>
                    <div className="flex-between" onClick={() => setShowNotesSection(!showNotesSection)} style={{ cursor: 'pointer' }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Bookmark size={14} style={{ color: 'var(--color-on-hold)' }} />
                        Notes & Quotes ({bookNotes.length})
                      </h4>
                      {showNotesSection ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </div>
                    {showNotesSection && (
                      <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {/* Rich Text Note Form */}
                        <form onSubmit={noteForm.handleSubmit(handleAddNoteSubmit)} className="glass" style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(255,255,255,0.01)' }}>
                          <Controller
                            name="content"
                            control={noteForm.control}
                            render={({ field }) => (
                              <Editor
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="Write a note or quote..."
                              />
                            )}
                          />
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <select className="form-select" style={{ width: '110px', padding: '0.35rem' }} {...noteForm.register('type')}>
                              <option value="note">Note</option>
                              <option value="quote">Quote</option>
                              <option value="bookmark">Bookmark</option>
                            </select>
                            <input type="number" className="form-input" style={{ width: '70px', padding: '0.35rem' }} placeholder="Page" {...noteForm.register('pageNumber', { valueAsNumber: true })} />
                            <input type="text" className="form-input" style={{ flexGrow: 1, padding: '0.35rem' }} placeholder="Tags..." {...noteForm.register('tags')} />
                            <button type="submit" className="btn btn-primary" style={{ padding: '0.35rem 0.75rem', color: '#091A1E', fontWeight: 700 }}>Add</button>
                          </div>
                        </form>
                        {/* Notes list */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {bookNotes.map(n => (
                            <div key={n.id} className="glass" style={{ padding: '0.75rem', fontSize: '0.85rem' }}>
                              <div className="flex-between" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                <span style={{ color: 'var(--accent-primary)', textTransform: 'uppercase' }}>{n.type} {n.pageNumber && `• p. ${n.pageNumber}`}</span>
                                <span>{format(new Date(n.createdAt), 'MMM dd, yyyy')}</span>
                              </div>
                              <div dangerouslySetInnerHTML={{ __html: n.content }} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Reading History Collapsible Section */}
                  <div className="glass" style={{ padding: '1rem' }}>
                    <div className="flex-between" onClick={() => setShowSessionsSection(!showSessionsSection)} style={{ cursor: 'pointer' }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Clock size={14} style={{ color: 'var(--color-reading)' }} />
                        Reading Sessions ({bookSessions.length})
                      </h4>
                      {showSessionsSection ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </div>
                    {showSessionsSection && (
                      <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <button className="btn btn-secondary" style={{ width: 'fit-content', padding: '0.35rem 0.75rem', fontSize: '0.75rem' }} onClick={() => setShowLogPast(!showLogPast)}>
                          {showLogPast ? 'Cancel' : 'Log Past Session'}
                        </button>
                        {showLogPast && (
                          <form onSubmit={logPastForm.handleSubmit(handleLogPastSessionSubmit)} className="glass" style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                              <input type="date" className="form-input" style={{ padding: '0.35rem' }} {...logPastForm.register('pastDate')} />
                              <input type="number" className="form-input" style={{ padding: '0.35rem' }} placeholder="Min" {...logPastForm.register('pastDuration', { valueAsNumber: true })} />
                              <input type="number" className="form-input" style={{ padding: '0.35rem' }} placeholder="Pages" {...logPastForm.register('pastPagesRead', { valueAsNumber: true })} />
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ padding: '0.35rem', color: '#091A1E', fontWeight: 700 }}>Save Log</button>
                          </form>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {bookSessions.map(s => (
                            <div key={s.id} className="glass" style={{ padding: '0.75rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                              <div>
                                <span style={{ fontWeight: 700 }}>{s.pagesRead} pages read</span> in {s.durationMinutes} min
                              </div>
                              <span style={{ color: 'var(--text-muted)' }}>{format(new Date(s.startTime), 'MMM dd, yyyy')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Edit/Delete settings collapsible */}
                  <div className="glass" style={{ padding: '1rem' }}>
                    <div className="flex-between" onClick={() => setShowEditSection(!showEditSection)} style={{ cursor: 'pointer' }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Info size={14} style={{ color: 'var(--text-muted)' }} />
                        Edit Shelf Configuration
                      </h4>
                      {showEditSection ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </div>
                    {showEditSection && (
                      <form onSubmit={editBookForm.handleSubmit(handleUpdateBookSubmit)} style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                          <input type="text" className="form-input" {...editBookForm.register('title')} placeholder="Title" />
                          <input type="text" className="form-input" {...editBookForm.register('author')} placeholder="Author" />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                          <select className="form-select" {...editBookForm.register('format')}>
                            <option value="physical">Physical</option>
                            <option value="ebook">Ebook</option>
                            <option value="audiobook">Audiobook</option>
                            <option value="library">Library</option>
                          </select>
                          <select className="form-select" {...editBookForm.register('status')}>
                            <option value="to-read">TBR</option>
                            <option value="reading">Reading</option>
                            <option value="finished">Finished</option>
                          </select>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-glass)', paddingTop: '0.75rem' }}>
                          <button type="button" className="btn btn-secondary" style={{ color: 'var(--color-dnf)', borderColor: 'rgba(239,68,68,0.2)' }} onClick={handleDelete}>
                            <Trash2 size={12} /> Delete Book
                          </button>
                          <button type="submit" className="btn btn-primary" style={{ color: '#091A1E', fontWeight: 700 }}>Save Changes</button>
                        </div>
                      </form>
                    )}
                  </div>

                </div>
              )}
            </div>
          )}

          {/* REVIEWS TAB (COMPONENT A) */}
          {activeTab === 'reviews' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Write/Edit Your Review Bar */}
              {reviewsResponse && (
                <div 
                  className="glass" 
                  style={{ 
                    padding: '0.75rem 1rem', 
                    background: 'rgba(139, 92, 246, 0.03)', 
                    border: '1px solid rgba(139, 92, 246, 0.15)',
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    fontSize: '0.85rem' 
                  }}
                >
                  {reviewsResponse.user_review ? (
                    <>
                      <span>
                        Your rating: <strong>{reviewsResponse.user_review.starRating} Stars</strong>
                        {reviewsResponse.user_review.isShared && ' (Shared)'}
                      </span>
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button 
                          className="btn btn-text" 
                          style={{ padding: 0, fontWeight: 700, color: 'var(--accent-primary)' }}
                          onClick={() => setFinishedBookToRate(shelfBook)}
                        >
                          Edit your review
                        </button>
                        <button 
                          className="btn btn-text" 
                          style={{ padding: 0, color: 'var(--color-dnf)', fontSize: '0.8rem' }}
                          onClick={() => handleDeleteReview(reviewsResponse.user_review!.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span>You haven't reviewed this book yet.</span>
                      {isShelfBook && shelfBook?.status === 'finished' ? (
                        <button 
                          className="btn btn-text animate-pulse-glow" 
                          style={{ padding: 0, fontWeight: 700, color: 'var(--accent-primary)' }}
                          onClick={() => setFinishedBookToRate(shelfBook)}
                        >
                          Write a review
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Finish book to review it</span>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Sentiment Summary Bar (Component A2) */}
              <div className="glass" style={{ padding: '0.85rem 1rem', background: 'rgba(255,255,255,0.01)' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Reader sentiment across all sources
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
                    <span style={{ width: '50px', color: 'var(--text-muted)' }}>Positive</span>
                    <div style={{ flexGrow: 1, height: '5px', background: 'rgba(255,255,255,0.03)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${reviewsResponse?.sentiment.positive || 72}%`, height: '100%', background: '#10b981' }}></div>
                    </div>
                    <span style={{ width: '30px', textAlign: 'right', fontWeight: 600 }}>{reviewsResponse?.sentiment.positive || 72}%</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
                    <span style={{ width: '50px', color: 'var(--text-muted)' }}>Neutral</span>
                    <div style={{ flexGrow: 1, height: '5px', background: 'rgba(255,255,255,0.03)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${reviewsResponse?.sentiment.neutral || 18}%`, height: '100%', background: '#6b7280' }}></div>
                    </div>
                    <span style={{ width: '30px', textAlign: 'right', fontWeight: 600 }}>{reviewsResponse?.sentiment.neutral || 18}%</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
                    <span style={{ width: '50px', color: 'var(--text-muted)' }}>Critical</span>
                    <div style={{ flexGrow: 1, height: '5px', background: 'rgba(255,255,255,0.03)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${reviewsResponse?.sentiment.critical || 10}%`, height: '100%', background: '#ef4444' }}></div>
                    </div>
                    <span style={{ width: '30px', textAlign: 'right', fontWeight: 600 }}>{reviewsResponse?.sentiment.critical || 10}%</span>
                  </div>
                </div>
              </div>

              {/* Source Filter Tabs (Component A3) */}
              <div style={{ overflowX: 'auto', display: 'flex', gap: '0.5rem', paddingBottom: '0.25rem', scrollbarWidth: 'none' }}>
                {['All', 'Goodreads', 'NYT', 'The Guardian', 'LibraryThing', 'Amazon', ...(hasFriendReviews ? ['Your friends'] : [])].map(src => {
                  const isActive = selectedSource === src;
                  return (
                    <button
                      key={src}
                      type="button"
                      onClick={() => setSelectedSource(src)}
                      style={{
                        padding: '0.4rem 0.8rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        borderRadius: '16px',
                        border: '1px solid',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        backgroundColor: isActive ? 'rgba(212, 178, 111, 0.12)' : 'rgba(255,255,255,0.01)',
                        borderColor: isActive ? 'var(--accent-primary)' : 'var(--border-glass)',
                        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {src}
                    </button>
                  );
                })}
              </div>

              {/* Loader or Reviews List (Component A4) */}
              {isReviewsLoading || (reviewsResponse?.status === 'fetching') ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '120px', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                  <Loader2 className="animate-spin" size={24} style={{ color: 'var(--accent-primary)' }} />
                  <span style={{ fontSize: '0.85rem' }}>Fetching reviews across sources...</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {reviewsResponse?.reviews.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>No reviews found for this filter.</p>
                  ) : (
                    reviewsResponse?.reviews.map((rev) => (
                      <div 
                        key={rev.id} 
                        className="glass" 
                        style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(255,255,255,0.01)' }}
                      >
                        <div className="flex-between">
                          <span 
                            style={{ 
                              fontSize: '0.65rem', 
                              padding: '0.15rem 0.5rem', 
                              borderRadius: '12px', 
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.03em',
                              ...getSourceBadgeStyle(rev.source)
                            }}
                          >
                            {rev.source}
                          </span>
                          
                          {rev.starRating && (
                            <div style={{ display: 'flex' }}>
                              {renderRatingStars(rev.starRating)}
                            </div>
                          )}
                        </div>

                        <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                          {rev.excerpt}
                          {rev.excerpt.length > 150 && (
                            <button
                              className="btn-text"
                              style={{ marginLeft: '4px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-primary)', padding: 0 }}
                              onClick={() => setSelectedFullReview(rev)}
                            >
                              Read more
                            </button>
                          )}
                        </p>

                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {rev.reviewerType === 'community' 
                            ? `Verified reader · ${rev.helpfulVotes || 0} helpful votes` 
                            : `${rev.source.toUpperCase()} Critic Review`
                          }
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Rating Distribution (Component A5) */}
              <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--border-glass)', paddingTop: '0.75rem' }}>
                <button 
                  className="btn btn-text"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: 0, fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}
                  onClick={() => setIsBreakdownExpanded(!isBreakdownExpanded)}
                >
                  {isBreakdownExpanded ? 'Hide rating breakdown' : 'See rating breakdown'}
                  <ChevronDown size={12} style={{ transform: isBreakdownExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>
                
                {isBreakdownExpanded && (
                  <div 
                    className="glass"
                    style={{ 
                      marginTop: '0.75rem',
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '0.4rem', 
                      padding: '0.85rem 1rem', 
                      background: 'rgba(255,255,255,0.01)' 
                    }}
                  >
                    {Object.entries(reviewsAggregate?.ratingDistribution || {5: 54, 4: 32, 3: 9, 2: 3, 1: 2})
                      .sort((a, b) => parseInt(b[0]) - parseInt(a[0]))
                      .map(([stars, pct]) => (
                        <div key={stars} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
                          <span style={{ width: '45px', color: 'var(--text-secondary)' }}>{stars} stars</span>
                          <div style={{ flexGrow: 1, height: '6px', background: 'rgba(255,255,255,0.03)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: 'var(--color-on-hold)' }}></div>
                          </div>
                          <span style={{ width: '25px', textAlign: 'right', fontWeight: 600 }}>{pct}%</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* SIMILAR BOOKS TAB */}
          {activeTab === 'similar' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.25rem' }}>Recommendations based on genres</h3>
              {similarBooks.map((b, idx) => (
                <div key={idx} className="glass" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.01)' }}>
                  <img src={b.coverUrl} style={{ width: '32px', height: '48px', objectFit: 'cover', borderRadius: '3px' }} alt={b.title} />
                  <div style={{ flexGrow: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>by {b.author} • {b.reason}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', flexShrink: 0 }}>
                    <Star size={12} fill="var(--color-on-hold)" style={{ color: 'var(--color-on-hold)' }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{b.rating}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Read More Bottom Sheet Overlay */}
        {selectedFullReview && (
          <div 
            className="modal-overlay" 
            style={{ zIndex: 2600, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
            onClick={() => setSelectedFullReview(null)}
          >
            <div 
              className="glass" 
              style={{ 
                width: '100%', 
                maxWidth: '500px', 
                background: 'rgba(9, 26, 30, 0.98)', 
                backdropFilter: 'blur(20px)',
                border: '1px solid var(--border-glass-focus)',
                borderRadius: '16px 16px 0 0',
                padding: '1.5rem',
                boxShadow: '0 -5px 25px rgba(0,0,0,0.6)',
                animation: 'slideUp 0.25s ease-out'
              }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex-between" style={{ marginBottom: '1rem' }}>
                <span 
                  style={{ 
                    fontSize: '0.7rem', 
                    padding: '0.15rem 0.5rem', 
                    borderRadius: '12px', 
                    fontWeight: 700,
                    ...getSourceBadgeStyle(selectedFullReview.source)
                  }}
                >
                  {selectedFullReview.source} Review
                </span>
                <button className="btn-text" style={{ padding: 0 }} onClick={() => setSelectedFullReview(null)}>
                  <X size={16} />
                </button>
              </div>

              <div style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '0.5rem', scrollbarWidth: 'thin' }}>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                  {selectedFullReview.excerpt}
                </p>
              </div>

              {selectedFullReview.sourceUrl && (
                <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border-glass)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <a 
                    href={selectedFullReview.sourceUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn btn-text"
                    style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600, padding: 0 }}
                  >
                    Read on {selectedFullReview.source}
                    <ExternalLink size={12} />
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
