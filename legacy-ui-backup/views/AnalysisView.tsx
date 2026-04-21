import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { 
  BarChart3, 
  Book, 
  Clock, 
  Users, 
  TrendingUp, 
  Hash, 
  Layout,
  Activity
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { useCharacters } from '../hooks/useCharacters';
import { 
  cleanHtml, 
  countWords, 
  lexicalDiversity, 
  getTopWords, 
  countCharacterMentions 
} from '../lib/analysisUtils';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1'];

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, trend }) => (
  <div className="glass p-6 rounded-2xl border border-slate-700/50 hover:border-slate-600 transition-all group shadow-lg">
    <div className="flex items-center justify-between mb-2">
      <div className="p-2 bg-slate-800 rounded-lg text-blue-400 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      {trend && <span className="text-[10px] bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full font-bold">{trend}</span>}
    </div>
    <div className="text-2xl font-bold text-slate-100 mb-1">{value}</div>
    <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">{title}</div>
  </div>
);

export const AnalysisView: React.FC = () => {
  const { chapters } = useStore();
  const { characters } = useCharacters();

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
        name: `Cap. ${index + 1}`,
        title: chapter.title,
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
      <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4 glass rounded-3xl border border-slate-700">
        <BarChart3 className="w-16 h-16 opacity-10" />
        <p className="text-sm">Inizia a scrivere per visualizzare le analisi del tuo manoscritto.</p>
      </div>
    );
  }

  return (
    <div className="p-6 h-full overflow-y-auto custom-scrollbar space-y-8 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent">Analisi Manoscritto</h1>
          <p className="text-slate-500 text-sm mt-1 italic">Approfondimenti statistici sulla tua opera.</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-800/50 p-1 rounded-xl border border-slate-700">
           <button className="px-4 py-2 bg-blue-600 rounded-lg text-xs font-bold shadow-lg shadow-blue-900/40">Realtime Stats</button>
           <button className="px-4 py-2 text-slate-400 text-xs font-bold hover:text-slate-200 transition-colors">Export Report</button>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="Parole Totali" value={stats.totalWords.toLocaleString()} icon={<Book className="w-5 h-5" />} trend="+12%" />
        <MetricCard title="Tempo di Lettura" value={`${stats.readingTime} min`} icon={<Clock className="w-5 h-5" />} />
        <MetricCard title="Ricchezza Lessicale" value={stats.diversity} icon={<TrendingUp className="w-5 h-5" />} />
        <MetricCard title="Lunghezza Media Cap." value={Math.round(stats.totalWords / chapters.length).toLocaleString()} icon={<Layout className="w-5 h-5" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chapter Balance Chart */}
        <div className="lg:col-span-2 glass p-8 rounded-3xl border border-slate-700/50 shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              Bilanciamento Capitoli
            </h2>
            <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500 bg-slate-800 px-3 py-1 rounded-full">Word Count</div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.chapterData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} dy={10} />
                <YAxis stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="words" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Character Mentions */}
        <div className="glass p-8 rounded-3xl border border-slate-700/50 shadow-xl flex flex-col">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-8">
            <Users className="w-5 h-5 text-purple-400" />
            Presenza Personaggi
          </h2>
          <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.characterMentions}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                >
                  {stats.characterMentions.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }}
                />
                <Legend layout="vertical" verticalAlign="middle" align="right" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-8">
        {/* Prose Rhythm / Pacing Line Chart */}
        <div className="glass p-8 rounded-3xl border border-slate-700/50 shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-400" />
              Ritmo Narrativo
            </h2>
            <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500 bg-slate-800 px-3 py-1 rounded-full">Avg Words per Sentence</div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.chapterData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} dy={10} />
                <YAxis stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }}
                />
                <Area type="monotone" dataKey="pacing" stroke="#10b981" strokeWidth={3} fill="url(#areaGradient)" dot={{ r: 4, fill: '#10b981' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-6 text-[10px] text-slate-500 italic">
            I picchi indicano una prosa più analitica o descrittiva (periodi lunghi), le valli indicano scene incalzanti o dialoghi brevissimi.
          </p>
        </div>

        {/* Vocabulary Lab */}
        <div className="grid grid-cols-1 gap-4">
           <div className="glass p-8 rounded-3xl border border-slate-700/50 shadow-xl">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-6">
                <Hash className="w-5 h-5 text-yellow-400" />
                Laboratorio Vocabolario
              </h2>
              <div className="space-y-4">
                {stats.topWords.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4">
                    <span className="text-xs font-mono text-slate-500 w-4">{idx + 1}.</span>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-slate-200">{item.word}</span>
                        <span className="text-[10px] text-slate-500">{item.count} occorrenze</span>
                      </div>
                      <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500/50 rounded-full transition-all duration-1000" 
                          style={{ width: `${(item.count / stats.topWords[0].count) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
           </div>
           
           <div className="bg-blue-600/10 border border-blue-500/20 p-6 rounded-3xl flex items-center gap-4">
              <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-900/40">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-sm font-bold text-blue-400">Analisi AI Disponibile</div>
                <p className="text-xs text-slate-500">Usa l'AI Sidekick per ricevere un report qualitativo sul tono e l'arco narrativo.</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

const Zap: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
  </svg>
);
