import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import type { User, PlanType, BillingCycle, DownloadHistoryItem } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface SupabaseErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
}

export function handleSupabaseError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: SupabaseErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path
  };
  console.error('Supabase Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string, displayName?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  clearError: () => void;
  incrementUsage: () => Promise<void>;
  updatePlan: (plan: PlanType, cycle: BillingCycle) => Promise<void>;
  addToHistory: (item: Omit<DownloadHistoryItem, 'timestamp'>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isSigningUp = useRef(false);

  useEffect(() => {
    let customerSubscription: any = null;
    let downloadsSubscription: any = null;

    const loadUserProfile = async (sessionUser: any) => {
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .eq('id', sessionUser.id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') { // Case: Record not found
            console.log("Perfil não encontrado, criando perfil inicial...");
            const today = new Date().toISOString().split('T')[0];
            const { data: newData, error: insertError } = await supabase
              .from('customers')
              .insert({
                id: sessionUser.id,
                email: sessionUser.email,
                display_name: sessionUser.user_metadata?.display_name || sessionUser.email?.split('@')[0] || 'Usuário',
                plan: 'free',
                last_use_date: today
              })
              .select()
              .single();
            
            if (insertError) throw insertError;
            if (newData) {
              setUser(prev => ({
                uid: sessionUser.id,
                email: newData.email,
                displayName: newData.display_name,
                plan: newData.plan,
                billingCycle: newData.billing_cycle,
                trialUses: newData.trial_uses,
                dailyUses: newData.daily_uses,
                monthlyUses: newData.monthly_uses,
                lastUseDate: newData.last_use_date,
                renewalDate: newData.renewal_date,
                downloadHistory: prev?.downloadHistory || []
              }));
            }
          } else {
            throw error;
          }
        } else if (data) {
          const today = new Date().toISOString().split('T')[0];
          setUser(prev => ({
            uid: sessionUser.id,
            email: data.email || sessionUser.email,
            displayName: data.display_name || sessionUser.user_metadata?.display_name || sessionUser.email?.split('@')[0] || 'Usuário',
            plan: data.plan || 'free',
            billingCycle: data.billing_cycle || 'monthly',
            trialUses: data.trial_uses ?? 4,
            dailyUses: data.daily_uses || 0,
            monthlyUses: data.monthly_uses || 0,
            lastUseDate: data.last_use_date || today,
            renewalDate: data.renewal_date,
            downloadHistory: prev?.downloadHistory || []
          }));
        }
      } catch (err: any) {
        console.error("Erro ao carregar perfil:", err.message);
      }
    };

    const loadDownloadHistory = async (sessionUser: any) => {
      try {
        const { data, error } = await supabase
          .from('downloads')
          .select('*')
          .eq('customer_id', sessionUser.id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;
        if (data) {
          setUser(prev => ({
            ...(prev || {} as User),
            downloadHistory: data.map(d => ({
              id: d.id,
              src: d.src,
              prompt: d.prompt,
              timestamp: { toDate: () => new Date(d.created_at) } as any
            }))
          }));
        }
      } catch (err: any) {
        console.error("Erro ao carregar downloads:", err.message);
      }
    };

    const handleAuthChange = async (event: string, session: any) => {
      if (session?.user) {
        setLoading(true);
        const sessionUser = session.user;
        
        // Initial Fetch
        await loadUserProfile(sessionUser);
        await loadDownloadHistory(sessionUser);
        
        // Setup Realtime for Customer Data
        if (customerSubscription) supabase.removeChannel(customerSubscription);
        customerSubscription = supabase
          .channel('public:customers')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'customers', filter: `id=eq.${sessionUser.id}` }, (payload) => {
            loadUserProfile(sessionUser); // Reload to ensure we get correct mapped data
          })
          .subscribe();

        // Setup Realtime for Downloads
        if (downloadsSubscription) supabase.removeChannel(downloadsSubscription);
        downloadsSubscription = supabase
          .channel('public:downloads')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'downloads', filter: `customer_id=eq.${sessionUser.id}` }, (payload) => {
            loadDownloadHistory(sessionUser);
          })
          .subscribe();

        setLoading(false);
      } else {
        setUser(null);
        setLoading(false);
        if (customerSubscription) supabase.removeChannel(customerSubscription);
        if (downloadsSubscription) supabase.removeChannel(downloadsSubscription);
      }
    };

    // Get Initial Session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthChange('INITIAL_SESSION', session);
    });

    // Listen for Auth Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      handleAuthChange(event, session);
    });

    return () => {
      subscription.unsubscribe();
      if (customerSubscription) supabase.removeChannel(customerSubscription);
      if (downloadsSubscription) supabase.removeChannel(downloadsSubscription);
    };
  }, []);

  const login = async (email: string, pass: string) => {
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setError('E-mail ou senha incorretos.');
      } else {
        setError(`Erro: ${error.message}`);
      }
      throw error;
    }
  };

  const signup = async (email: string, pass: string, displayName?: string) => {
    setError(null);
    isSigningUp.current = true;
    const { error } = await supabase.auth.signUp({ 
      email, 
      password: pass,
      options: {
        data: {
          display_name: displayName
        }
      }
    });
    
    isSigningUp.current = false;
    if (error) {
      if (error.message.includes('User already registered')) {
        setError('Este e-mail já está em uso.');
      } else if (error.message.includes('Password should be')) {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else {
        setError(`Erro: ${error.message}`);
      }
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
    if (error) {
      setError('Erro ao entrar com Google. Tente novamente.');
      setLoading(false);
      throw error;
    }
  };

  const incrementUsage = async () => {
    console.debug('incrementUsage called locally, but should be handled by backend.');
  };

  const updatePlan = async (plan: PlanType, cycle: BillingCycle) => {
    if (!user) return;
    const renewalDate = new Date();
    renewalDate.setMonth(renewalDate.getMonth() + (cycle === 'monthly' ? 1 : 12));

    const { error } = await supabase
      .from('customers')
      .update({
        plan,
        billing_cycle: (plan === 'intermediate' || plan === 'premium') ? 'annual' : cycle,
        renewal_date: renewalDate.toISOString()
      })
      .eq('id', user.uid);

    if (error) {
      handleSupabaseError(error, OperationType.UPDATE, `customers/${user.uid}`);
    }
  };

  const addToHistory = async (item: Omit<DownloadHistoryItem, 'timestamp'>) => {
    if (!user || user.uid === 'guest-user') return;
    
    const { error } = await supabase
      .from('downloads')
      .insert({
        customer_id: user.uid,
        src: item.src,
        prompt: item.prompt
      });

    if (error) {
      handleSupabaseError(error, OperationType.CREATE, `downloads`);
    }
  };

  const resetPassword = async (email: string) => {
    setError(null);
    if (!email) {
      const msg = 'Por favor, insira seu e-mail.';
      setError(msg);
      throw new Error(msg);
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      setError(`Erro: ${error.message}`);
      throw error;
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider value={{ user, loading, error, login, signup, loginWithGoogle, logout, resetPassword, clearError, incrementUsage, updatePlan, addToHistory }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
