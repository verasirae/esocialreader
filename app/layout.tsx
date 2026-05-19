import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { ModalProvider } from '@/lib/contexts/ModalContext';
import { RegisterEmpresaModal } from '@/components/RegisterEmpresaModal';
import { RegisterTrabalhadorModal } from '@/components/RegisterTrabalhadorModal';
import { RegisterOperadoraModal } from '@/components/RegisterOperadoraModal';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'S-5002 Compliance Engine',
  description: 'Sistema de auditoria fiscal e geração de Informe de Rendimentos',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable}`}>
      <body suppressHydrationWarning className="font-sans antialiased text-on-surface">
        <ModalProvider>
          <RegisterEmpresaModal />
          <RegisterTrabalhadorModal />
          <RegisterOperadoraModal />
          <div className="flex min-h-screen bg-background">
            <Sidebar />
            <div className="ml-64 flex flex-col flex-1">
              <TopBar />
              <main className="p-margin-page flex-1">
                {children}
              </main>
            </div>
          </div>
        </ModalProvider>
      </body>
    </html>
  );
}
