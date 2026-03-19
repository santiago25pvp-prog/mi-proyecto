import './globals.css';
import { Toaster } from 'sonner';

export const metadata = {
  title: 'Mi Proyecto SPA',
  description: 'Sistema de Chat RAG',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
