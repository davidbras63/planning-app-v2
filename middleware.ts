import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Définit les routes qui doivent être protégées
const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/protected(.*)']);

export default clerkMiddleware(async (auth, req) => {
  
  if (isProtectedRoute(req)) {
    const { userId: clerkId } = await auth();

    // 1. Si l'utilisateur n'est pas connecté, on le redirige vers l'accueil / sign-in
    if (!clerkId) {
      return NextResponse.redirect(new URL('/', req.url));
    }

    try {
      // 2. On va chercher l'utilisateur en base de données avec son clerkId
      const result = await db.select().from(users).where(eq(users.clerkId, clerkId));

      if (result.length === 0) {
        return NextResponse.redirect(new URL('/acces-refuse', req.url));
      }

      const user = result[0];
      // --- Bypass si statut 'elite' ---
	  if (user.status === 'elite') {
	    return NextResponse.next();
	  }
      // 3. Vérification de la période d'accès (periodEnd)
      const now = new Date();
      const periodEnd = user.periodEnd ? new Date(user.periodEnd) : null;

      // Si une date de fin existe et qu'elle est dépassée, on bloque l'accès
      if (periodEnd && periodEnd < now) {
        return NextResponse.redirect(new URL('/acces-refuse', req.url));
      }

    } catch (error) {
      // En cas d'erreur de requête BDD par sécurité on bloque ou on laisse passer selon ton choix, 
      // mais rediriger vers l'accès refusé évite les failles si la base plante.
      return NextResponse.redirect(new URL('/acces-refuse', req.url));
    }
  }
});

export const config = {
  matcher: [
    // Exclut les fichiers statiques, images et fichiers systèmes
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Autorise toujours les routes API ou tRPC
    '/(api|trpc)(.*)',
  ],
};
