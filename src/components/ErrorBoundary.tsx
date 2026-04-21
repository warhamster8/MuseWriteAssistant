import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black text-slate-200 p-8">
          <div className="bg-red-900/20 border border-red-500/50 rounded-2xl p-8 max-w-md w-full shadow-2xl backdrop-blur-md">
            <h1 className="text-2xl font-bold text-red-400 mb-4">Si è verificato un errore</h1>
            <p className="text-sm text-slate-400 mb-6">
              Progetto Muse ha riscontrato un problema durante il caricamento di questa sezione.
            </p>
            <div className="bg-black/50 rounded-lg p-3 mb-6 font-mono text-xs text-red-300/70 break-words border border-red-500/20">
              {this.state.error?.message}
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl font-bold transition-all shadow-lg active:scale-95"
            >
              Ricarica l'applicazione
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
