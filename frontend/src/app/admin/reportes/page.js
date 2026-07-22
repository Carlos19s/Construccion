'use client';

import { useState, useEffect } from 'react';
import { graphqlRequest } from '@/lib/graphql-client';
import { useAuth } from '@/lib/auth';

export default function ReportesPage() {
  const { token } = useAuth();
  const getLocalDate = () => {
    const tzOffset = new Date().getTimezoneOffset() * 60000;
    return new Date(Date.now() - tzOffset).toISOString().split('T')[0];
  };
  const [fecha, setFecha] = useState(getLocalDate());
  const [reporte, setReporte] = useState(null);
  const [topPlatos, setTopPlatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => { fetchReporte(); }, [fecha]);

  const fetchReporte = async () => {
    setLoading(true);
    try {
      const data = await graphqlRequest(`
        query ReporteDia($fecha: String!) {
          reporteVentasDia(fecha: $fecha) {
            fecha
            total_ventas
            total_ordenes
            ordenes {
              id_orden
              total
              estado
              fecha_hora
              mesa { numero_mesa }
              cliente { nombre identificacion telefono }
              usuario { nombre email }
              detalles {
                id_detalle
                cantidad
                precio_unitario
                subtotal
                plato { nombre }
              }
            }
          }
          topPlatosVendidos(limit: 5) {
            id_plato
            nombre
            total_vendido
            total_ingresos
          }
        }
      `, { fecha }, token);
      setReporte(data.reporteVentasDia);
      setTopPlatos(data.topPlatosVendidos);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const formatTime = (dateVal) => {
    if (!dateVal) return '--:--';
    let d;
    if (typeof dateVal === 'number') {
      d = new Date(dateVal);
    } else if (!isNaN(dateVal) && !isNaN(parseFloat(dateVal))) {
      d = new Date(parseInt(dateVal, 10));
    } else {
      let cleaned = String(dateVal).trim();
      if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}/.test(cleaned)) {
        cleaned = cleaned.replace(' ', 'T');
      }
      d = new Date(cleaned);
    }
    if (isNaN(d.getTime())) return '--:--';
    return d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
  };

  // Simple bar chart component using CSS
  const maxVendido = topPlatos.length > 0 ? Math.max(...topPlatos.map(p => p.total_vendido)) : 1;

  // Agrupar ventas por empleado para el día seleccionado
  const ventasPorEmpleadoMap = {};
  reporte?.ordenes?.forEach(orden => {
    if (orden.estado === 'Cancelada') return; // Ignorar órdenes canceladas en las ventas
    const nombreEmpleado = orden.usuario?.nombre || 'No asignado';
    if (!ventasPorEmpleadoMap[nombreEmpleado]) {
      ventasPorEmpleadoMap[nombreEmpleado] = {
        nombre: nombreEmpleado,
        total_ventas: 0,
        total_ordenes: 0,
      };
    }
    ventasPorEmpleadoMap[nombreEmpleado].total_ventas += orden.total;
    ventasPorEmpleadoMap[nombreEmpleado].total_ordenes += 1;
  });

  const ventasPorEmpleado = Object.values(ventasPorEmpleadoMap).sort((a, b) => b.total_ventas - a.total_ventas);
  const maxVentasEmpleado = ventasPorEmpleado.length > 0 ? Math.max(...ventasPorEmpleado.map(e => e.total_ventas)) : 1;

  if (loading) {
    return <div className="loading-container"><div className="spinner" /><span>Cargando reportes...</span></div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 800,
            color: 'var(--color-text)',
          }}>
            📊 Dashboard de Reportes
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Visualiza las ventas y rendimiento del restaurante
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>Fecha:</label>
          <input type="date" className="form-control" style={{ width: 'auto' }}
            value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid-3" style={{ marginBottom: '32px' }}>
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-value">${reporte?.total_ventas?.toFixed(2) || '0.00'}</div>
          <div className="stat-label">Ventas Totales del Día</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-value">{reporte?.total_ordenes || 0}</div>
          <div className="stat-label">Órdenes Pagadas</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-value">
            ${reporte?.total_ordenes > 0
              ? (reporte.total_ventas / reporte.total_ordenes).toFixed(2)
              : '0.00'}
          </div>
          <div className="stat-label">Ticket Promedio</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
        {/* Top 5 Platos - Gráfico de Barras CSS */}
        <div className="chart-container">
          <h3>🏆 Top 5 Platos Más Vendidos</h3>
          {topPlatos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)' }}>
              No hay datos disponibles
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {topPlatos.map((plato, index) => (
                <div key={plato.id_plato}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`} {plato.nombre}
                    </span>
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
                      {plato.total_vendido} vendidos
                    </span>
                  </div>
                  <div style={{
                    width: '100%', height: '28px', background: 'var(--color-surface)',
                    borderRadius: 'var(--radius-sm)', overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${(plato.total_vendido / maxVendido) * 100}%`,
                      height: '100%',
                      background: 'var(--color-primary)',
                      borderRadius: 'var(--radius-sm)',
                      transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                      paddingRight: '8px',
                    }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'white' }}>
                        ${plato.total_ingresos.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Distribución visual de ventas */}
        <div className="chart-container">
          <h3>💰 Resumen de Ventas</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingTop: '10px' }}>
            {topPlatos.map((plato, index) => {
              const totalIngresos = topPlatos.reduce((s, p) => s + p.total_ingresos, 0) || 1;
              const pct = ((plato.total_ingresos / totalIngresos) * 100).toFixed(1);
              const colors = ['#FF6B35', '#D62828', '#FCBF49', '#06D6A0', '#118AB2'];
              return (
                <div key={plato.id_plato} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '12px', height: '12px', borderRadius: '50%',
                    background: colors[index % colors.length], flexShrink: 0,
                  }} />
                  <span style={{ flex: 1, fontSize: '0.9rem' }}>{plato.nombre}</span>
                  <span style={{ fontWeight: 700, color: colors[index % colors.length] }}>{pct}%</span>
                </div>
              );
            })}
            {topPlatos.length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)' }}>
                No hay datos disponibles
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sección de Ventas por Empleado con gráfica */}
      <div className="chart-container" style={{ marginBottom: '32px' }}>
        <h3>🧑‍💼 Ventas por Empleado (Meseros / Personal)</h3>
        {ventasPorEmpleado.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)' }}>
            No hay ventas registradas por empleados para esta fecha
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
            {ventasPorEmpleado.map((emp) => {
              const porcentaje = ((emp.total_ventas / maxVentasEmpleado) * 100).toFixed(1);
              return (
                <div key={emp.nombre}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.9rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                      👤 {emp.nombre}
                      <span style={{ fontWeight: 400, color: 'var(--color-text-secondary)', marginLeft: '8px', fontSize: '0.85rem' }}>
                        ({emp.total_ordenes} {emp.total_ordenes === 1 ? 'orden' : 'órdenes'})
                      </span>
                    </span>
                    <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                      ${emp.total_ventas.toFixed(2)}
                    </span>
                  </div>
                  <div style={{
                    width: '100%', height: '28px', background: 'var(--color-surface)',
                    borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--color-border)',
                  }}>
                    <div style={{
                      width: `${porcentaje}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #118AB2 0%, #06D6A0 100%)',
                      borderRadius: 'var(--radius-sm)',
                      transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                      paddingRight: '8px',
                    }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'white' }}>
                        ${emp.total_ventas.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tabla de órdenes del día */}
      <div className="chart-container">
        <h3>📋 Órdenes Pagadas y Canceladas del Día</h3>
        {reporte?.ordenes?.length > 0 ? (
          <div className="table-container" style={{ marginTop: '16px' }}>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Hora</th>
                  <th>Mesa</th>
                  <th>Cliente</th>
                  <th>Atendido Por</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'center' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {reporte.ordenes.map(orden => (
                  <tr key={orden.id_orden}>
                    <td style={{ fontWeight: 600 }}>#{orden.id_orden}</td>
                    <td>{formatTime(orden.fecha_hora)}</td>
                    <td>{orden.mesa ? `#${orden.mesa.numero_mesa}` : 'Para llevar'}</td>
                    <td>{orden.cliente?.nombre || 'Consumidor Final'}</td>
                    <td>{orden.usuario?.nombre || 'No asignado'}</td>
                    <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>${orden.total.toFixed(2)}</td>
                    <td><span className={`badge ${orden.estado === 'Cancelada' ? 'badge-danger' : 'badge-success'}`}>{orden.estado}</span></td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setSelectedOrder(orden)}
                      >
                        👁️ Ver Detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
            No hay órdenes registradas para esta fecha
          </div>
        )}
      </div>

      {/* Modal de Detalle de Orden */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📋 Detalle de Orden #{selectedOrder.id_orden}</h2>
              <button className="modal-close" onClick={() => setSelectedOrder(null)}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px', fontSize: '0.9rem' }}>
              <div>
                <span style={{ color: 'var(--color-text-secondary)' }}>🧑‍💼 Atendido por:</span>
                <strong style={{ display: 'block', color: 'var(--color-text)' }}>{selectedOrder.usuario?.nombre || 'No asignado'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-secondary)' }}>👤 Cliente:</span>
                <strong style={{ display: 'block', color: 'var(--color-text)' }}>
                  {selectedOrder.cliente ? `${selectedOrder.cliente.nombre} (${selectedOrder.cliente.identificacion || ''})` : 'Consumidor Final'}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-secondary)' }}>🪑 Ubicación:</span>
                <strong style={{ display: 'block', color: 'var(--color-text)' }}>
                  {selectedOrder.mesa ? `Mesa #${selectedOrder.mesa.numero_mesa}` : 'Para llevar'}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-secondary)' }}>🕐 Hora:</span>
                <strong style={{ display: 'block', color: 'var(--color-text)' }}>{formatTime(selectedOrder.fecha_hora)}</strong>
              </div>
            </div>

            <h4 style={{ marginBottom: '12px', fontSize: '1rem', color: 'var(--color-text)' }}>🍽️ Platos Solicitados</h4>
            <div className="table-container" style={{ marginBottom: '20px' }}>
              <table>
                <thead>
                  <tr>
                    <th>Plato</th>
                    <th style={{ textAlign: 'center' }}>Cantidad</th>
                    <th style={{ textAlign: 'right' }}>P. Unitario</th>
                    <th style={{ textAlign: 'right' }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.detalles?.map((det) => (
                    <tr key={det.id_detalle}>
                      <td>{det.plato?.nombre || 'Plato'}</td>
                      <td style={{ textAlign: 'center' }}>{det.cantidad}</td>
                      <td style={{ textAlign: 'right' }}>${det.precio_unitario.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>${det.subtotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              paddingTop: '16px', borderTop: '2px solid var(--color-border)', fontWeight: 700, fontSize: '1.2rem'
            }}>
              <span>Total Pagado:</span>
              <span style={{ color: 'var(--color-primary)' }}>${selectedOrder.total.toFixed(2)}</span>
            </div>

            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedOrder(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
