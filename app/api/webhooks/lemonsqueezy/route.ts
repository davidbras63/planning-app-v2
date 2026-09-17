import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { handleLemonSqueezyWebhook } from '@/app/actions/subscriptions';

export async function POST(req: Request) {
  try {
    console.log("--- 1. WEBHOOK REÇU ---");
    const bodyText = await req.text();
    const signature = req.headers.get('x-signature');

    if (!signature) {
      console.log("--- ERREUR : Signature manquante ---");
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    if (!secret) {
      console.log("--- ERREUR : Secret Lemon Squeezy non configuré ---");
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    const hmac = crypto.createHmac('sha256', secret);
    const digest = hmac.update(bodyText).digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
      console.log("--- ERREUR : Signature invalide ---");
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log("--- 2. SIGNATURE OK, PARSING ---");
    const event = JSON.parse(bodyText);
    
    console.log("--- 3. APPEL DE SUBSCRIPTIONS.TS ---");
    await handleLemonSqueezyWebhook(event);

    console.log("--- 4. WEBHOOK TRAITÉ AVEC SUCCÈS ---");
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    console.error("--- ERREUR CRITIQUE CATCH ---", error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
