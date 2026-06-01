import React, { useState } from 'react';
import { useStore } from '../store';
import { useUpdateBook, useSaveReview } from '../hooks/queries';
import { Star, Check, X, ShieldAlert } from 'lucide-react';

interface PostReadSheetProps {
  book: any;
  onClose: () => void;
}

const MOODS = ['Moved', 'Hopeful', 'Thoughtful', 'Unsettled', 'Inspired', 'Bored', 'Satisfied', 'Sad'];

export const PostReadSheet: React.FC<PostReadSheetProps> = ({ book, onClose }) => {
  const { setFinishedBookToRate } = useStore();
  const updateBookMutation = useUpdateBook();
  const saveReviewMutation = useSaveReview();

  const [rating, setRating] = useState<number>(0);
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [recommend, setRecommend] = useState<'yes' | 'depends' | 'no' | null>(null);
  const [reviewText, setReviewText] = useState<string>('');
  const [isShared, setIsShared] = useState<boolean>(false); // Private by default as required

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showSuccessAnim, setShowSuccessAnim] = useState<boolean>(false);

  const handleStarClick = (starIndex: number) => {
    if (rating === starIndex) {
      setRating(starIndex - 0.5);
    } else {
      setRating(starIndex);
    }
  };

  const toggleMood = (mood: string) => {
    if (selectedMoods.includes(mood)) {
      setSelectedMoods(selectedMoods.filter(m => m !== mood));
    } else {
      setSelectedMoods([...selectedMoods, mood]);
    }
  };

  const handleSave = async () => {
    if (rating === 0) return;
    setIsSaving(true);
    try {
      // 1. Save UserBookReview details
      await saveReviewMutation.mutateAsync({
        bookId: book.id,
        data: {
          star_rating: rating,
          mood_tags: selectedMoods,
          recommend: recommend,
          review_text: reviewText.trim() || null,
          is_shared: isShared
        }
      });

      // 2. Mark book status as finished in shelf DB
      await updateBookMutation.mutateAsync({
        id: book.id,
        updates: {
          status: 'finished',
          currentPage: book.pageCount || 0,
          dateFinished: new Date().toISOString()
        }
      });

      // 3. Show micro-animation success state
      setShowSuccessAnim(true);
      setTimeout(() => {
        setFinishedBookToRate(null);
        onClose();
      }, 1200);

    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to save review details.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = async () => {
    setIsSaving(true);
    try {
      // Mark finished with no review data
      await updateBookMutation.mutateAsync({
        id: book.id,
        updates: {
          status: 'finished',
          currentPage: book.pageCount || 0,
          dateFinished: new Date().toISOString()
        }
      });

      setShowSuccessAnim(true);
      setTimeout(() => {
        setFinishedBookToRate(null);
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to complete book.');
    } finally {
      setIsSaving(false);
    }
  };

  // Star display helper
  const renderStars = () => {
    return Array.from({ length: 5 }).map((_, idx) => {
      const starIndex = idx + 1;
      const isFilled = rating >= starIndex;
      const isHalf = rating === starIndex - 0.5;

      return (
        <button
          key={idx}
          type="button"
          onClick={() => handleStarClick(starIndex)}
          className="star-btn"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0.25rem',
            color: isFilled || isHalf ? 'var(--color-on-hold)' : 'rgba(255,255,255,0.15)',
            transform: 'scale(1.15)',
            transition: 'transform 0.15s ease, color 0.15s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.3)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1.15)'}
        >
          {isHalf ? (
            <div style={{ position: 'relative', width: '32px', height: '32px' }}>
              <Star size={32} style={{ position: 'absolute', top: 0, left: 0 }} />
              <div style={{ position: 'absolute', top: 0, left: 0, width: '16px', overflow: 'hidden', color: 'var(--color-on-hold)' }}>
                <Star size={32} fill="currentColor" />
              </div>
            </div>
          ) : (
            <Star size={32} fill={isFilled ? 'currentColor' : 'none'} />
          )}
        </button>
      );
    });
  };

  return (
    <div className="bottom-sheet-overlay" onClick={handleSkip}>
      <style>{`
        .bottom-sheet-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(10px);
          z-index: 2500;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }
        .bottom-sheet-content {
          width: 100%;
          max-width: 500px;
          background: rgba(13, 27, 33, 0.98);
          backdrop-filter: blur(20px);
          border: 1px solid var(--border-glass-focus);
          border-bottom: none;
          border-radius: 24px 24px 0 0;
          padding: 2.25rem 2rem 2.5rem 2rem;
          position: relative;
          box-shadow: 0 -10px 40px rgba(0,0,0,0.8);
          animation: slideUpSheet 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          color: var(--text-primary);
        }
        @keyframes slideUpSheet {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .sheet-handle {
          width: 48px;
          height: 5px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
          margin: 0 auto 1.5rem auto;
          cursor: pointer;
        }
        .mood-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.5rem;
          margin-top: 0.75rem;
        }
        .mood-chip {
          padding: 0.5rem 0.25rem;
          font-size: 0.75rem;
          font-weight: 600;
          border-radius: 8px;
          border: 1px solid var(--border-glass);
          background: rgba(255,255,255,0.02);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
        }
        .mood-chip.selected {
          border-color: #8b5cf6;
          background: rgba(139, 92, 246, 0.15);
          color: #c084fc;
          box-shadow: 0 0 10px rgba(139, 92, 246, 0.2);
        }
        .rec-btn {
          flex: 1;
          padding: 0.6rem;
          font-size: 0.85rem;
          font-weight: 700;
          border-radius: 8px;
          border: 1px solid var(--border-glass);
          background: rgba(255,255,255,0.02);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
        }
        .rec-btn.selected-yes {
          border-color: #10b981;
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
        }
        .rec-btn.selected-other {
          border-color: #6b7280;
          background: rgba(107, 114, 128, 0.15);
          color: #d1d5db;
        }
        .checkmark-circle {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          border: 4px solid #10b981;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 2rem auto;
          color: #10b981;
          animation: popCheck 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        @keyframes popCheck {
          0% { transform: scale(0.3); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      <div 
        className="bottom-sheet-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ display: 'flex', flexDirection: 'column' }}
      >
        {/* Success state animation overlay */}
        {showSuccessAnim ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div className="checkmark-circle">
              <Check size={48} strokeWidth={3} />
            </div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>Book Completed!</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>Your shelf is updated.</p>
          </div>
        ) : (
          <>
            <div className="sheet-handle" onClick={handleSkip}></div>

            <div style={{ marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, fontFamily: 'var(--font-display)', margin: 0 }}>
                You finished {book.title}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                Take 30 seconds to capture how it felt
              </p>
            </div>

            {/* B2. Star Rating (Required) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0.5rem 0 1.25rem 0' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {renderStars()}
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem', fontWeight: 600 }}>
                {rating > 0 ? `${rating} Stars` : 'Tap to rate'}
              </span>
            </div>

            {/* B3. Mood Picker */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                How did it leave you feeling?
              </label>
              <div className="mood-grid">
                {MOODS.map(m => {
                  const isSelected = selectedMoods.includes(m);
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => toggleMood(m)}
                      className={`mood-chip ${isSelected ? 'selected' : ''}`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* B4. Recommendation Toggle */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                Would you recommend it?
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setRecommend(recommend === 'yes' ? null : 'yes')}
                  className={`rec-btn ${recommend === 'yes' ? 'selected-yes' : ''}`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setRecommend(recommend === 'depends' ? null : 'depends')}
                  className={`rec-btn ${recommend === 'depends' ? 'selected-other' : ''}`}
                >
                  Depends
                </button>
                <button
                  type="button"
                  onClick={() => setRecommend(recommend === 'no' ? null : 'no')}
                  className={`rec-btn ${recommend === 'no' ? 'selected-other' : ''}`}
                >
                  No
                </button>
              </div>
            </div>

            {/* B5. Free-Text Review */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div className="flex-between">
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  Your review
                </label>
                {reviewText.length >= 400 && (
                  <span style={{ fontSize: '0.75rem', color: reviewText.length > 500 ? 'var(--color-dnf)' : 'var(--text-muted)' }}>
                    {reviewText.length}/500
                  </span>
                )}
              </div>
              <textarea
                className="form-textarea"
                rows={2}
                maxLength={520}
                placeholder="Any thoughts? (optional — just for you)"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                style={{
                  resize: 'none',
                  fontSize: '0.85rem',
                  marginTop: '0.4rem',
                  padding: '0.6rem',
                  background: 'rgba(255,255,255,0.01)',
                  border: '1px solid var(--border-glass)'
                }}
              />
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.65rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                  <ShieldAlert size={12} />
                  Private by default
                </span>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={isShared}
                    onChange={(e) => setIsShared(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>Share with my reading circles</span>
                </label>
              </div>
            </div>

            {/* B6. Action Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleSkip}
                style={{ flex: 1, padding: '0.75rem', fontWeight: 700 }}
                disabled={isSaving}
              >
                Skip
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSave}
                style={{ flex: 2, padding: '0.75rem', color: '#091A1E', fontWeight: 800 }}
                disabled={rating === 0 || isSaving || reviewText.length > 500}
              >
                {isSaving ? 'Saving...' : 'Save to finished'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
