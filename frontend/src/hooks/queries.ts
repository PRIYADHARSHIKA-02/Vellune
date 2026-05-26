import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

// --- BOOK HOOKS ---

export interface Book {
  id: string;
  userId: string;
  title: string;
  author: string;
  isbn?: string | null;
  coverUrl?: string | null;
  pageCount: number;
  publishedDate?: string | null;
  publisher?: string | null;
  description?: string | null;
  genres: string[];
  language?: string | null;
  status: 'to-read' | 'reading' | 'finished' | 'on-hold' | 'dnf';
  format: 'physical' | 'ebook' | 'audiobook' | 'library';
  platform?: string | null;
  metadata: Record<string, any>;
  currentPage: number;
  progressPercentage: string;
  customShelfIds: string[];
  dateStarted?: string | null;
  dateFinished?: string | null;
  dateAdded: string;
}

export const useBooks = () => {
  return useQuery<Book[]>({
    queryKey: ['books'],
    queryFn: async () => {
      const response = await api.get('/books');
      return response.data;
    },
  });
};

export const useBook = (id: string | null) => {
  return useQuery<Book>({
    queryKey: ['books', id],
    queryFn: async () => {
      const response = await api.get(`/books/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
};

export const useAddBook = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Book, 'id' | 'userId' | 'progressPercentage' | 'dateAdded'>) => {
      const response = await api.post('/books', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });
};

export const useUpdateBook = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Book> }) => {
      const response = await api.patch(`/books/${id}`, updates);
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['books', variables.id] });
    },
  });
};

export const useDeleteBook = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/books/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });
};

export const useSearchBooks = (query: string, enabled: boolean = false) => {
  return useQuery<any[]>({
    queryKey: ['books', 'search', query],
    queryFn: async () => {
      if (!query || query.trim() === '') return [];
      const response = await api.post('/books/search', { query });
      return response.data;
    },
    enabled: enabled && !!query,
  });
};


// --- READING SESSION HOOKS ---

export interface ReadingSession {
  id: string;
  userId: string;
  bookId: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  pagesStart: number;
  pagesEnd: number;
  pagesRead: number;
  formatUsed: string;
  location?: string | null;
  moodBefore?: string | null;
  moodAfter?: string | null;
  notes?: string | null;
  createdAt: string;
}

export const useSessions = () => {
  return useQuery<ReadingSession[]>({
    queryKey: ['sessions'],
    queryFn: async () => {
      const response = await api.get('/sessions');
      return response.data;
    },
  });
};

export const useAddSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<ReadingSession, 'id' | 'userId' | 'createdAt'>) => {
      const response = await api.post('/sessions', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['books'] }); // Re-fetch book stats too
      queryClient.invalidateQueries({ queryKey: ['notes'] }); // Invalidate notes since session notes are saved there
    },
  });
};


// --- NOTE HOOKS ---

export interface Note {
  id: string;
  userId: string;
  bookId: string;
  type: 'note' | 'quote' | 'bookmark';
  content: string;
  pageNumber?: number | null;
  tags: string[];
  isFavorite: boolean;
  createdAt: string;
}

export const useNotes = () => {
  return useQuery<Note[]>({
    queryKey: ['notes'],
    queryFn: async () => {
      const response = await api.get('/notes');
      return response.data;
    },
  });
};

export const useAddNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Note, 'id' | 'userId' | 'createdAt'>) => {
      const response = await api.post('/notes', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
};

export const useUpdateNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Note> }) => {
      const response = await api.patch(`/notes/${id}`, updates);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
};

export const useDeleteNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/notes/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
};


// --- CUSTOM SHELF HOOKS ---

export interface CustomShelf {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  color: string;
  createdAt: string;
}

export const useShelves = () => {
  return useQuery<CustomShelf[]>({
    queryKey: ['shelves'],
    queryFn: async () => {
      const response = await api.get('/shelves');
      return response.data;
    },
  });
};

export const useAddShelf = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<CustomShelf, 'id' | 'userId' | 'createdAt'>) => {
      const response = await api.post('/shelves', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shelves'] });
    },
  });
};


// --- READING CIRCLE HOOKS ---

export interface ReadingCircle {
  id: string;
  name: string;
  description?: string | null;
  creatorId: string;
  currentBookId?: string | null;
  isPrivate: boolean;
  inviteCode: string;
  maxMembers: number;
  createdAt: string;
  threads?: DiscussionThread[];
  members?: any[];
}

export interface DiscussionThread {
  id: string;
  circleId: string;
  title: string;
  bookId?: string | null;
  creatorId: string;
  chapter?: string | null;
  spoilerLevel: number;
  createdAt: string;
}

export interface DiscussionPost {
  id: string;
  threadId: string;
  userId: string;
  content: string;
  parentPostId?: string | null;
  reactions: Record<string, any>;
  createdAt: string;
  user?: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
}

export const useCircles = () => {
  return useQuery<ReadingCircle[]>({
    queryKey: ['circles'],
    queryFn: async () => {
      const response = await api.get('/circles');
      return response.data;
    },
  });
};

export const useCircle = (id: string | null) => {
  return useQuery<ReadingCircle>({
    queryKey: ['circles', id],
    queryFn: async () => {
      const response = await api.get(`/circles/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
};

export const useAddCircle = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; description?: string; currentBookId?: string; isPrivate?: boolean; maxMembers?: number }) => {
      const response = await api.post('/circles', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['circles'] });
    },
  });
};

export const useJoinCircle = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (inviteCode: string) => {
      const response = await api.post('/circles/join', { inviteCode });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['circles'] });
    },
  });
};

export const useAddThread = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ circleId, data }: { circleId: string; data: { title: string; bookId?: string; chapter?: string; spoilerLevel?: number } }) => {
      const response = await api.post(`/circles/${circleId}/threads`, data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['circles', variables.circleId] });
    },
  });
};

export const useThreadPosts = (threadId: string | null) => {
  return useQuery<DiscussionPost[]>({
    queryKey: ['threads', threadId, 'posts'],
    queryFn: async () => {
      const response = await api.get(`/circles/threads/${threadId}/posts`);
      return response.data;
    },
    enabled: !!threadId,
  });
};

export const useAddPost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ threadId, content, parentPostId }: { threadId: string; content: string; parentPostId?: string }) => {
      const response = await api.post(`/circles/threads/${threadId}/posts`, { content, parentPostId });
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['threads', variables.threadId, 'posts'] });
    },
  });
};
