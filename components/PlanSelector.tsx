
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { PlanType, BillingCycle } from '../types';

export const PlanSelector: React.FC = () => {
  const { user } = useAuth();
  const [basicCycle, setBasicCycle] = useState<BillingCycle>('monthly');
  const [loading, setLoading] = useState<string | null>(null);

  const handleSelect = async (plan: PlanType, cycle: BillingCycle) => {
    if (!user) {
      alert('Por favor, faça login para assinar um plano.');
      return;
    }

    setLoading(plan);

    // Definir preços manuais baseados no plano e ciclo
    let price = 0;
    if (plan === 'basic') price = cycle === 'monthly' ? 32 : 199;
    else if (plan === 'intermediate') price = 299;
    else if (plan === 'premium') price = 499;

    try {
      const res = await fetch('/api/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          billingCycle: cycle,
          userId: user.uid,
          price: price
        })
      });

      if (!res.ok) throw new Error('Falha ao criar preferência de pagamento');

      const data = await res.json();
      if (data.init_point) {
        window.location.href = data.init_point;
      }
    } catch (err: any) {
      console.error('Erro ao iniciar pagamento:', err);
      alert('Erro ao iniciar o pagamento com Mercado Pago. Tente novamente.');
      setLoading(null);
    }
  };

  return (
    <div className="py-12 animate-fadeIn max-w-6xl mx-auto px-4">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-black text-white mb-2 tracking-tighter">Escolha seu Plano</h2>
        <p className="text-gray-400">Desbloqueie o poder total da IA</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Básico */}
        <div className="bg-base-200 border border-white/5 rounded-[32px] p-8 flex flex-col hover:border-brand-primary/30 transition-all">
          <h3 className="text-xl font-black text-white mb-4">Plano Básico</h3>
          <div className="flex bg-base-300 p-1 rounded-xl mb-6">
            <button 
              onClick={() => setBasicCycle('monthly')}
              className={`flex-1 py-2 text-[10px] font-bold rounded-lg ${basicCycle === 'monthly' ? 'bg-brand-primary text-white' : 'text-gray-500'}`}
            >
              MENSAL
            </button>
            <button 
              onClick={() => setBasicCycle('annual')}
              className={`flex-1 py-2 text-[10px] font-bold rounded-lg ${basicCycle === 'annual' ? 'bg-brand-primary text-white' : 'text-gray-500'}`}
            >
              ANUAL
            </button>
          </div>
          <div className="mb-8">
            <span className="text-5xl font-black text-white">R$ {basicCycle === 'monthly' ? '32' : '199'}</span>
            <span className="text-gray-500 text-sm italic">/{basicCycle === 'monthly' ? 'mês' : 'ano'}</span>
          </div>
          <ul className="space-y-4 mb-10 flex-grow text-sm text-gray-300">
            <li className="flex items-center"><svg className="w-4 h-4 mr-2 text-brand-primary" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg> 15 mockups por dia</li>
            <li className="flex items-center"><svg className="w-4 h-4 mr-2 text-brand-primary" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg> Resolução HD</li>
          </ul>
          <button 
            disabled={loading !== null}
            onClick={() => handleSelect('basic', basicCycle)} 
            className="w-full py-4 bg-brand-primary text-white font-black rounded-xl uppercase tracking-widest text-[10px] disabled:opacity-50"
          >
            {loading === 'basic' ? 'Processando...' : 'Assinar'}
          </button>
        </div>

        {/* Intermediário */}
        <div className="bg-base-200 border-2 border-brand-primary rounded-[32px] p-8 flex flex-col relative scale-105 shadow-2xl">
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-primary text-white text-[9px] font-black px-4 py-1 rounded-full uppercase">Melhor Custo Benefício</span>
          <h3 className="text-xl font-black text-white mb-2">Intermediário</h3>
          <p className="text-brand-primary text-[10px] font-black uppercase tracking-widest mb-4">Assinatura Anual</p>
          <div className="mb-8">
            <span className="text-5xl font-black text-white">R$ 299</span>
            <span className="text-gray-500 text-sm italic">/ano</span>
          </div>
          <ul className="space-y-4 mb-10 flex-grow text-sm text-gray-300">
            <li className="flex items-center"><svg className="w-4 h-4 mr-2 text-brand-primary" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg> 50 mockups por dia</li>
            <li className="flex items-center"><svg className="w-4 h-4 mr-2 text-brand-primary" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg> Prioridade na fila</li>
          </ul>
          <button 
            disabled={loading !== null}
            onClick={() => handleSelect('intermediate', 'annual')} 
            className="w-full py-4 bg-brand-primary text-white font-black rounded-xl uppercase tracking-widest text-[10px] disabled:opacity-50"
          >
            {loading === 'intermediate' ? 'Processando...' : 'Assinar Anual'}
          </button>
        </div>

        {/* Premium */}
        <div className="bg-base-200 border border-white/5 rounded-[32px] p-8 flex flex-col hover:border-brand-primary/30 transition-all">
          <h3 className="text-xl font-black text-white mb-2">Unlimited</h3>
          <p className="text-brand-primary text-[10px] font-black uppercase tracking-widest mb-4">Assinatura Anual</p>
          <div className="mb-8">
            <span className="text-5xl font-black text-white">R$ 499</span>
            <span className="text-gray-500 text-sm italic">/ano</span>
          </div>
          <ul className="space-y-4 mb-10 flex-grow text-sm text-gray-300">
            <li className="flex items-center"><svg className="w-4 h-4 mr-2 text-brand-primary" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg> Mockups Ilimitados</li>
            <li className="flex items-center"><svg className="w-4 h-4 mr-2 text-brand-primary" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg> Suporte 24/7</li>
          </ul>
          <button 
            disabled={loading !== null}
            onClick={() => handleSelect('premium', 'annual')} 
            className="w-full py-4 bg-white text-black font-black rounded-xl uppercase tracking-widest text-[10px] disabled:opacity-50"
          >
            {loading === 'premium' ? 'Processando...' : 'Seja Premium'}
          </button>
        </div>
      </div>
    </div>
  );
};
