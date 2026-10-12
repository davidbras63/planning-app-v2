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
          referredBy: referralCode, // On persiste le slug ici pour l'utiliser lors du paiement
        } as any)
        .onConflictDoUpdate({
          target: users.clerkId,
          set: {
            email: email,
            referredBy: referralCode,
          },
        });
      console.log("Utilisateur inséré avec succès dans Neon avec son code de parrainage !");

      // 2. Appel à Affilibee pour enregistrer le lead / générer son propre lien d'affilié
      try {
        const payload: any = {
          email: email,
          external_id: clerkId,
        };
        if (referralCode) {
          payload.referral_code = referralCode;
        }

        const affilibeeResponse = await fetch("https://affilibee.com/api/v1/affiliates", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.AFFILIBEE_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (affilibeeResponse.ok) {
          const affilibeeData = await affilibeeResponse.json();
          const referralLink = affilibeeData.referral_link || affilibeeData.url;

          if (referralLink) {
            // Stockage de l'URL dans la table links
            await db.insert(links).values({
              clerkId: clerkId,
              label: "Mon lien de parrainage",
              url: referralLink,
            });
            console.log("Lien de parrainage inséré dans la table links !");

            // Envoi du mail de bienvenue avec son lien de parrainage personnel
            await resend.emails.send({
              from: 'Nesis <contact@nesis.fr>',
              to: email,
              subject: 'Bienvenue chez Nesis - Votre lien de parrainage',
              text: `Bienvenue chez Nesis !\n\nVotre compte a bien été créé.\n\nVoici votre lien de parrainage personnel : ${referralLink}\n\nÀ très vite !`
            });
            console.log("Mail de bienvenue envoyé à", email);
          }
        } else {
          console.error("Erreur API Affilibee:", await affilibeeResponse.text());
        }
      } catch (affilibeeError) {
        console.error("Erreur Affilibee:", affilibeeError);
      }

    } catch (dbError) {
      console.error("Erreur BDD:", dbError);
      return NextResponse.json({ error: "DB Error" }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}