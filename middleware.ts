import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)']);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = auth();

  // 1. Si on est sur une route protégée et qu'on n'est pas connecté
  if (isProtectedRoute(req) && !userId) {
    return NextResponse.redirect(new URL('/sign-in', req.url));
  }

  // 2. Si connecté, on vérifie le statut dans Supabase
  if (userId) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // Utilise la clé service_role côté serveur
    );

    const { data: userStatus } = await supabase
      .from('user_status')
      .select('status, subscription_expires_at')
      .eq('user_id', userId)
      .single();

    const now = new Date();
    const expiresAt = userStatus?.subscription_expires_at ? new Date(userStatus.subscription_expires_at) : null;

    // 3. Logique de blocage : si l'essai est expiré et qu'on n'est pas déjà sur la page de paiement
    if (expiresAt && now > expiresAt && !req.nextUrl.pathname.startsWith('/protected/subscription')) {
      return NextResponse.redirect(new URL('/protected/subscription', req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Exclut les fichiers statiques et les images de la vérification middleware
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    '/(api|trpc)(.*)',
  ],
};

