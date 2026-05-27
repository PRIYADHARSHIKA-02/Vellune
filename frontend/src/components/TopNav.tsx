import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { 
  BookOpen, Library, Clock, Sparkles, 
  Bookmark, Users, BarChart3, Sun, Moon,
  LogOut, User, Settings, Save, X, Edit2
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Logo } from './Logo';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
}

const NAVIGATION_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: BookOpen },
  { id: 'shelf', label: 'Shelf', icon: Library },
  { id: 'track', label: 'Track', icon: Clock },
  { id: 'discover', label: 'Discover', icon: Sparkles },
  { id: 'remember', label: 'Remember', icon: Bookmark },
  { id: 'stats', label: 'Stats', icon: BarChart3 }
];

const PRESETS_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', // Female 1
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150', // Male 1
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', // Female 2
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', // Male 2
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150', // General 1
];

export const TopNav: React.FC = () => {
  const { theme, toggleTheme, user, logout } = useStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      <header className="top-nav">
        {/* Brand Logo */}
        <Link href="/" style={{ textDecoration: 'none' }}>
          <Logo size={32} />
        </Link>

        {/* Center Links (Desktop only) */}
        <nav>
          <ul className="nav-links">
            {NAVIGATION_ITEMS.map((item) => {
              const Icon = item.icon;
              const href = item.id === 'home' ? '/' : `/${item.id}`;
              const isActive = pathname === href;
              return (
                <li key={item.id}>
                  <Link
                    href={href}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Right side controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }} ref={dropdownRef}>
          {/* Quick theme toggler */}
          <button 
            className="btn btn-text"
            style={{ padding: '0.4rem', color: 'var(--text-secondary)' }}
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* User profile dropdown trigger */}
          {user && (
            <div 
              className="profile-widget"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <div className="profile-avatar-container">
                <img 
                  src={user.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'} 
                  alt={user.fullName || user.username || 'User'} 
                  className="profile-avatar"
                />
              </div>
              <span className="profile-name" style={{ display: 'inline-block' }}>{user.fullName || user.username}</span>
            </div>
          )}

          {/* Dropdown Menu */}
          {isDropdownOpen && user && (
            <div className="profile-dropdown">
              <div className="profile-dropdown-header">
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{user.fullName || user.username}</div>
                <div className="profile-dropdown-email">{user.email}</div>
              </div>
              
              <a 
                className="profile-dropdown-item" 
                onClick={() => {
                  setIsDropdownOpen(false);
                  setIsProfileModalOpen(true);
                }}
              >
                <User size={16} />
                <span>Profile Settings</span>
              </a>

              <a 
                className="profile-dropdown-item danger" 
                onClick={() => {
                  setIsDropdownOpen(false);
                  logout();
                }}
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </a>
            </div>
          )}
        </div>
      </header>

      {/* Profile Modal */}
      {isProfileModalOpen && user && (
        <ProfileModal 
          isOpen={isProfileModalOpen} 
          onClose={() => setIsProfileModalOpen(false)} 
        />
      )}
    </>
  );
};

export const MobileNav: React.FC = () => {
  const pathname = usePathname();

  return (
    <nav className="mobile-nav">
      {NAVIGATION_ITEMS.map((item) => {
        const Icon = item.icon;
        const href = item.id === 'home' ? '/' : `/${item.id}`;
        const isActive = pathname === href;
        return (
          <Link
            key={item.id}
            href={href}
            className={`mobile-nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

/* Edit Profile Modal Component */
interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, updateProfile } = useStore();
  
  const [name, setName] = useState(user?.fullName || user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [favoriteGenre, setFavoriteGenre] = useState(user?.favoriteGenre || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [showCustomAvatarInput, setShowCustomAvatarInput] = useState(false);

  if (!user) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      fullName: name.trim(),
      email: email.trim(),
      bio: bio.trim(),
      favoriteGenre: favoriteGenre.trim(),
      avatarUrl: showCustomAvatarInput && customAvatarUrl.trim() ? customAvatarUrl.trim() : (avatarUrl || undefined)
    });
    onClose();
  };

  return (
    <div className="modal-overlay" style={{ display: 'flex' }}>
      <div className="modal-content animate-fade-in" style={{ maxWidth: '500px' }}>
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>

        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.75rem' }}>
          Profile Settings
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Avatar Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Profile Picture
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
              <img 
                src={showCustomAvatarInput && customAvatarUrl ? customAvatarUrl : avatarUrl} 
                alt="Preview" 
                style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-primary)' }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150';
                }}
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {PRESETS_AVATARS.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setAvatarUrl(url);
                      setShowCustomAvatarInput(false);
                    }}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      padding: 0,
                      overflow: 'hidden',
                      border: !showCustomAvatarInput && avatarUrl === url ? '2px solid var(--accent-primary)' : '1px solid var(--border-glass)',
                      cursor: 'pointer',
                      opacity: !showCustomAvatarInput && avatarUrl === url ? 1 : 0.7,
                      transition: 'opacity 0.2s'
                    }}
                  >
                    <img src={url} alt="Preset Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </button>
                ))}
                
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: 'var(--radius-sm)' }}
                  onClick={() => setShowCustomAvatarInput(!showCustomAvatarInput)}
                >
                  {showCustomAvatarInput ? 'Use Preset' : 'Custom URL'}
                </button>
              </div>
            </div>

            {showCustomAvatarInput && (
              <input
                type="url"
                className="form-input"
                placeholder="Paste Image URL (https://...)"
                value={customAvatarUrl}
                onChange={(e) => setCustomAvatarUrl(e.target.value)}
                style={{ fontSize: '0.85rem' }}
              />
            )}
          </div>

          {/* Name Field */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              Full Name
            </label>
            <input
              type="text"
              required
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Doe"
            />
          </div>

          {/* Email Field */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              Email Address
            </label>
            <input
              type="email"
              required
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
            />
          </div>

          {/* Favorite Genre Field */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              Favorite Genre
            </label>
            <input
              type="text"
              className="form-input"
              value={favoriteGenre}
              onChange={(e) => setFavoriteGenre(e.target.value)}
              placeholder="e.g. Sci-Fi, Classics, Fantasy"
            />
          </div>

          {/* Bio Field */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              Short Bio
            </label>
            <textarea
              className="form-textarea"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell other readers about yourself..."
              style={{ resize: 'none' }}
            />
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
            >
              <Save size={16} />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
