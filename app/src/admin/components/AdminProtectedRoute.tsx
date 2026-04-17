import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { isUserAdmin } from '../lib/adminAuth';

type Status = 'loading' | 'authorized' | 'not-admin' | 'not-logged';

export function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setStatus('not-logged');
      return;
    }
    isUserAdmin(user.id).then(ok => setStatus(ok ? 'authorized' : 'not-admin'));
  }, [user, authLoading]);

  if (status === 'loading' || authLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <span className="material-symbols-outlined text-primary text-4xl animate-spin">
          progress_activity
        </span>
      </div>
    );
  }

  if (status === 'not-logged') return <Navigate to="/login" replace />;
  if (status === 'not-admin') return <Navigate to="/" replace />;

  return <>{children}</>;
}
