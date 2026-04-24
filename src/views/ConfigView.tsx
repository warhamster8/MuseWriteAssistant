import React from 'react';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';
import { Settings, Cpu, Zap, ShieldCheck, Activity, Loader2, CheckCircle, Sun, Moon } from 'lucide-react';
import { useToast } from '../components/Toast';
import { deepseekService } from '../lib/deepseek';
import { geminiService } from '../lib/gemini';
import { groqService } from '../lib/groq';
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
  const [testGroqResult, setTestGroqResult] = React.useState<any>(null);
  const [isTesting, setIsTesting] = React.useState(false);
  const [isTestingGemini, setIsTestingGemini] = React.useState(false);
  const [isTestingGroq, setIsTestingGroq] = React.useState(false);
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
    const newModel = 'gemini-flash-latest';
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          gemini_api_key: trimmedKey,
          ai_settings: { ...aiConfig, provider: 'gemini', model: newModel, geminiKey: trimmedKey }
        })
        .eq('user_id', user.id);

      if (error) throw error;
      setAIConfig({ geminiKey: trimmedKey, provider: 'gemini', model: newModel });
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
  
  const handleTestGroq = async () => {
    setIsTestingGroq(true);
    try {
      const result = await groqService.testConnection(aiConfig.model);
      setTestGroqResult(result);
      if (result.ok) {
        addToast("Groq Online", 'success');
      } else {
        addToast(`Errore Groq: ${result.error}`, 'error');
      }
    } catch (err) {
      addToast("Errore di rete Groq", 'error');
    } finally {
      setIsTestingGroq(false);
    }
  };

  const handleProviderChange = async (provider: 'groq' | 'deepseek' | 'gemini') => {
    if (!user) return;
    
    if (provider === 'gemini' && !aiConfig.geminiKey) {
      addToast("Configura prima la chiave Gemini", 'error');
      return;
    }

    const model = provider === 'groq' ? 'llama-3.3-70b-versatile' : (provider === 'gemini' ? 'gemini-flash-latest' : 'deepseek-chat');
    const updatedConfig = { ...aiConfig, provider, model };
    setAIConfig({ provider, model });
    
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
    <div className="absolute inset-0 overflow-y-auto px-6 md:px-10 pt-10 pb-40 scrollbar-thin scrollbar-thumb-[var(--border-subtle)]">
      <div className="max-w-5xl mx-auto space-y-10">
        
        {/* HEADER */}
        <div className="flex items-center gap-6 bg-[var(--bg-card)] p-8 rounded-3xl border border-[var(--border-subtle)]">
          <div className="p-4 bg-[var(--accent-soft)] rounded-2xl border border-[var(--accent)]/20">
            <Settings className="w-8 h-8 text-[var(--accent)]" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-[var(--text-bright)] italic uppercase">Project & AI</h1>
            <p className="text-[var(--text-secondary)] text-[10px] font-black uppercase tracking-[0.3em] mt-1">Configurazione & Architettura AI</p>
          </div>
        </div>

        {/* AI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button
            onClick={() => handleProviderChange('groq')}
            className={cn(
              "relative p-6 rounded-[32px] border text-left transition-all",
              aiConfig.provider === 'groq' 
                ? 'bg-[var(--accent-soft)] border-[var(--accent)]/30 shadow-lg shadow-[var(--accent)]/5' 
                : 'bg-[var(--bg-card)] border-[var(--border-subtle)] opacity-60 hover:opacity-100'
            )}
          >
            <div className="flex justify-between mb-4">
              <Zap className={cn("w-5 h-5", aiConfig.provider === 'groq' ? "text-[var(--accent)]" : "text-[var(--text-muted)]")} />
              {aiConfig.provider === 'groq' && <span className="text-[8px] font-black uppercase bg-[var(--accent)] text-[var(--bg-deep)] px-2 py-0.5 rounded">Active</span>}
            </div>
            <h3 className="text-lg font-black text-[var(--text-bright)] uppercase tracking-tight">Groq Llama 3</h3>
            <p className="text-[10px] text-[var(--text-secondary)] mt-2 font-black uppercase tracking-widest leading-relaxed">Performance estreme.</p>
          </button>

          <button
            onClick={() => handleProviderChange('deepseek')}
            className={cn(
              "relative p-6 rounded-[32px] border text-left transition-all",
              aiConfig.provider === 'deepseek' 
                ? 'bg-[var(--accent-soft)] border-[var(--accent)]/30 shadow-lg shadow-[var(--accent)]/5' 
                : 'bg-[var(--bg-card)] border-[var(--border-subtle)] opacity-60 hover:opacity-100'
            )}
          >
            <div className="flex justify-between mb-4">
              <Cpu className={cn("w-5 h-5", aiConfig.provider === 'deepseek' ? "text-[var(--accent)]" : "text-[var(--text-muted)]")} />
              {aiConfig.provider === 'deepseek' && <span className="text-[8px] font-black uppercase bg-[var(--accent)] text-[var(--bg-deep)] px-2 py-0.5 rounded">Active</span>}
            </div>
            <h3 className="text-lg font-black text-[var(--text-bright)] uppercase tracking-tight">DeepSeek V3</h3>
            <p className="text-[10px] text-[var(--text-secondary)] mt-2 font-black uppercase tracking-widest leading-relaxed">Ragionamento profondo.</p>
          </button>

          <button
            onClick={() => handleProviderChange('gemini')}
            className={cn(
              "relative p-6 rounded-[32px] border text-left transition-all",
              aiConfig.provider === 'gemini' 
                ? 'bg-[var(--accent-soft)] border-[var(--accent)]/30 shadow-lg shadow-[var(--accent)]/5' 
                : 'bg-[var(--bg-card)] border-[var(--border-subtle)] opacity-60 hover:opacity-100'
            )}
          >
            <div className="flex justify-between mb-4">
              <Activity className={cn("w-5 h-5", aiConfig.provider === 'gemini' ? "text-[var(--accent)]" : "text-[var(--text-muted)]")} />
              {aiConfig.provider === 'gemini' && <span className="text-[8px] font-black uppercase bg-[var(--accent)] text-[var(--bg-deep)] px-2 py-0.5 rounded">Active</span>}
            </div>
            <h3 className="text-lg font-black text-[var(--text-bright)] uppercase tracking-tight">Gemini 1.5 Flash</h3>
            <p className="text-[10px] text-[var(--text-secondary)] mt-2 font-black uppercase tracking-widest leading-relaxed">Context window enorme.</p>
          </button>
        </div>

        {/* APPEARANCE SECTION */}
        <div className="bg-[var(--bg-card)] p-10 rounded-[48px] border border-[var(--border-subtle)] space-y-10">
          <div className="flex items-center gap-4">
            <Sun className="w-5 h-5 text-[var(--accent)]" />
            <h3 className="text-xl font-black text-[var(--text-bright)] uppercase tracking-tight italic">Ambiente & Atmosfera</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              onClick={() => setTheme('dark')}
              className={cn(
                "p-8 rounded-[32px] border text-left transition-all group relative overflow-hidden",
                theme === 'dark' 
                  ? "bg-[var(--accent-soft)] border-[var(--accent)]/30 shadow-lg" 
                  : "bg-[var(--bg-card)] border-[var(--border-subtle)] opacity-60 hover:opacity-100"
              )}
            >
              <Moon className={cn("w-6 h-6 mb-4", theme === 'dark' ? "text-[var(--accent)]" : "text-[var(--text-muted)]")} />
              <div className="text-lg font-black text-[var(--text-bright)] uppercase tracking-tight">Inkwell Mode</div>
              <p className="text-[10px] text-[var(--text-secondary)] mt-1 uppercase tracking-widest leading-relaxed">Interfaccia scura per la massima concentrazion.</p>
              {theme === 'dark' && <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-[var(--accent)] shadow-[0_0_10px_rgba(var(--accent),0.5)]" />}
            </button>

            <button
              onClick={() => setTheme('light')}
              className={cn(
                "p-8 rounded-[32px] border text-left transition-all group relative overflow-hidden",
                theme === 'light' 
                  ? "bg-[var(--accent-soft)] border-[var(--accent)]/30 shadow-lg" 
                  : "bg-[var(--bg-card)] border-[var(--border-subtle)] opacity-60 hover:opacity-100"
              )}
            >
              <Sun className={cn("w-6 h-6 mb-4", theme === 'light' ? "text-[var(--accent)]" : "text-[var(--text-muted)]")} />
              <div className="text-lg font-black text-[var(--text-bright)] uppercase tracking-tight">Parchment Mode</div>
              <p className="text-[10px] text-[var(--text-secondary)] mt-1 uppercase tracking-widest leading-relaxed">Interfaccia chiara rilassante effetto carta.</p>
              {theme === 'light' && <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-[var(--accent)] shadow-[0_0_10px_rgba(var(--accent),0.5)]" />}
            </button>
          </div>
        </div>

        {/* SECURITY & DIAGNOSTICS */}
        <div className="bg-[var(--bg-card)] p-10 rounded-[48px] border border-[var(--border-subtle)] space-y-10">
          <div className="flex items-center gap-4">
            <ShieldCheck className="w-5 h-5 text-[var(--accent)]" />
            <h3 className="text-xl font-black text-[var(--text-bright)] uppercase tracking-tight italic">Security & Diagnostics</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {/* DeepSeek Security */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.3em]">Nucleo DeepSeek</h4>
                  {aiConfig.deepseekKey && (
                    <button onClick={handleTestDeepSeek} disabled={isTesting} className="p-2.5 bg-[var(--accent)] text-[var(--bg-deep)] rounded-xl hover:scale-105 transition-all">
                      <Activity className={cn("w-3.5 h-3.5", isTesting && "animate-spin")} />
                    </button>
                  )}
                </div>
                
                {!aiConfig.deepseekKey ? (
                  <div className="flex gap-4">
                    <input 
                      type="password" value={keyInput} onChange={(e) => setKeyInput(e.target.value)}
                      placeholder="sk-..." className="flex-1 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl px-6 py-4 text-xs text-[var(--text-bright)] focus:outline-none focus:border-[var(--accent)]/30 transition-all font-mono"
                    />
                    <button onClick={handleSaveKey} disabled={isSaving} className="px-8 bg-[var(--accent)] text-[var(--bg-deep)] rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95">
                      Attiva
                    </button>
                  </div>
                ) : (
                  <div className="p-6 bg-[var(--accent-soft)] border border-[var(--accent)]/10 rounded-3xl group">
                    <p className="text-[9px] uppercase tracking-widest text-[var(--accent)] font-black mb-2 flex items-center gap-2">
                       <CheckCircle className="w-3 h-3" /> Chiave Configurata
                    </p>
                    <code className="text-xs text-[var(--text-muted)] font-mono block truncate">
                      sk-...{aiConfig.deepseekKey.slice(-6)}
                    </code>
                  </div>
                )}
                {testResult && (
                  <pre className="p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl text-[9px] text-[var(--accent)] font-mono overflow-x-auto">
                    {JSON.stringify(testResult, null, 2)}
                  </pre>
                )}
              </div>

              {/* Gemini Security */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.3em]">Nucleo Gemini</h4>
                  {aiConfig.geminiKey && (
                    <button onClick={handleTestGemini} disabled={isTestingGemini} className="p-2.5 bg-[var(--accent)] text-[var(--bg-deep)] rounded-xl hover:scale-105 transition-all">
                      <Activity className={cn("w-3.5 h-3.5", isTestingGemini && "animate-spin")} />
                    </button>
                  )}
                </div>
                
                {!aiConfig.geminiKey ? (
                  <div className="flex gap-4">
                    <input 
                      type="password" value={geminiKeyInput} onChange={(e) => setGeminiKeyInput(e.target.value)}
                      placeholder="API Key..." className="flex-1 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl px-6 py-4 text-xs text-[var(--text-bright)] focus:outline-none focus:border-[var(--accent)]/30 transition-all font-mono"
                    />
                    <button onClick={handleSaveGeminiKey} disabled={isSavingGemini} className="px-8 bg-[var(--accent)] text-[var(--bg-deep)] rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95">
                      Attiva
                    </button>
                  </div>
                ) : (
                  <div className="p-6 bg-[var(--accent-soft)] border border-[var(--accent)]/10 rounded-3xl group">
                    <p className="text-[9px] uppercase tracking-widest text-[var(--accent)] font-black mb-2 flex items-center gap-2">
                       <CheckCircle className="w-3 h-3" /> Chiave Configurata
                    </p>
                    <code className="text-xs text-[var(--text-muted)] font-mono block truncate">
                      {aiConfig.geminiKey.slice(0, 4)}...{aiConfig.geminiKey.slice(-4)}
                    </code>
                  </div>
                )}
                {testGeminiResult && (
                  <pre className="p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl text-[9px] text-[var(--accent)] font-mono overflow-x-auto">
                    {JSON.stringify(testGeminiResult, null, 2)}
                  </pre>
                )}
              </div>

              {/* Groq Security */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.3em]">Nucleo Groq</h4>
                  <button onClick={handleTestGroq} disabled={isTestingGroq} className="p-2.5 bg-[var(--accent)] text-[var(--bg-deep)] rounded-xl hover:scale-105 transition-all">
                    <Activity className={cn("w-3.5 h-3.5", isTestingGroq && "animate-spin")} />
                  </button>
                </div>
                
                <div className="p-6 bg-[var(--accent-soft)] border border-[var(--accent)]/10 rounded-3xl group">
                  <p className="text-[9px] uppercase tracking-widest text-[var(--accent)] font-black mb-2 flex items-center gap-2">
                     <CheckCircle className="w-3 h-3" /> Integrato via Server
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] leading-relaxed italic">
                    La chiave Groq è gestita internamente dal sistema per massimizzare le performance.
                  </p>
                </div>
                
                {testGroqResult && (
                  <pre className="p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl text-[9px] text-[var(--accent)] font-mono overflow-x-auto">
                    {JSON.stringify(testGroqResult, null, 2)}
                  </pre>
                )}
              </div>
          </div>
        </div>

        {/* MANUSCRIPT & EXPORT - ALWAYS RENDERED */}
        <div className="bg-[var(--bg-card)] p-10 rounded-[48px] border border-[var(--border-subtle)] space-y-10 shadow-sm">
          <div className="flex items-center gap-4">
            <BookOpen className="w-5 h-5 text-[var(--accent)]" />
            <h3 className="text-xl font-black text-[var(--text-bright)] uppercase tracking-tight italic">Manoscritto & Esportazione</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
            <div className="space-y-4">
              <label className="text-[10px] uppercase font-black text-[var(--text-secondary)] tracking-[0.2em] ml-2 flex items-center gap-2">
                <UserCircle className="w-3.5 h-3.5" /> Nome Autore
              </label>
              <input 
                type="text" value={authorName} onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Firma il tuo lavoro..." className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl px-6 py-4 text-sm text-[var(--text-bright)]"
              />
            </div>
            
            <button
              onClick={handleExport} disabled={isExporting || !currentProject}
              className="flex items-center justify-center gap-4 w-full h-[60px] bg-[var(--accent)] text-[var(--bg-deep)] rounded-2xl font-black uppercase tracking-widest text-[11px] hover:translate-y-[-2px] transition-all disabled:opacity-50 shadow-lg shadow-[var(--accent)]/10"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><FileDown className="w-5 h-5" /> Esporta Progetto (.docx)</>}
            </button>
          </div>

          <div className="p-6 bg-[var(--accent-soft)] border border-[var(--accent)]/10 rounded-3xl text-[11px] text-[var(--text-secondary)] leading-relaxed font-black uppercase tracking-widest opacity-80">
            <strong>Ottimizzazione:</strong> Il manoscritto viene generato con formattazione standard per Word e LibreOffice, includendo frontespizio e stili di paragrafo preservati.
          </div>
        </div>

        {/* FINAL SPACER */}
        <div className="h-20" />
      </div>
    </div>
  );
});
