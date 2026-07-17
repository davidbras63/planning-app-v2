import { supabase } from '@/lib/supabaseClient';

export async function POST(req: Request) {
  const payload = await req.json();
  const eventType = payload.type;

  console.log("Webhook reçu, type:", eventType);

  if (eventType === 'user.created') {
    const { id, email_addresses, first_name, last_name } = payload.data;
    const email = email_addresses[0].email_address;
    const fullName = `${first_name || ''} ${last_name || ''}`.trim();

    console.log("Tentative d'insertion pour:", email);

    // On insère dans 'profiles' avec les bons noms de colonnes
    const { data, error } = await supabase.from('profiles').insert([
	 { 
	  user_id: id,
      email: email,
      name: fullName,
	  subscription_status: 'trial'
	 } 
    ]);

    if (error) {
      console.error("Erreur Supabase:", error);
      return new Response('Erreur lors de l\'insertion', { status: 500 });
    }

    console.log("Utilisateur créé avec succès !");
  }

  return new Response('OK', { status: 200 });
}
