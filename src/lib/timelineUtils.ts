import type { GlobalTimelineEvent } from '../types/timeline';
import { aiService, type AIConfig } from './aiService';

const SYSTEM_PROMPT = `Sei un esperto Cronologista Letterario e Analista Narrativo. Il tuo compito è mappare la cronologia OGGETTIVA degli eventi nel testo usando una metrica MATEMATICA ASSOLUTA.

REGOLE DI IDENTITÀ:
- NON usare "Narratore". Identifica i personaggi per NOME (es. "Erika", "Marco").

MATEMATICA DEL TEMPO (REGOLA DEL CALENDARIO UNIVERSALE):
Per garantire che scene diverse si allineino correttamente, usa l'anno 2000 come ANCORA ZERO (0 minuti).
Calcola "estimatedStart" come totale dei minuti trascorsi dal 01/01/2000 ore 00:00.
- 1 Anno = 525.600 minuti.
- 1 Mese (media) = 43.800 minuti.
- 1 Giorno = 1.440 minuti.

ESEMPIO DI CALCOLO:
- "10 Novembre 2026" -> (26 anni * 525.600) + (10 mesi * 43.800) + (10 giorni * 1.440) = circa 14.118.000.
- "Un anno dopo" rispetto al 2026 -> 14.118.000 + 525.600 = 14.643.600.

REGOLE CRITICHE:
- Se il testo dice "Un anno dopo la perdita" e la perdita è avvenuta nel 10 Nov 2026, l'evento deve avere un valore numerico SUPERIORE a quello del 2026.
- Se un evento è un flashback (salto nel passato), isFlashback deve essere TRUE e il valore temporale deve essere logicamente inferiore al presente della scena.

STRUTTURA JSON:
1. "title": Titolo specifico (max 5 parole).
2. "summary": Descrizione azione (max 15 parole).
3. "timeLabel": Marcatore testuale (es. "10 Novembre 2026").
4. "estimatedStart": Numero intero (minuti assoluti dal 2000).
5. "estimatedEnd": estimatedStart + durata (es. +60 per un incontro).
6. "importance": "high", "medium", "low".
7. "location": Luogo specifico.
8. "characters": Array di nomi.
9. "isFlashback": Boolean.

REGOLE DI OUTPUT:
Restituisci ESCLUSIVAMENTE l'array JSON [ { ... } ].`;

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
    const TOLERANCE = 5; // 5 minuti di tolleranza per piccole discrepanze IA

    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const a = sorted[i];
        const b = sorted[j];
        
        // 1. Flashback vs Presente: Generalmente non sono conflitti cronologici lineari
        if (a.isFlashback !== b.isFlashback) continue;

        // 2. Controllo sovrapposizione temporale con buffer di tolleranza
        const overlaps = (a.estimatedStart < b.estimatedEnd - TOLERANCE) && 
                         (a.estimatedEnd > b.estimatedStart + TOLERANCE);
        
        if (overlaps) {
          // 3. Logica dei Personaggi (Bilancia)
          const sharedCharacters = (a.characters || []).filter(char => 
            (b.characters || []).includes(char)
          );
          
          const differentLocations = a.location !== b.location;

          // CONDIZIONI DI CONFLITTO REALE:
          // A. Bilocazione: Lo stesso personaggio è in due posti diversi nello stesso momento
          const isBilocation = sharedCharacters.length > 0 && differentLocations;
          
          // B. Sovrapposizione Fisica: Due eventi nello stesso posto allo stesso momento (possibile errore di duplicazione)
          const isPhysicalOverlap = !differentLocations;

          // C. Azione Parallela Sospetta: Scene diverse nello stesso momento ma zero personaggi in comune
          // Questo potrebbe non essere un errore, ma lo segnaliamo se la sovrapposizione è quasi totale
          const isSuspiciousParallel = differentLocations && sharedCharacters.length === 0;

          if (isBilocation || isPhysicalOverlap || isSuspiciousParallel) {
            if (!conflictMap[a.id]) conflictMap[a.id] = [];
            if (!conflictMap[b.id]) conflictMap[b.id] = [];
            
            conflictMap[a.id].push(b.id);
            conflictMap[b.id].push(a.id);
          }
        }
      }
    }

    return conflictMap;
  }
};
