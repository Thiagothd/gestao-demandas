import React, { useState, useRef } from 'react';
import { Sparkles, Loader2, UploadCloud, Paperclip } from 'lucide-react';
import * as mammoth from 'mammoth';
import { parseDemandWithAI } from '../services/geminiService';
import { Demand } from '../types';

interface SmartPasteProps {
  onDemandCreated: (demand: Demand) => void;
}

export default function SmartPaste({ onDemandCreated }: SmartPasteProps) {
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      let extractedText = '';
      if (file.name.endsWith('.txt')) {
        extractedText = await file.text();
      } else if (file.name.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        extractedText = result.value;
      } else {
        throw new Error('Formato de arquivo não suportado. Use .txt ou .docx');
      }
      
      setText(extractedText);
      // Automatically process the extracted text
      await processText(extractedText);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao ler o arquivo.');
      setIsLoading(false);
    }
  };

  const processText = async (textToProcess: string) => {
    if (!textToProcess.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const extractedData = await parseDemandWithAI(textToProcess);
      const newDemand: Demand = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        ...extractedData
      };
      
      onDemandCreated(newDemand);
      setText('');
    } catch (err: any) {
      console.error(err);
      setError('Falha ao processar o texto. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcess = () => processText(text);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
    // Reset input so the same file can be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-[#111111] rounded-2xl shadow-xl border border-zinc-800/80 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg shrink-0">
          <Sparkles className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Importação Rápida (Smart Paste)</h2>
          <p className="text-sm text-zinc-500">Cole o texto bruto ou arraste um arquivo (.docx, .txt) para extrair a demanda.</p>
        </div>
      </div>
      
      <div 
        className={`relative transition-all duration-300 rounded-xl overflow-hidden ${isDragging ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-[#111111]' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className="absolute inset-0 bg-indigo-500/10 backdrop-blur-sm z-10 flex flex-col items-center justify-center border-2 border-dashed border-indigo-500 rounded-xl">
            <UploadCloud className="w-10 h-10 text-indigo-400 mb-2 animate-bounce" />
            <p className="text-indigo-300 font-medium">Solte o arquivo aqui...</p>
          </div>
        )}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ex: Atualização cliente Allternativa – Início em 16/02/2026 – Thiago ## Vamos utilizar um ambiente de teste..."
          className="w-full h-32 p-4 bg-[#161616] border border-zinc-800 rounded-xl focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all resize-none text-zinc-300 font-mono text-sm placeholder:text-zinc-600"
        />
      </div>
      
      {error && (
        <p className="mt-2 text-sm text-red-400">{error}</p>
      )}
      
      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input 
            type="file" 
            accept=".txt,.docx" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-xl transition-colors border border-zinc-700 w-full sm:w-auto disabled:opacity-50"
          >
            <Paperclip className="w-4 h-4" />
            Anexar Arquivo (.docx / .txt)
          </button>
        </div>
        
        <button
          onClick={handleProcess}
          disabled={isLoading || !text.trim()}
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-indigo-500/20 w-full sm:w-auto"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Extrair Demanda
            </>
          )}
        </button>
      </div>
    </div>
  );
}
