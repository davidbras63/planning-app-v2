'use server';

import { auth } from '@clerk/nextjs/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia' as any,
});

export async function actionCreateStripePortal() {
  const { userId } = await auth();
  if (!userId) throw new Error('Non autorisé');

  try {
    // 1. Rechercher le client Stripe via le clerkId stocké dans les métadonnées Stripe
    const customers = await stripe.customers.list({
      limit: 1,
    });

    // Filtrer par metadata clerkId
    const customer = customers.data.find(
      (cust) => cust.metadata && cust.metadata.clerkId === userId
    );

    if (!customer) {
      throw new Error("Aucun client Stripe trouvé pour cet utilisateur.");
    }

    // 2. Créer la session du portail client Stripe
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://nesis.fr'}/protected/dashboard`,
    });

    return session.url;
  } catch (error) {
    console.error("Erreur lors de la création du portail Stripe :", error);
    return null;
  }
}