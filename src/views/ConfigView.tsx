import React from 'react';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';
import { Settings, Cpu, Zap, ShieldCheck, Activity, Loader2, CheckCircle, Sun, Moon } from 'lucide-react';
import { useToast } from '../components/Toast';
import { deepseekService } from '../lib/deepseek';
import { geminiService } from '../lib/gemini';
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
  const theme = useStore(s => s.theme);
  const setTheme = useStore(s => s.setTheme);
  const { addToast } = useToast();
  const [testResult, setTestResult] = React.useState<any>(null);
  const [testGeminiResult, setTestGeminiResult] = React.useState<any>(null);
  const [isTesting, setIsTesting] = React.useState(false);
  const [isTestingGemini, setIsTestingGemini] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const [keyInput, setKeyInput] = React.useState('');
  const [geminiKeyInput, setGeminiKeyInput] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);
  const [isSavingGemini, setIsSavingGemini] = React.useState(false);

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
      addToast("DeepSeek attivo!", 'success');
      setKeyInput('');
    } catch (err: any) {
      addToast("Errore nel salvataggio", 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveGeminiKey = async () => {
    const trimmedKey = geminiKeyInput.trim();
    if (!trimmedKey || trimmedKey.length < 10) {
      addToast("Inserisci una chiave valida", 'error');
      return;
    }
    if (!user) return;

    setIsSavingGemini(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          gemini_api_key: trimmedKey,
          ai_settings: { ...aiConfig, provider: 'gemini' }
        })
        .eq('user_id', user.id);

      if (error) throw error;
      setAIConfig({ geminiKey: trimmedKey, provider: 'gemini' });
      addToast("Gemini attivo!", 'success');
      setGeminiKeyInput('');
    } catch (err: any) {
      addToast("Errore nel salvataggio (Verifica schema DB)", 'error');
    } finally {
      setIsSavingGemini(false);
    }
  };

  const handleTestDeepSeek = async () => {
    if (!aiConfig.deepseekKey) return;
    setIsTesting(true);
    try {
      const result = await deepseekService.testConnection(aiConfig.deepseekKey);
      setTestResult(result);
      if (result.ok) {
        addToast("DeepSeek Online", 'success');
      } else {
        addToast(`Errore DeepSeek: ${result.error || result.status}`, 'error');
      }
    } catch (err) {
      addToast("Errore di rete DeepSeek", 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleTestGemini = async () => {
    if (!aiConfig.geminiKey) return;
    setIsTestingGemini(true);
    try {
      const result = await geminiService.testConnection(aiConfig.geminiKey);
      setTestGeminiResult(result);
      if (result.ok) {
        addToast("Gemini Online", 'success');
      } else {
        addToast(`Errore Gemini: ${result.error || result.status}`, 'error');
      }
    } catch (err) {
      addToast("Errore di rete Gemini", 'error');
    } finally {
      setIsTestingGemini(false);
    }
  };

  const handleProviderChange = async (provider: 'groq' | 'deepseek' | 'gemini') => {
    if (!user) return;
    
    // Use immediate updates to avoid stale state from aiConfig
    const updatedConfig = { ...aiConfig, provider };
    setAIConfig({ provider });
    
    try {
      await supabase.from('user_profiles').update({ ai_settings: updatedConfig }).eq('user_id', user.id);
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button
            onClick={() => handleProviderChange('groq')}
            className={`relative p-6 rounded-[32px] border text-left transition-all ${aiConfig.provider === 'groq' ? 'bg-[#5be9b1]/10 border-[#5be9b1]/30 shadow-lg shadow-[#5be9b1]/5' : 'bg-white/[0.02] border-white/5 opacity-60 hover:opacity-100'}`}
          >
            <div className="flex justify-between mb-4">
              <Zap className={cn("w-5 h-5", aiConfig.provider === 'groq' ? "text-[#5be9b1]" : "text-slate-600")} />
              {aiConfig.provider === 'groq' && <span className="text-[8px] font-black uppercase bg-[#5be9b1] text-black px-2 py-0.5 rounded">Active</span>}
            </div>
            <h3 className="text-lg font-bold text-white uppercase tracking-tight">Groq Llama 3</h3>
            <p className="text-[10px] text-slate-500 mt-2 font-medium uppercase tracking-widest">Performance estreme.</p>
          </button>

          <button
            onClick={() => handleProviderChange('deepseek')}
            className={`relative p-6 rounded-[32px] border text-left transition-all ${aiConfig.provider === 'deepseek' ? 'bg-[#5be9b1]/10 border-[#5be9b1]/30 shadow-lg shadow-[#5be9b1]/5' : 'bg-white/[0.02] border-white/5 opacity-60 hover:opacity-100'}`}
          >
            <div className="flex justify-between mb-4">
              <Cpu className={cn("w-5 h-5", aiConfig.provider === 'deepseek' ? "text-[#5be9b1]" : "text-slate-600")} />
              {aiConfig.provider === 'deepseek' && <span className="text-[8px] font-black uppercase bg-[#5be9b1] text-black px-2 py-0.5 rounded">Active</span>}
            </div>
            <h3 className="text-lg font-bold text-white uppercase tracking-tight">DeepSeek V3</h3>
            <p className="text-[10px] text-slate-500 mt-2 font-medium uppercase tracking-widest">Ragionamento profondo.</p>
          </button>

          <button
            onClick={() => handleProviderChange('gemini')}
            className={`relative p-6 rounded-[32px] border text-left transition-all ${aiConfig.provider === 'gemini' ? 'bg-[#5be9b1]/10 border-[#5be9b1]/30 shadow-lg shadow-[#5be9b1]/5' : 'bg-white/[0.02] border-white/5 opacity-60 hover:opacity-100'}`}
          >
            <div className="flex justify-between mb-4">
              <Activity className={cn("w-5 h-5", aiConfig.provider === 'gemini' ? "text-[#5be9b1]" : "text-slate-600")} />
              {aiConfig.provider === 'gemini' && <span className="text-[8px] font-black uppercase bg-[#5be9b1] text-black px-2 py-0.5 rounded">Active</span>}
            </div>
            <h3 className="text-lg font-bold text-white uppercase tracking-tight">Gemini 3 Flash</h3>
            <p className="text-[10px] text-slate-500 mt-2 font-medium uppercase tracking-widest">Context window enorme.</p>
          </button>
        </div>

        {/* APPEARANCE SECTION */}
        <div className="bg-white/[0.02] p-10 rounded-[48px] border border-white/5 space-y-10">
          <div className="flex items-center gap-4">
            <Sun className="w-5 h-5 text-[#5be9b1]" />
            <h3 className="text-xl font-bold text-white uppercase tracking-tight italic">Ambiente & Atmosfera</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              onClick={() => setTheme('dark')}
              className={cn(
                "p-8 rounded-[32px] border text-left transition-all group relative overflow-hidden",
                theme === 'dark' ? "bg-[#5be9b1]/10 border-[#5be9b1]/30 shadow-lg" : "bg-white/[0.02] border-white/5 opacity-60 hover:opacity-100"
              )}
            >
              <Moon className={cn("w-6 h-6 mb-4", theme === 'dark' ? "text-[#5be9b1]" : "text-slate-600")} />
              <div className="text-lg font-bold text-white uppercase tracking-tight">Inkwell Mode</div>
              <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest">Interfaccia scura per la massima concentrazione.</p>
              {theme === 'dark' && <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-[#5be9b1] shadow-[0_0_10px_rgba(91,233,177,0.5)]" />}
            </button>

            <button
              onClick={() => setTheme('light')}
              className={cn(
                "p-8 rounded-[32px] border text-left transition-all group relative overflow-hidden",
                theme === 'light' ? "bg-[#5be9b1]/10 border-[#5be9b1]/30 shadow-lg" : "bg-white/[0.02] border-white/5 opacity-60 hover:opacity-100"
              )}
            >
              <Sun className={cn("w-6 h-6 mb-4", theme === 'light' ? "text-[#5be9b1]" : "text-slate-600")} />
              <div className="text-lg font-bold text-white uppercase tracking-tight">Parchment Mode</div>
              <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest">Interfaccia chiara rilassante effetto carta.</p>
              {theme === 'light' && <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-[#5be9b1] shadow-[0_0_10px_rgba(91,233,177,0.5)]" />}
            </button>
          </div>
        </div>

        {/* SECURITY & DIAGNOSTICS */}
        <div className="bg-white/[0.02] p-10 rounded-[48px] border border-white/5 space-y-10">
          <div className="flex items-center gap-4">
            <ShieldCheck className="w-5 h-5 text-[#5be9b1]" />
            <h3 className="text-xl font-bold text-white uppercase tracking-tight italic">Security & Diagnostics</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {/* DeepSeek Security */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Nucleo DeepSeek</h4>
                  {aiConfig.deepseekKey && (
                    <button onClick={handleTestDeepSeek} disabled={isTesting} className="p-2.5 bg-[#5be9b1] text-black rounded-xl hover:scale-105 transition-all">
                      <Activity className={cn("w-3.5 h-3.5", isTesting && "animate-spin")} />
                    </button>
                  )}
                </div>
                
                {!aiConfig.deepseekKey ? (
                  <div className="flex gap-4">
                    <input 
                      type="password" value={keyInput} onChange={(e) => setKeyInput(e.target.value)}
                      placeholder="sk-..." className="flex-1 bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-xs text-white focus:outline-none focus:border-[#5be9b1]/30 transition-all font-mono"
                    />
                    <button onClick={handleSaveKey} disabled={isSaving} className="px-8 bg-[#5be9b1] text-black rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95">
                      Attiva
                    </button>
                  </div>
                ) : (
                  <div className="p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-3xl group">
                    <p className="text-[9px] uppercase tracking-widest text-[#5be9b1] font-black mb-2 flex items-center gap-2">
                       <CheckCircle className="w-3 h-3" /> Chiave Configurata
                    </p>
                    <code className="text-xs text-slate-500 font-mono block truncate">
                      sk-...{aiConfig.deepseekKey.slice(-6)}
                    </code>
                  </div>
                )}
                {testResult && (
                  <pre className="p-4 bg-black/50 border border-white/5 rounded-2xl text-[9px] text-[#5be9b1] font-mono overflow-x-auto">
                    {JSON.stringify(testResult, null, 2)}
                  </pre>
                )}
              </div>

              {/* Gemini Security */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Nucleo Gemini</h4>
                  {aiConfig.geminiKey && (
                    <button onClick={handleTestGemini} disabled={isTestingGemini} className="p-2.5 bg-[#5be9b1] text-black rounded-xl hover:scale-105 transition-all">
                      <Activity className={cn("w-3.5 h-3.5", isTestingGemini && "animate-spin")} />
                    </button>
                  )}
                </div>
                
                {!aiConfig.geminiKey ? (
                  <div className="flex gap-4">
                    <input 
                      type="password" value={geminiKeyInput} onChange={(e) => setGeminiKeyInput(e.target.value)}
                      placeholder="API Key..." className="flex-1 bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-xs text-white focus:outline-none focus:border-[#5be9b1]/30 transition-all font-mono"
                    />
                    <button onClick={handleSaveGeminiKey} disabled={isSavingGemini} className="px-8 bg-[#5be9b1] text-black rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95">
                      Attiva
                    </button>
                  </div>
                ) : (
                  <div className="p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-3xl group">
                    <p className="text-[9px] uppercase tracking-widest text-[#5be9b1] font-black mb-2 flex items-center gap-2">
                       <CheckCircle className="w-3 h-3" /> Chiave Configurata
                    </p>
                    <code className="text-xs text-slate-500 font-mono block truncate">
                      {aiConfig.geminiKey.slice(0, 4)}...{aiConfig.geminiKey.slice(-4)}
                    </code>
                  </div>
                )}
                {testGeminiResult && (
                  <pre className="p-4 bg-black/50 border border-white/5 rounded-2xl text-[9px] text-[#5be9b1] font-mono overflow-x-auto">
                    {JSON.stringify(testGeminiResult, null, 2)}
                  </pre>
                )}
              </div>
          </div>
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
