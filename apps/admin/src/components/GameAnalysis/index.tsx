import React, { useState, useMemo } from 'react';
import {
  Box,
  Text,
  Badge,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Label,
  Button,
  Icon,
} from '@adminjs/design-system';
import { BasePropertyProps } from 'adminjs';

// --- Interfaces ---

interface AnalysisCard {
  cardId: string;
  cardType: string | null;
  suit: string | null;
  rank: string | null;
  jokerOption: string | null;
  requestedSuit: string | null;
}

interface AnalysisTrick {
  index: number;
  leaderId: string | null;
  winnerId: string | null;
  winnerTricks: number | null;
  cards: Array<{ playerId: string; card: AnalysisCard; at: number }>;
  handsBefore?: Record<string, AnalysisCard[]>;
  handsAfter?: Record<string, AnalysisCard[]>;
}

interface AnalysisRound {
  round: number;
  pulka: number;
  cardsPerPlayer: number | null;
  dealerId: string | null;
  trump: string | null;
  bets: Record<string, number>;
  tricks: AnalysisTrick[];
  scores: Record<string, number> | null;
}

interface AnalysisEvent {
  index: number;
  action: string;
  playerId: string;
  timestamp: number;
  round: number;
  pulka: number;
  trickIndex: number | null;
  data: Record<string, unknown> | null;
}

interface GameAnalysis {
  players: Record<string, unknown>[];
  rounds: AnalysisRound[];
  events: AnalysisEvent[];
  eventTypes: string[];
  hasHands: boolean;
}

// --- Helpers ---

const getSuitSymbol = (suit: string | null) => {
  switch (suit) {
    case 'HEARTS':
      return '♥';
    case 'DIAMONDS':
      return '♦';
    case 'CLUBS':
      return '♣';
    case 'SPADES':
      return '♠';
    default:
      return '';
  }
};

const getSuitColor = (suit: string | null) => {
  switch (suit) {
    case 'HEARTS':
    case 'DIAMONDS':
      return '#e11d48'; // Rose-600
    case 'CLUBS':
    case 'SPADES':
      return '#334155'; // Slate-700
    default:
      return '#64748b'; // Slate-500
  }
};

const CardView: React.FC<{ card: AnalysisCard }> = ({ card }) => {
  if (card.cardType === 'JOKER') {
    return (
      <Box
        as="span"
        display="inline-flex"
        alignItems="center"
        justifyContent="center"
        py="xs"
        px="sm"
        mr="xs"
        mb="xs"
        bg="primary.10"
        style={{
          borderRadius: '6px',
          border: '1px solid #7c3aed',
          color: '#7c3aed',
          fontWeight: 600,
          fontSize: '13px',
          minWidth: '36px',
        }}
      >
        <Icon icon="Star" size={12} style={{ marginRight: 4 }} />
        JOKER {card.jokerOption ? `(${card.jokerOption.substring(0, 1)})` : ''}
      </Box>
    );
  }

  const symbol = getSuitSymbol(card.suit);
  const color = getSuitColor(card.suit);

  return (
    <Box
      as="span"
      display="inline-flex"
      alignItems="center"
      justifyContent="center"
      py="xs"
      px="sm"
      bg="white"
      mr="xs"
      mb="xs"
      style={{
        borderRadius: '6px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        fontWeight: 600,
        fontSize: '13px',
        minWidth: '36px',
        color,
      }}
    >
      <span style={{ marginRight: 2 }}>{card.rank}</span>
      <span>{symbol}</span>
    </Box>
  );
};

