import React, { useState } from 'react';
import { useStore, Book } from '../store';
import { X, Plus, Clock, Bookmark, Info, Edit3, Trash2, Calendar, Star } from 'lucide-react';
import { format } from 'date-fns';

interface BookDetailModalProps {
  bookId: string;
  onClose: () => void;
}

export const BookDetailModal: React.FC<BookDetailModalProps> = ({ bookId, onClose }) => {
  const { 
    books, sessions, notes, shelves, updateBook, deleteBook, addNote, addSession 
  } = useStore();

  const book = books.find(b => b.id === bookId);
  if (!book) return null;

  const [activeTab, setActiveTab] = useState<'notes' | 'sessions' | 'edit'>('notes');
  
  // Note Form
  const [noteContent, setNoteContent] = useState('');
  const [noteType, setNoteType] = useState<'note' | 'quote' | 'bookmark'>('note');
  const [notePage, setNotePage] = useState<number | ''>('');
  const [noteTags, setNoteTags] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);

  // Edit Book Form
  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author);
  const [status, setStatus] = useState(book.status);
  const [formatType, setFormatType] = useState(book.format);
  const [currentPage, setCurrentPage] = useState(book.current_page);
  const [pageCount, setPageCount] = useState(book.page_count);
  const [shelfLocation, setShelfLocation] = useState(book.metadata.shelf_location || '');
  const [dueDate, setDueDate] = useState(book.metadata.due_date ? book.metadata.due_date.substring(0,10) : '');
  const [bookShelves, setBookShelves] = useState<string[]>(book.custom_shelf_ids);

  // Log Past Session Form
  const [showLogPast, setShowLogPast] = useState(false);
  const [pastDate, setPastDate] = useState(new Date().toISOString().substring(0,10));
  const [pastDuration, setPastDuration] = useState<number>(30);
  const [pastPagesRead, setPastPagesRead] = useState<number>(15);
  const [pastLocation, setPastLocation] = useState('Home');
  const [pastMood, setPastMood] = useState('focused');

  const bookSessions = sessions.filter(s => s.book_id === book.id);
  const bookNotes = notes.filter(n => n.book_id === book.id);

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;

    addNote({
      book_id: book.id,
      type: noteType,
      content: noteContent,
      page_number: notePage !== '' ? notePage : undefined,
      tags: noteTags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean),
      is_favorite: isFavorite
    });

    setNoteContent('');
    setNotePage('');
    setNoteTags('');
    setIsFavorite(false);
  };

  const handleUpdateBook = (e: React.FormEvent) => {
    e.preventDefault();
    updateBook(book.id, {
      title,
      author,
      status,
      format: formatType,
      current_page: currentPage,
      page_count: pageCount,
      custom_shelf_ids: bookShelves,
      metadata: {
        ...book.metadata,
        shelf_location: formatType === 'physical' ? shelfLocation : undefined,
        due_date: formatType === 'library' && dueDate ? new Date(dueDate).toISOString() : undefined
      }
    });
    alert('Book updated successfully!');
  };

  const handleLogPastSession = (e: React.FormEvent) => {
    e.preventDefault();
    
    const start = new Date(pastDate);
    const end = new Date(start.getTime() + pastDuration * 60000);

    const startPage = book.current_page;
    const endPage = book.current_page + pastPagesRead;

    addSession({
      book_id: book.id,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      duration_minutes: pastDuration,
      pages_start: startPage,
      pages_end: endPage,
      pages_read: pastPagesRead,
      format_used: book.format,
      location: pastLocation,
      mood_before: 'neutral',
      mood_after: pastMood
    });

    setShowLogPast(false);
    setPastPagesRead(15);
    setPastDuration(30);
  };

  const toggleShelfSelection = (shelfId: string) => {
    if (bookShelves.includes(shelfId)) {
      setBookShelves(bookShelves.filter(id => id !== shelfId));
    } else {
      setBookShelves([...bookShelves, shelfId]);
    }
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to permanently delete "${book.title}"?`)) {
      deleteBook(book.id);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 110 }}>
      <div className="modal-content glass animate-fade-in" style={{ maxWidth: '750px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <button className="modal-close" onClick={onClose}>
          <X size={18} />
        </button>

        {/* Header Summary */}
        <div style={{ display: 'flex', gap: '1.5rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '1.25rem' }}>
          <img 
            src={book.cover_url} 
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
                Progress: {book.progress_percentage}% ({book.current_page}/{book.page_count} pages)
              </span>
            </div>
          </div>
        </div>

        {/* Nav Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-glass)', marginTop: '1rem', gap: '1.5rem' }}>
          <button 
            className={`btn-text ${activeTab === 'notes' ? 'active' : ''}`}
            onClick={() => setActiveTab('notes')}
            style={{ borderBottom: activeTab === 'notes' ? '2px solid var(--accent-primary)' : 'none', borderRadius: 0, padding: '0.75rem 0' }}
          >
            Notes & Quotes ({bookNotes.length})
          </button>
          <button 
            className={`btn-text ${activeTab === 'sessions' ? 'active' : ''}`}
            onClick={() => setActiveTab('sessions')}
            style={{ borderBottom: activeTab === 'sessions' ? '2px solid var(--accent-primary)' : 'none', borderRadius: 0, padding: '0.75rem 0' }}
          >
            History & Sessions ({bookSessions.length})
          </button>
          <button 
            className={`btn-text ${activeTab === 'edit' ? 'active' : ''}`}
            onClick={() => setActiveTab('edit')}
            style={{ borderBottom: activeTab === 'edit' ? '2px solid var(--accent-primary)' : 'none', borderRadius: 0, padding: '0.75rem 0' }}
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
              <form onSubmit={handleAddNote} className="glass" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'rgba(255,255,255,0.02)' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Capture a new moment</h4>
                <textarea 
                  className="form-textarea" 
                  rows={2} 
                  placeholder={noteType === 'quote' ? "Paste or write the quote..." : "What are you thinking?"}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  required
                />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
                  <select 
                    className="form-select" 
                    style={{ width: '130px', padding: '0.45rem' }}
                    value={noteType}
                    onChange={(e) => setNoteType(e.target.value as any)}
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
                    value={notePage}
                    onChange={(e) => setNotePage(parseInt(e.target.value) || '')}
                  />

                  <input 
                    type="text" 
                    className="form-input" 
                    style={{ flexGrow: 1, minWidth: '150px', padding: '0.45rem' }} 
                    placeholder="Tags (comma separated)"
                    value={noteTags}
                    onChange={(e) => setNoteTags(e.target.value)}
                  />

                  <button 
                    type="button"
                    onClick={() => setIsFavorite(!isFavorite)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: isFavorite ? 'var(--color-on-hold)' : 'var(--text-muted)' }}
                    title="Toggle Favorite"
                  >
                    <Star size={20} fill={isFavorite ? 'currentColor' : 'none'} />
                  </button>

                  <button type="submit" className="btn btn-primary" style={{ padding: '0.45rem 1rem' }}>
                    <Plus size={14} /> Add
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
                        <span style={{ textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.02em', color: 'var(--accent-primary)' }}>
                          {note.type} {note.page_number && `• Page ${note.page_number}`}
                        </span>
                        <span>{format(new Date(note.created_at), 'MMM dd, yyyy')}</span>
                      </div>
                      
                      <p style={{ 
                        fontSize: '0.9rem', 
                        fontStyle: note.type === 'quote' ? 'italic' : 'normal',
                        lineHeight: 1.5,
                        color: note.type === 'quote' ? 'var(--text-primary)' : 'var(--text-secondary)'
                      }}>
                        {note.type === 'quote' ? `"${note.content}"` : note.content}
                      </p>

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
                <form onSubmit={handleLogPastSession} className="glass" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <h5 style={{ fontWeight: 700, fontSize: '0.85rem' }}>Log a past session</h5>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Date</label>
                      <input type="date" className="form-input" style={{ padding: '0.4rem' }} value={pastDate} onChange={e => setPastDate(e.target.value)} required />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Duration (min)</label>
                      <input type="number" className="form-input" style={{ padding: '0.4rem' }} value={pastDuration} onChange={e => setPastDuration(parseInt(e.target.value) || 0)} required />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Pages / Min Read</label>
                      <input type="number" className="form-input" style={{ padding: '0.4rem' }} value={pastPagesRead} onChange={e => setPastPagesRead(parseInt(e.target.value) || 0)} required />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Location</label>
                      <input type="text" className="form-input" style={{ padding: '0.4rem' }} value={pastLocation} onChange={e => setPastLocation(e.target.value)} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Mood After</label>
                      <select className="form-select" style={{ padding: '0.4rem' }} value={pastMood} onChange={e => setPastMood(e.target.value)}>
                        <option value="focused">Focused</option>
                        <option value="inspired">Inspired</option>
                        <option value="relaxed">Relaxed</option>
                        <option value="tired">Tired</option>
                        <option value="neutral">Neutral</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                    <button type="submit" className="btn btn-primary" style={{ padding: '0.45rem 1rem', fontSize: '0.8rem' }}>Save Log</button>
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
                          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Read {session.pages_read} pages / min</span>
                          <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.4rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                            p. {session.pages_start} - {session.pages_end}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'flex', gap: '0.5rem' }}>
                          <span>⏱️ {session.duration_minutes} min</span>
                          <span>📍 {session.location}</span>
                          <span>😊 {session.mood_after}</span>
                        </p>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'right' }}>
                        <div>{format(new Date(session.start_time), 'MMM dd, yyyy')}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                          {format(new Date(session.start_time), 'h:mm a')}
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
            <form onSubmit={handleUpdateBook} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Title</label>
                  <input type="text" className="form-input" value={title} onChange={e => setTitle(e.target.value)} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Author</label>
                  <input type="text" className="form-input" value={author} onChange={e => setAuthor(e.target.value)} required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Format</label>
                  <select className="form-select" value={formatType} onChange={e => setFormatType(e.target.value as any)}>
                    <option value="physical">Physical Book</option>
                    <option value="ebook">Ebook</option>
                    <option value="audiobook">Audiobook</option>
                    <option value="library">Library Loan</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Reading Status</label>
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
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Current Page / Minutes</label>
                  <input type="number" className="form-input" value={currentPage} onChange={e => setCurrentPage(parseInt(e.target.value) || 0)} min={0} max={pageCount} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Total Pages / Minutes</label>
                  <input type="number" className="form-input" value={pageCount} onChange={e => setPageCount(parseInt(e.target.value) || 1)} min={1} />
                </div>
              </div>

              {formatType === 'physical' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Shelf Location (e.g. Living Room Shelf A)</label>
                  <input type="text" className="form-input" placeholder="Living Room Shelf A" value={shelfLocation} onChange={e => setShelfLocation(e.target.value)} />
                </div>
              )}

              {formatType === 'library' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Due Date</label>
                  <input type="date" className="form-input" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                </div>
              )}

              {/* Collections Checkboxes */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Collections / Shelves</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {shelves.map(shelf => {
                    const isSelected = bookShelves.includes(shelf.id);
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
                >
                  <Trash2 size={14} /> Delete Book
                </button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
