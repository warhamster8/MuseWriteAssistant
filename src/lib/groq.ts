import Groq from 'groq-sdk';

const apiKey = import.meta.env.VITE_GROQ_API_KEY;

const groq = apiKey ? new Groq({ apiKey, dangerouslyAllowBrowser: true }) : null;

/**
 * Servizio per l'interazione con l'SDK di Groq.
 * Gestisce chiamate sincrone e streaming con convalida della configurazione.
 */
export const groqService = {
  /**
   * Ottiene un'istanza di Groq con la chiave fornita o quella d'ambiente.
   */
  getInstance(providedKey?: string) {
    const key = providedKey || apiKey;
    if (!key) return null;
    return new Groq({ apiKey: key, dangerouslyAllowBrowser: true });
  },

  /**
   * Ottiene una chat completion completa (non stream).
   * 
   * @throws Error se la chiave API non è configurata o la chiamata fallisce.
   */
  async getChatCompletion(messages: any[], model = 'llama-3.3-70b-versatile', temperature = 0.5, apiKey?: string) {
    const instance = this.getInstance(apiKey);
    if (!instance) {
      console.error('[SECURITY LOG] Groq instance not initialized. Check VITE_GROQ_API_KEY.');
      throw new Error('Servizio Groq momentaneamente non disponibile.');
    }
    
    try {
      return await instance.chat.completions.create({
        messages,
        model,
        temperature,
      });
    } catch (err: any) {
      console.error('[SECURITY LOG] Groq API Exception:', err.message);
      throw new Error('Errore durante l\'elaborazione della richiesta Groq.');
    }
  },

  /**
   * Avvia una chat completion in streaming.
   * 
   * @param onChunk - Callback per gestire i frammenti di testo ricevuti.
   * @param signal - AbortSignal per terminare preventivamente la richiesta.
   */
  async streamChatCompletion(
    messages: any[],
    model = 'llama-3.3-70b-versatile',
    onChunk: (text: string) => void,
    temperature = 0.55,
    signal?: AbortSignal,
    apiKey?: string
  ) {
    const instance = this.getInstance(apiKey);
    if (!instance) {
      console.error('[SECURITY LOG] Groq stream requested but instance missing.');
      throw new Error('Servizio Groq non configurato.');
    }

    try {
      const stream = await instance.chat.completions.create({
        messages,
        model,
        stream: true,
        temperature,
        max_tokens: 4096, // Ottimizzato per output lunghi
      }, { signal });

      for await (const chunk of stream) {
        if (signal?.aborted) break;
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) onChunk(content);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('[SECURITY LOG] Groq Stream Exception:', err.message);
      throw new Error('Errore nello streaming dei dati dal motore Groq.');
    }
  },
  
  /**
   * Verifica la connettività con l'endpoint Groq.
   */
  async testConnection(apiKey?: string, model = 'llama-3.3-70b-versatile') {
    const instance = this.getInstance(apiKey);
    if (!instance) return { ok: false, status: 0, error: 'Groq non inizializzato' };
    
    try {
      const result = await instance.chat.completions.create({
        messages: [{ role: 'user', content: 'Ping' }],
        model,
        max_tokens: 1
      });
      return {
        ok: true,
        status: 200,
        data: { status: 'online', model: result.model }
      };
    } catch (err: any) {
      console.error('[SECURITY LOG] Groq Connection Test Failed:', err.message);
      return {
        ok: false,
        status: 0,
        error: err.message || 'Errore di connessione Groq'
      };
    }
  }
};
