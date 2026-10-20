'use server';

import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { Resend } from 'resend';
import Stripe from 'stripe';

const resend = new Resend(process.env.RESEND_API_KEY);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia' as any,
});

export async function handleStripeWebhook(event: Stripe.Event) {
  console.log("--- DÉBUT WEBHOOK STRIPE ---");
  console.log("Type d'événement reçu :", event.type);

  // Extraction des données selon l'objet Stripe concerné
  const dataObject = event.data.object as any;
  
  // Récupération du clerkId stocké dans les metadata de l'objet (client, abonnement ou facture)
  let clerkId = 
    dataObject?.metadata?.user_id || 
    dataObject?.customer_details?.metadata?.user_id;

  // Si c'est une facture (invoice) ou un événement sans metadata direct, on va chercher sur l'abonnement Stripe lié
  if (!clerkId && dataObject?.subscription) {
    try {
      const subscriptionId = typeof dataObject.subscription === 'string' 
        ? dataObject.subscription 
        : dataObject.subscription.id;
      
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      clerkId = subscription.metadata?.user_id;
    } catch (err) {
      console.error("Erreur récupération abonnement Stripe pour le clerkId :", err);
    }
  }

  // Si toujours rien, on tente via le client Stripe
  if (!clerkId && dataObject?.customer) {
    try {
      const customerId = typeof dataObject.customer === 'string' 
        ? dataObject.customer 
        : dataObject.customer.id;
      
      const customer = await stripe.customers.retrieve(customerId);
      if (!customer.deleted) {
        clerkId = customer.metadata?.user_id;
      }
    } catch (err) {
      console.error("Erreur récupération client Stripe pour le clerkId :", err);
    }
  }

  console.log("Événement Stripe :", event.type, "| Clerk ID extrait :", clerkId);
  
  if (!clerkId) {
    console.error("❌ ERREUR CRITIQUE : Aucun clerkId trouvé dans les metadata Stripe !");
    return;
  }

  // --- 1. CAPTURE GLOBALE DU PORTAIL CLIENT STRIPE ---
  try {
    const customerPortalUrl = process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing` : 'https://billing.stripe.com/p/login/...'; 
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
  } catch (portalError) {
    console.error("❌ ERREUR SYNCHRO PORTAIL :", portalError);
  }

  // --- 2. GESTION DES ÉVÉNEMENTS STRIPE ---

  // Abonnement créé ou mis à jour
  if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
    const subStatus = dataObject.status; // 'active', 'trialing', 'past_due', etc.
    if (subStatus) {
      await db.execute(sql`
        UPDATE users
        SET status = ${subStatus}
        WHERE clerk_id = ${clerkId}
      `);
      console.log(`✅ Statut utilisateur mis à jour à : ${subStatus}`);
    }
  }

  // --- GESTION DE LA PAUSE ---
  else if (event.type === 'customer.subscription.paused') {
    await db.execute(sql`
      UPDATE users
      SET status = 'paused'
      WHERE clerk_id = ${clerkId}
    `);
    console.log("✅ Abonnement mis en pause.");
  }
  
  // --- GESTION DE LA REPRISE DE PAUSE ---
  else if (event.type === 'customer.subscription.resumed') {
    await db.execute(sql`
      UPDATE users
      SET status = 'active'
      WHERE clerk_id = ${clerkId}
    `);
    console.log("✅ Abonnement réactivé.");
  }

  // --- PAIEMENT RÉUSSI ---
  else if (event.type === 'invoice.payment_succeeded') {
    const now = new Date();
   
    const userResult = await db.execute(sql`SELECT email, period_end, referred_by FROM users WHERE clerk_id = ${clerkId} LIMIT 1`);
    const dbUser = userResult.rows[0] as any;
   
    if (!dbUser) {
      console.error(`❌ ERREUR : Aucun utilisateur trouvé en base avec le clerk_id: ${clerkId}`);
      return;
    }

    const userEmail = dbUser.email || dataObject?.customer_email;
    const referralCode = dbUser.referred_by;
    const existingPeriodEnd = dbUser.period_end;
    const currentPeriodEnd = existingPeriodEnd ? new Date(existingPeriodEnd) : now;
   
    console.log("Utilisateur trouvé en base — Email :", userEmail, "— Fin de période actuelle :", currentPeriodEnd);
   
    if (currentPeriodEnd > new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000)) {
      console.log("Abonnement déjà prolongé, on ignore ce webhook dupliqué.");
      return;
    }

    // --- CALCUL DES 32 JOURS ---
    const baseDate = currentPeriodEnd > now ? currentPeriodEnd : now;
    const newPeriodEnd = new Date(baseDate);
    newPeriodEnd.setDate(newPeriodEnd.getDate() + 32);

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

    // --- ENVOI DE LA COMMANDE À AFFILIBEE (API v2) ---
    try {
      const amount = dataObject?.amount_paid || dataObject?.total || 0;
      const orderId = dataObject?.id?.toString() || `order-${Date.now()}`; // Corrigé ici
      const lineItem = dataObject?.lines?.data?.[0];

      const affilibeePayload = {
        affiliate_slug: referralCode || "default",
        order_no: orderId,
        total_shipping_value: 0,
        currency_code: dataObject?.currency?.toUpperCase() || "EUR",
        order_rows: [
          {
            product_sku: lineItem?.price?.id || "nesis-sub",
            product_name: lineItem?.description || "Abonnement Nesis",
            price_value: amount, 
            tax_value: dataObject?.tax || 0,
            quantity: lineItem?.quantity || 1
          }
        ],
        customer: {
          name: dataObject?.customer_name || userEmail.split('@')[0],
          email: userEmail
        }
      };

      const affilibeeResponse = await fetch("https://affilibee.com/api/v2/orders/create", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.AFFILIBEE_API_TOKEN}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(affilibeePayload),
      });

      const affilibeeResult = await affilibeeResponse.json();

      if (!affilibeeResponse.ok) {
        console.error("❌ Erreur API Affilibee:", affilibeeResult);
      } else {
        console.log("✅ Commande transmise à Affilibee avec succès pour l'email:", userEmail);
      }
    } catch (affilibeeErr) {
      console.error("❌ Erreur de communication avec Affilibee:", affilibeeErr);
    }

    // --- ENVOI DE L'E-MAIL DE CONFIRMATION ---
    if (dataObject?.billing_reason === 'subscription_create') {
        try {
            if (userEmail) {
                console.log(`Envoi de l'e-mail de confirmation à ${userEmail}`);
                const emailBody =
"Bienvenue chez Nesis !\n\n" +
"Votre abonnement a bien été validé. Vous avez dès à présent accès à toutes les fonctionnalités de l'application.\n\n" +
"À très vite sur l'application !\n" +
"L'équipe Nesis";

                await resend.emails.send({
                 from: 'Nesis <contact@nesis.fr>',
                 to: userEmail,
                 subject: 'Confirmation et accès Nesis',
                 text: emailBody
                });
                console.log("E-mail de confirmation envoyé.");
            }
        } catch (emailError) {
            console.error("❌ ERREUR ENVOI-EMAIL", emailError);
        }
    }

    console.log("✅ SUCCÈS : Paiement validé et abonnement prolongé !");
  }

  // --- ÉCHEC DE PAIEMENT ---
  else if (event.type === 'invoice.payment_failed') {
    const userResult = await db.execute(sql`SELECT email FROM users WHERE clerk_id = ${clerkId} LIMIT 1`);
    const userEmail = (userResult.rows[0] as any)?.email;

    const linkResult = await db.execute(
      sql`SELECT url FROM links WHERE clerk_id = ${clerkId} AND label = 'Gérer mon abonnement' LIMIT 1`
    );
    const updateUrl = (linkResult.rows[0] as any)?.url ?? 'https://billing.stripe.com/p/login/...';

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
      console.log("✅ E-mail d'échec de paiement envoyé.");
    }
  }

  // --- ABONNEMENT ANNULÉ ---
  else if (event.type === 'customer.subscription.deleted') {
    await db.execute(sql`
      UPDATE users
      SET status = 'cancelled'
      WHERE clerk_id = ${clerkId}
    `);
    console.log("✅ Abonnement marqué comme annulé.");
  }
}