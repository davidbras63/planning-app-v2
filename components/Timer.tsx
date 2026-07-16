"use client";
import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';

export default function Timer() {
  const { user, isLoaded } = useUser();
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!isLoaded || !user) {
      // Pas connecté : on ne fait rien
      setIsActive(false);
      return;
    }

    // Récupère le statut depuis les métadonnées de l'utilisateur (Clerk)
    // On suppose que tu as une clé "subscriptionStatus" ou similaire
    const status = user.publicMetadata?.subscriptionStatus as string;

    // Logique :
    // - Si statut est "active" (payé) -> on n'affiche rien (return null dans le rendu)
    // - Si statut est "trial" ou indéfini -> le timer tourne
    if (status === 'active') {
      setIsActive(false);
    } else {
      setIsActive(true);
    }
  }, [user, isLoaded]);

  // Si pas chargé, pas connecté, ou si statut "active" : on n'affiche rien
  if (!isLoaded || !user || !isActive) {
    return null;
  }

  return (
    <div>
      {/* Ton code d'affichage du timer ici */}
      <p>Temps restant : ...</p>
    </div>
  );
}
