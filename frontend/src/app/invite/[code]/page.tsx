'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAcceptInvitation } from '../../../hooks/queries';
import { useStore } from '../../../store';
import { Loader2, AlertTriangle, CheckCircle } from 'lucide-react';

export default function InvitePage() {
  const params = useParams();
  const code = params.code as string;
  const router = useRouter();
  const { isAuthenticated } = useStore();
  const acceptInvitationMutation = useAcceptInvitation();
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [circleInfo, setCircleInfo] = useState<{ id: string; name: string } | null>(null);
  const [isJoining, setIsJoining] = useState<boolean>(false);

  useEffect(() => {
    // If auth state is not yet initialized or user is not logged in
    const token = localStorage.getItem('rlm_token');
    const user = localStorage.getItem('rlm_user');
    const hasAuth = !!token && !!user;

    if (!hasAuth) {
      // Save invite code and redirect to /auth
      localStorage.setItem('rlm_pending_invite', code);
      router.push('/auth');
      return;
    }

    // Guard to run only once
    if (isJoining || success || error) return;
    setIsJoining(true);

    const joinCircle = async () => {
      try {
        const res = await acceptInvitationMutation.mutateAsync(code);
        if (res?.circle) {
          setCircleInfo(res.circle);
          setSuccess(true);
          // Redirect to groups page with circle selected after 2 seconds
          setTimeout(() => {
            router.push(`/groups?circleId=${res.circle.id}`);
          }, 2000);
        } else {
          setError('Failed to join the reading circle.');
          setIsJoining(false);
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to join the reading circle. The link might be invalid or expired.');
        setIsJoining(false);
      }
    };

    joinCircle();
  }, [code, isAuthenticated, router, isJoining, success, error, acceptInvitationMutation]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '1.5rem' }}>
      <div className="glass animate-fade-in" style={{ width: '100%', maxWidth: '480px', padding: '2.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.5), var(--shadow-glow)' }}>
        
        {/* Loading State */}
        {!success && !error && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
            <Loader2 className="animate-spin" size={48} style={{ color: 'var(--accent-primary)' }} />
            <div>
              <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>Joining Reading Circle</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Please wait while we verify your invitation code...</p>
            </div>
          </div>
        )}

        {/* Success State */}
        {success && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%', color: '#10b981' }}>
              <CheckCircle size={48} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>Joined Successfully!</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                You are now a member of <strong style={{ color: 'var(--accent-primary)' }}>{circleInfo?.name}</strong>.
              </p>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                Redirecting to Groups <Loader2 size={12} className="animate-spin" />
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', width: '100%' }}>
            <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%', color: '#ef4444' }}>
              <AlertTriangle size={48} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>Could Not Join Circle</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                {error}
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', width: '100%' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => router.push('/groups')}
                  style={{ flex: 1 }}
                >
                  Go to Groups
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={() => router.push('/')}
                  style={{ flex: 1, color: '#091A1E', fontWeight: 700 }}
                >
                  Dashboard
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
