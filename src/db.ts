// Local Storage Database & Mock Data Layer

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  cover_url: string;
  format: 'physical' | 'ebook' | 'audiobook' | 'library';
  status: 'to-read' | 'reading' | 'finished' | 'dnf' | 'on-hold';
  platform?: string;
  metadata: {
    shelf_location?: string;
    condition?: string;
    lent_to?: string;
    device?: string;
    narrator?: string;
    duration_hours?: number;
    playback_speed?: number;
    due_date?: string;
    branch?: string;
    renewals?: number;
  };
  current_page: number;
  page_count: number;
  progress_percentage: number;
  date_added: string;
  date_started?: string;
  date_finished?: string;
  custom_shelf_ids: string[];
}

export interface ReadingSession {
  id: string;
  book_id: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  pages_start: number;
  pages_end: number;
  pages_read: number;
  format_used: Book['format'];
  location: string; // home, commute, cafe, etc.
  mood_before: string;
  mood_after: string;
  notes?: string;
}

export interface Note {
  id: string;
  book_id: string;
  type: 'note' | 'quote' | 'voice' | 'bookmark' | 'thought';
  content: string;
  page_number?: number;
  chapter?: string;
  timestamp_in_book?: number; // for audiobooks in seconds
  tags: string[];
  is_favorite: boolean;
  audio_url?: string;
  audio_duration_seconds?: number;
  transcription?: string;
  created_at: string;
}

export interface CustomShelf {
  id: string;
  name: string;
  description?: string;
  color: string; // Hex color
  icon: string;
}

export interface DiscussionPost {
  id: string;
  username: string;
  avatar_url: string;
  content: string;
  created_at: string;
  reactions: Record<string, number>;
}

export interface DiscussionThread {
  id: string;
  book_title: string;
  title: string;
  spoiler_level: number; // page number or progress percentage
  chapter: string;
  posts: DiscussionPost[];
  created_at: string;
}

export interface ReadingCircle {
  id: string;
  name: string;
  description: string;
  creator_name: string;
  current_book_id?: string;
  member_count: number;
  threads: DiscussionThread[];
  invite_code: string;
}

export interface Recommendation {
  id: string;
  book_id: string;
  title: string;
  author: string;
  cover_url: string;
  reason: string;
  match_score: number;
  mood_tags: string[];
  time_tags: string[];
  pace_tags: string[];
  status: 'pending' | 'accepted' | 'rejected';
}

// Initial Mock Seed Data
const MOCK_SHELVES: CustomShelf[] = [
  { id: 'shelf-1', name: 'Sci-Fi Masterpieces', description: 'Mind-bending speculative fiction', color: '#8b5cf6', icon: 'Sparkles' },
  { id: 'shelf-2', name: 'Personal Growth', description: 'Books to improve habits and productivity', color: '#10b981', icon: 'TrendingUp' },
  { id: 'shelf-3', name: 'Library Borrows', description: 'Must return soon!', color: '#ec4899', icon: 'BookOpen' }
];

