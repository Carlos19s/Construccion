'use client';

import { useState, useEffect } from 'react';
import { graphqlRequest } from '@/lib/graphql-client';
import { useAuth } from '@/lib/auth';

export default function SeguimientoPage() {
  const { token } = useAuth();
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchOrdenes(); }, []);

  const fetchOrdenes = async () => {
    try {
      const data = await graphqlRequest(`
        query {
          ordenesActivas {
            id_orden
            id_mesa
            id_cliente
            fecha_hora
            total
            estado
            mesa { numero_mesa }
            cliente { nombre }
            usuario { nombre }
            detalles {
              id_detalle
              cantidad
              precio_unitario
              subtotal
              plato { nombre }
            }
          }
        }
      `, {}, token);
      setOrdenes(data.ordenesActivas);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const avanzarEstado = async (id_orden, estadoActual) => {
    const nuevoEstado = estadoActual === 'Pendiente' ? 'En Preparacion' : 
                        estadoActual === 'En Preparacion' ? 'Pagada' : null;

    if (!nuevoEstado) return;

    try {
      await graphqlRequest(`
        mutation ActualizarEstado($id_orden: Int!, $estado: String!) {
          actualizarEstadoOrden(id_orden: $id_orden, estado: $estado) { id_orden estado }
        }
      `, { id_orden, estado: nuevoEstado }, token);
      fetchOrdenes();
    } catch (err) {
      alert(err.message);
    }
  };

  const cancelar = async (id_orden) => {
    if (!confirm('¿Cancelar esta orden? El stock será restaurado.')) return;
    try {
      await graphqlRequest(`
        mutation { cancelarOrden(id_orden: ${id_orden}) { id_orden } }
      `, {}, token);
      fetchOrdenes();
    } catch (err) { alert(err.message); }
  };

  const getEstadoBadge = (estado) => {
    const map = {
      'Pendiente': 'badge-warning',
      'En Preparacion': 'badge-info',
      'Servida': 'badge-primary',
      'Pagada': 'badge-success',
    };
    return map[estado] || 'badge-info';
  };

  const getNextLabel = (estado) => {
    const map = {
      'Pendiente': '🧑‍🍳 En Preparación',
      'En Preparacion': '✅ Pedido Entregado',
    };
    return map[estado] || null;
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    // GraphQL might return dateStr as a Unix timestamp string (e.g. "1710935567000")
    const isNumeric = !isNaN(dateStr) && !isNaN(parseFloat(dateStr));
    const d = new Date(isNumeric ? parseInt(dateStr) : dateStr);
    if (isNaN(d.getTime())) return 'Fecha inválida';
    return d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return <div className="loading-container"><div className="spinner" /><span>Cargando órdenes...</span></div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 800,
            color: 'var(--color-text)',
          }}>
            📋 Seguimiento de Órdenes
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Órdenes activas — {ordenes.length} pendientes
          </p>
        </div>
        <button className="btn btn-secondary" onClick={fetchOrdenes}>🔄 Actualizar</button>
      </div>

      {ordenes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">✅</div>
          <h3>No hay órdenes activas</h3>
          <p>Todas las órdenes han sido completadas</p>
        </div>
      ) : (
        <div className="grid-2">
          {ordenes.map((orden, index) => (
            <div key={orden.id_orden} className="order-card" style={{ animationDelay: `${index * 0.08}s` }}>
              <div className="order-header">
                <div>
                  <span className="order-id">Orden #{orden.id_orden}</span>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginLeft: '12px' }}>
                    🕐 {formatTime(orden.fecha_hora)}
                  </span>
                </div>
                <span className={`badge ${getEstadoBadge(orden.estado)}`}>{orden.estado}</span>
              </div>

              <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                {orden.mesa && <span>🪑 Mesa #{orden.mesa.numero_mesa}</span>}
                {!orden.id_mesa && <span>📦 Para llevar</span>}
                {orden.cliente && <span>👤 {orden.cliente.nombre}</span>}
                {orden.usuario && <span>🧑‍💼 {orden.usuario.nombre}</span>}
              </div>

              <ul className="order-details-list">
                {orden.detalles?.map(det => (
                  <li key={det.id_detalle}>
                    <span>{det.cantidad}x {det.plato?.nombre}</span>
                    <span style={{ fontWeight: 600 }}>${det.subtotal.toFixed(2)}</span>
                  </li>
                ))}
              </ul>

              <div className="order-total">
                <span>Total</span>
                <span style={{ color: 'var(--color-primary)' }}>${orden.total.toFixed(2)}</span>
              </div>

              <div className="order-actions">
                {getNextLabel(orden.estado) && (
                  <button className="btn btn-success btn-sm" style={{ flex: 1 }}
                    onClick={() => avanzarEstado(orden.id_orden, orden.estado)}>
                    {getNextLabel(orden.estado)}
                  </button>
                )}
                <button className="btn btn-danger btn-sm"
                  onClick={() => cancelar(orden.id_orden)}>
                  ❌ Cancelar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
