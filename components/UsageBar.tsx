
import React from 'react';
import { useAuth } from '../context/AuthContext';

export const UsageBar: React.FC = () => {
  const { user } = useAuth();
  if (!user) return null;

  if (user.plan === 'free') {
    const percentage = (user.trialUses / 4) * 100;
    return (
      <div className="bg-brand-primary/10 border border-brand-primary/20 p-4 rounded-2xl mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] font-black text-brand-primary uppercase tracking-widest">Teste Gratuito</span>
          <span className="text-[10px] font-black text-white">{user.trialUses} / 4 Restantes</span>
        </div>
        <div className="h-1.5 w-full bg-base-300 rounded-full overflow-hidden">
          <div className="h-full bg-brand-primary transition-all duration-700" style={{ width: `${percentage}%` }}></div>
        </div>
      </div>
    );
  }

  if (user.plan === 'premium') {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl mb-4 text-center">
        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Plano Unlimited Ativo</span>
      </div>
    );
  }

  const limit = user.plan === 'basic' ? 15 : 50;
  const percentage = Math.min(100, (user.dailyUses / limit) * 100);

  return (
    <div className="bg-base-300/40 p-4 rounded-2xl mb-4 border border-white/5">
      <div className="flex justify-between items-center mb-2">
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Uso Diário ({user.plan})</span>
        <span className="text-[10px] font-black text-white">{user.dailyUses} / {limit}</span>
      </div>
      <div className="h-1.5 w-full bg-base-100 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-700 ${percentage > 90 ? 'bg-red-500' : 'bg-brand-primary'}`} 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};
