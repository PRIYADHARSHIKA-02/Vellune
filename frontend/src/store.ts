import { create } from 'zustand';
import { db } from './db';
import type { 
  Book, ReadingSession, Note, CustomShelf, 
  ReadingCircle, Recommendation, DiscussionThread, DiscussionPost 
} from './db';

// Re-export type definitions for other components
export type { 
  Book, ReadingSession, Note, CustomShelf, 
  ReadingCircle, Recommendation, DiscussionThread, DiscussionPost 
};

export interface UserProfile {
  name: string;
  email: string;
  avatarUrl: string;
  bio: string;
  favoriteGenre: string;
}

export type ScreenType = 'home' | 'shelf' | 'track' | 'discover' | 'remember' | 'groups' | 'stats';

interface ActiveSessionState {
  bookId: string;
  startTime: string;
  location: string;
  moodBefore: string;
}

interface StoreState {
  books: Book[];
  sessions: ReadingSession[];
  notes: Note[];
  shelves: CustomShelf[];
  circles: ReadingCircle[];
  recommendations: Recommendation[];
  activeSession: ActiveSessionState | null;
  currentScreen: ScreenType;
  selectedBookIdForDetail: string | null;
  theme: 'dark' | 'light';
  user: UserProfile | null;
  isAuthenticated: boolean;
  
  // Actions
  initStore: () => void;
  setScreen: (screen: ScreenType) => void;
  setSelectedBookIdForDetail: (id: string | null) => void;
  toggleTheme: () => void;
  refreshData: () => void;
  
  // User Actions
  login: (email: string, name?: string) => void;
  signUp: (email: string, name: string) => void;
  logout: () => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  
  // Active Session Timers
  startReadingSession: (bookId: string, location: string, moodBefore: string) => void;
  cancelReadingSession: () => void;
  endReadingSession: (pagesEnd: number, moodAfter: string, reflection: string) => void;
  addSession: (session: Omit<ReadingSession, 'id'>) => void;
  
  // Book Actions
  addBook: (book: Omit<Book, 'id' | 'date_added' | 'progress_percentage'>) => void;
  updateBook: (id: string, updates: Partial<Book>) => void;
  deleteBook: (id: string) => void;
  
  // Note Actions
  addNote: (note: Omit<Note, 'id' | 'created_at'>) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  
  // Shelf Actions
  addShelf: (shelf: Omit<CustomShelf, 'id'>) => void;
  
  // Circles Actions
  addCircle: (circle: Omit<ReadingCircle, 'id' | 'threads' | 'member_count' | 'invite_code'>) => void;
  addPost: (circleId: string, threadId: string, username: string, content: string) => void;
  addThread: (circleId: string, bookTitle: string, title: string, chapter: string, spoilerLevel: number) => void;
  joinCircle: (code: string) => boolean;
  
  // Rec Actions
  acceptRec: (recId: string) => void;
  rejectRec: (recId: string) => void;
}

