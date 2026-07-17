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

      // 1. Insertion dans 'user_statut' en premier pour respecter la clé étrangère
      const { error: errorStatut } = await supabase.from('user_statut').insert([
        {
          user_id: id,
          status: 'trial',
          trial_start: new Date().toISOString(),
          subscription_expired: false,
          created: new Date().toISOString()
        }
      ]);

      if (errorStatut) {
        console.error("ERREUR INSERTION STATUT:", JSON.stringify(errorStatut, null, 2));
        return new Response(JSON.stringify(errorStatut), { status: 500 });
      }

      // 2. Insertion dans 'profiles' ensuite
      const { error: errorProfile } = await supabase.from('profiles').insert([
        {
          user_id: id,
          email: email,
          name: fullName
        }
      ]);

      if (errorProfile) {
        console.error("ERREUR INSERTION PROFIL:", JSON.stringify(errorProfile, null, 2));
        return new Response(JSON.stringify(errorProfile), { status: 500 });
      }

      console.log("Utilisateur et statut créés avec succès !");
    }

    return new Response('OK', { status: 200 });
  } catch (err) {
    console.error("ERREUR SERVEUR GLOBALE:", err);
    return new Response('Internal Server Error', { status: 500 });
  }
}
