'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function Sidebar() {
  const pathname = usePathname();
  const { isAdmin } = useAuth();

  const links = [
    { label: 'Gestión', type: 'title' },
    { href: '/admin/mesas', icon: '🪑', label: 'Mesas' },
    { href: '/admin/platos', icon: '🍽️', label: 'Platos' },
    ...(isAdmin() ? [{ href: '/admin/usuarios', icon: '🧑‍💼', label: 'Usuarios' }] : []),
    { label: 'Operaciones', type: 'title' },
    { href: '/admin/ordenes', icon: '📝', label: 'Toma de Órdenes' },
    { href: '/admin/seguimiento', icon: '📋', label: 'Seguimiento' },
    { label: 'Análisis', type: 'title' },
    { href: '/admin/reportes', icon: '📊', label: 'Reportes' },
  ];

  return (
    <aside className="sidebar">
      {links.map((link, index) => {
        if (link.type === 'title') {
          return (
            <div key={index} className="sidebar-title">
              {link.label}
            </div>
          );
        }
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`sidebar-link ${pathname === link.href ? 'active' : ''}`}
          >
            <span className="link-icon">{link.icon}</span>
            {link.label}
          </Link>
        );
      })}
    </aside>
  );
}
