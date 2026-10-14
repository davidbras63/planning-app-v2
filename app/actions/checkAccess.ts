'use server'

import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { processReferral } from './referral';

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

    // --- VÉRIFICATION & ENREGISTREMENT DU PARRAINAGE ---
    if (!user.referredBy) {
        const cookieStore = await cookies();
        const affiliateCookie = cookieStore.get('affiliate_ref')?.value;

        if (affiliateCookie) {
            const cleanCode = affiliateCookie.trim();
            // On s'assure qu'on ne se parraine pas soi-même
            if (cleanCode && cleanCode !== clerkId) {
                await processReferral(cleanCode);
            }
        }
    }
    // --------------------------------------------------

    // --- Bypass direct si statut 'elite' ---
	if (user.status === 'elite') {
		return { hasAccess: true };
	}

    // Vérification stricte de la date de fin
	const now = new Date();
	const periodEnd = user.periodEnd ? new Date(user.periodEnd) : null;
	const isAccessGranted = periodEnd && periodEnd > now;

	if (!isAccessGranted) {
		return { hasAccess: false };
	}

	return { hasAccess: true };
}