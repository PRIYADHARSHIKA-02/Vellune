'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useStore, UserProfile } from '../../store';
import { 
  Mail, Lock, User, Sparkles, BookOpen, Calendar, 
  Target, Search, Check, Loader2, ArrowRight 
} from 'lucide-react';
import { api } from '../../lib/api';
import { useRouter } from 'next/navigation';
import { LogoIcon } from '../../components/Logo';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Form Validation Schemas
const loginSchema = z.object({
  usernameOrEmail: z.string().min(1, 'Email or Username is required.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

const registerSchema = z.object({
  fullName: z.string().min(1, 'Name is required.'),
  email: z.string().email('Invalid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { login } = useStore();
  const [isSignUp, setIsSignUp] = useState(false);
  const [apiError, setApiError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Onboarding Wizard State
  const [tempAuth, setTempAuth] = useState<{ token: string; user: UserProfile } | null>(null);
  const [onboardingStep, setOnboardingStep] = useState(0); // 0 = login/register, 1 = goal, 2 = currently reading, 3 = want to read
  const [annualGoal, setAnnualGoal] = useState(12);

  // Local state for DOB selectors
  const [dobMonth, setDobMonth] = useState('');
  const [dobDay, setDobDay] = useState('');
  const [dobYear, setDobYear] = useState('');

  // Search currently reading state
  const [currentSearch, setCurrentSearch] = useState('');
  const [currentSearchResults, setCurrentSearchResults] = useState<any[]>([]);
  const [selectedCurrentBook, setSelectedCurrentBook] = useState<any | null>(null);
  const [notReadingRightNow, setNotReadingRightNow] = useState(false);
  const [isSearchingCurrent, setIsSearchingCurrent] = useState(false);

  // Search want to read state
  const [wantToReadSearch, setWantToReadSearch] = useState('');
  const [wantToReadSearchResults, setWantToReadSearchResults] = useState<any[]>([]);
  const [selectedWantToReadBooks, setSelectedWantToReadBooks] = useState<any[]>([]);
  const [isSearchingWantToRead, setIsSearchingWantToRead] = useState(false);

  // Enhanced search UI states
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  const [currentSuggestions, setCurrentSuggestions] = useState<any[]>([]);
  const [showCurrentDropdown, setShowCurrentDropdown] = useState(false);
  const [isCurrentEmpty, setIsCurrentEmpty] = useState(false);
  const currentDropdownRef = useRef<HTMLDivElement>(null);

  const [wantToReadSuggestions, setWantToReadSuggestions] = useState<any[]>([]);
  const [showWantToReadDropdown, setShowWantToReadDropdown] = useState(false);
  const [isWantToReadEmpty, setIsWantToReadEmpty] = useState(false);
  const wantToReadDropdownRef = useRef<HTMLDivElement>(null);

  // Login form handler
  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
    reset: resetLoginForm,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  // Register form handler
  const {
    register: registerSignUp,
    handleSubmit: handleSignUpSubmit,
    formState: { errors: registerErrors },
    reset: resetSignUpForm,
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onLoginSubmit = async (data: LoginFormValues) => {
    setApiError('');
    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', data);
      const { token, user } = response.data;
      login(token, user);
      router.push('/');
    } catch (err: any) {
      console.error(err);
      setApiError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const onSignUpSubmit = async (data: RegisterFormValues) => {
    if (!dobMonth || !dobDay || !dobYear) {
      setApiError('Please select your Date of Birth.');
      return;
    }
    setApiError('');
    setIsLoading(true);
    try {
      const payload = {
        email: data.email,
        username: data.email.split('@')[0], // Derive username from email
        password: data.password,
        fullName: data.fullName,
        dob: `${dobYear}-${dobMonth}-${dobDay}`,
      };
      const response = await api.post('/auth/register', payload);
      const { token, user } = response.data;
      
      setTempAuth({ token, user });
      setOnboardingStep(1); // Proceed to Step 2: Goal
    } catch (err: any) {
      console.error(err);
      setApiError(err.response?.data?.error || 'Registration failed. Try a different email.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2 Goal Save
  const handleSaveGoal = async () => {
    if (!tempAuth) return;
    setIsLoading(true);
    setApiError('');
    try {
      await api.patch('/auth/me', { readingGoalAnnual: annualGoal }, {
        headers: { Authorization: `Bearer ${tempAuth.token}` }
      });
      setOnboardingStep(2); // Proceed to Step 3: Currently Reading
    } catch (err: any) {
      console.error(err);
      setApiError('Failed to save reading goal. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Load recent searches on mount
  useEffect(() => {
    const saved = localStorage.getItem('vellune_recent_searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const addRecentSearch = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setRecentSearches(prev => {
      const filtered = prev.filter(q => q.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 5);
      localStorage.setItem('vellune_recent_searches', JSON.stringify(updated));
      return updated;
    });
  };

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (currentDropdownRef.current && !currentDropdownRef.current.contains(event.target as Node)) {
        setShowCurrentDropdown(false);
      }
      if (wantToReadDropdownRef.current && !wantToReadDropdownRef.current.contains(event.target as Node)) {
        setShowWantToReadDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search for Currently Reading
  useEffect(() => {
    if (!currentSearch.trim() || !tempAuth) {
      setCurrentSuggestions([]);
      setShowCurrentDropdown(false);
      setIsCurrentEmpty(false);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      setIsSearchingCurrent(true);
      setIsCurrentEmpty(false);
      try {
        const res = await api.post('/books/search', { query: currentSearch.trim() }, {
          headers: { Authorization: `Bearer ${tempAuth.token}` }
        });
        const results = res.data || [];
        setCurrentSuggestions(results);
        setIsCurrentEmpty(results.length === 0);
        setShowCurrentDropdown(true);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearchingCurrent(false);
      }
    }, 450);

    return () => clearTimeout(delayDebounceFn);
  }, [currentSearch, tempAuth]);

  // Debounced search for Want to Read
  useEffect(() => {
    if (!wantToReadSearch.trim() || !tempAuth) {
      setWantToReadSuggestions([]);
      setShowWantToReadDropdown(false);
      setIsWantToReadEmpty(false);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      setIsSearchingWantToRead(true);
      setIsWantToReadEmpty(false);
      try {
        const res = await api.post('/books/search', { query: wantToReadSearch.trim() }, {
          headers: { Authorization: `Bearer ${tempAuth.token}` }
        });
        const results = res.data || [];
        setWantToReadSuggestions(results);
        setIsWantToReadEmpty(results.length === 0);
        setShowWantToReadDropdown(true);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearchingWantToRead(false);
      }
    }, 450);

    return () => clearTimeout(delayDebounceFn);
  }, [wantToReadSearch, tempAuth]);

  // Step 3 Currently Reading Search
  const handleSearchCurrent = async (queryVal?: string) => {
    const targetQuery = queryVal !== undefined ? queryVal : currentSearch;
    if (!targetQuery.trim() || !tempAuth) return;
    
    if (queryVal !== undefined) {
      setCurrentSearch(queryVal);
    }
    
    setIsSearchingCurrent(true);
    setApiError('');
    addRecentSearch(targetQuery);
    try {
      const res = await api.post('/books/search', { query: targetQuery.trim() }, {
        headers: { Authorization: `Bearer ${tempAuth.token}` }
      });
      const results = res.data || [];
      setCurrentSearchResults(results);
      setCurrentSuggestions(results);
      setIsCurrentEmpty(results.length === 0);
      setShowCurrentDropdown(false);
    } catch (err: any) {
      console.error(err);
      setApiError('Failed to search books. Please try again.');
    } finally {
      setIsSearchingCurrent(false);
    }
  };

  // Step 3 Select and Save immediately
  const handleSelectAndSaveCurrent = async (book: any) => {
    if (!tempAuth) return;
    setSelectedCurrentBook(book);
    setNotReadingRightNow(false);
    setIsLoading(true);
    setApiError('');
    try {
      await api.post('/books', {
        title: book.title,
        author: book.author,
        isbn: book.isbn || null,
        coverUrl: book.coverUrl || null,
        pageCount: book.pageCount || 0,
        publishedDate: book.publishedDate || null,
        publisher: book.publisher || null,
        description: book.description || null,
        genres: book.genres || [],
        status: 'reading',
        format: 'physical'
      }, {
        headers: { Authorization: `Bearer ${tempAuth.token}` }
      });
      setOnboardingStep(3); // Proceed to Step 4: Want to Read
    } catch (err: any) {
      console.error(err);
      setApiError('Failed to add book. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3 Save currently reading selection
  const handleSaveCurrentlyReading = async () => {
    if (!tempAuth) return;
    if (!selectedCurrentBook && !notReadingRightNow) return;
    setIsLoading(true);
    setApiError('');
    try {
      if (selectedCurrentBook) {
        await api.post('/books', {
          title: selectedCurrentBook.title,
          author: selectedCurrentBook.author,
          isbn: selectedCurrentBook.isbn || null,
          coverUrl: selectedCurrentBook.coverUrl || null,
          pageCount: selectedCurrentBook.pageCount || 0,
          publishedDate: selectedCurrentBook.publishedDate || null,
          publisher: selectedCurrentBook.publisher || null,
          description: selectedCurrentBook.description || null,
          genres: selectedCurrentBook.genres || [],
          status: 'reading',
          format: 'physical'
        }, {
          headers: { Authorization: `Bearer ${tempAuth.token}` }
        });
      }
      setOnboardingStep(3); // Proceed to Step 4: Want to Read
    } catch (err: any) {
      console.error(err);
      setApiError('Failed to add book. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 4 Want to Read Search
  const handleSearchWantToRead = async (queryVal?: string) => {
    const targetQuery = queryVal !== undefined ? queryVal : wantToReadSearch;
    if (!targetQuery.trim() || !tempAuth) return;
    
    if (queryVal !== undefined) {
      setWantToReadSearch(queryVal);
    }

    setIsSearchingWantToRead(true);
    setApiError('');
    addRecentSearch(targetQuery);
    try {
      const res = await api.post('/books/search', { query: targetQuery.trim() }, {
        headers: { Authorization: `Bearer ${tempAuth.token}` }
      });
      const results = res.data || [];
      setWantToReadSearchResults(results);
      setWantToReadSuggestions(results);
      setIsWantToReadEmpty(results.length === 0);
      setShowWantToReadDropdown(false);
    } catch (err: any) {
      console.error(err);
      setApiError('Failed to search books. Please try again.');
    } finally {
      setIsSearchingWantToRead(false);
    }
  };

  const handleToggleWantToRead = (book: any) => {
    const isSelected = selectedWantToReadBooks.some(b => b.title === book.title && b.author === book.author);
    if (isSelected) {
      setSelectedWantToReadBooks(selectedWantToReadBooks.filter(b => !(b.title === book.title && b.author === book.author)));
    } else {
      setSelectedWantToReadBooks([...selectedWantToReadBooks, book]);
    }
  };

  const handleCompleteOnboarding = async () => {
    if (!tempAuth) return;
    setIsLoading(true);
    setApiError('');
    try {
      if (selectedWantToReadBooks.length > 0) {
        await Promise.all(selectedWantToReadBooks.map(book => 
          api.post('/books', {
            title: book.title,
            author: book.author,
            isbn: book.isbn || null,
            coverUrl: book.coverUrl || null,
            pageCount: book.pageCount || 0,
            publishedDate: book.publishedDate || null,
            publisher: book.publisher || null,
            description: book.description || null,
            genres: book.genres || [],
            status: 'to-read',
            format: 'physical'
          }, {
            headers: { Authorization: `Bearer ${tempAuth.token}` }
          })
        ));
      }
      
      // Complete log in
      login(tempAuth.token, tempAuth.user);
      router.push('/');
    } catch (err: any) {
      console.error(err);
      setApiError('Failed to save wishlist. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const errorMessages = isSignUp 
    ? Object.values(registerErrors).map(e => e.message).join(' | ') || apiError
    : Object.values(loginErrors).map(e => e.message).join(' | ') || apiError;

  // Onboarding screens render
  if (onboardingStep > 0 && tempAuth) {
    return (
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'transparent',
          padding: '1.5rem',
          width: '100%'
        }}
      >
        <div 
          className="glass animate-fade-in" 
          style={{
            width: '100%',
            maxWidth: '520px',
            padding: '2.5rem',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5), var(--shadow-glow)',
          }}
        >
          {/* Progress Dots */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <div style={{ flex: 1, height: '4px', borderRadius: 'var(--radius-full)', background: onboardingStep >= 1 ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)' }} />
            <div style={{ flex: 1, height: '4px', borderRadius: 'var(--radius-full)', background: onboardingStep >= 2 ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)' }} />
            <div style={{ flex: 1, height: '4px', borderRadius: 'var(--radius-full)', background: onboardingStep >= 3 ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)' }} />
          </div>

          {apiError && (
            <div 
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#f87171',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.85rem',
                marginBottom: '1.25rem'
              }}
            >
              {apiError}
            </div>
          )}

          {/* STEP 2: Annual Goal Setting */}
          {onboardingStep === 1 && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(212, 178, 111, 0.1)', borderRadius: '50%', color: 'var(--accent-primary)', marginBottom: '1rem' }}>
                  <Target size={32} />
                </div>
                <h2 style={{ fontSize: '1.75rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Set Your Yearly Goal</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>How many books do you want to read this year?</p>
              </div>

              {/* Presets */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
                {[12, 24, 50].map((val) => (
                  <button
                    key={val}
                    type="button"
                    className="glass"
                    onClick={() => setAnnualGoal(val)}
                    style={{
                      padding: '1rem 0.5rem',
                      cursor: 'pointer',
                      textAlign: 'center',
                      border: annualGoal === val ? '1px solid var(--accent-primary)' : '1px solid var(--border-glass)',
                      background: annualGoal === val ? 'rgba(212, 178, 111, 0.12)' : 'rgba(255,255,255,0.02)',
                      borderRadius: 'var(--radius-md)',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>{val}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      {val === 12 ? 'Casual' : val === 24 ? 'Active' : 'Avid'}
                    </div>
                  </button>
                ))}
              </div>

              {/* Slider */}
              <div style={{ textAlign: 'center', margin: '2rem 0' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent-primary)', fontFamily: 'var(--font-display)' }}>
                  {annualGoal} <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>books</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={annualGoal}
                  onChange={(e) => setAnnualGoal(parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    accentColor: 'var(--accent-primary)',
                    background: 'rgba(255,255,255,0.1)',
                    height: '6px',
                    borderRadius: 'var(--radius-full)',
                    outline: 'none',
                    marginTop: '1.5rem',
                    cursor: 'pointer'
                  }}
                />
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveGoal}
                disabled={isLoading}
                style={{ width: '100%', padding: '0.8rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', background: 'var(--accent-primary)', color: '#091A1E' }}
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <span>Next Step</span>}
                <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* STEP 3: Currently Reading Book Search */}
          {onboardingStep === 2 && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.6rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Currently Reading</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Are you reading a book right now? Search and add it.</p>
              </div>

              {/* Search Bar container with relative positioning */}
              <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex' }}>
                      <Search size={16} />
                    </span>
                    <input
                      type="text"
                      placeholder="Search by book title or author..."
                      className="form-input"
                      style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                      value={currentSearch}
                      onChange={(e) => {
                        setCurrentSearch(e.target.value);
                        if (notReadingRightNow) setNotReadingRightNow(false);
                      }}
                      onFocus={() => {
                        if (currentSearch.trim()) {
                          setShowCurrentDropdown(true);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSearchCurrent();
                        }
                      }}
                    />
                    {isSearchingCurrent && (
                      <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-primary)', display: 'flex' }}>
                        <Loader2 size={16} className="animate-spin" />
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleSearchCurrent()}
                    disabled={isSearchingCurrent}
                    style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--accent-primary)', color: '#091A1E' }}
                  >
                    {isSearchingCurrent ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                  </button>
                </div>

                {/* Live Suggestions Dropdown Overlay */}
                {showCurrentDropdown && (
                  <div 
                    ref={currentDropdownRef}
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: 'rgba(9, 26, 30, 0.98)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid var(--border-glass)',
                      borderRadius: 'var(--radius-md)',
                      marginTop: '0.5rem',
                      maxHeight: '250px',
                      overflowY: 'auto',
                      zIndex: 50,
                      boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
                      scrollbarWidth: 'thin'
                    }}
                  >
                    {isSearchingCurrent && currentSuggestions.length === 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        <Loader2 size={16} className="animate-spin" style={{ marginRight: '0.5rem' }} />
                        Searching books...
                      </div>
                    )}
                    {!isSearchingCurrent && isCurrentEmpty && (
                      <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        No books found
                      </div>
                    )}
                    {currentSuggestions.map((book, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          handleSelectAndSaveCurrent(book);
                          setShowCurrentDropdown(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.75rem 1rem',
                          cursor: 'pointer',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                          transition: 'background 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(212, 178, 111, 0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <img
                          src={book.coverUrl || '/fallback-book.png'}
                          onError={(e) => { (e.target as HTMLImageElement).src = '/fallback-book.png'; }}
                          loading="lazy"
                          alt={book.title}
                          style={{ width: '28px', height: '42px', objectFit: 'cover', borderRadius: '2px' }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {book.title}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {book.author}
                          </div>
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', flexShrink: 0 }}>
                          Select & Save
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Recent Searches tags */}
                {recentSearches.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.6rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Recent:</span>
                    {recentSearches.map((q, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setCurrentSearch(q);
                          handleSearchCurrent(q);
                        }}
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid var(--border-glass)',
                          color: 'var(--text-secondary)',
                          padding: '0.2rem 0.6rem',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.7rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--accent-primary)';
                          e.currentTarget.style.color = 'var(--text-primary)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--border-glass)';
                          e.currentTarget.style.color = 'var(--text-secondary)';
                        }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Grid Search Results */}
              {currentSearchResults.length > 0 && (
                <div 
                  style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(2, 1fr)', 
                    gap: '1rem', 
                    maxHeight: '260px', 
                    overflowY: 'auto', 
                    marginBottom: '1.25rem', 
                    padding: '0.2rem',
                    scrollbarWidth: 'thin'
                  }}
                >
                  {currentSearchResults.map((book, idx) => {
                    const isSelected = selectedCurrentBook?.title === book.title && selectedCurrentBook?.author === book.author;
                    return (
                      <div
                        key={idx}
                        className="glass animate-fade-in"
                        onClick={() => handleSelectAndSaveCurrent(book)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          padding: '0.75rem',
                          cursor: 'pointer',
                          border: isSelected ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-glass)',
                          background: isSelected ? 'rgba(212, 178, 111, 0.12)' : 'rgba(255,255,255,0.02)',
                          borderRadius: 'var(--radius-md)',
                          transition: 'all 0.2s',
                          textAlign: 'center',
                          boxShadow: isSelected ? 'var(--shadow-glow)' : 'none'
                        }}
                      >
                        <div style={{ position: 'relative', width: '65px', height: '95px', marginBottom: '0.5rem', boxShadow: '0 4px 8px rgba(0,0,0,0.3)' }}>
                          <img 
                            src={book.coverUrl || '/fallback-book.png'} 
                            onError={(e) => { (e.target as HTMLImageElement).src = '/fallback-book.png'; }}
                            loading="lazy"
                            alt={book.title} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }}
                          />
                          {isSelected && (
                            <div style={{
                              position: 'absolute',
                              inset: 0,
                              background: 'rgba(9, 26, 30, 0.4)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: 'var(--radius-sm)'
                            }}>
                              <span style={{ background: 'var(--accent-primary)', color: '#091A1E', borderRadius: '50%', padding: '0.25rem', display: 'flex' }}>
                                <Check size={14} />
                              </span>
                            </div>
                          )}
                        </div>
                        <div style={{ width: '100%' }}>
                          <div style={{ fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: '1.2' }}>
                            {book.title}
                          </div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {book.author}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Explicit Empty State for Search Results */}
              {currentSearchResults.length === 0 && currentSearch.trim() && !isSearchingCurrent && (
                <div className="glass" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
                  No books found
                </div>
              )}

              {/* Selected Preview */}
              {selectedCurrentBook && (
                <div 
                  className="glass"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '0.75rem 1rem',
                    marginBottom: '1rem',
                    border: '1px solid var(--accent-primary)',
                    background: 'rgba(212, 178, 111, 0.05)'
                  }}
                >
                  <img 
                    src={selectedCurrentBook.coverUrl || '/fallback-book.png'} 
                    onError={(e) => { (e.target as HTMLImageElement).src = '/fallback-book.png'; }}
                    loading="lazy"
                    alt={selectedCurrentBook.title}
                    style={{ width: '36px', height: '54px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--accent-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Selected Book</div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedCurrentBook.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{selectedCurrentBook.author}</div>
                  </div>
                </div>
              )}

              {/* Not Reading Option */}
              <div 
                className="glass"
                onClick={() => {
                  setNotReadingRightNow(true);
                  setSelectedCurrentBook(null);
                }}
                style={{
                  padding: '0.85rem',
                  cursor: 'pointer',
                  textAlign: 'center',
                  border: notReadingRightNow ? '1px solid var(--accent-primary)' : '1px solid var(--border-glass)',
                  background: notReadingRightNow ? 'rgba(212, 178, 111, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                  transition: 'all 0.2s',
                  marginBottom: '1.5rem',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: notReadingRightNow ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  🚫 I am not reading any book right now
                </span>
              </div>

              {/* Action Buttons */}
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveCurrentlyReading}
                disabled={isLoading || (!selectedCurrentBook && !notReadingRightNow)}
                style={{ width: '100%', padding: '0.8rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', background: 'var(--accent-primary)', color: '#091A1E' }}
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <span>Next Step</span>}
                <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* STEP 4: Want to Read Books Search */}
          {onboardingStep === 3 && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.6rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Want to Read</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Search and add books you want to read next.</p>
              </div>

              {/* Search Bar container with relative positioning */}
              <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex' }}>
                      <Search size={16} />
                    </span>
                    <input
                      type="text"
                      placeholder="Search by title or author name..."
                      className="form-input"
                      style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                      value={wantToReadSearch}
                      onChange={(e) => setWantToReadSearch(e.target.value)}
                      onFocus={() => {
                        if (wantToReadSearch.trim()) {
                          setShowWantToReadDropdown(true);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSearchWantToRead();
                        }
                      }}
                    />
                    {isSearchingWantToRead && (
                      <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-primary)', display: 'flex' }}>
                        <Loader2 size={16} className="animate-spin" />
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleSearchWantToRead()}
                    disabled={isSearchingWantToRead}
                    style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--accent-primary)', color: '#091A1E' }}
                  >
                    {isSearchingWantToRead ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                  </button>
                </div>

                {/* Live Suggestions Dropdown Overlay */}
                {showWantToReadDropdown && (
                  <div 
                    ref={wantToReadDropdownRef}
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: 'rgba(9, 26, 30, 0.98)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid var(--border-glass)',
                      borderRadius: 'var(--radius-md)',
                      marginTop: '0.5rem',
                      maxHeight: '250px',
                      overflowY: 'auto',
                      zIndex: 50,
                      boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
                      scrollbarWidth: 'thin'
                    }}
                  >
                    {isSearchingWantToRead && wantToReadSuggestions.length === 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        <Loader2 size={16} className="animate-spin" style={{ marginRight: '0.5rem' }} />
                        Searching books...
                      </div>
                    )}
                    {!isSearchingWantToRead && isWantToReadEmpty && (
                      <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        No books found
                      </div>
                    )}
                    {wantToReadSuggestions.map((book, idx) => {
                      const isAlreadySelected = selectedWantToReadBooks.some(b => b.title === book.title && b.author === book.author);
                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            handleToggleWantToRead(book);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.75rem 1rem',
                            cursor: 'pointer',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            transition: 'background 0.2s',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(212, 178, 111, 0.1)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <img
                            src={book.coverUrl || '/fallback-book.png'}
                            onError={(e) => { (e.target as HTMLImageElement).src = '/fallback-book.png'; }}
                            loading="lazy"
                            alt={book.title}
                            style={{ width: '28px', height: '42px', objectFit: 'cover', borderRadius: '2px' }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {book.title}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {book.author}
                            </div>
                          </div>
                          <span style={{ fontSize: '0.7rem', color: isAlreadySelected ? '#34d399' : 'var(--accent-primary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', flexShrink: 0 }}>
                            {isAlreadySelected ? '✓ Selected' : '+ Add'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Recent Searches tags */}
                {recentSearches.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.6rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Recent:</span>
                    {recentSearches.map((q, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setWantToReadSearch(q);
                          handleSearchWantToRead(q);
                        }}
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid var(--border-glass)',
                          color: 'var(--text-secondary)',
                          padding: '0.2rem 0.6rem',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.7rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--accent-primary)';
                          e.currentTarget.style.color = 'var(--text-primary)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--border-glass)';
                          e.currentTarget.style.color = 'var(--text-secondary)';
                        }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Grid Search Results */}
              {wantToReadSearchResults.length > 0 && (
                <div 
                  style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(2, 1fr)', 
                    gap: '1rem', 
                    maxHeight: '220px', 
                    overflowY: 'auto', 
                    marginBottom: '1.25rem', 
                    padding: '0.2rem',
                    scrollbarWidth: 'thin'
                  }}
                >
                  {wantToReadSearchResults.map((book, idx) => {
                    const isSelected = selectedWantToReadBooks.some(b => b.title === book.title && b.author === book.author);
                    return (
                      <div
                        key={idx}
                        className="glass animate-fade-in"
                        onClick={() => handleToggleWantToRead(book)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          padding: '0.75rem',
                          cursor: 'pointer',
                          border: isSelected ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-glass)',
                          background: isSelected ? 'rgba(212, 178, 111, 0.12)' : 'rgba(255,255,255,0.02)',
                          borderRadius: 'var(--radius-md)',
                          transition: 'all 0.2s',
                          textAlign: 'center',
                          boxShadow: isSelected ? 'var(--shadow-glow)' : 'none'
                        }}
                      >
                        <div style={{ position: 'relative', width: '65px', height: '95px', marginBottom: '0.5rem', boxShadow: '0 4px 8px rgba(0,0,0,0.3)' }}>
                          <img 
                            src={book.coverUrl || '/fallback-book.png'} 
                            onError={(e) => { (e.target as HTMLImageElement).src = '/fallback-book.png'; }}
                            loading="lazy"
                            alt={book.title} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }}
                          />
                          {isSelected && (
                            <div style={{
                              position: 'absolute',
                              inset: 0,
                              background: 'rgba(9, 26, 30, 0.4)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: 'var(--radius-sm)'
                            }}>
                              <span style={{ background: 'var(--accent-primary)', color: '#091A1E', borderRadius: '50%', padding: '0.25rem', display: 'flex' }}>
                                <Check size={14} />
                              </span>
                            </div>
                          )}
                        </div>
                        <div style={{ width: '100%' }}>
                          <div style={{ fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: '1.2' }}>
                            {book.title}
                          </div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {book.author}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Explicit Empty State for Search Results */}
              {wantToReadSearchResults.length === 0 && wantToReadSearch.trim() && !isSearchingWantToRead && (
                <div className="glass" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
                  No books found
                </div>
              )}

              {/* Selected List covers */}
              {selectedWantToReadBooks.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Selected List ({selectedWantToReadBooks.length} books):
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'thin' }}>
                    {selectedWantToReadBooks.map((book, idx) => (
                      <div key={idx} style={{ position: 'relative', flexShrink: 0, width: '48px' }}>
                        <img
                          src={book.coverUrl || '/fallback-book.png'}
                          onError={(e) => { (e.target as HTMLImageElement).src = '/fallback-book.png'; }}
                          loading="lazy"
                          alt={book.title}
                          style={{ width: '48px', height: '72px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-glass)' }}
                        />
                        <button
                          type="button"
                          onClick={() => handleToggleWantToRead(book)}
                          style={{
                            position: 'absolute',
                            top: '-4px',
                            right: '-4px',
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            background: '#ef4444',
                            color: '#fff',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '9px',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCompleteOnboarding}
                disabled={isLoading}
                style={{ width: '100%', padding: '0.8rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', background: 'var(--accent-primary)', color: '#091A1E' }}
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <span>Complete Registration</span>}
                <Sparkles size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Regular login/register forms render
  return (
    <div 
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'transparent',
        padding: '1.5rem',
        width: '100%'
      }}
    >
      <div 
        className="glass" 
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '2.5rem',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5), var(--shadow-glow)',
          animation: 'fadeIn 0.5s ease-out'
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
            <LogoIcon size={80} />
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '320px', margin: '0 auto' }}>
            Manage your reading life, remember notes, and connect with book clubs.
          </p>
        </div>

        {/* Tab Selector */}
        <div 
          style={{
            display: 'flex',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(255,255,255,0.03)',
            padding: '0.25rem',
            marginBottom: '1.75rem',
            border: '1px solid var(--border-glass)'
          }}
        >
          <button
            type="button"
            style={{
              flex: 1,
              padding: '0.6rem',
              border: 'none',
              background: !isSignUp ? 'rgba(212, 178, 111, 0.12)' : 'transparent',
              color: !isSignUp ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.85rem',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              borderBottom: !isSignUp ? '1px solid var(--accent-primary)' : 'none'
            }}
            onClick={() => {
              setIsSignUp(false);
              setApiError('');
              resetLoginForm();
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            style={{
              flex: 1,
              padding: '0.6rem',
              border: 'none',
              background: isSignUp ? 'rgba(212, 178, 111, 0.12)' : 'transparent',
              color: isSignUp ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.85rem',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              borderBottom: isSignUp ? '1px solid var(--accent-primary)' : 'none'
            }}
            onClick={() => {
              setIsSignUp(true);
              setApiError('');
              resetSignUpForm();
            }}
          >
            Register
          </button>
        </div>

        {errorMessages && (
          <div 
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#f87171',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              marginBottom: '1.25rem'
            }}
          >
            {errorMessages}
          </div>
        )}

        {isSignUp ? (
          <form onSubmit={handleSignUpSubmit(onSignUpSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Full Name
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex' }}>
                  <User size={16} />
                </span>
                <input
                  type="text"
                  placeholder="e.g. Priyadharshika"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  {...registerSignUp('fullName')}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex' }}>
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  placeholder="name@example.com"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  {...registerSignUp('email')}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Date of Birth
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {/* Month Select */}
                <select
                  className="form-select"
                  value={dobMonth}
                  onChange={(e) => setDobMonth(e.target.value)}
                  style={{
                    flex: 2,
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem 1rem',
                    color: dobMonth ? 'var(--text-primary)' : 'var(--text-muted)',
                    outline: 'none',
                    fontSize: '0.9rem',
                    cursor: 'pointer'
                  }}
                >
                  <option value="" disabled style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>Month</option>
                  {MONTHS.map((m, idx) => (
                    <option key={idx} value={String(idx + 1).padStart(2, '0')} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                      {m}
                    </option>
                  ))}
                </select>

                {/* Day Select */}
                <select
                  className="form-select"
                  value={dobDay}
                  onChange={(e) => setDobDay(e.target.value)}
                  style={{
                    flex: 1.2,
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem 1rem',
                    color: dobDay ? 'var(--text-primary)' : 'var(--text-muted)',
                    outline: 'none',
                    fontSize: '0.9rem',
                    cursor: 'pointer'
                  }}
                >
                  <option value="" disabled style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>Day</option>
                  {Array.from({ length: 31 }).map((_, idx) => {
                    const d = String(idx + 1).padStart(2, '0');
                    return (
                      <option key={idx} value={d} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                        {idx + 1}
                      </option>
                    );
                  })}
                </select>

                {/* Year Select */}
                <select
                  className="form-select"
                  value={dobYear}
                  onChange={(e) => setDobYear(e.target.value)}
                  style={{
                    flex: 1.5,
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem 1rem',
                    color: dobYear ? 'var(--text-primary)' : 'var(--text-muted)',
                    outline: 'none',
                    fontSize: '0.9rem',
                    cursor: 'pointer'
                  }}
                >
                  <option value="" disabled style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>Year</option>
                  {Array.from({ length: 102 }).map((_, idx) => {
                    const y = String(2021 - idx);
                    return (
                      <option key={idx} value={y} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                        {y}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex' }}>
                  <Lock size={16} />
                </span>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  {...registerSignUp('password')}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
              style={{
                padding: '0.8rem',
                fontSize: '0.95rem',
                marginTop: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                background: 'var(--accent-primary)',
                color: '#091A1E'
              }}
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              <span style={{ fontWeight: 700 }}>{isLoading ? 'Creating...' : 'Create Account'}</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleLoginSubmit(onLoginSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Email or Username
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex' }}>
                  <Mail size={16} />
                </span>
                <input
                  type="text"
                  placeholder="name@example.com or username"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  {...registerLogin('usernameOrEmail')}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex' }}>
                  <Lock size={16} />
                </span>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  {...registerLogin('password')}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
              style={{
                padding: '0.8rem',
                fontSize: '0.95rem',
                marginTop: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                background: 'var(--accent-primary)',
                color: '#091A1E'
              }}
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              <span style={{ fontWeight: 700 }}>{isLoading ? 'Signing In...' : 'Sign In'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
