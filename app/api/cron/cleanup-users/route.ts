import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { and, ne, lt } from 'drizzle-orm';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const deletedUsers = await db
      .delete(users)
      .where(
        and(
          ne(users.status, 'active'),
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
