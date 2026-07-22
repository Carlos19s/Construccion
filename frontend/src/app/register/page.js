'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { graphqlRequest } from '@/lib/graphql-client';
import { useAuth } from '@/lib/auth';

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  
  const [form, setForm] = useState({ 
    nombre: '', 
    identificacion: '', 
    telefono: '', 
    email: '', 
    password: '' 
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await graphqlRequest(`
        mutation Register($input: RegisterInput!) {
          register(input: $input) {
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

      // Iniciar sesión automáticamente usando el AuthPayload retornado por el register
      login(data.register.token, data.register.usuario);

      // Redirigir al cliente (nuevo registro siempre es cliente por defecto)
      router.push('/catalogo');
      
    } catch (err) {
      setError(err.message || 'Error al registrar la cuenta. Es posible que el correo o identificación ya existan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: '450px' }}>
        <div style={{ textAlign: 'center', fontSize: '3rem', marginBottom: '16px' }}>📝</div>
        <h1>Crear Cuenta</h1>
        <p className="auth-subtitle">Regístrate para hacer reservas y pedidos</p>

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
            <label htmlFor="nombre">Nombre Completo</label>
            <input
              id="nombre"
              type="text"
              className="form-control"
              placeholder="Ej. Juan Pérez"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div className="form-group">
              <label htmlFor="identificacion">Cédula / Identificación</label>
              <input
                id="identificacion"
                type="text"
                className="form-control"
                placeholder="1700000000"
                value={form.identificacion}
                onChange={(e) => setForm({ ...form, identificacion: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="telefono">Teléfono (opcional)</label>
              <input
                id="telefono"
                type="text"
                className="form-control"
                placeholder="099..."
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              />
            </div>
          </div>

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
            style={{ width: '100%', padding: '14px', fontSize: '1rem', marginTop: '10px' }}
            disabled={loading}
          >
            {loading ? 'Creando cuenta...' : 'Registrarse'}
          </button>
        </form>

        <div className="auth-footer">
          ¿Ya tienes una cuenta?{' '}
          <Link href="/login">Inicia Sesión aquí</Link>
        </div>
      </div>
    </div>
  );
}
