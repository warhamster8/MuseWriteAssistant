import type { GlobalTimelineEvent } from '../types/timeline';
import { aiService, type AIConfig } from './aiService';



const SYSTEM_PROMPT = `Sei un esperto cronologista letterario. Il tuo compito è analizzare il testo fornito ed estrarre la sequenza temporale degli eventi.

Per ogni evento, devi generare un oggetto JSON con queste proprietà:
1. "title": Un titolo breve e incisivo dell'evento.
2. "summary": Una sintesi della scena (max 10-15 parole).
3. "timeLabel": Il riferimento temporale esatto o relativo (es. "Giorno 1, Alba", "Tre ore dopo", "12 Settembre 1944").
4. "estimatedStart": Un numero intero che rappresenta l'ordine cronologico (minuti dall'inizio del libro).
5. "estimatedEnd": La fine stimata dell'evento sulla stessa scala.
6. "importance": "high" per eventi chiave, "medium" per transizioni, "low" per dettagli.
7. "location": Il luogo fisico dove avviene l'evento.
8. "characters": Un array di nomi di personaggi presenti.
9. "isFlashback": Boolean, true se l'evento è un salto nel passato rispetto alla linea narrativa principale.

REGOLE CRITICHE:
- SEQUENZIALITÀ: Eventi consecutivi nel testo devono avere intervalli [estimatedStart, estimatedEnd] STRETTAMENTE CRESCENTI e non sovrapposti, a meno che non siano esplicitamente simultanei.
- Se l'evento è un flashback, isFlashback deve essere true.
- Restituisci ESCLUSIVAMENTE un array JSON.`;

export const timelineUtils = {
  async extractEvents(text: string, aiConfig: AIConfig): Promise<GlobalTimelineEvent[]> {
    try {
      let fullResponse = '';
      await aiService.streamChat(
        aiConfig,
        [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Analizza questo testo ed estrai la timeline in formato JSON:\n\n${text}` }
        ],
        (chunk) => {
          fullResponse += chunk;
        }
      );

      const jsonMatch = fullResponse.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
         throw new Error('Nessun JSON valido trovato nella risposta AI');
      }

      const events = JSON.parse(jsonMatch[0]);
      
      if (!Array.isArray(events)) {
        throw new Error('La risposta AI non è un array di eventi');
      }
      
      return events.map((e: any, i: number) => ({
        ...e,
        id: `evt-${i}-${Math.random().toString(36).substr(2, 9)}`
      }));
    } catch (err) {
      console.error('[TIMELINE] Errore estrazione:', err);
      throw err;
    }
  },

  detectOverlaps(events: GlobalTimelineEvent[]): Record<string, string[]> {

    const conflictMap: Record<string, string[]> = {};
    const sorted = [...events].sort((a, b) => a.estimatedStart - b.estimatedStart);

    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const a = sorted[i];
        const b = sorted[j];
        
        // 1. Ignora conflitti se uno dei due è un flashback (salto temporale non lineare)
        if (a.isFlashback !== b.isFlashback) continue;

        // 2. Controllo sovrapposizione temporale stretta
        // Permettiamo eventi "back-to-back" dove a.end === b.start
        const overlaps = a.estimatedStart < b.estimatedEnd && a.estimatedEnd > b.estimatedStart;
        
        if (overlaps) {
          // 3. Se sono nello stesso luogo e hanno personaggi coerenti, 
          // potrebbe non essere un errore (azione parallela), 
          // ma per ora segnaliamo come alert se c'è sovrapposizione eccessiva.
          if (!conflictMap[a.id]) conflictMap[a.id] = [];
          if (!conflictMap[b.id]) conflictMap[b.id] = [];
          
          conflictMap[a.id].push(b.id);
          conflictMap[b.id].push(a.id);
        }
      }
    }

    return conflictMap;
  }
};
