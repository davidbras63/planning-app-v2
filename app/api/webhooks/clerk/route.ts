import { db } from "@/db";
import { users, links } from "@/db/schema";
import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

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
    const data = evt.data as any;
    const clerkId = data.id;
    const email = data.email_addresses?.[0]?.email_address;
    
    // Récupération du code/slug de parrainage depuis les metadata Clerk
    const referralCode = data.public_metadata?.referral_code || data.unsafe_metadata?.referral_code || null;

    if (!clerkId || !email) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 3);

    try {
      // 1. Insertion en base de l'utilisateur avec son éventuel code de parrainage (referred_by)
      await db.insert(users)
        .values({
          clerkId: clerkId,
          email: email,
          status: 'trial',
          periodEnd: trialEndDate,
          referredBy: referralCode,
        } as any)
        .onConflictDoUpdate({
          target: users.clerkId,
          set: {
            email: email,
            referredBy: referralCode,
          },
        });
      console.log("Utilisateur inséré avec succès dans Neon avec son code de parrainage !");

      // 2. Envoi du mail de bienvenue avec le lien sandbox d'Affilibee en dur
      try {
        const testAffiliateUrl = "https://affilibee.com/landing-pages/nesis/nesis";

        await resend.emails.send({
          from: 'Nesis <contact@nesis.fr>',
          to: email,
          subject: 'Bienvenue chez Nesis - Votre programme d\'affiliation',
          text: `Bienvenue chez Nesis !\n\nVotre compte a bien été créé.\n\nSi vous souhaitez rejoindre notre programme d'affiliation, vous pouvez utiliser ce lien : ${testAffiliateUrl}\n\nÀ très vite !`
        });
        console.log("Mail de bienvenue envoyé à", email);
      } catch (emailError) {
        console.error("Erreur Envoi Mail:", emailError);
      }

    } catch (dbError) {
      console.error("Erreur BDD:", dbError);
      return NextResponse.json({ error: "DB Error" }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}