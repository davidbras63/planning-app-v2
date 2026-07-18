'use client';
import TrialGuard from '@/components/TrialGuard';
import Sidebar from '@/components/Sidebar';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <TrialGuard>
      <div style={{ display: 'flex', width: '100%', height: '100vh' }}>
        {/* On affiche la Sidebar à gauche */}
        <div style={{ width: '250px', flexShrink: 0 }}>
          <Sidebar />
        </div>
        {/* Le contenu de tes pages s'affiche ici à droite */}
        <main style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </TrialGuard>
  );
}
