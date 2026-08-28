import { NextResponse } from 'next/server';
import { db } from '@/db'; // Adapte le chemin vers ton instance db si besoin
import { users } from '@/db/schema';
import { and, notEq, lt } from 'drizzle-orm';

export async function GET(request: Request) {
  // Sécurisation : vérification de la clé secrète envoyée par Vercel Cron
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    // Calcul de la date d'il y a 30 jours
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Suppression des utilisateurs dont le statut n'est pas 'active' 
    // et dont la période (periodEnd) a expiré depuis plus de 30 jours
    const deletedUsers = await db
      .delete(users)
      .where(
        and(
          notEq(users.status, 'active'),
          lt(users.periodEnd, thirtyDaysAgo)
        )
      )
      .returning({ id: users.id });

    return NextResponse.json({
      success: true,
      message: `${deletedUsers.length} comptes inactifs de plus de 30 jours supprimés avec succès.`,
    });
  } catch (error) {
    console.error('Erreur lors du nettoyage des utilisateurs:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
