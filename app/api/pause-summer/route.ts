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

    // 1. Récupérer l'utilisateur en base pour avoir son email et son statut
    const userRecord = await db
      .select({
        email: users.email,
        status: users.status
      })
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1);

    const dbUser = userRecord[0];

    if (!dbUser) {
      return NextResponse.json({ error: 'Utilisateur introuvable en base.' }, { status: 404 });
    }

    // 2. Sécurité : le statut DOIT être strictement 'active'
    if (dbUser.status !== 'active') {
      return NextResponse.json(
        { error: 'Votre abonnement doit être actif pour pouvoir bénéficier de la pause estivale.' },
        { status: 403 }
      );
    }

    if (!dbUser.email) {
      return NextResponse.json({ error: 'Aucun email associé à ce compte.' }, { status: 400 });
    }

    // 3. Vérification de la période (MIS EN COMMENTAIRE POUR LE TEST)
    // const now = new Date();
    // const currentYear = now.getFullYear();
    // const june25 = new Date(currentYear, 5, 25);
    // const august31 = new Date(currentYear, 7, 31);
    // if (now < june25 || now > august31) {
    // return NextResponse.json(
    // { error: 'La pause estivale est disponible uniquement entre le 25 juin et le 31 août.' },
    // { status: 400 }
    // );
    // }

    const now = new Date();
    const currentYear = now.getFullYear();

    // 4. Récupérer dynamiquement l'abonnement Lemon Squeezy via l'email de l'utilisateur
    const listRes = await fetch(`https://api.lemonsqueezy.com/v1/subscriptions?filter[user_email]=${encodeURIComponent(dbUser.email)}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
      },
    });

    const listData = await listRes.json();

    if (!listRes.ok || !listData.data || listData.data.length === 0) {
      console.error('Erreur recherche abonnement Lemon Squeezy par email:', listData);
      return NextResponse.json({ error: 'Aucun abonnement actif trouvé chez Lemon Squeezy pour cet email.' }, { status: 404 });
    }

    // On cherche explicitement l'abonnement actif pour éviter les vieux profils morts
	const activeSubscription = listData.data.find(
	  (sub: any) => sub.attributes && sub.attributes.status === 'active'
	);

	if (!activeSubscription) {
	  return NextResponse.json({ error: 'Aucun abonnement actif trouvé chez Lemon Squeezy pour cet email.' }, { status: 404 });
	}

	const subscriptionId = activeSubscription.id;

    // 5. Calcul de la date cible pour le 5 septembre dynamique
    const targetDate = `${currentYear}-09-05T00:00:00Z`;

    // 6. Appel à l'API Lemon Squeezy pour mettre en pause l'abonnement
    const lsResponse = await fetch(`https://api.lemonsqueezy.com/v1/subscriptions/${subscriptionId}`, {
      method: 'PATCH',
      headers: {
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
      },
      body: JSON.stringify({
        data: {
          type: 'subscriptions',
          id: subscriptionId,
          attributes: {
            pause: {
              mode: 'free',
              resumes_at: targetDate,
            },
          },
        },
      }),
    });

    const responseData = await lsResponse.json();

    if (!lsResponse.ok) {
      console.error('Erreur API Lemon Squeezy:', JSON.stringify(responseData, null, 2));
      return NextResponse.json({ error: 'Erreur lors de la communication avec Lemon Squeezy.', details: responseData }, { status: 500 });
    }

    console.log('Succes Lemon Squeezy (JSON brut) :');
    console.log(JSON.stringify(responseData, null, 2));

    // 7. Mise à jour de la base de données locale
    await db
      .update(users)
      .set({
        status: 'summer_paused',
        periodEnd: new Date(targetDate),
      })
      .where(eq(users.clerkId, userId));

    return NextResponse.json({ success: true, message: 'Pause estivale activée jusqu\'au 5 septembre.' });
  } catch (error: any) {
    console.error('Erreur critique route pause-summer:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur', details: error?.message }, { status: 500 });
  }
}
