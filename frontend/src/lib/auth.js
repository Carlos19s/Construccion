'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Cargar datos del localStorage al montar
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    const fetchMe = async () => {
      try {
        const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4001';
        const res = await fetch(GRAPHQL_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            query: `
              query {
                me {
                  id_usuario
                  nombre
                  email
                  id_rol
                  funciones { nombre }
                }
              }
            `
          })
        });
        const data = await res.json();
        if (data.data?.me && isMounted) {
          const fetchedUser = data.data.me;
          // Guardar funciones como array de strings para facilitar chequeos
          fetchedUser.permisos = fetchedUser.funciones?.map(f => f.nombre) || [];
          
          setUser(prevUser => {
            const newUser = { ...prevUser, ...fetchedUser };
            localStorage.setItem('user', JSON.stringify(newUser));
            return newUser;
          });
        }
      } catch (err) {
        console.error('Error polling me query:', err);
      }
    };

    fetchMe(); // fetch inmediatamente
    const interval = setInterval(fetchMe, 3000); // polling cada 3 segs

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [token]);

  const login = (tokenValue, userData) => {
    localStorage.setItem('token', tokenValue);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(tokenValue);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const isAdmin = () => user?.id_rol === 1;
  const isOperativo = () => user?.id_rol === 2;
  const isCliente = () => user?.id_rol === 3;
  const hasPermission = (perm) => user?.permisos?.includes(perm) || false;

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, isAdmin, isOperativo, isCliente, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}
