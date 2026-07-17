console.log("LOG DE VERIFICATION : LE FICHIER ROUTE.TS EST BIEN CHARGE");

import { supabase } from '@/lib/supabaseClient';

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const eventType = payload.type;

    if (eventType === 'user.created') {
      const { id, email_addresses, first_name, last_name } = payload.data;
      const email = email_addresses[0].email_address;
      const fullName = `${first_name || ''} ${last_name || ''}`.trim();

      // 1. Insertion dans 'user_status' (avec les noms exacts de tes colonnes)
      const { error: errorStatut } = await supabase.from('user_status').insert([
        {
          user_id: id,
          status: 'trial',
          trial_started_at: new Date().toISOString(), // Corrigé ici
          subscription_expires_at: null, // Corrigé ici
          created_at: new Date().toISOString() // Corrigé ici
        }
      ]);

      if (errorStatut) {
        console.error("ERREUR INSERTION STATUT:", errorStatut);
        return new Response(JSON.stringify(errorStatut), { status: 500 });
      }

      // 2. Insertion dans 'profiles'
      const { error: errorProfile } = await supabase.from('profiles').insert([
        {
          user_id: id,
          email: email,
          name: fullName
        }
      ]);

      if (errorProfile) {
        console.error("ERREUR INSERTION PROFIL:", errorProfile);
        return new Response(JSON.stringify(errorProfile), { status: 500 });
      }
    }

    return new Response('OK', { status: 200 });
  } catch (err) {
    return new Response('Internal Server Error', { status: 500 });
  }
}
