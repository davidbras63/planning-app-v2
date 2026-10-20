import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Définit les routes qui doivent être protégées
const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/protected(.*)']);

export default clerkMiddleware(async (auth, req) => {
  const url = req.nextUrl;
  
  // 1. Capture immédiate du paramètre d'affiliation dans l'URL (affiliate ou via)
  const affiliateParam = url.searchParams.get('affiliate') || url.searchParams.get('via');
  
  // 🔍 TRACE DE CONTRÔLE : On regarde si le middleware capte bien quelque chose
  console.log('🚨 [MIDDLEWARE TEST] URL complète : ', url.toString());
  console.log('🚨 [MIDDLEWARE TEST] Paramètre capturé : ', affiliateParam);

  // On prépare la réponse de base
  let res = NextResponse.next();

  // Si on trouve un paramètre d'affiliation dans l'URL, on le pose dans un cookie pour 30 jours
  if (affiliateParam) {
    res.cookies.set('affiliate_ref', affiliateParam, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 jours
      sameSite: 'lax',
    });
    console.log('🎯 [MIDDLEWARE TEST] Cookie "affiliate_ref" posé avec succès pour :', affiliateParam);
  }
  
  // 🚪 GARANTIE DE RETOUR À L'ACCUEIL : On laisse toujours passer la racine '/' sans blocage
  if (url.pathname === '/') {
    return res;
  }
  
  if (isProtectedRoute(req)) {
    const { userId: clerkId } = await auth();

    // Si l'utilisateur n'est pas connecté, on le redirige vers l'accueil / sign-in (en conservant les cookies de la réponse)
    if (!clerkId) {
      const redirectRes = NextResponse.redirect(new URL('/', req.url));
      if (affiliateParam) {
        redirectRes.cookies.set('affiliate_ref', affiliateParam, { path: '/', maxAge: 60 * 60 * 24 * 30, sameSite: 'lax' });
      }
      return redirectRes;
    }

    try {
      // On va chercher l'utilisateur en base de données avec son clerkId
      const result = await db.select().from(users).where(eq(users.clerkId, clerkId));

      if (result.length === 0) {
        return NextResponse.redirect(new URL('/acces-refuse', req.url));
      }

      const user = result[0];
      
      // --- Bypass si statut 'elite' ---
      if (user.status === 'elite') {
        return res;
      }
      
      // Vérification de la période d'accès (periodEnd)
      const now = new Date();
      const periodEnd = user.periodEnd ? new Date(user.periodEnd) : null;

      if (periodEnd && periodEnd < now) {
        return NextResponse.redirect(new URL('/acces-refuse', req.url));
      }

    } catch (error) {
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