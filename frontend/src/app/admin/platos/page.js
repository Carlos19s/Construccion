'use client';

import { useState, useEffect } from 'react';
import { graphqlRequest } from '@/lib/graphql-client';
import { useAuth } from '@/lib/auth';

export default function PlatosAdminPage() {
  const { token, isAdmin, loading: authLoading } = useAuth();
  const [platos, setPlatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlato, setEditingPlato] = useState(null);
  const [form, setForm] = useState({ nombre: '', descripcion: '', precio: '', stock: '', estado: 'Activo', imagen_url: '' });
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => { 
    if (!authLoading && !isAdmin()) {
      window.location.href = '/admin/ordenes'; // Redirect operativo
      return;
    }
    if (isAdmin()) {
      fetchPlatos(); 
    }
  }, [authLoading, isAdmin]);

  const fetchPlatos = async () => {
    try {
      const data = await graphqlRequest(`
        query { platos { id_plato nombre descripcion precio stock estado imagen_url } }
      `, {}, token);
      setPlatos(data.platos);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditingPlato(null);
    setForm({ nombre: '', descripcion: '', precio: '', stock: '', estado: 'Activo', imagen_url: '' });
    setError('');
    setShowModal(true);
  };

  const openEdit = (plato) => {
    setEditingPlato(plato);
    setForm({
      nombre: plato.nombre,
      descripcion: plato.descripcion || '',
      precio: plato.precio,
      stock: plato.stock,
      estado: plato.estado,
      imagen_url: plato.imagen_url || ''
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (editingPlato) {
        await graphqlRequest(`
          mutation UpdatePlato($input: PlatoUpdateInput!) {
            updatePlato(input: $input) { id_plato }
          }
        `, {
          input: {
            id_plato: editingPlato.id_plato,
            nombre: form.nombre,
            descripcion: form.descripcion || null,
            precio: parseFloat(form.precio),
            stock: parseInt(form.stock),
            estado: form.estado,
            imagen_url: form.imagen_url || null
          }
        }, token);
      } else {
        await graphqlRequest(`
          mutation CreatePlato($input: PlatoInput!) {
            createPlato(input: $input) { id_plato }
          }
        `, {
          input: {
            nombre: form.nombre,
            descripcion: form.descripcion || null,
            precio: parseFloat(form.precio),
            stock: parseInt(form.stock),
            imagen_url: form.imagen_url || null
          }
        }, token);
      }

      setShowModal(false);
      fetchPlatos();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este plato?')) return;
    try {
      await graphqlRequest(`mutation { deletePlato(id_plato: ${id}) }`, {}, token);
      fetchPlatos();
    } catch (err) { alert(err.message); }
  };

  const filtered = platos.filter(p => p.nombre.toLowerCase().includes(search.toLowerCase()));

  if (loading) {
    return <div className="loading-container"><div className="spinner" /><span>Cargando platos...</span></div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 800,
            color: 'var(--color-text)',
          }}>
            🍽️ Gestión de Platos
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Administra el menú del restaurante
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Nuevo Plato</button>
      </div>

      <div className="toolbar" style={{ marginBottom: '24px' }}>
        <div className="toolbar-search">
          <span className="search-icon">🔍</span>
          <input type="text" placeholder="Buscar platos..." value={search}
            onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Tabla de platos */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Descripción</th>
              <th>Precio</th>
              <th>Stock</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((plato) => (
              <tr key={plato.id_plato}>
                <td style={{ color: 'var(--color-text-muted)' }}>#{plato.id_plato}</td>
                <td style={{ fontWeight: 600 }}>{plato.nombre}</td>
                <td style={{ color: 'var(--color-text-secondary)', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {plato.descripcion || '—'}
                </td>
                <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>${plato.precio.toFixed(2)}</td>
                <td>{plato.stock}</td>
                <td>
                  <span className={`badge ${plato.estado === 'Activo' ? 'badge-success' : 'badge-danger'}`}>
                    {plato.estado}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(plato)}>✏️</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(plato.id_plato)}>🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🍽️</div>
          <h3>No hay platos registrados</h3>
          <p>Crea un nuevo plato para comenzar</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingPlato ? 'Editar Plato' : 'Nuevo Plato'}</h2>
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
                <label>Nombre</label>
                <input type="text" className="form-control" placeholder="Ej: Lomo Saltado"
                  value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <textarea className="form-control" rows="3" placeholder="Descripción del plato..."
                  value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  style={{ resize: 'vertical' }} />
              </div>
              <div className="form-group">
                <label>URL de la Imagen (Opcional)</label>
                <input type="url" className="form-control" placeholder="https://ejemplo.com/foto.jpg"
                  value={form.imagen_url} onChange={(e) => setForm({ ...form, imagen_url: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>Precio ($)</label>
                  <input type="number" step="0.01" min="0.01" className="form-control"
                    value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Stock</label>
                  <input type="number" min="0" className="form-control"
                    value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required />
                </div>
              </div>
              {editingPlato && (
                <div className="form-group">
                  <label>Estado</label>
                  <select className="form-control" value={form.estado}
                    onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                    <option value="Activo">Activo</option>
                    <option value="Agotado">Agotado</option>
                  </select>
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">
                  {editingPlato ? 'Guardar Cambios' : 'Crear Plato'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
