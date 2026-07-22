'use server'
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db'; // Ton instance de db
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function checkAccessAction() {
  const { userId } = await auth();
  
  if (!userId) return { hasAccess: false };

  // On cherche l'utilisateur dans ta table 'users' déclarée dans ton schéma
  const result = await db.select().from(users).where(eq(users.clerkId, userId));
  
  // Ici, tu peux ajouter ta condition métier (ex: vérif d'un champ abonnement)
  // Pour l'instant, si l'utilisateur est trouvé dans la table, on autorise
  const userExists = result.length > 0;
  
  return { hasAccess: userExists };
}
