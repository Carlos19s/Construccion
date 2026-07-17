'use client';

import { useState, useEffect } from 'react';
import { graphqlRequest } from '@/lib/graphql-client';
import { useAuth } from '@/lib/auth';

export default function OrdenesPage() {
  const { token } = useAuth();
  const [platos, setPlatos] = useState([]);
  const [mesas, setMesas] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Cart state
  const [carrito, setCarrito] = useState([]);
  const [search, setSearch] = useState('');
  
  // Order configuration state
  const [idMesa, setIdMesa] = useState('');
  const [paraLlevar, setParaLlevar] = useState(false);
  const [cliente, setCliente] = useState(null); // The selected client
  const [cedulaBusqueda, setCedulaBusqueda] = useState('');
  
  // Client Modal state
  const [showClientModal, setShowClientModal] = useState(false);
  const [clientForm, setClientForm] = useState({ nombre: '', identificacion: '', telefono: '' });
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const data = await graphqlRequest(`
        query {
          platosActivos { id_plato nombre descripcion precio stock }
          mesasDisponibles { id_mesa numero_mesa capacidad }
        }
      `, {}, token);
      setPlatos(data.platosActivos);
      setMesas(data.mesasDisponibles);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const buscarCliente = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!cedulaBusqueda) return;
    
    try {
      const data = await graphqlRequest(`
        query ClientePorId($identificacion: String!) {
          clientePorIdentificacion(identificacion: $identificacion) {
            id_cliente
            nombre
            identificacion
          }
        }
      `, { identificacion: cedulaBusqueda }, token);
      
      if (data.clientePorIdentificacion) {
        setCliente(data.clientePorIdentificacion);
        setSuccess(`Cliente encontrado: ${data.clientePorIdentificacion.nombre}`);
      } else {
        setCliente(null);
        setError('Cliente no encontrado. Puedes registrarlo ahora.');
        setClientForm({ ...clientForm, identificacion: cedulaBusqueda });
      }
    } catch (err) {
      setError('Error al buscar cliente');
    }
  };

  const handleCrearCliente = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const data = await graphqlRequest(`
        mutation CreateCliente($input: ClienteInput!) {
          createCliente(input: $input) {
            id_cliente
            nombre
            identificacion
          }
        }
      `, { input: clientForm }, token);
      
      setCliente(data.createCliente);
      setShowClientModal(false);
      setSuccess(`Cliente ${data.createCliente.nombre} registrado con éxito.`);
      setCedulaBusqueda('');
    } catch (err) {
      setError(err.message);
    }
  };

  const addToCart = (plato) => {
    const existing = carrito.find(c => c.id_plato === plato.id_plato);
    if (existing) {
      if (existing.cantidad >= plato.stock) {
        setError(`Stock máximo para "${plato.nombre}" es ${plato.stock}`);
        return;
      }
      setCarrito(carrito.map(c =>
        c.id_plato === plato.id_plato ? { ...c, cantidad: c.cantidad + 1 } : c
      ));
    } else {
      setCarrito([...carrito, { ...plato, cantidad: 1 }]);
    }
    setError('');
  };

  const removeFromCart = (id_plato) => setCarrito(carrito.filter(c => c.id_plato !== id_plato));

  const updateQuantity = (id_plato, cantidad) => {
    if (cantidad <= 0) return removeFromCart(id_plato);
    setCarrito(carrito.map(c => c.id_plato === id_plato ? { ...c, cantidad } : c));
  };

  const total = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);

  const handleSubmitOrden = async () => {
    setError('');
    setSuccess('');

    if (carrito.length === 0) {
      setError('Agrega al menos un plato a la orden.');
      return;
    }

    try {
      const input = {
        id_mesa: paraLlevar ? null : (idMesa ? parseInt(idMesa) : null),
        id_cliente: cliente ? parseInt(cliente.id_cliente) : null,
        detalles: carrito.map(item => ({
          id_plato: item.id_plato,
          cantidad: item.cantidad,
        })),
      };

      const data = await graphqlRequest(`
        mutation CreateOrden($input: OrdenInput!) {
          createOrden(input: $input) { id_orden total estado }
        }
      `, { input }, token);

      setSuccess(`¡Orden #${data.createOrden.id_orden} creada exitosamente! Total: $${data.createOrden.total.toFixed(2)}`);
      setCarrito([]);
      setIdMesa('');
      setCliente(null);
      setCedulaBusqueda('');
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const filtered = platos.filter(p => p.nombre.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="loading-container"><div className="spinner" /><span>Cargando...</span></div>;

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{
          fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 800, color: 'var(--color-text)',
        }}>
          📝 Toma de Órdenes
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>
          Selecciona platos del menú y asigna la orden a un cliente/mesa
        </p>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239,71,111,0.1)', border: '1px solid rgba(239,71,111,0.3)',
          borderRadius: 'var(--radius-md)', padding: '12px 16px', color: 'var(--color-danger)',
          marginBottom: '20px', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between'
        }}>
          <span>⚠️ {error}</span>
          {error.includes('registralo') && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowClientModal(true)}>
              Registrar Cliente
            </button>
          )}
        </div>
      )}

      {success && (
        <div style={{
          background: 'rgba(6,214,160,0.1)', border: '1px solid rgba(6,214,160,0.3)',
          borderRadius: 'var(--radius-md)', padding: '12px 16px', color: 'var(--color-success)',
          marginBottom: '20px', fontSize: '0.9rem',
        }}>✅ {success}</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '32px' }}>
        {/* Platos disponibles */}
        <div>
          <div className="toolbar" style={{ marginBottom: '20px' }}>
            <div className="toolbar-search">
              <span className="search-icon">🔍</span>
              <input type="text" placeholder="Buscar platos..." value={search}
                onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>

          <div className="grid-2">
            {filtered.map((plato) => (
              <div key={plato.id_plato} className="card" style={{ padding: '16px', cursor: 'pointer' }}
                onClick={() => addToCart(plato)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h4 style={{ fontSize: '1rem', marginBottom: '4px' }}>{plato.nombre}</h4>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                      Stock: {plato.stock}
                    </p>
                  </div>
                  <span style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '1.1rem' }}>
                    ${plato.precio.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Panel de orden */}
        <div style={{ position: 'sticky', top: '100px', alignSelf: 'flex-start' }}>
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '20px' }}>🛒 Orden Actual</h3>

            {/* Configuración de la Orden */}
            <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid var(--color-border)' }}>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', cursor: 'pointer' }}>
                <input type="checkbox" checked={paraLlevar}
                  onChange={(e) => { setParaLlevar(e.target.checked); setIdMesa(''); }}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)' }} />
                <span style={{ fontWeight: 500 }}>Para llevar (No requiere mesa)</span>
              </label>

              {!paraLlevar && (
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '0.85rem' }}>Mesa Asignada</label>
                  <select className="form-control" value={idMesa}
                    onChange={(e) => setIdMesa(e.target.value)}>
                    <option value="">Seleccionar mesa...</option>
                    {mesas.map(m => (
                      <option key={m.id_mesa} value={m.id_mesa}>Mesa #{m.numero_mesa} ({m.capacidad} pers.)</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Búsqueda de Cliente */}
              <div className="form-group" style={{ marginBottom: '0' }}>
                <label style={{ fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Cliente</span>
                  {cliente && (
                    <span style={{ color: 'var(--color-danger)', cursor: 'pointer' }} onClick={() => setCliente(null)}>
                      Quitar
                    </span>
                  )}
                </label>
                
                {cliente ? (
                  <div style={{ padding: '10px 14px', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontWeight: 600 }}>{cliente.nombre}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>ID: {cliente.identificacion}</div>
                  </div>
                ) : (
                  <form onSubmit={buscarCliente} style={{ display: 'flex', gap: '8px' }}>
                    <input type="text" className="form-control" placeholder="Cédula / RUC..."
                      value={cedulaBusqueda} onChange={(e) => setCedulaBusqueda(e.target.value)} />
                    <button type="submit" className="btn btn-secondary" style={{ padding: '0 16px' }}>🔍</button>
                    <button type="button" className="btn btn-primary" style={{ padding: '0 16px' }} 
                      onClick={() => { setClientForm({...clientForm, identificacion: cedulaBusqueda}); setShowClientModal(true); }}>
                      +
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Items */}
            {carrito.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '10px 0', color: 'var(--color-text-muted)' }}>
                <p>Agrega platos a la orden</p>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '20px', maxHeight: '300px', overflowY: 'auto' }}>
                  {carrito.map(item => (
                    <div key={item.id_plato} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 0', borderBottom: '1px solid var(--color-border-light)',
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.nombre}</div>
                        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                          ${item.precio.toFixed(2)} c/u
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button className="btn btn-secondary btn-sm" style={{ width: '28px', height: '28px', padding: 0 }}
                          onClick={() => updateQuantity(item.id_plato, item.cantidad - 1)}>−</button>
                        <span style={{ fontWeight: 600, minWidth: '20px', textAlign: 'center' }}>{item.cantidad}</span>
                        <button className="btn btn-secondary btn-sm" style={{ width: '28px', height: '28px', padding: 0 }}
                          onClick={() => updateQuantity(item.id_plato, item.cantidad + 1)}>+</button>
                        <button className="btn btn-danger btn-sm" style={{ width: '28px', height: '28px', padding: 0, marginLeft: '4px' }}
                          onClick={() => removeFromCart(item.id_plato)}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{
                  display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.2rem',
                  padding: '16px 0', borderTop: '2px solid var(--color-border)',
                }}>
                  <span>Total</span>
                  <span style={{ color: 'var(--color-primary)' }}>${total.toFixed(2)}</span>
                </div>

                <button className="btn btn-primary" style={{ width: '100%', padding: '14px', marginTop: '12px' }}
                  onClick={handleSubmitOrden}>
                  Confirmar Orden
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal para Crear Cliente */}
      {showClientModal && (
        <div className="modal-overlay" onClick={() => setShowClientModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Registrar Nuevo Cliente</h2>
              <button className="modal-close" onClick={() => setShowClientModal(false)}>✕</button>
            </div>
            
            <form onSubmit={handleCrearCliente}>
              <div className="form-group">
                <label>Identificación (Cédula/RUC)</label>
                <input type="text" className="form-control" required
                  value={clientForm.identificacion} onChange={(e) => setClientForm({ ...clientForm, identificacion: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Nombre Completo / Razón Social</label>
                <input type="text" className="form-control" required
                  value={clientForm.nombre} onChange={(e) => setClientForm({ ...clientForm, nombre: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Teléfono (Opcional)</label>
                <input type="tel" className="form-control"
                  value={clientForm.telefono} onChange={(e) => setClientForm({ ...clientForm, telefono: e.target.value })} />
              </div>
              
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowClientModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Registrar y Seleccionar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
