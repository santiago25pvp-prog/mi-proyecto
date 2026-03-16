import { supabase } from './vector-db';

export const listDocuments = async (page: number, pageSize: number) => {
  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;

  const { data, error, count } = await supabase
    .from('documents')
    .select('*', { count: 'exact' })
    .range(start, end);

  if (error) {
    throw new Error(`Error listing documents: ${error.message}`);
  }

  return { data, count };
};

export const deleteDocument = async (id: number) => {
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Error deleting document: ${error.message}`);
  }
};

export const getStats = async () => {
  const { count: documentCount, error: docError } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true });

  if (docError) {
    throw new Error(`Error fetching document count: ${docError.message}`);
  }

  // query_logs table doesn't exist in migration 001, skipping for now
  return { documentCount };
};
