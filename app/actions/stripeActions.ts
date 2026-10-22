"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db"; // Assure-toi que ton instance Drizzle est bien importée depuis ton fichier de config db
import { users } from "@/db/schema"; // Ajuste le chemin vers ton schéma si nécessaire
import { eq } from "drizzle-orm";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
    apiVersion: "2025-02-24.acacia" as any, // Utilise la version de l'API Stripe configurée sur ton projet
});

export async function actionCreateStripePortal(): Promise<string | null> {
    try {
        const { userId } = await auth();
        if (!userId) {
            throw new Error("Utilisateur non authentifié.");
        }

        // Récupérer l'utilisateur dans la base de données via son clerkId
        const dbUser = await db.query.users.findFirst({
            where: eq(users.clerkId, userId),
        });

        if (!dbUser || !dbUser.email) {
            throw new Error("Utilisateur introuvable dans la base de données.");
        }

        // Vérifier si un client Stripe existe déjà pour cet email, sinon le créer
        const customers = await stripe.customers.list({ email: dbUser.email, limit: 1 });
        let customerId: string;

        if (customers.data.length > 0) {
            customerId = customers.data[0].id;
        } else {
            const customer = await stripe.customers.create({
                email: dbUser.email,
                metadata: {
                    clerkId: userId,
                },
            });
            customerId = customer.id;
        }

        // URL de redirection après la gestion du portail (retour vers le dashboard ou les paramètres)
        const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/protected/dashboard`;

        // Création de la session du portail client Stripe
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: returnUrl,
        });

        return portalSession.url;
    } catch (error) {
        console.error("Erreur lors de la création du portail Stripe :", error);
        return null;
    }
}