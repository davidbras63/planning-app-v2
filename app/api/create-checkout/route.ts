import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';
import { cookies } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia' as any,
});

export async function POST() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. On lit l'email ET le champ referredBy définis dans ton schema.ts
    const userRecord = await db
      .select({ 
        email: users.email,
        referredBy: users.referredBy 
      })
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1);

    let userEmail = userRecord[0]?.email;
    const dbReferredBy = userRecord[0]?.referredBy;

    if (!userEmail) {
      const clerkUser = await currentUser();
      userEmail = clerkUser?.primaryEmailAddress?.emailAddress;
    }

    if (!userEmail) {
      return NextResponse.json({ error: 'Utilisateur introuvable dans la base de données ou chez Clerk.' }, { status: 404 });
    }

    // 2. Récupération du code affilié (priorité au cookie, sinon valeur 'referred_by' en BDD)
    const cookieStore = await cookies();
    const cookieAffiliate = cookieStore.get('affiliate_ref')?.value;
    const affiliateRef = cookieAffiliate || dbReferredBy || '';

    const priceId = process.env.STRIPE_PRICE_ID;
    const siteUrl = 'https://nesis.fr';

    if (!priceId) {
      console.error('Erreur: STRIPE_PRICE_ID non configuré.');
      return NextResponse.json({ error: 'Configuration Stripe manquante' }, { status: 500 });
    }

    // 3. Injection directe dans Stripe metadata
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: userEmail,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${siteUrl}/protected/dashboard`,
      cancel_url: `${siteUrl}/protected/dashboard`,
      metadata: {
        user_id: userId,
        affiliate_ref: affiliateRef,
      },
      subscription_data: {
        metadata: {
          user_id: userId,
          affiliate_ref: affiliateRef,
        },
      },
    });

    console.log("REPONSE BRUTE STRIPE CHECKOUT:", JSON.stringify(session, null, 2));

    const checkoutUrl = session.url;

    if (!checkoutUrl) {
      return NextResponse.json({ error: 'URL de checkout introuvable dans la réponse' }, { status: 500 });
    }

    return NextResponse.json({ url: checkoutUrl });
  } catch (error: any) {
    console.error('Erreur critique route checkout:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur', details: error?.message }, { status: 500 });
  }
}