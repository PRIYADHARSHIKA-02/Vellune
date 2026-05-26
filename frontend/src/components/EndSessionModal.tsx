import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { useBooks, useAddSession } from '../hooks/queries';
import { X, Check, Loader2 } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Editor } from './Editor';

interface EndSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MOOD_OPTIONS = [
  { id: 'focused', label: 'Focused', emoji: '🧠' },
  { id: 'inspired', label: 'Inspired', emoji: '✨' },
  { id: 'relaxed', label: 'Relaxed', emoji: '🍃' },
  { id: 'tired', label: 'Tired', emoji: '🥱' },
  { id: 'excited', label: 'Excited', emoji: '🎉' },
  { id: 'bored', label: 'Bored', emoji: '💤' },
  { id: 'neutral', label: 'Neutral', emoji: '😐' }
];

export const EndSessionModal: React.FC<EndSessionModalProps> = ({ isOpen, onClose }) => {
  const { activeSession, cancelReadingSession } = useStore();
  const { data: books = [] } = useBooks();
  const addSessionMutation = useAddSession();

  const book = books.find(b => b.id === activeSession?.bookId);

  // Dynamic schema based on book's pages
  const sessionSchema = z.object({
    pagesEnd: z.number()
      .min(book?.currentPage || 0, `Ending page cannot be less than starting page (page ${book?.currentPage || 0})`)
      .max(book?.pageCount || 999999, `Ending page cannot exceed total pages (page ${book?.pageCount || 999999})`),
    moodAfter: z.string().min(1, 'Mood selection is required'),
    notes: z.string().optional(),
  });

  type SessionFormValues = z.infer<typeof sessionSchema>;

  const { register, handleSubmit, watch, setValue, control, reset, formState: { errors } } = useForm<SessionFormValues>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      pagesEnd: book?.currentPage || 0,
      moodAfter: 'focused',
      notes: '',
    }
  });

  // Set default values when book loads
  useEffect(() => {
    if (book) {
      setValue('pagesEnd', book.currentPage);
    }
  }, [book, setValue]);

  if (!isOpen || !activeSession || !book) return null;

  const currentMood = watch('moodAfter');

  const onSubmit = async (values: SessionFormValues) => {
    const startTimeStr = activeSession.startTime;
    const endTimeStr = new Date().toISOString();
    
    // Calculate duration
    const startMs = new Date(startTimeStr).getTime();
    const endMs = new Date(endTimeStr).getTime();
    const duration = Math.max(1, Math.round((endMs - startMs) / 60000));

    try {
      await addSessionMutation.mutateAsync({
        bookId: activeSession.bookId,
        startTime: startTimeStr,
        endTime: endTimeStr,
        durationMinutes: duration,
        pagesStart: book.currentPage,
        pagesEnd: values.pagesEnd,
        pagesRead: values.pagesEnd - book.currentPage,
        formatUsed: book.format,
        location: activeSession.location || 'unknown',
        moodBefore: activeSession.moodBefore || 'neutral',
        moodAfter: values.moodAfter,
        notes: values.notes || null
      });

      // Clear the running timer in Zustand / LocalStorage
      cancelReadingSession();
      reset();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to record reading session.');
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 200 }}>
      <div className="modal-content glass" style={{ maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto' }}>
        <button className="modal-close" onClick={onClose}>
          <X size={18} />
        </button>

        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', fontFamily: 'var(--font-display)' }}>
          Complete Your Reading Session
        </h2>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
          Great job! You started reading <strong>{book.title}</strong> at page {book.currentPage}.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', gap: '1.25rem', flexDirection: 'column' }}>
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
                {...register('pagesEnd', { valueAsNumber: true })}
              />
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>of {book.pageCount}</span>
            </div>
            {errors.pagesEnd && <p style={{ color: 'var(--color-dnf)', fontSize: '0.75rem', marginTop: '0.4rem' }}>{errors.pagesEnd.message}</p>}
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
                  onClick={() => setValue('moodAfter', mood.id)}
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
                    backgroundColor: currentMood === mood.id ? 'rgba(212, 178, 111, 0.12)' : 'rgba(255,255,255,0.03)',
                    borderColor: currentMood === mood.id ? 'var(--accent-primary)' : 'var(--border-glass)',
                    color: currentMood === mood.id ? 'var(--text-primary)' : 'var(--text-secondary)'
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
              Add a quick reflection note (rich text reflections)
            </label>
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <Editor 
                  value={field.value || ''}
                  onChange={field.onChange}
                  placeholder="Capture any thoughts, themes, or quotes you noticed..."
                />
              )}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={addSessionMutation.isPending}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ color: '#091A1E', fontWeight: 700 }} disabled={addSessionMutation.isPending}>
              {addSessionMutation.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" style={{ marginRight: '0.25rem' }} />
                  Saving...
                </>
              ) : (
                <>
                  <Check size={16} />
                  Save & Log Session
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
