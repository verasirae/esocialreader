"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";

export interface Empresa {
  id: string;
  cnpjRaiz: string;
  cnpjCompleto: string | null;
  razaoSocial: string | null;
  nomeFantasia: string | null;
}

interface EmpresaContextType {
  activeEmpresa: Empresa | null;
  activeEmpresaId: string | null;
  empresas: Empresa[];
  isLoading: boolean;
  setEmpresa: (empresa: Empresa | null) => void;
  refreshEmpresas: () => Promise<void>;
}

const EmpresaContext = createContext<EmpresaContextType | undefined>(undefined);

export function EmpresaProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [activeEmpresa, setActiveEmpresaState] = useState<Empresa | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEmpresas = async () => {
    try {
      const res = await fetch("/api/esocial/empresas?pageSize=all");
      const result = await res.json();
      if (result && result.data) {
        setEmpresas(result.data);
        return result.data;
      }
    } catch (err) {
      console.error("Erro ao carregar empresas para o contexto:", err);
    }
    return [];
  };

  // Sincronizar empresas ao montar e quando o usuário mudar
  useEffect(() => {
    if (!user) {
      setActiveEmpresaState(null);
      setEmpresas([]);
      setIsLoading(false);
      return;
    }

    const init = async () => {
      setIsLoading(true);
      const loadedEmpresas = await fetchEmpresas();

      // Recuperar última empresa selecionada do localStorage se existir
      const savedId = localStorage.getItem("active_empresa_id");
      if (savedId && loadedEmpresas.length > 0) {
        const found = loadedEmpresas.find((e: Empresa) => e.id === savedId);
        if (found) {
          setActiveEmpresaState(found);
        }
      }
      setIsLoading(false);
    };

    init();
  }, [user]);

  const setEmpresa = (empresa: Empresa | null) => {
    setActiveEmpresaState(empresa);
    if (empresa) {
      localStorage.setItem("active_empresa_id", empresa.id);
      // Disparar evento para que páginas saibam que a empresa mudou
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("active-empresa-changed", { detail: empresa }));
      }
    } else {
      localStorage.removeItem("active_empresa_id");
    }
  };

  const refreshEmpresas = async () => {
    const loaded = await fetchEmpresas();
    // Se a empresa ativa não está mais na lista ou a lista estava vazia e agora tem dados,
    // atualizamos apropriadamente.
    if (activeEmpresa) {
      const stillExists = loaded.find((e: Empresa) => e.id === activeEmpresa.id);
      if (!stillExists) {
        setEmpresa(null);
      }
    }
  };

  const activeEmpresaId = activeEmpresa ? activeEmpresa.id : null;

  return (
    <EmpresaContext.Provider
      value={{
        activeEmpresa,
        activeEmpresaId,
        empresas,
        isLoading,
        setEmpresa,
        refreshEmpresas,
      }}
    >
      {children}
    </EmpresaContext.Provider>
  );
}

export function useEmpresa() {
  const context = useContext(EmpresaContext);
  if (context === undefined) {
    throw new Error("useEmpresa deve ser usado dentro de um EmpresaProvider");
  }
  return context;
}
