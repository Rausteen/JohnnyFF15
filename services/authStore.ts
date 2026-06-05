import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { useCreditsStore } from './creditsStore';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  signUp: (pseudo: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signIn: (pseudo: string, password: string) => Promise<{ success: boolean; error?: string }>;
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

      // Load profile if user is logged in
      if (session?.user) {
        useCreditsStore.getState().loadProfile(session.user.id);
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange((_event, session) => {
        set({ session, user: session?.user ?? null });

        // Load or clear profile based on auth state
        if (session?.user) {
          useCreditsStore.getState().loadProfile(session.user.id);
        } else {
          useCreditsStore.getState().clearProfile();
        }
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ loading: false });
    }
  },

  signUp: async (pseudo, password) => {
    set({ loading: true, error: null });
    try {
      // Normalize pseudo for email generation (lowercase, no special chars)
      const normalizedPseudo = pseudo.toLowerCase().replace(/[^a-z0-9]/g, '');
      const fakeEmail = `${normalizedPseudo}@jff15.bet`;

      // Check if pseudo is already taken
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('pseudo', pseudo)
        .single();

      if (existingUser) {
        set({ error: 'Ce pseudo est déjà pris !', loading: false });
        return { success: false, error: 'Ce pseudo est déjà pris !' };
      }

      const { data, error } = await supabase.auth.signUp({
        email: fakeEmail,
        password,
        options: {
          data: {
            pseudo,
          },
          // Skip email confirmation for fake emails
          emailRedirectTo: undefined,
        },
      });

      if (error) {
        // Handle duplicate email (same pseudo tried to register again)
        if (error.message.includes('already registered')) {
          set({ error: 'Ce pseudo est déjà pris !', loading: false });
          return { success: false, error: 'Ce pseudo est déjà pris !' };
        }
        set({ error: error.message, loading: false });
        return { success: false, error: error.message };
      }

      set({ user: data.user, session: data.session, loading: false });

      // Load profile for new user
      if (data.user) {
        // Small delay to allow trigger to create profile
        setTimeout(() => {
          useCreditsStore.getState().loadProfile(data.user!.id);
        }, 1000);
      }

      return { success: true };
    } catch (error: any) {
      const errorMessage = error.message || 'Erreur lors de l\'inscription';
      set({ error: errorMessage, loading: false });
      return { success: false, error: errorMessage };
    }
  },

  signIn: async (pseudo, password) => {
    set({ loading: true, error: null });
    try {
      // Generate email from pseudo
      const normalizedPseudo = pseudo.toLowerCase().replace(/[^a-z0-9]/g, '');
      const fakeEmail = `${normalizedPseudo}@jff15.bet`;

      const { data, error } = await supabase.auth.signInWithPassword({
        email: fakeEmail,
        password,
      });

      if (error) {
        // Translate common errors to French
        if (error.message.includes('Invalid login')) {
          set({ error: 'Pseudo ou mot de passe incorrect', loading: false });
          return { success: false, error: 'Pseudo ou mot de passe incorrect' };
        }
        set({ error: error.message, loading: false });
        return { success: false, error: error.message };
      }

      set({ user: data.user, session: data.session, loading: false });

      // Load profile
      if (data.user) {
        useCreditsStore.getState().loadProfile(data.user.id);
      }

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
      useCreditsStore.getState().clearProfile();
      set({ user: null, session: null, loading: false });
    } catch (error) {
      console.error('Sign out error:', error);
      set({ loading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
