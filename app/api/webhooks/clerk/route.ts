import { db } from "@/db";
import { users } from "@/db/schema";
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
    const { id: clerkId, email_addresses } = evt.data as any;
    const email = email_addresses[0]?.email_address;

    if (!clerkId || !email) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 3);

    try {
      // 1. Insertion utilisateur standard
      await db.insert(users)
        .values({
          clerkId: clerkId,
          email: email,
          status: 'trial',
          periodEnd: trialEndDate
        })
        .onConflictDoUpdate({
          target: users.clerkId,
          set: {
            email: email
          },
        });
      console.log("Utilisateur inséré avec succès dans Neon !");

      // 2. Envoi de l'email pour devenir affilié via la page Affilibee
      if (process.env.RESEND_API_KEY) {
        const affiliateSignupUrl = "https://affilibee.com/landing-pages/nesis/my-first-landing-page";

        await resend.emails.send({
          from: 'Nesis <no-reply@nesis.app>',
          to: email,
          subject: 'Bienvenue sur Nesis - Devenez affilié',
          html: `
            <div style="font-family: sans-serif; line-height: 1.6;">
              <h2>Bienvenue !</h2>
              <p>Votre compte a été créé avec succès.</p>
              <p>Si vous souhaitez rejoindre notre programme d'affiliation et parrainer des utilisateurs, inscrivez-vous en cliquant sur le lien ci-dessous :</p>
              <p><a href="${affiliateSignupUrl}" style="background: #0070f3; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">Rejoindre le programme d'affiliation</a></p>
            </div>
          `,
        });
        console.log("📧 Email avec le lien Affilibee envoyé à :", email);
      }

    } catch (dbError) {
      console.error("Erreur BDD:", dbError);
      return NextResponse.json({ error: "DB Error" }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}