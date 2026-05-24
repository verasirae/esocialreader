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
    
    // Trata erros transitórios comuns com retry
    if (!response.ok && [404, 502, 503, 504].includes(response.status) && retries > 0) {
      // Se for 404 e for uma rota de API que EU sei que deveria existir, pode ser que o next esteja carregando
      console.warn(`URL ${url} retornou ${response.status}, retentando em ${backoff}ms... (${retries} restantes)`);
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 1.5);
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
