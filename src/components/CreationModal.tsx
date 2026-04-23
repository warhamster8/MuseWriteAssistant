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
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[var(--bg-overlay)] backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md glass border border-[var(--border-subtle)] rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="relative p-6 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-[var(--text-muted)] hover:text-[var(--text-bright)] hover:bg-[var(--bg-card)] rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--accent)] rounded-lg shadow-lg shadow-[var(--accent-soft)]">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold font-serif text-[var(--text-bright)]">{title}</h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest pl-1">Nome</label>
            <input 
              autoFocus
              className="w-full bg-[var(--bg-deep)] border border-[var(--border-subtle)] rounded-2xl px-5 py-4 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-all shadow-inner"
              placeholder={placeholder}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 bg-[var(--bg-surface)] hover:bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl font-bold text-[var(--text-secondary)] transition-all"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={!value.trim()}
              className="flex-3 py-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:hover:bg-[var(--accent)] rounded-2xl font-bold text-white transition-all shadow-lg shadow-[var(--accent-soft)]"
            >
              Conferma
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
