/**
 * Servizio per l'interazione con l'API di Google Gemini.
 * Gestisce lo streaming e la diagnostica di connessione in modo robusto tramite REST nativo,
 * risolvendo problemi noti di auth con l'SDK ufficiale e environment non standard.
 */
export const geminiService = {
  /**
   * Avvia una chat completion in streaming.
   * 
   * @param apiKey - Chiave API Google AI Studio
   * @param messages - Cronologia messaggi {role, content}
   * @param onChunk - Callback per il testo ricevuto
   * @param temperature - Creatività della risposta (0.0 - 1.0)
   * @param signal - AbortSignal per annullare la richiesta
   */
  async streamChatCompletion(
    apiKey: string,
    messages: any[],
    onChunk: (text: string) => void,
    model = 'gemini-flash-latest',
    temperature = 0.7,
    signal?: AbortSignal
  ) {
    if (!apiKey || apiKey.length < 10) {
      throw new Error('Configurazione di sicurezza: Chiave Gemini non valida');
    }

    // Normalizzazione del nome modello per gli endpoint stabili
    const normalizedModel = model === 'gemini-flash-latest' ? 'gemini-1.5-flash' : model;

    // Strategia di compatibilità massima: incorporiamo le istruzioni di sistema nel primo messaggio utente
    const systemInstruction = messages.find((m) => m.role === 'system')?.content;
    const history = messages
      .filter((m) => m.role !== 'system')
      .map((m, idx) => {
        let text = m.content;
        if (idx === 0 && systemInstruction) {
          text = `ISTRUZIONI DI SISTEMA:\n${systemInstruction}\n\nRICHIESTA UTENTE:\n${m.content}`;
        }
        return {
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text }],
        };
      });

    const body: any = {
      contents: history,
      generationConfig: {
        temperature,
        maxOutputTokens: 8192,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      ]
    };

    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    // Prevenzione assoluta contro interceptor (es. estensioni browser o vecchie cache SDK) 
    // che potrebbero iniettare Authorization: Bearer
    headers.delete('Authorization');

    try {
      // Usiamo l'endpoint v1beta senza alt=sse per evitare conflitti di protocollo
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${normalizedModel}:streamGenerateContent?key=${apiKey.trim()}`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body),
        signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData?.error?.message || 'Errore di comunicazione con Gemini';
        throw new Error(`Gemini Error (${response.status}): ${errorMessage}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Interfaccia streaming non disponibile');

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
        
        // Gemini stream può restituire array di JSON o frammenti.
        // Puliamo il buffer per trovare oggetti JSON validi
        let startIdx = buffer.indexOf('{');
        while (startIdx !== -1) {
          let depth = 0;
          let endIdx = -1;
          for (let i = startIdx; i < buffer.length; i++) {
            if (buffer[i] === '{') depth++;
            else if (buffer[i] === '}') depth--;
            
            if (depth === 0) {
              endIdx = i;
              break;
            }
          }

          if (endIdx !== -1) {
            const jsonStr = buffer.substring(startIdx, endIdx + 1);
            try {
              const json = JSON.parse(jsonStr);
              const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) onChunk(text);
            } catch (e) {}
            buffer = buffer.substring(endIdx + 1);
            startIdx = buffer.indexOf('{');
          } else {
            break;
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('[SECURITY LOG] Gemini Stream Exception:', err.message);
      throw err;
    }
  },

  /**
   * Verifica la connettività con l'endpoint Google.
   */
  async testConnection(apiKey: string, model = 'gemini-flash-latest') {
    if (!apiKey || apiKey.length < 10) {
      return { ok: false, status: 0, error: 'Formato chiave non valido' };
    }

    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.delete('Authorization'); // Prevents any phantom Bearer tokens from triggering 401

    const normalizedModel = model.includes('gemini-1.5-flash') ? 'gemini-1.5-flash' : model;
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${normalizedModel}:generateContent?key=${apiKey.trim()}`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Ping' }] }],
          generationConfig: { maxOutputTokens: 1 }
        })
      });

      const data = await response.json().catch(() => ({}));
      return {
        status: response.status,
        ok: response.ok,
        error: response.ok ? null : (data?.error?.message || `Status: ${response.status}`),
        data: response.ok ? { status: 'online' } : data
      };
    } catch (err: any) {
      console.error('[SECURITY LOG] Gemini Connection Test Failed:', err.message);
      return {
        status: 0,
        ok: false,
        error: 'Connessione al Nucleo Gemini fallita'
      };
    }
  }
};
