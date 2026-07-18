import Sidebar from '@/components/Sidebar';
import TrialGuard from '@/components/TrialGuard';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex' }}>
      {/* La Sidebar reste toujours affichée, peu importe l'état de connexion */}
      <Sidebar />
      
      {/* Le TrialGuard ne gère que le contenu de droite (main) */}
      <main style={{ flex: 1 }}>
        <TrialGuard>
          {children}
        </TrialGuard>
      </main>
    </div>
  );
}