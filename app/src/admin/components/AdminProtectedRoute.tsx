import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { checkAdminAccess } from '../lib/adminAuth';

export function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'authorized' | 'denied'>('loading');

  useEffect(() => {
    checkAdminAccess().then(ok => setStatus(ok ? 'authorized' : 'denied'));
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status === 'denied') return <Navigate to="/paineladmin/login" replace />;

  return <>{children}</>;
}
