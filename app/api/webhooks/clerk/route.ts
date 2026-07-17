console.log("LOG DE VERIFICATION : LE FICHIER ROUTE.TS EST BIEN CHARGE");

import { supabase } from '@/lib/supabaseClient';

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const eventType = payload.type;

    console.log("Webhook reçu, type:", eventType);

    if (eventType === 'user.created') {
      const { id, email_addresses, first_name, last_name } = payload.data;
      const email = email_addresses[0].email_address;
      const fullName = `${first_name || ''} ${last_name || ''}`.trim();

      console.log("Tentative d'insertion pour:", email);

      const { data, error } = await supabase.from('profiles').insert([
        {
          user_id: id,
          email: email,
          name: fullName,
          subscription_status: 'trial'
        }
      ]);

      if (error) {
        console.error("ERREUR SUPABASE:", JSON.stringify(error, null, 2));
        return new Response(JSON.stringify(error), { status: 500 });
      }

      console.log("Utilisateur créé avec succès !");
    }

    return new Response('OK', { status: 200 });
  } catch (err) {
    console.error("ERREUR SERVEUR:", err);
    return new Response('Internal Server Error', { status: 500 });
  }
}
