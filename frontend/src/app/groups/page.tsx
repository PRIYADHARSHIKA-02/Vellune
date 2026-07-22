'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  useCircles, 
  useCircle, 
  useAddCircle, 
  useJoinCircle, 
  useAddThread, 
  useThreadPosts, 
  useAddPost,
  useBooks,
  useUpdateCircleSettings,
  useLeaveCircle,
  useDeleteCircle,
  useUpdateMemberSettings,
  useInviteToCircle,
  useInvitations,
  useAcceptInvitation,
  useDeclineInvitation,
  useUndoDeclineInvitation,
  useEditPost,
  useDeletePost,
  useToggleReaction,
  useSearchBooks,
  useAddBook
} from '../../hooks/queries';
import { useStore } from '../../store';
import { 
  Users, Plus, Key, Eye, EyeOff, Lock, Send, X, ArrowLeft, Loader2, 
  MoreVertical, Settings, MessageSquare, BookOpen, AlertTriangle, 
  Share2, Clipboard, Edit2, Trash2, Smile, Bell, Check, Info, ShieldAlert
} from 'lucide-react';
import { format } from 'date-fns';
import { getCrispDescription } from '../../lib/text';
import { CircleCard } from '../../components/groups/CircleCard';
import { DiscussionFeed } from '../../components/groups/DiscussionFeed';
import { PostComposer } from '../../components/groups/PostComposer';
import { useCircleStore } from '../../store/circles.store';

const calculatePercentage = (progress: number, pageCount: number | null): number => {
  if (!pageCount || pageCount <= 0) return 0;
  return Math.min(100, Math.round((progress / pageCount) * 100));
};

