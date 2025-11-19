import React, { useState, useRef, useEffect } from 'react';
import { analyzeImagePixelData } from './utils/colorUtils';
import { AnalysisResult } from './types';
import AnalysisCharts from './components/AnalysisCharts';
import { getGeminiInsight } from './services/geminiService';
import * as pdfjsLib from 'pdfjs-dist';

// Set the worker source for pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs`;

const App: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [geminiInsight, setGeminiInsight] = useState<string | null>(null);
  const [isGeminiThinking, setIsGeminiThinking] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processPdf = async (file: File) => {
    setIsProcessingPdf(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      // Render the first page
      const page = await pdf.getPage(1);
      
      // Set scale to 3.0 for high resolution rasterization
      const scale = 3.0;
      const viewport = page.getViewport({ scale });

      // Create an off-screen canvas
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      if (context) {
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };
        
        await page.render(renderContext).promise;
        
        // Convert to image URL
        const imageUrl = canvas.toDataURL('image/png');
        setSelectedImage(imageUrl);
        setAnalysisResult(null);
        setGeminiInsight(null);
      }
    } catch (error) {
      console.error("Error processing PDF:", error);
      alert("Failed to process PDF file. Please try a valid PDF document.");
    } finally {
      setIsProcessingPdf(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'application/pdf') {
        processPdf(file);
      } else {
        const url = URL.createObjectURL(file);
        setSelectedImage(url);
        setAnalysisResult(null);
        setGeminiInsight(null);
      }
    }
  };

  const runAnalysis = () => {
    if (!selectedImage || !canvasRef.current) return;

    setIsAnalyzing(true);
    const img = new Image();
    img.src = selectedImage;
    img.onload = () => {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      
      if (ctx) {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        // Heavy calculation - wrapping in timeout to allow UI update
        setTimeout(() => {
          const result = analyzeImagePixelData(imageData);
          setAnalysisResult(result);
          setIsAnalyzing(false);
          
          // Trigger Gemini
          setIsGeminiThinking(true);
          getGeminiInsight(result).then(text => {
            setGeminiInsight(text);
            setIsGeminiThinking(false);
          });
        }, 100);
      }
    };
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-indigo-600 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Map Color Ratio Analyzer
          </h1>
          <p className="mt-2 text-indigo-100 text-sm max-w-2xl">
            Upload a rasterized PDF map page or an image. This tool precisely counts pixels, excluding magenta backgrounds and pink borders, 
            to calculate the exact ratio of color groups defined by your specifications.
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Controls Area */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button 
              onClick={() => !isProcessingPdf && fileInputRef.current?.click()}
              disabled={isProcessingPdf}
              className="bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 font-medium py-2 px-4 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {isProcessingPdf ? (
                 <>
                   <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing PDF...
                 </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Upload Map (Image/PDF)
                </>
              )}
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              accept="image/*,application/pdf" 
              className="hidden" 
            />

            {selectedImage && (
              <button
                onClick={runAnalysis}
                disabled={isAnalyzing || isProcessingPdf}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAnalyzing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyzing Pixels...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    Run Analysis
                  </>
                )}
              </button>
            )}
          </div>

          {/* Criteria Info */}
          <div className="mt-6 text-xs text-gray-500 bg-gray-50 p-3 rounded border border-gray-100">
            <p className="font-semibold mb-1">Analysis Criteria:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong className="text-pink-600">Exclusion:</strong> Background (#FF00FF) & Borders (R&gt;150, B&gt;150, G&lt;60)</li>
              <li><strong className="text-orange-500">Warm Group:</strong> HSV Hue 0°–75°, Saturation ≥0.55, Value ≥0.35</li>
              <li><strong className="text-green-600">Strict Matching:</strong> #009245 (Dark Green), #0000ff (Blue), #00ff00 (Neon Green), #4d4d4d (Grey)</li>
            </ul>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Left Column: Image Preview */}
          <div className="xl:col-span-1">
             <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden sticky top-8">
               <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                 <h3 className="font-semibold text-gray-700">Source Image</h3>
                 {analysisResult && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      {analysisResult.width} x {analysisResult.height} px
                    </span>
                 )}
               </div>
               <div className="p-4 flex justify-center bg-gray-100 min-h-[300px] items-center overflow-auto">
                 {selectedImage ? (
                   <div className="relative shadow-lg">
                      <img src={selectedImage} alt="Map Source" className="max-w-full h-auto block" />
                      {/* Hidden canvas for processing */}
                      <canvas ref={canvasRef} className="hidden" />
                   </div>
                 ) : (
                   <div className="text-center text-gray-400">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                     </svg>
                     <p>No image uploaded</p>
                   </div>
                 )}
               </div>
             </div>
          </div>

          {/* Right Column: Results */}
          <div className="xl:col-span-2 space-y-8">
            
            {analysisResult ? (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <p className="text-sm text-gray-500">Total Area (Pixels)</p>
                    <p className="text-2xl font-bold text-gray-900">{analysisResult.processedPixels.toLocaleString()}</p>
                    <p className="text-xs text-gray-400 mt-1">Excluding background</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <p className="text-sm text-gray-500">Excluded Area</p>
                    <p className="text-2xl font-bold text-gray-400">{analysisResult.excludedPixels.toLocaleString()}</p>
                    <p className="text-xs text-pink-400 mt-1">Background & Borders</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <p className="text-sm text-gray-500">Map Coverage</p>
                    <p className="text-2xl font-bold text-indigo-600">
                      {((analysisResult.processedPixels / analysisResult.totalPixels) * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-400 mt-1">of total image size</p>
                  </div>
                </div>

                {/* Charts */}
                <AnalysisCharts data={analysisResult} />

                {/* Detailed Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-4 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-semibold text-gray-700">Detailed Breakdown</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Color Sample</th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Pixel Count</th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ratio (%)</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {analysisResult.categories.map((cat) => (
                          <tr key={cat.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{cat.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="w-8 h-8 rounded shadow-sm border border-gray-200" style={{ backgroundColor: cat.color }}></div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{cat.count.toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-right" style={{ color: cat.color === '#9CA3AF' ? '#374151' : cat.color }}>
                              {cat.percentage.toFixed(4)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Gemini Insight Section */}
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-sm border border-indigo-100 p-6 relative overflow-hidden">
                   <div className="flex items-center gap-2 mb-4">
                     <div className="p-2 bg-white rounded-lg shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/>
                          <path d="M12 6a1 1 0 0 0-1 1v4.59l-3.29-3.3a1 1 0 0 0-1.42 1.42l5 5a1 1 0 0 0 1.42 0l5-5a1 1 0 0 0-1.42-1.42L13 11.59V7a1 1 0 0 0-1-1z"/>
                        </svg> 
                     </div>
                     <h3 className="text-lg font-bold text-indigo-900">AI Insight</h3>
                   </div>
                   
                   {isGeminiThinking ? (
                      <div className="space-y-3 animate-pulse">
                        <div className="h-4 bg-indigo-200 rounded w-3/4"></div>
                        <div className="h-4 bg-indigo-200 rounded w-full"></div>
                        <div className="h-4 bg-indigo-200 rounded w-5/6"></div>
                        <p className="text-sm text-indigo-500 font-medium mt-2">Gemini is analyzing the statistical distribution...</p>
                      </div>
                   ) : geminiInsight ? (
                      <div className="prose prose-sm prose-indigo max-w-none">
                        <pre className="whitespace-pre-wrap font-sans text-gray-700 text-sm leading-relaxed">
                          {geminiInsight}
                        </pre>
                      </div>
                   ) : (
                     <p className="text-sm text-gray-500">Analysis complete. Waiting for insights...</p>
                   )}
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center h-full flex flex-col items-center justify-center text-gray-400">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                 </svg>
                 <p className="text-lg font-medium">Ready to analyze</p>
                 <p className="text-sm">Upload a map image or PDF to see results here.</p>
              </div>
            )}
            
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;