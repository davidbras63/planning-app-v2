console.log("LOG DE VERIFICATION : LE FICHIER ROUTE.TS EST BIEN CHARGE");

import { supabaseAdmin as supabase } from '@/lib/supabaseClient';

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const eventType = payload.type;

    if (eventType === 'user.created') {
      const { id, email_addresses, first_name, last_name } = payload.data;
      const email = email_addresses[0].email_address;
      const fullName = `${first_name || ''} ${last_name || ''}`.trim();

      // 1. Upsert dans 'user_status'
      const { error: errorStatut } = await supabase.from('user_status').upsert([
        {
          user_id: id,
          status: 'trial',
          trial_started_at: new Date().toISOString(),
          subscription_expires_at: null,
          created_at: new Date().toISOString()
        }
      ]);

      if (errorStatut) {
        console.error("ERREUR UPSERT STATUT:", errorStatut);
      }

      // 2. Upsert dans 'profiles' (maintenant indépendant du premier)
      const { error: errorProfile } = await supabase
	  .from('profiles')
	  .upsert(
		{
		  user_id: id, // L'ID venant de Clerk
		  email: email,
		  name: fullName
		},
		{ onConflict: 'user_id' } // C'est ça qui utilise ta nouvelle règle "Unique"
	  );

      if (errorProfile) {
        console.error("ERREUR UPSERT PROFIL:", errorProfile);
        return new Response(JSON.stringify(errorProfile), { status: 500 });
      }

      console.log("Traitement terminé pour:", email);
    }

    return new Response('OK', { status: 200 });
  } catch (err) {
    console.error("ERREUR GLOBALE:", err);
    return new Response('Internal Server Error', { status: 500 });
  }
}
