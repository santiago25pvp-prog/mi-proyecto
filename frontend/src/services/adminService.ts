import { supabase } from '../lib/supabaseClient'

export const adminService = {
  listDocuments: async () => {
    const { data, error } = await supabase.functions.invoke('list-documents', {
        method: 'GET',
    })
    if (error) throw error
    return data
  },
  deleteDocument: async (id: string) => {
    const { data, error } = await supabase.functions.invoke(`delete-document/${id}`, {
        method: 'DELETE',
    })
    if (error) throw error
    return data
  },
  getStats: async () => {
    const { data, error } = await supabase.functions.invoke('get-stats', {
        method: 'GET',
    })
    if (error) throw error
    return data
  }
}
