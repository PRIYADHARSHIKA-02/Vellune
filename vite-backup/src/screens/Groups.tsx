import React, { useState } from 'react';
import { useStore } from '../store';
import type { DiscussionThread } from '../store';
import { Users, Plus, Key, Eye, EyeOff, Lock, Send, X } from 'lucide-react';
import { format } from 'date-fns';

export const Groups: React.FC = () => {
  const { circles, books, addCircle, addThread, addPost, joinCircle } = useStore();

  const [selectedCircleId, setSelectedCircleId] = useState<string | null>(circles[0]?.id || null);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

  // Spoiler Override states (when behind progress but user forces reveal)
  const [revealedSpoilers, setRevealedSpoilers] = useState<Record<string, boolean>>({});

  // Forms
  const [inviteCode, setInviteCode] = useState('');
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  
  const [circleName, setCircleName] = useState('');
  const [circleDesc, setCircleDesc] = useState('');
  const [circleBookId, setCircleBookId] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [threadTitle, setThreadTitle] = useState('');
  const [threadChapter, setThreadChapter] = useState('');
  const [threadSpoilerPage, setThreadSpoilerPage] = useState<number>(100);
  const [isCreateThreadOpen, setIsCreateThreadOpen] = useState(false);

  const [newPostContent, setNewPostContent] = useState('');

  const activeCircle = circles.find(c => c.id === selectedCircleId);
  const activeThread = activeCircle?.threads.find(t => t.id === selectedThreadId);

  const handleJoinCircle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    const success = joinCircle(inviteCode);
    if (success) {
      alert('Joined circle successfully!');
      setInviteCode('');
      setIsJoinOpen(false);
      // Select the joined circle
      const updatedCircles = useStore.getState().circles;
      const joined = updatedCircles.find(c => c.invite_code === inviteCode);
      if (joined) setSelectedCircleId(joined.id);
    } else {
      alert('Invalid invite code. Try "SF-EXPLORE-2026".');
    }
  };

  const handleCreateCircle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!circleName.trim()) return;

    addCircle({
      name: circleName,
      description: circleDesc,
      current_book_id: circleBookId || undefined,
      creator_name: 'Rithu'
    });

    setCircleName('');
    setCircleDesc('');
    setCircleBookId('');
    setIsCreateOpen(false);
  };

  const handleCreateThread = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCircle || !threadTitle.trim()) return;

    const book = books.find(b => b.id === activeCircle.current_book_id);
    const bookTitle = book ? book.title : 'General Discussion';

    addThread(
      activeCircle.id,
      bookTitle,
      threadTitle,
      threadChapter || 'General',
      threadSpoilerPage
    );

    setThreadTitle('');
    setThreadChapter('');
    setThreadSpoilerPage(100);
    setIsCreateThreadOpen(false);
  };

  const handleAddPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCircle || !selectedThreadId || !newPostContent.trim()) return;

    addPost(activeCircle.id, selectedThreadId, 'Rithu', newPostContent);
    setNewPostContent('');
  };

  const toggleRevealSpoiler = (threadId: string) => {
    setRevealedSpoilers({
      ...revealedSpoilers,
      [threadId]: !revealedSpoilers[threadId]
    });
  };

  // Helper to determine if a thread has spoilers for the user
  const checkIsSpoiler = (thread: DiscussionThread) => {
    if (!activeCircle?.current_book_id) return false;
    
    // Find user's copy of the book
    const userBook = books.find(b => b.id === activeCircle.current_book_id);
    if (!userBook) return false;

    // If user finished book, no spoilers possible
    if (userBook.status === 'finished') return false;

    // Compare pages
    return userBook.current_page < thread.spoiler_level;
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header */}
      <div className="flex-between">
        <div>
          <h1 className="screen-title">Reading Circles</h1>
          <p className="screen-subtitle">Spoiler-safe forums to review book progression with private circles.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={() => setIsJoinOpen(true)}>
            <Key size={16} /> Join Circle
          </button>
          <button className="btn btn-primary" onClick={() => setIsCreateOpen(true)}>
            <Plus size={16} /> Create Circle
          </button>
        </div>
      </div>

      {/* Main panel layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '2rem', height: '65vh' }}>
        
        {/* Left Side: Circles & Threads navigation */}
        <div className="glass" style={{ display: 'flex', flexDirection: 'column', padding: '1rem', overflowY: 'auto' }}>
          <h3 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: '0.75rem' }}>
            Your Circles
          </h3>
          
          {/* Circles list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1.5rem' }}>
            {circles.map(circle => (
              <button
                key={circle.id}
                onClick={() => { setSelectedCircleId(circle.id); setSelectedThreadId(null); }}
                style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.2s',
                  backgroundColor: selectedCircleId === circle.id ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                  borderColor: selectedCircleId === circle.id ? 'var(--accent-primary)' : 'transparent',
                  color: selectedCircleId === circle.id ? 'var(--text-primary)' : 'var(--text-secondary)'
                }}
              >
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{circle.name}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>👥{circle.member_count}</span>
              </button>
            ))}
          </div>

          {activeCircle && (
            <>
              <div className="flex-between" style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '1rem', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                  Threads
                </h3>
                <button 
                  onClick={() => setIsCreateThreadOpen(true)}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer' }}
                  title="New discussion thread"
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* Threads list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', overflowY: 'auto' }}>
                {activeCircle.threads.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center', padding: '1rem' }}>No discussions yet.</p>
                ) : (
                  activeCircle.threads.map(thread => {
                    const isSpoiler = checkIsSpoiler(thread);
                    const isActive = selectedThreadId === thread.id;
                    return (
                      <button
                        key={thread.id}
                        onClick={() => setSelectedThreadId(thread.id)}
                        style={{
                          padding: '0.65rem 0.85rem',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid',
                          cursor: 'pointer',
                          textAlign: 'left',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.2rem',
                          transition: 'all 0.2s',
                          backgroundColor: isActive ? 'rgba(255, 255, 255, 0.04)' : 'transparent',
                          borderColor: isActive ? 'var(--border-glass)' : 'transparent',
                          color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)'
                        }}
                      >
                        <div style={{ fontWeight: 600, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          {isSpoiler && <Lock size={10} style={{ color: 'var(--color-on-hold)' }} />}
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{thread.title}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)', width: '100%' }}>
                          <span>{thread.chapter}</span>
                          <span>💬{thread.posts.length}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>

        {/* Right Side: Discussions Feed / Threads View */}
        <div className="glass" style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem', overflow: 'hidden' }}>
          {activeThread ? (
            /* Selected Thread feed */
            (() => {
              const isSpoiler = checkIsSpoiler(activeThread);
              const isOverridden = revealedSpoilers[activeThread.id] || false;
              const isBlocked = isSpoiler && !isOverridden;

              const activeCircleBook = books.find(b => b.id === activeCircle?.current_book_id);
              const currentProgressPage = activeCircleBook ? activeCircleBook.current_page : 0;

              return (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  
                  {/* Thread details bar */}
                  <div style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                    <div className="flex-between">
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>
                        {activeThread.book_title} • {activeThread.chapter}
                      </span>
                      {isSpoiler && (
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', display: 'flex', gap: '0.2rem', alignItems: 'center' }}
                          onClick={() => toggleRevealSpoiler(activeThread.id)}
                        >
                          {isOverridden ? <EyeOff size={10} /> : <Eye size={10} />}
                          {isOverridden ? 'Mask Spoilers' : 'Reveal Spoilers'}
                        </button>
                      )}
                    </div>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0.25rem 0 0 0' }}>{activeThread.title}</h2>
                    {isSpoiler && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-on-hold)', marginTop: '0.35rem', fontWeight: 500 }}>
                        ⚠️ Spoiler Threshold: Page {activeThread.spoiler_level} (Your current page is {currentProgressPage})
                      </p>
                    )}
                  </div>

                  {/* Posts Lists */}
                  <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem' }}>
                    {isBlocked ? (
                      /* Spoiler protection block panel */
                      <div style={{ margin: 'auto', textAlign: 'center', maxWidth: '380px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyItems: 'center', color: 'var(--color-on-hold)', justifyContent: 'center' }}>
                          <Lock size={20} />
                        </div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Spoilers Locked</h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                          This discussion includes spoilers up to page <strong>{activeThread.spoiler_level}</strong>. Continue reading your book or click below to reveal comments manually.
                        </p>
                        <button 
                          className="btn btn-primary" 
                          style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
                          onClick={() => toggleRevealSpoiler(activeThread.id)}
                        >
                          Reveal Posts anyway
                        </button>
                      </div>
                    ) : (
                      /* Render actual posts */
                      activeThread.posts.length === 0 ? (
                        <p style={{ margin: 'auto', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No posts in this thread yet. Write the first reply below!</p>
                      ) : (
                        activeThread.posts.map(post => (
                          <div 
                            key={post.id} 
                            style={{
                              display: 'flex',
                              gap: '0.85rem',
                              alignItems: 'flex-start',
                              animation: 'fadeIn 0.25s'
                            }}
                          >
                            <img src={post.avatar_url} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                            <div style={{ flexGrow: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{post.username}</span>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                  {format(new Date(post.created_at), 'MMM dd, h:mm a')}
                                </span>
                              </div>
                              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem', lineHeight: 1.4 }}>
                                {post.content}
                              </p>
                            </div>
                          </div>
                        ))
                      )
                    )}
                  </div>

                  {/* Post Form */}
                  <form onSubmit={handleAddPost} style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '1rem', display: 'flex', gap: '0.75rem' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder={isBlocked ? "Cannot post while spoilers are locked..." : "Share your reaction..."}
                      value={newPostContent}
                      onChange={e => setNewPostContent(e.target.value)}
                      disabled={isBlocked}
                      required
                    />
                    <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }} disabled={isBlocked}>
                      <Send size={14} /> Send
                    </button>
                  </form>

                </div>
              );
            })()
          ) : (
            /* Selected Circle info details */
            activeCircle ? (
              <div style={{ margin: 'auto', textAlign: 'center', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <Users size={48} style={{ color: 'var(--accent-primary)', opacity: 0.8 }} />
                <div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>{activeCircle.name}</h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{activeCircle.description}</p>
                </div>
                
                <div style={{ border: '1px dashed var(--border-glass)', borderRadius: '6px', padding: '0.5rem 1rem', width: '100%', marginTop: '0.5rem' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Invite Code</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.04em', color: 'var(--accent-primary)', marginTop: '0.15rem' }}>
                    {activeCircle.invite_code}
                  </div>
                </div>

                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Select or create a thread on the sidebar to view active chapter-by-chapter discussions!
                </p>
                <button 
                  className="btn btn-secondary" 
                  style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
                  onClick={() => setIsCreateThreadOpen(true)}
                >
                  Create Discussion Thread
                </button>
              </div>
            ) : (
              <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Users size={32} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                <h3>No circles joined yet.</h3>
              </div>
            )
          )}
        </div>

      </div>

      {/* Join Circle Modal */}
      {isJoinOpen && (
        <div className="modal-overlay" style={{ zIndex: 120 }}>
          <div className="modal-content glass" style={{ maxWidth: '360px' }}>
            <button className="modal-close" onClick={() => setIsJoinOpen(false)}>
              <X size={18} />
            </button>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', fontFamily: 'var(--font-display)' }}>Join Reading Circle</h2>
            <form onSubmit={handleJoinCircle} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Invite Code</label>
                <input type="text" className="form-input" value={inviteCode} onChange={e => setInviteCode(e.target.value)} required placeholder="e.g. SF-EXPLORE-2026" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsJoinOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Join</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Circle Modal */}
      {isCreateOpen && (
        <div className="modal-overlay" style={{ zIndex: 120 }}>
          <div className="modal-content glass" style={{ maxWidth: '420px' }}>
            <button className="modal-close" onClick={() => setIsCreateOpen(false)}>
              <X size={18} />
            </button>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', fontFamily: 'var(--font-display)' }}>Create Reading Circle</h2>
            <form onSubmit={handleCreateCircle} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Circle Name</label>
                <input type="text" className="form-input" value={circleName} onChange={e => setCircleName(e.target.value)} required placeholder="e.g. Orwellian Society" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Description</label>
                <input type="text" className="form-input" value={circleDesc} onChange={e => setCircleDesc(e.target.value)} placeholder="e.g. Discussing dystopian themes" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Active Book</label>
                <select className="form-select" value={circleBookId} onChange={e => setCircleBookId(e.target.value)}>
                  <option value="">Select Book...</option>
                  {books.map(b => (
                    <option key={b.id} value={b.id}>{b.title}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsCreateOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Circle</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Thread Modal */}
      {isCreateThreadOpen && (
        <div className="modal-overlay" style={{ zIndex: 120 }}>
          <div className="modal-content glass" style={{ maxWidth: '420px' }}>
            <button className="modal-close" onClick={() => setIsCreateThreadOpen(false)}>
              <X size={18} />
            </button>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', fontFamily: 'var(--font-display)' }}>Create Thread</h2>
            <form onSubmit={handleCreateThread} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Thread Title</label>
                <input type="text" className="form-input" value={threadTitle} onChange={e => setThreadTitle(e.target.value)} required placeholder="e.g. Chapter 6 Reflections" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Chapter Marker</label>
                <input type="text" className="form-input" value={threadChapter} onChange={e => setThreadChapter(e.target.value)} placeholder="e.g. Chapters 6-8" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Spoiler Page Threshold (Page number)</label>
                <input type="number" className="form-input" value={threadSpoilerPage} onChange={e => setThreadSpoilerPage(parseInt(e.target.value) || 0)} required />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsCreateThreadOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Thread</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
