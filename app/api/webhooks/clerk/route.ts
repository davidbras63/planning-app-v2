import { db } from "@/db";
import { users } from "@/db/schema";
import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { headers, cookies } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    throw new Error("Veuillez ajouter WEBHOOK_SECRET dans votre .env");
  }

  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occured -- no svix headers", { status: 400 });
  }

  const body = await req.text();
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Erreur de vérification:", err);
    return new Response("Error occured", { status: 400 });
  }

  if (evt.type === 'user.created') {
    const { id: clerkId, email_addresses, unsafe_metadata } = evt.data as any;
    const email = email_addresses[0]?.email_address;

    if (!clerkId || !email) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    // 1. On cherche la référence dans unsafeMetadata
    let referredBy = unsafe_metadata?.referredBy || unsafe_metadata?.affiliate || null;

    // 2. Si pas trouvé dans metadata, fallback sur le cookie affiliate_ref
    if (!referredBy) {
      try {
        const cookieStore = await cookies();
        referredBy = cookieStore.get('affiliate_ref')?.value || null;
      } catch (e) {
        console.log("Impossible de lire les cookies dans le webhook:", e);
      }
    }

    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 3);

    try {
      await db.insert(users)
        .values({
          clerkId: clerkId,
          email: email,
          status: 'trial',
          periodEnd: trialEndDate,
          referredBy: referredBy,
        })
        .onConflictDoUpdate({
          target: users.clerkId,
          set: {
            email: email,
            ...(referredBy ? { referredBy: referredBy } : {}),
          },
        });
      console.log(`Utilisateur ${email} inséré dans Neon avec succès ! (Parrain: ${referredBy || 'aucun'})`);
    } catch (dbError) {
      console.error("Erreur BDD:", dbError);
      return NextResponse.json({ error: "DB Error" }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}