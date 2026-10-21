import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { Resend } from 'resend';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia' as any,
});

const resend = new Resend(process.env.RESEND_API_KEY);

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
    console.log("--- DÉBUT WEBHOOK STRIPE ---");
    console.log("Type d'événement reçu :", event.type);

    const dataObject = event.data.object as any;
    
    // 1. Recherche par métadonnées directes
    let clerkId = 
      dataObject?.metadata?.user_id || 
      dataObject?.customer_details?.metadata?.user_id;

    // 2. Recherche via l'abonnement Stripe lié
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

    // 3. Recherche via le client Stripe + récupération de son e-mail
    let customerEmail = dataObject?.customer_email || dataObject?.customer_details?.email;

    if (!clerkId && dataObject?.customer) {
      try {
        const customerId = typeof dataObject.customer === 'string' 
          ? dataObject.customer 
          : dataObject.customer.id;
        
        const customer = await stripe.customers.retrieve(customerId);
        if (!customer.deleted) {
          clerkId = customer.metadata?.user_id;
          if (!customerEmail && (customer as any).email) {
            customerEmail = (customer as any).email;
          }
        }
      } catch (err) {
        console.error("Erreur récupération client Stripe pour le clerkId :", err);
      }
    }

    // 4. Filet de sécurité ultime : Recherche par e-mail en base si le clerkId manque toujours
    if (!clerkId && customerEmail) {
      try {
        console.log(`⚠️ ClerkId absent des metadata, recherche en base via l'e-mail : ${customerEmail}`);
        const userRes = await db.execute(sql`SELECT clerk_id FROM users WHERE email = ${customerEmail} LIMIT 1`);
        if (userRes.rows.length > 0) {
          clerkId = (userRes.rows[0] as any).clerk_id;
          console.log(`✅ ClerkId récupéré via l'e-mail en base : ${clerkId}`);
        }
      } catch (dbEmailErr) {
        console.error("Erreur recherche utilisateur par e-mail :", dbEmailErr);
      }
    }

    console.log("Événement Stripe :", event.type, "| Clerk ID extrait :", clerkId);
    
    if (!clerkId) {
      console.error("❌ ERREUR CRITIQUE : Aucun clerkId trouvé ni dans Stripe ni en base !");
      return NextResponse.json({ received: true, warning: 'No clerkId found' }, { status: 200 });
    }

    // Fonction centralisée pour générer et enregistrer le lien du portail Stripe
    const upsertPortalLink = async (customerRef: any) => {
      if (!customerRef) return;
      try {
        const customerId = typeof customerRef === 'string' ? customerRef : customerRef.id;
        const portalSession = await stripe.billingPortal.sessions.create({
          customer: customerId,
          return_url: 'https://nesis.fr/dashboard',
        });

        if (portalSession?.url) {
          const customerPortalUrl = portalSession.url;
          const existingSubLink = await db.execute(
            sql`SELECT id FROM links WHERE clerk_id = ${clerkId} AND label = 'Gérer mon abonnement' LIMIT 1`
          );

          if (existingSubLink.rows.length === 0) {
            await db.execute(
              sql`INSERT INTO links (clerk_id, label, url) VALUES (${clerkId}, 'Gérer mon abonnement', ${customerPortalUrl})`
            );
            console.log("✅ [LIEN] Insertion unique du lien 'Gérer mon abonnement' effectuée.");
          } else {
            await db.execute(
              sql`UPDATE links SET url = ${customerPortalUrl} WHERE clerk_id = ${clerkId} AND label = 'Gérer mon abonnement'`
            );
            console.log("✅ [LIEN] Mise à jour unique du lien 'Gérer mon abonnement' effectuée.");
          }
        }
      } catch (portalError) {
        console.error("❌ ERREUR SYNCHRO PORTAIL :", portalError);
      }
    };

    // --- 2. GESTION DES ÉVÉNEMENTS ---
    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
      const subStatus = dataObject.status;
      if (subStatus && subStatus !== 'incomplete') {
        await db.execute(sql`
          UPDATE users
          SET status = ${subStatus}
          WHERE clerk_id = ${clerkId}
        `);
        console.log(`✅ Statut utilisateur mis à jour à : ${subStatus}`);
      } else {
        console.log(`⚠️ Statut 'incomplete' ignoré.`);
      }
      await upsertPortalLink(dataObject?.customer);
    }
    else if (event.type === 'customer.subscription.paused') {
      await db.execute(sql`
        UPDATE users
        SET status = 'paused'
        WHERE clerk_id = ${clerkId}
      `);
      console.log("✅ Abonnement mis en pause.");
    }
    else if (event.type === 'customer.subscription.resumed') {
      await db.execute(sql`
        UPDATE users
        SET status = 'active'
        WHERE clerk_id = ${clerkId}
      `);
      console.log("✅ Abonnement réactivé.");
    }
    else if (event.type === 'invoice.payment_succeeded') {
      const now = new Date();
      console.log("👉 [LOG DEBUG] billing_reason exact reçu de Stripe :", dataObject?.billing_reason);

      const userResult = await db.execute(sql`SELECT email, period_end, referred_by FROM users WHERE clerk_id = ${clerkId} LIMIT 1`);
      const dbUser = userResult.rows[0] as any;
      
      if (!dbUser) {
        console.error(`❌ ERREUR : Aucun utilisateur trouvé en base avec le clerk_id: ${clerkId}`);
        return NextResponse.json({ received: true }, { status: 200 });
      }

      const userEmail = dbUser.email || customerEmail;
      const referralCode = dbUser.referred_by; // <--- Ton code récupère déjà le parrain ici !
      const existingPeriodEnd = dbUser.period_end;
      const currentPeriodEnd = existingPeriodEnd ? new Date(existingPeriodEnd) : now;
      
      console.log("Utilisateur trouvé en base — Email :", userEmail, "— Fin de période actuelle :", currentPeriodEnd.toISOString(), "— Code parrain :", referralCode);
      
      if (currentPeriodEnd > new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000)) {
        console.log("⚠️ ABONNEMENT IGNORÉ : Fin de période déjà supérieure à +31 jours");
        return NextResponse.json({ received: true }, { status: 200 });
      }

      const baseDate = currentPeriodEnd > now ? currentPeriodEnd : now;
      const newPeriodEnd = new Date(baseDate);
      newPeriodEnd.setDate(newPeriodEnd.getDate() + 32);

      console.log("Nouvelle date de fin calculée :", newPeriodEnd.toISOString());

      try {
        const updateResult = await db.execute(sql`
          UPDATE users
          SET status = 'active', period_end = ${newPeriodEnd.toISOString()}
          WHERE clerk_id = ${clerkId}
          RETURNING clerk_id, status, period_end;
        `);
        console.log("✅ Résultat SQL UPDATE users :", JSON.stringify(updateResult));
      } catch (dbError) {
        console.error("❌ ERREUR SQL UPDATE USERS :", dbError);
      }

      // --- REMONTÉE DE LA CONVERSION VERS AFFILIBEE ---
      if (referralCode) {
        try {
          console.log(`🚀 Envoi de la conversion à Affilibee pour l'affilié : ${referralCode}`);
          
          const affilibeeResponse = await fetch('https://api.affilibee.com/v1/conversions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.AFFILIBEE_API_TOKEN}`,
            },
            body: JSON.stringify({
              affiliate_slug: referralCode,
              order_id: dataObject.id,
              amount: dataObject.amount_paid ? dataObject.amount_paid / 100 : 7.90,
              currency: 'EUR',
              customer_email: userEmail,
            }),
          });

          const affilibeeResult = await affilibeeResponse.json();
          console.log("✅ Réponse Affilibee conversion :", JSON.stringify(affilibeeResult));
        } catch (affError) {
          console.error("❌ ERREUR LORS DE L'ENVOI À AFFILIBEE :", affError);
        }
      } else {
        console.log("ℹ️ Aucun code de parrainage trouvé pour cet utilisateur en base.");
      }

      // --- GÉNÉRATION DU PORTAIL CLIENT STRIPE ---
      await upsertPortalLink(dataObject?.customer);

      // --- ENVOI DE L'E-MAIL (Uniquement à la création initiale) ---
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
    }
    else if (event.type === 'invoice.payment_failed') {
      const userResult = await db.execute(sql`SELECT email FROM users WHERE clerk_id = ${clerkId} LIMIT 1`);
      const userEmail = (userResult.rows[0] as any)?.email || customerEmail;
      if (userEmail) {
        await resend.emails.send({
          from: 'Nesis <contact@nesis.fr>',
          to: userEmail,
          subject: 'Échec de votre paiement - Action requise',
          text: 'Le prélèvement pour votre abonnement Nesis a échoué.'
        });
        console.log("✅ E-mail d'échec de paiement envoyé.");
      }
    }
    else if (event.type === 'customer.subscription.deleted') {
      await db.execute(sql`
        UPDATE users
        SET status = 'cancelled'
        WHERE clerk_id = ${clerkId}
      `);
      console.log("✅ Abonnement marqué comme annulé.");
    }

    console.log("--- 4. WEBHOOK TRAITÉ AVEC SUCCÈS ---");
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    console.error("--- ERREUR CRITIQUE CATCH ---", error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}