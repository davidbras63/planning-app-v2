import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  const payload = await req.json();
  const eventType = payload.type;

  if (eventType === 'user.created') {
    const { id, email_addresses } = payload.data;
    
    // Création officielle en base avec état 'trial'
    await supabase.from('users').insert({
      id: id,
      email: email_addresses[0].email_address,
      trial_started_at: new Date().toISOString(),
      stripe_status: 'trial'
    });
  }
  return new Response('OK', { status: 200 });
}
