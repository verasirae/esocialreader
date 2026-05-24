class FiscalCache {
  private cache = new Map<string, any>();

  get(key: string) {
    return this.cache.get(key);
  }

  set(key: string, value: any) {
    this.cache.set(key, value);
  }

  invalidate(empresaId?: string) {
    if (!empresaId) {
      this.cache.clear();
      return;
    }
    for (const key of Array.from(this.cache.keys())) {
      if (key.startsWith(empresaId) || key.includes(empresaId)) {
        this.cache.delete(key);
      }
    }
  }
}

export const fiscalCache = new FiscalCache();
