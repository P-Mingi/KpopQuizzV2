import { createServerClient } from '@kpopquiz/shared/supabase/server';

export async function getSession() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
