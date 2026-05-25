import React, { useEffect, useState } from 'react';
import { useStore } from './store';
import { TopNav, MobileNav } from './components/TopNav';
import { ActiveSessionTracker } from './components/ActiveSessionTracker';
import { EndSessionModal } from './components/EndSessionModal';
import { BookDetailModal } from './components/BookDetailModal';
import { AuthScreen } from './screens/AuthScreen';
import { AddBookModal } from './components/AddBookModal';
import { Plus } from 'lucide-react';

// Screens
import { Home } from './screens/Home';
import { Shelf } from './screens/Shelf';
import { Track } from './screens/Track';
import { Discover } from './screens/Discover';
import { Remember } from './screens/Remember';
import { Groups } from './screens/Groups';
import { Stats } from './screens/Stats';

const App: React.FC = () => {
  const { 
    initStore, 
    currentScreen, 
    selectedBookIdForDetail, 
    setSelectedBookIdForDetail,
    isAuthenticated
  } = useStore();
  
  const [isEndSessionOpen, setIsEndSessionOpen] = useState(false);
  const [isAddBookOpen, setIsAddBookOpen] = useState(false);
  const [particles, setParticles] = useState<{ left: string; width: string; height: string; duration: string; delay: string }[]>([]);

  // Initialize LocalStorage DB, User & Theme
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
  }, []);

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

  const renderActiveScreen = () => {
    switch (currentScreen) {
      case 'home':
        return <Home />;
      case 'shelf':
        return <Shelf />;
      case 'track':
        return <Track />;
      case 'discover':
        return <Discover />;
      case 'remember':
        return <Remember />;
      case 'groups':
        return <Groups />;
      case 'stats':
        return <Stats />;
      default:
        return <Home />;
    }
  };

  // If not signed in, show AuthScreen only
  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return (
    <div className="app-container">
      {/* Ambient background gradients and visual layers */}
      <div className="ambient-bg">
        <div className="light-blob teal-blob"></div>
        <div className="light-blob gold-blob"></div>
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

      {/* Navigation (Desktop Top Bar) */}
      <TopNav />

      {/* Main content wrapper */}
      <main className="main-content">
        {renderActiveScreen()}
      </main>

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
    </div>
  );
};

export default App;
