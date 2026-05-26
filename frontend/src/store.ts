import { create } from 'zustand';

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  fullName?: string | null;
  avatarUrl?: string | null;
  readingGoalAnnual?: number | null;
  timezone?: string | null;
  bio?: string;
  favoriteGenre?: string;
}

export interface ActiveSessionState {
  bookId: string;
  startTime: string;
  location: string;
  moodBefore: string;
}

interface StoreState {
  activeSession: ActiveSessionState | null;
  selectedBookIdForDetail: string | null;
  theme: 'dark' | 'light';
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  
  // Actions
  initStore: () => void;
  setSelectedBookIdForDetail: (id: string | null) => void;
  toggleTheme: () => void;
  login: (token: string, user: UserProfile) => void;
  logout: () => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  startReadingSession: (bookId: string, location: string, moodBefore: string) => void;
  cancelReadingSession: () => void;
}

export const useStore = create<StoreState>((set, get) => ({
  activeSession: null,
  selectedBookIdForDetail: null,
  theme: 'dark',
  user: null,
  token: null,
  isAuthenticated: false,

  initStore: () => {
    if (typeof window === 'undefined') return;

    // Load theme
    const savedTheme = localStorage.getItem('rlm_theme') as 'dark' | 'light' | null;
    const theme = savedTheme || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    
    // Load active session
    const savedSession = localStorage.getItem('rlm_active_session');
    const activeSession = savedSession ? JSON.parse(savedSession) : null;
    
    // Load user auth status
    const savedToken = localStorage.getItem('rlm_token');
    const savedUser = localStorage.getItem('rlm_user');
    const user = savedUser ? JSON.parse(savedUser) : null;
    const token = savedToken || null;
    const isAuthenticated = !!token && !!user;
    
    set({ theme, activeSession, user, token, isAuthenticated });
  },

  setSelectedBookIdForDetail: (id) => set({ selectedBookIdForDetail: id }),

  toggleTheme: () => {
    const nextTheme = get().theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('rlm_theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    set({ theme: nextTheme });
  },

  login: (token, user) => {
    localStorage.setItem('rlm_token', token);
    localStorage.setItem('rlm_user', JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('rlm_token');
    localStorage.removeItem('rlm_user');
    localStorage.removeItem('rlm_active_session');
    set({ token: null, user: null, isAuthenticated: false, activeSession: null, selectedBookIdForDetail: null });
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
  }
}));
