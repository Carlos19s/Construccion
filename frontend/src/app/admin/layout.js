'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';

export default function AdminLayout({ children }) {
  const router = useRouter();
  const { user, loading, isAdmin, isOperativo } = useAuth();

  useEffect(() => {
    if (!loading && (!user || (!isAdmin() && !isOperativo()))) {
      router.push('/login');
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="loading-container" style={{ minHeight: '80vh' }}>
        <div className="spinner" />
        <span>Verificando acceso...</span>
      </div>
    );
  }

  if (!user || (!isAdmin() && !isOperativo())) {
    return null;
  }

  return (
    <div className="admin-layout">
      <Sidebar />
      <main className="admin-content">
        {children}
      </main>
    </div>
  );
}