export const useStore = create<StoreState>((set, get) => ({
  books: [],
  sessions: [],
  notes: [],
  shelves: [],
  circles: [],
  recommendations: [],
  activeSession: null,
  currentScreen: 'home',
  selectedBookIdForDetail: null,
  theme: 'dark',
  user: null,
  isAuthenticated: false,

  initStore: () => {
    db.init();
    
    // Load theme
    const savedTheme = localStorage.getItem('rlm_theme') as 'dark' | 'light' | null;
    const theme = savedTheme || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    
    // Load active session
    const savedSession = localStorage.getItem('rlm_active_session');
    const activeSession = savedSession ? JSON.parse(savedSession) : null;
    
    // Load user auth status
    const savedUser = localStorage.getItem('rlm_user');
    const user = savedUser ? JSON.parse(savedUser) : null;
    const isAuthenticated = !!user;
    
    set({ theme, activeSession, user, isAuthenticated });
    get().refreshData();
  },

  setScreen: (screen) => set({ currentScreen: screen, selectedBookIdForDetail: null }),
  setSelectedBookIdForDetail: (id) => set({ selectedBookIdForDetail: id }),

  toggleTheme: () => {
    const nextTheme = get().theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('rlm_theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    set({ theme: nextTheme });
  },

  refreshData: () => {
    set({
      books: db.getBooks(),
      sessions: db.getSessions(),
      notes: db.getNotes(),
      shelves: db.getShelves(),
      circles: db.getCircles(),
      recommendations: db.getRecommendations()
    });
  },

  login: (email, name) => {
    const savedUser = localStorage.getItem('rlm_user');
    const defaultName = name || email.split('@')[0];
    const user: UserProfile = savedUser ? JSON.parse(savedUser) : {
      name: defaultName.charAt(0).toUpperCase() + defaultName.slice(1),
      email,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', // Match seed image avatar or beautiful placeholder
      bio: 'Avid reader and explorer of worlds.',
      favoriteGenre: 'Science Fiction'
    };
    localStorage.setItem('rlm_user', JSON.stringify(user));
    set({ user, isAuthenticated: true });
  },

  signUp: (email, name) => {
    const user: UserProfile = {
      name,
      email,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      bio: 'New member of Vellune.',
      favoriteGenre: 'Mystery'
    };
    localStorage.setItem('rlm_user', JSON.stringify(user));
    set({ user, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('rlm_user');
    set({ user: null, isAuthenticated: false, currentScreen: 'home' });
  },

  updateProfile: (updates) => {
    const { user } = get();
    if (!user) return;
    const updatedUser = { ...user, ...updates };
    localStorage.setItem('rlm_user', JSON.stringify(updatedUser));
    set({ user: updatedUser });
  },

  startReadingSession: (bookId, location, moodBefore) => {
    const session = {
      bookId,
      startTime: new Date().toISOString(),
      location,
      moodBefore
    };
    localStorage.setItem('rlm_active_session', JSON.stringify(session));
    set({ activeSession: session });
  },

  cancelReadingSession: () => {
    localStorage.removeItem('rlm_active_session');
    set({ activeSession: null });
  },

  endReadingSession: (pagesEnd, moodAfter, reflection) => {
    const { activeSession } = get();
    if (!activeSession) return;

    const book = get().books.find(b => b.id === activeSession.bookId);
    if (!book) return;

    const endTime = new Date().toISOString();
    const durationMs = new Date(endTime).getTime() - new Date(activeSession.startTime).getTime();
    const durationMinutes = Math.max(1, Math.round(durationMs / 60000));

    db.addSession({
      book_id: activeSession.bookId,
      start_time: activeSession.startTime,
      end_time: endTime,
      duration_minutes: durationMinutes,
      pages_start: book.current_page,
      pages_end: pagesEnd,
      pages_read: pagesEnd - book.current_page,
      format_used: book.format,
      location: activeSession.location,
      mood_before: activeSession.moodBefore,
      mood_after: moodAfter,
      notes: reflection.trim() || undefined
    });

    localStorage.removeItem('rlm_active_session');
    set({ activeSession: null });
    get().refreshData();
  },

  addSession: (sessionData) => {
    db.addSession(sessionData);
    get().refreshData();
  },

  addBook: (bookData) => {
    db.addBook(bookData);
    get().refreshData();
  },

  updateBook: (id, updates) => {
    db.updateBook(id, updates);
    get().refreshData();
  },

  deleteBook: (id) => {
    db.deleteBook(id);
    get().refreshData();
  },

  addNote: (noteData) => {
    db.addNote(noteData);
    get().refreshData();
  },

  updateNote: (id, updates) => {
    db.updateNote(id, updates);
    get().refreshData();
  },

  deleteNote: (id) => {
    db.deleteNote(id);
    get().refreshData();
  },

  addShelf: (shelfData) => {
    db.addShelf(shelfData);
    get().refreshData();
  },

  addCircle: (circleData) => {
    db.addCircle(circleData);
    get().refreshData();
  },

  addPost: (circleId, threadId, username, content) => {
    db.addPostToThread(circleId, threadId, username, content);
    get().refreshData();
  },

  addThread: (circleId, bookTitle, title, chapter, spoilerLevel) => {
    db.addThreadToCircle(circleId, bookTitle, title, chapter, spoilerLevel);
    get().refreshData();
  },

  joinCircle: (code) => {
    const success = db.joinCircleByCode(code);
    if (success) {
      get().refreshData();
      return true;
    }
    return false;
  },

  acceptRec: (recId) => {
    const rec = db.getRecommendations().find(r => r.id === recId);
    if (rec) {
      db.updateRecStatus(recId, 'accepted');
      // Create new book entry based on rec
      db.addBook({
        title: rec.title,
        author: rec.author,
        cover_url: rec.cover_url,
        format: 'ebook', // Default recommendation format choice
        status: 'to-read',
        metadata: {},
        current_page: 0,
        page_count: 350, // Default page estimate
        custom_shelf_ids: []
      });
      get().refreshData();
    }
  },

  rejectRec: (recId) => {
    db.updateRecStatus(recId, 'rejected');
    get().refreshData();
  }
}));
