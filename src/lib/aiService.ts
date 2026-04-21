import { groqService } from './groq';
import { deepseekService } from './deepseek';

export type AIProvider = 'groq' | 'deepseek';

export interface AIConfig {
  provider: AIProvider;
  model: string;
  deepseekKey?: string;
}

/**
 * Router centrale per i servizi di Intelligenza Artificiale.
 * Smista le richieste tra i vari provider configurati (Groq, DeepSeek).
 */
export const aiService = {
  /**
   * Avvia uno stream di chat smistando la richiesta al provider attivo.
   * 
   * @param config - Configurazione AI dell'utente (provider, modello, chiavi)
   * @param messages - Storia della conversazione
   * @param onChunk - Callback per i dati in streaming
   * @param options - Opzioni extra (temperatura, segnale di stop)
   * @throws Error se la configurazione è incompleta o il provider non risponde
   */
  async streamChat(
    config: AIConfig,
    messages: any[],
    onChunk: (text: string) => void,
    options?: { temperature?: number, signal?: AbortSignal }
  ) {
    // Validazione iniziale della configurazione (Rule 2)
    if (!config.provider) {
      throw new Error('Configurazione di sicurezza: Nessun provider AI selezionato.');
    }

    try {
      if (config.provider === 'deepseek') {
        if (!config.deepseekKey) {
          throw new Error('Identità DeepSeek non verificata: chiave mancante nel profilo.');
        }
        
        return await deepseekService.streamChatCompletion(
          config.deepseekKey,
          messages,
          onChunk,
          options?.temperature,
          options?.signal
        );
      }

      // Default: Groq Core Architecture
      return await groqService.streamChatCompletion(
        messages,
        'llama-3.3-70b-versatile',
        onChunk,
        options?.temperature,
        options?.signal
      );
    } catch (err: any) {
      // Gestione Errori Sicura (Rule 3)
      console.error(`[SECURITY LOG] AI Factory Exception (${config.provider}):`, err.message);
      throw err; // Rilanciamo l'errore già sanificato dai servizi sottostanti
    }
  }
};
