import { createClient } from '@supabase/supabase-js';

// Utilise les mêmes variables que dans ton base_client.ts
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function checkAccess(userId: string) {
  const { data: user } = await supabase
    .from('users')
    .select('trial_started_at, stripe_status')
    .eq('id', userId)
    .single();

  if (!user) return false;

  const isTrialValid = (new Date().getTime() - new Date(user.trial_started_at).getTime()) < (30 * 60 * 1000);
  const isPaid = user.stripe_status === 'active';

  return isTrialValid || isPaid;
}