const MOCK_BOOKS: Book[] = [
  {
    id: 'book-1',
    title: 'Project Hail Mary',
    author: 'Andy Weir',
    isbn: '9780593135204',
    cover_url: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400',
    format: 'ebook',
    status: 'reading',
    platform: 'Kindle',
    metadata: { device: 'Kindle Paperwhite' },
    current_page: 210,
    page_count: 476,
    progress_percentage: 44.1,
    date_added: '2026-05-10T12:00:00Z',
    date_started: '2026-05-12T19:30:00Z',
    custom_shelf_ids: ['shelf-1']
  },
  {
    id: 'book-2',
    title: 'Atomic Habits',
    author: 'James Clear',
    isbn: '9780735211292',
    cover_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400',
    format: 'audiobook',
    status: 'reading',
    platform: 'Audible',
    metadata: { narrator: 'James Clear', duration_hours: 5.5, playback_speed: 1.25 },
    current_page: 120, // Simulated minutes read
    page_count: 320, // Total minutes or equivalent pages
    progress_percentage: 37.5,
    date_added: '2026-05-01T09:00:00Z',
    date_started: '2026-05-05T08:15:00Z',
    custom_shelf_ids: ['shelf-2']
  },
  {
    id: 'book-3',
    title: 'Dune',
    author: 'Frank Herbert',
    isbn: '9780441172719',
    cover_url: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400',
    format: 'physical',
    status: 'finished',
    metadata: { shelf_location: 'Living Room Shelf B', condition: 'Good' },
    current_page: 612,
    page_count: 612,
    progress_percentage: 100,
    date_added: '2026-04-01T10:00:00Z',
    date_started: '2026-04-03T18:00:00Z',
    date_finished: '2026-04-28T22:30:00Z',
    custom_shelf_ids: ['shelf-1']
  },
  {
    id: 'book-4',
    title: 'Klara and the Sun',
    author: 'Kazuo Ishiguro',
    isbn: '9780593318171',
    cover_url: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400',
    format: 'library',
    status: 'to-read',
    metadata: { due_date: '2026-06-15T17:00:00Z', branch: 'Downtown Branch', renewals: 0 },
    current_page: 0,
    page_count: 320,
    progress_percentage: 0,
    date_added: '2026-05-20T15:00:00Z',
    custom_shelf_ids: ['shelf-3']
  },
  {
    id: 'book-5',
    title: 'Educated',
    author: 'Tara Westover',
    isbn: '9780399590504',
    cover_url: 'https://images.unsplash.com/photo-1495640388908-05fa85288e61?w=400',
    format: 'physical',
    status: 'dnf',
    metadata: { shelf_location: 'Bedroom Drawer', condition: 'Like New' },
    current_page: 110,
    page_count: 352,
    progress_percentage: 31.25,
    date_added: '2026-03-10T11:00:00Z',
    date_started: '2026-03-12T20:00:00Z',
    date_finished: '2026-03-25T14:00:00Z', // Mark DNF date
    custom_shelf_ids: []
  }
];

const MOCK_SESSIONS: ReadingSession[] = [
  {
    id: 'session-1',
    book_id: 'book-1',
    start_time: '2026-05-23T20:00:00Z',
    end_time: '2026-05-23T20:45:00Z',
    duration_minutes: 45,
    pages_start: 150,
    pages_end: 185,
    pages_read: 35,
    format_used: 'ebook',
    location: 'Home (Bed)',
    mood_before: 'tired',
    mood_after: 'inspired',
    notes: 'Ryland finally starts to remember the details of the Astrophage.'
  },
  {
    id: 'session-2',
    book_id: 'book-1',
    start_time: '2026-05-24T18:00:00Z',
    end_time: '2026-05-24T18:40:00Z',
    duration_minutes: 40,
    pages_start: 185,
    pages_end: 210,
    pages_read: 25,
    format_used: 'ebook',
    location: 'Cafe',
    mood_before: 'focused',
    mood_after: 'excited',
    notes: 'The alien spaceship "Blip A" appears on the screen!'
  },
  {
    id: 'session-3',
    book_id: 'book-2',
    start_time: '2026-05-24T08:00:00Z',
    end_time: '2026-05-24T08:25:00Z',
    duration_minutes: 25,
    pages_start: 100,
    pages_end: 120,
    pages_read: 20,
    format_used: 'audiobook',
    location: 'Commute (Train)',
    mood_before: 'neutral',
    mood_after: 'motivated',
    notes: 'Listening about the Four Laws of Behavior Change.'
  }
];

const MOCK_NOTES: Note[] = [
  {
    id: 'note-1',
    book_id: 'book-3',
    type: 'quote',
    content: "I must not fear. Fear is the mind-killer. Fear is the little-death that brings total obliteration.",
    page_number: 19,
    chapter: 'Chapter 1',
    tags: ['fear', 'litany', 'classic'],
    is_favorite: true,
    created_at: '2026-04-04T19:00:00Z'
  },
  {
    id: 'note-2',
    book_id: 'book-1',
    type: 'note',
    content: "Rocky's biology is based on heavy metals and high temperature. Fascinating how his language is musical notes.",
    page_number: 204,
    chapter: 'Chapter 11',
    tags: ['rocky', 'biology', 'linguistics'],
    is_favorite: false,
    created_at: '2026-05-24T18:35:00Z'
  },
  {
    id: 'note-3',
    book_id: 'book-2',
    type: 'quote',
    content: "You do not rise to the level of your goals. You fall to the level of your systems.",
    page_number: 27,
    chapter: 'Chapter 1',
    tags: ['systems', 'habits', 'wisdom'],
    is_favorite: true,
    created_at: '2026-05-06T09:12:00Z'
  }
];

