import { supabase } from '../../lib/supabase';

export async function isUserAdmin(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .single();

  return data?.is_admin === true;
}

export async function signOutAdmin() {
  await supabase.auth.signOut();
}
