'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useStore } from '../../store';
import { Mail, Lock, User, Sparkles, BookOpen } from 'lucide-react';
import { api } from '../../lib/api';
import { useRouter } from 'next/navigation';

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
    setApiError('');
    setIsLoading(true);
    try {
      const payload = {
        email: data.email,
        username: data.email.split('@')[0], // Derive username from email
        password: data.password,
        fullName: data.fullName,
      };
      const response = await api.post('/auth/register', payload);
      const { token, user } = response.data;
      login(token, user);
      router.push('/');
    } catch (err: any) {
      console.error(err);
      setApiError(err.response?.data?.error || 'Registration failed. Try a different email.');
    } finally {
      setIsLoading(false);
    }
  };

  const errorMessages = isSignUp 
    ? Object.values(registerErrors).map(e => e.message).join(' | ') || apiError
    : Object.values(loginErrors).map(e => e.message).join(' | ') || apiError;

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
                gap: '0.5rem',
                background: 'var(--accent-primary)',
                color: '#091A1E'
              }}
            >
              <Sparkles size={16} />
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
                gap: '0.5rem',
                background: 'var(--accent-primary)',
                color: '#091A1E'
              }}
            >
              <Sparkles size={16} />
              <span style={{ fontWeight: 700 }}>{isLoading ? 'Signing In...' : 'Sign In'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
