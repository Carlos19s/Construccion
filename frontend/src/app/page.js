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

  // Emojis de platos variados
  const platoEmojis = ['🍽️', '🥘', '🍲', '🥗', '🍖', '🥩', '🧆', '🫕'];

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
              <div className="plato-card-image">
                {platoEmojis[index % platoEmojis.length]}
              </div>
              <div className="plato-card-body">
                <h3>{plato.nombre}</h3>
                <p className="plato-desc">{plato.descripcion || 'Sin descripción'}</p>
                <div className="plato-card-footer">
                  <span className="plato-price">${plato.precio.toFixed(2)}</span>
                  {plato.stock <= 5 ? (
                    <span className="badge badge-warning">¡Solo {plato.stock} disponibles!</span>
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
