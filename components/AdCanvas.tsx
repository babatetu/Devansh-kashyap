
import React from 'react';
import { AdData } from '../types';

interface AdCanvasProps {
  data: AdData;
  isLoading?: boolean;
}

const AdCanvas: React.FC<AdCanvasProps> = ({ data, isLoading }) => {
  const containerStyle = data.aspectRatio === '9:16' 
    ? 'aspect-[9/16] w-full max-w-[360px]' 
    : data.aspectRatio === '16:9'
      ? 'aspect-[16/9] w-full'
      : 'aspect-square w-full';

  return (
    <div className={`relative ${containerStyle} bg-gray-200 rounded-2xl overflow-hidden shadow-2xl transition-all duration-500 mx-auto group`}>
      {isLoading ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
          <p className="text-sm font-medium text-gray-500">Generating Masterpiece...</p>
        </div>
      ) : (
        <>
          <img 
            src={data.editedImage || data.originalImage} 
            alt="Ad Background" 
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
          />
          
          {/* Ad Overlay Content */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-8 flex flex-col justify-end">
            <div className="transform transition-all duration-500 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100">
              <h2 className="text-white text-3xl font-extrabold leading-tight mb-2 drop-shadow-md">
                {data.headline}
              </h2>
              <p className="text-gray-200 text-lg font-medium mb-6 drop-shadow-sm">
                {data.subheadline}
              </p>
              <button className="bg-white text-black px-6 py-3 rounded-full font-bold uppercase tracking-wider text-sm hover:bg-indigo-600 hover:text-white transition shadow-xl">
                {data.cta}
              </button>
            </div>
          </div>

          <div className="absolute top-4 right-4 flex space-x-2">
             <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest shadow-lg">
                Generated Ad
             </span>
          </div>
        </>
      )}
    </div>
  );
};

export default AdCanvas;
