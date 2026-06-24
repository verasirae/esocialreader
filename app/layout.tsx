import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppLayout } from '@/components/AppLayout';
import { ModalProvider } from '@/lib/contexts/ModalContext';
import { AuthProvider } from '@/lib/contexts/AuthContext';
import { EmpresaProvider } from '@/lib/contexts/EmpresaContext';
import { RegisterEmpresaModal } from '@/components/RegisterEmpresaModal';
import { RegisterTrabalhadorModal } from '@/components/RegisterTrabalhadorModal';
import { RegisterOperadoraModal } from '@/components/RegisterOperadoraModal';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
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
          <AuthProvider>
            <EmpresaProvider>
              <RegisterEmpresaModal />
              <RegisterTrabalhadorModal />
              <RegisterOperadoraModal />
              <AppLayout>{children}</AppLayout>
            </EmpresaProvider>
          </AuthProvider>
        </ModalProvider>
      </body>
    </html>
  );
}
