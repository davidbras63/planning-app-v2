import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export default clerkMiddleware((auth, req) => {
  // On laisse passer toutes les requêtes sans forcer de redirection
  // C'est TrialGuard dans le layout qui gérera la sécurité maintenant
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Exclut les fichiers statiques et les routes internes de Next.js
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Toujours exécuter pour les routes API
    '/(api|trpc)(.*)',
  ],
};