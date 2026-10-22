'use server';

import { auth, currentUser } from '@clerk/nextjs/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia' as any,
});

export async function actionCreateStripePortal() {
  const { userId } = await auth();
  if (!userId) throw new Error('Non autorisé');

  // Récupérer l'email de l'utilisateur connecté via Clerk
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress;

  if (!email) {
    console.error("Impossible de récupérer l'email de l'utilisateur Clerk");
    return null;
  }

  try {
    // Recherche du client Stripe par son adresse email (100% fiable)
    const customers = await stripe.customers.list({
      email: email,
      limit: 1,
    });

    const customer = customers.data[0];

    if (!customer) {
      console.error(`Aucun client Stripe trouvé pour l'email : ${email}`);
      return null;
    }

    // Création de la session du portail client Stripe
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://nesis-dev.vercel.app'}/protected/dashboard`,
    });

    return session.url;
  } catch (error) {
    console.error("Erreur lors de la création du portail Stripe :", error);
    return null;
  }
}