import TrialGuard from '@/components/TrialGuard';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <TrialGuard>
      {children}
    </TrialGuard>
  );
}