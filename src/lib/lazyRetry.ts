import React from 'react';

/**
 * Helper per caricamento lazy dei moduli con gestione automatica degli errori di chunk.
 * Risolve il problema "Failed to fetch dynamically imported module" che accade 
 * quando viene effettuato un nuovo deployment e i vecchi chunk non sono più disponibili.
 */
export function lazyRetry<T extends React.ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>,
  name: string
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    const hasRetried = window.sessionStorage.getItem(`retry-lazy-${name}`);

    try {
      const component = await componentImport();
      window.sessionStorage.removeItem(`retry-lazy-${name}`);
      return component;
    } catch (error) {
      if (!hasRetried) {
        window.sessionStorage.setItem(`retry-lazy-${name}`, 'true');
        console.warn(`[LAZY RETRY] Fallimento nel caricamento di ${name}. Riprovo caricamento...`);
        return window.location.reload() as any;
      }
      
      console.error(`[LAZY RETRY] Errore critico nel caricamento di ${name} dopo retry:`, error);
      throw error;
    }
  });
}
