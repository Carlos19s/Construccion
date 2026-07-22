'use client';

import { useState, useEffect } from 'react';
import { graphqlRequest } from '@/lib/graphql-client';
import { useAuth } from '@/lib/auth';

export default function UsuariosAdminPage() {
  const { token, hasPermission, isAdmin } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [roles, setRoles] = useState([]);
  const [allFunciones, setAllFunciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('admin'); 
  
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({ nombre: '', email: '', password: '', identificacion: '', telefono: '' });
  const [error, setError] = useState('');

  const canManagePermissions = hasPermission('permitir_asignar_funciones') || isAdmin();

  useEffect(() => { 
    if (canManagePermissions) {
      fetchData(); 
    }
  }, [canManagePermissions]);

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
          funciones {
            id_funcion
            nombre
            descripcion
          }
          roles {
            id_rol
            nombre
            funciones { id_funcion nombre descripcion }
          }
        }
      `, {}, token);
      setUsuarios(data.usuarios || []);
      setClientes(data.clientes || []);
      setAllFunciones(data.funciones || []);
      setRoles(data.roles || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditingItem(null);
    setForm({ nombre: '', email: '', password: '', identificacion: '', telefono: '' });
    setError('');
    setShowModal(true);
  };

  const openEditUsuario = (usr) => {
    setEditingItem({ type: 'usuario', id: usr.id_usuario });
    setForm({ nombre: usr.nombre, email: usr.email, password: '', identificacion: '', telefono: '' });
    setError('');
    setShowModal(true);
  };

  const openEditCliente = (cli) => {
    setEditingItem({ type: 'cliente', id: cli.id_cliente });
    setForm({ nombre: cli.nombre, email: '', password: '', identificacion: cli.identificacion, telefono: cli.telefono || '' });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (activeTab === 'admin' || activeTab === 'empleados') {
        const roleId = activeTab === 'admin' ? 1 : 2;
        if (editingItem && editingItem.type === 'usuario') {
          await graphqlRequest(`
            mutation UpdateUsuario($input: UsuarioUpdateInput!) {
              updateUsuario(input: $input) { id_usuario }
            }
          `, {
            input: { id_usuario: editingItem.id, nombre: form.nombre, email: form.email, id_rol: roleId }
          }, token);
        } else {
          await graphqlRequest(`
            mutation CreateUsuario($input: UsuarioInput!) {
              createUsuario(input: $input) { id_usuario }
            }
          `, {
            input: { nombre: form.nombre, email: form.email, password: form.password, id_rol: roleId }
          }, token);
        }
      } else if (activeTab === 'clientes') {
        if (editingItem && editingItem.type === 'cliente') {
          await graphqlRequest(`
            mutation UpdateCliente($input: ClienteUpdateInput!) {
              updateCliente(input: $input) { id_cliente }
            }
          `, {
            input: { id_cliente: editingItem.id, nombre: form.nombre, telefono: form.telefono }
          }, token);
        } else {
          await graphqlRequest(`
            mutation CreateCliente($input: ClienteInput!) {
              createCliente(input: $input) { id_cliente }
            }
          `, {
            input: { nombre: form.nombre, identificacion: form.identificacion, telefono: form.telefono }
          }, token);
        }
      }

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

  const toggleRolePermission = async (id_rol, id_funcion, hasCurrent) => {
    try {
      if (hasCurrent) {
        await graphqlRequest(`
          mutation Remove($id_rol: Int!, $id_funcion: Int!) {
            removeFuncion(id_rol: $id_rol, id_funcion: $id_funcion)
          }
        `, { id_rol, id_funcion }, token);
      } else {
        await graphqlRequest(`
          mutation Assign($id_rol: Int!, $id_funcion: Int!) {
            assignFuncion(id_rol: $id_rol, id_funcion: $id_funcion)
          }
        `, { id_rol, id_funcion }, token);
      }
      setRoles(roles.map(r => {
        if (r.id_rol === id_rol) {
          const nuevasFuncs = hasCurrent 
            ? r.funciones.filter(f => f.id_funcion !== id_funcion)
            : [...r.funciones, allFunciones.find(f => f.id_funcion === id_funcion)];
          return { ...r, funciones: nuevasFuncs };
        }
        return r;
      }));
    } catch (err) {
      alert(err.message);
    }
  };

  if (!canManagePermissions) {
    return <div className="loading-container"><span>No tienes permisos para ver esta página</span></div>;
  }

  if (loading) {
    return <div className="loading-container"><div className="spinner" /><span>Cargando datos...</span></div>;
  }

  const administradores = usuarios.filter(u => u.id_rol === 1 || u.rol?.nombre === 'Admin');
  const empleados = usuarios.filter(u => u.id_rol !== 1 && u.rol?.nombre !== 'Admin');

  let modalTitle = '';
  if (activeTab === 'admin') modalTitle = editingItem ? '✏️ Editar Administrador' : '✨ Nuevo Administrador';
  else if (activeTab === 'empleados') modalTitle = editingItem ? '✏️ Editar Empleado' : '✨ Nuevo Empleado';
  else if (activeTab === 'clientes') modalTitle = editingItem ? '✏️ Editar Cliente' : '✨ Nuevo Cliente';

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
            Navega entre las pestañas para gestionar administradores, empleados, clientes y roles
          </p>
        </div>
        {activeTab !== 'roles' && activeTab !== 'admin' && (
          <button className="btn btn-primary" onClick={openCreate}>
            + Nuevo {activeTab === 'empleados' ? 'Empleado' : 'Cliente'}
          </button>
        )}
      </div>

      {/* Navegación por Pestañas (Tabs) */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '2px solid var(--color-border)', paddingBottom: '4px' }}>
        <button
          style={{
            padding: '10px 20px', fontWeight: 600, borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
            background: activeTab === 'admin' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'admin' ? '#fff' : 'var(--color-text-secondary)', transition: 'all 0.2s'
          }}
          onClick={() => setActiveTab('admin')}
        >
          🛡️ Administradores ({administradores.length})
        </button>
        <button
          style={{
            padding: '10px 20px', fontWeight: 600, borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
            background: activeTab === 'empleados' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'empleados' ? '#fff' : 'var(--color-text-secondary)', transition: 'all 0.2s'
          }}
          onClick={() => setActiveTab('empleados')}
        >
          🧑‍🍳 Empleados ({empleados.length})
        </button>
        <button
          style={{
            padding: '10px 20px', fontWeight: 600, borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
            background: activeTab === 'clientes' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'clientes' ? '#fff' : 'var(--color-text-secondary)', transition: 'all 0.2s'
          }}
          onClick={() => setActiveTab('clientes')}
        >
          👤 Clientes ({clientes.length})
        </button>
        <button
          style={{
            padding: '10px 20px', fontWeight: 600, borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
            background: activeTab === 'roles' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'roles' ? '#fff' : 'var(--color-text-secondary)', transition: 'all 0.2s'
          }}
          onClick={() => setActiveTab('roles')}
        >
          🔒 Permisos de Roles
        </button>
      </div>

      {/* Tab: Administradores */}
      {activeTab === 'admin' && (
        <div className="table-container">
          <table>
            <thead>
              <tr><th>ID</th><th>Nombre</th><th>Email</th><th>Rol</th></tr>
            </thead>
            <tbody>
              {administradores.map((usr) => (
                <tr key={usr.id_usuario}>
                  <td style={{ color: 'var(--color-text-muted)' }}>#{usr.id_usuario}</td>
                  <td style={{ fontWeight: 600 }}>{usr.nombre}</td>
                  <td>{usr.email}</td>
                  <td><span className="badge badge-primary">Admin</span></td>
                </tr>
              ))}
              {administradores.length === 0 && <tr><td colSpan="4" style={{ textAlign: 'center', padding: '30px' }}>No hay administradores registrados</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Empleados */}
      {activeTab === 'empleados' && (
        <div className="table-container">
          <table>
            <thead>
              <tr><th>ID</th><th>Nombre</th><th>Email</th><th>Rol</th><th style={{ textAlign: 'center' }}>Acciones</th></tr>
            </thead>
            <tbody>
              {empleados.map((usr) => (
                <tr key={usr.id_usuario}>
                  <td style={{ color: 'var(--color-text-muted)' }}>#{usr.id_usuario}</td>
                  <td style={{ fontWeight: 600 }}>{usr.nombre}</td>
                  <td>{usr.email}</td>
                  <td><span className="badge badge-info">{usr.rol?.nombre || 'Operativo'}</span></td>
                  <td style={{ textAlign: 'center' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => openEditUsuario(usr)} style={{ marginRight: '8px' }}>✏️</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDeleteUsuario(usr.id_usuario)}>🗑️</button>
                  </td>
                </tr>
              ))}
              {empleados.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', padding: '30px' }}>No hay empleados registrados</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Clientes */}
      {activeTab === 'clientes' && (
        <div className="table-container">
          <table>
            <thead>
              <tr><th>ID</th><th>Nombre / Razón Social</th><th>Identificación</th><th>Teléfono</th><th style={{ textAlign: 'center' }}>Acciones</th></tr>
            </thead>
            <tbody>
              {clientes.map((cli) => (
                <tr key={cli.id_cliente}>
                  <td style={{ color: 'var(--color-text-muted)' }}>#{cli.id_cliente}</td>
                  <td style={{ fontWeight: 600 }}>{cli.nombre}</td>
                  <td>{cli.identificacion}</td>
                  <td>{cli.telefono || 'Sin teléfono'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => openEditCliente(cli)} style={{ marginRight: '8px' }}>✏️</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDeleteCliente(cli.id_cliente)}>🗑️</button>
                  </td>
                </tr>
              ))}
              {clientes.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', padding: '30px' }}>No hay clientes registrados en el sistema</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Permisos de Roles */}
      {activeTab === 'roles' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {roles.filter(rol => rol.nombre !== 'Cliente').map(rol => {
            const isAdminRole = rol.id_rol === 1 || rol.nombre === 'Admin';
            return (
              <div key={rol.id_rol} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
                <h2 style={{ margin: '0 0 16px 0', borderBottom: '2px solid var(--color-border)', paddingBottom: '10px' }}>Rol: {rol.nombre}</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {allFunciones.map(func => {
                    const hasCurrent = rol.funciones.some(f => f.id_funcion === func.id_funcion);
                    const isChecked = isAdminRole ? true : hasCurrent;
                    
                    return (
                      <div key={func.id_funcion} style={{
                        display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px',
                        border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
                        background: isChecked ? 'rgba(6, 214, 160, 0.05)' : 'transparent',
                        transition: 'all 0.2s', cursor: isAdminRole ? 'not-allowed' : 'pointer',
                        opacity: isAdminRole ? 0.7 : 1
                      }} onClick={() => { if (!isAdminRole) toggleRolePermission(rol.id_rol, func.id_funcion, hasCurrent); }}>
                        <div style={{ marginTop: '2px' }}>
                          <input type="checkbox" checked={isChecked} readOnly disabled={isAdminRole} style={{ width: '16px', height: '16px', cursor: isAdminRole ? 'not-allowed' : 'pointer' }} />
                        </div>
                        <div>
                          <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', color: isChecked ? 'var(--color-primary)' : 'var(--color-text)' }}>
                            {func.nombre === 'eliminar_plato' ? 'gestionar_plato' : func.nombre}
                          </h4>
                          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{func.descripcion}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal CRUD Unificado */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modalTitle}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            {error && (
              <div style={{ background: 'rgba(239,71,111,0.1)', border: '1px solid rgba(239,71,111,0.3)', borderRadius: 'var(--radius-md)', padding: '12px', color: 'var(--color-danger)', marginBottom: '16px', fontSize: '0.9rem' }}>
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Formulario de Usuarios (Empleados) */}
              {activeTab === 'empleados' && (
                <>
                  <div className="form-group">
                    <label>Nombre Completo</label>
                    <input type="text" className="form-control" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" className="form-control" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  {!editingItem && (
                    <div className="form-group">
                      <label>Contraseña</label>
                      <input type="password" className="form-control" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                    </div>
                  )}
                </>
              )}

              {/* Formulario de Clientes */}
              {activeTab === 'clientes' && (
                <>
                  <div className="form-group">
                    <label>Nombre Completo / Razón Social</label>
                    <input type="text" className="form-control" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
                  </div>
                  {!editingItem && (
                    <div className="form-group">
                      <label>Identificación (Cédula/RUC)</label>
                      <input type="text" className="form-control" required value={form.identificacion} onChange={(e) => setForm({ ...form, identificacion: e.target.value })} />
                    </div>
                  )}
                  {editingItem && (
                    <div className="form-group">
                      <label>Identificación (No editable)</label>
                      <input type="text" className="form-control" readOnly value={form.identificacion} style={{ opacity: 0.7 }} />
                    </div>
                  )}
                  <div className="form-group">
                    <label>Teléfono (Opcional)</label>
                    <input type="text" className="form-control" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
                  </div>
                </>
              )}

              <div className="modal-actions" style={{ marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">{editingItem ? 'Guardar Cambios' : 'Crear'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
