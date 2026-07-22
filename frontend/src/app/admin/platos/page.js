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
      window.location.href = '/admin/ordenes'; 
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

    const parsedPrecio = parseFloat(form.precio);
    if (isNaN(parsedPrecio) || parsedPrecio <= 0) {
      setError('El precio debe ser un valor decimal mayor a 0.');
      return;
    }

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
            precio: parsedPrecio,
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
            precio: parsedPrecio,
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
    return <div className="loading-container"><div className="spinner" /><span>Cargando menú...</span></div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-heading)', fontSize: '2.5rem', fontWeight: 800,
            color: 'var(--color-text)',
          }}>
            🍽️ Gestión de Platos
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px', fontSize: '1.1rem' }}>
            Mantén actualizado el menú de tu restaurante
          </p>
        </div>
        <button className="btn btn-primary" style={{ padding: '12px 28px', fontSize: '1rem', borderRadius: 'var(--radius-full)' }} onClick={openCreate}>
          + Nuevo Plato
        </button>
      </div>

      <div className="toolbar" style={{ marginBottom: '32px' }}>
        <div className="toolbar-search" style={{ position: 'relative', maxWidth: '400px' }}>
          <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
          <input type="text" className="form-control" placeholder="Buscar platos por nombre..." value={search}
            onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: '48px', borderRadius: 'var(--radius-full)' }} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state" style={{ background: 'var(--color-bg-card)', borderRadius: 'var(--radius-xl)', border: '1px dashed var(--color-border)' }}>
          <div className="empty-icon" style={{ fontSize: '4rem', opacity: 0.6 }}>🍽️</div>
          <h3 style={{ marginTop: '16px', fontSize: '1.5rem' }}>No se encontraron platos</h3>
          <p style={{ color: 'var(--color-text-muted)' }}>Agrega un nuevo plato al menú para empezar.</p>
        </div>
      ) : (
        <div className="grid-3">
          {filtered.map((plato) => {
            const isAgotado = plato.estado === 'Agotado';
            return (
              <div key={plato.id_plato} className="plato-card" style={{ opacity: isAgotado ? 0.7 : 1, filter: isAgotado ? 'grayscale(30%)' : 'none' }}>
                <div style={{
                  height: '180px', 
                  background: plato.imagen_url ? `url(${plato.imagen_url}) center/cover` : 'linear-gradient(135deg, rgba(37,99,235,0.2), rgba(0,0,0,0.8))',
                  position: 'relative'
                }}>
                  <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '8px' }}>
                    <span className={`badge ${isAgotado ? 'badge-danger' : 'badge-success'}`} style={{ backdropFilter: 'blur(8px)', background: isAgotado ? 'rgba(220, 38, 38, 0.8)' : 'rgba(5, 150, 105, 0.8)', color: '#fff' }}>
                      {plato.estado}
                    </span>
                  </div>
                </div>
                <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>{plato.nombre}</h3>
                    <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-primary-light)' }}>
                      ${plato.precio.toFixed(2)}
                    </span>
                  </div>
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '16px', flex: 1 }}>
                    {plato.descripcion || 'Sin descripción'}
                  </p>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                      📦 Stock: <strong style={{ color: 'var(--color-text)' }}>{plato.stock}</strong>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-secondary btn-sm" style={{ padding: '6px 12px', borderRadius: 'var(--radius-full)' }} onClick={() => openEdit(plato)}>✏️ Editar</button>
                      <button className="btn btn-danger btn-sm" style={{ padding: '6px', borderRadius: 'var(--radius-full)', minWidth: '32px' }} onClick={() => handleDelete(plato.id_plato)}>🗑️</button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '40px' }}>
            <div className="modal-header" style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>{editingPlato ? '✏️ Editar Plato' : '✨ Nuevo Plato'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            {error && (
              <div style={{
                background: 'rgba(239,71,111,0.1)', border: '1px solid rgba(239,71,111,0.3)',
                borderRadius: 'var(--radius-md)', padding: '16px', color: 'var(--color-danger)',
                marginBottom: '24px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px'
              }}>
                <span style={{ fontSize: '1.2rem' }}>⚠️</span> {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nombre del Plato</label>
                <input type="text" className="form-control" placeholder="Ej: Lomo Saltado Premium"
                  value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <textarea className="form-control" rows="3" placeholder="Detalles de los ingredientes..."
                  value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  style={{ resize: 'vertical' }} />
              </div>
              <div className="form-group">
                <label>URL de la Imagen (Opcional)</label>
                <input type="url" className="form-control" placeholder="https://ejemplo.com/foto.jpg"
                  value={form.imagen_url} onChange={(e) => setForm({ ...form, imagen_url: e.target.value })} />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group">
                  <label>Precio ($)</label>
                  <input type="number" step="0.01" min="0.01" className="form-control" placeholder="0.00"
                    value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} required 
                    style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--color-primary-light)' }} />
                </div>
                <div className="form-group">
                  <label>Stock Inicial</label>
                  <input type="number" min="0" className="form-control" placeholder="0"
                    value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required 
                    style={{ fontSize: '1.2rem', fontWeight: 600 }} />
                </div>
              </div>
              
              {editingPlato && (
                <div className="form-group" style={{ marginTop: '8px' }}>
                  <label>Estado del Plato</label>
                  <select className="form-control" value={form.estado}
                    onChange={(e) => setForm({ ...form, estado: e.target.value })}
                    style={{ fontSize: '1.1rem', fontWeight: 600, color: form.estado === 'Activo' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                    <option value="Activo">🟢 Disponible para clientes</option>
                    <option value="Agotado">🔴 Agotado temporalmente</option>
                  </select>
                </div>
              )}
              
              <div className="modal-actions" style={{ marginTop: '40px', gap: '16px' }}>
                <button type="button" className="btn btn-secondary" style={{ padding: '12px 24px', borderRadius: 'var(--radius-full)' }} onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '12px 32px', borderRadius: 'var(--radius-full)' }}>
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
