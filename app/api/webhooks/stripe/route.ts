import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { handleStripeWebhook } from '../../../actions/subscriptions';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia' as any,
});

export async function POST(req: Request) {
  try {
    console.log("--- 1. WEBHOOK REÇU ---");
    const bodyText = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      console.log("--- ERREUR : Signature manquante ---");
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      console.log("--- ERREUR : Secret Stripe non configuré ---");
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(bodyText, signature, secret);
    } catch (err: any) {
      console.log("--- ERREUR : Signature invalide ---", err.message);
      return NextResponse.json({ error: `Invalid signature: ${err.message}` }, { status: 400 });
    }

    console.log("--- 2. SIGNATURE OK, PARSING ---");

    console.log("--- 3. APPEL DE SUBSCRIPTIONS.TS ---");
    await handleStripeWebhook(event);

    console.log("--- 4. WEBHOOK TRAITÉ AVEC SUCCÈS ---");
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    console.error("--- ERREUR CRITIQUE CATCH ---", error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}