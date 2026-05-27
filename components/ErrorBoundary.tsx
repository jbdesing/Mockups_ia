
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = "Ocorreu um erro inesperado.";
      let details = "";

      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error) {
            errorMessage = "Erro de permissão ou conexão com o banco de dados.";
            details = `Operação: ${parsed.operationType} em ${parsed.path}`;
          }
        }
      } catch (e) {
        // Not a JSON error, use default
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-base-100 flex items-center justify-center p-6 text-center">
          <div className="bg-base-200 border border-red-500/20 rounded-[40px] p-12 max-w-lg w-full shadow-2xl">
            <div className="mb-6 inline-flex p-4 bg-red-500/10 rounded-full text-red-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            </div>
            <h2 className="text-2xl font-black text-white mb-4 tracking-tighter uppercase italic">Ops! Algo deu errado</h2>
            <p className="text-gray-400 mb-2 font-medium">{errorMessage}</p>
            {details && <p className="text-red-400/60 text-[10px] uppercase tracking-widest font-black mb-8">{details}</p>}
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-brand-primary text-white font-black py-4 rounded-2xl hover:bg-brand-secondary transition-all shadow-xl shadow-brand-primary/20 uppercase tracking-widest text-xs"
            >
              Recarregar Aplicativo
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
