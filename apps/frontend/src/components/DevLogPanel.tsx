import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';

export const DevLogPanel = () => {
  const isDevMode = useGameStore((state) => state.isDevMode);
  const gameLogs = useGameStore((state) => state.gameLogs);
  const toggleDevMode = useGameStore((state) => state.toggleDevMode);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<'ALL' | 'GAME'>('GAME');

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [gameLogs, isDevMode, filter]);

  if (!isDevMode) return null;

  const handleClear = () => {
    useGameStore.setState({ gameLogs: [] });
  };

  const filteredLogs = gameLogs.filter((log) => {
    if (filter === 'ALL') return true;
    // Show only [GAME], [SCORE], or [TRICK] tagged logs (or untagged errors)
    return (
      log.includes('[GAME]') ||
      log.includes('[SCORE]') ||
      log.includes('[TRICK]') ||
      log.includes('[SYSTEM]') ||
      log.toLowerCase().includes('error')
    );
  });

  return (
    <div
      className="fixed bottom-4 right-4 w-[350px] max-h-[400px] flex flex-col z-[9999] 
                    bg-black/85 backdrop-blur-md text-white rounded-lg 
                    shadow-2xl border border-white/10 overflow-hidden font-mono"
    >
      {/* Header */}
      <div className="flex justify-between items-center px-3 py-2 bg-white/5 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-gray-300">Logs</span>
          </div>
          {/* Filters */}
          <div className="flex bg-black/40 rounded p-0.5 border border-white/5">
            <button
              onClick={() => setFilter('GAME')}
              className={`px-2 py-0.5 text-[9px] rounded ${
                filter === 'GAME'
                  ? 'bg-amber-500 text-black font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              GAME
            </button>
            <button
              onClick={() => setFilter('ALL')}
              className={`px-2 py-0.5 text-[9px] rounded ${
                filter === 'ALL'
                  ? 'bg-blue-500 text-white font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              ALL
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleClear}
            className="text-[10px] px-2 py-1 rounded bg-white/5 hover:bg-white/10 
                       text-gray-400 hover:text-white transition-all duration-200"
          >
            CLR
          </button>
          <button
            onClick={() => toggleDevMode(false)}
            className="text-[10px] px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 
                       text-red-400 hover:text-red-300 transition-all duration-200"
          >
            X
          </button>
        </div>
      </div>

      {/* Log List */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-1 text-[10px] leading-relaxed scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
        style={{ minHeight: '150px' }}
      >
        {filteredLogs.length === 0 ? (
          <div className="text-center text-gray-600 italic py-8">
            {filter === 'GAME' ? 'Waiting for game events...' : 'Waiting for logs...'}
          </div>
        ) : (
          filteredLogs.map((log, index) => {
            const isError = log.toLowerCase().includes('error');
            const isGame = log.includes('[GAME]') || log.includes('[TRICK]');
            const isScore = log.includes('[SCORE]');
            const isInfo = log.includes('[INFO]');

            let colorClass = 'text-gray-400';
            if (isError) colorClass = 'text-red-400';
            else if (isScore) colorClass = 'text-yellow-400 font-bold';
            else if (isGame) colorClass = 'text-green-400';
            else if (isInfo) colorClass = 'text-blue-300/70';

            return (
              <div
                key={index}
                className={`break-words transition-colors border-b border-white/5 pb-1 mb-1 last:border-0 ${colorClass}`}
              >
                {/* Log format expected: [HH:MM:SS] [TAG] Message */}
                <span className="text-gray-600 mr-1.5 text-[9px]">
                  {log.split(']')[0] ? log.split(']')[0].replace('[', '') : ''}
                </span>
                <span>{log.split('] ').slice(1).join('] ') || log.split(']')[1] || log}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
