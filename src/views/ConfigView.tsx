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

  /**
   * Salva la chiave API nel profilo utente su Supabase.
   * Include validazione formale della chiave (Rule 2) e gestione errori sicura (Rule 3).
   */
  const handleSaveKey = async () => {
    const trimmedKey = keyInput.trim();

    // Validazione Rigida (Mega-Prompt Rule 2)
    if (!trimmedKey || !trimmedKey.startsWith('sk-') || trimmedKey.length < 20) {
      addToast("Inserisci una chiave valida (deve iniziare con 'sk-' e avere lunghezza minima)", 'error');
      return;
    }
    
    if (!user) {
      addToast("Sessione non valida: effettua nuovamente il login", 'error');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          deepseek_api_key: trimmedKey,
          ai_settings: {
            ...aiConfig,
            provider: 'deepseek'
          }
        })
        .eq('user_id', user.id);

      if (error) throw error;
      
      // Aggiornamento stato globale (persistenza locale esclusa per sicurezza)
      setAIConfig({ deepseekKey: trimmedKey, provider: 'deepseek' });
      addToast("Configurazione sincronizzata!", 'success');
      setKeyInput('');
    } catch (err: any) {
      console.error('[SECURITY LOG] Save Key Error:', err.message);
      addToast("Impossibile salvare la configurazione. Riprova più tardi.", 'error');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Esegue un test di connettività verso il provider selezionato.
   */
  const handleTestDeepSeek = async () => {
    if (!aiConfig.deepseekKey) {
      addToast("Configurazione mancante: inserisci prima una chiave", 'error');
      return;
    }
    
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await deepseekService.testConnection(aiConfig.deepseekKey);
      setTestResult(result);
      
      if (result.ok) {
        addToast("Ping di sistema riuscito!", 'success');
      } else {
        addToast(`Diagnostica fallita: ${result.status}`, 'error');
      }
    } catch (err: any) {
      console.error('[SECURITY LOG] Test Connection Exception:', err.message);
      addToast("Errore durante la diagnostica di rete", 'error');
    } finally {
      setIsTesting(false);
    }
  };

  /**
   * Cambia il provider AI attivo e persiste la preferenza.
   */
  const handleProviderChange = async (provider: 'groq' | 'deepseek') => {
    // Aggiornamento immediato UI
    setAIConfig({ provider });
    
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          ai_settings: { ...aiConfig, provider } 
        })
        .eq('user_id', user.id);
        
      if (error) throw error;
      addToast(`Motore AI impostato su ${provider}`, 'success');
    } catch (err: any) {
      console.error('[SECURITY LOG] Provider Update Error:', err.message);
      addToast("Errore nel salvataggio della preferenza", 'error');
    }
  };

  /**
   * Gestisce l'esportazione del progetto in formato DOCX.
   */
  const handleExport = async () => {
    if (!currentProject) {
      addToast("Nessun progetto selezionato per l'esportazione", 'error');
      return;
    }

    if (chapters.length === 0) {
      addToast("Il progetto è vuoto. Aggiungi capitoli prima di esportare.", 'error');
      return;
    }

    setIsExporting(true);
    try {
      await exportToDocx(currentProject.title, chapters, authorName || "Autore Ignoto");
      addToast("Manoscritto esportato con successo!", 'success');
    } catch (err: any) {
      console.error('[SECURITY LOG] Export Exception:', err.message);
      addToast("Errore durante la generazione del manoscritto", 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-10 space-y-10 max-w-5xl mx-auto overflow-y-auto scrollbar-hide animate-in fade-in duration-700">
      <div className="flex items-center gap-6 bg-white/[0.02] p-8 rounded-[40px] border border-white/5">
        <div className="p-4 bg-[#5be9b1]/10 rounded-2xl border border-[#5be9b1]/20">
          <Settings className="w-8 h-8 text-[#5be9b1]" />
        </div>
        <div>
          <h1 className="text-4xl font-medium font-display tracking-tight text-white">Configurazione Nucleo AI</h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em] mt-2">Architettura Narrativa & Parametri Motore</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Groq Card */}
        <button
          onClick={() => handleProviderChange('groq')}
          className={`relative p-8 rounded-[40px] border text-left transition-all duration-500 overflow-hidden group shadow-sm ${
            aiConfig.provider === 'groq' 
              ? 'bg-[#5be9b1]/10 border-[#5be9b1]/30 shadow-2xl shadow-emerald-950/20' 
              : 'bg-white/[0.02] border-white/5 hover:border-white/10'
          }`}
        >
          <div className="flex items-start justify-between mb-6">
            <div className={`p-4 rounded-2xl transition-colors ${aiConfig.provider === 'groq' ? 'bg-[#5be9b1] text-white shadow-lg' : 'bg-[#121519] border border-white/5 text-slate-600'}`}>
              <Zap className="w-6 h-6" />
            </div>
            {aiConfig.provider === 'groq' && (
              <span className="text-[9px] font-bold uppercase tracking-widest bg-[#5be9b1] text-white px-3 py-1.5 rounded-full shadow-lg">Attivo</span>
            )}
          </div>
          <h3 className={cn("text-2xl font-medium mb-3 tracking-tight transition-colors", aiConfig.provider === 'groq' ? "text-[#5be9b1]" : "text-white")}>
            Groq <span className="text-sm opacity-50 ml-2">(Llama 3.3)</span>
          </h3>
          <p className="text-sm text-slate-500 leading-relaxed font-light">
            Velocità di elaborazione estrema e latenza minima. Consigliato per brainstorming rapido e riscrittura istantanea.
          </p>
          <div className="mt-8 flex gap-3">
            <span className="text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 bg-[#121519] rounded-lg text-slate-600 border border-white/5">70B Parametri</span>
            <span className="text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 bg-[#121519] rounded-lg text-slate-600 border border-white/5">LPU Optimized</span>
          </div>
        </button>

        {/* DeepSeek Card */}
        <button
          onClick={() => handleProviderChange('deepseek')}
          className={`relative p-8 rounded-[40px] border text-left transition-all duration-500 overflow-hidden group shadow-sm ${
            aiConfig.provider === 'deepseek' 
              ? 'bg-[#5be9b1]/10 border-[#5be9b1]/30 shadow-2xl shadow-emerald-950/20' 
              : 'bg-white/[0.02] border-white/5 hover:border-white/10'
          }`}
        >
          <div className="flex items-start justify-between mb-6">
            <div className={`p-4 rounded-2xl transition-colors ${aiConfig.provider === 'deepseek' ? 'bg-[#5be9b1] text-white shadow-lg' : 'bg-[#121519] border border-white/5 text-slate-600'}`}>
              <Cpu className="w-6 h-6" />
            </div>
            {aiConfig.provider === 'deepseek' && (
              <span className="text-[9px] font-bold uppercase tracking-widest bg-[#5be9b1] text-white px-3 py-1.5 rounded-full shadow-lg">Attivo</span>
            )}
          </div>
          <h3 className={cn("text-2xl font-medium mb-3 tracking-tight transition-colors", aiConfig.provider === 'deepseek' ? "text-[#5be9b1]" : "text-white")}>
            DeepSeek <span className="text-sm opacity-50 ml-2">V3</span>
          </h3>
          <p className="text-sm text-slate-500 leading-relaxed font-light">
            Ragionamento analitico superiore e profondità creativa. Eccellente per analisi strutturali e editing di alta qualità.
          </p>
          <div className="mt-8 flex gap-3">
            <span className="text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 bg-[#121519] rounded-lg text-slate-600 border border-white/5">671B Parametri</span>
            <span className="text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 bg-[#121519] rounded-lg text-slate-600 border border-white/5">MoE Architecture</span>
          </div>
        </button>
      </div>

      <div className="bg-white/[0.02] p-10 rounded-[48px] border border-white/5 space-y-10 shadow-sm">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-[#5be9b1]/10 rounded-xl">
                    <ShieldCheck className="w-5 h-5 text-[#5be9b1]" />
                </div>
                <div>
                    <h3 className="text-xl font-medium text-white tracking-tight">Infrastruttura di Sicurezza</h3>
                    <p className="text-[10px] uppercase font-bold text-slate-600 tracking-[0.2em] mt-1">Gestione chiavi & diagnostica</p>
                </div>
            </div>
            <div className="flex items-center gap-4 px-6 py-3 bg-white/[0.03] rounded-2xl border border-white/5">
                <div className={cn("w-2 h-2 rounded-full", aiConfig.provider ? "bg-[#5be9b1] animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-slate-800")} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Sistema Operativo</span>
            </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="p-6 bg-black/40 border border-white/5 rounded-3xl hover:border-white/10 transition-all group">
              <p className="text-[9px] uppercase tracking-[0.2em] text-slate-700 font-bold mb-3 group-hover:text-slate-500 transition-colors">Endpoint DeepSeek</p>
               <div className="flex items-center gap-4">
                  <div className={`w-2.5 h-2.5 rounded-full ${aiConfig.deepseekKey ? 'bg-[#5be9b1] shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'bg-amber-900'}`} />
                  <span className="font-mono text-sm text-slate-300">
                     {aiConfig.deepseekKey 
                        ? `sk-...${aiConfig.deepseekKey.slice(-6)}` 
                        : 'Identità non configurata'}
                  </span>
               </div>
            </div>
            
            <div className="p-6 bg-black/40 border border-white/5 rounded-3xl flex items-center justify-between hover:border-white/10 transition-all">
               <div>
                  <p className="text-[9px] uppercase tracking-[0.2em] text-slate-700 font-bold mb-3">Diagnostica Core</p>
                  <span className="text-sm font-medium text-slate-400">Esegui ping di sistema</span>
               </div>
               <button 
                onClick={handleTestDeepSeek}
                disabled={isTesting}
                className="p-4 bg-[#5be9b1] hover:bg-[#5be9b1] disabled:opacity-50 rounded-2xl transition-all shadow-xl shadow-emerald-950/40 active:scale-90"
               >
                 <Activity className={`w-5 h-5 text-white ${isTesting ? 'animate-spin' : ''}`} />
               </button>
            </div>
        </div>

        <AnimatePresence>
          {testResult && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-8 bg-black/40 border border-white/5 rounded-[32px] space-y-4 shadow-inner"
            >
              <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.3em] text-[#5be9b1]/50">
                <Terminal className="w-4 h-4" />
                <span>Console Log / Risposta Server</span>
              </div>
              <pre className="text-[11px] font-mono bg-black/50 p-6 rounded-2xl overflow-x-auto text-[#5be9b1] border border-white/5 leading-relaxed">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </motion.div>
          )}
        </AnimatePresence>

        {!aiConfig.deepseekKey && (
          <div className="space-y-6 pt-4">
            <div className="flex items-start gap-4 p-6 bg-amber-500/5 border border-amber-500/10 rounded-3xl text-amber-500/60 text-xs leading-relaxed">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>
                La chiave DeepSeek non è attiva nel modulo corrente. Per sbloccare le funzionalità di ragionamento avanzato (V3), autenticare l'accesso tramite protocollo sk-key.
              </p>
            </div>
            
            <div className="flex gap-4">
              <input 
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="Incolla chiave segreta (sk-...)"
                autoComplete="off"
                spellCheck={false}
                className="flex-1 bg-[#121519]/60 border border-white/5 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-[#5be9b1]/30 focus:bg-[#121519] transition-all font-mono"
              />
              <button
                onClick={handleSaveKey}
                disabled={isSaving || !keyInput}
                className="px-10 py-4 bg-[#5be9b1] hover:bg-[#5be9b1] disabled:opacity-50 rounded-2xl text-[10px] font-bold text-white uppercase tracking-widest transition-all shadow-2xl shadow-emerald-950/40 active:scale-95"
              >
                {isSaving ? 'Sincronizzazione...' : 'Attiva Modulo'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* NUOVO MODULO: Esportazione & Manoscritto (Mattoncino Esportazione) */}
      <div className="bg-white/[0.02] p-10 rounded-[48px] border border-white/5 space-y-10 shadow-sm relative overflow-hidden group/export">
        {/* Background Accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#5be9b1]/5 blur-[100px] pointer-events-none group-hover/export:bg-[#5be9b1]/10 transition-colors duration-1000" />
        
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-[#5be9b1]/10 rounded-xl">
                    <BookOpen className="w-5 h-5 text-[#5be9b1]" />
                </div>
                <div>
                    <h3 className="text-xl font-medium text-white tracking-tight">Manoscritto & Esportazione</h3>
                    <p className="text-[10px] uppercase font-bold text-slate-600 tracking-[0.2em] mt-1">Configura l'output del tuo manoscritto</p>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
            <div className="space-y-4">
                <label className="flex items-center gap-2 text-[10px] uppercase font-bold text-slate-500 tracking-[0.1em] ml-2">
                    <UserCircle className="w-3.5 h-3.5" />
                    Nome Autore (per pagina iniziale)
                </label>
                <input 
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Inserisci il tuo nome o pseudonimo..."
                  className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-[#5be9b1]/30 transition-all"
                />
            </div>
            
            <button
              onClick={handleExport}
              disabled={isExporting || !currentProject}
              className={cn(
                "flex items-center justify-center gap-4 w-full h-[60px] rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all relative overflow-hidden group/btn disabled:opacity-50",
                isExporting 
                  ? "bg-slate-800 text-slate-500" 
                  : "bg-white text-black hover:scale-[1.02] active:scale-95 shadow-[0_20px_40px_-10px_rgba(255,255,255,0.1)]"
              )}
            >
                {isExporting ? (
                    <div className="flex items-center gap-3">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generazione in corso...
                    </div>
                ) : (
                    <>
                        <FileDown className="w-5 h-5 group-hover/btn:-translate-y-1 transition-transform" />
                        Esporta Progetto (.docx)
                    </>
                )}
            </button>
        </div>

        <div className="p-6 bg-[#5be9b1]/5 border border-[#5be9b1]/10 rounded-3xl">
            <p className="text-[11px] leading-relaxed text-[#5be9b1]/70 font-medium">
                <strong>Nota di Esportazione:</strong> Il file generato è ottimizzato per <strong>Microsoft Word</strong> e <strong>LibreOffice</strong>. 
                Include una pagina di titolo professionale, intestazioni per i capitoli e formattazione preservata per ogni scena.
            </p>
        </div>
      </div>
    </div>
  );
});

// Simple AnimatePresence polyfill since we don't have the full component here
// but can keep it if we import it, otherwise replace with simple ternary if needed.
const AnimatePresence = ({ children }: { children: React.ReactNode }) => <>{children}</>;
const motion = { div: ({ children, className, ...props }: any) => <div className={className} {...props}>{children}</div> };
