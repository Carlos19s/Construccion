'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function Sidebar() {
  const pathname = usePathname();
  const { hasPermission } = useAuth();

  // Enlaces por defecto y por permisos
  const links = [
    // --- GESTIÓN ---
    ...(hasPermission('gestionar_mesas') || hasPermission('eliminar_plato') || hasPermission('permitir_asignar_funciones') ? [{ label: 'Gestión', type: 'title' }] : []),
    ...(hasPermission('gestionar_mesas') ? [{ href: '/admin/mesas', icon: '🪑', label: 'Mesas' }] : []),
    ...(hasPermission('eliminar_plato') ? [{ href: '/admin/platos', icon: '🍽️', label: 'Platos' }] : []),
    ...(hasPermission('permitir_asignar_funciones') ? [{ href: '/admin/usuarios', icon: '🧑‍💼', label: 'Usuarios' }] : []),

    // --- OPERACIONES ---
    ...(hasPermission('crear_orden') ? [
      { label: 'Operaciones', type: 'title' },
      { href: '/admin/ordenes', icon: '📝', label: 'Toma de Órdenes' },
      { href: '/admin/seguimiento', icon: '📋', label: 'Seguimiento' }
    ] : []),

    // --- ANÁLISIS ---
    ...(hasPermission('ver_reportes') ? [
      { label: 'Análisis', type: 'title' },
      { href: '/admin/reportes', icon: '📊', label: 'Reportes' }
    ] : [])
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
