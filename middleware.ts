import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export default clerkMiddleware((auth, req) => {
  const { userId } = auth();
  const path = req.nextUrl.pathname;

  // On laisse passer l'accueil et les webhooks/fichiers statiques
  if (path === '/' || path.startsWith('/api/webhooks')) {
    return NextResponse.next();
  }

  // Si on n'est pas connecté et qu'on essaie d'aller ailleurs
  if (!userId) {
    // On redirige vers l'accueil en ajoutant un "flag" d'alerte dans l'URL
    const loginUrl = new URL('/', req.url);
    loginUrl.searchParams.set('auth_alert', 'true');
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
