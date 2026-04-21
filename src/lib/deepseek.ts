/**
 * Servizio per l'interazione con l'API di DeepSeek.
 * Implementa streaming e test di connessione con gestione errori sicura.
 */
export const deepseekService = {
  /**
   * Avvia una chat completion in streaming.
   * 
   * @param apiKey - Chiave API DeepSeek (sk-...)
   * @param messages - Array di messaggi nel formato {role, content}
   * @param onChunk - Callback invocata per ogni frammento di testo ricevuto
   * @param temperature - Parametro di creatività (default 0.7)
   * @param signal - AbortSignal per annullare la richiesta
   * @throws Error se la chiave è mancante o la validazione fallisce
   */
  async streamChatCompletion(
    apiKey: string,
    messages: any[],
    onChunk: (text: string) => void,
    temperature = 0.7,
    signal?: AbortSignal
  ) {
    // Validazione rigida: la chiave deve avere il prefisso corretto e una lunghezza minima
    if (!apiKey || !apiKey.startsWith('sk-') || apiKey.length < 20) {
      throw new Error('Configurazione di sicurezza: Chiave DeepSeek non valida o malformata');
    }

    try {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`,
        },
        signal,
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages,
          temperature,
          stream: true,
        }),
      });

      if (!response.ok) {
        // Gestione errori sicura: log dettagliato interno e messaggio generico
        const errorData = await response.json().catch(() => ({}));
        console.error('[SECURITY LOG] DeepSeek API Error:', {
          status: response.status,
          detail: errorData.error?.message
        });
        throw new Error(`Sorgente AI non disponibile (Status: ${response.status}). Riprova più tardi.`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Interfaccia di comunicazione streaming fallita');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        if (signal?.aborted) {
          reader.cancel();
          break;
        }
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;

          if (trimmedLine.startsWith('data: ')) {
            try {
              const json = JSON.parse(trimmedLine.substring(6));
              const content = json.choices?.[0]?.delta?.content;
              if (content) {
                onChunk(content);
              }
            } catch (e) {
              // Silenzioso: frammento JSON incompleto durante lo stream
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('[SECURITY LOG] DeepSeek Stream Exception:', err.message);
      throw err;
    }
  },

  /**
   * Verifica la validità della chiave API eseguendo una chiamata minima.
   */
  async testConnection(apiKey: string) {
    if (!apiKey || !apiKey.startsWith('sk-')) {
      return { ok: false, status: 0, error: 'Formato chiave non valido' };
    }

    try {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1
        }),
      });

      const data = await response.json().catch(() => ({}));
      return {
        status: response.status,
        ok: response.ok,
        data: response.ok ? { status: 'online' } : data
      };
    } catch (err: any) {
      console.error('[SECURITY LOG] DeepSeek Connection Test Failed:', err.message);
      return {
        status: 0,
        ok: false,
        error: 'Impossibile stabilire una connessione sicura con il server'
      };
    }
  }
};
