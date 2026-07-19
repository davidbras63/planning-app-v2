'use client';
import { AppShell } from '@mantine/core';
import SidebarWrapper from '@/components/SidebarWrapper';
import { useDisclosure } from '@mantine/hooks';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const [opened, { toggle }] = useDisclosure();

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ 
        width: 300, 
        breakpoint: 'sm',
        collapsed: { mobile: !opened } 
      }}
      padding="md"
    >
      <AppShell.Header>
        <button onClick={toggle}>Menu</button>
      </AppShell.Header>
      
      <AppShell.Navbar>
        <SidebarWrapper />
      </AppShell.Navbar>
      
      <AppShell.Main>
        {children}
      </AppShell.Main>
    </AppShell>
  );
}
