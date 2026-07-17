'use client';

import { useState, useEffect } from 'react';
import { graphqlRequest } from '@/lib/graphql-client';
import { useAuth } from '@/lib/auth';

export default function ReportesPage() {
  const { token } = useAuth();
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [reporte, setReporte] = useState(null);
  const [topPlatos, setTopPlatos] = useState([]);
  const [loading, setLoading] = useState(true);

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
              cliente { nombre }
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

  // Simple bar chart component using CSS
  const maxVendido = topPlatos.length > 0 ? Math.max(...topPlatos.map(p => p.total_vendido)) : 1;

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

      {/* Tabla de órdenes del día */}
      <div className="chart-container">
        <h3>📋 Órdenes Pagadas del Día</h3>
        {reporte?.ordenes?.length > 0 ? (
          <div className="table-container" style={{ marginTop: '16px' }}>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Hora</th>
                  <th>Mesa</th>
                  <th>Cliente</th>
                  <th>Total</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {reporte.ordenes.map(orden => (
                  <tr key={orden.id_orden}>
                    <td style={{ fontWeight: 600 }}>#{orden.id_orden}</td>
                    <td>{new Date(orden.fecha_hora).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td>{orden.mesa ? `#${orden.mesa.numero_mesa}` : 'Para llevar'}</td>
                    <td>{orden.cliente?.nombre || 'Consumidor Final'}</td>
                    <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>${orden.total.toFixed(2)}</td>
                    <td><span className="badge badge-success">{orden.estado}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
            No hay órdenes pagadas para esta fecha
          </div>
        )}
      </div>
    </div>
  );
}
