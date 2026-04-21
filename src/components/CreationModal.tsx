import React, { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';

interface CreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (title: string) => void;
  title: string;
  placeholder: string;
}

export const CreationModal: React.FC<CreationModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  placeholder 
}) => {
  const [value, setValue] = useState('');

  useEffect(() => {
    if (isOpen) setValue('');
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onConfirm(value.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md glass border border-slate-700 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="relative p-6 border-b border-slate-700 bg-slate-800/50">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold font-serif">{title}</h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Nome</label>
            <input 
              autoFocus
              className="w-full bg-[#121519] border border-slate-700 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-blue-500 transition-all shadow-inner"
              placeholder={placeholder}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl font-bold text-slate-300 transition-all"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={!value.trim()}
              className="flex-3 py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 rounded-2xl font-bold text-white transition-all shadow-lg shadow-blue-500/20"
            >
              Conferma
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
