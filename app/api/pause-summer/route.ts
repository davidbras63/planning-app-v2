import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Récupérer l'utilisateur et son statut en base + son ID d'abonnement
    const userRecord = await db
      .select({
        subscriptionId: users.lemonSqueezySubscriptionId,
        status: users.status
      })
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1);

    const dbUser = userRecord[0];

    if (!dbUser) {
      return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 });
    }

    // 2. Sécurité : le statut DOIT être strictement 'active'
    if (dbUser.status !== 'active') {
      return NextResponse.json(
        { error: 'Votre abonnement doit être actif pour pouvoir bénéficier de la pause estivale.' },
        { status: 403 }
      );
    }

    if (!dbUser.subscriptionId) {
      return NextResponse.json({ error: 'Aucun abonnement valide associé à ce compte.' }, { status: 400 });
    }

    // 3. Vérification dynamique de la date (>= 25 juin de l'année en cours)
    const now = new Date();
    const currentYear = now.getFullYear();
    const june25 = new Date(currentYear, 5, 25); // Mois 5 = Juin
    const august31 = new Date(currentYear, 7, 31); // Mois 7 = Août

    // ASTUCE TEST : Si tu veux tester en dehors de la période, commente temporairement la ligne du dessous
    //if (now < june25 || now > august31) {
      //return NextResponse.json(
        //{ error: 'La pause estivale est disponible uniquement entre le 25 juin et le 31 août.' },
        //{ status: 400 }
      //);
    //}

    // 4. Calcul de la date cible pour le 5 septembre dynamique
    const targetDate = `${currentYear}-09-05T00:00:00Z`;

    // 5. Appel à l'API Lemon Squeezy pour reporter la facturation au 5 septembre
    const lsResponse = await fetch(`https://api.lemonsqueezy.com/v1/subscriptions/${dbUser.subscriptionId}`, {
      method: 'PATCH',
      headers: {
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
      },
      body: JSON.stringify({
        data: {
          type: 'subscriptions',
          id: dbUser.subscriptionId,
          attributes: {
            trial_ends_at: null,
            renews_at: targetDate,
          },
        },
      }),
    });

    const responseData = await lsResponse.json();

    if (!lsResponse.ok) {
      console.error('Erreur API Lemon Squeezy:', responseData);
      return NextResponse.json({ error: 'Erreur lors de la communication avec Lemon Squeezy.', details: responseData }, { status: 500 });
    }

    console.log('Succès Lemon Squeezy:', responseData);

    // 6. Mise à jour de la base de données locale
    await db
      .update(users)
      .set({
        status: 'summer_paused',
        periodEnd: new Date(targetDate),
      })
      .where(eq(users.clerkId, userId));

    return NextResponse.json({ success: true, message: 'Pause estivale activée jusqu\'au 5 septembre.' });
  } catch (error) {
    console.error('Erreur critique route pause-summer:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
