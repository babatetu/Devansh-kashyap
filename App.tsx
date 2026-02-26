
import React, { useState, useCallback, useRef } from 'react';
import Header from './components/Header';
import AdCanvas from './components/AdCanvas';
import { AdData, AdStyle, AspectRatio } from './types';
import { STYLE_OPTIONS, ASPECT_RATIOS } from './constants';
import { GeminiService } from './services/geminiService';

const App: React.FC = () => {
  const [step, setStep] = useState(1);
  const [selectedStyle, setSelectedStyle] = useState<AdStyle>(AdStyle.STUDIO);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.SQUARE);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [productDesc, setProductDesc] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isProMode, setIsProMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState('');
  const [adData, setAdData] = useState<AdData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const gemini = useRef(new GeminiService());

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const imageBase64 = event.target?.result as string;
        setOriginalImage(imageBase64);
        
        // Start Analysis Flow
        setIsAnalyzing(true);
        try {
          setAnalysisStatus('Analyzing product image...');
          const productName = await gemini.current.analyzeProduct(imageBase64);
          
          setAnalysisStatus(`Searching details for ${productName}...`);
          const productInfo = await gemini.current.researchProduct(productName);
          
          setProductDesc(productInfo || productName);
          setStep(2);
        } catch (err) {
          console.error("Analysis failed", err);
          setProductDesc("A high-quality product"); // Fallback
          setStep(2);
        } finally {
          setIsAnalyzing(false);
          setAnalysisStatus('');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProToggle = async () => {
    if (!isProMode) {
      if (typeof window.aistudio !== 'undefined') {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
          await window.aistudio.openSelectKey();
        }
      }
    }
    setIsProMode(!isProMode);
  };

  const generateAd = async () => {
    if (!originalImage) return;
    setIsLoading(true);
    setError(null);
    setStep(3);

    try {
      // 1. Generate Strategy (Thinking)
      const strategy = await gemini.current.generateAdStrategy(
        productDesc || "A high-quality product", 
        selectedStyle,
        true // Enable complex thinking
      );

      // 2. Generate Copy based on strategy
      const copy = await gemini.current.generateAdCopy(
        productDesc || "A high-quality product", 
        selectedStyle,
        strategy.copyAngle
      );

      let transformedImage;
      if (isProMode) {
        // Use strategy.imagePrompt for better results
        // Pro mode automatically falls back to Standard if it fails
        transformedImage = await gemini.current.transformImagePro(
          originalImage, 
          selectedStyle, 
          aspectRatio, 
          customPrompt || strategy.imagePrompt
        );
      } else {
        // Use strategy.imagePrompt with Nano Banana
        transformedImage = await gemini.current.transformImage(
          originalImage, 
          selectedStyle, 
          aspectRatio, 
          customPrompt || strategy.imagePrompt
        );
      }

      setAdData({
        originalImage,
        editedImage: transformedImage as string,
        headline: copy.headline,
        subheadline: copy.subheadline,
        cta: copy.cta,
        style: selectedStyle,
        aspectRatio,
      });
    } catch (err: any) {
      console.error(err);
      setError("Something went wrong during generation. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!adData || !adData.editedImage) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Polyfill for roundRect if needed
    if (!ctx.roundRect) {
      ctx.roundRect = function(x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        this.beginPath();
        this.moveTo(x + r, y);
        this.arcTo(x + w, y, x + w, y + h, r);
        this.arcTo(x + w, y + h, x, y + h, r);
        this.arcTo(x, y + h, x, y, r);
        this.arcTo(x, y, x + w, y, r);
        this.closePath();
      };
    }

    // Define dimensions based on ratio
    let width = 1080;
    let height = 1080;
    if (adData.aspectRatio === AspectRatio.STORY) {
      height = 1920;
    } else if (adData.aspectRatio === AspectRatio.LANDSCAPE) {
      height = 608;
    }
    canvas.width = width;
    canvas.height = height;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = adData.editedImage;

    img.onload = () => {
      // 1. Draw Background
      ctx.drawImage(img, 0, 0, width, height);

      // 2. Draw Gradient Overlay
      const gradient = ctx.createLinearGradient(0, height, 0, height * 0.4);
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
      gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.3)');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // 3. Draw Headline
      ctx.fillStyle = 'white';
      ctx.font = 'bold 64px Inter, sans-serif';
      const margin = 60;
      const wrapWidth = width - (margin * 2);
      
      const words = adData.headline.split(' ');
      let line = '';
      let y = height - 280;
      
      for(let n = 0; n < words.length; n++) {
        let testLine = line + words[n] + ' ';
        let metrics = ctx.measureText(testLine);
        if (metrics.width > wrapWidth && n > 0) {
          ctx.fillText(line, margin, y);
          line = words[n] + ' ';
          y += 75;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, margin, y);

      // 4. Draw Subheadline
      ctx.fillStyle = '#e5e7eb';
      ctx.font = '500 36px Inter, sans-serif';
      ctx.fillText(adData.subheadline, margin, y + 60);

      // 5. Draw CTA Button
      const ctaY = y + 120;
      const ctaText = adData.cta.toUpperCase();
      ctx.font = 'bold 28px Inter, sans-serif';
      const textWidth = ctx.measureText(ctaText).width;
      const btnPaddingH = 40;
      const btnPaddingV = 20;
      const btnWidth = textWidth + (btnPaddingH * 2);
      const btnHeight = 28 + (btnPaddingV * 2);

      // Button background
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.roundRect(margin, ctaY, btnWidth, btnHeight, 40);
      ctx.fill();

      // Button text
      ctx.fillStyle = 'black';
      ctx.fillText(ctaText, margin + btnPaddingH, ctaY + btnPaddingV + 24);

      // Trigger Download
      const link = document.createElement('a');
      link.download = `adgenius-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
  };

  const reset = () => {
    setStep(1);
    setAdData(null);
    setOriginalImage(null);
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header onLogoClick={reset} />
      
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 relative">
        {isAnalyzing && (
          <div className="absolute inset-0 z-50 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center rounded-3xl">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600 mb-4"></div>
            <h3 className="text-xl font-bold text-gray-900">{analysisStatus}</h3>
            <p className="text-gray-500 mt-2">Gemini is analyzing your product...</p>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col items-center justify-center space-y-8 py-20 text-center">
            <div className="space-y-4 max-w-2xl">
              <h1 className="text-5xl font-extrabold text-gray-900 leading-tight">
                Turn your product photos into <span className="text-indigo-600">stunning advertisements.</span>
              </h1>
              <p className="text-xl text-gray-500">
                Upload a simple photo, and let AdGenius AI create professional studio-quality 
                visuals and marketing copy in seconds.
              </p>
            </div>

            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-full max-w-xl aspect-video border-2 border-dashed border-gray-300 rounded-3xl flex flex-col items-center justify-center bg-white hover:border-indigo-500 hover:bg-indigo-50/30 transition cursor-pointer group shadow-sm"
            >
              <div className="bg-indigo-100 p-4 rounded-full mb-4 group-hover:scale-110 transition duration-300">
                <i className="fa-solid fa-cloud-arrow-up text-indigo-600 text-3xl"></i>
              </div>
              <p className="text-lg font-semibold text-gray-700">Click to upload product photo</p>
              <p className="text-sm text-gray-400 mt-1">PNG, JPG or WEBP (max 10MB)</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleImageUpload} 
              />
            </div>

            <div className="flex flex-wrap justify-center gap-8 pt-10 opacity-50">
               <div className="flex items-center space-x-2"><i className="fa-solid fa-check text-green-500"></i> <span className="text-sm font-medium">Studio Lighting</span></div>
               <div className="flex items-center space-x-2"><i className="fa-solid fa-check text-green-500"></i> <span className="text-sm font-medium">Auto Copywriting</span></div>
               <div className="flex items-center space-x-2"><i className="fa-solid fa-check text-green-500"></i> <span className="text-sm font-medium">Multiple Ratios</span></div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-4 space-y-8">
              <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <i className="fa-solid fa-wand-magic-sparkles text-indigo-500 mr-2"></i> Ad Settings
                </h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Ad Style</label>
                    <div className="grid grid-cols-3 gap-2">
                      {STYLE_OPTIONS.map((style) => (
                        <button
                          key={style.id}
                          onClick={() => setSelectedStyle(style.id)}
                          className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                            selectedStyle === style.id 
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                              : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300 hover:bg-indigo-50'
                          }`}
                        >
                          <i className={`fa-solid ${style.icon} mb-1`}></i>
                          <span className="text-[10px] font-bold uppercase tracking-tighter">{style.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Aspect Ratio</label>
                    <div className="flex space-x-2">
                      {ASPECT_RATIOS.map((ratio) => (
                        <button
                          key={ratio.id}
                          onClick={() => setAspectRatio(ratio.id)}
                          className={`flex-1 flex items-center justify-center py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                            aspectRatio === ratio.id 
                              ? 'bg-gray-900 border-gray-900 text-white' 
                              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <i className={`fa-solid ${ratio.icon} mr-2`}></i> {ratio.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Product Context (Optional)</label>
                    <textarea 
                      value={productDesc}
                      onChange={(e) => setProductDesc(e.target.value)}
                      placeholder="e.g. High-performance trail running shoes..."
                      className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none h-24 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <i className="fa-solid fa-wand-magic-sparkles text-indigo-500 mr-1"></i> 
                      AI Image Editor (Optional)
                    </label>
                    <input 
                      type="text"
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="e.g. Add a retro filter, Remove the person in background..."
                      className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">
                      Use natural language to instruct the AI to edit or transform the image.
                    </p>
                  </div>

                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                         <span className="text-sm font-bold text-gray-900">Pro Quality Mode</span>
                         <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Alpha</span>
                      </div>
                      <button 
                        onClick={handleProToggle}
                        className={`w-12 h-6 rounded-full transition-colors relative ${isProMode ? 'bg-indigo-600' : 'bg-gray-200'}`}
                      >
                        <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${isProMode ? 'translate-x-6' : ''}`}></div>
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      Pro mode uses Gemini 3 Pro Vision for ultra-high fidelity results. Requires your own API key with billing.
                    </p>
                  </div>
                </div>
              </section>

              <button 
                onClick={generateAd}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center space-x-2 group"
              >
                <span>Generate Advertisement</span>
                <i className="fa-solid fa-arrow-right group-hover:translate-x-1 transition"></i>
              </button>
            </div>

            <div className="lg:col-span-8 space-y-6">
               <div className="bg-white p-2 rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-gray-50 rounded-2xl flex items-center justify-center p-8 min-h-[500px]">
                    <img 
                      src={originalImage || ''} 
                      alt="Product Source" 
                      className="max-h-[450px] w-auto rounded-xl shadow-lg border-4 border-white"
                    />
                  </div>
                  <div className="p-4 text-center">
                    <p className="text-sm text-gray-500 font-medium">Source Image Preview</p>
                    <button onClick={reset} className="text-indigo-600 text-xs font-bold hover:underline mt-1">Change Photo</button>
                  </div>
               </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="max-w-5xl mx-auto space-y-10 animate-fade-in">
             {error && (
               <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-start space-x-3">
                 <i className="fa-solid fa-circle-exclamation text-red-500 mt-1"></i>
                 <div>
                    <p className="text-sm font-bold text-red-800">Generation Failed</p>
                    <p className="text-sm text-red-600">{error}</p>
                    <button onClick={generateAd} className="mt-2 text-red-800 text-xs font-bold hover:underline">Try Again</button>
                 </div>
               </div>
             )}

             <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <h2 className="text-3xl font-bold text-gray-900 leading-tight">Your AI-Generated <br/>Campaign is Ready.</h2>
                  
                  <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Ad Headline</h4>
                      <p className="text-xl font-bold text-gray-900">{isLoading ? 'Writing...' : adData?.headline}</p>
                    </div>
                    
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Ad Subheadline</h4>
                      <p className="text-gray-600 leading-relaxed italic">"{isLoading ? 'Thinking...' : adData?.subheadline}"</p>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Call to Action</h4>
                      <div className="bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold px-4 py-2 rounded-lg inline-block">
                        {isLoading ? '...' : adData?.cta}
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button 
                      onClick={() => setStep(2)}
                      className="flex-1 bg-white border border-gray-200 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-50 transition"
                    >
                      Refine Options
                    </button>
                    <button 
                      onClick={reset}
                      className="flex-1 bg-white border border-gray-200 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-50 transition"
                    >
                      Start Over
                    </button>
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <AdCanvas data={adData || { 
                    originalImage: originalImage!, 
                    headline: '', subheadline: '', cta: '', 
                    style: selectedStyle, 
                    aspectRatio: aspectRatio 
                  }} isLoading={isLoading} />
                  
                  {!isLoading && adData && (
                    <div className="mt-6 flex space-x-4 w-full justify-center">
                       <button 
                         onClick={handleDownload}
                         className="bg-gray-900 text-white px-6 py-3 rounded-full font-bold flex items-center hover:bg-black transition shadow-lg"
                       >
                         <i className="fa-solid fa-download mr-2"></i> Download Ad
                       </button>
                       <button className="bg-indigo-600 text-white px-6 py-3 rounded-full font-bold flex items-center hover:bg-indigo-700 transition shadow-lg">
                         <i className="fa-solid fa-share-nodes mr-2"></i> Share Result
                       </button>
                    </div>
                  )}
                </div>
             </div>

             <div className="pt-20 border-t border-gray-100">
                <h3 className="text-center font-bold text-gray-400 text-xs uppercase tracking-[0.3em] mb-10">Why Marketers love AdGenius</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                   <div className="text-center">
                     <div className="bg-white shadow-md w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-50">
                        <i className="fa-solid fa-bolt text-amber-500"></i>
                     </div>
                     <h4 className="font-bold mb-1">Blazing Speed</h4>
                     <p className="text-sm text-gray-500">From raw photo to ad campaign in under 15 seconds.</p>
                   </div>
                   <div className="text-center">
                     <div className="bg-white shadow-md w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-50">
                        <i className="fa-solid fa-dollar-sign text-green-500"></i>
                     </div>
                     <h4 className="font-bold mb-1">Save Thousands</h4>
                     <p className="text-sm text-gray-500">No more expensive professional studio photography sessions.</p>
                   </div>
                   <div className="text-center">
                     <div className="bg-white shadow-md w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-50">
                        <i className="fa-solid fa-chart-line text-indigo-500"></i>
                     </div>
                     <h4 className="font-bold mb-1">Better ROI</h4>
                     <p className="text-sm text-gray-500">AI-optimized backgrounds proven to increase click rates.</p>
                   </div>
                </div>
             </div>
          </div>
        )}
      </main>

      <footer className="bg-gray-50 border-t border-gray-100 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-2">
              <div className="bg-gray-300 p-1.5 rounded-lg">
                <i className="fa-solid fa-wand-magic-sparkles text-white text-sm"></i>
              </div>
              <span className="text-sm font-bold text-gray-500 tracking-tight">AdGenius AI</span>
            </div>
            <div className="text-xs text-gray-400">
              © 2025 AdGenius AI. Powered by Gemini. All rights reserved.
            </div>
            <div className="flex space-x-6">
              <a href="#" className="text-gray-400 hover:text-indigo-600 transition"><i className="fa-brands fa-twitter"></i></a>
              <a href="#" className="text-gray-400 hover:text-indigo-600 transition"><i className="fa-brands fa-instagram"></i></a>
              <a href="#" className="text-gray-400 hover:text-indigo-600 transition"><i className="fa-brands fa-linkedin"></i></a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
