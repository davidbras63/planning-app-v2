'use client';

import { AppShell } from '@mantine/core';
import Sidebar from '@/components/Sidebar';
import { useDisclosure } from '@mantine/hooks';
import TrialGuard from '@/components/TrialGuard';
import { OnboardingGuide } from '@/components/OnboardingGuide';
import { useEffect } from 'react';
import { getUserCustomization } from '@/app/actions/customization';
import { processReferral } from '@/app/actions/referral'; // <-- Import de l'action

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const [opened, { toggle }] = useDisclosure();

  useEffect(() => {
    // 0. On déclenche l'enregistrement du parrainage dès l'arrivée sur le dashboard
    processReferral();

    // 1. On va chercher en base Neon au chargement pour synchroniser le localStorage
    async function loadFromDB() {
      try {
        const data = await getUserCustomization();
        if (data) {
          if (data.bgColor) localStorage.setItem('nesis_bg_color', data.bgColor);
          if (data.bgImage) localStorage.setItem('nesis_bg_image', data.bgImage);
          if (data.bgZoom) localStorage.setItem('nesis_bg_zoom', data.bgZoom);
        }
      } catch (e) {
        console.error("Erreur chargement BDD, utilisation du localStorage", e);
      }
      updateBackground();
    }

    const updateBackground = () => {
      const color = localStorage.getItem('nesis_bg_color') || '';
      const image = localStorage.getItem('nesis_bg_image') || '';
      const zoom = localStorage.getItem('nesis_bg_zoom') || 'cover';

      if (typeof document !== 'undefined') {
        const root = document.documentElement;
        root.style.setProperty('--nesis-bg-color', color || '#1a1b1e');
        root.style.setProperty('--nesis-bg-image', image ? `url(${image})` : 'none');
        root.style.setProperty('--nesis-bg-zoom', zoom);
      }
    };

    loadFromDB();

    window.addEventListener('storage', updateBackground);
    window.addEventListener('bg-updated', updateBackground);

    return () => {
      window.removeEventListener('storage', updateBackground);
      window.removeEventListener('bg-updated', updateBackground);
    };
  }, []);

  return (
    <TrialGuard>
      <AppShell
        navbar={{
          width: 300,
          breakpoint: 'sm',
          collapsed: { mobile: !opened },
        }}
        padding="md"
      >
        <AppShell.Navbar>
          <Sidebar />
        </AppShell.Navbar>
        
        <AppShell.Main style={{ minHeight: '100vh' }}>
          {children}
          <OnboardingGuide />
        </AppShell.Main>
      </AppShell>
    </TrialGuard>
  );
}