import { db } from "@/db";
import { users } from "@/db/schema";
import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    console.error("❌ ERREUR CRITIQUE: WEBHOOK_SECRET non défini");
    return new Response("Missing WEBHOOK_SECRET", { status: 500 });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.error("❌ ERREUR CRITIQUE: RESEND_API_KEY non définie");
  }

  const resend = new Resend(resendApiKey);

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
    console.error("Erreur de vérification Svix:", err);
    return new Response("Error occured", { status: 400 });
  }

  if (evt.type === 'user.created') {
    const { id: clerkId, email_addresses } = evt.data as any;
    const email = email_addresses[0]?.email_address;

    if (!clerkId || !email) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    // On enlève "user_" pour n'avoir que la chaîne propre (ex: 3KhlnlNT...)
    const affiliateSlug = clerkId.replace("user_", "");

    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 3);

    try {
      // 1. Insertion BDD Neon (garde le vrai clerkId d'origine)
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
      console.log("✅ Utilisateur inséré dans Neon :", email);

      // 2. Envoi de l'email via Resend avec le slug nettoyé
      if (resendApiKey) {
        const affiliateSignupUrl = "https://affilibee.com/landing-pages/nesis/my-first-landing-page";

        const { data, error } = await resend.emails.send({
          from: 'Nesis <contact@nesis.fr>',
          to: [email],
          subject: 'Bienvenue sur Nesis - Ton code d\'affiliation unique',
          html: `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
              <h2>Bienvenue sur Nesis !</h2>
              <p>Ton compte a été créé avec succès.</p>
              
              <p>Si tu souhaites rejoindre notre programme d'affiliation pour parrainer des utilisateurs, voici la marche à suivre :</p>
              
              <ol style="padding-left: 20px;">
                <li>Rends-toi sur la page d'inscription : <a href="${affiliateSignupUrl}" target="_blank" style="color: #0070f3;">Clique ici pour y accéder</a></li>
                <li>Copie ton identifiant unique ci-dessous :</li>
              </ol>

              <div style="background-color: #f4f4f4; border: 1px solid #ddd; padding: 12px; font-family: monospace; font-size: 16px; font-weight: bold; text-align: center; border-radius: 6px; margin: 15px 0; color: #111;">
                ${affiliateSlug}
              </div>

              <p>Colle simplement ce code dans le champ <strong>Slug</strong> sur la page d'inscription pour lier ton compte et valider ton affiliation.</p>
              
              <p>À très vite,<br>L'équipe Nesis</p>
            </div>
          `,
        });

        if (error) {
          console.error("❌ ERREUR ENVOI RESEND :", error);
        } else {
          console.log("📧 EMAIL ENVOYÉ AVEC SUCCÈS (ID) :", data?.id);
        }
      } else {
        console.warn("⚠️ RESEND_API_KEY absente, email non envoyé.");
      }

    } catch (err) {
      console.error("❌ ERREUR BDD/PROCESS :", err);
      return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}