'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'STUDENT' | 'TEACHER' | 'HOD' | 'PRINCIPAL';
  departmentId: string | null;
}

interface AuthContextType {
  user: UserProfile | null;
  session: any | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<any | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  // Start as true — stay true until we've checked both Supabase AND localStorage
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (token: string): Promise<UserProfile | null> => {
    try {
      const res = await fetch('/api/auth/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // API not available
    }
    return null;
  };

  const refreshProfile = async () => {
    const token = localStorage.getItem('qgp_token');
    if (token) {
      const profile = await fetchProfile(token);
      if (profile) {
        setUser(profile);
        setSession({ access_token: token, user: profile });
      } else {
        localStorage.removeItem('qgp_token');
        localStorage.removeItem('qgp_user');
        setUser(null);
        setSession(null);
      }
    }
  };

  useEffect(() => {
    let isMounted = true;
    console.log('[AuthContext] initAuth started. isMounted:', isMounted);


    const initAuth = async () => {
      // 1. First: immediately load from localStorage (synchronous-ish, fast)
      try {
        const storedUser = localStorage.getItem('qgp_user');
        const storedToken = localStorage.getItem('qgp_token');
        if (storedUser && storedToken) {
          const parsed: UserProfile = JSON.parse(storedUser);
          if (isMounted) {
            setUser(parsed);
            setSession({ access_token: storedToken, user: parsed });
            // Don't set loading false yet — let Supabase check also run
          }
        }
      } catch {
        // ignore
      }

      // 2. Try Supabase session (might override localStorage)
      try {
        const { data: { session: supabaseSession } } = await supabase.auth.getSession();
        if (supabaseSession?.access_token && isMounted) {
          const profile = await fetchProfile(supabaseSession.access_token);
          if (profile && isMounted) {
            setSession(supabaseSession);
            setUser(profile);
            // Also sync to localStorage
            localStorage.setItem('qgp_token', supabaseSession.access_token);
            localStorage.setItem('qgp_user', JSON.stringify(profile));
          }
        }
      } catch {
        // Supabase not configured — fetch fresh profile using local token as fallback
        const storedToken = localStorage.getItem('qgp_token');
        if (storedToken && isMounted) {
          const profile = await fetchProfile(storedToken);
          if (profile && isMounted) {
            setUser(profile);
            setSession({ access_token: storedToken, user: profile });
            localStorage.setItem('qgp_user', JSON.stringify(profile));
          } else if (isMounted) {
            // Stored token is invalid or expired, clear it
            localStorage.removeItem('qgp_token');
            localStorage.removeItem('qgp_user');
            setUser(null);
            setSession(null);
          }
        }
      }

      if (isMounted) {
        console.log('[AuthContext] initAuth completed. Setting loading to false.');
        setLoading(false);
      } else {
        console.log('[AuthContext] initAuth completed, but component was unmounted. NOT setting loading.');
      }
    };

    initAuth();

    // 3. Listen for Supabase auth state changes (sign in/out from Supabase UI)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!isMounted) return;
        if (event === 'SIGNED_OUT') {
          // Only clear if we're not using localStorage fallback
          const hasLocal = !!localStorage.getItem('qgp_token');
          if (!hasLocal) {
            setUser(null);
            setSession(null);
          }
        } else if (currentSession?.access_token) {
          setSession(currentSession);
          const profile = await fetchProfile(currentSession.access_token);
          if (profile && isMounted) {
            setUser(profile);
          }
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    localStorage.removeItem('qgp_token');
    localStorage.removeItem('qgp_user');
    localStorage.removeItem('qgp_remember');
    setUser(null);
    setSession(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