export default function GroupsPage() {
  const { user } = useStore();
  const { data: books = [] } = useBooks();
  const { data: circles = [], isLoading: isCirclesLoading } = useCircles();
  const { data: pendingInvitations = [], isLoading: isInvitesLoading } = useInvitations();
  const { setCircles, setActiveCircle } = useCircleStore();

  useEffect(() => {
    if (circles) {
      const storeCircles = useCircleStore.getState().circles;
      if (JSON.stringify(storeCircles) !== JSON.stringify(circles)) {
        setCircles(circles);
      }
    }
  }, [circles, setCircles]);

  // Selected Circle & Active Thread View Push
  const [selectedCircleId, setSelectedCircleId] = useState<string | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [isCircleDetailOpen, setIsCircleDetailOpen] = useState(false);

  // Tabs
  const [activeTab, setActiveTab] = useState<'my-circles' | 'active-now' | 'invitations'>('my-circles');
  const [circleDetailTab, setCircleDetailTab] = useState<'discussion' | 'members' | 'book-info'>('discussion');

  // Spoiler Protections & Reveals
  const [revealedPostIds, setRevealedPostIds] = useState<string[]>([]);
  const [postToConfirmReveal, setPostToConfirmReveal] = useState<any>(null);

  // Modal / Sheet States
  const [isCreateWizardOpen, setIsCreateWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [isCircleSettingsOpen, setIsCircleSettingsOpen] = useState(false);
  const [isThreadCreateModalOpen, setIsThreadCreateModalOpen] = useState(false);
  const [isPostComposerOpen, setIsPostComposerOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<any>(null);

  // Wizard Form Inputs
  const [circleName, setCircleName] = useState('');
  const [circleDesc, setCircleDesc] = useState('');
  const [circleType, setCircleType] = useState<'same_book' | 'different_books'>('same_book');
  const [selectedBookId, setSelectedBookId] = useState('');
  const [selectedBook, setSelectedBook] = useState<any | null>(null);
  const [isCreatingBook, setIsCreatingBook] = useState(false);
  const [bookSearchQuery, setBookSearchQuery] = useState('');
  const [inviteUsername, setInviteUsername] = useState('');
  const [invitees, setInvitees] = useState<string[]>([]); // Username list
  const [shareableInviteCode, setShareableInviteCode] = useState<string | null>(null);

  // Inline forms
  const [progressInput, setProgressInput] = useState<number>(0);
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [newThreadChapter, setNewThreadChapter] = useState('');
  const [newThreadSpoilerPage, setNewThreadSpoilerPage] = useState<number>(0);
  
  // Post Composer Inputs
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostChapterTag, setNewPostChapterTag] = useState('');
  const [newPostPageRef, setNewPostPageRef] = useState<number>(0);
  const [postQuoteText, setPostQuoteText] = useState<string | null>(null);
  const [postComposerError, setPostComposerError] = useState<string | null>(null);

  // Settings Panel Inputs
  const [settingsCircleName, setSettingsCircleName] = useState('');
  const [settingsCircleDesc, setSettingsCircleDesc] = useState('');
  const [settingsBookId, setSettingsBookId] = useState('');
  const [settingsNotificationPref, setSettingsNotificationPref] = useState('daily');
  const [settingsMuteUntilChapter, setSettingsMuteUntilChapter] = useState<number | null>(null);

  // Card Context Menu & longpress
  const [activeContextMenuCircleId, setActiveContextMenuCircleId] = useState<string | null>(null);

  // Decline undo tracking
  const [recentlyDeclinedInvite, setRecentlyDeclinedInvite] = useState<any>(null);
  const [showUndoToast, setShowUndoToast] = useState(false);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Edit window countdown timers
  const [nowTime, setNowTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Automatically select circle if circleId query parameter is present on load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const circleIdParam = params.get('circleId');
      if (circleIdParam) {
        setSelectedCircleId(circleIdParam);
        setIsCircleDetailOpen(true);
        setCircleDetailTab('discussion');
        
        // Remove query param from browser URL so it doesn't reopen if the user refreshes
        const url = new URL(window.location.href);
        url.searchParams.delete('circleId');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [circles]);

  // API mutations
  const addCircleMutation = useAddCircle();
  const joinCircleMutation = useJoinCircle();
  const addBookMutation = useAddBook();
  const addThreadMutation = useAddThread();
  const addPostMutation = useAddPost();
  const updateCircleSettingsMutation = useUpdateCircleSettings();
  const leaveCircleMutation = useLeaveCircle();
  const deleteCircleMutation = useDeleteCircle();
  const updateMemberSettingsMutation = useUpdateMemberSettings();
  const inviteToCircleMutation = useInviteToCircle();
  const acceptInvitationMutation = useAcceptInvitation();
  const declineInvitationMutation = useDeclineInvitation();
  const undoDeclineInvitationMutation = useUndoDeclineInvitation();
  const editPostMutation = useEditPost();
  const deletePostMutation = useDeletePost();
  const toggleReactionMutation = useToggleReaction();

  // Search book query
  const { data: searchResults = [], isLoading: isSearchingBooks } = useSearchBooks(
    bookSearchQuery, 
    isCreateWizardOpen && wizardStep === 2 && bookSearchQuery.trim().length > 2
  );

  // Circle Detail query
  const { data: activeCircle, isLoading: isActiveCircleLoading } = useCircle(selectedCircleId);
  const { data: posts = [], isLoading: isPostsLoading } = useThreadPosts(selectedThreadId, revealedPostIds);

  const activeThread = activeCircle?.threads?.find(t => t.id === selectedThreadId);

  // Reset states when changing circle
  const handleSelectCircle = (circleId: string) => {
    setSelectedCircleId(circleId);
    setActiveCircle(circleId);
    setSelectedThreadId(null);
    setIsCircleDetailOpen(true);
    setCircleDetailTab('discussion');
    setRevealedPostIds([]);
  };

  // Generate Initials
  const getInitials = (name: string) => {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '??';
  };

  // Assign Harmony Avatar Background Colors
  const getAvatarColor = (name: string) => {
    const colors = ['#4aa3a9', '#D4B26F', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#06b6d4'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Check if active circle was updated in past 24 hours (active-now filter)
  const isCircleActiveNow = (circle: any) => {
    if (!circle.threads || circle.threads.length === 0) return false;
    const latestThread = circle.threads[0];
    const diff = new Date().getTime() - new Date(latestThread.createdAt).getTime();
    return diff < 24 * 60 * 60 * 1000;
  };

  const filteredCircles = circles.filter(circle => {
    if (activeTab === 'active-now') {
      return isCircleActiveNow(circle);
    }
    return true;
  });

  // Fetch user's own membership details in active circle
  const activeCircleOwnMember = activeCircle?.members?.find((m: any) => m.userId === user?.id);

  // Initialize Settings Form when Settings Modal opens
  useEffect(() => {
    if (activeCircle && isCircleSettingsOpen) {
      setSettingsCircleName(activeCircle.name);
      setSettingsCircleDesc(activeCircle.description || '');
      setSettingsBookId(activeCircle.currentBookId || '');
      setSettingsNotificationPref(activeCircleOwnMember?.notificationPreference || 'daily');
      setSettingsMuteUntilChapter(activeCircleOwnMember?.muteUntilChapter || null);
    }
  }, [activeCircle, isCircleSettingsOpen, activeCircleOwnMember]);

  // Initial Form Pre-fill for post composer
  useEffect(() => {
    if (activeCircleOwnMember) {
      setNewPostPageRef(activeCircleOwnMember.currentProgress || 0);
      setNewPostChapterTag(activeCircleOwnMember.currentProgress > 0 ? `Page ${activeCircleOwnMember.currentProgress}` : 'Ch. 1');
    }
  }, [activeCircleOwnMember, isPostComposerOpen]);

  // Decline invitation with 10s undo
  const handleDeclineInvitation = async (invite: any) => {
    try {
      await declineInvitationMutation.mutateAsync(invite.id);
      setRecentlyDeclinedInvite(invite);
      setShowUndoToast(true);

      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = setTimeout(() => {
        setShowUndoToast(false);
        setRecentlyDeclinedInvite(null);
      }, 10000);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to decline invitation');
    }
  };

  const handleUndoDecline = async () => {
    if (!recentlyDeclinedInvite) return;
    try {
      await undoDeclineInvitationMutation.mutateAsync(recentlyDeclinedInvite.id);
      setShowUndoToast(false);
      setRecentlyDeclinedInvite(null);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to undo decline');
    }
  };

  const handleAcceptInvite = async (invite: any) => {
    try {
      await acceptInvitationMutation.mutateAsync(invite.id);
      handleSelectCircle(invite.circleId);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to join reading circle.');
    }
  };

  // Join via shareable invite code (direct key button)
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [isJoinCodeModalOpen, setIsJoinCodeModalOpen] = useState(false);
  
  const handleJoinByCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;

    try {
      const response = await joinCircleMutation.mutateAsync(joinCodeInput.trim());
      setIsJoinCodeModalOpen(false);
      setJoinCodeInput('');
      if (response?.circle?.id) {
        handleSelectCircle(response.circle.id);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Invalid invite code or already a member.');
    }
  };

  // Handle book selection
  const handleSelectBook = async (book: any, isFromSearch: boolean) => {
    if (isFromSearch) {
      setIsCreatingBook(true);
      try {
        const newBook = await addBookMutation.mutateAsync({
          title: book.title || book.volumeInfo?.title || 'Unknown Title',
          author: book.author || (book.volumeInfo?.authors ? book.volumeInfo.authors.join(', ') : 'Unknown Author'),
          isbn: book.isbn || undefined,
          coverUrl: book.coverUrl || book.volumeInfo?.imageLinks?.thumbnail || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200',
          pageCount: book.pageCount || book.volumeInfo?.pageCount || 300,
          genres: book.genres || book.volumeInfo?.categories || ['Fiction'],
          status: 'to-read',
          format: 'physical',
          currentPage: 0,
          customShelfIds: [],
          metadata: {}
        });
        setSelectedBookId(newBook.id);
        setSelectedBook(newBook);
      } catch (err: any) {
        alert(err.response?.data?.error || 'Failed to import book to your library.');
      } finally {
        setIsCreatingBook(false);
      }
    } else {
      setSelectedBookId(book.id);
      setSelectedBook(book);
    }
  };
  // Wizard functions
  const handleCreateCircleSubmit = async () => {
    if (!circleName.trim()) return;
    try {
      const circleResponse = await addCircleMutation.mutateAsync({
        name: circleName.trim(),
        description: circleDesc.trim(),
        currentBookId: circleType === 'same_book' ? selectedBookId : undefined,
        type: circleType,
        isPrivate: true,
        maxMembers: 10
      });

      // Register the wizard's pre-generated invite link code in the backend database
      if (shareableInviteCode) {
        await inviteToCircleMutation.mutateAsync({
          circleId: circleResponse.circle.id,
          inviteCode: shareableInviteCode
        });
        setShareableInviteCode(null);
      }

      // Dispatch direct invites
      for (const invitee of invitees) {
        await inviteToCircleMutation.mutateAsync({
          circleId: circleResponse.circle.id,
          username: invitee
        });
      }

      // Reset
      setCircleName('');
      setCircleDesc('');
      setSelectedBookId('');
      setSelectedBook(null);
      setInvitees([]);
      setWizardStep(1);
      setIsCreateWizardOpen(false);

      // Open detail screen
      handleSelectCircle(circleResponse.circle.id);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create reading circle.');
    }
  };  // Add username to list
  const handleAddInvitee = () => {
    if (!inviteUsername.trim()) return;
    if (invitees.includes(inviteUsername.trim())) {
      setInviteUsername('');
      return;
    }
    if (invitees.length >= 9) {
      alert('You can invite a maximum of 9 members to respect the 10-person circle cap.');
      return;
    }
    setInvitees([...invitees, inviteUsername.trim()]);
    setInviteUsername('');
  };

  // Copy shareable code
  const handleGenerateShareLink = async () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    if (!selectedCircleId && !addCircleMutation.isSuccess) {
      // In wizard flow, we generate a mock code first or create the circle to share.
      // Let's generate a temporary link using a random string.
      const mockCode = `INV-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      setShareableInviteCode(mockCode);
      navigator.clipboard.writeText(`${origin}/invite/${mockCode}`);
      alert('Invite link copied to clipboard!');
      return;
    }
    
    try {
      const response = await inviteToCircleMutation.mutateAsync({
        circleId: selectedCircleId!
      });
      if (response.inviteCode) {
        setShareableInviteCode(response.inviteCode);
        navigator.clipboard.writeText(`${origin}/invite/${response.inviteCode}`);
        alert('Shareable invite link copied to clipboard!');
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to generate invite code.');
    }
  };

  // Update own progress in circle
  const handleUpdateProgressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCircleId) return;

    try {
      await updateMemberSettingsMutation.mutateAsync({
        circleId: selectedCircleId,
        currentProgress: progressInput
      });
      setIsProgressModalOpen(false);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update progress.');
    }
  };

  // Create thread inside circle
  const handleCreateThreadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCircleId || !newThreadTitle.trim()) return;

    try {
      const threadResponse = await addThreadMutation.mutateAsync({
        circleId: selectedCircleId,
        data: {
          title: newThreadTitle.trim(),
          chapter: newThreadChapter.trim() || 'General',
          chapterTag: newThreadChapter.trim() || 'General',
          spoilerLevelPage: newThreadSpoilerPage
        }
      });
      setNewThreadTitle('');
      setNewThreadChapter('');
      setNewThreadSpoilerPage(0);
      setIsThreadCreateModalOpen(false);
      setSelectedThreadId(threadResponse.id);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create discussion thread.');
    }
  };

  // Post composer
  const handleCreatePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedThreadId || !newPostContent.trim()) return;

    if (!newPostChapterTag.trim()) {
      setPostComposerError('Please tag which chapter this post relates to.');
      return;
    }

    if (newPostContent.length > 1000) {
      setPostComposerError('Character limit exceeded (maximum 1000 characters).');
      return;
    }

    // Verify progress gate
    if (activeCircleOwnMember && newPostPageRef > activeCircleOwnMember.currentProgress) {
      setPostComposerError(`You cannot tag a post at page ${newPostPageRef} when your logged progress is page ${activeCircleOwnMember.currentProgress}.`);
      return;
    }

    try {
      setPostComposerError(null);
      
      const contentWithQuote = postQuoteText 
        ? `"${postQuoteText}"\n\n${newPostContent.trim()}`
        : newPostContent.trim();

      await addPostMutation.mutateAsync({
        threadId: selectedThreadId,
        content: contentWithQuote,
        chapterTag: newPostChapterTag.trim(),
        pageReference: newPostPageRef
      });

      setNewPostContent('');
      setPostQuoteText(null);
      setIsPostComposerOpen(false);
    } catch (err: any) {
      setPostComposerError(err.response?.data?.error || 'Failed to post thought.');
    }
  };

  // Confirm Reveal Spoiler
  const handleConfirmRevealSpoiler = () => {
    if (postToConfirmReveal) {
      setRevealedPostIds([...revealedPostIds, postToConfirmReveal.id]);
      setPostToConfirmReveal(null);
    }
  };

  // Edit/delete post operations
  const handleStartEditPost = (post: any) => {
    setEditingPost(post);
    setNewPostContent(post.content);
    setNewPostChapterTag(post.chapterTag || 'General');
    setNewPostPageRef(post.pageReference || 0);
    setIsPostComposerOpen(true);
  };

  const handleUpdatePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost || !newPostContent.trim()) return;

    try {
      await editPostMutation.mutateAsync({
        postId: editingPost.id,
        content: newPostContent.trim(),
        threadId: selectedThreadId!
      });
      setNewPostContent('');
      setEditingPost(null);
      setIsPostComposerOpen(false);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update post.');
    }
  };

  const handleDeletePostSubmit = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
      await deletePostMutation.mutateAsync({ postId, threadId: selectedThreadId! });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete post.');
    }
  };

  const handleToggleReactionSubmit = async (postId: string, reaction: string) => {
    try {
      await toggleReactionMutation.mutateAsync({ postId, reaction, threadId: selectedThreadId! });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to toggle reaction.');
    }
  };

  const handleSaveSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCircleId) return;

    try {
      // Update circle general info
      await updateCircleSettingsMutation.mutateAsync({
        id: selectedCircleId,
        updates: {
          name: settingsCircleName,
          description: settingsCircleDesc,
          currentBookId: settingsBookId || null
        }
      });

      // Update personal preferences
      await updateMemberSettingsMutation.mutateAsync({
        circleId: selectedCircleId,
        notificationPreference: settingsNotificationPref,
        muteUntilChapter: settingsMuteUntilChapter
      });

      setIsCircleSettingsOpen(false);
      alert('Settings updated successfully.');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save settings.');
    }
  };

  const handleLeaveCircleSubmit = async () => {
    if (!selectedCircleId) return;
    if (!confirm('Are you sure you want to leave this reading circle?')) return;

    try {
      await leaveCircleMutation.mutateAsync(selectedCircleId);
      setIsCircleSettingsOpen(false);
      setIsCircleDetailOpen(false);
      setSelectedCircleId(null);
      setSelectedThreadId(null);
      alert('You have left the circle.');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to leave circle.');
    }
  };

  const handleDeleteCircleSubmit = async () => {
    if (!selectedCircleId) return;
    if (!confirm('WARNING: Are you absolutely sure you want to delete this reading circle? This will remove all discussion threads and members permanently.')) return;

    try {
      await deleteCircleMutation.mutateAsync(selectedCircleId);
      setIsCircleSettingsOpen(false);
      setIsCircleDetailOpen(false);
      setSelectedCircleId(null);
      setSelectedThreadId(null);
      alert('The reading circle has been deleted.');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete circle.');
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', minHeight: '82vh', paddingBottom: '3rem' }}>
      
      {/* Top Bar Navigation */}
      <div className="flex-between" style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.85rem' }}>
        <div>
          <h1 className="screen-title" style={{ fontSize: '1.85rem' }}>Groups</h1>
          <p className="screen-subtitle">Intimate, private reading circles to discuss books safely with friends.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => setIsJoinCodeModalOpen(true)}
            style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
          >
            <Key size={14} /> Join code
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => {
              setIsCreateWizardOpen(true);
              setWizardStep(1);
            }}
            style={{ color: '#091A1E', fontWeight: 700, display: 'flex', gap: '0.5rem', alignItems: 'center' }}
          >
            <Plus size={15} /> Create circle
          </button>
        </div>
      </div>

      {/* Pill tabs row */}
      <div style={{ display: 'flex', gap: '0.75rem', margin: '0.25rem 0' }}>
        <button 
          onClick={() => setActiveTab('my-circles')}
          style={{
            padding: '0.45rem 1rem',
            borderRadius: 'var(--radius-full)',
            border: '1px solid',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600,
            transition: 'all 0.25s',
            backgroundColor: activeTab === 'my-circles' ? 'var(--accent-primary)' : 'transparent',
            borderColor: activeTab === 'my-circles' ? 'var(--accent-primary)' : 'var(--border-glass)',
            color: activeTab === 'my-circles' ? '#091A1E' : 'var(--text-secondary)'
          }}
        >
          My circles
        </button>
        <button 
          onClick={() => setActiveTab('active-now')}
          style={{
            padding: '0.45rem 1rem',
            borderRadius: 'var(--radius-full)',
            border: '1px solid',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600,
            transition: 'all 0.25s',
            backgroundColor: activeTab === 'active-now' ? 'var(--accent-primary)' : 'transparent',
            borderColor: activeTab === 'active-now' ? 'var(--accent-primary)' : 'var(--border-glass)',
            color: activeTab === 'active-now' ? '#091A1E' : 'var(--text-secondary)'
          }}
        >
          Active now
        </button>
        <button 
          onClick={() => setActiveTab('invitations')}
          style={{
            padding: '0.45rem 1rem',
            borderRadius: 'var(--radius-full)',
            border: '1px solid',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600,
            transition: 'all 0.25s',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: activeTab === 'invitations' ? 'var(--accent-primary)' : 'transparent',
            borderColor: activeTab === 'invitations' ? 'var(--accent-primary)' : 'var(--border-glass)',
            color: activeTab === 'invitations' ? '#091A1E' : 'var(--text-secondary)'
          }}
        >
          Invitations
          {pendingInvitations.length > 0 && (
            <span style={{
              background: activeTab === 'invitations' ? '#091A1E' : 'var(--color-on-hold)',
              color: activeTab === 'invitations' ? 'var(--accent-primary)' : '#fff',
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '0.1rem 0.4rem',
              borderRadius: 'var(--radius-full)'
            }}>
              {pendingInvitations.length}
            </span>
          )}
        </button>
      </div>

      {/* Primary scrollable body container */}
      <div style={{ flexGrow: 1, minHeight: '50vh' }}>
        {activeTab === 'invitations' ? (
          /* INVITATIONS TAB VIEW */
          isInvitesLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '30vh', color: 'var(--text-secondary)' }}>
              <Loader2 className="animate-spin" style={{ marginRight: '0.5rem' }} /> Loading pending invitations...
            </div>
          ) : pendingInvitations.length === 0 ? (
            <div className="glass" style={{ padding: '3.5rem', textAlign: 'center', maxWidth: '460px', margin: '3rem auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
              <Bell size={40} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
              <div>
                <h3 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>No invitations right now</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.4 }}>
                  Ask a friend to share their circle invite link or invite you by username.
                </p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {pendingInvitations.map(invite => (
                <div key={invite.id} className="glass animate-fade-in" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  {invite.bookCoverUrl ? (
                    <img 
                      src={invite.bookCoverUrl} 
                      onError={(e: any) => e.target.src = '/fallback-book.png'}
                      style={{ width: '36px', height: '52px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-glass)' }}
                      alt="Book Cover"
                    />
                  ) : (
                    <div style={{ width: '36px', height: '52px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                      <BookOpen size={16} />
                    </div>
                  )}
                  <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{invite.circleName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Invited by <strong style={{ color: 'var(--accent-primary)' }}>{invite.invitedByUsername}</strong>
                    </div>
                    {invite.bookTitle && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        Book: {invite.bookTitle}
                      </div>
                    )}
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      👥 {invite.membersCount} members already reading
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                      <button 
                        onClick={() => handleAcceptInvite(invite)}
                        className="btn btn-primary" 
                        style={{ padding: '0.35rem 0.85rem', fontSize: '0.75rem', color: '#091A1E', fontWeight: 700 }}
                      >
                        Join
                      </button>
                      <button 
                        onClick={() => handleDeclineInvitation(invite)}
                        className="btn btn-secondary" 
                        style={{ padding: '0.35rem 0.85rem', fontSize: '0.75rem' }}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* MY CIRCLES / ACTIVE NOW TAB VIEW */
          isCirclesLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '30vh', color: 'var(--text-secondary)' }}>
              <Loader2 className="animate-spin" style={{ marginRight: '0.5rem' }} /> Loading circles...
            </div>
          ) : filteredCircles.length === 0 ? (
            <div className="glass" style={{ padding: '3.5rem', textAlign: 'center', maxWidth: '480px', margin: '4rem auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
              <Users size={48} style={{ color: 'var(--accent-primary)', opacity: 0.4 }} />
              <div>
                <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>No circles yet</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.5 }}>
                  Reading is better together. Create a circle or accept an invite.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '1rem', width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setActiveTab('invitations')}
                  style={{ flexGrow: 1 }}
                >
                  Browse invites
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={() => setIsCreateWizardOpen(true)}
                  style={{ flexGrow: 1, color: '#091A1E', fontWeight: 700 }}
                >
                  Create circle
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
              {filteredCircles.map((circle: any) => {
                const isSelected = selectedCircleId === circle.id;
                return (
                  <div key={circle.id} style={{ position: 'relative' }}>
                    <CircleCard
                      circle={{
                        id: circle.id,
                        name: circle.name,
                        member_count: circle.members?.length || 0,
                        my_progress: circle.userProgressPercentage || 0,
                        others_avg_progress: circle.othersAvgPercentage || 0,
                        unread_post_count: circle.unread_post_count || 0,
                        book_title: circle.currentBook?.title,
                        book_cover: circle.currentBook?.coverUrl
                      }}
                      onClick={() => handleSelectCircle(circle.id)}
                    />
                    
                    {/* Setting context trigger */}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveContextMenuCircleId(activeContextMenuCircleId === circle.id ? null : circle.id);
                      }}
                      style={{
                        position: 'absolute',
                        top: '1.25rem',
                        right: '1.25rem',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        zIndex: 10
                      }}
                    >
                      <MoreVertical size={16} />
                    </button>

                    {activeContextMenuCircleId === circle.id && (
                      <div 
                        onClick={(e) => e.stopPropagation()}
                        className="glass" 
                        style={{
                          position: 'absolute',
                          top: '3rem',
                          right: '1.25rem',
                          zIndex: 50,
                          padding: '0.5rem 0',
                          borderRadius: 'var(--radius-sm)',
                          width: '180px',
                          boxShadow: 'var(--shadow-lg)'
                        }}
                      >
                        <button 
                          onClick={() => {
                            setActiveContextMenuCircleId(null);
                            handleSelectCircle(circle.id);
                          }}
                          style={{ width: '100%', textAlign: 'left', border: 'none', background: 'none', padding: '0.5rem 1rem', fontSize: '0.8rem', color: 'var(--text-primary)', cursor: 'pointer' }}
                        >
                          View circle
                        </button>
                        <button 
                          onClick={() => {
                            setActiveContextMenuCircleId(null);
                            setSelectedCircleId(circle.id);
                            setIsCircleSettingsOpen(true);
                          }}
                          style={{ width: '100%', textAlign: 'left', border: 'none', background: 'none', padding: '0.5rem 1rem', fontSize: '0.8rem', color: 'var(--text-primary)', cursor: 'pointer' }}
                        >
                          Circle settings
                        </button>
                        <button 
                          onClick={async () => {
                            setActiveContextMenuCircleId(null);
                            setSelectedCircleId(circle.id);
                            await handleGenerateShareLink();
                          }}
                          style={{ width: '100%', textAlign: 'left', border: 'none', background: 'none', padding: '0.5rem 1rem', fontSize: '0.8rem', color: 'var(--text-primary)', cursor: 'pointer' }}
                        >
                          Share invite link
                        </button>
                        <button 
                          onClick={async () => {
                            setActiveContextMenuCircleId(null);
                            setSelectedCircleId(circle.id);
                            await handleLeaveCircleSubmit();
                          }}
                          style={{ width: '100%', textAlign: 'left', border: 'none', background: 'none', padding: '0.5rem 1rem', fontSize: '0.8rem', color: '#ef4444', cursor: 'pointer' }}
                        >
                          Leave circle
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        )}
      </div>

      {/* ========================================================
          SECTION 2 & 3: CIRCLE DETAIL SCREEN OVERLAY / PUSH
          ======================================================== */}
      {isCircleDetailOpen && activeCircle && (
        <div 
          className="glass animate-fade-in" 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 2100,
            backgroundColor: 'var(--bg-primary)',
            padding: '1.5rem',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button 
                onClick={() => {
                  setIsCircleDetailOpen(false);
                  setSelectedThreadId(null);
                }}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontFamily: 'var(--font-display)' }}>{activeCircle.name}</h2>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Invite Code: <strong style={{ color: 'var(--accent-primary)' }}>{activeCircle.inviteCode}</strong>
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setIsCircleSettingsOpen(true)}
                style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              >
                <Settings size={14} /> Settings
              </button>
            </div>
          </div>

          {/* Book Info Section */}
          {activeCircle.type === 'same_book' && activeCircle.currentBook ? (
            <div className="glass" style={{ padding: '1rem', display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
              <img 
                src={activeCircle.currentBook.coverUrl || ''} 
                onError={(e: any) => e.target.src = '/fallback-book.png'}
                style={{ width: '48px', height: '68px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-glass)' }}
                alt="Book cover"
              />
              <div style={{ flexGrow: 1, minWidth: 0 }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--accent-primary)', fontWeight: 700 }}>Reading Together</div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0.15rem 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {activeCircle.currentBook.title}
                </h3>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>by {activeCircle.currentBook.author}</div>
              </div>

              {/* Progress Tracker */}
              <div style={{ minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div className="flex-between" style={{ fontSize: '11px' }}>
                  <span>Your progress: page {activeCircleOwnMember?.currentProgress || 0}</span>
                  <button 
                    onClick={() => {
                      setProgressInput(activeCircleOwnMember?.currentProgress || 0);
                      setIsProgressModalOpen(true);
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 600, fontSize: '11px' }}
                  >
                    Update
                  </button>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{ width: `${activeCircle.userProgressPercentage || 0}%`, height: '100%', backgroundColor: '#43c6d6', borderRadius: '99px' }} />
                </div>
              </div>
            </div>
          ) : (
            <div className="glass" style={{ padding: '0.85rem 1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>📖 Circle members are reading different books. Track progress individually.</span>
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  setProgressInput(activeCircleOwnMember?.currentProgress || 0);
                  setIsProgressModalOpen(true);
                }}
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
              >
                Log pages
              </button>
            </div>
          )}

          {/* Inner Detail Tabs */}
          <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.1rem' }}>
            <button 
              onClick={() => setCircleDetailTab('discussion')}
              style={{
                background: 'none', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                color: circleDetailTab === 'discussion' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                borderBottom: circleDetailTab === 'discussion' ? '2px solid var(--accent-primary)' : 'none'
              }}
            >
              Discussion
            </button>
            <button 
              onClick={() => setCircleDetailTab('members')}
              style={{
                background: 'none', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                color: circleDetailTab === 'members' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                borderBottom: circleDetailTab === 'members' ? '2px solid var(--accent-primary)' : 'none'
              }}
            >
              Members ({activeCircle.members?.length || 0})
            </button>
            {activeCircle?.type === 'same_book' && activeCircle?.currentBook && (
              <button 
                onClick={() => setCircleDetailTab('book-info')}
                style={{
                  background: 'none', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                  color: circleDetailTab === 'book-info' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  borderBottom: circleDetailTab === 'book-info' ? '2px solid var(--accent-primary)' : 'none'
                }}
              >
                Book Info
              </button>
            )}
          </div>

          {/* TAB CONTENTS */}
          <div style={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            
            {circleDetailTab === 'book-info' && activeCircle.currentBook && (
              /* BOOK INFO TAB */
              <div className="animate-fade-in" style={{ padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
                <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)' }}>About the book</h3>
                {activeCircle.currentBook.description && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6, maxWidth: '720px' }}>
                    {getCrispDescription(activeCircle.currentBook.description)}
                  </p>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {activeCircle.currentBook.genres?.map((genre, idx) => (
                    <span key={idx} style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', padding: '0.25rem 0.6rem', borderRadius: 'var(--radius-full)' }}>
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {circleDetailTab === 'members' && (
              /* MEMBERS PROGRESS LIST TAB */
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', padding: '0.5rem' }}>
                {activeCircle.members?.map((member: any) => {
                  const mProgress = member.currentProgress || 0;
                  const mPercent = calculatePercentage(mProgress, activeCircle.currentBook?.pageCount || 0);
                  return (
                    <div key={member.id} className="glass" style={{ padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexGrow: 1 }}>
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '50%', color: '#fff', fontWeight: 700, fontSize: '0.8rem',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          backgroundColor: getAvatarColor(member.user?.username || 'user')
                        }}>
                          {getInitials(member.user?.username)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{member.user?.username}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Role: {member.role}</div>
                        </div>
                      </div>

                      <div style={{ minWidth: '240px', display: 'flex', flexDirection: 'column', gap: '0.2rem', textAlign: 'right' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          Page {mProgress} of {activeCircle.currentBook?.pageCount || 'unknown'} ({mPercent}%)
                        </div>
                        {activeCircle.type === 'same_book' && (
                          <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
                            <div style={{ width: `${mPercent}%`, height: '100%', backgroundColor: '#10b981', borderRadius: '99px' }} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {circleDetailTab === 'discussion' && (
              /* DISCUSSION FORUMS TAB & FEED */
              <div style={{ flexGrow: 1, display: 'grid', gridTemplateColumns: '260px 1fr', gap: '1.5rem', overflow: 'hidden', height: '100%' }}>
                
                {/* Threads Sidebar */}
                <div className="glass" style={{ display: 'flex', flexDirection: 'column', padding: '0.85rem', overflowY: 'auto' }}>
                  <div className="flex-between" style={{ marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)' }}>Discussion threads</span>
                    <button 
                      onClick={() => setIsThreadCreateModalOpen(true)}
                      style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer' }}
                      title="New thread"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {activeCircle.threads?.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', padding: '1rem', textAlign: 'center' }}>No threads created yet.</p>
                    ) : (
                      activeCircle.threads?.map((thread: any) => {
                        const isSelected = selectedThreadId === thread.id;
                        // Determine if thread is locked / spoiler
                        const isSpoiler = activeCircle.type === 'same_book' && thread.spoilerLevelPage > (activeCircleOwnMember?.currentProgress || 0);

                        return (
                          <button
                            key={thread.id}
                            onClick={() => {
                              setSelectedThreadId(thread.id);
                              setRevealedPostIds([]);
                            }}
                            style={{
                              padding: '0.6rem 0.75rem',
                              borderRadius: 'var(--radius-md)',
                              border: '1px solid',
                              cursor: 'pointer',
                              textAlign: 'left',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.15rem',
                              backgroundColor: isSelected ? 'rgba(212, 178, 111, 0.08)' : 'transparent',
                              borderColor: isSelected ? 'var(--accent-primary)' : 'transparent',
                              color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)'
                            }}
                          >
                            <div style={{ fontWeight: 600, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', width: '100%' }}>
                              {isSpoiler && <Lock size={10} style={{ color: 'var(--color-on-hold)', flexShrink: 0 }} />}
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexGrow: 1 }}>{thread.title}</span>
                            </div>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Tag: {thread.chapterTag || 'General'}</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Posts Feed Area */}
                <div className="glass" style={{ display: 'flex', flexDirection: 'column', padding: '1rem', overflow: 'hidden', height: '100%' }}>
                  {selectedThreadId ? (
                    (() => {
                      if (!activeThread) return null;
                      
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                          
                          {/* Thread Title info */}
                          <div style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.75rem', marginBottom: '0.85rem' }}>
                            <div className="flex-between">
                              <span style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: 700, textTransform: 'uppercase' }}>
                                {activeThread.chapterTag || 'General'}
                              </span>
                            </div>
                            <h3 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-display)' }}>{activeThread.title}</h3>
                          </div>
                          
                          {/* Posts list */}
                          <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.85rem', paddingRight: '0.25rem', marginBottom: '1rem' }}>
                            <DiscussionFeed 
                              circleId={activeCircle.id} 
                              threadId={selectedThreadId} 
                              onStartEdit={(post) => {
                                setEditingPost(post);
                              }}
                            />
                          </div>

                          <PostComposer
                            circleId={activeCircle.id}
                            threadId={selectedThreadId}
                            myCurrentPage={activeCircleOwnMember?.currentProgress || 0}
                            myCurrentChapter={activeCircleOwnMember?.chapterTag || ''}
                            editingPost={editingPost}
                            onCancelEdit={() => setEditingPost(null)}
                            onPostCreated={() => {
                              setEditingPost(null);
                            }}
                          />
                        </div>
                      );
                    })()
                  ) : (
                    <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <MessageSquare size={36} style={{ marginBottom: '0.85rem', opacity: 0.3 }} />
                      <p style={{ fontSize: '0.85rem' }}>Select a discussion thread from the sidebar, or create a new one.</p>
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>
      )}



      {/* ========================================================
          MODAL: PROGRESS INPUT DIALOG
          ======================================================== */}
      {isProgressModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 130 }}>
          <div className="modal-content glass" style={{ maxWidth: '350px' }}>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem', fontFamily: 'var(--font-display)' }}>Update my progress</h3>
            <form onSubmit={handleUpdateProgressSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                  Current page number
                </label>
                <input 
                  type="number" 
                  className="form-input" 
                  min={0} 
                  value={progressInput} 
                  onChange={e => setProgressInput(parseInt(e.target.value) || 0)} 
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsProgressModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ color: '#091A1E', fontWeight: 700 }} disabled={updateMemberSettingsMutation.isPending}>
                  Save Progress
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: CIRCLE SETTINGS PANEL
          ======================================================== */}
      {isCircleSettingsOpen && activeCircle && (
        <div className="modal-overlay" style={{ zIndex: 130 }}>
          <div className="modal-content glass" style={{ maxWidth: '440px' }}>
            <button className="modal-close" onClick={() => setIsCircleSettingsOpen(false)}>
              <X size={18} />
            </button>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', fontFamily: 'var(--font-display)' }}>Circle Settings</h2>
            
            <form onSubmit={handleSaveSettingsSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* General Admin section */}
              <div style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>General Information</div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Circle Name</label>
                  <input type="text" className="form-input" value={settingsCircleName} onChange={e => setSettingsCircleName(e.target.value)} required />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Description</label>
                  <input type="text" className="form-input" value={settingsCircleDesc} onChange={e => setSettingsCircleDesc(e.target.value)} />
                </div>

                {activeCircle?.type === 'same_book' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Active Book</label>
                    <select className="form-select" value={settingsBookId} onChange={e => setSettingsBookId(e.target.value)}>
                      <option value="">Select book...</option>
                      {books.map(b => (
                        <option key={b.id} value={b.id}>{b.title}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Notification Preferences */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Personal Preferences</div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Notification digest frequency</label>
                  <select className="form-select" value={settingsNotificationPref} onChange={e => setSettingsNotificationPref(e.target.value)}>
                    <option value="all">Notify for all posts</option>
                    <option value="daily">Daily digest only</option>
                    <option value="mute">Mute notifications</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Mute until chapter tag (e.g. 10)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={settingsMuteUntilChapter || ''} 
                    onChange={e => setSettingsMuteUntilChapter(parseInt(e.target.value) || null)} 
                    placeholder="No chapter mute lock set"
                  />
                </div>
              </div>

              {/* Danger operations */}
              <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                <button 
                  type="button" 
                  onClick={handleLeaveCircleSubmit}
                  className="btn btn-secondary" 
                  style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                >
                  Leave circle
                </button>
                {activeCircle?.creatorId === user?.id && (
                  <button 
                    type="button" 
                    onClick={handleDeleteCircleSubmit}
                    className="btn btn-secondary" 
                    style={{ color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.05)', borderColor: '#ef4444' }}
                  >
                    Delete circle
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsCircleSettingsOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ color: '#091A1E', fontWeight: 700 }} disabled={updateCircleSettingsMutation.isPending || updateMemberSettingsMutation.isPending}>
                  Save changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: THREAD CREATE DIALOG
          ======================================================== */}
      {isThreadCreateModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 130 }}>
          <div className="modal-content glass" style={{ maxWidth: '400px' }}>
            <button className="modal-close" onClick={() => setIsThreadCreateModalOpen(false)}>
              <X size={18} />
            </button>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', fontFamily: 'var(--font-display)' }}>Create thread</h3>

            <form onSubmit={handleCreateThreadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Thread Title</label>
                <input type="text" className="form-input" placeholder="e.g. Dumbledore's Decision Reflections" value={newThreadTitle} onChange={e => setNewThreadTitle(e.target.value)} required />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Chapter tag / prompt name</label>
                <input type="text" className="form-input" placeholder="e.g. Chapter 14" value={newThreadChapter} onChange={e => setNewThreadChapter(e.target.value)} required />
              </div>

              {activeCircle?.type === 'same_book' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Spoiler Page Threshold</label>
                  <input type="number" className="form-input" placeholder="e.g. 150" value={newThreadSpoilerPage || ''} onChange={e => setNewThreadSpoilerPage(parseInt(e.target.value) || 0)} required />
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '0.15rem', display: 'block' }}>
                    This thread will lock posts from users who haven&apos;t reached page {newThreadSpoilerPage || 0}.
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsThreadCreateModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ color: '#091A1E', fontWeight: 700 }} disabled={addThreadMutation.isPending}>
                  Create Thread
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: CREATE NEW CIRCLE 3-STEP WIZARD BOTTOM SHEET
          ======================================================== */}
      {isCreateWizardOpen && (
        <div className="modal-overlay" style={{ zIndex: 120 }}>
          <div className="modal-content glass" style={{ maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button className="modal-close" onClick={() => {
              setIsCreateWizardOpen(false);
              setSelectedBook(null);
              setSelectedBookId('');
              setBookSearchQuery('');
            }}>
              <X size={18} />
            </button>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)' }}>Create circle</h2>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>Step {wizardStep} of 3</span>
            </div>

            {/* Step Indicators */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {[1, 2, 3].map(step => (
                <div 
                  key={step} 
                  style={{
                    flexGrow: 1, height: '4px', borderRadius: '2px',
                    background: wizardStep >= step ? 'var(--accent-primary)' : 'rgba(255,255,255,0.06)'
                  }} 
                />
              ))}
            </div>

            {/* STEP 1: Name and details */}
            {wizardStep === 1 && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Circle name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Orwellian reads with Meera"
                    value={circleName}
                    onChange={e => setCircleName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Description</label>
                  <textarea 
                    rows={2}
                    className="form-input" 
                    placeholder="e.g. Weekly analysis of dystopian fiction"
                    value={circleDesc}
                    onChange={e => setCircleDesc(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Circle Type</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.2rem' }}>
                    <button
                      type="button"
                      onClick={() => setCircleType('same_book')}
                      style={{
                        padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid', textAlign: 'center', cursor: 'pointer',
                        background: circleType === 'same_book' ? 'rgba(212, 178, 111, 0.08)' : 'transparent',
                        borderColor: circleType === 'same_book' ? 'var(--accent-primary)' : 'var(--border-glass)',
                        color: circleType === 'same_book' ? 'var(--text-primary)' : 'var(--text-secondary)'
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Same book</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>Compare page progress percentage</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCircleType('different_books')}
                      style={{
                        padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid', textAlign: 'center', cursor: 'pointer',
                        background: circleType === 'different_books' ? 'rgba(212, 178, 111, 0.08)' : 'transparent',
                        borderColor: circleType === 'different_books' ? 'var(--accent-primary)' : 'var(--border-glass)',
                        color: circleType === 'different_books' ? 'var(--text-primary)' : 'var(--text-secondary)'
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Different books</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>Discuss different titles individually</div>
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsCreateWizardOpen(false)}>Cancel</button>
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    style={{ color: '#091A1E', fontWeight: 700 }}
                    onClick={() => {
                      if (!circleName.trim()) {
                        alert('Circle name is required.');
                        return;
                      }
                      if (circleType === 'different_books') {
                        setWizardStep(3); // skip step 2
                      } else {
                        setWizardStep(2);
                      }
                    }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Choose active book */}
            {wizardStep === 2 && circleType === 'same_book' && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {isCreatingBook ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', gap: '0.75rem', color: 'var(--text-secondary)' }}>
                    <Loader2 className="animate-spin" size={24} />
                    <span style={{ fontSize: '0.85rem' }}>Importing book to your library...</span>
                  </div>
                ) : selectedBook ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Selected Book</label>
                    <div className="glass" style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '1rem', borderRadius: 'var(--radius-md)', borderColor: 'var(--accent-primary)', borderStyle: 'solid' }}>
                      <img 
                        src={selectedBook.coverUrl || '/fallback-book.png'} 
                        alt="Book cover" 
                        onError={(e: any) => e.target.src = '/fallback-book.png'} 
                        style={{ width: '40px', height: '60px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-glass)' }} 
                      />
                      <div style={{ flexGrow: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {selectedBook.title}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          by {selectedBook.author}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                          {selectedBook.pageCount || 300} pages
                        </div>
                      </div>
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                        onClick={() => {
                          setSelectedBook(null);
                          setSelectedBookId('');
                          setBookSearchQuery('');
                        }}
                      >
                        Change
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Search for a book or select from shelf</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="Search by title, author, or ISBN..."
                        value={bookSearchQuery}
                        onChange={e => {
                          setBookSearchQuery(e.target.value);
                          setSelectedBookId('');
                        }}
                      />
                    </div>

                    {/* Display selector list of books from shelf or search */}
                    <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem', border: '1px solid var(--border-glass)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
                      {bookSearchQuery.trim().length <= 2 ? (
                        // Show shelf books
                        <>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', padding: '0.2rem 0.4rem', fontWeight: 700 }}>From your shelf</div>
                          {books.length === 0 ? (
                            <div style={{ fontSize: '0.75rem', padding: '0.5rem', color: 'var(--text-muted)' }}>Your shelf is empty. Type to search external books.</div>
                          ) : (
                            books.map(b => (
                              <div 
                                key={b.id} 
                                onClick={() => handleSelectBook(b, false)}
                                style={{
                                  display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.35rem', borderRadius: '4px', cursor: 'pointer',
                                  backgroundColor: selectedBookId === b.id ? 'rgba(212, 178, 111, 0.12)' : 'transparent',
                                  border: selectedBookId === b.id ? '1px solid var(--accent-primary)' : '1px solid transparent'
                                }}
                              >
                                <img src={b.coverUrl || ''} alt="Book cover" onError={(e: any) => e.target.src = '/fallback-book.png'} style={{ width: '20px', height: '30px', objectFit: 'cover', borderRadius: '2px' }} />
                                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{b.title}</span>
                              </div>
                            ))
                          )}
                        </>
                      ) : (
                        // Show search results
                        isSearchingBooks ? (
                          <div style={{ fontSize: '0.75rem', padding: '1rem', color: 'var(--text-muted)', textAlign: 'center' }}>Searching Google Books...</div>
                        ) : searchResults.length === 0 ? (
                          <div style={{ fontSize: '0.75rem', padding: '1rem', color: 'var(--text-muted)', textAlign: 'center' }}>No books found.</div>
                        ) : (
                          searchResults.map((b: any, idx: number) => (
                            <div 
                              key={b.id || idx} 
                              onClick={() => handleSelectBook(b, true)}
                              style={{
                                display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.35rem', borderRadius: '4px', cursor: 'pointer',
                                backgroundColor: selectedBookId === b.id ? 'rgba(212, 178, 111, 0.12)' : 'transparent',
                                border: selectedBookId === b.id ? '1px solid var(--accent-primary)' : '1px solid transparent'
                              }}
                            >
                              <img src={b.coverUrl || b.volumeInfo?.imageLinks?.thumbnail || ''} alt="Book cover" onError={(e: any) => e.target.src = '/fallback-book.png'} style={{ width: '20px', height: '30px', objectFit: 'cover', borderRadius: '2px' }} />
                              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{b.title || b.volumeInfo?.title}</span>
                            </div>
                          ))
                        )
                      )}
                    </div>
                  </>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setWizardStep(1)}>Back</button>
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    style={{ color: '#091A1E', fontWeight: 700 }}
                    disabled={!selectedBookId || isCreatingBook}
                    onClick={() => setWizardStep(3)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Invite members */}
            {wizardStep === 3 && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Invite link</label>
                  <button 
                    type="button"
                    onClick={handleGenerateShareLink}
                    className="btn btn-secondary"
                    style={{ width: '100%', display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center' }}
                  >
                    <Share2 size={14} /> Generate share link
                  </button>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Invite by username</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Enter username..." 
                      value={inviteUsername} 
                      onChange={e => setInviteUsername(e.target.value)} 
                    />
                    <button type="button" className="btn btn-secondary" onClick={handleAddInvitee}>Add</button>
                  </div>
                </div>

                {/* Invited user list */}
                {invitees.length > 0 && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Invite List ({invitees.length}/9)</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {invitees.map((name, idx) => (
                        <span key={idx} style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.5rem', borderRadius: '4px', display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                          {name}
                          <button onClick={() => setInvitees(invitees.filter(n => n !== name))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem' }}>×</button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => {
                      if (circleType === 'different_books') {
                        setWizardStep(1);
                      } else {
                        setWizardStep(2);
                      }
                    }}
                  >
                    Back
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    style={{ color: '#091A1E', fontWeight: 700 }}
                    onClick={handleCreateCircleSubmit}
                  >
                    Create circle
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: DIRECT JOIN CODE INPUT DIALOG
          ======================================================== */}
      {isJoinCodeModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 130 }}>
          <div className="modal-content glass" style={{ maxWidth: '360px' }}>
            <button className="modal-close" onClick={() => setIsJoinCodeModalOpen(false)}>
              <X size={18} />
            </button>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', fontFamily: 'var(--font-display)' }}>Join circle</h3>
            <form onSubmit={handleJoinByCodeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                  Invite code
                </label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. RC-XXXXXX or INV-XXXXXX" 
                  value={joinCodeInput} 
                  onChange={e => setJoinCodeInput(e.target.value)} 
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsJoinCodeModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ color: '#091A1E', fontWeight: 700 }} disabled={joinCircleMutation.isPending}>
                  Join
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          UNDO NOTIFICATION TOAST
          ======================================================== */}
      {showUndoToast && recentlyDeclinedInvite && (
        <div 
          className="glass animate-fade-in" 
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            zIndex: 200,
            padding: '0.85rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1.5rem',
            borderColor: 'var(--accent-primary)',
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
            Invitation to <strong>{recentlyDeclinedInvite.circleName}</strong> declined.
          </span>
          <button 
            onClick={handleUndoDecline}
            style={{
              background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer',
              fontWeight: 700, fontSize: '0.85rem'
            }}
          >
            Undo
          </button>
        </div>
      )}

    </div>
  );
}
