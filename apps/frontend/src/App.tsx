import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TelegramProvider, useTelegram } from './providers';
import { useGameStore } from './store';
import { GameScreen } from './screens';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { LobbyTable } from './components/LobbyTable';
import { RotateDeviceOverlay } from './components/RotateDeviceOverlay';

/**
 * Lobby screen - shown before game starts
 */
function LobbyScreen() {
  const { t } = useTranslation();
  const { user, isTelegram } = useTelegram();
  const { connectionStatus, lobbyStatus, findGame, leaveQueue } = useGameStore();

  return (
    <div className="min-h-full bg-gradient-to-b from-green-900 to-green-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div
        className="absolute inset-0 z-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `url('https://www.transparenttextures.com/patterns/felt.png')`,
        }}
      />

      <div className="absolute top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>

      <div className="relative z-10 w-full flex flex-col items-center">
        {/* Title Section (only show if not searching/waiting to save space) */}
        {(lobbyStatus === 'idle' || connectionStatus !== 'connected') && (
          <div className="text-center text-white max-w-md w-full mb-8">
            <h1 className="text-5xl font-black mb-2 tracking-tighter text-amber-400 drop-shadow-lg">
              {t('lobby.title')}
            </h1>
            <p className="text-lg opacity-80 font-serif italic text-amber-100/60">
              {t('lobby.subtitle')}
            </p>
          </div>
        )}

        {/* Status Indicator */}
        <div className="mb-6 flex items-center justify-center gap-2 bg-black/20 px-4 py-1 rounded-full backdrop-blur-sm">
          <div
            className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected'
                ? 'bg-green-400 shadow-[0_0_10px_#4ade80]'
                : connectionStatus === 'connecting'
                  ? 'bg-yellow-400 animate-pulse'
                  : 'bg-red-400'
            }`}
          />
          <span className="text-xs font-medium text-white/60 uppercase tracking-widest">
            {connectionStatus}
          </span>
        </div>

        {/* Main Action Area */}
        <div className="w-full max-w-4xl flex flex-col items-center">
          {/* Searching/Waiting View: Show Table */}
          {(lobbyStatus === 'searching' ||
            lobbyStatus === 'waiting' ||
            lobbyStatus === 'starting') && (
            <div className="w-full flex flex-col items-center animate-in fade-in zoom-in duration-500">
              <LobbyTable />

              <button
                onClick={leaveQueue}
                className="mt-8 py-2 px-6 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-full text-red-200 text-sm font-medium transition-all backdrop-blur-sm"
              >
                {t('lobby.leaveQueue')}
              </button>
            </div>
          )}

          {/* Idle View: Show Start Button */}
          {lobbyStatus === 'idle' && connectionStatus === 'connected' && (
            <div className="bg-white/5 p-8 rounded-3xl border border-white/10 backdrop-blur-md shadow-2xl w-full max-w-sm animate-in slide-in-from-bottom-8 duration-700">
              {user && (
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/10">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-xl font-bold text-white shadow-inner">
                    {user.firstName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider">
                      {t('lobby.playingAs')}
                    </p>
                    <p className="text-lg font-bold text-white leading-none">
                      {user.firstName} {user.lastName}
                    </p>
                  </div>
                </div>
              )}

              <button
                onClick={findGame}
                className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-b from-amber-400 to-orange-600 p-[1px] shadow-[0_10px_40px_-10px_rgba(245,158,11,0.5)] transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="relative h-full w-full rounded-2xl bg-gradient-to-b from-amber-500 to-orange-600 px-8 py-6 transition-all group-hover:bg-opacity-90">
                  <span className="relative text-2xl font-black uppercase tracking-widest text-white drop-shadow-md">
                    {t('lobby.findGame')}
                  </span>
                </div>
              </button>

              {!isTelegram && (
                <p className="text-center text-xs text-white/20 mt-4">{t('lobby.devMode')}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Main game content - decides whether to show Lobby or Game
 */
function GameContent() {
  const { t } = useTranslation();
  const { user, isReady } = useTelegram();
  const { gameState, initialize } = useGameStore();

  // Initialize store when Telegram is ready
  useEffect(() => {
    if (isReady && user) {
      initialize(user);
    }
  }, [isReady, user, initialize]);

  // Loading state
  if (!isReady) {
    return (
      <div className="min-h-full bg-gradient-to-b from-green-900 to-green-950 flex items-center justify-center">
        <p className="text-white text-sm opacity-60 animate-pulse">{t('lobby.initializing')}</p>
      </div>
    );
  }

  // Show GameScreen if game is active, otherwise show Lobby
  const isGameActive = gameState && gameState.phase !== 'waiting' && gameState.phase !== 'finished';

  if (isGameActive) {
    return <GameScreen />;
  }

  return <LobbyScreen />;
}

/**
 * Root App component
 */
function App() {
  return (
    <TelegramProvider>
      <RotateDeviceOverlay />
      <GameContent />
    </TelegramProvider>
  );
}

export default App;