const MOCK_CIRCLES: ReadingCircle[] = [
  {
    id: 'circle-1',
    name: 'Sci-Fi Explorers club',
    description: 'A small group reviewing the best modern science fiction releases chapter-by-chapter.',
    creator_name: 'Priyadharshika',
    current_book_id: 'book-1',
    member_count: 5,
    invite_code: 'SF-EXPLORE-2026',
    threads: [
      {
        id: 'thread-1',
        book_title: 'Project Hail Mary',
        title: 'Chapters 1-5 Discussion (First Contacts)',
        spoiler_level: 100, // Show posts to readers beyond page 100
        chapter: 'Chapters 1-5',
        created_at: '2026-05-15T10:00:00Z',
        posts: [
          {
            id: 'post-1',
            username: 'Rithu',
            avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80',
            content: 'The amnesia device is such an interesting way to start. It helps explain the science step by step as he figures it out.',
            created_at: '2026-05-15T12:00:00Z',
            reactions: { like: 3 }
          },
          {
            id: 'post-2',
            username: 'Priya',
            avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80',
            content: 'Agreed! I love the retrophage science sections. Feels like The Martian but in deep space.',
            created_at: '2026-05-15T14:20:00Z',
            reactions: { like: 2, insightful: 1 }
          }
        ]
      },
      {
        id: 'thread-2',
        book_title: 'Project Hail Mary',
        title: 'Chapters 10-15 Discussion (Enter Rocky!)',
        spoiler_level: 250, // Spoiler warning if current page is < 250
        chapter: 'Chapters 10-15',
        created_at: '2026-05-23T15:00:00Z',
        posts: [
          {
            id: 'post-3',
            username: 'JohnDoe',
            avatar_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=80',
            content: 'Rocky is officially my favorite alien character of all time. "Fist my bump!" is adorable.',
            created_at: '2026-05-24T09:00:00Z',
            reactions: { like: 4, funny: 3 }
          }
        ]
      }
    ]
  }
];

const MOCK_RECOMMENDATIONS: Recommendation[] = [
  {
    id: 'rec-1',
    book_id: 'rec-book-1',
    title: 'The Martian',
    author: 'Andy Weir',
    cover_url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400',
    reason: 'Because you are reading Project Hail Mary and love isolation-based survival sci-fi with solid physics.',
    match_score: 0.98,
    mood_tags: ['excited', 'curious'],
    time_tags: ['moderate'],
    pace_tags: ['fast-paced'],
    status: 'pending'
  },
  {
    id: 'rec-2',
    book_id: 'rec-book-2',
    title: 'Flow: The Psychology of Optimal Experience',
    author: 'Mihaly Csikszentmihalyi',
    cover_url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400',
    reason: 'Matches your personal growth collection and interest in focusing systems like in Atomic Habits.',
    match_score: 0.88,
    mood_tags: ['thoughtful', 'focused'],
    time_tags: ['long'],
    pace_tags: ['meditative'],
    status: 'pending'
  },
  {
    id: 'rec-3',
    book_id: 'rec-book-3',
    title: 'Recursion',
    author: 'Blake Crouch',
    cover_url: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=400',
    reason: 'You finished Dune and like mind-bending, intense thrillers with deep concepts.',
    match_score: 0.92,
    mood_tags: ['tense', 'curious'],
    time_tags: ['moderate'],
    pace_tags: ['fast-paced'],
    status: 'pending'
  }
];

