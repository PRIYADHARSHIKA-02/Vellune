import React from 'react';
import { useStore } from '../store';
import { 
  BookOpen, Library, Clock, Sparkles, 
  Bookmark, Users, BarChart3, Sun, Moon 
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from './Logo';

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<any>;
}

const NAVIGATION_ITEMS: NavItem[] = [
  { path: '/', label: 'Home', icon: BookOpen },
  { path: '/shelf', label: 'Shelf', icon: Library },
  { path: '/track', label: 'Track', icon: Clock },
  { path: '/discover', label: 'Discover', icon: Sparkles },
  { path: '/remember', label: 'Remember', icon: Bookmark },
  { path: '/stats', label: 'Stats', icon: BarChart3 }
];

export const Sidebar: React.FC = () => {
  const { theme, toggleTheme } = useStore();
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div style={{ padding: '0 0.5rem 1.5rem 0.5rem' }}>
        <Logo size={36} />
      </div>
      
      <nav style={{ flexGrow: 1 }}>
        <ul className="nav-links">
          {NAVIGATION_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;
            return (
              <li key={item.path}>
                <Link
                  href={item.path}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
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
  const { theme, toggleTheme } = useStore();
  const pathname = usePathname();

  return (
    <nav className="mobile-nav">
      {NAVIGATION_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.path;
        return (
          <Link
            key={item.path}
            href={item.path}
            className={`mobile-nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon />
            <span>{item.label}</span>
          </Link>
        );
      })}
      
      <a className="mobile-nav-item" onClick={toggleTheme}>
        {theme === 'dark' ? <Sun /> : <Moon />}
        <span>Theme</span>
      </a>
    </nav>
  );
};
