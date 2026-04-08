import { supabase } from './vector-db';

interface DocumentRow {
  id: number;
  content: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

const transformDocument = (doc: DocumentRow) => ({
  id: doc.id,
  name: doc.metadata?.url || (doc.content ? doc.content.substring(0, 50) + (doc.content.length > 50 ? '...' : '') : `Documento ${doc.id}`),
  content: doc.content,
  created_at: doc.metadata?.created_at || doc.created_at,
  metadata: doc.metadata,
});

export const listDocuments = async (page: number, pageSize: number) => {
  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;

  const { data, error, count } = await supabase
    .from('documents')
    .select('id, content, metadata, created_at', { count: 'exact' })
    .range(start, end)
    .limit(pageSize);

  if (error) {
    throw new Error(`Error listing documents: ${error.message}`);
  }

  const transformedData = (data || []).map(transformDocument);
  return { data: transformedData, count };
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
  const { count: docCount, error: docError } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true });

  if (docError) {
    throw new Error(`Error fetching document count: ${docError.message}`);
  }

  // query_logs table doesn't exist in migration 001, skipping for now
  return { docCount, requestCount: 0 };
};
