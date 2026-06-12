import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Utilitário de fetch com retry automático e validação de JSON para evitar o erro "Unexpected token <"
 * Comum em ambientes de desenvolvimento e proxies reversos.
 */
export async function fetchWithRetry(
  url: string, 
  options?: RequestInit, 
  retries = 5, 
  backoff = 1000
): Promise<Response> {
  try {
    const response = await fetch(url, options);
    
    // Trata erros transitórios comuns com retry (incluindo 429 Rate Limit)
    if (!response.ok && [404, 429, 502, 503, 504].includes(response.status) && retries > 0) {
      const waitTime = response.status === 429 ? Math.max(backoff, 2000) : backoff;
      console.warn(`URL ${url} retornou ${response.status}, retentando em ${waitTime}ms... (${retries} restantes)`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return fetchWithRetry(url, options, retries - 1, response.status === 429 ? waitTime * 2 : backoff * 1.5);
    }
    
    return response;
  } catch (error: any) {
    const isNetworkError = 
      error.name === 'TypeError' || 
      error.message?.includes('Failed to fetch') || 
      error.message?.includes('NetworkError') ||
      error.message?.includes('fetch failed');

    if (retries > 0 && isNetworkError) {
      console.warn(`Erro de rede em ${url} [Tentativa ${6-retries}]: ${error.message}. Retentando em ${backoff}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }
    throw error;
  }
}

/**
 * Fetch que garante retorno de JSON ou null, evitando crash por HTML inesperado
 */
export async function safeJsonFetch<T = any>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const isGet = !options?.method || options.method.toUpperCase() === "GET";
    let finalUrl = url;
    if (isGet) {
      const separator = url.includes("?") ? "&" : "?";
      finalUrl = `${url}${separator}_t=${Date.now()}`;
    }

    const mergedOptions: RequestInit = {
      ...options,
      cache: options?.cache || "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
        ...(options?.headers || {})
      }
    };

    const response = await fetchWithRetry(finalUrl, mergedOptions);
    const contentType = response.headers.get("content-type");
    
    if (!response.ok) {
      const text = await response.text();
      console.error(`Erro no fetch (${response.status}) para ${url}:`, text.substring(0, 100));
      return null;
    }

    if (contentType && contentType.includes("application/json")) {
      try {
        return await response.json() as T;
      } catch (jsonError) {
        console.error(`Falha ao parsear JSON de ${url}:`, jsonError);
        return null;
      }
    }

    const text = await response.text();
    console.warn(`Resposta não-JSON de ${url} (Status: ${response.status}):`, text.substring(0, 100));
    return null;
  } catch (error: any) {
    console.error(`Falha crítica no fetch para ${url}: [${error.name}] ${error.message}`);
    if (error.stack) console.debug(error.stack);
    return null;
  }
}

export function isPathBlocked(
  pathname: string,
  user: any
): { blocked: boolean; type: "individual" | "geral" | null; moduleLabel: string } {
  if (!user) return { blocked: false, type: null, moduleLabel: "" };
  
  const userPerfil = (user.perfil || "").toUpperCase();
  if (userPerfil === "SUPER_ADMIN" || userPerfil === "SUPERADMIN") {
    return { blocked: false, type: null, moduleLabel: "" };
  }

  const normalPath = pathname.toLowerCase();

  // Dashboard & profile must always be accessible
  if (normalPath === "/" || normalPath === "" || normalPath.startsWith("/profile")) {
    return { blocked: false, type: null, moduleLabel: "" };
  }

  // 1. If user has global block (bloqueadoGerais), restrict everything except the dashboard
  if (user.bloqueadoGerais) {
    return {
      blocked: true,
      type: "geral",
      moduleLabel: "Acesso Geral Bloqueado",
    };
  }

  // 2. Individual modules mapping
  const mapping: Record<string, { id: string; label: string }> = {
    "/esocial": { id: "esocial", label: "eSocial (S-5002)" },
    "/reinf": { id: "reinf", label: "EFD-REINF" },
    "/empregadores": { id: "empregadores", label: "Gestão de Empregadores" },
    "/trabalhadores": { id: "trabalhadores", label: "Cadastro de Trabalhadores" },
    "/operadoras": { id: "operadoras", label: "Operadoras de Saúde" },
    "/consolidacao": { id: "consolidacao", label: "Consolidação Fiscal" },
    "/codigos-receita": { id: "codigos", label: "Códigos de Receita RFB" },
    "/pendencias": { id: "pendencias", label: "Pendências" },
    "/periodos": { id: "periodos", label: "Competências / Períodos Fiscais" },
    "/settings": { id: "settings", label: "Configurações" },
    "/governanca": { id: "governanca", label: "Governança & Acessos" }
  };

  const activePath = Object.keys(mapping).find((p) =>
    normalPath.startsWith(p)
  );

  if (activePath) {
    const { id, label } = mapping[activePath];
    const blockedList = (user.modulosBloqueados || "")
      .toLowerCase()
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean);

    // Check individual user blocks list
    if (blockedList.includes(id)) {
      return { blocked: true, type: "individual", moduleLabel: label };
    }

    // Check Dynamic Profile Permissions (except ADMIN/SUPER_ADMIN which bypass check above)
    if (user.permissoes && Object.keys(user.permissoes).length > 0) {
      // If the permission is explicitly configured as false, block them!
      if (user.permissoes[id] === false) {
        return { blocked: true, type: "individual", moduleLabel: label };
      }
    }
  }

  return { blocked: false, type: null, moduleLabel: "" };
}

export function hasDetailedAction(user: any, moduleKey: string, actionKey: string): boolean {
  if (!user) return false;
  const profile = (user.perfil || "").toUpperCase();
  if (profile === "SUPER_ADMIN" || profile === "SUPERADMIN" || profile === "ADMIN") {
    return true;
  }
  
  const permKey = `${moduleKey}_${actionKey}`;
  if (user.permissoes && user.permissoes[permKey] !== undefined) {
    return user.permissoes[permKey] === true;
  }
  
  // Default values based on classical roles if permissions are not explicitly saved yet
  if (profile === "GESTOR") {
    return true; // manager defaults to full access unless explicitly false
  }
  if (profile === "ANALISTA") {
    return actionKey === "visualizar" || actionKey === "criar" || actionKey === "editar";
  }
  if (profile === "OPERADOR") {
    return actionKey === "visualizar" || actionKey === "criar";
  }
  
  return false; // default to min-privilege (CLIENTE / custom minimalist roles)
}

