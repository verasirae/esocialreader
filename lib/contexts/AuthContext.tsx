"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { LoginPage } from "@/components/LoginPage";
import { SessionUser } from "@/lib/auth-server";

interface AuthContextType {
  user: SessionUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSession = async () => {
    try {
      const resp = await fetch("/api/auth/me");
      if (resp.ok) {
        const contentType = resp.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await resp.json();
          setUser(data.user);
        } else {
          console.warn("Resposta não-JSON para /api/auth/me");
          setUser(null);
        }
      } else if (resp.status === 403) {
        setUser(null);
      }
    } catch (e) {
      console.error("Erro ao carregar sessão:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const resp = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const contentType = resp.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await resp.json();
        if (resp.ok && data.success) {
          setUser(data.user);
          return { success: true };
        } else {
          return { success: false, error: data.error || "Credenciais inválidas" };
        }
      } else {
        const text = await resp.text();
        console.error("Erro não-JSON no login:", text.substring(0, 100));
        return { success: false, error: "O servidor retornou uma resposta inválida." };
      }
    } catch (e) {
      console.error("Erro no login:", e);
      return { success: false, error: "Erro de conexão com o servidor" };
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error("Erro no logout:", e);
    } finally {
      setUser(null);
    }
  };

  const refreshUser = async () => {
    await fetchSession();
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAF9FC]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin text-primary rounded-full h-8 w-8 border-b-2 border-[#1B365D]" />
          <span className="text-[10px] font-black text-secondary uppercase tracking-[0.2em]">Carregando Compliance Portal...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
        <LoginPage />
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
}
