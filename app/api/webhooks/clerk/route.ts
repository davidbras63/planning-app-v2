import { db } from "@/db";
import { users } from "@/db/schema";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const eventType = payload.type;

    if (eventType === 'user.created') {
      const { id, email_addresses } = payload.data;
      const email = email_addresses[0].email_address;

      // On insère l'utilisateur en omettant 'id' pour laisser 
      // la base de données générer la clé primaire automatiquement
      await db.insert(users)
        .values({
          clerk_id: id, // Identifiant Clerk
          email: email, // Email utilisateur
          created_at: new Date(), // Timestamp actuel
        })
        .onConflictDoNothing({ 
          target: users.clerk_id // Évite les doublons basés sur l'ID Clerk
        });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur Webhook Clerk : ", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
