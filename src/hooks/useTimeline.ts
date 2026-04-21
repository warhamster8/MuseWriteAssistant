import { useState } from 'react';
import { useStore } from '../store/useStore';
import { useNarrative } from './useNarrative';
import { aiService } from '../lib/aiService';
import { getPlainTextForAI } from '../lib/narrativeUtils';
import type { TimelineEvent } from '../types/narrative';

export function useTimeline() {
  const { aiConfig } = useStore();
  const { updateTimelineEvents } = useNarrative();
  const [isGenerating, setIsGenerating] = useState(false);

  const generateTimeline = async (sceneId: string, content: string) => {
    if (!content || content.length < 50) return;
    
    setIsGenerating(true);
    const plainText = getPlainTextForAI(content);

    try {
      const systemPrompt = `Sei un esperto di analisi narrativa e cronologica.
Il tuo compito è estrarre la linea temporale degli eventi da una scena di un romanzo.

REGOLE DI ESTRAZIONE AD ALTA PRECISIONE:
1. Identifica ogni beat narrativo significativo.
2. Cerca marcatori temporali espliciti (es. "Due ore dopo", "Al tramonto", "Mentre il caffè bolliva").
3. Se non ci sono marcatori espliciti, deduci la sequenza logica degli eventi.
4. Per ogni evento, definisci:
   - Titolo: Breve nome dell'evento.
   - Descrizione: Cosa accade sinteticamente.
   - Timestamp: Momento relativo o assoluto (es. "T+00:15", "Mattina", "Subito dopo l'urlo").
   - Durata: Stima della durata in minuti (numero intero).
   - Importanza: low (beat di transizione), medium (azione/dialogo importante), high (climax/svolta).

REQUISITO DI FORMATTO:
Restituisci SOLO un array JSON valido, senza testo prima o dopo. Ogni oggetto deve seguire l'interfaccia:
{
  "id": "string univoca",
  "title": "string",
  "description": "string",
  "timestamp": "string",
  "duration": number,
  "importance": "low" | "medium" | "high"
}

LINGUA: Italiano.`;

      let fullResponse = '';
      await aiService.streamChat(
        aiConfig,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Estrai la timeline da questa scena:\n\n${plainText}` }
        ],
        (chunk) => {
          fullResponse += chunk;
        }
      );

      // Extract JSON from response (in case AI adds markdown blocks)
      const jsonMatch = fullResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
         const events: TimelineEvent[] = JSON.parse(jsonMatch[0]);
         await updateTimelineEvents(sceneId, events);
         return events;
      } else {
        throw new Error('Formato risposta non valido');
      }
    } catch (err) {
      console.error('Timeline generation error:', err);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateTimeline,
    isGenerating
  };
}
