import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Définit les routes qui doivent être protégées
const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/protected(.*)']);

export default clerkMiddleware(async (auth, req) => {
  const url = req.nextUrl;
  const affiliateCode = url.searchParams.get('affiliate') || url.searchParams.get('via');

  let res = NextResponse.next();

  // 1. Si un code parrain est présent dans l'URL, on pose le cookie pour 30 jours
  if (affiliateCode) {
    res.cookies.set('affiliate_ref', affiliateCode, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
  }

  if (isProtectedRoute(req)) {
    const { userId: clerkId } = await auth();

    // 2. Si l'utilisateur n'est pas connecté, on le redirige vers l'accueil / sign-in
    if (!clerkId) {
      return NextResponse.redirect(new URL('/', req.url));
    }

    try {
      // 3. On va chercher l'utilisateur en base de données avec son clerkId
      const result = await db.select().from(users).where(eq(users.clerkId, clerkId));

      if (result.length === 0) {
        return NextResponse.redirect(new URL('/acces-refuse', req.url));
      }

      const user = result[0];
      // --- Bypass si statut 'elite' ---
      if (user.status === 'elite') {
        return res;
      }
      
      // 4. Vérification de la période d'accès (periodEnd)
      const now = new Date();
      const periodEnd = user.periodEnd ? new Date(user.periodEnd) : null;

      // Si une date de fin existe et qu'elle est dépassée, on bloque l'accès
      if (periodEnd && periodEnd < now) {
        return NextResponse.redirect(new URL('/acces-refuse', req.url));
      }

    } catch (error) {
      // En cas d'erreur de requête BDD par sécurité on bloque
      return NextResponse.redirect(new URL('/acces-refuse', req.url));
    }
  }

  return res;
});

export const config = {
  matcher: [
    // Exclut les fichiers statiques, images et fichiers systèmes
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Autorise toujours les routes API ou tRPC
    '/(api|trpc)(.*)',
  ],
};