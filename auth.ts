/**
 * Authentication and session helpers for LAME D'OR
 */
import { AppRole, Profile } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';

export interface AuthSession {
  user: {
    id: string;
    email: string;
  } | null;
  profile: Profile | null;
  role: AppRole;
  isAuthenticated: boolean;
}

export const DEFAULT_MANAGER_PROFILE: Profile = {
  id: '00000000-0000-0000-0000-000000000001',
  full_name: 'Gérant LAME D\'OR (DMS)',
  role: 'manager',
  active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const DEFAULT_CASHIER_PROFILE: Profile = {
  id: '00000000-0000-0000-0000-000000000002',
  full_name: 'Caissier Poste 1',
  role: 'cashier',
  active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export async function getCurrentSession(): Promise<AuthSession> {
  if (isSupabaseConfigured && supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      return {
        user: { id: session.user.id, email: session.user.email || '' },
        profile: profile as Profile,
        role: (profile?.role as AppRole) || 'cashier',
        isAuthenticated: true,
      };
    }
  }

  // Standalone / demo session
  return {
    user: { id: DEFAULT_MANAGER_PROFILE.id, email: 'gerant@lamedor.ml' },
    profile: DEFAULT_MANAGER_PROFILE,
    role: 'manager',
    isAuthenticated: true,
  };
}
