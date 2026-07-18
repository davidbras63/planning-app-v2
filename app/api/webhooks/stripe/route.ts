import { supabase } from '@/lib/supabaseClient';

export async function POST(req: Request) {
  const payload = await req.json();

  if (payload.type === 'checkout.session.completed') {
    const userId = payload.data.object.client_reference_id;
    
    // On met à jour la table 'user_status' au lieu de 'users'
    const { error } = await supabase
      .from('user_status')
      .update({ 
        status: 'active', // Ou 'light' / 'premium' si tu veux être précis
        subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() 
      })
      .eq('user_id', userId);

    if (error) {
      console.error("Erreur lors de la mise à jour Stripe :", error);
      return new Response('Erreur base de données', { status: 500 });
    }
  }
  
  return new Response('OK', { status: 200 });
}
