'use client';

import { useState, useEffect } from 'react';
import { graphqlRequest } from '@/lib/graphql-client';

export default function CatalogPage() {
  const [platos, setPlatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchPlatos = async () => {
      try {
        const data = await graphqlRequest(`
          query {
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
        setPlatos(data.platosActivos);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlatos();
  }, []);

  if (loading) {
    return (
      <div className="loading-container" style={{ minHeight: 'calc(100vh - 72px)' }}>
        <div className="spinner" />
        <span>Cargando nuestro menú...</span>
      </div>
    );
  }

  const filtered = platos.filter(p => 
    p.nombre.toLowerCase().includes(search.toLowerCase()) || 
    (p.descripcion && p.descripcion.toLowerCase().includes(search.toLowerCase()))
  );

  const fallbackImages = [
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80', 
    'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=500&q=80', 
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=500&q=80', 
    'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=500&q=80', 
    'https://images.unsplash.com/photo-1493770348161-369560ae357d?auto=format&fit=crop&w=500&q=80', 
  ];

  return (
    <main className="page-container">
      <div className="page-header">
        <h1>Nuestro Menú</h1>
        <p>Descubre nuestros deliciosos platos artesanales</p>
      </div>

      <div className="toolbar" style={{ justifyContent: 'center', marginBottom: '40px' }}>
        <div className="toolbar-search" style={{ width: '100%', maxWidth: '600px' }}>
          <span className="search-icon">🔍</span>
          <input 
            type="text" 
            placeholder="Buscar platos, ingredientes..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🍽️</div>
          <h3>No encontramos platos</h3>
          <p>Intenta con otra búsqueda</p>
        </div>
      ) : (
        <div className="grid-4" style={{ marginBottom: '60px' }}>
          {filtered.map((plato, index) => (
            <div 
              key={plato.id_plato} 
              className="plato-card"
              style={{ animationDelay: `${index * 0.08}s` }}
            >
              <div 
                className="plato-card-image"
                style={{ 
                  backgroundImage: `url(${plato.imagen_url || fallbackImages[index % fallbackImages.length]})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat'
                }}
              >
              </div>
              <div className="plato-card-body">
                <h3>{plato.nombre}</h3>
                <p className="plato-desc">{plato.descripcion || 'Sin descripción'}</p>
                <div className="plato-card-footer">
                  <span className="plato-price">${plato.precio.toFixed(2)}</span>
                  {plato.stock <= 5 ? (
                    <span 
                      className="badge badge-danger" 
                      style={{ animation: 'pulse 2s infinite', fontWeight: 'bold' }}
                    >
                      ¡Solo {plato.stock} {plato.stock === 1 ? 'disponible' : 'disponibles'}!
                    </span>
                  ) : (
                    <span className="plato-stock">Disponibles</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
