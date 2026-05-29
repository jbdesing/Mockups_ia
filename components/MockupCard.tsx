
import React from 'react';
import type { GeneratedImage } from '../types';

interface MockupCardProps {
  image: GeneratedImage;
  onDownload: () => void;
  onRedo: () => void;
  onImageLoad?: () => void;
}

const DownloadIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
);

const RedoIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path><path d="M21 21v-5h-5"></path></svg>
);

export const MockupCard: React.FC<MockupCardProps> = ({ image, onDownload, onRedo, onImageLoad }) => {
  return (
    <div className="bg-base-200 rounded-lg overflow-hidden shadow-lg group transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:border-brand-primary/30 border border-transparent h-full flex flex-col">
      <div className="flex-grow bg-base-300 flex items-center justify-center overflow-hidden relative min-h-0">
        <img 
            src={image.src} 
            alt="Generated mockup" 
            className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-110" 
            onLoad={onImageLoad}
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300"></div>
      </div>
      <div className="p-4 bg-base-200/90 backdrop-blur-sm shrink-0">
        <div className="flex space-x-2">
            <button
                type="button"
                onClick={onDownload}
                className="flex-1 bg-green-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-green-700 active:scale-95 transition-all duration-200 flex items-center justify-center shadow-md hover:shadow-lg"
            >
                <DownloadIcon />
                Baixar
            </button>
            <button
                type="button"
                onClick={onRedo}
                className="flex-1 bg-base-300 text-white font-semibold py-2 px-4 rounded-md hover:bg-base-300/80 active:scale-95 transition-all duration-200 flex items-center justify-center shadow-md hover:shadow-lg"
            >
                <RedoIcon />
                Refazer
            </button>
        </div>
      </div>
    </div>
  );
};