const GameAnalysisComponent: React.FC<BasePropertyProps> = (props) => {
  const { record } = props;
  const analysisJson = record?.params?.analysisJson;

  const [selectedRoundIndex, setSelectedRoundIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'structured' | 'timeline'>('structured');
  const [filterAction, setFilterAction] = useState<string>('');
  const [filterPlayer, setFilterPlayer] = useState<string>('');

  const analysis: GameAnalysis | null = useMemo(() => {
    if (!analysisJson) return null;
    try {
      return JSON.parse(analysisJson);
    } catch (e) {
      console.error('Failed to parse analysis JSON', e);
      return null;
    }
  }, [analysisJson]);

  const playersMap = useMemo(() => {
    const map = new Map();
    if (analysis) {
      analysis.players.forEach((p) => map.set(String(p.id), p.name || p.username || p.id));
    }
    return map;
  }, [analysis]);

  const getPlayerName = (id: string | null) => (id ? playersMap.get(id) || id : 'Unknown');

  const filteredEvents = useMemo(() => {
    if (!analysis || !analysis.events) return [];
    return analysis.events.filter((e) => {
      if (filterAction && e.action !== filterAction) return false;
      if (filterPlayer && e.playerId !== filterPlayer) return false;
      return true;
    });
  }, [analysis, filterAction, filterPlayer]);

  if (!analysis) {
    return (
      <Box p="xl" bg="white" style={{ borderRadius: '8px' }}>
        <Text>No analysis data available or invalid JSON.</Text>
      </Box>
    );
  }

  const currentRound = analysis.rounds[selectedRoundIndex];

  return (
    <Box>
      <Box flex flexDirection="row" justifyContent="space-between" alignItems="center" mb="xl">
        <Text as="h2" fontSize="2xl" fontWeight="bold">
          Game Replay
        </Text>
        <Box flex gap="default">
          <Button
            variant={viewMode === 'structured' ? 'primary' : 'light'}
            onClick={() => setViewMode('structured')}
            size="sm"
          >
            <Icon icon="Layout" style={{ marginRight: 8 }} /> Round View
          </Button>
          <Button
            variant={viewMode === 'timeline' ? 'primary' : 'light'}
            onClick={() => setViewMode('timeline')}
            size="sm"
          >
            <Icon icon="List" style={{ marginRight: 8 }} /> Timeline View
          </Button>
        </Box>
      </Box>

      {/* Structured View */}
      {viewMode === 'structured' && (
        <>
          <Box mb="xl" style={{ overflowX: 'auto', whiteSpace: 'nowrap', paddingBottom: '8px' }}>
            {analysis.rounds.map((r, idx) => {
              const isActive = idx === selectedRoundIndex;
              return (
                <Button
                  key={`${r.pulka}-${r.round}`}
                  variant={isActive ? 'primary' : 'light'}
                  size="sm"
                  onClick={() => setSelectedRoundIndex(idx)}
                  style={{
                    marginRight: '8px',
                    opacity: isActive ? 1 : 0.7,
                  }}
                >
                  P{r.pulka}-R{r.round}
                </Button>
              );
            })}
          </Box>

          {currentRound ? (
            <Box animate>
              <Box
                flex
                flexDirection="row"
                justifyContent="space-between"
                alignItems="center"
                p="lg"
                mb="xl"
                bg="white"
                style={{
                  borderRadius: '12px',
                  border: '1px solid #edf2f7',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                }}
              >
                <Box>
                  <Label>Round Details</Label>
                  <Text fontSize="lg" fontWeight="bold">
                    Pulka {currentRound.pulka} · Round {currentRound.round}
                  </Text>
                  <Text color="grey.60">{currentRound.cardsPerPlayer} cards per player</Text>
                </Box>

                <Box textAlign="center">
                  <Label>Trump</Label>
                  <Box flex alignItems="center" gap="sm">
                    {currentRound.trump === 'NO_TRUMP' ? (
                      <Badge variant="light">NO TRUMP</Badge>
                    ) : (
                      <>
                        <Text fontSize="3xl" lineHeight="1">
                          {getSuitSymbol(currentRound.trump)}
                        </Text>
                        <Text fontWeight="bold" color={getSuitColor(currentRound.trump)}>
                          {currentRound.trump}
                        </Text>
                      </>
                    )}
                  </Box>
                </Box>

                <Box textAlign="right">
                  <Label>Dealer</Label>
                  <Badge variant="info">{getPlayerName(currentRound.dealerId)}</Badge>
                </Box>
              </Box>

              {/* Bets Section */}
              <Box
                mb="xl"
                bg="white"
                border="default"
                style={{
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.02)',
                }}
              >
                <Box px="xl" py="lg" borderBottom="default" bg="grey.20">
                  <Text as="h3" fontSize="lg" fontWeight="bold" color="grey.80">
                    Bets
                  </Text>
                </Box>
                <Box p="xl">
                  <Box flex flexWrap="wrap" gap="xl">
                    {Object.entries(currentRound.bets).map(([pid, bet]) => (
                      <Box
                        key={pid}
                        p="md"
                        bg="grey.10"
                        style={{ borderRadius: '8px', minWidth: '120px' }}
                      >
                        <Text variant="sm" color="grey.60" mb="xs">
                          {getPlayerName(pid)}
                        </Text>
                        <Text fontSize="2xl" fontWeight="bold">
                          {bet}
                        </Text>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Box>

              {/* Tricks Section */}
              <Box
                mb="xl"
                bg="white"
                border="default"
                style={{
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.02)',
                }}
              >
                <Box px="xl" py="lg" borderBottom="default" bg="grey.20">
                  <Text as="h3" fontSize="lg" fontWeight="bold" color="grey.80">
                    Tricks ({currentRound.tricks.length})
                  </Text>
                </Box>
                <Box p="xl">
                  {currentRound.tricks.map((trick, tIdx) => (
                    <Box
                      key={tIdx}
                      mb="xl"
                      style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        p="md"
                        bg="grey.10"
                        flex
                        justifyContent="space-between"
                        alignItems="center"
                        style={{ borderBottom: '1px solid #e2e8f0' }}
                      >
                        <Text fontWeight="bold">Trick {trick.index}</Text>
                        <Box flex alignItems="center" gap="sm">
                          <Text variant="sm" color="grey.60">
                            Winner:
                          </Text>
                          <Badge variant="success">{getPlayerName(trick.winnerId)}</Badge>
                          <Badge variant="light">{trick.winnerTricks} trick(s)</Badge>
                        </Box>
                      </Box>

                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Player</TableCell>
                            <TableCell>Card Played</TableCell>
                            <TableCell>Role</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {trick.cards.map((c, cIdx) => (
                            <TableRow key={cIdx}>
                              <TableCell>
                                <Text
                                  fontWeight={c.playerId === trick.winnerId ? 'bold' : 'normal'}
                                >
                                  {getPlayerName(c.playerId)}
                                </Text>
                              </TableCell>
                              <TableCell>
                                <CardView card={c.card} />
                              </TableCell>
                              <TableCell>
                                {c.playerId === trick.leaderId && (
                                  <Badge size="sm" variant="info">
                                    LEAD
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>

                      {analysis.hasHands && trick.handsBefore && (
                        <Box p="lg" bg="white" style={{ borderTop: '1px dashed #e2e8f0' }}>
                          <Label mb="sm">Hands before trick</Label>
                          <Box flex flexWrap="wrap" gap="lg">
                            {Object.entries(trick.handsBefore).map(([pid, cards]) => (
                              <Box key={pid} style={{ minWidth: '200px' }}>
                                <Text
                                  variant="xs"
                                  color="grey.60"
                                  mb="xs"
                                  textTransform="uppercase"
                                  fontWeight="bold"
                                >
                                  {getPlayerName(pid)}
                                </Text>
                                <Box>
                                  {cards.map((card, i) => (
                                    <CardView key={i} card={card} />
                                  ))}
                                  {cards.length === 0 && (
                                    <Text variant="sm" color="grey.40">
                                      Empty
                                    </Text>
                                  )}
                                </Box>
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      )}
                    </Box>
                  ))}
                </Box>
              </Box>

              {/* Round Results Section */}
              {currentRound.scores && (
                <Box
                  mb="xl"
                  bg="white"
                  border="default"
                  style={{
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.02)',
                  }}
                >
                  <Box px="xl" py="lg" borderBottom="default" bg="grey.20">
                    <Text as="h3" fontSize="lg" fontWeight="bold" color="grey.80">
                      Round Results
                    </Text>
                  </Box>
                  <Box p="xl">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Player</TableCell>
                          <TableCell>Bid</TableCell>
                          <TableCell>Tricks Won</TableCell>
                          <TableCell>Round Score</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Object.entries(currentRound.scores).map(([pid, score]) => {
                          const wonCount = currentRound.tricks.filter(
                            (t) => t.winnerId === pid,
                          ).length;
                          const bid = currentRound.bets[pid] || 0;
                          return (
                            <TableRow key={pid}>
                              <TableCell>{getPlayerName(pid)}</TableCell>
                              <TableCell>{bid}</TableCell>
                              <TableCell>{wonCount}</TableCell>
                              <TableCell>
                                <Badge variant={score > 0 ? 'success' : 'danger'}>
                                  {score > 0 ? `+${score}` : score}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </Box>
                </Box>
              )}
            </Box>
          ) : (
            <Box
              p="xxl"
              textAlign="center"
              bg="white"
              style={{ borderRadius: '12px', border: '1px dashed #cbd5e1' }}
            >
              <Icon icon="Layout" size={32} color="grey.40" />
              <Text mt="md" color="grey.60">
                Select a round from above to view details.
              </Text>
            </Box>
          )}
        </>
      )}

      {/* Timeline View */}
      {viewMode === 'timeline' && (
        <Box bg="white" p="xl" style={{ borderRadius: '12px', border: '1px solid #edf2f7' }}>
          <Box flex gap="lg" mb="xl">
            <Box flexGrow={1}>
              <Label>Filter by Action</Label>
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#f8fafc',
                }}
              >
                <option value="">All Actions</option>
                {analysis.eventTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </Box>
            <Box flexGrow={1}>
              <Label>Filter by Player</Label>
              <select
                value={filterPlayer}
                onChange={(e) => setFilterPlayer(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#f8fafc',
                }}
              >
                <option value="">All Players</option>
                {analysis.players.map((p: any) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.name || p.username || p.id}
                  </option>
                ))}
              </select>
            </Box>
          </Box>

          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Time</TableCell>
                <TableCell>Context</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Player</TableCell>
                <TableCell>Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredEvents.map((event) => (
                <TableRow key={event.index}>
                  <TableCell>
                    <Text variant="sm" color="grey.60">
                      {new Date(event.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </Text>
                  </TableCell>
                  <TableCell>
                    <Badge variant="light" size="sm">
                      P{event.pulka}-R{event.round}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="primary" size="sm">
                      {event.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Text fontWeight="bold">{getPlayerName(event.playerId)}</Text>
                  </TableCell>
                  <TableCell>
                    {event.action === 'CARD' && event.data?.cardId && (
                      <CardView
                        card={{
                          cardId: String(event.data.cardId),
                          cardType: event.data.cardType as string,
                          suit: event.data.suit as string,
                          rank: event.data.rank as string,
                          jokerOption: event.data.jokerOption as string,
                          requestedSuit: event.data.requestedSuit as string,
                        }}
                      />
                    )}
                    {event.action === 'BET' && (
                      <Text>
                        Bet <strong>{String(event.data?.amount)}</strong>
                      </Text>
                    )}
                    {event.action === 'TRUMP' && (
                      <Text>
                        Selected Trump: <strong>{String(event.data?.trump)}</strong>
                      </Text>
                    )}
                    {event.action === 'TRICK_WINNER' && (
                      <Text>
                        Won trick with <strong>{String(event.data?.tricks)}</strong> points
                      </Text>
                    )}
                    {!['CARD', 'BET', 'TRUMP', 'TRICK_WINNER'].includes(event.action) &&
                      event.data && (
                        <Text variant="sm" color="grey.60">
                          {JSON.stringify(event.data).substring(0, 50)}
                        </Text>
                      )}
                  </TableCell>
                </TableRow>
              ))}
              {filteredEvents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} style={{ textAlign: 'center', padding: '32px' }}>
                    <Text color="grey.40">No events found matching your filters</Text>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      )}

      {!analysis.hasHands && (
        <Box mt="xl" p="md" bg="info.10" style={{ borderRadius: '6px' }}>
          <Text variant="sm" color="info.100">
            Note: Detailed hand data is not available for this game analysis (server might be
            configured to not store hands for privacy/storage reasons).
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default GameAnalysisComponent;
