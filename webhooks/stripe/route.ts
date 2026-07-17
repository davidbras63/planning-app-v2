import { supabase } from '@/lib/supabaseClient';

export async function POST(req: Request) {
  const payload = await req.json();
  
  if (payload.type === 'checkout.session.completed') {
    const userId = payload.data.object.client_reference_id;
    
    // Mise à jour du statut en base
    await supabase.from('users')
      .update({ stripe_status: 'active' })
      .eq('user_id', userId);
  }
  return new Response('OK', { status: 200 });
}