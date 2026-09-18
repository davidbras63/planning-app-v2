import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Récupérer l'e-mail envoyé par le front s'il existe
    let userEmail: string | undefined;
    try {
      const body = await req.json();
      userEmail = body?.email;
    } catch {
      // Si le body est vide, on continue pour aller le chercher en base
    }

    // Si pas d'e-mail reçu du front, on va le chercher dans la base
    if (!userEmail) {
      const userRecord = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.clerkId, userId))
        .limit(1);

      userEmail = userRecord[0]?.email;
    }

    if (!userEmail) {
      return NextResponse.json({ error: 'Utilisateur introuvable dans la base de données.' }, { status: 404 });
    }

    const storeId = process.env.LEMONSQUEEZY_STORE_ID;
    const variantId = process.env.LEMONSQUEEZY_VARIANT_ID;
    const siteUrl = 'https://nesis-dev.vercel.app';

    const response = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
      },
      body: JSON.stringify({
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: {
              email: userEmail, // L'e-mail est explicitement passé ici
              custom: {
                user_id: userId,
              },
            },
            product_options: {
              enabled_variants: [variantId],
              redirect_url: `${siteUrl}/protected/dashboard`,
              receipt_button_text: 'Accéder à mon espace',
              receipt_link_url: `${siteUrl}/protected/dashboard`,
            },
            checkout_options: {
              embed: false,
              media: true,
              logo: true,
              dark: true,
            },
          },
          relationships: {
            store: {
              data: {
                type: 'stores',
                id: storeId,
              },
            },
            variant: {
              data: {
                type: 'variants',
                id: variantId,
              },
            },
          },
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Erreur Lemon Squeezy API:', JSON.stringify(data, null, 2));
      return NextResponse.json({ error: 'Erreur lors de la création du checkout', details: data }, { status: 500 });
    }

    const checkoutUrl = data?.data?.attributes?.url;

    if (!checkoutUrl) {
      return NextResponse.json({ error: 'URL de checkout introuvable dans la réponse' }, { status: 500 });
    }

    return NextResponse.json({ url: checkoutUrl });
  } catch (error) {
    console.error('Erreur critique route checkout:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}