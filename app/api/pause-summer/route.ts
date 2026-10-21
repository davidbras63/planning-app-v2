import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia' as any,
});

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

    // 2. Sécurité : le statut DOIT être strictly 'active'
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
    const currentYear = new Date().getFullYear();
    // const now = new Date();
    // const june25 = new Date(currentYear, 5, 25);
    // const august31 = new Date(currentYear, 7, 31);
    // if (now < june25 || now > august31) {
    //   return NextResponse.json(
    //     { error: 'La pause estivale est disponible uniquement entre le 25 juin et le 31 août.' },
    //     { status: 400 }
    //   );
    // }

    // 4. Récupérer dynamiquement l'abonnement Stripe via l'email du client
    const customers = await stripe.customers.list({
      email: dbUser.email,
      limit: 1,
    });

    if (customers.data.length === 0) {
      return NextResponse.json({ error: 'Aucun client Stripe trouvé pour cet email.' }, { status: 404 });
    }

    const customerId = customers.data[0].id;

    // Recherche des abonnements actifs pour ce client Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return NextResponse.json({ error: 'Aucun abonnement actif trouvé chez Stripe pour cet email.' }, { status: 404 });
    }

    const activeSubscription = subscriptions.data[0];
    const subscriptionId = activeSubscription.id;

    // 5. Calcul des dates cibles (Reprise le 3 septembre et échéance le 5 septembre)
    const resumeTimestamp = Math.floor(new Date(`${currentYear}-09-03T00:00:00Z`).getTime() / 1000);
    const targetDate = `${currentYear}-09-05T00:00:00Z`;

    // 6. Appel à l'API Stripe pour mettre en pause l'abonnement jusqu'au 3 septembre
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      pause_collection: {
        behavior: 'keep_as_draft', // ou 'void' selon vos préférences d'affichage de factures
        resumes_at: resumeTimestamp,
      },
    });

    console.log('Succès Stripe (Abonnement mis en pause) :');
    console.log(JSON.stringify(updatedSubscription, null, 2));

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