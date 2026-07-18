'use client';
import TrialGuard from '@/components/TrialGuard';
import { Sidebar } from '@/components/Sidebar'; // Vérifie le chemin exact ici

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <TrialGuard>
      <div style={{ display: 'flex' }}>
        <Sidebar /> {/* On remet la barre ici */}
        <main style={{ flex: 1 }}>{children}</main>
      </div>
    </TrialGuard>
  );
}