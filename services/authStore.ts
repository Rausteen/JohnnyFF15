import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  signUp: (email: string, password: string, pseudo: string) => Promise<{ success: boolean; error?: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,
  error: null,

  initialize: async () => {
    try {
      // Get initial session
      const { data: { session } } = await supabase.auth.getSession();
      set({ session, user: session?.user ?? null, loading: false });

      // Listen for auth changes
      supabase.auth.onAuthStateChange((_event, session) => {
        set({ session, user: session?.user ?? null });
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ loading: false });
    }
  },

  signUp: async (email, password, pseudo) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            pseudo,
          },
        },
      });

      if (error) {
        set({ error: error.message, loading: false });
        return { success: false, error: error.message };
      }

      set({ user: data.user, session: data.session, loading: false });
      return { success: true };
    } catch (error: any) {
      const errorMessage = error.message || 'Erreur lors de l\'inscription';
      set({ error: errorMessage, loading: false });
      return { success: false, error: errorMessage };
    }
  },

  signIn: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        set({ error: error.message, loading: false });
        return { success: false, error: error.message };
      }

      set({ user: data.user, session: data.session, loading: false });
      return { success: true };
    } catch (error: any) {
      const errorMessage = error.message || 'Erreur lors de la connexion';
      set({ error: errorMessage, loading: false });
      return { success: false, error: errorMessage };
    }
  },

  signOut: async () => {
    set({ loading: true });
    try {
      await supabase.auth.signOut();
      set({ user: null, session: null, loading: false });
    } catch (error) {
      console.error('Sign out error:', error);
      set({ loading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
