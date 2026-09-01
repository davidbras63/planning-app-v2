'use client';

import { AppShell } from '@mantine/core';
import Sidebar from '@/components/Sidebar';
import { useDisclosure } from '@mantine/hooks';
import TrialGuard from '@/components/TrialGuard';
import { OnboardingGuide } from '@/components/OnboardingGuide';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const [opened, { toggle }] = useDisclosure();

  return (
    <TrialGuard>
      <AppShell
        header={{ height: 60 }}
        navbar={{
          width: 300,
          breakpoint: 'sm',
          collapsed: { mobile: !opened },
        }}
        padding="md"
      >
        <AppShell.Header>
          <button onClick={toggle}>Menu</button>
        </AppShell.Header>
        <AppShell.Navbar>
          <Sidebar />
        </AppShell.Navbar>
        <AppShell.Main>
          {children}
          <OnboardingGuide />
        </AppShell.Main>
      </AppShell>
    </TrialGuard>
  );
}

