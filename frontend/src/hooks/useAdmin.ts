import { useAuth } from './useAuth'

export const useAdmin = () => {
  const { user, loading } = useAuth()
  
  // @ts-ignore
  const isAdmin = user?.app_metadata?.role === 'admin'
  
  return { isAdmin, loading, user }
}
