
import React, { useState, useCallback, useEffect, useRef } from 'react';
/* Adhere to Gemini API guidelines: Import GoogleGenAI from @google/genai */
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';
import { fileToBase64, downloadBase64Image, resizeImage, flattenImageOnBackground } from './utils/fileUtils';
import type { GeneratedImage, Category, ImageLocation, PrintSize, ImagesState, MockupGenerationOptions } from './types';
import { MockupCard } from './components/MockupCard';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthScreens } from './components/AuthScreens';
import { UsageBar } from './components/UsageBar';
import { PlanSelector } from './components/PlanSelector';
import { MyAccount } from './components/MyAccount';
import { supabase } from './supabase';

interface ImageUploaderProps {
  label: string;
  imageState: ImagesState[ImageLocation];
  onImageChange: (file: File) => void;
  onSizeChange: (size: PrintSize) => void;
  onMarkEmpty: (isEmpty: boolean) => void;
  onRemove: () => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ label, imageState, onImageChange, onSizeChange, onMarkEmpty, onRemove }) => {
  const uniqueId = `file-upload-${label.toLowerCase().replace(' ', '-')}`;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (file && allowedTypes.includes(file.type)) {
      onImageChange(file);
    }
  };
  
  return (
    <fieldset className={`p-3 border rounded-xl space-y-3 transition-all duration-300 group bg-base-100/30 ${imageState?.isMarkedEmpty ? 'border-red-500/50 bg-red-500/5' : 'border-base-300 hover:border-brand-primary/50'}`}>
      <legend className="px-2 text-[10px] font-black uppercase text-gray-500 tracking-widest group-hover:text-brand-primary transition-colors flex items-center gap-2">
        {label}
        {imageState?.isMarkedEmpty && <span className="text-red-500 text-[8px] animate-pulse">● VAZIO REFORÇADO</span>}
      </legend>
      
      <div className="flex justify-center px-4 pt-4 pb-4 border-2 border-base-300 border-dashed rounded-xl transition-all duration-300 hover:border-brand-primary hover:bg-brand-primary/5 relative">
        {imageState?.base64 && (
          <button 
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors z-10 shadow-lg"
            title="Remover imagem"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        )}
        <div className="space-y-1 text-center">
           {imageState?.base64 ? (
            <div className="relative group/preview inline-block">
                <img src={imageState.base64} alt="Preview" className="mx-auto h-20 w-20 object-contain rounded-lg shadow-sm transition-transform duration-300 group-hover/preview:scale-110" />
            </div>
          ) : (
             <svg className={`mx-auto h-10 w-10 transition-colors duration-300 ${imageState?.isMarkedEmpty ? 'text-red-500/30' : 'text-gray-400 group-hover:text-brand-primary'}`} stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 4v.01M28 8L36 16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          )}
          <div className="flex text-sm text-gray-400 justify-center mt-2 gap-2">
            <label htmlFor={uniqueId} className="relative cursor-pointer bg-base-300 rounded-lg font-black text-[10px] uppercase tracking-widest text-brand-primary hover:text-brand-secondary focus-within:outline-none transition-all duration-200 px-3 py-1.5 shadow-sm border border-base-300">
              <span>{imageState?.base64 ? 'Trocar' : 'Carregar'}</span>
              <input id={uniqueId} name={uniqueId} type="file" className="sr-only" accept="image/png, image/jpeg, image/jpg" onChange={handleFileChange} />
            </label>
            {!imageState?.base64 && (
              <button 
                type="button" 
                onClick={() => onMarkEmpty(!imageState?.isMarkedEmpty)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${imageState?.isMarkedEmpty ? 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/20' : 'bg-base-300 text-gray-500 border-base-300 hover:bg-base-200'}`}
              >
                {imageState?.isMarkedEmpty ? 'Desmarcar' : 'Desenho Maior'}
              </button>
            )}
          </div>
        </div>
      </div>
      
      {imageState?.base64 && (
        <div className="animate-fadeIn pt-2">
          <label className="text-[10px] font-black uppercase text-gray-500 tracking-tighter mb-2 block">Tamanho da Estampa</label>
          <div className="flex gap-2">
            <button type="button" onClick={() => onSizeChange('localized')} className={`text-[10px] font-black uppercase tracking-widest px-2 py-2 rounded-lg transition-all duration-200 w-full ${imageState.size === 'localized' ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' : 'bg-base-300 text-gray-500 hover:bg-base-300/80'}`}>
              Localizado
            </button>
            <button type="button" onClick={() => onSizeChange('filled')} className={`text-[10px] font-black uppercase tracking-widest px-2 py-2 rounded-lg transition-all duration-200 w-full ${imageState.size === 'filled' ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' : 'bg-base-300 text-gray-500 hover:bg-base-300/80'}`}>
              Preenchido
            </button>
          </div>
        </div>
      )}
    </fieldset>
  );
};

// --- MAIN APP COMPONENT ---

const CATEGORIES: { id: Category; name: string; description?: string }[] = [
  { id: 'camiseta-masculina', name: 'Masculina' },
  { id: 'camiseta-feminina', name: 'Feminina' },
  { id: 'camiseta-infantil-masculina', name: 'Infantil masculino', description: 'Modelagem para meninos' },
  { id: 'camiseta-infantil-feminina', name: 'Infantil feminino', description: 'Modelagem para meninas' },
];

const COLORS = [
  { name: 'Branco', value: 'white', hex: '#FFFFFF' }, 
  { name: 'Preto', value: 'black', hex: '#000000' }, 
  { name: 'Cinza Mescla', value: 'heather grey', hex: '#BDBDBD' }, 
  { name: 'Grafite', value: 'charcoal', hex: '#4A4A4A' }, 
  { name: 'Azul Marinho', value: 'navy blue', hex: '#1E3A8A' }, 
  { name: 'Azul Royal', value: 'royal blue', hex: '#2563EB' }, 
  { name: 'Azul Céu', value: 'sky blue', hex: '#60A5FA' }, 
  { name: 'Vermelho', value: 'red', hex: '#DC2626' }, 
  { name: 'Vinho', value: 'maroon', hex: '#881337' }, 
  { name: 'Laranja', value: 'orange', hex: '#F97316' }, 
  { name: 'Amarelo', value: 'yellow', hex: '#FACC15' }, 
  { name: 'Verde', value: 'forest green', hex: '#166534' }, 
  { name: 'Roxo', value: 'purple', hex: '#7E22CE' }, 
  { name: 'Rosa', value: 'pink', hex: '#EC4899' },
  { name: 'Todas as Cores', value: 'all colors', hex: 'gradient' },
];

const categoryMapping = {
  'camiseta-masculina': { model: 'male model', product: 'men\'s t-shirt' },
  'camiseta-feminina': { model: 'female model', product: 'women\'s t-shirt' },
  'camiseta-infantil-masculina': { model: 'boy model', product: 'boy\'s t-shirt' },
  'camiseta-infantil-feminina': { model: 'girl model', product: 'girl\'s t-shirt' },
};

const Header: React.FC<{ onAccount: () => void }> = ({ onAccount }) => {
  const { user, logout } = useAuth();
  
  const getStatusColor = () => {
    if (!user) return 'bg-gray-500';
    if (user.plan === 'premium') return 'bg-emerald-500';
    if (user.plan === 'intermediate') return 'bg-brand-primary';
    if (user.plan === 'basic') return 'bg-blue-500';
    return 'bg-amber-500'; // free
  };

  const getPlanLabel = () => {
    if (!user) return '';
    if (user.plan === 'free') return 'Free';
    if (user.plan === 'basic') return 'Basic';
    if (user.plan === 'intermediate') return 'Intermediária';
    if (user.plan === 'premium') return 'Premium';
    return user.plan;
  };

  return (
    <header className="w-full bg-base-200/50 backdrop-blur-md p-4 border-b border-base-300 sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center cursor-pointer group" onClick={() => window.location.href = '/'}>
          <div className="bg-brand-primary/10 p-2 rounded-xl mr-3 group-hover:scale-110 transition-transform shadow-lg shadow-brand-primary/5">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand-primary drop-shadow-sm"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tighter uppercase italic">MOCKUPS.AI</h1>
        </div>
        
        {user && (
          <div className="flex items-center gap-3">
            <button 
              onClick={onAccount}
              className="group relative px-4 py-2 bg-base-300 rounded-xl text-xs font-black uppercase tracking-widest text-white hover:bg-base-300/80 transition-all border border-base-300 flex items-center gap-2"
            >
              <span className={`w-2 h-2 rounded-full ${getStatusColor()} animate-pulse shadow-[0_0_8px_rgba(0,0,0,0.5)]`}></span>
              Conta
              <span className="hidden md:inline-block opacity-40 text-[9px] ml-1">({getPlanLabel()})</span>
            </button>
            <button 
              onClick={logout}
              className="p-2 md:px-4 md:py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all border border-red-500/20"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1-2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

const PremiumWelcome: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-6"
    >
      <motion.div 
        initial={{ scale: 0.8, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-base-200 border border-brand-primary/30 rounded-[40px] p-12 max-w-lg w-full text-center shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-primary to-brand-secondary"></div>
        
        <div className="mb-6 inline-flex p-4 bg-brand-primary/10 rounded-full text-brand-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
        </div>
        
        <h2 className="text-3xl font-black text-white mb-4 tracking-tighter uppercase italic">
          Cliente Assinante Premium
        </h2>
        <p className="text-gray-400 text-lg mb-8 font-medium">
          Seja bem-vindo! Aproveite todas as funcionalidades exclusivas do seu plano.
        </p>
        
        <button 
          onClick={onClose}
          className="w-full bg-brand-primary text-white font-black py-4 rounded-2xl hover:bg-brand-secondary transition-all shadow-xl shadow-brand-primary/20 uppercase tracking-widest text-xs"
        >
          Começar a Criar
        </button>
      </motion.div>
    </motion.div>
  );
};

const MainApp: React.FC = () => {
  const { user, incrementUsage, addToHistory } = useAuth();
  const [images, setImages] = useState<ImagesState>({});
  const [category, setCategory] = useState<Category>('camiseta-masculina');
  const [color, setColor] = useState<string>('white');
  const [prompt, setPrompt] = useState<string>('');
  const [collarDistance, setCollarDistance] = useState<number>(10);
  /* Fulfill requirement: Default to 2 mockups (realistic and product only) */
  const NUM_MOCKUPS = 2;
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFinishing, setIsFinishing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [view, setView] = useState<'generator' | 'account' | 'plans'>('generator');
  const [showWelcome, setShowWelcome] = useState(false);
  
  const finishTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user && user.plan !== 'free') {
      const hasShownWelcome = sessionStorage.getItem(`welcome_shown_${user.uid}`);
      if (!hasShownWelcome) {
        setShowWelcome(true);
        sessionStorage.setItem(`welcome_shown_${user.uid}`, 'true');
      }
    }
  }, [user]);

  const checkUsageLimit = (): boolean => {
    if (!user) return false;
    if (user.plan === 'free') {
      if (user.trialUses < NUM_MOCKUPS) {
        setError(`Apenas ${user.trialUses} avaliações grátis restantes. Você tentou gerar ${NUM_MOCKUPS}.`);
        setView('plans');
        return false;
      }
      return true;
    }
    const limits = { basic: { daily: 15, monthly: 450 }, intermediate: { daily: 50, monthly: 1500 }, premium: { daily: 99999, monthly: 999999 } };
    const pLimit = limits[user.plan as keyof typeof limits];

    if (pLimit && (user.dailyUses + NUM_MOCKUPS) > pLimit.daily) {
      setError(`Limite diário insuficiente. Você tentou gerar ${NUM_MOCKUPS}, mas só tem ${(pLimit.daily - user.dailyUses)} usos diários restantes.`);
      setView('plans');
      return false;
    }
    if (pLimit && ((user.monthlyUses || 0) + NUM_MOCKUPS) > pLimit.monthly) {
        setError(`Limite mensal insuficiente. Você tem ${(pLimit.monthly - (user.monthlyUses || 0))} usos mensais restantes.`);
        setView('plans');
        return false;
    }
    return true;
  };

  const handleImageChange = async (location: ImageLocation, file: File) => {
    try {
      const base64 = await fileToBase64(file) as string;
      const resized = await resizeImage(base64, 1024, 1024);
      setImages(prev => ({
        ...prev,
        [location]: { file, base64: resized, size: prev[location]?.size || 'localized', isMarkedEmpty: false }
      }));
      setError(null);
    } catch (err) {
      setError('Falha ao carregar a imagem.');
    }
  };

  const handleSizeChange = (location: ImageLocation, size: PrintSize) => {
    setImages(prev => ({
      ...prev,
      [location]: prev[location] ? { ...prev[location]!, size } : undefined
    }));
  };

  const handleMarkEmpty = (location: ImageLocation, isEmpty: boolean) => {
    setImages(prev => ({
      ...prev,
      [location]: { 
        file: null, 
        base64: null, 
        size: 'localized', 
        isMarkedEmpty: isEmpty 
      }
    }));
  };

  const handleRemoveImage = (location: ImageLocation) => {
    setImages(prev => {
      const newState = { ...prev };
      delete newState[location];
      return newState;
    });
  };

  /* Secure server-side call wrapper */
  const callGemini = async (options: { images: string[], prompt: string }): Promise<string> => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error("Falha ao obter token de autenticação.");

    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(options)
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Erro de servidor: ${res.status}`);
    }

    const data = await res.json();
    return data.result;
  };

  const stopLoading = useCallback(() => {
    if (finishTimeoutRef.current) {
        clearTimeout(finishTimeoutRef.current);
        finishTimeoutRef.current = null;
    }
    setIsLoading(false);
    setIsFinishing(false);
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!checkUsageLimit()) return;

    const activeLocs = (Object.keys(images) as ImageLocation[]).filter(loc => images[loc]?.base64);
    const emptyLocs = (Object.keys(images) as ImageLocation[]).filter(loc => images[loc]?.isMarkedEmpty);

    if (activeLocs.length === 0 && emptyLocs.length === 0) {
      setError('Envie pelo menos uma estampa ou marque áreas como vazias.');
      return;
    }

    setIsLoading(true);
    setIsFinishing(false);
    setGeneratedImages([]);

    const details = categoryMapping[category];
    const orderedBase64 = activeLocs.map(loc => images[loc]!.base64!);
    
    // Find the hex color for the selected mockup color
    const selectedColorObj = COLORS.find(c => c.value === color);
    const targetBgHex = selectedColorObj 
      ? (selectedColorObj.hex !== 'gradient' ? selectedColorObj.hex : null)
      : (color.startsWith('#') ? color : null);

    // Apply background flattening and collar distance shift to prevent halos and adjust neckline height
    const processedImages = await Promise.all(activeLocs.map(loc => 
      flattenImageOnBackground(images[loc]!.base64!, targetBgHex, collarDistance)
    ));
    
    const colorDesc = color === 'all colors' 
      ? 'a complementary color' 
      : (color.startsWith('#') ? `custom hex color ${color}` : color);
    
    const labels: Record<string, string> = { front: 'chest/front', back: 'back', leftSleeve: 'left sleeve', rightSleeve: 'right sleeve' };

    const itemsDesc = activeLocs.map(loc => {
        return `${labels[loc]} (${images[loc]!.size === 'filled' ? 'large scale' : 'small scale'})`;
    }).join(', ');

    const mandatoryEmptyDesc = emptyLocs.map(loc => {
        return `The ${labels[loc]} of the shirt MUST be COMPLETELY PLAIN and solid ${colorDesc}, with absolutely NO designs, text, or patterns.`;
    }).join(' ');

    const finalEmptyInstruction = emptyLocs.length > 0 ? `IMPORTANT: ${mandatoryEmptyDesc}` : '';

    /* Mixed variations of human models and product-only shots for realism and variety */
    const selectedVariations = [
      { type: 'human', suffix: 'Frontal shot with high-end studio lighting.' },
      { type: 'product', suffix: 'High-quality product only shot, clean flat lay.' }
    ];

    try {
      const promises = selectedVariations.map(async (v, idx) => {
        const finalPrompt = `${v.type === 'human' ? details.model : 'High-quality product only shot of a'} wearing ${details.product} in ${colorDesc}. ${activeLocs.length > 0 ? `Art correctly applied on ${itemsDesc}.` : ''} ${finalEmptyInstruction} ${prompt}. ${v.suffix} Photorealistic high resolution.`;
        const base64 = await callGemini({ images: processedImages, prompt: finalPrompt });
        return { id: `${Date.now()}-${idx}`, src: base64, prompt: finalPrompt };
      });

      const results = await Promise.all(promises);
      
      setIsFinishing(true);
      setGeneratedImages(results);

      finishTimeoutRef.current = setTimeout(() => {
        stopLoading();
      }, 2000);

    } catch (err: any) {
      setError(err.message || 'Erro na geração.');
      stopLoading();
    }
  };

  const handleRedoSingle = async (imageToRedo: GeneratedImage) => {
    setError(null);
    setIsLoading(true);
    setIsFinishing(false);

    const activeLocs = (Object.keys(images) as ImageLocation[]).filter(loc => images[loc]?.base64);
    const orderedBase64 = activeLocs.map(loc => images[loc]!.base64!);

    // Find the hex color for the selected mockup color
    const selectedColorObj = COLORS.find(c => c.value === color);
    const targetBgHex = selectedColorObj 
      ? (selectedColorObj.hex !== 'gradient' ? selectedColorObj.hex : null)
      : (color.startsWith('#') ? color : null);

    // Apply background flattening and collar distance shift to prevent halos and adjust neckline height
    const processedImages = await Promise.all(activeLocs.map(loc => 
      flattenImageOnBackground(images[loc]!.base64!, targetBgHex, collarDistance)
    ));

    try {
      const base64 = await callGemini({ images: processedImages, prompt: imageToRedo.prompt });
      
      setGeneratedImages(prev => prev.map(img => 
        img.id === imageToRedo.id ? { ...img, src: base64 } : img
      ));
      
      setIsFinishing(true);
      finishTimeoutRef.current = setTimeout(() => {
        stopLoading();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Erro ao refazer.');
      stopLoading();
    }
  };

  const handleImageLoad = () => {
    stopLoading();
  };

  const handleDownload = async (img: GeneratedImage) => {
    downloadBase64Image(img.src, `mockup-${img.id}.png`);
    await addToHistory({
      id: img.id,
      src: img.src,
      prompt: img.prompt
    });
  };

  if (view === 'account') return <div className="min-h-screen bg-base-100 flex flex-col"><Header onAccount={() => setView('account')} /><MyAccount onBack={() => setView('generator')} onUpgrade={() => setView('plans')} /></div>;
  if (view === 'plans') return <div className="min-h-screen bg-base-100 flex flex-col"><Header onAccount={() => setView('account')} /><div className="p-8"><button onClick={() => setView('generator')} className="text-brand-primary text-[10px] font-black uppercase flex items-center gap-2 mb-8"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 12H5m7-7l-7 7 7 7" strokeWidth="3"/></svg> Voltar</button><PlanSelector /></div></div>;

  return (
    <div className="min-h-screen bg-base-100 text-content flex flex-col font-sans overflow-x-hidden">
      <AnimatePresence>
        {showWelcome && <PremiumWelcome onClose={() => setShowWelcome(false)} />}
      </AnimatePresence>
      <Header onAccount={() => setView('account')} />
      
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fadeIn">
            <div className="lg:col-span-4 xl:col-span-3">
                <div className="bg-base-200/80 backdrop-blur-xl rounded-3xl p-6 space-y-6 sticky top-24 shadow-2xl border border-white/5">
                    <UsageBar />
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="animate-slideIn">
                            <label className="block text-[10px] font-black uppercase text-gray-500 tracking-widest mb-4">1. Configuração de Áreas</label>
                            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                <ImageUploader label="Frente" imageState={images.front} onImageChange={(file) => handleImageChange('front', file)} onSizeChange={(size) => handleSizeChange('front', size)} onMarkEmpty={(empty) => handleMarkEmpty('front', empty)} onRemove={() => handleRemoveImage('front')} />
                                <ImageUploader label="Costas" imageState={images.back} onImageChange={(file) => handleImageChange('back', file)} onSizeChange={(size) => handleSizeChange('back', size)} onMarkEmpty={(empty) => handleMarkEmpty('back', empty)} onRemove={() => handleRemoveImage('back')} />
                            </div>
                        </div>
                        <div className="animate-slideIn delay-150">
                            <label className="block text-[10px] font-black uppercase text-gray-500 tracking-widest mb-4">2. Modelo</label>
                            <div className="grid grid-cols-2 gap-2">
                                {CATEGORIES.map(cat => (
                                    <button 
                                        type="button" 
                                        key={cat.id} 
                                        onClick={() => setCategory(cat.id)} 
                                        className={`px-3 py-3 rounded-xl transition-all flex flex-col items-center justify-center text-center ${category === cat.id ? 'bg-brand-primary text-white shadow-lg' : 'bg-base-300 text-gray-500'}`}
                                    >
                                        <span className="text-[10px] font-black uppercase">{cat.name}</span>
                                        {cat.description && (
                                            <span className={`text-[8px] mt-1 font-medium leading-tight ${category === cat.id ? 'text-white/80' : 'text-gray-400'}`}>
                                                {cat.description}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="animate-slideIn delay-200">
                            <label className="block text-[10px] font-black uppercase text-gray-500 tracking-widest mb-4">3. Cor</label>
                            <div className="flex flex-wrap gap-2.5">
                                {COLORS.map(c => {
                                    if (c.hex === 'gradient') {
                                        return (
                                            <div key={c.value} className="relative inline-block">
                                                <button 
                                                    type="button" 
                                                    onClick={() => colorInputRef.current?.click()} 
                                                    className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center relative overflow-hidden group/custom ${color.startsWith('#') ? 'border-brand-primary scale-110 shadow-lg' : 'border-base-300'}`} 
                                                    style={{ background: color.startsWith('#') ? color : 'linear-gradient(to right, #ef4444, #fbbf24, #3b82f6)' }}
                                                    title="Escolher cor personalizada"
                                                >
                                                    {!color.startsWith('#') && (
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-md group-hover/custom:scale-125 transition-transform"><path d="M12 5v14M5 12h14"/></svg>
                                                    )}
                                                </button>
                                                <input 
                                                    ref={colorInputRef} 
                                                    type="color" 
                                                    value={color.startsWith('#') ? color : '#4f46e5'} 
                                                    onChange={e => setColor(e.target.value)} 
                                                    className="sr-only" 
                                                />
                                            </div>
                                        );
                                    }
                                    return (
                                        <button type="button" key={c.value} onClick={() => setColor(c.value)} className={`w-8 h-8 rounded-full border-2 transition-all ${color === c.value ? 'border-brand-primary scale-110 shadow-lg' : 'border-base-300'}`} style={{ background: c.hex }}></button>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="animate-slideIn delay-300">
                            <label htmlFor="prompt" className="block text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4">4. Estilo</label>
                            <textarea id="prompt" value={prompt} onChange={e => setPrompt(e.target.value)} rows={2} className="w-full bg-base-300 border border-base-300 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-brand-primary outline-none" placeholder="Ex: iluminação solar..."></textarea>
                        </div>
                        <div className="animate-slideIn delay-300">
                            <label htmlFor="collarDistance" className="block text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 flex justify-between">
                                <span>5. Posição da Estampa</span>
                                <span className="text-brand-primary font-black">{collarDistance}%</span>
                            </label>
                            <input 
                                id="collarDistance"
                                type="range" 
                                min="0" 
                                max="35" 
                                value={collarDistance} 
                                onChange={e => setCollarDistance(parseInt(e.target.value))}
                                className="w-full h-1.5 bg-base-300 rounded-lg appearance-none cursor-pointer accent-brand-primary" 
                            />
                            <div className="flex justify-between text-[8px] font-bold text-gray-500 mt-1 uppercase tracking-tighter">
                                <span>Mais Alto (0%)</span>
                                <span>Padrão (10%)</span>
                                <span>Mais Baixo (35%)</span>
                            </div>
                        </div>
                        {error && <p className="text-red-400 text-[11px] font-bold p-2 bg-red-400/10 rounded-lg border border-red-400/20 animate-shake">{error}</p>}
                        <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-brand-primary to-brand-secondary text-white font-black py-5 rounded-2xl hover:brightness-110 transition-all shadow-xl shadow-brand-primary/20 uppercase tracking-[0.2em] text-[11px]">
                            {isLoading ? 'Gerando...' : `Criar ${NUM_MOCKUPS} Mockups`}
                        </button>
                    </form>
                </div>
            </div>
            <div className="lg:col-span-8 xl:col-span-9 flex flex-col">
                <div className="flex-grow bg-base-200/30 rounded-[40px] border-2 border-dashed border-white/5 relative flex items-center justify-center overflow-hidden min-h-[60vh]">
                    
                    {isLoading && (
                        <div className={`absolute inset-0 flex flex-col items-center justify-center z-20 bg-base-200/60 backdrop-blur-sm transition-opacity duration-500 ${isFinishing ? 'opacity-0' : 'opacity-100'}`}>
                            <div className="w-16 h-16 border-4 border-white/10 border-t-brand-primary rounded-full animate-spin mb-4"></div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-white animate-pulse">Finalizando seus Mockups...</p>
                        </div>
                    )}

                    {generatedImages.length > 0 ? (
                        <div className={`w-full h-full p-4 md:p-8 animate-fadeIn transition-all duration-700 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto max-h-[85vh] ${isLoading ? 'scale-95 blur-md' : 'scale-100 blur-0'}`}>
                            {generatedImages.map((img) => (
                                <MockupCard 
                                    key={img.id}
                                    image={img} 
                                    onDownload={() => handleDownload(img)} 
                                    onRedo={() => handleRedoSingle(img)}
                                    onImageLoad={handleImageLoad}
                                />
                            ))}
                        </div>
                    ) : !isLoading && (
                        <div className="text-center opacity-40">
                            <h3 className="text-2xl font-black uppercase tracking-[0.3em] text-white">Sua Vitrine</h3>
                            <p className="text-gray-500 text-sm mt-2">Configure as artes e clique em Criar.</p>
                        </div>
                    )}
                </div>

                {/* Recent History Section */}
                {user && user.downloadHistory && user.downloadHistory.length > 0 && (
                    <div className="mt-8 animate-fadeIn">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[10px] font-black uppercase text-gray-500 tracking-[0.2em]">Downloads Recentes</h3>
                            <button onClick={() => setView('account')} className="text-brand-primary text-[10px] font-black uppercase hover:underline">Ver Todos</button>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                            {user.downloadHistory.slice(0, user.plan === 'free' ? 4 : 8).map((item) => (
                                <div key={item.id} className="group relative bg-base-200 rounded-xl overflow-hidden aspect-square border border-white/5 hover:border-brand-primary/50 transition-all shadow-lg">
                                    <img src={item.src} alt="History" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                         <button 
                                            onClick={() => downloadBase64Image(item.src, `mockup-history-${item.id}.png`)}
                                            className="bg-brand-primary text-white p-1.5 rounded-full hover:scale-110 transition-transform"
                                         >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                         </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
      </main>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(79, 70, 229, 0.4); }
      `}</style>
    </div>
  );
};

const ProtectedContent: React.FC = () => {
  const { user, loading, logout } = useAuth();
  const [showTimeoutMessage, setShowTimeoutMessage] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (loading) {
      timer = setTimeout(() => {
        setShowTimeoutMessage(true);
      }, 8000); // Show message after 8 seconds
    } else {
      setShowTimeoutMessage(false);
    }
    return () => clearTimeout(timer);
  }, [loading]);

  if (loading) return (
    <div className="min-h-screen bg-base-100 flex flex-col items-center justify-center p-6 text-center">
      <div className="relative w-24 h-24 mb-8">
        <div className="absolute inset-0 border-4 border-brand-primary/20 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-t-brand-primary rounded-full animate-spin"></div>
        <div className="absolute inset-4 bg-brand-primary/10 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-brand-primary animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
      </div>
      <h2 className="text-xl font-black text-white uppercase tracking-[0.3em] mb-2 italic">MOCKUPS.AI</h2>
      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest animate-pulse">Sincronizando sua conta...</p>
      
      {showTimeoutMessage && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 space-y-4"
        >
          <p className="text-xs text-red-400/80 max-w-xs mx-auto">
            Isso está demorando mais que o esperado. Pode haver um problema de conexão ou permissão.
          </p>
          <button 
            onClick={() => logout()}
            className="px-6 py-2 bg-base-300 hover:bg-base-200 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-white/5"
          >
            Sair e Tentar Novamente
          </button>
        </motion.div>
      )}
    </div>
  );
  if (!user) return <AuthScreens />;
  return <MainApp />;
};

const App: React.FC = () => (
  <AuthProvider>
    <ProtectedContent />
  </AuthProvider>
);

export default App;
