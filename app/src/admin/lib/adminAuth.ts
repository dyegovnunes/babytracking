import { supabase } from '../../lib/supabase';

const ADMIN_EMAIL = 'dyego.vnunes@gmail.com';

export async function signInAdmin(email: string, password: string) {
  if (email.toLowerCase() !== ADMIN_EMAIL) {
    throw new Error('Acesso não autorizado.');
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function checkAdminAccess(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  if (user.email?.toLowerCase() !== ADMIN_EMAIL) return false;

  const { data } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  return data?.is_admin === true;
}

export async function signOutAdmin() {
  await supabase.auth.signOut();
}
