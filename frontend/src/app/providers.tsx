'use client';

import React, { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useStore } from '../store';
import { TopNav, MobileNav } from '../components/TopNav';
import { ActiveSessionTracker } from '../components/ActiveSessionTracker';
import { EndSessionModal } from '../components/EndSessionModal';
import { BookDetailModal } from '../components/BookDetailModal';
import { AddBookModal } from '../components/AddBookModal';
import { Plus } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

// Create a single QueryClient instance per session
const makeQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        refetchOnWindowFocus: false,
      },
    },
  });
};

let browserQueryClient: QueryClient | undefined = undefined;

const getQueryClient = () => {
  if (typeof window === 'undefined') {
    return makeQueryClient();
  } else {
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
};

export default function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  const { 
    initStore, 
    selectedBookIdForDetail, 
    setSelectedBookIdForDetail,
    isAuthenticated 
  } = useStore();
  
  const [isEndSessionOpen, setIsEndSessionOpen] = useState(false);
  const [isAddBookOpen, setIsAddBookOpen] = useState(false);
  const [particles, setParticles] = useState<{ left: string; width: string; height: string; duration: string; delay: string }[]>([]);
  
  const router = useRouter();
  const pathname = usePathname();

  // Initialize store and particles
  useEffect(() => {
    initStore();

    // Create randomized particles once
    const generatedParticles = Array.from({ length: 12 }).map(() => ({
      left: `${Math.random() * 100}%`,
      width: `${Math.random() * 3 + 2}px`,
      height: `${Math.random() * 3 + 2}px`,
      duration: `${Math.random() * 12 + 10}s`,
      delay: `${Math.random() * -12}s`,
    }));
    setParticles(generatedParticles);
  }, [initStore]);

  // Cursor tracker for ambient gold light-blob glow
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleMouseMove = (e: MouseEvent) => {
      document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
      document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isAuthenticated]);

  // Redirect to /auth if not authenticated, and away from /auth if authenticated
  useEffect(() => {
    // Check authentication once client store resolves
    const token = localStorage.getItem('rlm_token');
    const user = localStorage.getItem('rlm_user');
    const hasAuth = !!token && !!user;

    if (!hasAuth && pathname !== '/auth') {
      router.push('/auth');
    } else if (hasAuth && pathname === '/auth') {
      router.push('/');
    }
  }, [isAuthenticated, pathname, router]);

  // If unauthenticated and on a page that is not auth, render nothing or loading during redirect
  const showAuthOnly = !isAuthenticated && pathname !== '/auth';

  if (showAuthOnly) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-secondary)' }}>
        Loading Vellune...
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      {/* Background gradients and visual layers */}
      <div className="ambient-bg">
        <div className="light-blob teal-blob"></div>
        {isAuthenticated && <div className="light-blob gold-blob"></div>}
      </div>

      {/* Cinematic light leaks */}
      <div className="light-streak" style={{ top: '10%', left: '15%' }}></div>
      <div className="light-streak" style={{ top: '65%', left: '80%', animationDelay: '5s' }}></div>

      {/* Star dust drifting particles */}
      <div className="particles-container">
        {particles.map((p, idx) => (
          <div
            key={idx}
            className="particle"
            style={{
              left: p.left,
              width: p.width,
              height: p.height,
              animationDuration: p.duration,
              animationDelay: p.delay
            }}
          />
        ))}
      </div>

      {isAuthenticated && <TopNav />}

      <main className={isAuthenticated ? "main-content" : ""}>
        {children}
      </main>

      {isAuthenticated && (
        <>
          {/* Floating active tracking bar (if session running) */}
          <ActiveSessionTracker onLogOpen={() => setIsEndSessionOpen(true)} />

          {/* Global Floating Action Button (FAB) for adding books */}
          <button 
            className="global-fab" 
            onClick={() => setIsAddBookOpen(true)}
            title="Add New Book"
          >
            <Plus size={24} />
          </button>

          {/* Navigation (Mobile Bottom Bar) */}
          <MobileNav />

          {/* End Session Logging Modal Overlay */}
          <EndSessionModal 
            isOpen={isEndSessionOpen} 
            onClose={() => setIsEndSessionOpen(false)} 
          />

          {/* Book Inspection Detail Overlay */}
          {selectedBookIdForDetail && (
            <BookDetailModal 
              bookId={selectedBookIdForDetail} 
              onClose={() => setSelectedBookIdForDetail(null)} 
            />
          )}

          {/* Add Book Global Modal Form */}
          <AddBookModal 
            isOpen={isAddBookOpen} 
            onClose={() => setIsAddBookOpen(false)} 
          />
        </>
      )}
    </QueryClientProvider>
  );
}
