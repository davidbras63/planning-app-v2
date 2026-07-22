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

      // On insère l'utilisateur dans ta table 'users' officielle
      await db.insert(users)
        .values({
          clerk_id: id,
          email: email,
		  created_at: new Date(),
        })
        .onConflictDoNothing({ // Évite les erreurs si l'utilisateur existe déjà
          target: users.clerk_id
        });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur Webhook Clerk :", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
