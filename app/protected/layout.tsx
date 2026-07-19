// app/(protected)/layout.tsx
import { AppShell } from '@mantine/core';
import SidebarWrapper from '@/components/SidebarWrapper';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell navbar={{ width: 300, breakpoint: 'sm' }} padding="md">
      <AppShell.Navbar>
        <SidebarWrapper />
      </AppShell.Navbar>
      <AppShell.Main>
        {children}
      </AppShell.Main>
    </AppShell>
  );
}