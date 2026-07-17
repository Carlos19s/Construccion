'use client';

import { useState, useEffect } from 'react';
import { graphqlRequest } from '@/lib/graphql-client';
import { useAuth } from '@/lib/auth';

export default function MesasAdminPage() {
  const { token } = useAuth();
  const [mesas, setMesas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMesa, setEditingMesa] = useState(null);
  const [form, setForm] = useState({ numero_mesa: '', capacidad: '', estado: 'Disponible' });
  const [error, setError] = useState('');

  useEffect(() => { fetchMesas(); }, []);

  const fetchMesas = async () => {
    try {
      const data = await graphqlRequest(`
        query { mesas { id_mesa numero_mesa capacidad estado } }
      `, {}, token);
      setMesas(data.mesas);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditingMesa(null);
    setForm({ numero_mesa: '', capacidad: '', estado: 'Disponible' });
    setError('');
    setShowModal(true);
  };

  const openEdit = (mesa) => {
    setEditingMesa(mesa);
    setForm({ numero_mesa: mesa.numero_mesa, capacidad: mesa.capacidad, estado: mesa.estado });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (editingMesa) {
        await graphqlRequest(`
          mutation UpdateMesa($input: MesaUpdateInput!) {
            updateMesa(input: $input) { id_mesa }
          }
        `, {
          input: {
            id_mesa: editingMesa.id_mesa,
            numero_mesa: parseInt(form.numero_mesa),
            capacidad: parseInt(form.capacidad),
            estado: form.estado,
          }
        }, token);
      } else {
        await graphqlRequest(`
          mutation CreateMesa($input: MesaInput!) {
            createMesa(input: $input) { id_mesa }
          }
        `, {
          input: {
            numero_mesa: parseInt(form.numero_mesa),
            capacidad: parseInt(form.capacidad),
          }
        }, token);
      }

      setShowModal(false);
      fetchMesas();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de eliminar esta mesa?')) return;
    try {
      await graphqlRequest(`
        mutation { deleteMesa(id_mesa: ${id}) }
      `, {}, token);
      fetchMesas();
    } catch (err) {
      alert(err.message);
    }
  };

  const getEstadoBadge = (estado) => {
    const map = {
      'Disponible': 'badge-success',
      'Ocupada': 'badge-danger',
      'Mantenimiento': 'badge-warning',
    };
    return map[estado] || 'badge-info';
  };

  if (loading) {
    return <div className="loading-container"><div className="spinner" /><span>Cargando mesas...</span></div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 800,
            color: 'var(--color-text)',
          }}>
            🪑 Gestión de Mesas
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Administra la distribución física del restaurante
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Nueva Mesa</button>
      </div>

      {/* Grid de mesas */}
      <div className="grid-4">
        {mesas.map((mesa) => (
          <div
            key={mesa.id_mesa}
            className={`mesa-card ${mesa.estado.toLowerCase()}`}
          >
            <div className="mesa-number">#{mesa.numero_mesa}</div>
            <div className="mesa-capacity">👥 {mesa.capacidad} personas</div>
            <span className={`badge ${getEstadoBadge(mesa.estado)}`} style={{ marginBottom: '16px' }}>
              {mesa.estado}
            </span>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '12px' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => openEdit(mesa)}>✏️ Editar</button>
              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(mesa.id_mesa)}>🗑️</button>
            </div>
          </div>
        ))}
      </div>

      {mesas.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🪑</div>
          <h3>No hay mesas registradas</h3>
          <p>Crea una nueva mesa para comenzar</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingMesa ? 'Editar Mesa' : 'Nueva Mesa'}</h2>
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
                <label>Número de Mesa</label>
                <input type="number" className="form-control" min="1"
                  value={form.numero_mesa}
                  onChange={(e) => setForm({ ...form, numero_mesa: e.target.value })}
                  required />
              </div>
              <div className="form-group">
                <label>Capacidad (personas)</label>
                <input type="number" className="form-control" min="1"
                  value={form.capacidad}
                  onChange={(e) => setForm({ ...form, capacidad: e.target.value })}
                  required />
              </div>
              {editingMesa && (
                <div className="form-group">
                  <label>Estado</label>
                  <select className="form-control" value={form.estado}
                    onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                    <option value="Disponible">Disponible</option>
                    <option value="Ocupada">Ocupada</option>
                    <option value="Mantenimiento">Mantenimiento</option>
                  </select>
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">
                  {editingMesa ? 'Guardar Cambios' : 'Crear Mesa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
