import React, { useMemo } from 'react';
import { Player, TableCard, Suit } from '@joker/shared';
import Card from './Card';
import PlayerInfo from './PlayerInfo';

interface TableProps {
  players: Player[];
  tableCards: TableCard[];
  trump: Suit | null;
  currentPlayerId?: string;
  myPlayerId: string;
  className?: string;
  isJokerTrump?: boolean;
}

type Position = 'bottom-left' | 'top-left' | 'top-center' | 'top-right' | 'bottom-right';

export const Table: React.FC<TableProps> = ({
  players,
  tableCards,
  trump,
  currentPlayerId,
  myPlayerId,
  className = '',
  isJokerTrump = false,
}) => {
  // 1. Calculate Positions
  const orderedPlayers = useMemo(() => {
    if (!players.length) return [];
    const myIndex = players.findIndex((p) => p.id === myPlayerId);
    if (myIndex === -1) return players;

    // Rotate array so myIndex is 0 (Me)
    const rotated = [...players.slice(myIndex), ...players.slice(0, myIndex)];
    return rotated;
  }, [players, myPlayerId]);

  // Map relative index (0=Me) to physical table slots based on player count
  const getPosition = (index: number, total: number): Position => {
    if (index === 0) return 'bottom-left'; // Me

    if (total === 2) {
      return 'top-right'; // Head to head
    }
    if (total === 3) {
      if (index === 1) return 'top-center';
      return 'bottom-right';
    }
    if (total === 4) {
      if (index === 1) return 'top-left';
      if (index === 2) return 'top-right';
      return 'bottom-right';
    }
    // 5+ players
    const positions: Position[] = [
      'bottom-left',
      'top-left',
      'top-center',
      'top-right',
      'bottom-right',
    ];
    return positions[index % positions.length];
  };

  // Helper to find visual position of a specific playerId
  const getPlayerPosition = (pid: string): Position => {
    const index = orderedPlayers.findIndex((p) => p.id === pid);
    if (index === -1) return 'bottom-left';
    return getPosition(index, orderedPlayers.length);
  };

  // 2. Render Players
  const renderPlayer = (player: Player, index: number) => {
    const position = getPosition(index, orderedPlayers.length);
    const isTurn = player.id === currentPlayerId;

    // Absolute positioning styles around the oval
    // We push them outward from the table edge
    const posStyles: Record<Position, string> = {
      'bottom-left': '-bottom-8 left-[20%] translate-y-full',
      'top-left': 'top-[15%] -left-12 -translate-x-full', // moved up slightly
      'top-center': '-top-12 left-1/2 -translate-x-1/2 -translate-y-full',
      'top-right': 'top-[15%] -right-12 translate-x-full', // moved up slightly
      'bottom-right': '-bottom-8 right-[20%] translate-y-full',
    };

    return (
      <div
        key={player.id}
        className={`absolute ${posStyles[position]} z-30 transition-all duration-500`}
      >
        <PlayerInfo
          player={player}
          position={position}
          isCurrentTurn={isTurn}
          onScoreClick={
            player.id === myPlayerId
              ? () => {
                  // Dispatch event or callback to open modal
                  // We need to pass this up or use context.
                  // Since Table doesn't have the callback, we need to add it or hack it.
                  // Wait, Table doesn't have onOpenScoring prop.
                  // I need to add onOpenScoring to Table props.
                  const event = new CustomEvent('openScoringModal');
                  window.dispatchEvent(event);
                }
              : undefined
          }
        />
      </div>
    );
  };

  // 3. Render Table Cards
  // Cards float in the center area, offset towards their owner
  const renderTableCards = () => {
    return tableCards.map((tc, i) => {
      const pos = getPlayerPosition(tc.playerId);

      // Calculate offsets based on position to create a "pile" in the center but clear who played what
      // Oval center is 0,0
      const offsets: Record<Position, string> = {
        'bottom-left': 'translate-y-8 -translate-x-12 rotate-[-10deg]',
        'top-left': '-translate-y-4 -translate-x-16 rotate-[-5deg]',
        'top-center': '-translate-y-12 translate-x-0',
        'top-right': '-translate-y-4 translate-x-16 rotate-[5deg]',
        'bottom-right': 'translate-y-8 translate-x-12 rotate-[10deg]',
      };

      return (
        <div
          key={`${tc.playerId}-${tc.card.id}`}
          className={`absolute transition-all duration-500 ease-out ${offsets[pos]}`}
          style={{ zIndex: 20 + i }}
        >
          <Card
            card={tc.card}
            size="md"
            className="shadow-2xl border-none"
            // Apply slight random rotation for realism
            style={{ transform: `rotate(${Math.random() * 4 - 2}deg)` }}
          />
          {/* Show Joker Request */}
          {tc.requestedSuit && (
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900/90 text-yellow-400 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full whitespace-nowrap border border-yellow-500/50 shadow-md">
              Req: {tc.requestedSuit}
            </div>
          )}
        </div>
      );
    });
  };

  const TrumpIndicator = () => {
    if (trump) {
      return (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center opacity-10 pointer-events-none z-0">
          <div
            className={`
            text-9xl font-black
            ${trump === Suit.Hearts || trump === Suit.Diamonds ? 'text-red-900' : 'text-slate-900'}
          `}
          >
            {trump === Suit.Hearts && '♥'}
            {trump === Suit.Diamonds && '♦'}
            {trump === Suit.Clubs && '♣'}
            {trump === Suit.Spades && '♠'}
          </div>
        </div>
      );
    }

    if (isJokerTrump) {
      return (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center opacity-10 pointer-events-none z-0">
          <div className="text-8xl font-black text-slate-900 flex flex-col items-center">
            <span>JOKER</span>
            <span className="text-4xl mt-2">NO TRUMP</span>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* The Oval Table Surface */}
      <div
        className="relative w-full h-full rounded-[50%] bg-[#0f3d23] shadow-[0_20px_60px_rgba(0,0,0,0.5),_inset_0_0_80px_rgba(0,0,0,0.5)]"
        style={{
          border: '12px solid #3d2211', // Wood border
          boxShadow: '0 20px 50px rgba(0,0,0,0.8), inset 0 0 100px #051c0e',
        }}
      >
        {/* Felt Texture */}
        <div className="absolute inset-0 rounded-[50%] opacity-100 bg-[radial-gradient(ellipse_at_center,_#1a5c32_0%,_#0f3d23_100%)]">
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/felt.png')]"></div>
        </div>

        {/* Center Decoration / HUD */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Center Ring - subtle felt line */}
          <div className="w-[40%] h-[40%] rounded-full border-2 border-green-800/30 flex items-center justify-center">
            <div className="w-[80%] h-[80%] rounded-full border border-green-800/20" />
          </div>

          {/* Active Status Text Overlay */}
          {currentPlayerId && (
            <div className="absolute z-10 text-center">
              <div className="text-[10px] text-yellow-500 uppercase tracking-[0.2em] mb-1 font-bold opacity-80">
                Current Turn
              </div>
              <div className="text-2xl font-bold text-white tracking-widest drop-shadow-md">
                {players.find((p) => p.id === currentPlayerId)?.name ===
                players.find((p) => p.id === myPlayerId)?.name
                  ? 'YOUR TURN'
                  : 'WAITING...'}
              </div>
            </div>
          )}
        </div>

        {/* Trump Big Watermark */}
        <TrumpIndicator />

        {/* Table Cards Area */}
        <div className="absolute inset-0 z-20 overflow-visible">
          {/* Center point anchor */}
          <div className="absolute top-1/2 left-1/2 w-0 h-0">{renderTableCards()}</div>
        </div>
      </div>

      {/* Players - Positioned absolutely around the table container */}
      {orderedPlayers.map((p, i) => renderPlayer(p, i))}

      {/* Current Trump Bubble (Small, UI) - Floating near table edge top-right */}
      {(trump || isJokerTrump) && (
        <div className="absolute -top-4 -right-4 z-40 flex flex-col items-center bg-slate-900/90 p-3 rounded-full border-2 border-yellow-600 shadow-xl">
          <span className="text-[8px] text-yellow-500 uppercase tracking-widest mb-1 font-bold">
            Trump
          </span>
          {trump ? (
            <span
              className={`text-2xl leading-none ${trump === Suit.Hearts || trump === Suit.Diamonds ? 'text-red-500' : 'text-slate-200'}`}
            >
              {trump === Suit.Hearts && '♥'}
              {trump === Suit.Diamonds && '♦'}
              {trump === Suit.Clubs && '♣'}
              {trump === Suit.Spades && '♠'}
            </span>
          ) : (
            <span className="text-xl leading-none text-slate-200 font-bold">Ø</span>
          )}
        </div>
      )}
    </div>
  );
};

export default Table;
