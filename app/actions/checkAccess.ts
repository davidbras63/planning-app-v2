'use server'

import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

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
    // --- Bypass direct si statut 'elite' ---
	if (user.status === 'elite') {
		return { hasAccess: true };
	}

    // Vérification stricte de la période d'essai ou du statut actif
    const now = new Date();
    const periodEnd = user.periodEnd ? new Date(user.periodEnd) : null;
    const isTrialActive = user.status === 'trial' && periodEnd && periodEnd > now;
    const isPaidActive = user.status === 'active'; 

    if (!isTrialActive && !isPaidActive) {
        return { hasAccess: false };
    }

    return { hasAccess: true };
}
