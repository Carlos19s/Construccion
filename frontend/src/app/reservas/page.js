'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { graphqlRequest } from '@/lib/graphql-client';
import { useAuth } from '@/lib/auth';

export default function ReservasPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [mesas, setMesas] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMesa, setSelectedMesa] = useState(null);
  const [form, setForm] = useState({ fecha_reserva: '', hora_reserva: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const data = await graphqlRequest(`
        query {
          mesasDisponibles {
            id_mesa
            numero_mesa
            capacidad
            estado
          }
          reservas {
            id_reserva
            fecha_reserva
            hora_reserva
            estado
            mesa {
              numero_mesa
              capacidad
            }
            cliente {
              nombre
            }
          }
        }
      `, {}, token);
      setMesas(data.mesasDisponibles);
      setReservas(data.reservas);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReservar = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedMesa) {
      setError('Selecciona una mesa primero.');
      return;
    }

    try {
      await graphqlRequest(`
        mutation CreateReserva($input: ReservaInput!) {
          createReserva(input: $input) {
            id_reserva
            estado
          }
        }
      `, {
        input: {
          id_cliente: 1,
          id_mesa: selectedMesa.id_mesa,
          fecha_reserva: form.fecha_reserva,
          hora_reserva: form.hora_reserva,
        }
      }, token);

      setSuccess(`¡Mesa ${selectedMesa.numero_mesa} reservada exitosamente!`);
      setSelectedMesa(null);
      setForm({ fecha_reserva: '', hora_reserva: '' });
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <span>Cargando mesas...</span>
      </div>
    );
  }

  return (
    <main className="page-container">
      <div className="page-header">
        <h1>Reservar Mesa</h1>
        <p>Selecciona una mesa disponible y elige la fecha de tu visita</p>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239, 71, 111, 0.1)',
          border: '1px solid rgba(239, 71, 111, 0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          color: 'var(--color-danger)',
          marginBottom: '24px',
          fontSize: '0.9rem',
        }}>
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div style={{
          background: 'rgba(6, 214, 160, 0.1)',
          border: '1px solid rgba(6, 214, 160, 0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          color: 'var(--color-success)',
          marginBottom: '24px',
          fontSize: '0.9rem',
        }}>
          ✅ {success}
        </div>
      )}

      {/* Mesas disponibles */}
      <h2 style={{ fontSize: '1.3rem', marginBottom: '20px', color: 'var(--color-text-secondary)' }}>
        Mesas Disponibles
      </h2>

      {mesas.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🪑</div>
          <h3>No hay mesas disponibles</h3>
          <p>Todas las mesas están ocupadas en este momento</p>
        </div>
      ) : (
        <div className="grid-4" style={{ marginBottom: '40px' }}>
          {mesas.map((mesa) => (
            <div
              key={mesa.id_mesa}
              className={`mesa-card disponible`}
              style={{
                cursor: 'pointer',
                borderColor: selectedMesa?.id_mesa === mesa.id_mesa ? 'var(--color-primary)' : undefined,
                boxShadow: selectedMesa?.id_mesa === mesa.id_mesa ? 'var(--shadow-glow)' : undefined,
              }}
              onClick={() => setSelectedMesa(mesa)}
            >
              <div className="mesa-number">#{mesa.numero_mesa}</div>
              <div className="mesa-capacity">👥 {mesa.capacidad} personas</div>
              <span className="badge badge-success">Disponible</span>
            </div>
          ))}
        </div>
      )}

      {/* Formulario de reserva */}
      {selectedMesa && (
        <div className="card" style={{ maxWidth: '500px', margin: '0 auto', animation: 'fadeInUp 0.3s ease' }}>
          <h3 style={{ marginBottom: '20px' }}>
            📅 Reservar Mesa #{selectedMesa.numero_mesa}
          </h3>
          <form onSubmit={handleReservar}>
            <div className="form-group">
              <label>Fecha</label>
              <input
                type="date"
                className="form-control"
                value={form.fecha_reserva}
                onChange={(e) => setForm({ ...form, fecha_reserva: e.target.value })}
                required
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="form-group">
              <label>Hora</label>
              <input
                type="time"
                className="form-control"
                value={form.hora_reserva}
                onChange={(e) => setForm({ ...form, hora_reserva: e.target.value })}
                required
              />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                Confirmar Reserva
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedMesa(null)}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
