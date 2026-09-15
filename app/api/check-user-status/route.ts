import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ status: 'unauthorized' }, { status: 401 });
    }

    const userRecord = await db
      .select({ status: users.status })
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1);

    const dbUser = userRecord[0];

    if (!dbUser) {
      return NextResponse.json({ status: 'not_found' }, { status: 404 });
    }

    return NextResponse.json({ status: dbUser.status });
  } catch (error) {
    console.error('Erreur check statut:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
