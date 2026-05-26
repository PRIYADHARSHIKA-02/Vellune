'use client';

import React, { useState, useEffect } from 'react';
import { 
  useCircles, 
  useCircle, 
  useAddCircle, 
  useJoinCircle, 
  useAddThread, 
  useThreadPosts, 
  useAddPost,
  useBooks
} from '../../hooks/queries';
import { useStore } from '../../store';
import { Users, Plus, Key, Eye, EyeOff, Lock, Send, X, ArrowLeft, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function GroupsPage() {
  const { user } = useStore();
  const { data: books = [] } = useBooks();
  const { data: circles = [], isLoading: isCirclesLoading } = useCircles();

  const [selectedCircleId, setSelectedCircleId] = useState<string | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

  // Auto-select first circle when circles finish loading
  useEffect(() => {
    if (!selectedCircleId && circles.length > 0) {
      setSelectedCircleId(circles[0].id);
    }
  }, [circles, selectedCircleId]);

  // Fetch active circle detail
  const { data: activeCircle, isLoading: isActiveCircleLoading } = useCircle(selectedCircleId);

  // Fetch posts for the active thread
  const { data: posts = [], isLoading: isPostsLoading } = useThreadPosts(selectedThreadId);

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

  // Mutations
  const joinCircleMutation = useJoinCircle();
  const addCircleMutation = useAddCircle();
  const addThreadMutation = useAddThread();
  const addPostMutation = useAddPost();

  const activeThread = activeCircle?.threads?.find(t => t.id === selectedThreadId);

  const handleJoinCircle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    try {
      const response = await joinCircleMutation.mutateAsync(inviteCode.trim());
      alert('Joined circle successfully!');
      setInviteCode('');
      setIsJoinOpen(false);
      if (response?.circle?.id) {
        setSelectedCircleId(response.circle.id);
        setSelectedThreadId(null);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Invalid invite code or already a member.');
    }
  };

  const handleCreateCircle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!circleName.trim()) return;

    try {
      const newCircle = await addCircleMutation.mutateAsync({
        name: circleName.trim(),
        description: circleDesc.trim(),
        currentBookId: circleBookId || undefined,
        isPrivate: true,
        maxMembers: 15
      });
      setCircleName('');
      setCircleDesc('');
      setCircleBookId('');
      setIsCreateOpen(false);
      if (newCircle?.id) {
        setSelectedCircleId(newCircle.id);
        setSelectedThreadId(null);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create reading circle.');
    }
  };

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCircleId || !threadTitle.trim()) return;

    try {
      const newThread = await addThreadMutation.mutateAsync({
        circleId: selectedCircleId,
        data: {
          title: threadTitle.trim(),
          bookId: circleBookId || activeCircle?.currentBookId || undefined,
          chapter: threadChapter.trim() || 'General',
          spoilerLevel: threadSpoilerPage
        }
      });
      setThreadTitle('');
      setThreadChapter('');
      setThreadSpoilerPage(100);
      setIsCreateThreadOpen(false);
      if (newThread?.id) {
        setSelectedThreadId(newThread.id);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create discussion thread.');
    }
  };

  const handleAddPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedThreadId || !newPostContent.trim()) return;

    try {
      await addPostMutation.mutateAsync({
        threadId: selectedThreadId,
        content: newPostContent.trim()
      });
      setNewPostContent('');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to publish reply.');
    }
  };

  const toggleRevealSpoiler = (threadId: string) => {
    setRevealedSpoilers({
      ...revealedSpoilers,
      [threadId]: !revealedSpoilers[threadId]
    });
  };

  // Helper to determine if a thread has spoilers for the user
  const checkIsSpoiler = (thread: any) => {
    const bookId = thread.bookId || activeCircle?.currentBookId;
    if (!bookId) return false;
    
    // Find user's copy of the book
    const userBook = books.find(b => b.id === bookId);
    if (!userBook) return false;

    // If user finished book, no spoilers possible
    if (userBook.status === 'finished') return false;

    // Compare pages
    return userBook.currentPage < thread.spoilerLevel;
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minHeight: '80vh' }}>
      
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
          <button className="btn btn-primary" style={{ color: '#091A1E', fontWeight: 700 }} onClick={() => setIsCreateOpen(true)}>
            <Plus size={16} /> Create Circle
          </button>
        </div>
      </div>

      {isCirclesLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', color: 'var(--text-secondary)' }}>
          <Loader2 className="animate-spin" style={{ marginRight: '0.5rem' }} /> Loading your circles...
        </div>
      ) : circles.length === 0 ? (
        <div className="glass" style={{ padding: '3rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', maxWidth: '500px', margin: '4rem auto' }}>
          <Users size={48} style={{ color: 'var(--accent-primary)', opacity: 0.5 }} />
          <div>
            <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>No Circles Joined</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Reading is better together. Join an existing circle with an invite code, or create a brand new private circle to invite friends and run chapter discussions.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', width: '100%', justifyContent: 'center' }}>
            <button className="btn btn-secondary" style={{ flexGrow: 1 }} onClick={() => setIsJoinOpen(true)}>Join Circle</button>
            <button className="btn btn-primary" style={{ flexGrow: 1, color: '#091A1E', fontWeight: 700 }} onClick={() => setIsCreateOpen(true)}>Create Circle</button>
          </div>
        </div>
      ) : (
        /* Main panel layout */
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '2rem', minHeight: '65vh' }}>
          
          {/* Left Side: Circles & Threads navigation */}
          <div className="glass" style={{ display: 'flex', flexDirection: 'column', padding: '1rem', overflowY: 'auto', maxHeight: '75vh' }}>
            <h3 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: '0.75rem', fontWeight: 700 }}>
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
                    backgroundColor: selectedCircleId === circle.id ? 'rgba(212, 175, 55, 0.08)' : 'transparent',
                    borderColor: selectedCircleId === circle.id ? 'var(--accent-primary)' : 'transparent',
                    color: selectedCircleId === circle.id ? 'var(--text-primary)' : 'var(--text-secondary)'
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{circle.name}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>👥 {circle.members?.length || 1}</span>
                </button>
              ))}
            </div>

            {activeCircle && (
              <>
                <div className="flex-between" style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '1rem', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.02em', fontWeight: 700 }}>
                    Threads
                  </h3>
                  <button 
                    onClick={() => setIsCreateThreadOpen(true)}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    title="New discussion thread"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {/* Threads list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', overflowY: 'auto' }}>
                  {isActiveCircleLoading ? (
                    <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      <Loader2 size={12} className="animate-spin" style={{ display: 'inline', marginRight: '0.25rem' }} /> Loading...
                    </div>
                  ) : !activeCircle.threads || activeCircle.threads.length === 0 ? (
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
                          <div style={{ fontWeight: 600, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', width: '100%' }}>
                            {isSpoiler && <Lock size={10} style={{ color: 'var(--color-on-hold)', flexShrink: 0 }} />}
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexGrow: 1 }}>{thread.title}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)', width: '100%' }}>
                            <span>{thread.chapter || 'General'}</span>
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
          <div className="glass" style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem', overflow: 'hidden', height: '75vh' }}>
            {selectedThreadId ? (
              /* Selected Thread feed */
              (() => {
                if (!activeThread) return null;
                const isSpoiler = checkIsSpoiler(activeThread);
                const isOverridden = revealedSpoilers[activeThread.id] || false;
                const isBlocked = isSpoiler && !isOverridden;

                const threadBook = books.find(b => b.id === activeThread.bookId);
                const activeCircleBook = books.find(b => b.id === activeCircle?.currentBookId);
                const currentProgressPage = threadBook ? threadBook.currentPage : (activeCircleBook ? activeCircleBook.currentPage : 0);
                const bookTitle = threadBook ? threadBook.title : (activeCircleBook ? activeCircleBook.title : 'General Discussion');

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    
                    {/* Thread details bar */}
                    <div style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                      <div className="flex-between">
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>
                          {bookTitle} • {activeThread.chapter || 'General'}
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
                      <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0.25rem 0 0 0', fontFamily: 'var(--font-display)' }}>{activeThread.title}</h2>
                      {isSpoiler && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-on-hold)', marginTop: '0.35rem', fontWeight: 500 }}>
                          ⚠️ Spoiler Threshold: Page {activeThread.spoilerLevel} (Your current page is {currentProgressPage})
                        </p>
                      )}
                    </div>

                    {/* Posts Lists */}
                    <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem', paddingRight: '0.5rem' }}>
                      {isBlocked ? (
                        /* Spoiler protection block panel */
                        <div style={{ margin: 'auto', textAlign: 'center', maxWidth: '380px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyItems: 'center', color: 'var(--color-on-hold)', justifyContent: 'center' }}>
                            <Lock size={20} />
                          </div>
                          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>Spoilers Locked</h3>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                            This discussion includes spoilers up to page <strong>{activeThread.spoilerLevel}</strong>. Continue reading your book or click below to reveal comments manually.
                          </p>
                          <button 
                            className="btn btn-primary" 
                            style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', color: '#091A1E', fontWeight: 700 }}
                            onClick={() => toggleRevealSpoiler(activeThread.id)}
                          >
                            Reveal Posts anyway
                          </button>
                        </div>
                      ) : isPostsLoading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                          <Loader2 className="animate-spin" style={{ marginRight: '0.5rem' }} /> Loading discussion...
                        </div>
                      ) : posts.length === 0 ? (
                        <p style={{ margin: 'auto', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No posts in this thread yet. Write the first reply below!</p>
                      ) : (
                        posts.map((post: any) => (
                          <div 
                            key={post.id} 
                            style={{
                              display: 'flex',
                              gap: '0.85rem',
                              alignItems: 'flex-start',
                              animation: 'fadeIn 0.25s'
                            }}
                          >
                            <img 
                              src={post.user?.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${post.user?.username || 'user'}`} 
                              style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', background: 'var(--border-glass)' }} 
                              alt={post.user?.username || 'avatar'}
                            />
                            <div style={{ flexGrow: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{post.user?.username || 'Anonymous'}</span>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                  {format(new Date(post.createdAt), 'MMM dd, h:mm a')}
                                </span>
                              </div>
                              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem', lineHeight: 1.4 }}>
                                {post.content}
                              </p>
                            </div>
                          </div>
                        ))
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
                        disabled={isBlocked || addPostMutation.isPending}
                        required
                      />
                      <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1rem', color: '#091A1E', fontWeight: 700 }} disabled={isBlocked || addPostMutation.isPending}>
                        {addPostMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
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
                    {activeCircle.description && <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{activeCircle.description}</p>}
                  </div>
                  
                  <div style={{ border: '1px dashed var(--border-glass)', borderRadius: '6px', padding: '0.5rem 1rem', width: '100%', marginTop: '0.5rem' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Invite Code</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.04em', color: 'var(--accent-primary)', marginTop: '0.15rem' }}>
                      {activeCircle.inviteCode}
                    </div>
                  </div>

                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
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
                  <h3>Select a circle from the sidebar.</h3>
                </div>
              )
            )}
          </div>

        </div>
      )}

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
                <input type="text" className="form-input" value={inviteCode} onChange={e => setInviteCode(e.target.value)} required placeholder="e.g. RC-XXXXXX" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsJoinOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ color: '#091A1E', fontWeight: 700 }} disabled={joinCircleMutation.isPending}>
                  {joinCircleMutation.isPending ? 'Joining...' : 'Join'}
                </button>
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
                <button type="submit" className="btn btn-primary" style={{ color: '#091A1E', fontWeight: 700 }} disabled={addCircleMutation.isPending}>
                  {addCircleMutation.isPending ? 'Creating...' : 'Create Circle'}
                </button>
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
                <button type="submit" className="btn btn-primary" style={{ color: '#091A1E', fontWeight: 700 }} disabled={addThreadMutation.isPending}>
                  {addThreadMutation.isPending ? 'Creating...' : 'Create Thread'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
