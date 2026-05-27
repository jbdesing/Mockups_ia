
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const AuthScreens: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { login, signup, loginWithGoogle, resetPassword, loading, error, clearError } = useAuth();
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLogin && password !== confirmPassword) {
      return; // Error handled by form validation or local state
    }

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, password, displayName);
      }
    } catch (err) {
      // Error handled by Context
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (err) {
      // Error handled by Context
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      // Context will set error if email is empty
      resetPassword('');
      return;
    }
    try {
      await resetPassword(email);
      setResetSent(true);
      setTimeout(() => setResetSent(false), 5000);
    } catch (err) {
      // Error handled by Context
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-100 p-4 overflow-hidden relative">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-primary/20 blur-[120px] rounded-full animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-secondary/20 blur-[120px] rounded-full animate-pulse delay-700"></div>

      <div className="w-full max-w-md bg-base-200/80 backdrop-blur-xl p-8 rounded-2xl shadow-2xl border border-base-300 relative z-10 transition-all duration-500 hover:shadow-brand-primary/10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-primary/10 rounded-full mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-primary"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
          </div>
          <h2 className="text-3xl font-bold text-white tracking-tight">
            {isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}
          </h2>
          <p className="text-gray-400 mt-2">Acesse o futuro da criação de estampas</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/50 rounded-md text-red-400 text-sm flex items-center animate-shake">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            <div className="flex-1">
              {error}
              {error.includes('não está ativado') && (
                <div className="mt-2 text-[10px] opacity-80 leading-tight">
                  Ative em: Supabase Dashboard {'>'} Authentication {'>'} Providers {'>'} Email
                </div>
              )}
            </div>
          </div>
        )}

        {resetSent && (
          <div className="mb-6 p-3 bg-emerald-500/10 border border-emerald-500/50 rounded-md text-emerald-400 text-sm flex items-center animate-fadeIn">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            <div className="flex-1">
              <p className="font-bold">E-mail de redefinição solicitado!</p>
              <p className="text-[10px] mt-1 opacity-90">
                Se o e-mail estiver cadastrado, você receberá um link em instantes. 
                Verifique sua caixa de **Spam** ou **Lixo Eletrônico**.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <div className="animate-fadeIn">
              <label className="block text-sm font-medium text-gray-300 mb-1">Nome Completo</label>
              <input 
                type="text" 
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-base-300 border border-base-300 rounded-lg p-3 text-white focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                placeholder="Seu nome"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">E-mail</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => { setEmail(e.target.value); clearError(); }}
              className="w-full bg-base-300 border border-base-300 rounded-lg p-3 text-white focus:ring-2 focus:ring-brand-primary outline-none transition-all"
              placeholder="exemplo@email.com"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-300">Senha</label>
              {isLogin && (
                <button 
                  type="button"
                  onClick={handleResetPassword}
                  className="text-[10px] text-brand-primary hover:underline font-bold"
                >
                  Esqueci a senha
                </button>
              )}
            </div>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => { setPassword(e.target.value); clearError(); }}
              className="w-full bg-base-300 border border-base-300 rounded-lg p-3 text-white focus:ring-2 focus:ring-brand-primary outline-none transition-all"
              placeholder="••••••••"
            />
          </div>

          {!isLogin && (
            <div className="animate-fadeIn">
              <label className="block text-sm font-medium text-gray-300 mb-1">Confirmar Senha</label>
              <input 
                type="password" 
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full bg-base-300 border rounded-lg p-3 text-white focus:ring-2 focus:ring-brand-primary outline-none transition-all ${confirmPassword && confirmPassword !== password ? 'border-red-500/50' : 'border-base-300'}`}
                placeholder="••••••••"
              />
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-to-r from-brand-primary to-brand-secondary text-white font-bold py-3 rounded-lg hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center overflow-hidden"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            ) : (
              isLogin ? 'Entrar' : 'Cadastrar'
            )}
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-base-300"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-base-200 px-2 text-gray-500">Ou continue com</span>
          </div>
        </div>

        <div className="grid grid-cols-1">
          <button 
            onClick={handleGoogleLogin}
            disabled={loading}
            className="bg-white text-gray-900 font-bold py-3 rounded-lg hover:bg-gray-100 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google
          </button>
        </div>

        <div className="mt-8 text-center text-sm">
          <p className="text-gray-400">
            {isLogin ? 'Não tem uma conta?' : 'Já possui uma conta?'}
            <button 
              onClick={() => { setIsLogin(!isLogin); clearError(); }}
              className="ml-2 text-brand-primary font-bold hover:text-brand-secondary transition-colors"
            >
              {isLogin ? 'Cadastre-se' : 'Faça Login'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
