
import React, { useState, useCallback, useEffect, useRef } from 'react';
/* Adhere to Gemini API guidelines: Import GoogleGenAI from @google/genai */
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';
import { fileToBase64, downloadBase64Image, resizeImage, flattenImageOnBackground } from './utils/fileUtils';
import type { GeneratedImage, Category, ImageLocation, PrintSize, ImagesState, MockupGenerationOptions } from './types';
import { MockupCard } from './components/MockupCard';
import { ThreeCanvas } from './components/ThreeCanvas';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthScreens } from './components/AuthScreens';
import { UsageBar } from './components/UsageBar';
import { PlanSelector } from './components/PlanSelector';
import { MyAccount } from './components/MyAccount';
import { supabase } from './supabase';

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
  const [designImage, setDesignImage] = useState<{ file: File | null, base64: string | null } | null>(null);
  const [printPosition, setPrintPosition] = useState<ImageLocation>('front');
  const [printSize, setPrintSize] = useState<number>(45);
  const [printOffsetX, setPrintOffsetX] = useState<number>(0); // -30 to 30 horizontal shift
  const [category, setCategory] = useState<Category>('camiseta-masculina');
  const [color, setColor] = useState<string>('white');
  const [prompt, setPrompt] = useState<string>('');
  const [collarDistance, setCollarDistance] = useState<number>(10);
  const [generateModel, setGenerateModel] = useState<boolean>(true); // checkbox Gerar Humano
  const [generateFlatLay, setGenerateFlatLay] = useState<boolean>(true); // checkbox Gerar Camiseta Plana
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFinishing, setIsFinishing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [view, setView] = useState<'generator' | 'account' | 'plans'>('generator');
  const [showWelcome, setShowWelcome] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const finishTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);

  const handleClearAll = () => {
    setDesignImage(null);
    setGeneratedImages([]);
    setPrintSize(45);
    setCollarDistance(10);
    setPrintOffsetX(0);
    setGenerateModel(true);
    setGenerateFlatLay(true);
    setColor('white');
    setPrintPosition('front');
    setPrompt('');
    setError(null);
  };

  const handleDownloadDraft = () => {
    const canvas = document.getElementById('three-customizer-canvas') as HTMLCanvasElement | null;
    if (canvas) {
      try {
        const dataUrl = canvas.toDataURL('image/png');
        downloadBase64Image(dataUrl, 'rascunho-mockup-3d.png');
      } catch (err) {
        console.error('Failed to capture canvas screenshot:', err);
        setError('Erro ao gerar captura do rascunho 3D. Tente novamente.');
      }
    } else {
      setError('WebGL Canvas não encontrado.');
    }
  };

  useEffect(() => {
    if (user && user.plan !== 'free') {
      const hasShownWelcome = sessionStorage.getItem(`welcome_shown_${user.uid}`);
      if (!hasShownWelcome) {
        setShowWelcome(true);
        sessionStorage.setItem(`welcome_shown_${user.uid}`, 'true');
      }
    }
  }, [user]);

  const checkUsageLimit = (numMockups: number): boolean => {
    if (!user) return false;
    if (user.plan === 'free') {
      if (user.trialUses < numMockups) {
        setError(`Apenas ${user.trialUses} avaliações grátis restantes. Você tentou gerar ${numMockups}.`);
        setView('plans');
        return false;
      }
      return true;
    }
    const limits = { basic: { daily: 15, monthly: 450 }, intermediate: { daily: 50, monthly: 1500 }, premium: { daily: 99999, monthly: 999999 } };
    const pLimit = limits[user.plan as keyof typeof limits];

    if (pLimit && (user.dailyUses + numMockups) > pLimit.daily) {
      setError(`Limite diário insuficiente. Você tentou gerar ${numMockups}, mas só tem ${(pLimit.daily - user.dailyUses)} usos diários restantes.`);
      setView('plans');
      return false;
    }
    if (pLimit && ((user.monthlyUses || 0) + numMockups) > pLimit.monthly) {
        setError(`Limite mensal insuficiente. Você tem ${(pLimit.monthly - (user.monthlyUses || 0))} usos mensais restantes.`);
        setView('plans');
        return false;
    }
    return true;
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (file && allowedTypes.includes(file.type)) {
      try {
        const base64 = await fileToBase64(file) as string;
        const resized = await resizeImage(base64, 1024, 1024);
        setDesignImage({ file, base64: resized });
        setError(null);
      } catch (err) {
        setError('Falha ao carregar a imagem.');
      }
    }
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
    const numMockups = (generateModel ? 1 : 0) + (generateFlatLay ? 1 : 0);
    if (!checkUsageLimit(numMockups)) return;

    if (!designImage?.base64) {
      setError('Envie uma estampa para começar.');
      return;
    }

    if (!generateModel && !generateFlatLay) {
      setError('Selecione pelo menos uma opção de mockup (Humano ou Flat-lay) para gerar.');
      return;
    }

    setIsLoading(true);
    setIsFinishing(false);
    setGeneratedImages([]);

    const details = categoryMapping[category];
    
    // Find the hex color for the selected mockup color
    const selectedColorObj = COLORS.find(c => c.value === color);
    const targetBgHex = selectedColorObj 
      ? (selectedColorObj.hex !== 'gradient' ? selectedColorObj.hex : null)
      : (color.startsWith('#') ? color : null);

    const isBack = printPosition === 'back';
    // Apply background flattening, collar distance shift, horizontal offset and print size percentage scaling
    const processedImage = await flattenImageOnBackground(designImage.base64, targetBgHex, collarDistance, printSize, isBack, printOffsetX);
    
    const colorDesc = color === 'all colors' 
      ? 'a complementary color' 
      : (color.startsWith('#') ? `custom hex color ${color}` : color);
    
    const activeLocDesc = printPosition === 'back' 
      ? 'back' 
      : (printPosition === 'leftSleeve' 
          ? 'left sleeve' 
          : (printPosition === 'rightSleeve' ? 'right sleeve' : 'chest/front'));
          
    const oppositeLocDesc = printPosition === 'back' ? 'chest/front' : 'back';
    const finalEmptyInstruction = `IMPORTANT: The ${oppositeLocDesc} of the shirt MUST be COMPLETELY PLAIN and solid ${colorDesc}, with absolutely NO designs, text, or patterns.`;

    let humanSuffix = 'Frontal shot with high-end studio lighting.';
    let productSuffix = 'High-quality product only shot, clean flat lay.';
    
    if (printPosition === 'back') {
      humanSuffix = 'Back view shot, showing the rear of the t-shirt, model from behind with high-end studio lighting.';
      productSuffix = 'High-quality product only shot showing the back of the t-shirt, rear flat lay view.';
    } else if (printPosition === 'leftSleeve') {
      humanSuffix = 'Side profile view showing a model wearing a t-shirt with the print applied on the left sleeve, high-end studio lighting.';
      productSuffix = 'Side profile product lay shot of the left side of the t-shirt, showing the left sleeve print.';
    } else if (printPosition === 'rightSleeve') {
      humanSuffix = 'Side profile view showing a model wearing a t-shirt with the print applied on the right sleeve, high-end studio lighting.';
      productSuffix = 'Side profile product lay shot of the right side of the t-shirt, showing the right sleeve print.';
    }

    const selectedVariations = [];
    if (generateModel) {
      selectedVariations.push({ type: 'human', suffix: humanSuffix });
    }
    if (generateFlatLay) {
      selectedVariations.push({ type: 'product', suffix: productSuffix });
    }

    try {
      const promises = selectedVariations.map(async (v, idx) => {
        const finalPrompt = `${v.type === 'human' ? details.model : 'High-quality product only shot of a'} wearing ${details.product} in ${colorDesc}. Art correctly applied on ${activeLocDesc}. ${finalEmptyInstruction} ${prompt}. ${v.suffix} Photorealistic high resolution.`;
        const base64 = await callGemini({ images: [processedImage], prompt: finalPrompt });
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
    if (!designImage?.base64) {
      setError('Nenhuma imagem carregada para refazer.');
      return;
    }
    setIsLoading(true);
    setIsFinishing(false);

    // Find the hex color for the selected mockup color
    const selectedColorObj = COLORS.find(c => c.value === color);
    const targetBgHex = selectedColorObj 
      ? (selectedColorObj.hex !== 'gradient' ? selectedColorObj.hex : null)
      : (color.startsWith('#') ? color : null);

    const isBack = printPosition === 'back';
    // Apply background flattening, collar distance shift, horizontal offset and print size percentage scaling
    const processedImage = await flattenImageOnBackground(designImage.base64, targetBgHex, collarDistance, printSize, isBack, printOffsetX);

    try {
      const base64 = await callGemini({ images: [processedImage], prompt: imageToRedo.prompt });
      
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

  const renderViewer = () => (
    <div className="flex-grow bg-base-200/30 rounded-[40px] border-2 border-dashed border-white/5 relative flex items-center justify-center overflow-hidden min-h-[60vh] w-full">
        
        {/* Floating Actions Panel */}
        {designImage?.base64 && !isLoading && (
          <div className="absolute top-4 left-4 flex gap-2.5 z-20 pointer-events-auto select-none animate-slideIn">
            <button 
              type="button"
              onClick={handleClearAll}
              className="bg-base-300/80 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-white/5 shadow-xl hover:bg-base-300 hover:border-red-500/30 text-gray-400 hover:text-red-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/></svg>
              Limpar Dados
            </button>
            {generatedImages.length === 0 && (
              <button 
                type="button"
                onClick={handleDownloadDraft}
                className="bg-base-300/80 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-white/5 shadow-xl hover:bg-base-300 hover:border-brand-primary/30 text-gray-400 hover:text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Baixar Rascunho
              </button>
            )}
          </div>
        )}

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
            designImage?.base64 ? (
                <div className="w-full h-full min-h-[60vh] flex items-center justify-center animate-fadeIn">
                    <ThreeCanvas 
                        designBase64={designImage.base64}
                        printSize={printSize}
                        collarDistance={collarDistance}
                        printPosition={printPosition}
                        printOffsetX={printOffsetX}
                        shirtColorHex={
                            (() => {
                                const selectedColorObj = COLORS.find(c => c.value === color);
                                return selectedColorObj
                                    ? (selectedColorObj.hex !== 'gradient' ? selectedColorObj.hex : '#ffffff')
                                    : (color.startsWith('#') ? color : '#ffffff');
                            })()
                        }
                    />
                </div>
            ) : (
                <div className="text-center p-8 animate-fadeIn max-w-md flex flex-col items-center justify-center">
                    <div className="mb-6 inline-flex p-5 bg-brand-primary/10 rounded-full text-brand-primary animate-pulse">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>
                    </div>
                    <h3 className="text-lg font-black uppercase tracking-[0.2em] text-white">MOCKUPS 3D STUDIO</h3>
                    <p className="text-gray-400 text-xs mt-2 leading-relaxed font-medium">
                        Carregue sua estampa e configure o tamanho na barra lateral para visualizar seu design em tempo real em um manequim 3D interativo!
                    </p>
                </div>
            )
        )}
    </div>
  );

  const renderDesktopForm = () => {
    const numMockups = (generateModel ? 1 : 0) + (generateFlatLay ? 1 : 0);
    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Enviar Estampa */}
        <div className="animate-slideIn space-y-4">
          <label className="block text-[10px] font-black uppercase text-gray-500 tracking-widest">
            1. Enviar Estampa
          </label>
          
          {/* Drag & Drop Box */}
          <div className={`p-4 border rounded-2xl transition-all duration-300 group bg-base-100/30 ${!designImage ? 'border-base-300 hover:border-brand-primary/50' : 'border-brand-primary/30'}`}>
            <div className="flex justify-center px-4 pt-4 pb-4 border-2 border-base-300 border-dashed rounded-xl transition-all duration-300 hover:border-brand-primary hover:bg-brand-primary/5 relative">
              {designImage?.base64 && (
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleClearAll(); }}
                  className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors z-10 shadow-lg shadow-red-500/20"
                  title="Remover imagem"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              )}
              <div className="space-y-1 text-center w-full">
                {designImage?.base64 ? (
                  <div className="relative group/preview inline-block">
                    <img src={designImage.base64} alt="Preview" className="mx-auto h-24 w-24 object-contain rounded-lg shadow-md transition-transform duration-300 group-hover/preview:scale-105" />
                  </div>
                ) : (
                  <svg className="mx-auto h-12 w-12 transition-colors duration-300 text-gray-400 group-hover:text-brand-primary drop-shadow-sm" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 4v.01M28 8L36 16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                )}
                <div className="flex text-sm text-gray-400 justify-center mt-3">
                  <label htmlFor="design-file-upload-desktop" className="relative cursor-pointer bg-base-300 hover:bg-base-300/80 rounded-lg font-black text-[10px] uppercase tracking-widest text-brand-primary hover:text-brand-secondary focus-within:outline-none transition-all duration-200 px-4 py-2 shadow-sm border border-base-300">
                    <span>{designImage?.base64 ? 'Trocar Desenho' : 'Carregar Desenho'}</span>
                    <input id="design-file-upload-desktop" name="design-file-upload-desktop" type="file" className="sr-only" accept="image/png, image/jpeg, image/jpg" onChange={handleFileChange} />
                  </label>
                </div>
                <p className="text-[9px] text-gray-500 mt-2 font-bold tracking-wider">PNG, JPG até 10MB</p>
              </div>
            </div>
          </div>

          {/* Ajustes Finos (Grupo de Sliders no Desktop) */}
          {designImage?.base64 && (
            <div className="space-y-4 p-4 bg-base-300/50 rounded-2xl border border-white/5 animate-fadeIn">
              <span className="block text-[10px] font-black uppercase text-gray-400 tracking-widest">Ajustes Finos da Estampa</span>
              
              {/* Tamanho da Estampa */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold uppercase text-gray-400 tracking-wider">Tamanho da Estampa</span>
                  <span className="text-brand-primary font-black text-xs">{printSize}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={printSize}
                  onChange={(e) => setPrintSize(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-base-300 rounded-lg appearance-none cursor-pointer accent-brand-primary"
                />
              </div>

              {/* Ajuste Vertical */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold uppercase text-gray-400 tracking-wider">Ajuste Vertical</span>
                  <span className="text-brand-primary font-black text-xs">{collarDistance}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="35"
                  value={collarDistance}
                  onChange={(e) => setCollarDistance(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-base-300 rounded-lg appearance-none cursor-pointer accent-brand-primary"
                />
              </div>

              {/* Ajuste Horizontal */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold uppercase text-gray-400 tracking-wider">Ajuste Horizontal</span>
                  <span className="text-brand-primary font-black text-xs">{printOffsetX > 0 ? `+${printOffsetX}` : printOffsetX}%</span>
                </div>
                <input
                  type="range"
                  min="-30"
                  max="30"
                  value={printOffsetX}
                  onChange={(e) => setPrintOffsetX(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-base-300 rounded-lg appearance-none cursor-pointer accent-brand-primary"
                />
              </div>
            </div>
          )}
        </div>

        {/* 2. Local de Aplicação */}
        <div className="animate-slideIn space-y-2">
          <label className="block text-[10px] font-black uppercase text-gray-500 tracking-widest">2. Local de Aplicação</label>
          <div className="grid grid-cols-2 gap-1.5 bg-base-300 p-1.5 rounded-xl border border-white/5">
            <button
              type="button"
              onClick={() => setPrintPosition('front')}
              className={`py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${printPosition === 'front' ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20 scale-100' : 'text-gray-400 hover:text-white bg-transparent hover:bg-base-100/10'}`}
            >
              Frente
            </button>
            <button
              type="button"
              onClick={() => setPrintPosition('back')}
              className={`py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${printPosition === 'back' ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20 scale-100' : 'text-gray-400 hover:text-white bg-transparent hover:bg-base-100/10'}`}
            >
              Costas
            </button>
            <button
              type="button"
              onClick={() => setPrintPosition('leftSleeve')}
              className={`py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${printPosition === 'leftSleeve' ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20 scale-100' : 'text-gray-400 hover:text-white bg-transparent hover:bg-base-100/10'}`}
            >
              Manga Esq.
            </button>
            <button
              type="button"
              onClick={() => setPrintPosition('rightSleeve')}
              className={`py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${printPosition === 'rightSleeve' ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20 scale-100' : 'text-gray-400 hover:text-white bg-transparent hover:bg-base-100/10'}`}
            >
              Manga Dir.
            </button>
          </div>
        </div>

        {/* 3. Modelo */}
        <div className="animate-slideIn delay-150">
          <label className="block text-[10px] font-black uppercase text-gray-500 tracking-widest mb-4">3. Modelo</label>
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

        {/* 4. Cor */}
        <div className="animate-slideIn delay-200">
          <label className="block text-[10px] font-black uppercase text-gray-500 tracking-widest mb-4">4. Cor</label>
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

        {/* 5. Estilo */}
        <div className="animate-slideIn delay-300">
          <label htmlFor="promptDesktop" className="block text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4">5. Estilo</label>
          <textarea id="promptDesktop" value={prompt} onChange={e => setPrompt(e.target.value)} rows={2} className="w-full bg-base-300 border border-base-300 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-brand-primary outline-none" placeholder="Ex: iluminação solar..."></textarea>
        </div>

        {/* 6. Opções de Geração */}
        <div className="space-y-3 p-4 bg-base-300/50 rounded-2xl border border-white/5 animate-slideIn">
          <label className="block text-[10px] font-black uppercase text-gray-500 tracking-widest">6. Opções de Geração</label>
          <div className="space-y-2.5">
            <label className="flex items-center gap-3 cursor-pointer group select-none">
              <input 
                type="checkbox" 
                checked={generateModel} 
                onChange={(e) => setGenerateModel(e.target.checked)}
                className="checkbox checkbox-primary border-base-300 w-5 h-5 rounded-lg transition-all checked:bg-brand-primary"
              />
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-gray-200 group-hover:text-white transition-colors">Gerar com Modelo Realista (Humano)</span>
                <span className="text-[9px] text-gray-500 font-medium">Cria o design sendo vestido por um modelo humano</span>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group select-none">
              <input 
                type="checkbox" 
                checked={generateFlatLay} 
                onChange={(e) => setGenerateFlatLay(e.target.checked)}
                className="checkbox checkbox-primary border-base-300 w-5 h-5 rounded-lg transition-all checked:bg-brand-primary"
              />
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-gray-200 group-hover:text-white transition-colors">Gerar apenas Camiseta Realista (Flat-lay)</span>
                <span className="text-[9px] text-gray-500 font-medium">Cria a camiseta estendida flat-lay (sem modelo)</span>
              </div>
            </label>
          </div>
        </div>

        {error && <p className="text-red-400 text-[11px] font-bold p-2 bg-red-400/10 rounded-lg border border-red-400/20 animate-shake">{error}</p>}
        
        <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-brand-primary to-brand-secondary text-white font-black py-5 rounded-2xl hover:brightness-110 transition-all shadow-xl shadow-brand-primary/20 uppercase tracking-[0.2em] text-[11px]">
          {isLoading ? 'Gerando...' : (numMockups === 1 ? 'Criar 1 Mockup' : (numMockups === 2 ? 'Criar 2 Mockups' : 'Criar Mockup'))}
        </button>
      </form>
    );
  };

  const renderMobileForm = () => {
    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Enviar Estampa */}
        <div className="animate-slideIn space-y-4">
          <label className="block text-[10px] font-black uppercase text-gray-500 tracking-widest">1. Enviar Estampa</label>
          
          {/* Drag & Drop Box */}
          <div className={`p-4 border rounded-2xl transition-all duration-300 group bg-base-100/30 ${!designImage ? 'border-base-300 hover:border-brand-primary/50' : 'border-brand-primary/30'}`}>
            <div className="flex justify-center px-4 pt-4 pb-4 border-2 border-base-300 border-dashed rounded-xl transition-all duration-300 hover:border-brand-primary hover:bg-brand-primary/5 relative">
              {designImage?.base64 && (
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleClearAll(); }}
                  className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors z-10 shadow-lg shadow-red-500/20"
                  title="Remover imagem"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              )}
              <div className="space-y-1 text-center w-full">
                {designImage?.base64 ? (
                  <div className="relative group/preview inline-block">
                    <img src={designImage.base64} alt="Preview" className="mx-auto h-24 w-24 object-contain rounded-lg shadow-md transition-transform duration-300 group-hover/preview:scale-105" />
                  </div>
                ) : (
                  <svg className="mx-auto h-12 w-12 transition-colors duration-300 text-gray-400 group-hover:text-brand-primary drop-shadow-sm" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 4v.01M28 8L36 16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                )}
                <div className="flex text-sm text-gray-400 justify-center mt-3">
                  <label htmlFor="design-file-upload-mobile" className="relative cursor-pointer bg-base-300 hover:bg-base-300/80 rounded-lg font-black text-[10px] uppercase tracking-widest text-brand-primary hover:text-brand-secondary focus-within:outline-none transition-all duration-200 px-4 py-2 shadow-sm border border-base-300">
                    <span>{designImage?.base64 ? 'Trocar Desenho' : 'Carregar Desenho'}</span>
                    <input id="design-file-upload-mobile" name="design-file-upload-mobile" type="file" className="sr-only" accept="image/png, image/jpeg, image/jpg" onChange={handleFileChange} />
                  </label>
                </div>
                <p className="text-[9px] text-gray-500 mt-2 font-bold tracking-wider">PNG, JPG até 10MB</p>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Local de Aplicação */}
        <div className="animate-slideIn space-y-2">
          <label className="block text-[10px] font-black uppercase text-gray-500 tracking-widest">2. Local de Aplicação</label>
          <div className="grid grid-cols-2 gap-1.5 bg-base-300 p-1.5 rounded-xl border border-white/5">
            <button
              type="button"
              onClick={() => setPrintPosition('front')}
              className={`py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${printPosition === 'front' ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20 scale-100' : 'text-gray-400 hover:text-white bg-transparent hover:bg-base-100/10'}`}
            >
              Frente
            </button>
            <button
              type="button"
              onClick={() => setPrintPosition('back')}
              className={`py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${printPosition === 'back' ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20 scale-100' : 'text-gray-400 hover:text-white bg-transparent hover:bg-base-100/10'}`}
            >
              Costas
            </button>
            <button
              type="button"
              onClick={() => setPrintPosition('leftSleeve')}
              className={`py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${printPosition === 'leftSleeve' ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20 scale-100' : 'text-gray-400 hover:text-white bg-transparent hover:bg-base-100/10'}`}
            >
              Manga Esq.
            </button>
            <button
              type="button"
              onClick={() => setPrintPosition('rightSleeve')}
              className={`py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${printPosition === 'rightSleeve' ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20 scale-100' : 'text-gray-400 hover:text-white bg-transparent hover:bg-base-100/10'}`}
            >
              Manga Dir.
            </button>
          </div>
        </div>

        {/* 3. Modelo */}
        <div className="animate-slideIn">
          <label className="block text-[10px] font-black uppercase text-gray-500 tracking-widest mb-4">3. Modelo</label>
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

        {/* 4. Cor */}
        <div className="animate-slideIn">
          <label className="block text-[10px] font-black uppercase text-gray-500 tracking-widest mb-4">4. Cor</label>
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

        {/* 5. Estilo */}
        <div className="animate-slideIn">
          <label htmlFor="promptMobile" className="block text-[10px] font-black uppercase text-gray-500 tracking-widest mb-4">5. Estilo</label>
          <textarea id="promptMobile" value={prompt} onChange={e => setPrompt(e.target.value)} rows={2} className="w-full bg-base-300 border border-base-300 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-brand-primary outline-none" placeholder="Ex: iluminação solar..."></textarea>
        </div>

        {/* 6. Opções de Geração */}
        <div className="space-y-3 p-4 bg-base-300/50 rounded-2xl border border-white/5 animate-slideIn">
          <label className="block text-[10px] font-black uppercase text-gray-500 tracking-widest">6. Opções de Geração</label>
          <div className="space-y-2.5">
            <label className="flex items-center gap-3 cursor-pointer group select-none">
              <input 
                type="checkbox" 
                checked={generateModel} 
                onChange={(e) => setGenerateModel(e.target.checked)}
                className="checkbox checkbox-primary border-base-300 w-5 h-5 rounded-lg transition-all checked:bg-brand-primary"
              />
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-gray-200 group-hover:text-white transition-colors">Gerar com Modelo Realista (Humano)</span>
                <span className="text-[9px] text-gray-500 font-medium">Cria o design sendo vestido por um modelo humano</span>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group select-none">
              <input 
                type="checkbox" 
                checked={generateFlatLay} 
                onChange={(e) => setGenerateFlatLay(e.target.checked)}
                className="checkbox checkbox-primary border-base-300 w-5 h-5 rounded-lg transition-all checked:bg-brand-primary"
              />
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-gray-200 group-hover:text-white transition-colors">Gerar apenas Camiseta Realista (Flat-lay)</span>
                <span className="text-[9px] text-gray-500 font-medium">Cria a camiseta estendida flat-lay (sem modelo)</span>
              </div>
            </label>
          </div>
        </div>

        {/* 7. Ajustes Finos */}
        {designImage?.base64 && (
          <div className="space-y-4 p-4 bg-base-300/50 rounded-2xl border border-white/5 animate-fadeIn">
            <label className="block text-[10px] font-black uppercase text-gray-500 tracking-widest">7. Ajustes Finos de Posicionamento</label>
            
            {/* Tamanho da Estampa */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-bold uppercase text-gray-400 tracking-wider">Tamanho da Estampa</span>
                <span className="text-brand-primary font-black text-xs">{printSize}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={printSize}
                onChange={(e) => setPrintSize(parseInt(e.target.value))}
                className="w-full h-1.5 bg-base-300 rounded-lg appearance-none cursor-pointer accent-brand-primary"
              />
            </div>

            {/* Ajuste Vertical */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-bold uppercase text-gray-400 tracking-wider">Ajuste Vertical</span>
                <span className="text-brand-primary font-black text-xs">{collarDistance}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="35"
                value={collarDistance}
                onChange={(e) => setCollarDistance(parseInt(e.target.value))}
                className="w-full h-1.5 bg-base-300 rounded-lg appearance-none cursor-pointer accent-brand-primary"
              />
            </div>

            {/* Ajuste Horizontal */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-bold uppercase text-gray-400 tracking-wider">Ajuste Horizontal</span>
                <span className="text-brand-primary font-black text-xs">{printOffsetX > 0 ? `+${printOffsetX}` : printOffsetX}%</span>
              </div>
              <input
                type="range"
                min="-30"
                max="30"
                value={printOffsetX}
                onChange={(e) => setPrintOffsetX(parseInt(e.target.value))}
                className="w-full h-1.5 bg-base-300 rounded-lg appearance-none cursor-pointer accent-brand-primary"
              />
            </div>
          </div>
        )}

        {/* 8. Exibição do 3D / Vitrine */}
        <div className="select-none my-4">
          {renderViewer()}
        </div>

        {error && <p className="text-red-400 text-[11px] font-bold p-2 bg-red-400/10 rounded-lg border border-red-400/20 animate-shake">{error}</p>}
        
        {/* 9. Botão criar mockup */}
        <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-brand-primary to-brand-secondary text-white font-black py-5 rounded-2xl hover:brightness-110 transition-all shadow-xl shadow-brand-primary/20 uppercase tracking-[0.2em] text-[11px]">
          {isLoading ? 'Gerando...' : 'Criar Mockup'}
        </button>
      </form>
    );
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
        {isMobile ? (
          /* Mobile View - Single Linear Column Flow */
          <div className="space-y-6 animate-fadeIn">
            <UsageBar />
            {renderMobileForm()}
            
            {/* Recent downloads history at the bottom of the mobile page */}
            {user && user.downloadHistory && user.downloadHistory.length > 0 && (
              <div className="mt-8 animate-fadeIn pt-4 border-t border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[10px] font-black uppercase text-gray-500 tracking-[0.2em]">Downloads Recentes</h3>
                  <button onClick={() => setView('account')} className="text-brand-primary text-[10px] font-black uppercase hover:underline">Ver Todos</button>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {user.downloadHistory.slice(0, 4).map((item) => (
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
        ) : (
          /* Desktop View - Exact Original Two-Column Grid */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fadeIn">
            {/* Sidebar Column (Form) */}
            <div className="lg:col-span-4 xl:col-span-3">
              <div className="bg-base-200/80 backdrop-blur-xl rounded-3xl p-6 space-y-6 sticky top-24 shadow-2xl border border-white/5">
                <UsageBar />
                {renderDesktopForm()}
              </div>
            </div>

            {/* Viewer Column */}
            <div className="lg:col-span-8 xl:col-span-9 flex flex-col">
              {renderViewer()}
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
        )}
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
