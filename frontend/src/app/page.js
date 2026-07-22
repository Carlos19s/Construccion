'use client';

import { useState, useEffect } from 'react';
import { graphqlRequest } from '@/lib/graphql-client';
import { useAuth } from '@/lib/auth';

// ================= COMPONENTE DE DIBUJO DE MESA Y ASIENTOS (SVG DINÁMICO) =================
const MesaGraphic = ({ capacidad, numero, isSelected, color }) => {
  const renderSillas = () => {
    const sillas = [];
    const total = Math.min(capacidad, 8); // Renderiza de forma circular hasta 8 sillas

    for (let i = 0; i < total; i++) {
      const angle = (i * (360 / total)) * (Math.PI / 180);
      const radiusX = 36;
      const radiusY = 26;
      const x = 50 + radiusX * Math.cos(angle);
      const y = 45 + radiusY * Math.sin(angle);

      sillas.push(
        <circle
          key={i}
          cx={x}
          cy={y}
          r="4.5"
          fill={isSelected ? '#00d2d3' : '#4a5568'}
          stroke={isSelected ? '#ffffff' : '#2d3748'}
          strokeWidth="1.5"
          style={{ transition: 'all 0.3s ease' }}
        />
      );
    }
    return sillas;
  };

  return (
    <div style={{ position: 'relative', width: '85px', height: '70px', flexShrink: 0 }}>
      <svg viewBox="0 0 100 90" style={{ width: '100%', height: '100%' }}>
        {/* Glow de la Mesa */}
        <ellipse
          cx="50"
          cy="48"
          rx="26"
          ry="18"
          fill={isSelected ? 'rgba(0, 210, 211, 0.3)' : 'rgba(0,0,0,0.3)'}
          filter="blur(4px)"
        />

        {/* Asientos */}
        {renderSillas()}

        {/* Superficie de la Mesa */}
        <ellipse
          cx="50"
          cy="45"
          rx="24"
          ry="16"
          fill={isSelected ? '#00d2d3' : '#1e293b'}
          stroke={isSelected ? '#ffffff' : color}
          strokeWidth="2"
          style={{ transition: 'all 0.3s ease' }}
        />

        {/* Número de Mesa */}
        <text
          x="50"
          y="49"
          textAnchor="middle"
          fill={isSelected ? '#09101d' : '#f1f2f6'}
          fontSize="11"
          fontWeight="900"
          fontFamily="sans-serif"
        >
          #{numero}
        </text>
      </svg>
    </div>
  );
};

