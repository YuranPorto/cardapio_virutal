import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

const AuthContext = createContext(null);

const LOCAL_USER_KEY = 'cardapio_auth_user';
const LOCAL_PROFILE_KEY = 'cardapio_auth_profile';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Inicializar sessão
  useEffect(() => {
    let mounted = true;

    async function initSession() {
      if (isSupabaseConfigured) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user && mounted) {
            setUser(session.user);
            await loadProfile(session.user);
          }
        } catch (err) {
          console.warn('Erro ao obter sessão Supabase:', err);
        }
      }

      // Fallback local se não logado via Supabase
      if (mounted) {
        const cachedUser = localStorage.getItem(LOCAL_USER_KEY);
        const cachedProfile = localStorage.getItem(LOCAL_PROFILE_KEY);
        if (cachedUser) {
          setUser(JSON.parse(cachedUser));
        }
        if (cachedProfile) {
          setProfile(JSON.parse(cachedProfile));
        }
        setLoading(false);
      }
    }

    initSession();

    // Listener de auth do Supabase
    let subscription = null;
    if (isSupabaseConfigured) {
      const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (!mounted) return;
        if (session?.user) {
          setUser(session.user);
          await loadProfile(session.user);
        } else {
          setUser(null);
          setProfile(null);
          localStorage.removeItem(LOCAL_USER_KEY);
          localStorage.removeItem(LOCAL_PROFILE_KEY);
        }
      });
      subscription = data.subscription;
    }

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  async function loadProfile(currentUser) {
    if (!currentUser) return;

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .maybeSingle();

        if (!error && data) {
          setProfile(data);
          localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(data));
          return;
        }
      } catch (e) {
        console.warn('Erro ao carregar perfil do Supabase:', e);
      }
    }

    // Perfil derivado dos metadados do auth
    const isMasterAdmin = currentUser.email?.toLowerCase() === 'yuranporto@gmail.com';
    const fallbackProfile = {
      id: currentUser.id,
      full_name: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || 'Cliente',
      phone: currentUser.user_metadata?.phone || '',
      role: isMasterAdmin ? 'admin' : (currentUser.user_metadata?.role || 'customer'),
    };
    setProfile(fallbackProfile);
    localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(fallbackProfile));
  }

  // Cadastro convencional
  async function registerWithEmail(email, password, fullName, phone) {
    if (!phone || phone.trim().length < 10) {
      throw new Error('O número de WhatsApp/telefone é obrigatório para notificações de pedidos.');
    }

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
            role: 'customer',
          },
        },
      });

      if (error) throw error;
      if (data.user) {
        setUser(data.user);
        const newProf = {
          id: data.user.id,
          full_name: fullName,
          phone: phone,
          role: 'customer',
        };
        setProfile(newProf);
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(data.user));
        localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(newProf));
      }
      return data;
    }

    // Mock local de cadastro
    const mockUser = {
      id: `usr-${Date.now()}`,
      email,
      user_metadata: { full_name: fullName, phone },
    };
    const mockProf = {
      id: mockUser.id,
      full_name: fullName,
      phone,
      role: 'customer',
    };
    setUser(mockUser);
    setProfile(mockProf);
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(mockUser));
    localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(mockProf));
    return { user: mockUser };
  }

  // Login convencional
  async function loginWithEmail(email, password) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      if (data.user) {
        setUser(data.user);
        await loadProfile(data.user);
      }
      return data;
    }

    // Mock local
    const isAdmin = email.toLowerCase().includes('admin');
    const mockUser = {
      id: isAdmin ? 'usr-admin-01' : `usr-${Date.now()}`,
      email,
      user_metadata: {
        full_name: isAdmin ? 'Administrador Chefe' : email.split('@')[0],
        phone: isAdmin ? '5511999998888' : '5511988887777',
      },
    };
    const mockProf = {
      id: mockUser.id,
      full_name: mockUser.user_metadata.full_name,
      phone: mockUser.user_metadata.phone,
      role: isAdmin ? 'admin' : 'customer',
    };
    setUser(mockUser);
    setProfile(mockProf);
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(mockUser));
    localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(mockProf));
    return { user: mockUser };
  }

  // Login Social: Google, Facebook, etc.
  async function loginWithOAuth(provider) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider === 'instagram' ? 'facebook' : provider, // Meta unificada
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      return data;
    }

    // Mock de Login Social imediato para demonstração e testes
    const mockUser = {
      id: `usr-${provider}-${Date.now()}`,
      email: `usuario.${provider}@exemplo.com`,
      user_metadata: {
        full_name: `Usuário ${provider.charAt(0).toUpperCase() + provider.slice(1)}`,
        phone: '', // Propositalmente vazio para testar a obrigatoriedade do telefone
      },
    };
    const mockProf = {
      id: mockUser.id,
      full_name: mockUser.user_metadata.full_name,
      phone: '',
      role: 'customer',
    };
    setUser(mockUser);
    setProfile(mockProf);
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(mockUser));
    localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(mockProf));
    return { user: mockUser };
  }

  // Atualizar telefone obrigatório do perfil
  async function updatePhone(phone) {
    if (!phone || phone.trim().length < 10) {
      throw new Error('Informe um número de WhatsApp válido com DDD.');
    }

    const updatedProfile = { ...(profile || {}), phone };
    setProfile(updatedProfile);
    localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(updatedProfile));

    if (isSupabaseConfigured && user) {
      try {
        await supabase
          .from('profiles')
          .update({ phone, updated_at: new Date().toISOString() })
          .eq('id', user.id);
      } catch (err) {
        console.warn('Erro ao atualizar telefone no Supabase:', err);
      }
    }
    return updatedProfile;
  }

  async function logout() {
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Erro ao deslogar do Supabase:', e);
      }
    }
    setUser(null);
    setProfile(null);
    localStorage.removeItem(LOCAL_USER_KEY);
    localStorage.removeItem(LOCAL_PROFILE_KEY);
  }

  const isAdmin =
    profile?.role === 'admin' ||
    user?.email?.toLowerCase() === 'yuranporto@gmail.com';
  const hasPhone = Boolean(profile?.phone && profile.phone.trim().length >= 10);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAdmin,
        hasPhone,
        loading,
        registerWithEmail,
        loginWithEmail,
        loginWithOAuth,
        updatePhone,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
}
