import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    if (payload.type === 'checkout.session.completed') {
      const userId = payload.data.object.client_reference_id;

      // Mise à jour de l'utilisateur avec son statut d'abonnement
      // Note : Il faudra ajouter ces colonnes dans ton schéma 'users'
      await db.update(users)
        .set({ 
          status: 'active', 
          subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() 
        })
        .where(eq(users.clerkId, userId));
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Erreur Webhook Stripe :", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
