import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';

export const DevLogPanel = () => {
  const isDevMode = useGameStore((state) => state.isDevMode);
  const gameLogs = useGameStore((state) => state.gameLogs);
  const toggleDevMode = useGameStore((state) => state.toggleDevMode);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [gameLogs, isDevMode]);

  if (!isDevMode) return null;

  const handleClear = () => {
    useGameStore.setState({ gameLogs: [] });
  };

  return (
    <div
      className="fixed bottom-4 right-4 w-[300px] max-h-[300px] flex flex-col z-[9999] 
                    bg-black/85 backdrop-blur-md text-white rounded-lg 
                    shadow-2xl border border-white/10 overflow-hidden font-mono"
    >
      {/* Header */}
      <div className="flex justify-between items-center px-3 py-2 bg-white/5 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-gray-300">Dev Logs</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleClear}
            className="text-[10px] px-2 py-1 rounded bg-white/5 hover:bg-white/10 
                       text-gray-400 hover:text-white transition-all duration-200"
          >
            CLEAR
          </button>
          <button
            onClick={() => toggleDevMode(false)}
            className="text-[10px] px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 
                       text-red-400 hover:text-red-300 transition-all duration-200"
          >
            CLOSE
          </button>
        </div>
      </div>

      {/* Log List */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-1 text-[10px] leading-relaxed scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
        style={{ minHeight: '150px' }}
      >
        {gameLogs.length === 0 ? (
          <div className="text-center text-gray-600 italic py-8">Waiting for events...</div>
        ) : (
          gameLogs.map((log, index) => (
            <div
              key={index}
              className="break-words text-gray-300 hover:text-white transition-colors border-b border-white/5 pb-1 mb-1 last:border-0"
            >
              {/* Log format expected: [HH:MM:SS] Message */}
              <span className="text-gray-500 mr-1.5">
                {log.split(']')[0] ? log.split(']')[0] + ']' : ''}
              </span>
              <span className={log.toLowerCase().includes('error') ? 'text-red-400' : ''}>
                {log.split(']')[1] || log}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
