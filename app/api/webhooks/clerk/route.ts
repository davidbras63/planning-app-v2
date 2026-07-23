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

      // On définit strictement les données
	  const userToInsert = {
        clerkId: clerkId,
        email: email,
};

	  console.log("DEBUG: Objet envoyé à la base :", userToInsert);

      // On insère uniquement cet objet
      await db.insert(users)
       .values(userToInsert)
       .onConflictDoUpdate({
          target: users.clerkId,
          set: { 
            email: email 
          },
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
