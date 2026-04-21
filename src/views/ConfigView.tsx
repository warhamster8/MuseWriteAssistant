import React from 'react';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';
import { Settings, Cpu, Zap, ShieldCheck, AlertTriangle, Activity, Terminal, Loader2 } from 'lucide-react';
import { useToast } from '../components/Toast';
import { deepseekService } from '../lib/deepseek';
import { cn } from '../lib/utils';
import { exportToDocx } from '../lib/exportUtils';
import { FileDown, UserCircle, BookOpen } from 'lucide-react';

export const ConfigView: React.FC = React.memo(() => {
  const user = useStore(s => s.user);
  const currentProject = useStore(s => s.currentProject);
  const chapters = useStore(s => s.chapters);
  const aiConfig = useStore(s => s.aiConfig);
  const setAIConfig = useStore(s => s.setAIConfig);
  const authorName = useStore(s => s.authorName);
  const setAuthorName = useStore(s => s.setAuthorName);
  const { addToast } = useToast();
  const [testResult, setTestResult] = React.useState<any>(null);
  const [isTesting, setIsTesting] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const [keyInput, setKeyInput] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSaveKey = async () => {
    const trimmedKey = keyInput.trim();
    if (!trimmedKey || !trimmedKey.startsWith('sk-') || trimmedKey.length < 20) {
      addToast("Inserisci una chiave valida", 'error');
      return;
    }
    if (!user) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          deepseek_api_key: trimmedKey,
          ai_settings: { ...aiConfig, provider: 'deepseek' }
        })
        .eq('user_id', user.id);

      if (error) throw error;
      setAIConfig({ deepseekKey: trimmedKey, provider: 'deepseek' });
      addToast("Configurazione sincronizzata!", 'success');
      setKeyInput('');
    } catch (err: any) {
      addToast("Errore nel salvataggio", 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestDeepSeek = async () => {
    if (!aiConfig.deepseekKey) return;
    setIsTesting(true);
    try {
      const result = await deepseekService.testConnection(aiConfig.deepseekKey);
      setTestResult(result);
      if (result.ok) addToast("Connessione riuscita", 'success');
    } catch (err) {
      addToast("Errore di rete", 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleProviderChange = async (provider: 'groq' | 'deepseek') => {
    setAIConfig({ provider });
    if (!user) return;
    try {
      await supabase.from('user_profiles').update({ ai_settings: { ...aiConfig, provider } }).eq('user_id', user.id);
      addToast(`Motore: ${provider}`, 'success');
    } catch (err) {}
  };

  const handleExport = async () => {
    if (!currentProject || chapters.length === 0) {
      addToast("Nulla da esportare", 'error');
      return;
    }
    setIsExporting(true);
    try {
      await exportToDocx(currentProject.title, chapters, authorName || "Autore Ignoto");
      addToast("Esportato!", 'success');
    } catch (err) {
      addToast("Errore export", 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="absolute inset-0 overflow-y-auto px-6 md:px-10 pt-10 pb-40 scrollbar-thin scrollbar-thumb-white/10">
      <div className="max-w-5xl mx-auto space-y-10">
        
        {/* HEADER */}
        <div className="flex items-center gap-6 bg-white/[0.02] p-8 rounded-[40px] border border-white/5">
          <div className="p-4 bg-[#5be9b1]/10 rounded-2xl border border-[#5be9b1]/20">
            <Settings className="w-8 h-8 text-[#5be9b1]" />
          </div>
          <div>
            <h1 className="text-4xl font-medium tracking-tight text-white">Project & AI</h1>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Configurazione & Esportazione</p>
          </div>
        </div>

        {/* AI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <button
            onClick={() => handleProviderChange('groq')}
            className={`relative p-8 rounded-[40px] border text-left transition-all ${aiConfig.provider === 'groq' ? 'bg-[#5be9b1]/10 border-[#5be9b1]/30' : 'bg-white/[0.02] border-white/5'}`}
          >
            <div className="flex justify-between mb-6">
              <Zap className={cn("w-6 h-6", aiConfig.provider === 'groq' ? "text-[#5be9b1]" : "text-slate-600")} />
              {aiConfig.provider === 'groq' && <span className="text-[9px] font-bold uppercase bg-[#5be9b1] text-black px-2 py-1 rounded">Attivo</span>}
            </div>
            <h3 className="text-xl font-medium text-white">Groq Llama 3.3</h3>
            <p className="text-sm text-slate-500 mt-2 font-light">Massima velocità per brainstorming e revisioni rapide.</p>
          </button>

          <button
            onClick={() => handleProviderChange('deepseek')}
            className={`relative p-8 rounded-[40px] border text-left transition-all ${aiConfig.provider === 'deepseek' ? 'bg-[#5be9b1]/10 border-[#5be9b1]/30' : 'bg-white/[0.02] border-white/5'}`}
          >
            <div className="flex justify-between mb-6">
              <Cpu className={cn("w-6 h-6", aiConfig.provider === 'deepseek' ? "text-[#5be9b1]" : "text-slate-600")} />
              {aiConfig.provider === 'deepseek' && <span className="text-[9px] font-bold uppercase bg-[#5be9b1] text-black px-2 py-1 rounded">Attivo</span>}
            </div>
            <h3 className="text-xl font-medium text-white">DeepSeek V3</h3>
            <p className="text-sm text-slate-500 mt-2 font-light">Ragionamento profondo per analisi narrative complesse.</p>
          </button>
        </div>

        {/* SECURITY & DIAGNOSTICS */}
        <div className="bg-white/[0.02] p-10 rounded-[48px] border border-white/5 space-y-8">
          <div className="flex items-center gap-4">
            <ShieldCheck className="w-5 h-5 text-[#5be9b1]" />
            <h3 className="text-xl font-medium text-white">Infrastruttura di Sicurezza</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="p-6 bg-black/40 border border-white/5 rounded-3xl">
                <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-2">Endpoint Active</p>
                <code className="text-xs text-slate-300 font-mono">
                  {aiConfig.deepseekKey ? `sk-...${aiConfig.deepseekKey.slice(-6)}` : 'Non configurato'}
                </code>
             </div>
             
             <div className="p-6 bg-black/40 border border-white/5 rounded-3xl flex items-center justify-between">
                <span className="text-sm text-slate-400">Diagnostica Core</span>
                <button onClick={handleTestDeepSeek} disabled={isTesting} className="p-3 bg-[#5be9b1] text-black rounded-xl">
                  <Activity className={cn("w-4 h-4", isTesting && "animate-spin")} />
                </button>
             </div>
          </div>

          {testResult && (
            <div className="p-6 bg-black/50 border border-white/5 rounded-3xl font-mono text-[10px] text-emerald-500">
              <pre>{JSON.stringify(testResult, null, 2)}</pre>
            </div>
          )}

          {!aiConfig.deepseekKey && (
            <div className="flex gap-4">
              <input 
                type="password" value={keyInput} onChange={(e) => setKeyInput(e.target.value)}
                placeholder="Inserisci sk-key..." className="flex-1 bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-sm text-white"
              />
              <button onClick={handleSaveKey} disabled={isSaving} className="px-8 py-4 bg-[#5be9b1] text-black rounded-2xl text-[10px] font-bold uppercase tracking-widest">
                Attiva
              </button>
            </div>
          )}
        </div>

        {/* MANUSCRIPT & EXPORT - ALWAYS RENDERED */}
        <div className="bg-white/[0.02] p-10 rounded-[48px] border border-white/5 space-y-10 shadow-sm">
          <div className="flex items-center gap-4">
            <BookOpen className="w-5 h-5 text-[#5be9b1]" />
            <h3 className="text-xl font-medium text-white">Manoscritto & Esportazione</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
            <div className="space-y-4">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest ml-2 flex items-center gap-2">
                <UserCircle className="w-3.5 h-3.5" /> Nome Autore
              </label>
              <input 
                type="text" value={authorName} onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Firma il tuo lavoro..." className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-sm text-white"
              />
            </div>
            
            <button
              onClick={handleExport} disabled={isExporting || !currentProject}
              className="flex items-center justify-center gap-4 w-full h-[60px] bg-white text-black rounded-2xl font-black uppercase tracking-widest text-[11px] hover:scale-[1.01] transition-transform disabled:opacity-50"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><FileDown className="w-5 h-5" /> Esporta (.docx)</>}
            </button>
          </div>

          <div className="p-6 bg-[#5be9b1]/5 border border-[#5be9b1]/10 rounded-3xl text-[11px] text-[#5be9b1]/70 leading-relaxed font-medium">
            <strong>Ottimizzazione:</strong> Il manoscritto viene generato con formattazione standard per Word e LibreOffice, includendo frontespizio e stili di paragrafo preservati.
          </div>
        </div>

        {/* FINAL SPACER */}
        <div className="h-20" />
      </div>
    </div>
  );
});
