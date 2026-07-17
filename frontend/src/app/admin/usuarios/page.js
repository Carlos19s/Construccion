'use client';

import { useState, useEffect } from 'react';
import { graphqlRequest } from '@/lib/graphql-client';
import { useAuth } from '@/lib/auth';

export default function UsuariosAdminPage() {
  const { token, isAdmin } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ nombre: '', email: '', password: '', id_rol: '2' });
  const [error, setError] = useState('');

  useEffect(() => { 
    if(isAdmin()) fetchUsuarios(); 
  }, [isAdmin]);

  const fetchUsuarios = async () => {
    try {
      const data = await graphqlRequest(`
        query { 
          usuarios { 
            id_usuario 
            nombre 
            email 
            rol { nombre } 
          } 
        }
      `, {}, token);
      setUsuarios(data.usuarios);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setForm({ nombre: '', email: '', password: '', id_rol: '2' });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await graphqlRequest(`
        mutation CreateUsuario($input: UsuarioInput!) {
          createUsuario(input: $input) { id_usuario }
        }
      `, {
        input: {
          nombre: form.nombre,
          email: form.email,
          password: form.password,
          id_rol: parseInt(form.id_rol),
        }
      }, token);

      setShowModal(false);
      fetchUsuarios();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
    try {
      await graphqlRequest(`mutation { deleteUsuario(id_usuario: ${id}) }`, {}, token);
      fetchUsuarios();
    } catch (err) { alert(err.message); }
  };

  if (!isAdmin()) {
    return <div className="loading-container"><span>No tienes permisos para ver esta página</span></div>;
  }

  if (loading) {
    return <div className="loading-container"><div className="spinner" /><span>Cargando usuarios...</span></div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 800, color: 'var(--color-text)',
          }}>
            🧑‍💼 Gestión de Usuarios
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Administra los accesos de los empleados del restaurante
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Nuevo Empleado</button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((usr) => (
              <tr key={usr.id_usuario}>
                <td style={{ color: 'var(--color-text-muted)' }}>#{usr.id_usuario}</td>
                <td style={{ fontWeight: 600 }}>{usr.nombre}</td>
                <td>{usr.email}</td>
                <td>
                  <span className={`badge ${usr.rol?.nombre === 'Admin' ? 'badge-primary' : 'badge-info'}`}>
                    {usr.rol?.nombre || 'Desconocido'}
                  </span>
                </td>
                <td>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(usr.id_usuario)}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nuevo Empleado</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            {error && (
              <div style={{
                background: 'rgba(239,71,111,0.1)', border: '1px solid rgba(239,71,111,0.3)',
                borderRadius: 'var(--radius-md)', padding: '12px', color: 'var(--color-danger)',
                marginBottom: '16px', fontSize: '0.9rem',
              }}>⚠️ {error}</div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nombre Completo</label>
                <input type="text" className="form-control" required
                  value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" className="form-control" required
                  value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Contraseña</label>
                <input type="password" className="form-control" required
                  value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Rol</label>
                <select className="form-control" value={form.id_rol} onChange={(e) => setForm({ ...form, id_rol: e.target.value })}>
                  <option value="2">Operativo (Cajero/Mesero)</option>
                  <option value="1">Administrador</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Crear Usuario</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
