import './globals.css';
import { AuthProvider } from '@/lib/auth';
import Navbar from '@/components/Navbar';

export const metadata = {
  title: 'Restaurante — Sistema de Gestión',
  description: 'Sistema integral de gestión de restaurante con catálogo, reservas, órdenes y reportes.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          <Navbar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
