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

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Controllo preventivo dell'email
    if (ALLOWED_EMAIL && email.toLowerCase() !== ALLOWED_EMAIL.toLowerCase()) {
      setError('Accesso negato: Solo il proprietario può accedere a questa istanza.');
      setLoading(false);
      return;
    }

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (signInError) throw signInError;
      
      if (data.user) {
        // Doppio controllo per sicurezza post-auth
        if (ALLOWED_EMAIL && data.user.email?.toLowerCase() !== ALLOWED_EMAIL.toLowerCase()) {
          await supabase.auth.signOut();
          throw new Error('Accesso negato: Utente non autorizzato.');
        }
        setUser({ id: data.user.id, email: data.user.email });
      }
    } catch (err: any) {
      setError(err.message || 'Errore durante l\'autenticazione');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="glass p-8 rounded-3xl border border-slate-700 max-w-md w-full relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-600" />
        
        <button 
          onClick={onBack}
          className="absolute top-6 left-6 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="text-center mb-8 pt-4">
          <div className="w-20 h-20 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
            <ShieldAlert className="w-10 h-10 text-blue-500" />
          </div>
          <h2 className="text-2xl font-bold font-serif">
            Accesso Riservato
          </h2>
          <p className="text-slate-400 text-sm mt-2">
            Questa istanza di Muse è privata. Inserisci le tue credenziali per continuare.
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Email Proprietario</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="email" 
                required
                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-blue-500 transition-all text-white"
                placeholder="la-tua-email@esempio.it"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="password" 
                required
                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-blue-500 transition-all text-white"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs text-center font-medium animate-in fade-in slide-in-from-top-1">
              {error}
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 mt-4"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                Accedi come Proprietario
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-500">
            Sei uno sviluppatore? Puoi clonare questo progetto su <a href="https://github.com/warhamster8/Muse" className="text-blue-500 hover:underline">GitHub</a>.
          </p>
        </div>
      </div>
    </div>
  );
};
