import React from 'react';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';
import { Settings, Cpu, Zap, ShieldCheck, AlertTriangle, Activity, Terminal } from 'lucide-react';
import { useToast } from '../components/Toast';
import { deepseekService } from '../lib/deepseek';

export const ConfigView: React.FC = () => {
  const { user, aiConfig, setAIConfig } = useStore();
  const { addToast } = useToast();
  const [testResult, setTestResult] = React.useState<any>(null);
  const [isTesting, setIsTesting] = React.useState(false);
  const [keyInput, setKeyInput] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSaveKey = async () => {
    if (!keyInput.trim()) {
      addToast("Inserisci una chiave valida", 'info');
      return;
    }
    
    if (!user) {
      addToast("Devi essere loggato per salvare la chiave", 'error');
      return;
    }

    setIsSaving(true);
    try {
      // Otteniamo le impostazioni attuali per non sovrascriverle tutte
      const currentSettings = aiConfig;
      
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          deepseek_api_key: keyInput.trim(),
          ai_settings: {
            ...currentSettings,
            provider: 'deepseek'
          }
        })
        .eq('user_id', user.id);

      if (error) throw error;
      
      setAIConfig({ deepseekKey: keyInput.trim(), provider: 'deepseek' });
      addToast("Chiave salvata e DeepSeek attivato!", 'success');
      setKeyInput('');
    } catch (err: any) {
      console.error(err);
      addToast("Errore durante il salvataggio", 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestDeepSeek = async () => {
    if (!aiConfig.deepseekKey) {
      addToast("Inserisci prima una chiave", 'error');
      return;
    }
    
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await deepseekService.testConnection(aiConfig.deepseekKey);
      setTestResult(result);
      if (result.ok) {
        addToast("Connessione DeepSeek riuscita!", 'success');
      } else {
        addToast(`Errore connessione: ${result.status}`, 'error');
      }
    } catch (err: any) {
      setTestResult({ error: err.message });
      addToast("Errore durante il test", 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleProviderChange = async (provider: 'groq' | 'deepseek') => {
    setAIConfig({ provider });
    
    // Salvataggio automatico nel profilo Supabase
    if (user) {
      try {
        const { error } = await supabase
          .from('user_profiles')
          .update({ 
            ai_settings: { 
              ...aiConfig, 
              provider 
            } 
          })
          .eq('user_id', user.id);
          
        if (error) throw error;
        addToast(`Provider aggiornato a ${provider}`, 'success');
      } catch (err) {
        console.error("Errore salvataggio config:", err);
        addToast("Errore durante il salvataggio", 'error');
      }
    } else {
      addToast(`Provider impostato a ${provider} (Sola lettura)`, 'info');
    }
  };

  return (
    <div className="h-full flex flex-col p-8 space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-blue-600/20 rounded-2xl border border-blue-500/30">
          <Settings className="w-8 h-8 text-blue-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight">Impostazioni AI</h1>
          <p className="text-slate-400">Configura il tuo architetto narrativo</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Groq Card */}
        <button
          onClick={() => handleProviderChange('groq')}
          className={`relative p-6 rounded-3xl border text-left transition-all duration-300 overflow-hidden group ${
            aiConfig.provider === 'groq' 
              ? 'bg-blue-600/10 border-blue-500 shadow-lg shadow-blue-900/20' 
              : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-xl ${aiConfig.provider === 'groq' ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
              <Zap className="w-6 h-6" />
            </div>
            {aiConfig.provider === 'groq' && (
              <span className="text-[10px] font-black uppercase tracking-widest bg-blue-500 text-white px-2 py-1 rounded-md">Attivo</span>
            )}
          </div>
          <h3 className="text-xl font-bold mb-2">Groq (Llama 3.3)</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Velocità estrema e latenza quasi zero. Ideale per suggerimenti rapidi e scrittura fluida.
          </p>
          <div className="mt-4 flex gap-2">
            <span className="text-[10px] px-2 py-1 bg-slate-800 rounded text-slate-500 border border-slate-700">70B Parameters</span>
            <span className="text-[10px] px-2 py-1 bg-slate-800 rounded text-slate-500 border border-slate-700">LPU Optimized</span>
          </div>
        </button>

        {/* DeepSeek Card */}
        <button
          onClick={() => handleProviderChange('deepseek')}
          className={`relative p-6 rounded-3xl border text-left transition-all duration-300 overflow-hidden group ${
            aiConfig.provider === 'deepseek' 
              ? 'bg-emerald-600/10 border-emerald-500 shadow-lg shadow-emerald-900/20' 
              : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-xl ${aiConfig.provider === 'deepseek' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
              <Cpu className="w-6 h-6" />
            </div>
            {aiConfig.provider === 'deepseek' && (
              <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-500 text-white px-2 py-1 rounded-md">Attivo</span>
            )}
          </div>
          <h3 className="text-xl font-bold mb-2">DeepSeek V3</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Potenza incredibile e ragionamento avanzato. Il miglior rapporto qualità/prezzo per l'editing creativo.
          </p>
          <div className="mt-4 flex gap-2">
            <span className="text-[10px] px-2 py-1 bg-slate-800 rounded text-slate-500 border border-slate-700">671B Total Parameters</span>
            <span className="text-[10px] px-2 py-1 bg-slate-800 rounded text-slate-500 border border-slate-700">OpenAI Compatible</span>
          </div>
        </button>
      </div>

      <div className="glass p-8 rounded-3xl border border-slate-800 space-y-6">
        <h3 className="text-lg font-bold flex items-center gap-2">
           <ShieldCheck className="w-5 h-5 text-emerald-400" />
           Stato Sicurezza API
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl">
              <p className="text-[10px] uppercase tracking-tighter text-slate-500 font-bold mb-1">Status Chiave DeepSeek</p>
               <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${aiConfig.deepseekKey ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  <span className="font-mono text-sm">
                     {aiConfig.deepseekKey 
                        ? `Configurata (${aiConfig.deepseekKey.substring(0, 4)}...${aiConfig.deepseekKey.slice(-4)})` 
                        : 'Non Trovata'}
                  </span>
               </div>
            </div>
            
            <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-center justify-between">
               <div>
                  <p className="text-[10px] uppercase tracking-tighter text-slate-500 font-bold mb-1">Diagnostica</p>
                  <span className="text-sm text-slate-300">Testa risposta grezza</span>
               </div>
               <button 
                onClick={handleTestDeepSeek}
                disabled={isTesting}
                className="p-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl transition-all"
               >
                 <Activity className={`w-5 h-5 text-white ${isTesting ? 'animate-spin' : ''}`} />
               </button>
            </div>
        </div>

        {testResult && (
          <div className="p-4 bg-black/40 border border-slate-700 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
              <Terminal className="w-4 h-4" />
              <span>Risposta Grezza Google</span>
            </div>
            <pre className="text-[10px] font-mono bg-black/60 p-4 rounded-xl overflow-x-auto text-slate-300 border border-slate-800/50">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          </div>
        )}

        {!aiConfig.deepseekKey && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-200/80 text-xs">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <p>
                Non è stata rilevata una chiave DeepSeek nel tuo profilo. Incollala qui sotto per attivarla.
              </p>
            </div>
            
            <div className="flex gap-2">
              <input 
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="Incolla qui la tua chiave sk-..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:border-blue-500 outline-none transition-all"
              />
              <button
                onClick={handleSaveKey}
                disabled={isSaving || !keyInput}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl text-sm font-bold text-white transition-all shadow-lg shadow-blue-900/40"
              >
                {isSaving ? 'Salvataggio...' : 'Salva Chiave'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
