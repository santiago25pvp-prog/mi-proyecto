import { supabase } from './vector-db';

export async function checkDependencies(): Promise<{ supabase: 'ok' }> {
  const { error } = await supabase
    .from('documents')
    .select('id', { head: true, count: 'exact' })
    .limit(1);

  if (error) {
    throw error;
  }

  return { supabase: 'ok' };
}
