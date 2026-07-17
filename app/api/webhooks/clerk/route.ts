export async function POST(req: Request) {
  const payload = await req.json();
  const eventType = payload.type;

  console.log("Webhook reçu, type:", eventType);

  if (eventType === 'user.created') {
    const { id, email_addresses } = payload.data;
    const email = email_addresses[0].email_address;
    
    console.log("Tentative d'insertion pour:", email);

    const { error } = await supabase.from('users').insert({
      user_id: id,
      email: email,
      trial_started_at: new Date().toISOString(),
      stripe_status: 'trial'
    });

    if (error) {
      console.error("Erreur Supabase:", error);
      return new Response('Erreur lors de l\'insertion', { status: 500 });
    }
    
    console.log("Utilisateur créé avec succès !");
  }

  return new Response('OK', { status: 200 });
}