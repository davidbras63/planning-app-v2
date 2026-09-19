import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db'; 
import { users, links } from '@/db/schema'; 
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Récupération du statut et de la période dans la table 'users'
    const dbUser = await db
      .select({
        status: users.status,
        periodEnd: users.periodEnd,
      })
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1);

    if (!dbUser || dbUser.length === 0) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    // Récupération de l'URL du portail client dans la table 'links'
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