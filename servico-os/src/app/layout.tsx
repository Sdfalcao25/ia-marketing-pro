import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ServiçoOS — operação de serviços sem complicação',
  description: 'Clientes, orçamentos, ordens de serviço, cobranças e operação em um único sistema.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
