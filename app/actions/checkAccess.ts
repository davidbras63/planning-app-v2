'use server'

import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { cookies } from 'next/headers';

export async function checkAccessAction() {
    const { userId: clerkId } = await auth(); 

    if (!clerkId) {
        return { hasAccess: false };
    }

    const result = await db.select().from(users).where(eq(users.clerkId, clerkId));
    
    if (result.length === 0) {
        return { hasAccess: false };
    }

    const user = result[0];

    /// --- ENREGISTREMENT DIRECT VIA SQL BRUT ---
    if (!user.referredBy) {
        try {
            const cookieStore = await cookies();
            const affiliateCookie = cookieStore.get('affiliate_ref')?.value;

            if (affiliateCookie) {
                const cleanCode = affiliateCookie.trim();
                if (cleanCode && cleanCode !== clerkId) {
                    await db.execute(
                        sql`UPDATE users SET referred_by = ${cleanCode} WHERE clerk_id = ${clerkId}`
                    );
                    
                    // 🔒 Sécurité : on détruit le cookie instantanément pour qu'il ne traîne plus
                    cookieStore.set('affiliate_ref', '', { maxAge: 0, path: '/' });
                }
            }
        } catch (err) {
            console.error('Erreur lors de l’enregistrement du parrain :', err);
        }
    }
    // --------------------------------------------------

    if (user.status === 'elite') {
		return { hasAccess: true };
	}

	const now = new Date();
	const periodEnd = user.periodEnd ? new Date(user.periodEnd) : null;
	const isAccessGranted = periodEnd && periodEnd > now;

	if (!isAccessGranted) {
		return { hasAccess: false };
	}

	return { hasAccess: true };
}