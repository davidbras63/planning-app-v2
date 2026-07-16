// lib/fakeAuth.ts

// Change cette valeur sur "true" quand tu voudras utiliser le VRAI Clerk
const USE_REAL_CLERK = false; 

export function useMockUser(realClerkUser: any, realIsLoaded: boolean) {
  // Si on veut le vrai clerk et qu'il est chargé, on l'utilise
  if (USE_REAL_CLERK && realIsLoaded) {
    return { user: realClerkUser, isLoaded: true };
  }

  // Sinon, on simule un utilisateur connecté pour pas que l'application bloque
  return {
    isLoaded: true,
    user: {
      id: "user_fake_id_12345",
      firstName: "Dev",
      lastName: "Test",
      primaryEmailAddress: { emailAddress: "test@dev.com" }
    }
  };
}
