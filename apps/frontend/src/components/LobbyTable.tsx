import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Player } from '@joker/shared';
import Table from './Table';
import { useGameStore } from '../store/gameStore';
import { useTelegram } from '../providers';

export const LobbyTable: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useTelegram();
  const { playersInRoom, myPlayerId } = useGameStore();

  const fakePlayers = useMemo(() => {
    const players: Player[] = [];

    // 1. Add Me
    players.push({
      id: myPlayerId || 'me',
      name: user?.firstName || t('lobby.playingAs') + ' Me',
      isBot: false,
      connected: true,
      hand: [],
      bet: null,
      tricks: 0,
      roundScores: [],
      pulkaScores: [],
      totalScore: 0,
      spoiled: false,
      hadJokerInRounds: [],
    });

    // 2. Add other connected players (placeholders)
    // We start from 1 because "Me" is 0
    // playersInRoom includes me. So if 2 players total, we add 1 more.
    const othersCount = Math.max(0, playersInRoom - 1);

    for (let i = 0; i < othersCount; i++) {
      players.push({
        id: `player-${i}`,
        name: `${t('game.opponent')} ${i + 1}`,
        isBot: false,
        connected: true,
        hand: [],
        bet: null,
        tricks: 0,
        roundScores: [],
        pulkaScores: [],
        totalScore: 0,
        spoiled: false,
        hadJokerInRounds: [],
      });
    }

    // 3. Add empty slots (as disconnected/bots placeholders or just empty)
    // We want total 4 players for the table layout to work correctly (North, West, East)
    const totalSlots = 4;
    const currentCount = players.length;

    for (let i = currentCount; i < totalSlots; i++) {
      players.push({
        id: `empty-${i}`,
        name: t('game.waitingFor'),
        isBot: false,
        connected: false, // Show as disconnected/empty
        hand: [],
        bet: null,
        tricks: 0,
        roundScores: [],
        pulkaScores: [],
        totalScore: 0,
        spoiled: false,
        hadJokerInRounds: [],
      });
    }

    return players;
  }, [playersInRoom, myPlayerId, user, t]);

  return (
    <div className="w-full max-w-7xl aspect-[16/9] relative flex items-center justify-center opacity-80 scale-90">
      {/* Overlay Message */}
      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center">
        <div className="bg-black/60 backdrop-blur-sm p-6 rounded-2xl border border-white/10 text-center animate-pulse">
          <div className="text-2xl font-bold text-white mb-2">{t('lobby.searching')}</div>
          <div className="text-amber-400 font-mono text-xl">{playersInRoom} / 4</div>
        </div>
      </div>

      <Table
        players={fakePlayers}
        tableCards={[]}
        trump={null}
        myPlayerId={myPlayerId || 'me'}
        className="w-[85%] h-[65%]"
      />
    </div>
  );
};
