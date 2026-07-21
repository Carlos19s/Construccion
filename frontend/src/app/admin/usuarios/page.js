'use client';

import { useState, useEffect } from 'react';
import { graphqlRequest } from '@/lib/graphql-client';
import { useAuth } from '@/lib/auth';

export default function UsuariosAdminPage() {
  const { token, isAdmin } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('admin'); // 'admin' | 'empleados' | 'clientes'
  
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ nombre: '', email: '', password: '', id_rol: '1' });
  const [error, setError] = useState('');

  useEffect(() => { 
    if(isAdmin()) fetchData(); 
  }, [isAdmin]);

  const fetchData = async () => {
    try {
      const data = await graphqlRequest(`
        query { 
          usuarios { 
            id_usuario 
            nombre 
            email 
            id_rol
            rol { nombre } 
          } 
          clientes {
            id_cliente
            nombre
            identificacion
            telefono
          }
        }
      `, {}, token);
      setUsuarios(data.usuarios || []);
      setClientes(data.clientes || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setForm({
      nombre: '',
      email: '',
      password: '',
      id_rol: activeTab === 'admin' ? '1' : '2'
    });
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
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteUsuario = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
    try {
      await graphqlRequest(`mutation { deleteUsuario(id_usuario: ${id}) }`, {}, token);
      fetchData();
    } catch (err) { alert(err.message); }
  };

  const handleDeleteCliente = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este cliente?')) return;
    try {
      await graphqlRequest(`mutation { deleteCliente(id_cliente: ${id}) }`, {}, token);
      fetchData();
    } catch (err) { alert(err.message); }
  };

  if (!isAdmin()) {
    return <div className="loading-container"><span>No tienes permisos para ver esta página</span></div>;
  }

  if (loading) {
    return <div className="loading-container"><div className="spinner" /><span>Cargando datos...</span></div>;
  }

  const administradores = usuarios.filter(u => u.id_rol === 1 || u.rol?.nombre === 'Admin');
  const empleados = usuarios.filter(u => u.id_rol !== 1 && u.rol?.nombre !== 'Admin');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 800, color: 'var(--color-text)',
          }}>
            👥 Gestión de Usuarios y Clientes
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Administra administradores, empleados y consulta la lista de clientes registrados
          </p>
        </div>
        {activeTab !== 'clientes' && (
          <button className="btn btn-primary" onClick={openCreate}>
            + Nuevo {activeTab === 'admin' ? 'Administrador' : 'Empleado'}
          </button>
        )}
      </div>

      {/* Navegación por Pestañas (Tabs) */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '2px solid var(--color-border)', paddingBottom: '4px' }}>
        <button
          style={{
            padding: '10px 20px',
            fontWeight: 600,
            borderRadius: 'var(--radius-md)',
            border: 'none',
            cursor: 'pointer',
            background: activeTab === 'admin' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'admin' ? '#fff' : 'var(--color-text-secondary)',
            transition: 'all 0.2s'
          }}
          onClick={() => setActiveTab('admin')}
        >
          🛡️ Administradores ({administradores.length})
        </button>
        <button
          style={{
            padding: '10px 20px',
            fontWeight: 600,
            borderRadius: 'var(--radius-md)',
            border: 'none',
            cursor: 'pointer',
            background: activeTab === 'empleados' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'empleados' ? '#fff' : 'var(--color-text-secondary)',
            transition: 'all 0.2s'
          }}
          onClick={() => setActiveTab('empleados')}
        >
          🧑‍🍳 Empleados ({empleados.length})
        </button>
        <button
          style={{
            padding: '10px 20px',
            fontWeight: 600,
            borderRadius: 'var(--radius-md)',
            border: 'none',
            cursor: 'pointer',
            background: activeTab === 'clientes' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'clientes' ? '#fff' : 'var(--color-text-secondary)',
            transition: 'all 0.2s'
          }}
          onClick={() => setActiveTab('clientes')}
        >
          👤 Clientes ({clientes.length})
        </button>
      </div>

      {/* Tab: Administradores */}
      {activeTab === 'admin' && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {administradores.map((usr) => (
                <tr key={usr.id_usuario}>
                  <td style={{ color: 'var(--color-text-muted)' }}>#{usr.id_usuario}</td>
                  <td style={{ fontWeight: 600 }}>{usr.nombre}</td>
                  <td>{usr.email}</td>
                  <td><span className="badge badge-primary">Admin</span></td>
                  <td style={{ textAlign: 'center' }}>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDeleteUsuario(usr.id_usuario)}>🗑️</button>
                  </td>
                </tr>
              ))}
              {administradores.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)' }}>
                    No hay administradores registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Empleados */}
      {activeTab === 'empleados' && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {empleados.map((usr) => (
                <tr key={usr.id_usuario}>
                  <td style={{ color: 'var(--color-text-muted)' }}>#{usr.id_usuario}</td>
                  <td style={{ fontWeight: 600 }}>{usr.nombre}</td>
                  <td>{usr.email}</td>
                  <td><span className="badge badge-info">{usr.rol?.nombre || 'Operativo'}</span></td>
                  <td style={{ textAlign: 'center' }}>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDeleteUsuario(usr.id_usuario)}>🗑️</button>
                  </td>
                </tr>
              ))}
              {empleados.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)' }}>
                    No hay empleados registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Clientes */}
      {activeTab === 'clientes' && (
        <div>
          <div style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: '16px',
            color: 'var(--color-text-secondary)', fontSize: '0.85rem'
          }}>
            ℹ️ Los clientes se registran automáticamente durante la toma de órdenes o el proceso de reservas. No se pueden crear manualmente desde esta sección.
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre / Razón Social</th>
                  <th>Identificación (Cédula/RUC)</th>
                  <th>Teléfono</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((cli) => (
                  <tr key={cli.id_cliente}>
                    <td style={{ color: 'var(--color-text-muted)' }}>#{cli.id_cliente}</td>
                    <td style={{ fontWeight: 600 }}>{cli.nombre}</td>
                    <td>{cli.identificacion}</td>
                    <td>{cli.telefono || 'Sin teléfono'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDeleteCliente(cli.id_cliente)}>🗑️</button>
                    </td>
                  </tr>
                ))}
                {clientes.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)' }}>
                      No hay clientes registrados en el sistema
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal para Crear Usuario (Admin / Empleado) */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nuevo {form.id_rol === '1' ? 'Administrador' : 'Empleado'}</h2>
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
                  <option value="1">Administrador</option>
                  <option value="2">Operativo (Empleado / Mesero)</option>
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
