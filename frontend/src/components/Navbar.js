'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout, isAdmin, isOperativo } = useAuth();

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link href="/" className="navbar-logo">
          <span>🍽️</span>
          <span className="logo-text">Restaurante</span>
        </Link>

        <div className="navbar-links">
          <Link href="/" className={pathname === '/' ? 'active' : ''}>
            Menú Principal
          </Link>
          {user && (isAdmin() || isOperativo()) && (
            <Link href="/admin/ordenes" className={pathname.startsWith('/admin') ? 'active' : ''}>
              Panel Interno
            </Link>
          )}
        </div>

        <div className="navbar-actions">
          {user ? (
            <>
              <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                🧑‍💼 {user.nombre}
              </span>
              <button className="btn btn-secondary btn-sm" onClick={logout}>
                Salir
              </button>
            </>
          ) : (
            <>
              <Link href="/login">
                <button className="btn btn-secondary btn-sm">Acceso Personal</button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