// DB Helper Methods
export const db = {
  init: () => {
    if (!localStorage.getItem('rlm_shelves')) {
      localStorage.setItem('rlm_shelves', JSON.stringify(MOCK_SHELVES));
    }
    if (!localStorage.getItem('rlm_books')) {
      localStorage.setItem('rlm_books', JSON.stringify(MOCK_BOOKS));
    }
    if (!localStorage.getItem('rlm_sessions')) {
      localStorage.setItem('rlm_sessions', JSON.stringify(MOCK_SESSIONS));
    }
    if (!localStorage.getItem('rlm_notes')) {
      localStorage.setItem('rlm_notes', JSON.stringify(MOCK_NOTES));
    }
    if (!localStorage.getItem('rlm_circles')) {
      localStorage.setItem('rlm_circles', JSON.stringify(MOCK_CIRCLES));
    }
    if (!localStorage.getItem('rlm_recommendations')) {
      localStorage.setItem('rlm_recommendations', JSON.stringify(MOCK_RECOMMENDATIONS));
    }
  },

  // Books CRUD
  getBooks: (): Book[] => {
    return JSON.parse(localStorage.getItem('rlm_books') || '[]');
  },

  saveBooks: (books: Book[]) => {
    localStorage.setItem('rlm_books', JSON.stringify(books));
  },

  addBook: (book: Omit<Book, 'id' | 'date_added' | 'progress_percentage'>) => {
    const books = db.getBooks();
    const newBook: Book = {
      ...book,
      id: `book-${Date.now()}`,
      date_added: new Date().toISOString(),
      progress_percentage: book.page_count > 0 ? parseFloat(((book.current_page / book.page_count) * 100).toFixed(1)) : 0
    };
    books.push(newBook);
    db.saveBooks(books);
    return newBook;
  },

  updateBook: (id: string, updates: Partial<Book>) => {
    const books = db.getBooks();
    const index = books.findIndex(b => b.id === id);
    if (index !== -1) {
      const updatedBook = { ...books[index], ...updates };
      // Recalculate progress percentage
      if (updatedBook.page_count > 0) {
        updatedBook.progress_percentage = parseFloat(
          ((updatedBook.current_page / updatedBook.page_count) * 100).toFixed(1)
        );
      }
      // Automate finished date
      if (updates.status === 'finished' && books[index].status !== 'finished') {
        updatedBook.date_finished = new Date().toISOString();
        updatedBook.current_page = updatedBook.page_count;
        updatedBook.progress_percentage = 100;
      }
      books[index] = updatedBook;
      db.saveBooks(books);
      return updatedBook;
    }
    return null;
  },

  deleteBook: (id: string) => {
    const books = db.getBooks();
    const filtered = books.filter(b => b.id !== id);
    db.saveBooks(filtered);
    
    // Cleanup sessions & notes
    const sessions = db.getSessions().filter(s => s.book_id !== id);
    db.saveSessions(sessions);
    const notes = db.getNotes().filter(n => n.book_id !== id);
    db.saveNotes(notes);
  },

  // Sessions CRUD
  getSessions: (): ReadingSession[] => {
    return JSON.parse(localStorage.getItem('rlm_sessions') || '[]');
  },

  saveSessions: (sessions: ReadingSession[]) => {
    localStorage.setItem('rlm_sessions', JSON.stringify(sessions));
  },

  addSession: (session: Omit<ReadingSession, 'id'>) => {
    const sessions = db.getSessions();
    const newSession: ReadingSession = {
      ...session,
      id: `session-${Date.now()}`
    };
    sessions.push(newSession);
    db.saveSessions(sessions);

    // Update book progress
    const book = db.getBooks().find(b => b.id === session.book_id);
    if (book) {
      const isFinished = session.pages_end >= book.page_count;
      db.updateBook(session.book_id, {
        current_page: session.pages_end,
        status: isFinished ? 'finished' : 'reading',
        ...(book.status === 'to-read' ? { date_started: session.start_time } : {})
      });
    }

    // Add session notes if present
    if (session.notes) {
      db.addNote({
        book_id: session.book_id,
        type: 'thought',
        content: session.notes,
        page_number: session.pages_end,
        tags: [session.location.toLowerCase(), 'session-reflect'],
        is_favorite: false
      });
    }

    return newSession;
  },

  // Notes CRUD
  getNotes: (): Note[] => {
    return JSON.parse(localStorage.getItem('rlm_notes') || '[]');
  },

  saveNotes: (notes: Note[]) => {
    localStorage.setItem('rlm_notes', JSON.stringify(notes));
  },

  addNote: (note: Omit<Note, 'id' | 'created_at'>) => {
    const notes = db.getNotes();
    const newNote: Note = {
      ...note,
      id: `note-${Date.now()}`,
      created_at: new Date().toISOString()
    };
    notes.push(newNote);
    db.saveNotes(notes);
    return newNote;
  },

  updateNote: (id: string, updates: Partial<Note>) => {
    const notes = db.getNotes();
    const index = notes.findIndex(n => n.id === id);
    if (index !== -1) {
      notes[index] = { ...notes[index], ...updates };
      db.saveNotes(notes);
      return notes[index];
    }
    return null;
  },

  deleteNote: (id: string) => {
    const notes = db.getNotes();
    const filtered = notes.filter(n => n.id !== id);
    db.saveNotes(filtered);
  },

  // Shelves CRUD
  getShelves: (): CustomShelf[] => {
    return JSON.parse(localStorage.getItem('rlm_shelves') || '[]');
  },

  saveShelves: (shelves: CustomShelf[]) => {
    localStorage.setItem('rlm_shelves', JSON.stringify(shelves));
  },

  addShelf: (shelf: Omit<CustomShelf, 'id'>) => {
    const shelves = db.getShelves();
    const newShelf = { ...shelf, id: `shelf-${Date.now()}` };
    shelves.push(newShelf);
    db.saveShelves(shelves);
    return newShelf;
  },

  // Circles CRUD
  getCircles: (): ReadingCircle[] => {
    return JSON.parse(localStorage.getItem('rlm_circles') || '[]');
  },

  saveCircles: (circles: ReadingCircle[]) => {
    localStorage.setItem('rlm_circles', JSON.stringify(circles));
  },

  addCircle: (circle: Omit<ReadingCircle, 'id' | 'threads' | 'member_count' | 'invite_code'>) => {
    const circles = db.getCircles();
    const newCircle: ReadingCircle = {
      ...circle,
      id: `circle-${Date.now()}`,
      member_count: 1,
      invite_code: `RC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      threads: []
    };
    circles.push(newCircle);
    db.saveCircles(circles);
    return newCircle;
  },

  addPostToThread: (circleId: string, threadId: string, username: string, content: string) => {
    const circles = db.getCircles();
    const circle = circles.find(c => c.id === circleId);
    if (circle) {
      const thread = circle.threads.find(t => t.id === threadId);
      if (thread) {
        const newPost: DiscussionPost = {
          id: `post-${Date.now()}`,
          username,
          avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80',
          content,
          created_at: new Date().toISOString(),
          reactions: {}
        };
        thread.posts.push(newPost);
        db.saveCircles(circles);
        return newPost;
      }
    }
    return null;
  },

  addThreadToCircle: (circleId: string, bookTitle: string, title: string, chapter: string, spoilerLevel: number) => {
    const circles = db.getCircles();
    const circle = circles.find(c => c.id === circleId);
    if (circle) {
      const newThread: DiscussionThread = {
        id: `thread-${Date.now()}`,
        book_title: bookTitle,
        title,
        spoiler_level: spoilerLevel,
        chapter,
        posts: [],
        created_at: new Date().toISOString()
      };
      circle.threads.unshift(newThread); // Add at top
      db.saveCircles(circles);
      return newThread;
    }
    return null;
  },

  joinCircleByCode: (code: string) => {
    const circles = db.getCircles();
    const circle = circles.find(c => c.invite_code === code);
    if (circle) {
      circle.member_count += 1;
      db.saveCircles(circles);
      return circle;
    }
    return null;
  },

  // Recommendations CRUD
  getRecommendations: (): Recommendation[] => {
    return JSON.parse(localStorage.getItem('rlm_recommendations') || '[]');
  },

  saveRecommendations: (recs: Recommendation[]) => {
    localStorage.setItem('rlm_recommendations', JSON.stringify(recs));
  },

  updateRecStatus: (id: string, status: Recommendation['status']) => {
    const recs = db.getRecommendations();
    const index = recs.findIndex(r => r.id === id);
    if (index !== -1) {
      recs[index].status = status;
      db.saveRecommendations(recs);
      return recs[index];
    }
    return null;
  }
};
