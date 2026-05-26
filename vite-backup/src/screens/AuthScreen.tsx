import React, { useState } from 'react';
import { useStore } from '../store';
import { Mail, Lock, User, Sparkles, BookOpen } from 'lucide-react';

export const AuthScreen: React.FC = () => {
  const { login, signUp } = useStore();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please enter your email.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (isSignUp) {
      if (!name) {
        setError('Please enter your name.');
        return;
      }
      signUp(email, name);
    } else {
      login(email, name);
    }
  };

  return (
    <div 
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'radial-gradient(circle at center, #183B43 0%, #091A1E 100%)',
        padding: '1.5rem',
        width: '100vw'
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
          <div 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '60px',
              height: '60px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(212, 178, 111, 0.1)',
              border: '1px solid rgba(212, 178, 111, 0.2)',
              marginBottom: '1rem',
              color: 'var(--accent-primary)',
              filter: 'drop-shadow(0 0 10px rgba(212, 178, 111, 0.3))'
            }}
          >
            <BookOpen size={30} />
          </div>
          <h1 
            style={{
              fontSize: '2rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              letterSpacing: '-0.03em',
              marginBottom: '0.35rem'
            }}
          >
            Vellune
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
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
              setError('');
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
              setError('');
            }}
          >
            Register
          </button>
        </div>

        {error && (
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
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {isSignUp && (
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
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={isSignUp}
                />
              </div>
            </div>
          )}

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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{
              padding: '0.8rem',
              fontSize: '0.95rem',
              marginTop: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'var(--accent-primary)',
              color: '#091A1E' // Dark text for contrast against metallic gold!
            }}
          >
            <Sparkles size={16} />
            <span style={{ fontWeight: 700 }}>{isSignUp ? 'Create Account' : 'Sign In'}</span>
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Tip: You can use any mock email & password to sign in.
        </div>
      </div>
    </div>
  );
};
