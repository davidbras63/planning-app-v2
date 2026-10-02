'use server';

import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function handleLemonSqueezyWebhook(event: any) {
  console.log("--- DÉBUT WEBHOOK LEMON SQUEEZY ---");
  console.log("Payload brut reçu :", JSON.stringify(event));

  const eventName = event?.meta?.event_name;
  const attributes = event?.data?.attributes;
  const customData = event?.meta?.custom_data || attributes?.custom_data;
  const clerkId = customData?.user_id;

  console.log("Événement :", eventName, "| Clerk ID extrait :", clerkId);
 
  if (!clerkId) {
    console.error("❌ ERREUR CRITIQUE : Aucun clerkId trouvé dans meta.custom_data ou attributes.custom_data !");
    return;
  }

  // --- 1. CAPTURE GLOBALE DU PORTAIL CLIENT ---
  try {
    const customerPortalUrl = attributes?.urls?.customer_portal;
    if (customerPortalUrl) {
      console.log("URL du portail client détectée :", customerPortalUrl);
      const existingSubLink = await db.execute(
        sql`SELECT id FROM links WHERE clerk_id = ${clerkId} AND label = 'Gérer mon abonnement' LIMIT 1`
      );

      if (existingSubLink.rows.length === 0) {
        await db.execute(
          sql`INSERT INTO links (clerk_id, label, url) VALUES (${clerkId}, 'Gérer mon abonnement', ${customerPortalUrl})`
        );
        console.log("✅ Insertion lien 'Gérer mon abonnement' effectuée.");
      } else {
        await db.execute(
          sql`UPDATE links SET url = ${customerPortalUrl} WHERE clerk_id = ${clerkId} AND label = 'Gérer mon abonnement'`
        );
        console.log("✅ Mise à jour lien 'Gérer mon abonnement' effectuée.");
      }
    }
  } catch (portalError) {
    console.error("❌ ERREUR SYNCHRO PORTAIL :", portalError);
  }

  // --- 2. GESTION DES ÉVÉNEMENTS ---
 
  if (eventName === 'subscription_created' || eventName === 'subscription_updated') {
    const subStatus = attributes?.status;
    if (subStatus) {
      await db.execute(sql`
        UPDATE users
        SET status = ${subStatus}
        WHERE clerk_id = ${clerkId}
      `);
      console.log(`✅ Statut utilisateur mis à jour à : ${subStatus}`);
    }
  }

  // --- GESTION DE LA PAUSE DEPUIS LE PORTAIL LEMON SQUEEZY ---
  else if (eventName === 'subscription_paused') {
    await db.execute(sql`
      UPDATE users
      SET status = 'paused'
      WHERE clerk_id = ${clerkId}
    `);
    console.log("✅ Abonnement mis en pause (via portail Lemon Squeezy). Le period_end reste inchangé pour laisser l'accès actif jusqu'à son terme.");
  }

  else if (eventName === 'subscription_payment_success') {
    const now = new Date();
   
    const userResult = await db.execute(sql`SELECT email, period_end FROM users WHERE clerk_id = ${clerkId} LIMIT 1`);
    const dbUser = userResult.rows[0] as any;
   
    if (!dbUser) {
      console.error(`❌ ERREUR : Aucun utilisateur trouvé en base avec le clerk_id: ${clerkId}`);
      return;
    }

    const userEmail = dbUser.email || attributes?.user_email;
    const existingPeriodEnd = dbUser.period_end;
    const currentPeriodEnd = existingPeriodEnd ? new Date(existingPeriodEnd) : now;
   
    console.log("Utilisateur trouvé en base — Email :", userEmail, "— Fin de période actuelle :", currentPeriodEnd);
   
    if (currentPeriodEnd > new Date(now.getTime() + 29 * 24 * 60 * 60 * 1000)) {
      console.log("Abonnement déjà prolongé, on ignore ce webhook dupliqué.");
      return;
    }

    const baseDate = currentPeriodEnd > now ? currentPeriodEnd : now;
    const newPeriodEnd = new Date(baseDate);
    newPeriodEnd.setDate(newPeriodEnd.getDate() + 30);

    console.log("Nouvelle date de fin calculée :", newPeriodEnd.toISOString());

    try {
      const updateResult = await db.execute(sql`
        UPDATE users
        SET status = 'active', period_end = ${newPeriodEnd.toISOString()}
        WHERE clerk_id = ${clerkId}
      `);
      console.log("✅ Résultat SQL UPDATE users :", updateResult);
    } catch (dbError) {
      console.error("❌ ERREUR SQL UPDATE USERS :", dbError);
    }

    if (eventName === 'subscription_created' || attributes?.billing_reason === 'initial') {
        try {
            if (userEmail) {
                console.log(`Envoi de l'e-mail de confirmation et d'accès au parrainage à ${userEmail}`);
                const referralInstructionsUrl = "https://nesis.lemonsqueezy.com/affiliates";
                const emailBody =
 "Bienvenue chez Nesis !\n\n" +
 "Votre abonnement a bien été validé. Vous avez dès à présent accès à toutes les fonctionnalités de l'application.\n\n" +
 "--- Activez votre programme de parrainage ---\n" +
 "En tant qu'abonné, vous bénéficiez de notre programme de parrainage. Pour commencer à parrainer et toucher des commissions, voici comment procéder :\n" +
 "1. Rendez-vous sur notre lien d'espace affilié dédié : " + referralInstructionsUrl + "\n" +
 "2. Connectez-vous avec l'e-mail utilisé lors de votre achat pour récupérer votre lien de parrainage personnel.\n" +
 "3. Partagez votre lien autour de vous !\n\n" +
 "Important concernant les commissions :\n" +
 "Le versement de vos commissions s'effectue automatiquement dès que votre solde atteint un seuil minimum de 9 €. En dessous de ce montant, vos gains se cumulent en toute sécurité.\n\n" +
 "À très vite sur l'application !\n" +
 "L'équipe Nesis";

                await resend.emails.send({
                 from: 'Nesis <contact@nesis.fr>',
                 to: userEmail,
                 subject: 'Confirmation et accès Nesis',
                 text: emailBody
                });
                console.log("E-mail de confirmation et de parrainage envoyé.");
            }
        } catch (emailError) {
            console.error("❌ ERREUR ENVOI-EMAIL PARRAINAGE", emailError);
        }
    }

    console.log("✅ SUCCÈS : Paiement validé et abonnement prolongé !");
  }

  else if (eventName === 'subscription_payment_failed') {
    const userResult = await db.execute(sql`SELECT email FROM users WHERE clerk_id = ${clerkId} LIMIT 1`);
    const userEmail = (userResult.rows[0] as any)?.email;

    const linkResult = await db.execute(
      sql`SELECT url FROM links WHERE clerk_id = ${clerkId} AND label = 'Gérer mon abonnement' LIMIT 1`
    );
    const updateUrl = (linkResult.rows[0] as any)?.url ?? attributes?.urls?.update_payment_method ?? 'https://app.lemonsqueezy.com';

    if (userEmail) {
      await resend.emails.send({
        from: 'Nesis <contact@nesis.fr>',
        to: userEmail,
        subject: 'Échec de votre paiement - Action requise',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Échec du prélèvement de votre abonnement</h2>
            <p>Le prélèvement pour votre abonnement Nesis a échoué. Pour éviter toute interruption d'accès, veuillez mettre à jour votre moyen de paiement.</p>
            <p style="color: #666; font-size: 14px;"><em>Rappel : en l'absence de régularisation sous 30 jours, votre abonnement sera résilié et vos données associées seront supprimées.</em></p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${updateUrl}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Mettre à jour mon paiement</a>
            </div>
          </div>
        `
      });
      console.log("✅ E-mail d'échec de paiement envoyé avec l'URL :", updateUrl);
    }
  }

  else if (eventName === 'subscription_cancelled') {
    await db.execute(sql`
      UPDATE users
      SET status = 'cancelled'
      WHERE clerk_id = ${clerkId}
    `);
    console.log("✅ Abonnement marqué comme annulé.");
  }

  else if (eventName === 'subscription_expired') {
    await db.execute(sql`
      UPDATE users
      SET status = 'expired'
      WHERE clerk_id = ${clerkId}
    `);
    console.log("✅ Abonnement marqué comme expiré.");
  }
}
