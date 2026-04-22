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
    temperature = 0.7,
    signal?: AbortSignal
  ) {
    if (!apiKey || apiKey.length < 10) {
      throw new Error('Configurazione di sicurezza: Chiave Gemini non valida');
    }

    const systemInstructionText = messages.find((m) => m.role === 'system')?.content;
    const history = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }));

    const body: any = {
      contents: history,
      generationConfig: {
        temperature,
        maxOutputTokens: 4096,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      ]
    };

    if (systemInstructionText) {
      body.systemInstruction = {
        parts: [{ text: systemInstructionText }]
      };
    }

    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    // Prevenzione assoluta contro interceptor (es. estensioni browser o vecchie cache SDK) 
    // che potrebbero iniettare Authorization: Bearer
    headers.delete('Authorization');

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash:streamGenerateContent?alt=sse&key=${apiKey.trim()}`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body),
        signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[SECURITY LOG] Gemini API Error:', errorData);
        if (response.status === 401 || response.status === 403 || errorData?.error?.message?.includes('invalid authentication credentials') || errorData?.error?.message?.includes('ACCESS_TOKEN_TYPE_UNSUPPORTED')) {
           throw new Error('Errore di Autenticazione (401): La chiave API non è valida o non è autorizzata. Assicurati di usare una API Key valida di Google AI Studio.');
        }
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
          if (!trimmedLine) continue;

          if (trimmedLine.startsWith('data: ')) {
            const dataStr = trimmedLine.substring(6);
            if (dataStr === '[DONE]') continue;
            
            try {
              const json = JSON.parse(dataStr);
              const content = json.candidates?.[0]?.content?.parts?.[0]?.text;
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
      console.error('[SECURITY LOG] Gemini Stream Exception:', err.message);
      throw err;
    }
  },

  /**
   * Verifica la connettività con l'endpoint Google.
   */
  async testConnection(apiKey: string) {
    if (!apiKey || apiKey.length < 10) {
      return { ok: false, status: 0, error: 'Formato chiave non valido' };
    }

    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.delete('Authorization'); // Prevents any phantom Bearer tokens from triggering 401

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash:generateContent?key=${apiKey.trim()}`, {
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
