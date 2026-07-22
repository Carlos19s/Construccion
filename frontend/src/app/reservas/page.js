'use client';

import { useState, useEffect } from 'react';
import { graphqlRequest } from '@/lib/graphql-client';

export default function ReservasClientePage() {
  const [mesas, setMesas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMesa, setSelectedMesa] = useState(null);

  // Formulario del Cliente e Información de Reserva
  const [clienteForm, setClienteForm] = useState({
    nombre: '',
    identificacion: '',
    telefono: ''
  });

  const [reservaForm, setReservaForm] = useState({
    fecha_reserva: new Date().toISOString().split('T')[0], // Fecha de hoy por defecto
    hora_reserva: '19:00'
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchMesasDisponibles();
  }, []);

  // Criterio 1: Listar únicamente las mesas que están en estado 'Disponible'
  const fetchMesasDisponibles = async () => {
    try {
      setLoading(true);
      const data = await graphqlRequest(`
        query {
          mesasDisponibles {
            id_mesa
            numero_mesa
            capacidad
            estado
          }
        }
      `);
      setMesas(data.mesasDisponibles || []);
    } catch (err) {
      console.error('Error al cargar mesas disponibles:', err);
      setError('No se pudieron obtener las mesas disponibles.');
    } finally {
      setLoading(false);
    }
  };

  const handleReservaSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedMesa) {
      setError('Por favor selecciona una mesa disponible.');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Obtener o Crear el cliente (Criterio 3: Asociar id_cliente)
      let idCliente = null;

      const clienteExistenteData = await graphqlRequest(`
        query ObtenerCliente($identificacion: String!) {
          clientePorIdentificacion(identificacion: $identificacion) {
            id_cliente
          }
        }
      `, { identificacion: clienteForm.identificacion });

      if (clienteExistenteData?.clientePorIdentificacion) {
        idCliente = clienteExistenteData.clientePorIdentificacion.id_cliente;
      } else {
        // Crear el cliente nuevo si no existe
        const nuevoClienteData = await graphqlRequest(`
          mutation CrearCliente($input: ClienteInput!) {
            createCliente(input: $input) {
              id_cliente
            }
          }
        `, {
          input: {
            nombre: clienteForm.nombre,
            identificacion: clienteForm.identificacion,
            telefono: clienteForm.telefono
          }
        });

        idCliente = nuevoClienteData.createCliente.id_cliente;
      }

      // 2. Crear la reserva (Criterio 2: Cambia la mesa a 'Ocupada' en el Backend)
      await graphqlRequest(`
        mutation CrearReserva($input: ReservaInput!) {
          createReserva(input: $input) {
            id_reserva
            estado
          }
        }
      `, {
        input: {
          id_cliente: parseInt(idCliente),
          id_mesa: parseInt(selectedMesa.id_mesa),
          fecha_reserva: reservaForm.fecha_reserva,
          hora_reserva: reservaForm.hora_reserva
        }
      });

      setSuccess(`¡Reserva realizada con éxito para la Mesa #${selectedMesa.numero_mesa}!`);
      setSelectedMesa(null);
      setClienteForm({ nombre: '', identificacion: '', telefono: '' });
      
      // Actualiza la lista para que la mesa ocupada ya no aparezca
      fetchMesasDisponibles();
    } catch (err) {
      console.error('Error al procesar reserva:', err);
      setError(err.message || 'Ocurrió un error al crear la reserva.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#fff' }}>Cargando mesas disponibles...</div>;
  }

  return (
    <main style={{ maxWidth: '800px', margin: '40px auto', padding: '20px', color: '#fff' }}>
      <h2 style={{ fontSize: '1.8rem', marginBottom: '10px' }}>🍽️ Reserva de Mesas (HU-07)</h2>
      <p style={{ color: '#aaa', marginBottom: '20px' }}>
        Selecciona una mesa disponible e ingresa tus datos para confirmar tu reserva.
      </p>

      {error && <div style={{ background: '#7f1d1d', color: '#fca5a5', padding: '12px', borderRadius: '6px', marginBottom: '15px' }}>⚠️ {error}</div>}
      {success && <div style={{ background: '#14532d', color: '#86efac', padding: '12px', borderRadius: '6px', marginBottom: '15px' }}>✅ {success}</div>}

      {/* Criterio 1: Despliegue de Mesas Disponibles */}
      <h3 style={{ marginBottom: '12px' }}>Mesas Disponibles</h3>
      {mesas.length === 0 ? (
        <p style={{ color: '#eab308' }}>No hay mesas disponibles en este momento.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '15px', marginBottom: '30px' }}>
          {mesas.map((mesa) => {
            const isSelected = selectedMesa?.id_mesa === mesa.id_mesa;
            return (
              <div
                key={mesa.id_mesa}
                onClick={() => setSelectedMesa(mesa)}
                style={{
                  border: isSelected ? '2px solid #2563eb' : '1px solid #374151',
                  background: isSelected ? '#1e3a8a' : '#1f2937',
                  padding: '16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Mesa #{mesa.numero_mesa}</div>
                <div style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: '4px' }}>👥 Capacidad: {mesa.capacidad}</div>
                <div style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '8px', fontWeight: 'bold' }}>
                  {mesa.estado}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Formulario de Confirmación y Registro de Cliente */}
      {selectedMesa && (
        <form onSubmit={handleReservaSubmit} style={{ background: '#111827', padding: '24px', borderRadius: '8px', border: '1px solid #374151' }}>
          <h3 style={{ marginBottom: '16px' }}>Reservar Mesa #{selectedMesa.numero_mesa}</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Nombre Completo *</label>
              <input
                type="text"
                required
                value={clienteForm.nombre}
                onChange={(e) => setClienteForm({ ...clienteForm, nombre: e.target.value })}
                placeholder="Ej. Diego Aguilar"
                style={{ width: '100%', padding: '8px', borderRadius: '4px', background: '#1f2937', color: '#fff', border: '1px solid #4b5563' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Identificación / Cédula *</label>
              <input
                type="text"
                required
                value={clienteForm.identificacion}
                onChange={(e) => setClienteForm({ ...clienteForm, identificacion: e.target.value })}
                placeholder="Ej. 1002003004"
                style={{ width: '100%', padding: '8px', borderRadius: '4px', background: '#1f2937', color: '#fff', border: '1px solid #4b5563' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Teléfono</label>
              <input
                type="text"
                value={clienteForm.telefono}
                onChange={(e) => setClienteForm({ ...clienteForm, telefono: e.target.value })}
                placeholder="Ej. 0991234567"
                style={{ width: '100%', padding: '8px', borderRadius: '4px', background: '#1f2937', color: '#fff', border: '1px solid #4b5563' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Fecha *</label>
              <input
                type="date"
                required
                value={reservaForm.fecha_reserva}
                onChange={(e) => setReservaForm({ ...reservaForm, fecha_reserva: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', background: '#1f2937', color: '#fff', border: '1px solid #4b5563' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Hora *</label>
              <input
                type="time"
                required
                value={reservaForm.hora_reserva}
                onChange={(e) => setReservaForm({ ...reservaForm, hora_reserva: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', background: '#1f2937', color: '#fff', border: '1px solid #4b5563' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="submit"
              disabled={submitting}
              style={{ flex: 1, padding: '10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              {submitting ? 'Guardando Reserva...' : 'Confirmar Reserva'}
            </button>
            <button
              type="button"
              onClick={() => setSelectedMesa(null)}
              style={{ padding: '10px 20px', background: '#4b5563', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </main>
  );
}