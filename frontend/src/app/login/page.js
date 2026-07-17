'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { graphqlRequest } from '@/lib/graphql-client';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await graphqlRequest(`
        mutation Login($input: LoginInput!) {
          login(input: $input) {
            token
            usuario {
              id_usuario
              nombre
              email
              id_rol
            }
          }
        }
      `, { input: form });

      login(data.login.token, data.login.usuario);

      // Redirigir según rol
      if (data.login.usuario.id_rol === 1 || data.login.usuario.id_rol === 2) {
        router.push('/admin/ordenes');
      } else {
        router.push('/catalogo');
      }
    } catch (err) {
      setError(err.message || 'Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div style={{ textAlign: 'center', fontSize: '3rem', marginBottom: '16px' }}>🍽️</div>
        <h1>Iniciar Sesión</h1>
        <p className="auth-subtitle">Accede a tu cuenta para continuar</p>

        {error && (
          <div style={{
            background: 'rgba(239, 71, 111, 0.1)',
            border: '1px solid rgba(239, 71, 111, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            color: 'var(--color-danger)',
            marginBottom: '20px',
            fontSize: '0.9rem',
          }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Correo Electrónico</label>
            <input
              id="email"
              type="email"
              className="form-control"
              placeholder="tu@email.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
            disabled={loading}
          >
            {loading ? 'Ingresando...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="auth-footer">
          ¿No tienes cuenta?{' '}
          <Link href="/register">Regístrate aquí</Link>
        </div>
      </div>
    </div>
  );
}
