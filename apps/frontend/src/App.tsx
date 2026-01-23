import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TelegramProvider, useTelegram } from './providers';
import { useGameStore } from './store';
import { GameScreen } from './screens';
import { LanguageSwitcher } from './components/LanguageSwitcher';

/**
 * Lobby screen - shown before game starts
 */
function LobbyScreen() {
  const { t } = useTranslation();
  const { user, isTelegram } = useTelegram();
  const { connectionStatus, lobbyStatus, findGame, playersInRoom, requiredPlayers, leaveQueue } =
    useGameStore();

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 to-green-950 flex flex-col items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>

      <div className="text-center text-white max-w-md w-full">
        {/* Header */}
        <h1 className="text-4xl font-bold mb-2">{t('lobby.title')}</h1>
        <p className="text-lg opacity-80 mb-8">{t('lobby.subtitle')}</p>

        {/* User info */}
        {user && (
          <div className="bg-white/10 rounded-lg p-4 mb-6">
            <p className="text-sm opacity-60">{t('lobby.playingAs')}</p>
            <p className="text-xl font-semibold">
              {user.firstName} {user.lastName || ''}
            </p>
            {!isTelegram && <p className="text-xs text-yellow-400 mt-1">{t('lobby.devMode')}</p>}
          </div>
        )}

        {/* Connection status */}
        <div className="mb-6">
          <div className="flex items-center justify-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected'
                  ? 'bg-green-400'
                  : connectionStatus === 'connecting'
                    ? 'bg-yellow-400 animate-pulse'
                    : connectionStatus === 'error'
                      ? 'bg-red-400'
                      : 'bg-gray-400'
              }`}
            />
            <span className="text-sm opacity-60 capitalize">{connectionStatus}</span>
          </div>
        </div>

        {/* Lobby status */}
        {lobbyStatus === 'idle' && connectionStatus === 'connected' && (
          <button
            onClick={findGame}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-8 rounded-xl transition-colors text-lg"
          >
            {t('lobby.findGame')}
          </button>
        )}

        {lobbyStatus === 'searching' && (
          <div className="bg-white/10 rounded-lg p-6">
            <div className="animate-spin w-8 h-8 border-4 border-white/30 border-t-white rounded-full mx-auto mb-4" />
            <p className="text-lg">{t('lobby.searching')}</p>
          </div>
        )}

        {lobbyStatus === 'waiting' && (
          <div className="bg-white/10 rounded-lg p-6">
            <p className="text-lg mb-2">{t('lobby.waiting')}</p>
            <p className="text-3xl font-bold">
              {playersInRoom} / {requiredPlayers}
            </p>
          </div>
        )}

        {(lobbyStatus === 'searching' || lobbyStatus === 'waiting') && (
          <button
            onClick={leaveQueue}
            className="mt-6 w-full py-3 px-4 bg-red-500/20 hover:bg-red-500/30 active:bg-red-500/40 border border-red-500/30 rounded-xl text-red-100 font-medium transition-all backdrop-blur-sm"
          >
            {t('lobby.leaveQueue')}
          </button>
        )}

        {lobbyStatus === 'starting' && (
          <div className="bg-white/10 rounded-lg p-6">
            <div className="animate-spin w-8 h-8 border-4 border-white/30 border-t-white rounded-full mx-auto mb-4" />
            <p className="text-lg">{t('lobby.starting')}</p>
          </div>
        )}
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
      <div className="min-h-screen bg-gradient-to-b from-green-900 to-green-950 flex items-center justify-center">
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
      <GameContent />
    </TelegramProvider>
  );
}

export default App;
