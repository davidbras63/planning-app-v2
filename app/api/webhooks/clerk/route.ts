import { db } from "@/db";
import { users } from "@/db/schema";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const eventType = payload.type;

    if (eventType === 'user.created') {
      const { data } = payload;
      
      const clerkId = data.id;
      const email = data.email_addresses?.[0]?.email_address;

      if (!clerkId || !email) {
        return NextResponse.json({ error: "Missing data" }, { status: 400 });
      }

      // La requête insère explicitement clerkId et email. 
      // Elle ignore volontairement id (géré par la DB) et createdAt (géré par la DB).
      await db.insert(users)
        .values({
          clerkId: clerkId,
          email: email,
        })
        .onConflictDoNothing({
          target: users.clerkId // C'est ici que tu passes la colonne, PAS une fonction.
        });
    }

    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.log("--- DÉBUT ERREUR ---");
    console.log(error);
    console.log("--- FIN ERREUR ---");
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
