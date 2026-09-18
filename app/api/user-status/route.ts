import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db'; // Si ton fichier db est à la racine, ajuste si besoin (ex: '@/db/index')
import { users } from '@/db/schema'; // D'après ton schéma, la table s'appelle bien 'users'
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // On va chercher directement dans ta table 'users' du schéma
    const dbUser = await db
      .select({
        status: users.status,
        periodEnd: users.periodEnd,
        // S'il n'y a pas de colonne customerPortalUrl dans ta table users, 
        // tu récupères le lien Lemon Squeezy dans ta table 'links' par exemple :
      })
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1);

    if (!dbUser || dbUser.length === 0) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    // Si tu stockes le lien du portail dans la table 'links' que tu as définie :
    const userLink = await db
      .select({
        url: links.url,
      })
      .from(links)
      .where(eq(links.clerkId, userId))
      .limit(1);

    return NextResponse.json({
      status: dbUser[0].status,
      periodEnd: dbUser[0].periodEnd,
      customerPortalUrl: userLink[0]?.url || null,
    });
  } catch (error) {
    console.error('Erreur API user-status :', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}