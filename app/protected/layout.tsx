'use client';
import TrialGuard from '@/components/TrialGuard';
import { MantineProvider } from '@mantine/core'; // Assure-toi que Mantine est là
import '@mantine/core/styles.css'; 
import Sidebar from '@/components/Sidebar';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider> {/* On remet Mantine ici pour que Sidebar s'affiche bien */}
      <TrialGuard>
        <div style={{ display: 'flex' }}>
          <Sidebar />
          <main style={{ flex: 1 }}>{children}</main>
        </div>
      </TrialGuard>
    </MantineProvider>
  );
}