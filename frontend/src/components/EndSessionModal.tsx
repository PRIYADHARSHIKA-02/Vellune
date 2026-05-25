import React, { useState } from 'react';
import { useStore } from '../store';
import { X, Check } from 'lucide-react';

interface EndSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EndSessionModal: React.FC<EndSessionModalProps> = ({ isOpen, onClose }) => {
  const { activeSession, books, endReadingSession } = useStore();
  
  if (!isOpen || !activeSession) return null;

  const book = books.find(b => b.id === activeSession.bookId);
  if (!book) return null;

  const [pagesEnd, setPagesEnd] = useState<number>(book.current_page);
  const [moodAfter, setMoodAfter] = useState<string>('focused');
  const [reflection, setReflection] = useState<string>('');
  const [error, setError] = useState<string>('');

  const MOOD_OPTIONS = [
    { id: 'focused', label: 'Focused', emoji: '🧠' },
    { id: 'inspired', label: 'Inspired', emoji: '✨' },
    { id: 'relaxed', label: 'Relaxed', emoji: '🍃' },
    { id: 'tired', label: 'Tired', emoji: '🥱' },
    { id: 'excited', label: 'Excited', emoji: '🎉' },
    { id: 'bored', label: 'Bored', emoji: '💤' },
    { id: 'neutral', label: 'Neutral', emoji: '😐' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (pagesEnd < book.current_page) {
      setError(`Ending page cannot be less than starting page (page ${book.current_page}).`);
      return;
    }

    if (pagesEnd > book.page_count) {
      setError(`Ending page cannot exceed total pages in the book (page ${book.page_count}).`);
      return;
    }

    endReadingSession(pagesEnd, moodAfter, reflection);
    onClose();
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 200 }}>
      <div className="modal-content glass">
        <button className="modal-close" onClick={onClose}>
          <X size={18} />
        </button>

        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', fontFamily: 'var(--font-display)' }}>
          Complete Your Reading Session
        </h2>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Great job! You started reading <strong>{book.title}</strong> at page {book.current_page}.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '1.25rem', flexDirection: 'column' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Where did you stop reading?
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Page / Min:</span>
              <input 
                type="number" 
                className="form-input" 
                style={{ width: '120px' }}
                value={pagesEnd} 
                onChange={(e) => setPagesEnd(parseInt(e.target.value) || 0)}
                min={book.current_page}
                max={book.page_count}
                required
              />
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>of {book.page_count}</span>
            </div>
            {error && <p style={{ color: 'var(--color-dnf)', fontSize: '0.75rem', marginTop: '0.4rem' }}>{error}</p>}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              How do you feel after reading?
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {MOOD_OPTIONS.map((mood) => (
                <button
                  key={mood.id}
                  type="button"
                  onClick={() => setMoodAfter(mood.id)}
                  style={{
                    padding: '0.45rem 0.75rem',
                    fontSize: '0.8rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    transition: 'all 0.2s ease',
                    backgroundColor: moodAfter === mood.id ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.03)',
                    borderColor: moodAfter === mood.id ? 'var(--accent-primary)' : 'var(--border-glass)',
                    color: moodAfter === mood.id ? 'var(--text-primary)' : 'var(--text-secondary)'
                  }}
                >
                  <span>{mood.emoji}</span>
                  <span>{mood.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Add a quick reflection note (optional)
            </label>
            <textarea 
              className="form-textarea" 
              rows={3} 
              placeholder="Capture any thoughts, themes, or quotes you noticed..."
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Check size={16} />
              Save & Log Session
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
