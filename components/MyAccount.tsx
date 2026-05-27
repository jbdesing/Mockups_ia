
import React from 'react';
import { useAuth } from '../context/AuthContext';

export const MyAccount: React.FC<{ onBack: () => void; onUpgrade: () => void }> = ({ onBack, onUpgrade }) => {
  const { user } = useAuth();
  if (!user) return null;

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('pt-BR');
  };

  const getPlanDisplay = () => {
    if (user.plan === 'free') return 'Free';
    if (user.plan === 'basic') return 'Basic';
    if (user.plan === 'intermediate') return 'Intermediária';
    if (user.plan === 'premium') return 'Premium';
    return user.plan;
  };

  const getUsageLimit = () => {
    if (user.plan === 'free') return 4;
    if (user.plan === 'basic') return 15;
    if (user.plan === 'intermediate') return 50;
    return Infinity;
  };

  const getBillingCycleDisplay = () => {
    if (user.plan === 'free') return 'Teste Gratuito';
    if (user.billingCycle === 'annual') return 'Assinatura Anual';
    return 'Assinatura Mensal';
  };

  const [systemStatus, setSystemStatus] = React.useState({ supabase: true, gemini: false });

  React.useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        setSystemStatus(prev => ({ ...prev, gemini: data.geminiConfigured }));
      })
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 animate-slideUp">
      <button onClick={onBack} className="text-brand-primary text-[10px] font-black flex items-center gap-2 mb-8 uppercase tracking-widest">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 12H5m7-7l-7 7 7 7" strokeWidth="3"/></svg>
        Voltar para o Gerador
      </button>

      <div className="bg-base-200 border border-white/5 rounded-[40px] p-12 shadow-2xl">
        <h2 className="text-4xl font-black text-white mb-10 tracking-tighter">Minha Conta</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-8">
            {user.displayName && (
              <div>
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest block mb-1">Nome</label>
                <p className="text-white text-xl font-bold">{user.displayName}</p>
              </div>
            )}
            <div>
              <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest block mb-1">E-mail Conectado</label>
              <p className="text-white text-xl font-bold">{user.email}</p>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest block mb-1">Plano Atual</label>
              <div className="flex items-center gap-3">
                <p className="text-brand-primary text-2xl font-black uppercase">{getPlanDisplay()}</p>
                <span className="bg-brand-primary/10 text-brand-primary px-3 py-1 rounded-full text-[9px] font-black uppercase">
                  {getBillingCycleDisplay()}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div>
              <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest block mb-1">Renovação</label>
              <p className="text-white text-xl font-bold">{formatDate(user.renewalDate)}</p>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest block mb-1">Uso de Hoje / Limite</label>
              <p className="text-white text-xl font-bold">
                {user.plan === 'premium' ? 'Ilimitado' : `${user.plan === 'free' ? (4 - user.trialUses) : user.dailyUses} / ${getUsageLimit()} envios`}
              </p>
              <div className="w-full bg-white/5 h-1.5 rounded-full mt-3 overflow-hidden">
                <div 
                  className="h-full bg-brand-primary transition-all duration-1000" 
                  style={{ width: `${user.plan === 'premium' ? 100 : Math.min(100, ((user.plan === 'free' ? (4 - user.trialUses) : user.dailyUses) / getUsageLimit()) * 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
           <button className="text-red-400 text-[10px] font-black uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity">Cancelar Assinatura</button>
           <button 
             onClick={onUpgrade}
             className="bg-brand-primary text-white font-black uppercase tracking-widest px-8 py-4 rounded-full hover:bg-brand-secondary transition-all shadow-xl shadow-brand-primary/20 text-xs"
           >
             Fazer Upgrade de Plano
           </button>
        </div>

        {/* Status do Sistema */}
        <div className="mt-12 pt-10 border-t border-white/5">
          <h3 className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-6">Status do Sistema</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-base-300/50 p-4 rounded-2xl border border-white/5 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-400">Supabase PostgreSQL</span>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] font-black text-emerald-500 uppercase">Conectado</span>
              </div>
            </div>
            <div className="bg-base-300/50 p-4 rounded-2xl border border-white/5 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-400">Gemini AI API</span>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${systemStatus.gemini ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                <span className={`text-[10px] font-black uppercase ${systemStatus.gemini ? 'text-emerald-500' : 'text-red-500'}`}>
                  {systemStatus.gemini ? 'Configurada' : 'Não Configurada'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Histórico de Downloads */}
      <div className="mt-12 bg-base-200 border border-white/5 rounded-[40px] p-12 shadow-2xl">
        <h3 className="text-2xl font-black text-white mb-8 tracking-tighter uppercase italic">Últimos Downloads</h3>
        
        {!user.downloadHistory || user.downloadHistory.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-3xl">
            <p className="text-gray-500 font-black uppercase tracking-widest text-[10px]">Nenhum download registrado ainda</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {user.downloadHistory.slice(0, user.plan === 'free' ? 4 : 20).map((item, index) => (
              <div key={index} className="group relative bg-base-300 rounded-2xl overflow-hidden aspect-square border border-white/5 hover:border-brand-primary/50 transition-all">
                <img 
                  src={item.src} 
                  alt="Mockup download" 
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                  <a 
                    href={item.src} 
                    download={`mockup-history-${index}.png`}
                    className="bg-brand-primary text-white p-2 rounded-full hover:scale-110 transition-transform"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                  </a>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-1 bg-black/40 backdrop-blur-sm">
                  <p className="text-[8px] text-white/60 text-center truncate">{formatDate(item.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
