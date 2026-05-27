import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { 
  useBooks, 
  useSessions, 
  useNotes, 
  useShelves, 
  useUpdateBook, 
  useDeleteBook, 
  useAddNote, 
  useAddSession 
} from '../hooks/queries';
import { X, Plus, Clock, Bookmark, Info, Edit3, Trash2, Calendar, Star, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Editor } from './Editor';

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
  const { data: books = [] } = useBooks();
  const { data: sessions = [] } = useSessions();
  const { data: notes = [] } = useNotes();
  const { data: shelves = [] } = useShelves();

  const updateBookMutation = useUpdateBook();
  const deleteBookMutation = useDeleteBook();
  const addNoteMutation = useAddNote();
  const addSessionMutation = useAddSession();

  const book = books.find(b => b.id === bookId);

  const [activeTab, setActiveTab] = useState<'notes' | 'sessions' | 'edit'>('notes');
  const [showLogPast, setShowLogPast] = useState(false);

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
    }
  });

  // Populate edit form when book loads
  useEffect(() => {
    if (book) {
      editBookForm.reset({
        title: book.title,
        author: book.author,
        format: book.format,
        status: book.status,
        currentPage: book.currentPage,
        pageCount: book.pageCount,
        platform: book.platform || '',
        shelfLocation: book.metadata?.shelfLocation || '',
        dueDate: book.metadata?.dueDate ? book.metadata.dueDate.substring(0, 10) : '',
        customShelfIds: book.customShelfIds || [],
      });
    }
  }, [book, editBookForm]);

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

  const bookSessions = sessions.filter(s => s.bookId === book.id);
  const bookNotes = notes.filter(n => n.bookId === book.id);

  const handleAddNoteSubmit = async (values: NoteFormValues) => {
    try {
      await addNoteMutation.mutateAsync({
        bookId: book.id,
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
    try {
      await updateBookMutation.mutateAsync({
        id: book.id,
        updates: {
          title: values.title,
          author: values.author,
          status: values.status,
          format: values.format,
          currentPage: values.currentPage,
          pageCount: values.pageCount,
          customShelfIds: values.customShelfIds,
          platform: values.platform || null,
          metadata: {
            ...book.metadata,
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
    const start = new Date(values.pastDate);
    const end = new Date(start.getTime() + values.pastDuration * 60000);

    const startPage = book.currentPage;
    const endPage = book.currentPage + values.pastPagesRead;

    try {
      await addSessionMutation.mutateAsync({
        bookId: book.id,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        durationMinutes: values.pastDuration,
        pagesStart: startPage,
        pagesEnd: endPage,
        pagesRead: values.pastPagesRead,
        formatUsed: book.format,
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
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to record past session.');
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

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to permanently delete "${book.title}"?`)) {
      try {
        await deleteBookMutation.mutateAsync(book.id);
        onClose();
      } catch (err: any) {
        alert(err.response?.data?.error || 'Failed to delete book.');
      }
    }
  };

  const editFormatType = editBookForm.watch('format');
  const editBookShelves = editBookForm.watch('customShelfIds') || [];
  const noteIsFavorite = noteForm.watch('isFavorite');

  return (
    <div className="modal-overlay" style={{ zIndex: 110 }}>
      <div className="modal-content glass animate-fade-in" style={{ maxWidth: '750px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <button className="modal-close" onClick={onClose}>
          <X size={18} />
        </button>

        {/* Header Summary */}
        <div style={{ display: 'flex', gap: '1.5rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '1.25rem' }}>
          <img 
            src={book.coverUrl || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=100'} 
            alt={book.title} 
            style={{ width: '80px', height: '120px', borderRadius: '6px', objectFit: 'cover' }} 
            onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=100' }}
          />
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-display)', margin: 0 }}>{book.title}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>by {book.author}</p>
            
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
              <span className={`badge-format ${book.format}`}>{book.format.toUpperCase()}</span>
              <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                Progress: {book.progressPercentage}% ({book.currentPage}/{book.pageCount} pages)
              </span>
            </div>
          </div>
        </div>

        {/* Nav Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-glass)', marginTop: '1rem', gap: '1.5rem' }}>
          <button 
            className={`btn-text ${activeTab === 'notes' ? 'active' : ''}`}
            onClick={() => setActiveTab('notes')}
            style={{ borderBottom: activeTab === 'notes' ? '2px solid var(--accent-primary)' : 'none', borderRadius: 0, padding: '0.75rem 0', fontWeight: 600 }}
          >
            Notes & Quotes ({bookNotes.length})
          </button>
          <button 
            className={`btn-text ${activeTab === 'sessions' ? 'active' : ''}`}
            onClick={() => setActiveTab('sessions')}
            style={{ borderBottom: activeTab === 'sessions' ? '2px solid var(--accent-primary)' : 'none', borderRadius: 0, padding: '0.75rem 0', fontWeight: 600 }}
          >
            History & Sessions ({bookSessions.length})
          </button>
          <button 
            className={`btn-text ${activeTab === 'edit' ? 'active' : ''}`}
            onClick={() => setActiveTab('edit')}
            style={{ borderBottom: activeTab === 'edit' ? '2px solid var(--accent-primary)' : 'none', borderRadius: 0, padding: '0.75rem 0', fontWeight: 600 }}
          >
            Manage Book
          </button>
        </div>

        {/* Tab Contents */}
        <div style={{ flexGrow: 1, overflowY: 'auto', padding: '1.25rem 0', maxHeight: '45vh' }}>
          
          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Add Note Form */}
              <form onSubmit={noteForm.handleSubmit(handleAddNoteSubmit)} className="glass" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'rgba(255,255,255,0.02)' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Capture a new moment (Rich Text Note)</h4>
                
                <Controller
                  name="content"
                  control={noteForm.control}
                  render={({ field }) => (
                    <Editor
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={noteForm.watch('type') === 'quote' ? "Paste or write the quote..." : "What are you thinking?"}
                    />
                  )}
                />
                {noteForm.formState.errors.content && <span style={{ color: 'var(--color-dnf)', fontSize: '0.75rem' }}>{noteForm.formState.errors.content.message}</span>}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
                  <select 
                    className="form-select" 
                    style={{ width: '130px', padding: '0.45rem' }}
                    {...noteForm.register('type')}
                  >
                    <option value="note">Text Note</option>
                    <option value="quote">Quote</option>
                    <option value="bookmark">Bookmark</option>
                  </select>
                  
                  <input 
                    type="number" 
                    className="form-input" 
                    style={{ width: '90px', padding: '0.45rem' }} 
                    placeholder="Page"
                    {...noteForm.register('pageNumber', { valueAsNumber: true })}
                  />

                  <input 
                    type="text" 
                    className="form-input" 
                    style={{ flexGrow: 1, minWidth: '150px', padding: '0.45rem' }} 
                    placeholder="Tags (comma separated)"
                    {...noteForm.register('tags')}
                  />

                  <button 
                    type="button"
                    onClick={() => noteForm.setValue('isFavorite', !noteIsFavorite)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: noteIsFavorite ? 'var(--color-on-hold)' : 'var(--text-muted)' }}
                    title="Toggle Favorite"
                  >
                    <Star size={20} fill={noteIsFavorite ? 'currentColor' : 'none'} />
                  </button>

                  <button type="submit" className="btn btn-primary" style={{ padding: '0.45rem 1rem', color: '#091A1E', fontWeight: 700 }} disabled={addNoteMutation.isPending}>
                    {addNoteMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={14} />} Add
                  </button>
                </div>
              </form>

              {/* Notes List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {bookNotes.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.9rem', padding: '1rem' }}>No notes written yet. Start capturing!</p>
                ) : (
                  bookNotes.map((note) => (
                    <div key={note.id} className="glass" style={{ padding: '1rem', borderLeft: note.type === 'quote' ? '3px solid var(--accent-primary)' : '1px solid var(--border-glass)' }}>
                      <div className="flex-between" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                        <span style={{ textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.02em', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          {note.isFavorite && <Star size={10} fill="var(--color-on-hold)" style={{ color: 'var(--color-on-hold)' }} />}
                          {note.type} {note.pageNumber && `• Page ${note.pageNumber}`}
                        </span>
                        <span>{format(new Date(note.createdAt), 'MMM dd, yyyy')}</span>
                      </div>
                      
                      <div 
                        style={{ 
                          fontSize: '0.9rem', 
                          fontStyle: note.type === 'quote' ? 'italic' : 'normal',
                          lineHeight: 1.5,
                          color: note.type === 'quote' ? 'var(--text-primary)' : 'var(--text-secondary)'
                        }}
                        dangerouslySetInnerHTML={{ __html: note.content }}
                      />

                      {note.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.5rem' }}>
                          {note.tags.map(t => (
                            <span key={t} style={{ fontSize: '0.7rem', padding: '0.1rem 0.35rem', borderRadius: '4px', background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)' }}>
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Sessions Tab */}
          {activeTab === 'sessions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="flex-between">
                <h4 style={{ fontSize: '1rem' }}>Reading History</h4>
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                  onClick={() => setShowLogPast(!showLogPast)}
                >
                  {showLogPast ? 'Cancel' : 'Log Past Session'}
                </button>
              </div>

              {/* Log Past Form */}
              {showLogPast && (
                <form onSubmit={logPastForm.handleSubmit(handleLogPastSessionSubmit)} className="glass" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <h5 style={{ fontWeight: 700, fontSize: '0.85rem' }}>Log a past session</h5>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Date</label>
                      <input type="date" className="form-input" style={{ padding: '0.4rem' }} {...logPastForm.register('pastDate')} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Duration (min)</label>
                      <input type="number" className="form-input" style={{ padding: '0.4rem' }} {...logPastForm.register('pastDuration', { valueAsNumber: true })} />
                      {logPastForm.formState.errors.pastDuration && <span style={{ color: 'var(--color-dnf)', fontSize: '0.7rem' }}>{logPastForm.formState.errors.pastDuration.message}</span>}
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Pages Read</label>
                      <input type="number" className="form-input" style={{ padding: '0.4rem' }} {...logPastForm.register('pastPagesRead', { valueAsNumber: true })} />
                      {logPastForm.formState.errors.pastPagesRead && <span style={{ color: 'var(--color-dnf)', fontSize: '0.7rem' }}>{logPastForm.formState.errors.pastPagesRead.message}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Location</label>
                      <input type="text" className="form-input" style={{ padding: '0.4rem' }} {...logPastForm.register('pastLocation')} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Mood After</label>
                      <select className="form-select" style={{ padding: '0.4rem' }} {...logPastForm.register('pastMood')}>
                        <option value="focused">Focused</option>
                        <option value="inspired">Inspired</option>
                        <option value="relaxed">Relaxed</option>
                        <option value="tired">Tired</option>
                        <option value="neutral">Neutral</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                    <button type="submit" className="btn btn-primary" style={{ padding: '0.45rem 1rem', fontSize: '0.8rem', color: '#091A1E', fontWeight: 700 }} disabled={addSessionMutation.isPending}>
                      {addSessionMutation.isPending ? 'Saving...' : 'Save Log'}
                    </button>
                  </div>
                </form>
              )}

              {/* Sessions List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {bookSessions.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.9rem', padding: '1rem' }}>No logged reading sessions yet.</p>
                ) : (
                  bookSessions.map((session) => (
                    <div key={session.id} className="glass" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Read {session.pagesRead} pages / min</span>
                          <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.4rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                            p. {session.pagesStart} - {session.pagesEnd}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'flex', gap: '0.5rem' }}>
                          <span>⏱️ {session.durationMinutes} min</span>
                          <span>📍 {session.location}</span>
                          <span>😊 {session.moodAfter}</span>
                        </p>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'right' }}>
                        <div>{format(new Date(session.startTime), 'MMM dd, yyyy')}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                          {format(new Date(session.startTime), 'h:mm a')}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Manage Tab */}
          {activeTab === 'edit' && (
            <form onSubmit={editBookForm.handleSubmit(handleUpdateBookSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Title</label>
                  <input type="text" className="form-input" {...editBookForm.register('title')} />
                  {editBookForm.formState.errors.title && <span style={{ color: 'var(--color-dnf)', fontSize: '0.75rem' }}>{editBookForm.formState.errors.title.message}</span>}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Author</label>
                  <input type="text" className="form-input" {...editBookForm.register('author')} />
                  {editBookForm.formState.errors.author && <span style={{ color: 'var(--color-dnf)', fontSize: '0.75rem' }}>{editBookForm.formState.errors.author.message}</span>}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Format</label>
                  <select className="form-select" {...editBookForm.register('format')}>
                    <option value="physical">Physical Book</option>
                    <option value="ebook">Ebook</option>
                    <option value="audiobook">Audiobook</option>
                    <option value="library">Library Loan</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Reading Status</label>
                  <select className="form-select" {...editBookForm.register('status')}>
                    <option value="to-read">To Read (TBR)</option>
                    <option value="reading">Currently Reading</option>
                    <option value="finished">Finished</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Current Page / Minutes</label>
                  <input type="number" className="form-input" {...editBookForm.register('currentPage', { valueAsNumber: true })} />
                  {editBookForm.formState.errors.currentPage && <span style={{ color: 'var(--color-dnf)', fontSize: '0.75rem' }}>{editBookForm.formState.errors.currentPage.message}</span>}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Total Pages / Minutes</label>
                  <input type="number" className="form-input" {...editBookForm.register('pageCount', { valueAsNumber: true })} />
                  {editBookForm.formState.errors.pageCount && <span style={{ color: 'var(--color-dnf)', fontSize: '0.75rem' }}>{editBookForm.formState.errors.pageCount.message}</span>}
                </div>
              </div>

              {editFormatType === 'physical' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Shelf Location (e.g. Living Room Shelf A)</label>
                  <input type="text" className="form-input" placeholder="Living Room Shelf A" {...editBookForm.register('shelfLocation')} />
                </div>
              )}

              {editFormatType === 'library' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Due Date</label>
                  <input type="date" className="form-input" {...editBookForm.register('dueDate')} />
                </div>
              )}

              {/* Collections Checkboxes */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Collections / Shelves</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {shelves.map(shelf => {
                    const isSelected = editBookShelves.includes(shelf.id);
                    return (
                      <button
                        key={shelf.id}
                        type="button"
                        onClick={() => toggleShelfSelection(shelf.id)}
                        style={{
                          padding: '0.4rem 0.75rem',
                          fontSize: '0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid',
                          cursor: 'pointer',
                          backgroundColor: isSelected ? `${shelf.color}25` : 'transparent',
                          borderColor: isSelected ? shelf.color : 'var(--border-glass)',
                          color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {shelf.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-glass)', paddingTop: '1.25rem', marginTop: '1rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ color: 'var(--color-dnf)', borderColor: 'rgba(239, 68, 68, 0.2)', display: 'flex', gap: '0.25rem', alignItems: 'center' }}
                  onClick={handleDelete}
                  disabled={deleteBookMutation.isPending}
                >
                  {deleteBookMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Delete Book
                </button>
                <button type="submit" className="btn btn-primary" style={{ color: '#091A1E', fontWeight: 700 }} disabled={updateBookMutation.isPending}>
                  {updateBookMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
