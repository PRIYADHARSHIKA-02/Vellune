import React from 'react';
import { useStore, ScreenType } from '../store';
import { 
  BookOpen, Library, Clock, Sparkles, 
  Bookmark, Users, BarChart3, Sun, Moon 
} from 'lucide-react';

interface NavItem {
  id: ScreenType;
  label: string;
  icon: React.ComponentType<any>;
}

const NAVIGATION_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: BookOpen },
  { id: 'shelf', label: 'Shelf', icon: Library },
  { id: 'track', label: 'Track', icon: Clock },
  { id: 'discover', label: 'Discover', icon: Sparkles },
  { id: 'remember', label: 'Remember', icon: Bookmark },
  { id: 'groups', label: 'Circles', icon: Users },
  { id: 'stats', label: 'Stats', icon: BarChart3 }
];

export const Sidebar: React.FC = () => {
  const { currentScreen, setScreen, theme, toggleTheme } = useStore();

  return (
    <aside className="sidebar">
      <div className="logo-container">
        <span className="logo-icon">📚</span>
        <h1 className="logo-text">Vellune</h1>
      </div>
      
      <nav style={{ flexGrow: 1 }}>
        <ul className="nav-links">
          {NAVIGATION_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentScreen === item.id;
            return (
              <li key={item.id}>
                <a
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => setScreen(item.id)}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-glass)', paddingTop: '1.25rem' }}>
        <button 
          className="btn btn-secondary" 
          style={{ width: '100%', display: 'flex', gap: '0.75rem', justifyContent: 'center' }}
          onClick={toggleTheme}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
      </div>
    </aside>
  );
};

export const MobileNav: React.FC = () => {
  const { currentScreen, setScreen, theme, toggleTheme } = useStore();

  return (
    <nav className="mobile-nav">
      {NAVIGATION_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = currentScreen === item.id;
        return (
          <a
            key={item.id}
            className={`mobile-nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setScreen(item.id)}
          >
            <Icon />
            <span>{item.label}</span>
          </a>
        );
      })}
      
      <a className="mobile-nav-item" onClick={toggleTheme}>
        {theme === 'dark' ? <Sun /> : <Moon />}
        <span>Theme</span>
      </a>
    </nav>
  );
};
