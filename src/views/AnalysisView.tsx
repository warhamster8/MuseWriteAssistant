import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { 
  Book, 
  Clock, 
  TrendingUp, 
  Layout,
  Activity,
  BarChart2,
  Calendar
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { useCharacters } from '../hooks/useCharacters';
import { ChronologyView } from './analysis/ChronologyView';
import { 
  cleanHtml, 
  countWords, 
  lexicalDiversity, 
  getTopWords, 
  countCharacterMentions 
} from '../lib/analysisUtils';
import { cn } from '../lib/utils';

const COLORS = ['#5be9b1', '#4ade80', '#2dd4bf', '#0d9488', '#115e59', '#064e3b'];

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon: Icon, trend }) => (
  <div className="bg-[#23282f] p-6 rounded-[32px] border border-white/5 hover:border-[#5be9b1]/20 transition-all group relative overflow-hidden">
    <div className="absolute top-0 right-0 w-24 h-24 bg-[#5be9b1]/5 blur-3xl -mr-12 -mt-12 group-hover:bg-[#5be9b1]/10 transition-all" />
    <div className="flex items-center justify-between mb-6">
      <div className="p-3 bg-[#13161a] rounded-[18px] text-[#5be9b1] border border-white/10 group-hover:scale-110 transition-transform">
        <Icon className="w-5 h-5" />
      </div>
      {trend && (
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-[#5be9b1] font-black tracking-[0.2em] uppercase">Pacing</span>
          <span className="text-[9px] text-slate-500 font-black">{trend}</span>
        </div>
      )}
    </div>
    <div className="text-4xl font-black text-slate-50 mb-1 tracking-tighter">{value}</div>
    <div className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">{title}</div>
  </div>
);

export const AnalysisView: React.FC = React.memo(() => {
  const chapters = useStore(s => s.chapters);
  const { characters } = useCharacters();
  const [activeAnalysisTab, setActiveAnalysisTab] = React.useState<'overview' | 'chronology'>('overview');

  // ─── Data Aggregation ──────────────────────────────────────────────────────
  const stats = useMemo(() => {
    let totalWords = 0;
    let totalChars = 0;
    const chapterData: any[] = [];
    let fullText = '';
    
    chapters.forEach((chapter, index) => {
      let chapterWords = 0;
      let chapterSentences = 0;
      
      chapter.scenes?.forEach(scene => {
        const plain = cleanHtml(scene.content || '');
        fullText += plain + ' ';
        const words = countWords(plain);
        chapterWords += words;
        totalWords += words;
        totalChars += plain.length;
        
        const sentences = plain.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
        chapterSentences += sentences;
      });
      
      chapterData.push({
        name: `C${index + 1}`,
        fullName: `Capitolo ${index + 1}`,
        words: chapterWords,
        pacing: chapterSentences > 0 ? (chapterWords / chapterSentences).toFixed(1) : 0
      });
    });

    const wordsPerMinute = 200;
    const readingTime = Math.ceil(totalWords / wordsPerMinute);
    const diversity = lexicalDiversity(fullText);
    const topWords = getTopWords(fullText, 5);
    const characterMentions = countCharacterMentions(fullText, characters.map(c => c.name));

    return {
      totalWords,
      totalChars,
      readingTime,
      chapterData,
      diversity: diversity.toFixed(1) + '%',
      topWords,
      characterMentions
    };
  }, [chapters, characters]);

  if (chapters.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-700 space-y-6 bg-[#13161a] rounded-[40px] border border-white/10">
        <Activity className="w-16 h-16 opacity-10" />
        <div className="text-center">
            <h3 className="text-lg font-black text-slate-400">Nessun dato disponibile</h3>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-50 max-w-[200px] mx-auto mt-2">Inizia a scrivere per sbloccare le proiezioni statistiche del tuo manoscritto.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-6 animate-in fade-in duration-700 max-w-7xl mx-auto">
      <header className="flex items-center justify-between bg-[#23282f] p-6 rounded-[32px] border border-white/5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-[#5be9b1]" />
            <span className="text-[10px] font-black text-[#5be9b1]/50 uppercase tracking-[0.3em]">DASHBOARD ANALITICA</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter uppercase leading-none">Anatomia <span className="text-[#5be9b1]">Progetto</span></h1>
        </div>

        <div className="flex p-1.5 bg-[#13161a] border border-white/5 rounded-[22px] shadow-inner">
          <button
            onClick={() => setActiveAnalysisTab('overview')}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-all rounded-[16px]",
              activeAnalysisTab === 'overview' 
                ? "bg-[#5be9b1] text-[#0b0e11] shadow-xl" 
                : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
            )}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            Overview
          </button>
          <button
            onClick={() => setActiveAnalysisTab('chronology')}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-all rounded-[16px]",
              activeAnalysisTab === 'chronology' 
                ? "bg-[#5be9b1] text-[#0b0e11] shadow-xl" 
                : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
            )}
          >
            <Calendar className="w-3.5 h-3.5" />
            Cronologia
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pr-2 space-y-6 scrollbar-hide">
        {activeAnalysisTab === 'chronology' ? (
          <ChronologyView />
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard title="Parole Totali" value={stats.totalWords.toLocaleString()} icon={Book} trend="+1.2k today" />
              <MetricCard title="Sessione Lettura" value={`${stats.readingTime}m`} icon={Clock} />
              <MetricCard title="Ricchezza Lessico" value={stats.diversity} icon={TrendingUp} />
              <MetricCard title="Draft Volume" value={(stats.totalChars / 1000).toFixed(1) + 'k'} icon={Layout} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Chapter Balance Chart */}
              <div className="lg:col-span-2 bg-[#1a1e23]/60 backdrop-blur-md p-10 rounded-[40px] border border-white/10 shadow-sm">
                <div className="flex items-center justify-between mb-10">
                  <div>
                    <h2 className="text-xl font-black flex items-center gap-3">
                      Bilanciamento Capitoli
                    </h2>
                    <p className="text-[10px] text-slate-500 mt-1 font-black uppercase tracking-widest leading-none">Distribuzione della densità testuale per sezione.</p>
                  </div>
                  <div className="flex gap-2">
                     <div className="w-3 h-3 rounded-full bg-emerald-500/40" />
                     <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Word Count</span>
                  </div>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.chapterData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#5be9b1" stopOpacity={0.6}/>
                          <stop offset="100%" stopColor="#5be9b1" stopOpacity={0.05}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="0" stroke="#ffffff08" vertical={false} />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} dy={15} />
                      <YAxis stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                      <Tooltip 
                        cursor={{ fill: 'rgba(91, 233, 177, 0.03)' }}
                        contentStyle={{ backgroundColor: '#121519', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', padding: '12px' }}
                        itemStyle={{ color: '#5be9b1', fontWeight: 'bold' }}
                        labelStyle={{ opacity: 0.5, marginBottom: '4px' }}
                      />
                      <Bar dataKey="words" fill="url(#emeraldGradient)" radius={[8, 8, 4, 4]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Character Mentions */}
              <div className="bg-[#171b1f] p-10 rounded-[40px] border border-white/5 shadow-sm flex flex-col">
                <h2 className="text-xl font-bold mb-10">Focus Protagonisti</h2>
                <div className="flex-1 min-h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.characterMentions}
                        innerRadius={80}
                        outerRadius={105}
                        paddingAngle={8}
                        dataKey="count"
                        stroke="none"
                      >
                        {stats.characterMentions.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} opacity={0.8} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#121519', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px' }}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        iconType="circle" 
                        wrapperStyle={{ paddingTop: '30px', fontSize: '10px', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.1em', opacity: 0.5 }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-10">
              {/* Narrative Pacing Area Chart */}
              <div className="bg-[#171b1f] p-10 rounded-[40px] border border-white/5 shadow-sm">
                <div className="flex items-center justify-between mb-10">
                  <div>
                    <h2 className="text-xl font-bold">Ritmo Narrativo</h2>
                    <p className="text-xs text-slate-500 mt-1">Variazione del pacing tra capitoli (Avg w/s).</p>
                  </div>
                  <Activity className="w-5 h-5 text-[#5be9b1]/30" />
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.chapterData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="paceGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#5be9b1" stopOpacity={0.2}/>
                          <stop offset="100%" stopColor="#5be9b1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="0" stroke="#ffffff08" vertical={false} />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} dy={15} />
                      <YAxis stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#121519', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px' }}
                      />
                      <Area type="monotone" dataKey="pacing" stroke="#5be9b1" strokeWidth={4} fill="url(#paceGradient)" dot={{ r: 5, fill: '#5be9b1', strokeWidth: 0 }} activeDot={{ r: 8, stroke: '#121519', strokeWidth: 4 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Lexical Lab */}
              <div className="flex flex-col gap-6">
                 <div className="bg-[#171b1f] p-10 rounded-[40px] border border-white/5 shadow-sm flex-1">
                    <h2 className="text-xl font-bold mb-8">Analisi del Lessico</h2>
                    <div className="space-y-6">
                      {stats.topWords.map((item, idx) => (
                        <div key={idx} className="group cursor-default">
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-bold text-slate-700 tracking-widest">{idx + 1}</span>
                                <span className="text-sm font-medium text-slate-200 group-hover:text-emerald-400 transition-colors uppercase tracking-widest">{item.word}</span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-600 bg-white/5 px-2 py-0.5 rounded-lg">{item.count}</span>
                          </div>
                          <div className="h-0.5 bg-white/5 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-[#5be9b1] transition-all duration-1000 ease-out" 
                              style={{ width: `${(item.count / stats.topWords[0].count) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                 </div>
                 
                  <div 
                    onClick={() => setActiveAnalysisTab('chronology')}
                    className="bg-[#5be9b1] p-10 rounded-[40px] flex items-center gap-6 group hover:shadow-[0_20px_60px_-15px_rgba(91,233,177,0.3)] transition-all cursor-pointer"
                  >
                    <div className="p-4 bg-black/20 rounded-[24px] backdrop-blur-md">
                       <Zap className="w-8 h-8 text-black" />
                    </div>
                    <div>
                       <div className="text-lg font-black text-[#0b0e11] tracking-tight">Timeline Chronology</div>
                       <p className="text-sm text-[#0b0e11] opacity-60 font-bold leading-tight mt-1">Accedi alla visualizzazione Gantt e alla linea temporale sincronizzata.</p>
                    </div>
                  </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
});

const Zap: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="currentColor"></polygon>
  </svg>
);
