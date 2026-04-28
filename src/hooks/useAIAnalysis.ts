import { useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import { useToast } from '../components/Toast';
import { aiService } from '../lib/aiService';
import { getPlainTextForAI } from '../lib/textUtils';

export const useAIAnalysis = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { addToast } = useToast();
  
  const setSceneAnalysis = useStore(s => s.setSceneAnalysis);
  const setLastAnalyzedPhrase = useStore(s => s.setLastAnalyzedPhrase);
  const aiConfig = useStore(s => s.aiConfig);

  const stopAnalysis = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsAnalyzing(false);
  };

  const runAnalysis = async (sceneId: string, content: string, tab: 'revision' | 'grammar') => {
    if (!sceneId || !content) return;
    
    setIsAnalyzing(true);
    setSceneAnalysis(sceneId, '', tab);
    
    const plainText = getPlainTextForAI(content);
    if (plainText.length < 5) {
      addToast("Scena troppo breve per l'analisi", "error");
      setIsAnalyzing(false);
      return;
    }

    const memoryKey = `${sceneId}-${tab}`;
    const lastPhrase = useStore.getState().lastAnalyzedPhrase[memoryKey] || '';

    abortControllerRef.current = new AbortController();
    
    try {
      const systemPrompt = tab === 'revision' 
        ? `Sei un editor professionista. Analizza il testo e restituisci suggerimenti in formato JSON:
           { "original": "testo esatto", "suggestion": "testo corretto", "reason": "spiegazione", "type": "stile" }`
        : `Sei un correttore bozze. Analizza il testo e restituisci suggerimenti in formato JSON:
           { "original": "testo esatto", "suggestion": "testo corretto", "reason": "spiegazione", "type": "grammatica" }`;

      const userPrompt = `Testo da analizzare:
      ${plainText}
      
      Contesto precedente:
      ${lastPhrase}`;

      await aiService.streamChat(
        aiConfig,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        (chunk: string) => {
          setSceneAnalysis(sceneId, (prev) => prev + chunk, tab);
        },
        { signal: abortControllerRef.current.signal }
      );
      
      setLastAnalyzedPhrase(sceneId, plainText.slice(-200), tab);
      addToast("Analisi completata", "success");
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Analysis error:', err);
        addToast("Errore durante l'analisi", "error");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  return { runAnalysis, stopAnalysis, isAnalyzing };
};