export default function CatalogPage() {
  // Datos
  const [mesas, setMesas] = useState([]);
  const [selectedMesa, setSelectedMesa] = useState(null);
  const [platos, setPlatos] = useState([]);
  const [carrito, setCarrito] = useState([]);

  const { user, token } = useAuth();

  // Formulario Cliente
  const [cliente, setCliente] = useState({ nombre: '', identificacion: '', telefono: '' });
  const [horaReserva, setHoraReserva] = useState('19:00 - 20:30');

  // UI States
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Paleta de badges para números de mesa
  const badgeColors = [
    { bg: '#00d2d3', color: '#09101d' }, // Teal Neon
    { bg: '#ff9f43', color: '#09101d' }, // Warm Amber
    { bg: '#9c88ff', color: '#ffffff' }, // Royal Violet
    { bg: '#48dbfb', color: '#09101d' }, // Cyan
    { bg: '#ff6b6b', color: '#ffffff' }, // Red Coral
    { bg: '#1dd1a1', color: '#09101d' }, // Emerald
  ];

  const platoEmojis = ['🥩', '🍝', '🍷', '🥗', '🍲', '🍰', '🧃', '🍕'];

  useEffect(() => {
    if (user) {
      setCliente({
        nombre: user.nombre || '',
        identificacion: user.identificacion || '',
        telefono: user.telefono || ''
      });
    }
  }, [user]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
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
          platosActivos {
            id_plato
            nombre
            descripcion
            precio
            stock
            imagen_url
          }
        }
      `);
      setMesas(data.mesasDisponibles || []);
      setPlatos(data.platosActivos || []);
    } catch (err) {
      console.error(err);
      setError('Error al sincronizar datos con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  // Helper para asignar zona dentro del restaurante
  const getUbicacionMesa = (num) => {
    if (num <= 2) return { zona: 'Ventana Exterior', tipo: 'Ambiente Luminoso', icon: '🪟' };
    if (num <= 5) return { zona: 'Terraza / Jardín', tipo: 'Aire Libre', icon: '🌿' };
    if (num <= 8) return { zona: 'Salón Central', tipo: 'Climatizado', icon: '🍷' };
    return { zona: 'VIP Lounge', tipo: 'Privado', icon: '⭐' };
  };

  // Logica de Carrito
  const agregarAlCarrito = (plato) => {
    setCarrito((prev) => {
      const existe = prev.find((i) => i.plato.id_plato === plato.id_plato);
      if (existe) {
        if (existe.cantidad >= plato.stock) return prev;
        return prev.map((i) =>
          i.plato.id_plato === plato.id_plato ? { ...i, cantidad: i.cantidad + 1 } : i
        );
      }
      return [...prev, { plato, cantidad: 1 }];
    });
  };

  const quitarDelCarrito = (id_plato) => {
    setCarrito((prev) =>
      prev
        .map((i) => (i.plato.id_plato === id_plato ? { ...i, cantidad: i.cantidad - 1 } : i))
        .filter((i) => i.cantidad > 0)
    );
  };

  const totalOrden = carrito.reduce((acc, i) => acc + i.plato.precio * i.cantidad, 0);

  // Submit Final
  const handleConfirmarPedido = async (e) => {
    e.preventDefault();
    if (!cliente.nombre || !cliente.identificacion) {
      setError('Por favor completa los datos del cliente (Nombre e Identificación).');
      return;
    }
    if (!selectedMesa) {
      setError('Por favor selecciona una mesa del catálogo.');
      return;
    }
    if (carrito.length === 0) {
      setError('Selecciona al menos un platillo del menú.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      // 1. Validar / Crear Cliente
      let idCliente = null;
      const resCliente = await graphqlRequest(
        `query GetCliente($identificacion: String!) {
          clientePorIdentificacion(identificacion: $identificacion) { id_cliente }
        }`,
        { identificacion: cliente.identificacion },
        token
      );

      if (resCliente?.clientePorIdentificacion) {
        idCliente = resCliente.clientePorIdentificacion.id_cliente;
      } else {
        const nuevoC = await graphqlRequest(
          `mutation CrearCliente($input: ClienteInput!) {
            createCliente(input: $input) { id_cliente }
          }`,
          {
            input: {
              nombre: cliente.nombre,
              identificacion: cliente.identificacion,
              telefono: cliente.telefono
            }
          },
          token
        );
        idCliente = nuevoC.createCliente.id_cliente;
      }

      // 2. Crear Reserva
      const fechaHoy = new Date().toISOString().split('T')[0];
      const horaActual = horaReserva.split(' - ')[0] || '19:00';

      const resReserva = await graphqlRequest(
        `mutation CrearReserva($input: ReservaInput!) {
          createReserva(input: $input) { id_reserva }
        }`,
        {
          input: {
            id_cliente: parseInt(idCliente),
            id_mesa: parseInt(selectedMesa.id_mesa),
            fecha_reserva: fechaHoy,
            hora_reserva: horaActual
          }
        },
        token
      );

      const idReserva = resReserva.createReserva.id_reserva;

      // 3. Crear Orden si hay carrito
      if (carrito.length > 0) {
        await graphqlRequest(
          `mutation CrearOrden($input: OrdenInput!) {
            createOrden(input: $input) { id_orden }
          }`,
          {
            input: {
              id_mesa: parseInt(selectedMesa.id_mesa),
              id_cliente: parseInt(idCliente),
              detalles: carrito.map(item => ({
                id_plato: parseInt(item.id_plato || item.plato?.id_plato),
                cantidad: parseInt(item.cantidad)
              }))
            }
          },
          token
        );
      }

      setSuccess(`¡Reserva de Mesa #${selectedMesa.numero_mesa} y pedido registrados con éxito!`);
      setSelectedMesa(null);
      setCarrito([]);
      setCliente({ nombre: '', identificacion: '', telefono: '' });
      fetchInitialData();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error en la transacción.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPlatos = platos.filter(
    (p) =>
      p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (p.descripcion && p.descripcion.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0b0c10', color: '#66fcf1' }}>
        <div className="web-loader" />
        <p style={{ marginTop: '20px', letterSpacing: '2px', fontWeight: '600' }}>CARGANDO DASHBOARD DE RESERVAS...</p>
        <style>{`
          .web-loader { width: 60px; height: 60px; border: 4px solid rgba(102,252,241,0.1); border-top-color: #66fcf1; border-radius: 50%; animation: spin 0.8s linear infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  const fallbackImages = [
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80',
    'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=500&q=80',
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=500&q=80',
    'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=500&q=80',
    'https://images.unsplash.com/photo-1493770348161-369560ae357d?auto=format&fit=crop&w=500&q=80',
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0b0d17', color: '#e0e6ed', fontFamily: "'Inter', system-ui, sans-serif", padding: '32px 40px' }}>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>

        {/* HEADER TIPO DASHBOARD WEB */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', background: 'rgba(23, 27, 44, 0.7)', backdropFilter: 'blur(12px)', padding: '20px 32px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ background: '#00d2d3', width: '12px', height: '12px', borderRadius: '50%', boxShadow: '0 0 10px #00d2d3' }}></span>
              <h1 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#fff', margin: 0 }}>Restaurant Web Management</h1>
            </div>
            <p style={{ color: '#8a99ad', fontSize: '0.85rem', marginTop: '4px', margin: 0 }}>
              Gestión interactiva de mesas, mapa de distribución y catálogo de comandas
            </p>
          </div>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.75rem', color: '#a5b4fc', textTransform: 'uppercase', fontWeight: '700' }}>Mesas Libres</span>
              <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#00d2d3' }}>{mesas.length} Disponibles</div>
            </div>
          </div>
        </header>

        {/* NOTIFICACIONES */}
        {error && (
          <div style={{ background: 'rgba(255, 107, 107, 0.1)', borderLeft: '4px solid #ff6b6b', color: '#ff8787', padding: '16px 20px', borderRadius: '12px', marginBottom: '24px', fontSize: '0.9rem' }}>
            ⚠️ {error}
          </div>
        )}
        {success && (
          <div style={{ background: 'rgba(29, 209, 161, 0.1)', borderLeft: '4px solid #1dd1a1', color: '#1dd1a1', padding: '16px 20px', borderRadius: '12px', marginBottom: '24px', fontSize: '0.9rem' }}>
            🎉 {success}
          </div>
        )}

        {/* LAYOUT PRINCIPAL WEB: 2 COLUMNAS (IZQ: MESAS + CLIENTE, DER: CATÁLOGO + CARRITO) */}
        <div style={{ display: 'grid', gridTemplateColumns: '520px 1fr', gap: '32px', alignItems: 'start' }}>

          {/* COLUMNA IZQUIERDA: REGISTRO DE CLIENTE & LISTADO DE MESAS PRO */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* PANEL CLIENTE */}
            <div style={{ background: '#131728', padding: '24px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: '700', color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>
                👤 Datos de la Reserva
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '0.75rem', color: '#8a99ad', display: 'block', marginBottom: '4px' }}>Nombre Completo</label>
                  <input
                    type="text"
                    placeholder="Ej. Juan Pérez"
                    value={cliente.nombre}
                    onChange={(e) => setCliente({ ...cliente, nombre: e.target.value })}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', padding: '10px 14px', borderRadius: '10px', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#8a99ad', display: 'block', marginBottom: '4px' }}>Identificación / Cédula</label>
                  <input
                    type="text"
                    placeholder="1726384950"
                    value={cliente.identificacion}
                    onChange={(e) => setCliente({ ...cliente, identificacion: e.target.value })}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', padding: '10px 14px', borderRadius: '10px', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#8a99ad', display: 'block', marginBottom: '4px' }}>Teléfono</label>
                  <input
                    type="text"
                    placeholder="0991234567"
                    value={cliente.telefono}
                    onChange={(e) => setCliente({ ...cliente, telefono: e.target.value })}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', padding: '10px 14px', borderRadius: '10px', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
                  />

                </div>
              </div>
            </div>

            {/* LISTA DE MESAS VISUAL E INTERACTIVA */}
            <div style={{ background: '#131728', padding: '24px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fff', margin: 0 }}>Plano de Mesas</h2>
                  <p style={{ color: '#8a99ad', fontSize: '0.78rem', margin: '2px 0 0 0' }}>Haz clic en una mesa interactiva</p>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#00d2d3', background: 'rgba(0, 210, 211, 0.1)', padding: '4px 10px', borderRadius: '12px', fontWeight: '700' }}>
                  {mesas.length} Libres
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '520px', overflowY: 'auto', paddingRight: '4px' }}>
                {mesas.map((mesa, idx) => {
                  const isSelected = selectedMesa?.id_mesa === mesa.id_mesa;
                  const badge = badgeColors[idx % badgeColors.length];
                  const ubicacion = getUbicacionMesa(mesa.numero_mesa);

                  return (
                    <div
                      key={mesa.id_mesa}
                      onClick={() => setSelectedMesa(mesa)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        padding: '14px 16px',
                        borderRadius: '18px',
                        background: isSelected
                          ? 'linear-gradient(135deg, rgba(0, 210, 211, 0.12) 0%, rgba(156, 136, 255, 0.08) 100%)'
                          : 'rgba(255, 255, 255, 0.02)',
                        border: isSelected ? '2px solid #00d2d3' : '1px solid rgba(255, 255, 255, 0.07)',
                        cursor: 'pointer',
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: isSelected ? '0 8px 25px rgba(0, 210, 211, 0.2)' : 'none',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      {/* Indicador Neon Lateral al seleccionar */}
                      {isSelected && (
                        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: '#00d2d3', boxShadow: '0 0 10px #00d2d3' }} />
                      )}

                      {/* 1. Gráfico SVG de la Mesa y Sillas */}
                      <MesaGraphic
                        capacidad={mesa.capacidad}
                        numero={mesa.numero_mesa}
                        isSelected={isSelected}
                        color={badge.bg}
                      />

                      {/* 2. Información de Ubicación y Capacidad */}
                      <div style={{ flex: 1, paddingLeft: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: '800', fontSize: '0.95rem', color: isSelected ? '#00d2d3' : '#fff' }}>
                            Mesa #{mesa.numero_mesa}
                          </span>
                          <span style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.06)', color: '#a5b4fc', padding: '2px 8px', borderRadius: '8px' }}>
                            {ubicacion.icon} {ubicacion.tipo}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.82rem', color: '#cbd5e1', marginTop: '4px', fontWeight: '500' }}>
                          {ubicacion.zona}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', fontSize: '0.75rem', color: '#8a99ad' }}>
                          <span>👥 <strong>{mesa.capacidad}</strong> Asientos</span>
                          <span>•</span>
                          <span style={{ color: isSelected ? '#1dd1a1' : '#a5b4fc', fontWeight: '600' }}>
                            {isSelected ? '✓ Seleccionada' : 'Disponible'}
                          </span>
                        </div>
                      </div>

                      {/* 3. Selector de Horario Estilizado */}
                      <div onClick={(e) => e.stopPropagation()} style={{ width: '125px' }}>
                        <select
                          value={horaReserva}
                          onChange={(e) => setHoraReserva(e.target.value)}
                          style={{
                            width: '100%',
                            background: isSelected ? '#0f172a' : '#1d2238',
                            color: isSelected ? '#00d2d3' : '#e0e6ed',
                            border: isSelected ? '1px solid #00d2d3' : '1px solid rgba(255,255,255,0.15)',
                            borderRadius: '10px',
                            padding: '6px 8px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            outline: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="16:00 - 18:30">16:00 - 18:30</option>
                          <option value="18:30 - 20:00">18:30 - 20:00</option>
                          <option value="20:00 - 22:30">20:00 - 22:30</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* COLUMNA DERECHA: CATÁLOGO DE MENÚ + CARRITO INTEGRADO EN DASHBOARD */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {selectedMesa ? (
              <div style={{ background: '#131728', padding: '28px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.06)' }}>

                {/* Header de la Mesa Seleccionada */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px' }}>
                  <div>
                    <span style={{ color: '#00d2d3', fontSize: '0.8rem', fontWeight: '800', letterSpacing: '1px' }}>MESA SELECCIONADA</span>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '900', color: '#fff', marginTop: '2px' }}>
                      Mesa #{selectedMesa.numero_mesa} — <span style={{ color: '#9c88ff' }}>{getUbicacionMesa(selectedMesa.numero_mesa).zona}</span>
                    </h2>
                  </div>

                  <input
                    type="text"
                    placeholder="🔍 Buscar plato..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', padding: '10px 18px', borderRadius: '12px', color: '#fff', fontSize: '0.85rem', outline: 'none', width: '240px' }}
                  />
                </div>

                {/* GRID DE PLATILLOS + RESUMEN */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px' }}>

                  {/* Platillos */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '16px', maxHeight: '500px', overflowY: 'auto', paddingRight: '4px' }}>
                    {filteredPlatos.map((plato, idx) => (
                      <div
                        key={plato.id_plato}
                        style={{
                          background: 'rgba(255, 255, 255, 0.02)',
                          borderRadius: '16px',
                          padding: '16px',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div>
                          {plato.imagen_url && plato.imagen_url.trim() !== '' ? (
                            <div
                              style={{
                                width: '100%',
                                height: '140px',
                                borderRadius: '12px',
                                backgroundImage: `url(${plato.imagen_url})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                marginBottom: '12px'
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: '100%',
                                height: '140px',
                                borderRadius: '12px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '4rem',
                                marginBottom: '12px'
                              }}
                            >
                              {platoEmojis[idx % platoEmojis.length]}
                            </div>
                          )}
                          <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#fff' }}>{plato.nombre}</h3>
                          <p style={{ fontSize: '0.78rem', color: '#8a99ad', marginTop: '6px', lineHeight: '1.4' }}>
                            {plato.descripcion || 'Especialidad del chef con ingredientes seleccionados.'}
                          </p>
                        </div>

                        <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                          <span style={{ fontSize: '1.1rem', fontWeight: '900', color: '#00d2d3' }}>${plato.precio.toFixed(2)}</span>
                          <button
                            type="button"
                            onClick={() => agregarAlCarrito(plato)}
                            style={{
                              background: '#9c88ff',
                              color: '#fff',
                              border: 'none',
                              padding: '8px 14px',
                              borderRadius: '10px',
                              fontWeight: '700',
                              fontSize: '0.8rem',
                              cursor: 'pointer'
                            }}
                          >
                            + Añadir
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* SUMMARY DEL PEDIDO / RESUMEN LATERAL WEB */}
                  <div style={{ background: '#181d30', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#fff', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px' }}>
                        📋 Comanda
                      </h3>

                      {carrito.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#8a99ad', padding: '40px 0', fontSize: '0.85rem' }}>
                          Elige platillos para la Mesa #{selectedMesa.numero_mesa}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '280px', overflowY: 'auto' }}>
                          {carrito.map((item) => (
                            <div key={item.plato.id_plato} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '8px 10px', borderRadius: '10px' }}>
                              <div>
                                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#fff' }}>{item.plato.nombre}</div>
                                <div style={{ fontSize: '0.75rem', color: '#00d2d3' }}>${(item.plato.precio * item.cantidad).toFixed(2)}</div>
                              </div>
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <button onClick={() => quitarDelCarrito(item.plato.id_plato)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: '4px', width: '22px', height: '22px', cursor: 'pointer' }}>-</button>
                                <span style={{ fontSize: '0.85rem', fontWeight: '700' }}>{item.cantidad}</span>
                                <button onClick={() => agregarAlCarrito(item.plato)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: '4px', width: '22px', height: '22px', cursor: 'pointer' }}>+</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: '20px', borderTop: '1px dashed rgba(255,255,255,0.15)', paddingTop: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <span style={{ color: '#8a99ad', fontSize: '0.9rem' }}>Total a Pagar:</span>
                        <span style={{ fontSize: '1.4rem', fontWeight: '900', color: '#00d2d3' }}>${totalOrden.toFixed(2)}</span>
                      </div>

                      <button
                        onClick={handleConfirmarPedido}
                        disabled={submitting || carrito.length === 0}
                        style={{
                          width: '100%',
                          padding: '14px',
                          borderRadius: '12px',
                          background: carrito.length === 0 ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #00d2d3 0%, #01a3a4 100%)',
                          color: carrito.length === 0 ? '#8a99ad' : '#09101d',
                          fontWeight: '900',
                          fontSize: '0.88rem',
                          border: 'none',
                          cursor: carrito.length === 0 ? 'not-allowed' : 'pointer',
                          boxShadow: carrito.length === 0 ? 'none' : '0 6px 20px rgba(0, 210, 211, 0.35)',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {submitting ? 'PROCESANDO...' : 'CONFIRMAR RESERVA Y ORDEN'}
                      </button>
                    </div>
                  </div>

                </div>

              </div>
            ) : (
              /* ESTADO VACÍO CUANDO NO HAY MESA SELECCIONADA */
              <div style={{ background: '#131728', padding: '60px 40px', borderRadius: '20px', border: '1px dashed rgba(255,255,255,0.1)', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🍽️</div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#fff', marginBottom: '8px' }}>Ninguna Mesa Seleccionada</h3>
                <p style={{ color: '#8a99ad', fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto' }}>
                  Haz clic en cualquiera de las mesas disponibles del panel izquierdo para ver la ubicación, capacidad y añadir órdenes del menú.
                </p>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}