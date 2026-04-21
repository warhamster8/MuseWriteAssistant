/**
 * Servizio per l'interazione con l'API di Google Gemini.
 * Gestisce lo streaming SSE e la diagnostica di connessione.
 */
export const geminiService = {
  /**
   * Avvia una chat completion in streaming via Server-Sent Events (SSE).
   * 
   * @param apiKey - Chiave API Google AI Studio
   * @param messages - Cronologia messaggi {role, content}
   * @param onChunk - Callback per il testo ricevuto
   * @param temperature - Creatività della risposta (0.0 - 1.0)
   * @throws Error in caso di parametri non validi o errori API
   */
  async streamChatCompletion(
    apiKey: string,
    messages: any[],
    onChunk: (text: string) => void,
    temperature = 0.7
  ) {
    // Validazione rigida: verifica presenza e integrità parametri
    if (!apiKey || apiKey.length < 10) {
      throw new Error('Configurazione di sicurezza: Chiave Gemini non valida');
    }
    if (!messages || messages.length === 0) {
      throw new Error('Validazione fallita: Cronologia messaggi vuota');
    }

    const systemInstruction = messages.find((m) => m.role === 'system')?.content || '';
    const chatHistory = messages
      .filter((m) => m.role !== 'system')
      .slice(0, -1)
      .map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }));
    const lastMessage = messages[messages.length - 1].content;

    // Costruzione payload con impostazioni di sicurezza predefinite
    const payload = {
      contents: [...chatHistory, { role: 'user', parts: [{ text: lastMessage }] }],
      system_instruction: systemInstruction
        ? { parts: [{ text: systemInstruction }] }
        : undefined,
      generationConfig: {
        temperature,
        maxOutputTokens: 4096, // Aumentato per maggiore profondità narrativa
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      ],
    };

    const trimmedKey = apiKey.trim();
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:streamGenerateContent?alt=sse&key=${trimmedKey}`;

    try {
      const headers = new Headers();
      headers.append('Content-Type', 'application/json');
      headers.append('x-goog-api-key', trimmedKey);

      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        credentials: 'omit',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[SECURITY LOG] Gemini API Error:', {
          status: response.status,
          detail: errorData.error?.message
        });
        throw new Error(`Servizio AI Gemini non disponibile (Status: ${response.status})`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Fallimento inizializzazione stream di lettura');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const json = JSON.parse(line.substring(6));
              const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                onChunk(text);
              }
            } catch (e) {
              // Silenzioso: chunk incompleto
            }
          }
        }
      }
    } catch (err: any) {
      console.error('[SECURITY LOG] Gemini Stream Exception:', err.message);
      throw err;
    }
  },

  /**
   * Verifica la connettività con l'endpoint Google.
   */
  async testConnection(apiKey: string) {
    const trimmedKey = apiKey.trim();
    if (!trimmedKey) return { ok: false, error: 'Chiave mancante' };

    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${trimmedKey}`;
    
    try {
      const headers = new Headers();
      headers.append('Content-Type', 'application/json');
      headers.append('x-goog-api-key', trimmedKey);

      const response = await fetch(url, {
        method: 'POST',
        credentials: 'omit',
        headers: headers,
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Ping' }] }]
        }),
      });

      const data = await response.json().catch(() => ({}));
      return {
        status: response.status,
        ok: response.ok,
        data: response.ok ? { status: 'authorized' } : data
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
