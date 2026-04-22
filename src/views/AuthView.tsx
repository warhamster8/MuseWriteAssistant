import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Lock, LogIn, ArrowLeft, Loader2, ShieldAlert } from 'lucide-react';
import { useStore } from '../store/useStore';

interface AuthViewProps {
  onBack: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setUser } = useStore();

  const ALLOWED_EMAIL = import.meta.env.VITE_ALLOWED_EMAIL;

  /**
   * Gestisce il processo di autenticazione via Supabase Auth.
   * Include controlli di sicurezza preventivi (Rule 2) e gestione errori silente (Rule 3).
   */
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validazione preventiva: controllo autorizzazione basata su whitelist (Rule 2)
    const normalizedEmail = email.trim().toLowerCase();
    if (ALLOWED_EMAIL && normalizedEmail !== ALLOWED_EMAIL.toLowerCase()) {
      setError('Accesso negato: Solo il proprietario può accedere a questa istanza di Muse.');
      setLoading(false);
      return;
    }

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      
      if (signInError) throw signInError;
      
      if (data.user) {
        // Doppio controllo post-auth per massima sicurezza (Defense in Depth)
        if (ALLOWED_EMAIL && data.user.email?.toLowerCase() !== ALLOWED_EMAIL.toLowerCase()) {
          console.warn('[SECURITY LOG] Unauthorized login attempt blocked:', data.user.email);
          await supabase.auth.signOut();
          throw new Error('Utente non autorizzato dal sistema.');
        }
        setUser({ id: data.user.id, email: data.user.email });
      }
    } catch (err: any) {
      console.error('[SECURITY LOG] Auth Exception:', err.message);
      // Messaggio generico all'utente per evitare enumeration attacks (Rule 3)
      setError('Credenziali non valide o errore di sistema. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-deep)] p-4 selection:bg-[var(--accent)]/30">
      <div className="glass p-8 md:p-12 rounded-[40px] border border-[var(--border-subtle)] max-w-md w-full relative overflow-y-auto max-h-[95vh] shadow-2xl scrollbar-hide">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-[var(--accent)]" />
        
        <button 
          onClick={onBack}
          className="absolute top-6 left-6 text-[var(--text-muted)] hover:text-[var(--accent)] transition-all p-2 hover:bg-[var(--bg-surface)]/10 rounded-xl"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="text-center mb-8 pt-4">
          <div className="w-20 h-20 bg-[var(--accent-soft)] rounded-3xl flex items-center justify-center mx-auto mb-6 border border-[var(--accent)]/20 shadow-inner group transition-all hover:scale-110">
            <ShieldAlert className="w-10 h-10 text-[var(--accent)]" />
          </div>
          <h2 className="text-3xl font-medium font-display tracking-tight text-[var(--text-bright)]">
            Varco di Sicurezza
          </h2>
          <p className="text-[var(--text-muted)] text-xs mt-3 uppercase tracking-widest font-bold">
            Identificazione Richiesta
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] pl-1">Protocollo Email</label>
            <div className="relative">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input 
                type="email" 
                required
                className="w-full bg-[var(--bg-deep)]/40 border border-[var(--border-subtle)] rounded-[20px] py-4 pl-14 pr-6 text-sm focus:outline-none focus:border-[var(--accent)]/30 focus:bg-[var(--bg-surface)]/60 transition-all text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                placeholder="proprietario@muse.ai"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] pl-1">Chiave d'Accesso</label>
            <div className="relative">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input 
                type="password" 
                required
                className="w-full bg-[var(--bg-deep)]/40 border border-[var(--border-subtle)] rounded-[20px] py-4 pl-14 pr-6 text-sm focus:outline-none focus:border-[var(--accent)]/30 focus:bg-[var(--bg-surface)]/60 transition-all text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl text-red-500 text-[11px] text-center font-bold tracking-tight animate-in fade-in slide-in-from-top-1">
              {error}
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--bg-deep)] rounded-[24px] font-bold flex items-center justify-center gap-3 transition-all shadow-2xl disabled:opacity-50 mt-6 active:scale-95 uppercase tracking-widest text-xs"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                Sincronizza Core
              </>
            )}
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-[var(--border-subtle)] text-center">
          <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-[0.1em]">
            Sorgente Protetta <a href="https://github.com/warhamster8/Muse" className="text-[var(--accent)]/50 hover:text-[var(--accent)] ml-1">v4.0.0-emerald</a>
          </p>
        </div>
      </div>
    </div>
  );
};
