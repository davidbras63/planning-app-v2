'use client';
import { AppShell } from '@mantine/core';
import SidebarWrapper from '@/components/SidebarWrapper';
import { useDisclosure } from '@mantine/hooks'; // Ajoute cet import

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const [opened, { toggle }] = useDisclosure(); // Gère l'état d'ouverture

  return (
    <AppShell
      header={{ height: 60 }} // Définit une hauteur pour le header
      navbar={{ 
        width: 300, 
        breakpoint: 'sm',
        collapsed: { mobile: !opened } // La logique d'affichage
      }} 
      padding="md"
    >
      <AppShell.Header>
        {/* Ajoute ici un bouton pour toggler la sidebar si besoin */}
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
