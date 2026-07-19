'use client';
import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';

export default function SidebarWrapper() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null; // Le build serveur verra juste "rien", donc pas d'erreur
  }

  return <Sidebar />;
}
