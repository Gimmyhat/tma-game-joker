(function (React, designSystem) {
  'use strict';

  function _interopDefault (e) { return e && e.__esModule ? e : { default: e }; }

  var React__default = /*#__PURE__*/_interopDefault(React);

  // --- Interfaces ---

  // --- Helpers ---

  const getSuitSymbol = suit => {
    if (!suit) return '';
    switch (suit.toUpperCase()) {
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
  const getSuitColor = suit => {
    if (!suit) return '#64748b';
    switch (suit.toUpperCase()) {
      case 'HEARTS':
      case 'DIAMONDS':
        return '#e11d48';
      // Rose-600
      case 'CLUBS':
      case 'SPADES':
        return '#334155';
      // Slate-700
      default:
        return '#64748b';
      // Slate-500
    }
  };
  const getSuitName = suit => {
    if (!suit) return '';
    switch (suit.toUpperCase()) {
      case 'HEARTS':
        return 'Hearts';
      case 'DIAMONDS':
        return 'Diamonds';
      case 'CLUBS':
        return 'Clubs';
      case 'SPADES':
        return 'Spades';
      case 'NO_TRUMP':
        return 'No Trump';
      default:
        return suit;
    }
  };
  const getRankDisplay = rank => {
    if (rank === null || rank === undefined) return '?';
    const numRank = typeof rank === 'string' ? parseInt(rank, 10) : rank;
    switch (numRank) {
      case 14:
        return 'A';
      case 13:
        return 'K';
      case 12:
        return 'Q';
      case 11:
        return 'J';
      case 10:
        return '10';
      default:
        return String(numRank);
    }
  };
  const getJokerOptionDisplay = option => {
    if (!option) return '';
    switch (option.toUpperCase()) {
      case 'HIGH':
        return 'HIGH';
      case 'LOW':
        return 'LOW';
      case 'TOP':
        return 'TAKE';
      case 'BOTTOM':
        return 'GIVE';
      default:
        return option;
    }
  };
  const getJokerOptionColor = option => {
    if (!option) return '#7c3aed';
    switch (option.toUpperCase()) {
      case 'HIGH':
        return '#10b981';
      // Emerald
      case 'LOW':
        return '#06b6d4';
      // Cyan
      case 'TOP':
        return '#f59e0b';
      // Amber
      case 'BOTTOM':
        return '#8b5cf6';
      // Purple
      default:
        return '#7c3aed';
    }
  };
  const CardView = ({
    card
  }) => {
    if (card.cardType === 'JOKER') {
      const optionDisplay = getJokerOptionDisplay(card.jokerOption);
      const optionColor = getJokerOptionColor(card.jokerOption);
      const requestedSuitSymbol = getSuitSymbol(card.requestedSuit);
      const requestedSuitColor = getSuitColor(card.requestedSuit);
      return /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
        as: "span",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        py: "xs",
        px: "sm",
        mr: "xs",
        mb: "xs",
        style: {
          borderRadius: '6px',
          border: `2px solid ${optionColor}`,
          backgroundColor: `${optionColor}15`,
          color: optionColor,
          fontWeight: 600,
          fontSize: '13px',
          minWidth: '36px'
        }
      }, /*#__PURE__*/React__default.default.createElement(designSystem.Icon, {
        icon: "Star",
        size: 12,
        style: {
          marginRight: 4
        }
      }), /*#__PURE__*/React__default.default.createElement("span", {
        style: {
          marginRight: requestedSuitSymbol ? 4 : 0
        }
      }, optionDisplay || 'JOKER'), requestedSuitSymbol && /*#__PURE__*/React__default.default.createElement("span", {
        style: {
          color: requestedSuitColor,
          fontWeight: 700
        }
      }, requestedSuitSymbol));
    }
    const symbol = getSuitSymbol(card.suit);
    const color = getSuitColor(card.suit);
    const rankDisplay = getRankDisplay(card.rank);
    return /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      as: "span",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      py: "xs",
      px: "sm",
      bg: "white",
      mr: "xs",
      mb: "xs",
      style: {
        borderRadius: '6px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        fontWeight: 600,
        fontSize: '14px',
        minWidth: '42px',
        color
      }
    }, /*#__PURE__*/React__default.default.createElement("span", {
      style: {
        marginRight: 2
      }
    }, rankDisplay), /*#__PURE__*/React__default.default.createElement("span", {
      style: {
        fontSize: '16px'
      }
    }, symbol));
  };
  const GameAnalysisComponent = props => {
    const {
      record
    } = props;
    const analysisJson = record?.params?.analysisJson;
    const [selectedRoundIndex, setSelectedRoundIndex] = React.useState(0);
    const [viewMode, setViewMode] = React.useState('structured');
    const [filterAction, setFilterAction] = React.useState('');
    const [filterPlayer, setFilterPlayer] = React.useState('');
    const analysis = React.useMemo(() => {
      if (!analysisJson) return null;
      try {
        return JSON.parse(analysisJson);
      } catch (e) {
        console.error('Failed to parse analysis JSON', e);
        return null;
      }
    }, [analysisJson]);
    const playersMap = React.useMemo(() => {
      const map = new Map();
      if (analysis) {
        analysis.players.forEach(p => map.set(String(p.id), p.name || p.username || p.id));
      }
      return map;
    }, [analysis]);
    const getPlayerName = id => id ? playersMap.get(id) || id : 'Unknown';
    const filteredEvents = React.useMemo(() => {
      if (!analysis || !analysis.events) return [];
      return analysis.events.filter(e => {
        if (filterAction && e.action !== filterAction) return false;
        if (filterPlayer && e.playerId !== filterPlayer) return false;
        return true;
      });
    }, [analysis, filterAction, filterPlayer]);
    if (!analysis) {
      return /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
        p: "xl",
        bg: "white",
        style: {
          borderRadius: '8px'
        }
      }, /*#__PURE__*/React__default.default.createElement(designSystem.Text, null, "No analysis data available or invalid JSON."));
    }
    const currentRound = analysis.rounds[selectedRoundIndex];
    return /*#__PURE__*/React__default.default.createElement(designSystem.Box, null, /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      flex: true,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      mb: "xl"
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Text, {
      as: "h2",
      fontSize: "2xl",
      fontWeight: "bold"
    }, "Game Replay"), /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      flex: true,
      gap: "default"
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Button, {
      variant: viewMode === 'structured' ? 'primary' : 'light',
      onClick: () => setViewMode('structured'),
      size: "sm"
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Icon, {
      icon: "Layout",
      style: {
        marginRight: 8
      }
    }), " Round View"), /*#__PURE__*/React__default.default.createElement(designSystem.Button, {
      variant: viewMode === 'timeline' ? 'primary' : 'light',
      onClick: () => setViewMode('timeline'),
      size: "sm"
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Icon, {
      icon: "List",
      style: {
        marginRight: 8
      }
    }), " Timeline View"))), viewMode === 'structured' && /*#__PURE__*/React__default.default.createElement(React__default.default.Fragment, null, /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      mb: "xl",
      style: {
        overflowX: 'auto',
        whiteSpace: 'nowrap',
        paddingBottom: '8px'
      }
    }, analysis.rounds.map((r, idx) => {
      const isActive = idx === selectedRoundIndex;
      return /*#__PURE__*/React__default.default.createElement(designSystem.Button, {
        key: `${r.pulka}-${r.round}`,
        variant: isActive ? 'primary' : 'light',
        size: "sm",
        onClick: () => setSelectedRoundIndex(idx),
        style: {
          marginRight: '8px',
          opacity: isActive ? 1 : 0.7
        }
      }, "P", r.pulka, "-R", r.round);
    })), currentRound ? /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      animate: true
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      flex: true,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      p: "lg",
      mb: "xl",
      bg: "white",
      style: {
        borderRadius: '12px',
        border: '1px solid #edf2f7',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
      }
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Box, null, /*#__PURE__*/React__default.default.createElement(designSystem.Label, null, "Round Details"), /*#__PURE__*/React__default.default.createElement(designSystem.Text, {
      fontSize: "lg",
      fontWeight: "bold"
    }, "Pulka ", currentRound.pulka, " \xB7 Round ", currentRound.round), /*#__PURE__*/React__default.default.createElement(designSystem.Text, {
      color: "grey.60"
    }, currentRound.cardsPerPlayer, " cards per player")), /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      textAlign: "center"
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Label, null, "Trump"), /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      flex: true,
      alignItems: "center",
      gap: "sm"
    }, currentRound.trump === 'NO_TRUMP' || currentRound.trump?.toUpperCase() === 'NO_TRUMP' ? /*#__PURE__*/React__default.default.createElement(designSystem.Badge, {
      variant: "light"
    }, "NO TRUMP") : currentRound.trump ? /*#__PURE__*/React__default.default.createElement(React__default.default.Fragment, null, /*#__PURE__*/React__default.default.createElement(designSystem.Text, {
      fontSize: "3xl",
      lineHeight: "1",
      style: {
        color: getSuitColor(currentRound.trump)
      }
    }, getSuitSymbol(currentRound.trump)), /*#__PURE__*/React__default.default.createElement(designSystem.Text, {
      fontWeight: "bold",
      style: {
        color: getSuitColor(currentRound.trump)
      }
    }, getSuitName(currentRound.trump))) : /*#__PURE__*/React__default.default.createElement(designSystem.Badge, {
      variant: "light"
    }, "Unknown"))), /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      textAlign: "right"
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Label, null, "Dealer"), /*#__PURE__*/React__default.default.createElement(designSystem.Badge, {
      variant: "info"
    }, getPlayerName(currentRound.dealerId)))), /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      mb: "xl",
      bg: "white",
      border: "default",
      style: {
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
      }
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      px: "xl",
      py: "lg",
      borderBottom: "default",
      bg: "grey.20"
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Text, {
      as: "h3",
      fontSize: "lg",
      fontWeight: "bold",
      color: "grey.80"
    }, "Bets")), /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      p: "xl"
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      flex: true,
      flexWrap: "wrap",
      gap: "xl"
    }, Object.entries(currentRound.bets).map(([pid, bet]) => /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      key: pid,
      p: "md",
      bg: "grey.10",
      style: {
        borderRadius: '8px',
        minWidth: '120px'
      }
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Text, {
      variant: "sm",
      color: "grey.60",
      mb: "xs"
    }, getPlayerName(pid)), /*#__PURE__*/React__default.default.createElement(designSystem.Text, {
      fontSize: "2xl",
      fontWeight: "bold"
    }, bet)))))), /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      mb: "xl",
      bg: "white",
      border: "default",
      style: {
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
      }
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      px: "xl",
      py: "lg",
      borderBottom: "default",
      bg: "grey.20"
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Text, {
      as: "h3",
      fontSize: "lg",
      fontWeight: "bold",
      color: "grey.80"
    }, "Tricks (", currentRound.tricks.length, ")")), /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      p: "xl"
    }, currentRound.tricks.map((trick, tIdx) => /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      key: tIdx,
      mb: "xl",
      style: {
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      p: "md",
      bg: "grey.10",
      flex: true,
      justifyContent: "space-between",
      alignItems: "center",
      style: {
        borderBottom: '1px solid #e2e8f0'
      }
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Text, {
      fontWeight: "bold"
    }, "Trick ", trick.index), /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      flex: true,
      alignItems: "center",
      gap: "sm"
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Text, {
      variant: "sm",
      color: "grey.60"
    }, "Winner:"), /*#__PURE__*/React__default.default.createElement(designSystem.Badge, {
      variant: "success"
    }, getPlayerName(trick.winnerId)), /*#__PURE__*/React__default.default.createElement(designSystem.Badge, {
      variant: "light"
    }, trick.winnerTricks, " trick(s)"))), /*#__PURE__*/React__default.default.createElement(designSystem.Table, null, /*#__PURE__*/React__default.default.createElement(designSystem.TableHead, null, /*#__PURE__*/React__default.default.createElement(designSystem.TableRow, null, /*#__PURE__*/React__default.default.createElement(designSystem.TableCell, null, "Player"), /*#__PURE__*/React__default.default.createElement(designSystem.TableCell, null, "Card Played"), /*#__PURE__*/React__default.default.createElement(designSystem.TableCell, null, "Role"))), /*#__PURE__*/React__default.default.createElement(designSystem.TableBody, null, trick.cards.map((c, cIdx) => {
      const isWinner = c.playerId === trick.winnerId;
      const isLead = c.playerId === trick.leaderId;
      const isTrump = c.card.cardType !== 'JOKER' && c.card.suit?.toUpperCase() === currentRound.trump?.toUpperCase();
      return /*#__PURE__*/React__default.default.createElement(designSystem.TableRow, {
        key: cIdx,
        style: {
          backgroundColor: isWinner ? '#f0fdf4' : 'transparent'
        }
      }, /*#__PURE__*/React__default.default.createElement(designSystem.TableCell, null, /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
        flex: true,
        alignItems: "center",
        gap: "sm"
      }, /*#__PURE__*/React__default.default.createElement(designSystem.Text, {
        fontWeight: isWinner ? 'bold' : 'normal'
      }, getPlayerName(c.playerId)), isWinner && /*#__PURE__*/React__default.default.createElement(designSystem.Badge, {
        size: "sm",
        variant: "success"
      }, "\u2713 WIN"))), /*#__PURE__*/React__default.default.createElement(designSystem.TableCell, null, /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
        flex: true,
        alignItems: "center",
        gap: "xs"
      }, /*#__PURE__*/React__default.default.createElement(CardView, {
        card: c.card
      }), isTrump && /*#__PURE__*/React__default.default.createElement(designSystem.Badge, {
        size: "sm",
        variant: "primary"
      }, "TRUMP"))), /*#__PURE__*/React__default.default.createElement(designSystem.TableCell, null, isLead && /*#__PURE__*/React__default.default.createElement(designSystem.Badge, {
        size: "sm",
        variant: "info"
      }, "LEAD")));
    }))), analysis.hasHands && trick.handsBefore && /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      p: "lg",
      bg: "white",
      style: {
        borderTop: '1px dashed #e2e8f0'
      }
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Label, {
      mb: "sm"
    }, "Hands before trick"), /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      flex: true,
      flexWrap: "wrap",
      gap: "lg"
    }, Object.entries(trick.handsBefore).map(([pid, cards]) => /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      key: pid,
      style: {
        minWidth: '200px'
      }
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Text, {
      variant: "xs",
      color: "grey.60",
      mb: "xs",
      textTransform: "uppercase",
      fontWeight: "bold"
    }, getPlayerName(pid)), /*#__PURE__*/React__default.default.createElement(designSystem.Box, null, cards.map((card, i) => /*#__PURE__*/React__default.default.createElement(CardView, {
      key: i,
      card: card
    })), cards.length === 0 && /*#__PURE__*/React__default.default.createElement(designSystem.Text, {
      variant: "sm",
      color: "grey.40"
    }, "Empty")))))))))), currentRound.scores && /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      mb: "xl",
      bg: "white",
      border: "default",
      style: {
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
      }
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      px: "xl",
      py: "lg",
      borderBottom: "default",
      bg: "grey.20"
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Text, {
      as: "h3",
      fontSize: "lg",
      fontWeight: "bold",
      color: "grey.80"
    }, "Round Results")), /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      p: "xl"
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Table, null, /*#__PURE__*/React__default.default.createElement(designSystem.TableHead, null, /*#__PURE__*/React__default.default.createElement(designSystem.TableRow, null, /*#__PURE__*/React__default.default.createElement(designSystem.TableCell, null, "Player"), /*#__PURE__*/React__default.default.createElement(designSystem.TableCell, null, "Bid"), /*#__PURE__*/React__default.default.createElement(designSystem.TableCell, null, "Tricks Won"), /*#__PURE__*/React__default.default.createElement(designSystem.TableCell, null, "Round Score"))), /*#__PURE__*/React__default.default.createElement(designSystem.TableBody, null, Object.entries(currentRound.scores).map(([pid, score]) => {
      const wonCount = currentRound.tricks.filter(t => t.winnerId === pid).length;
      const bid = currentRound.bets[pid] || 0;
      return /*#__PURE__*/React__default.default.createElement(designSystem.TableRow, {
        key: pid
      }, /*#__PURE__*/React__default.default.createElement(designSystem.TableCell, null, getPlayerName(pid)), /*#__PURE__*/React__default.default.createElement(designSystem.TableCell, null, bid), /*#__PURE__*/React__default.default.createElement(designSystem.TableCell, null, wonCount), /*#__PURE__*/React__default.default.createElement(designSystem.TableCell, null, /*#__PURE__*/React__default.default.createElement(designSystem.Badge, {
        variant: score > 0 ? 'success' : 'danger'
      }, score > 0 ? `+${score}` : score)));
    })))))) : /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      p: "xxl",
      textAlign: "center",
      bg: "white",
      style: {
        borderRadius: '12px',
        border: '1px dashed #cbd5e1'
      }
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Icon, {
      icon: "Layout",
      size: 32,
      color: "grey.40"
    }), /*#__PURE__*/React__default.default.createElement(designSystem.Text, {
      mt: "md",
      color: "grey.60"
    }, "Select a round from above to view details."))), viewMode === 'timeline' && /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      bg: "white",
      p: "xl",
      style: {
        borderRadius: '12px',
        border: '1px solid #edf2f7'
      }
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      flex: true,
      gap: "lg",
      mb: "xl"
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      flexGrow: 1
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Label, null, "Filter by Action"), /*#__PURE__*/React__default.default.createElement("select", {
      value: filterAction,
      onChange: e => setFilterAction(e.target.value),
      style: {
        width: '100%',
        padding: '10px',
        borderRadius: '6px',
        border: '1px solid #cbd5e1',
        backgroundColor: '#f8fafc'
      }
    }, /*#__PURE__*/React__default.default.createElement("option", {
      value: ""
    }, "All Actions"), analysis.eventTypes.map(type => /*#__PURE__*/React__default.default.createElement("option", {
      key: type,
      value: type
    }, type)))), /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      flexGrow: 1
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Label, null, "Filter by Player"), /*#__PURE__*/React__default.default.createElement("select", {
      value: filterPlayer,
      onChange: e => setFilterPlayer(e.target.value),
      style: {
        width: '100%',
        padding: '10px',
        borderRadius: '6px',
        border: '1px solid #cbd5e1',
        backgroundColor: '#f8fafc'
      }
    }, /*#__PURE__*/React__default.default.createElement("option", {
      value: ""
    }, "All Players"), analysis.players.map(p => /*#__PURE__*/React__default.default.createElement("option", {
      key: p.id,
      value: String(p.id)
    }, p.name || p.username || p.id))))), /*#__PURE__*/React__default.default.createElement(designSystem.Table, null, /*#__PURE__*/React__default.default.createElement(designSystem.TableHead, null, /*#__PURE__*/React__default.default.createElement(designSystem.TableRow, null, /*#__PURE__*/React__default.default.createElement(designSystem.TableCell, null, "Time"), /*#__PURE__*/React__default.default.createElement(designSystem.TableCell, null, "Context"), /*#__PURE__*/React__default.default.createElement(designSystem.TableCell, null, "Action"), /*#__PURE__*/React__default.default.createElement(designSystem.TableCell, null, "Player"), /*#__PURE__*/React__default.default.createElement(designSystem.TableCell, null, "Details"))), /*#__PURE__*/React__default.default.createElement(designSystem.TableBody, null, filteredEvents.map(event => /*#__PURE__*/React__default.default.createElement(designSystem.TableRow, {
      key: event.index
    }, /*#__PURE__*/React__default.default.createElement(designSystem.TableCell, null, /*#__PURE__*/React__default.default.createElement(designSystem.Text, {
      variant: "sm",
      color: "grey.60"
    }, new Date(event.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }))), /*#__PURE__*/React__default.default.createElement(designSystem.TableCell, null, /*#__PURE__*/React__default.default.createElement(designSystem.Badge, {
      variant: "light",
      size: "sm"
    }, "P", event.pulka, "-R", event.round)), /*#__PURE__*/React__default.default.createElement(designSystem.TableCell, null, /*#__PURE__*/React__default.default.createElement(designSystem.Badge, {
      variant: "primary",
      size: "sm"
    }, event.action)), /*#__PURE__*/React__default.default.createElement(designSystem.TableCell, null, /*#__PURE__*/React__default.default.createElement(designSystem.Text, {
      fontWeight: "bold"
    }, getPlayerName(event.playerId))), /*#__PURE__*/React__default.default.createElement(designSystem.TableCell, null, event.action === 'CARD' && event.data?.cardId && /*#__PURE__*/React__default.default.createElement(CardView, {
      card: {
        cardId: String(event.data.cardId),
        cardType: event.data.cardType,
        suit: event.data.suit,
        rank: event.data.rank,
        jokerOption: event.data.jokerOption,
        requestedSuit: event.data.requestedSuit
      }
    }), event.action === 'BET' && /*#__PURE__*/React__default.default.createElement(designSystem.Text, null, "Bet ", /*#__PURE__*/React__default.default.createElement("strong", null, String(event.data?.amount))), event.action === 'TRUMP' && /*#__PURE__*/React__default.default.createElement(designSystem.Text, null, "Selected Trump: ", /*#__PURE__*/React__default.default.createElement("strong", null, String(event.data?.trump))), event.action === 'TRICK_WINNER' && /*#__PURE__*/React__default.default.createElement(designSystem.Text, null, "Won trick with ", /*#__PURE__*/React__default.default.createElement("strong", null, String(event.data?.tricks)), " points"), !['CARD', 'BET', 'TRUMP', 'TRICK_WINNER'].includes(event.action) && event.data && /*#__PURE__*/React__default.default.createElement(designSystem.Text, {
      variant: "sm",
      color: "grey.60"
    }, JSON.stringify(event.data).substring(0, 50))))), filteredEvents.length === 0 && /*#__PURE__*/React__default.default.createElement(designSystem.TableRow, null, /*#__PURE__*/React__default.default.createElement(designSystem.TableCell, {
      colSpan: 5,
      style: {
        textAlign: 'center',
        padding: '32px'
      }
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Text, {
      color: "grey.40"
    }, "No events found matching your filters")))))), !analysis.hasHands && /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      mt: "xl",
      p: "md",
      bg: "info.10",
      style: {
        borderRadius: '6px'
      }
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Text, {
      variant: "sm",
      color: "info.100"
    }, "Note: Detailed hand data is not available for this game analysis (server might be configured to not store hands for privacy/storage reasons).")));
  };

  AdminJS.UserComponents = {};
  AdminJS.UserComponents.GameAnalysis = GameAnalysisComponent;

})(React, AdminJSDesignSystem);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVuZGxlLmpzIiwic291cmNlcyI6WyIuLi9zcmMvY29tcG9uZW50cy9HYW1lQW5hbHlzaXMvaW5kZXgudHN4IiwiZW50cnkuanMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFJlYWN0LCB7IHVzZVN0YXRlLCB1c2VNZW1vIH0gZnJvbSAncmVhY3QnO1xuaW1wb3J0IHtcbiAgQm94LFxuICBUZXh0LFxuICBCYWRnZSxcbiAgVGFibGUsXG4gIFRhYmxlSGVhZCxcbiAgVGFibGVCb2R5LFxuICBUYWJsZVJvdyxcbiAgVGFibGVDZWxsLFxuICBMYWJlbCxcbiAgQnV0dG9uLFxuICBJY29uLFxufSBmcm9tICdAYWRtaW5qcy9kZXNpZ24tc3lzdGVtJztcbmltcG9ydCB7IEJhc2VQcm9wZXJ0eVByb3BzIH0gZnJvbSAnYWRtaW5qcyc7XG5cbi8vIC0tLSBJbnRlcmZhY2VzIC0tLVxuXG5pbnRlcmZhY2UgQW5hbHlzaXNDYXJkIHtcbiAgY2FyZElkOiBzdHJpbmc7XG4gIGNhcmRUeXBlOiBzdHJpbmcgfCBudWxsO1xuICBzdWl0OiBzdHJpbmcgfCBudWxsO1xuICByYW5rOiBzdHJpbmcgfCBudWxsO1xuICBqb2tlck9wdGlvbjogc3RyaW5nIHwgbnVsbDtcbiAgcmVxdWVzdGVkU3VpdDogc3RyaW5nIHwgbnVsbDtcbn1cblxuaW50ZXJmYWNlIEFuYWx5c2lzVHJpY2sge1xuICBpbmRleDogbnVtYmVyO1xuICBsZWFkZXJJZDogc3RyaW5nIHwgbnVsbDtcbiAgd2lubmVySWQ6IHN0cmluZyB8IG51bGw7XG4gIHdpbm5lclRyaWNrczogbnVtYmVyIHwgbnVsbDtcbiAgY2FyZHM6IEFycmF5PHsgcGxheWVySWQ6IHN0cmluZzsgY2FyZDogQW5hbHlzaXNDYXJkOyBhdDogbnVtYmVyIH0+O1xuICBoYW5kc0JlZm9yZT86IFJlY29yZDxzdHJpbmcsIEFuYWx5c2lzQ2FyZFtdPjtcbiAgaGFuZHNBZnRlcj86IFJlY29yZDxzdHJpbmcsIEFuYWx5c2lzQ2FyZFtdPjtcbn1cblxuaW50ZXJmYWNlIEFuYWx5c2lzUm91bmQge1xuICByb3VuZDogbnVtYmVyO1xuICBwdWxrYTogbnVtYmVyO1xuICBjYXJkc1BlclBsYXllcjogbnVtYmVyIHwgbnVsbDtcbiAgZGVhbGVySWQ6IHN0cmluZyB8IG51bGw7XG4gIHRydW1wOiBzdHJpbmcgfCBudWxsO1xuICBiZXRzOiBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+O1xuICB0cmlja3M6IEFuYWx5c2lzVHJpY2tbXTtcbiAgc2NvcmVzOiBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+IHwgbnVsbDtcbn1cblxuaW50ZXJmYWNlIEFuYWx5c2lzRXZlbnQge1xuICBpbmRleDogbnVtYmVyO1xuICBhY3Rpb246IHN0cmluZztcbiAgcGxheWVySWQ6IHN0cmluZztcbiAgdGltZXN0YW1wOiBudW1iZXI7XG4gIHJvdW5kOiBudW1iZXI7XG4gIHB1bGthOiBudW1iZXI7XG4gIHRyaWNrSW5kZXg6IG51bWJlciB8IG51bGw7XG4gIGRhdGE6IFJlY29yZDxzdHJpbmcsIHVua25vd24+IHwgbnVsbDtcbn1cblxuaW50ZXJmYWNlIEdhbWVBbmFseXNpcyB7XG4gIHBsYXllcnM6IFJlY29yZDxzdHJpbmcsIHVua25vd24+W107XG4gIHJvdW5kczogQW5hbHlzaXNSb3VuZFtdO1xuICBldmVudHM6IEFuYWx5c2lzRXZlbnRbXTtcbiAgZXZlbnRUeXBlczogc3RyaW5nW107XG4gIGhhc0hhbmRzOiBib29sZWFuO1xufVxuXG4vLyAtLS0gSGVscGVycyAtLS1cblxuY29uc3QgZ2V0U3VpdFN5bWJvbCA9IChzdWl0OiBzdHJpbmcgfCBudWxsKSA9PiB7XG4gIGlmICghc3VpdCkgcmV0dXJuICcnO1xuICBzd2l0Y2ggKHN1aXQudG9VcHBlckNhc2UoKSkge1xuICAgIGNhc2UgJ0hFQVJUUyc6XG4gICAgICByZXR1cm4gJ+KZpSc7XG4gICAgY2FzZSAnRElBTU9ORFMnOlxuICAgICAgcmV0dXJuICfimaYnO1xuICAgIGNhc2UgJ0NMVUJTJzpcbiAgICAgIHJldHVybiAn4pmjJztcbiAgICBjYXNlICdTUEFERVMnOlxuICAgICAgcmV0dXJuICfimaAnO1xuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gJyc7XG4gIH1cbn07XG5cbmNvbnN0IGdldFN1aXRDb2xvciA9IChzdWl0OiBzdHJpbmcgfCBudWxsKSA9PiB7XG4gIGlmICghc3VpdCkgcmV0dXJuICcjNjQ3NDhiJztcbiAgc3dpdGNoIChzdWl0LnRvVXBwZXJDYXNlKCkpIHtcbiAgICBjYXNlICdIRUFSVFMnOlxuICAgIGNhc2UgJ0RJQU1PTkRTJzpcbiAgICAgIHJldHVybiAnI2UxMWQ0OCc7IC8vIFJvc2UtNjAwXG4gICAgY2FzZSAnQ0xVQlMnOlxuICAgIGNhc2UgJ1NQQURFUyc6XG4gICAgICByZXR1cm4gJyMzMzQxNTUnOyAvLyBTbGF0ZS03MDBcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuICcjNjQ3NDhiJzsgLy8gU2xhdGUtNTAwXG4gIH1cbn07XG5cbmNvbnN0IGdldFN1aXROYW1lID0gKHN1aXQ6IHN0cmluZyB8IG51bGwpOiBzdHJpbmcgPT4ge1xuICBpZiAoIXN1aXQpIHJldHVybiAnJztcbiAgc3dpdGNoIChzdWl0LnRvVXBwZXJDYXNlKCkpIHtcbiAgICBjYXNlICdIRUFSVFMnOlxuICAgICAgcmV0dXJuICdIZWFydHMnO1xuICAgIGNhc2UgJ0RJQU1PTkRTJzpcbiAgICAgIHJldHVybiAnRGlhbW9uZHMnO1xuICAgIGNhc2UgJ0NMVUJTJzpcbiAgICAgIHJldHVybiAnQ2x1YnMnO1xuICAgIGNhc2UgJ1NQQURFUyc6XG4gICAgICByZXR1cm4gJ1NwYWRlcyc7XG4gICAgY2FzZSAnTk9fVFJVTVAnOlxuICAgICAgcmV0dXJuICdObyBUcnVtcCc7XG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBzdWl0O1xuICB9XG59O1xuXG5jb25zdCBnZXRSYW5rRGlzcGxheSA9IChyYW5rOiBzdHJpbmcgfCBudW1iZXIgfCBudWxsKTogc3RyaW5nID0+IHtcbiAgaWYgKHJhbmsgPT09IG51bGwgfHwgcmFuayA9PT0gdW5kZWZpbmVkKSByZXR1cm4gJz8nO1xuICBjb25zdCBudW1SYW5rID0gdHlwZW9mIHJhbmsgPT09ICdzdHJpbmcnID8gcGFyc2VJbnQocmFuaywgMTApIDogcmFuaztcbiAgc3dpdGNoIChudW1SYW5rKSB7XG4gICAgY2FzZSAxNDpcbiAgICAgIHJldHVybiAnQSc7XG4gICAgY2FzZSAxMzpcbiAgICAgIHJldHVybiAnSyc7XG4gICAgY2FzZSAxMjpcbiAgICAgIHJldHVybiAnUSc7XG4gICAgY2FzZSAxMTpcbiAgICAgIHJldHVybiAnSic7XG4gICAgY2FzZSAxMDpcbiAgICAgIHJldHVybiAnMTAnO1xuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gU3RyaW5nKG51bVJhbmspO1xuICB9XG59O1xuXG5jb25zdCBnZXRKb2tlck9wdGlvbkRpc3BsYXkgPSAob3B0aW9uOiBzdHJpbmcgfCBudWxsKTogc3RyaW5nID0+IHtcbiAgaWYgKCFvcHRpb24pIHJldHVybiAnJztcbiAgc3dpdGNoIChvcHRpb24udG9VcHBlckNhc2UoKSkge1xuICAgIGNhc2UgJ0hJR0gnOlxuICAgICAgcmV0dXJuICdISUdIJztcbiAgICBjYXNlICdMT1cnOlxuICAgICAgcmV0dXJuICdMT1cnO1xuICAgIGNhc2UgJ1RPUCc6XG4gICAgICByZXR1cm4gJ1RBS0UnO1xuICAgIGNhc2UgJ0JPVFRPTSc6XG4gICAgICByZXR1cm4gJ0dJVkUnO1xuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gb3B0aW9uO1xuICB9XG59O1xuXG5jb25zdCBnZXRKb2tlck9wdGlvbkNvbG9yID0gKG9wdGlvbjogc3RyaW5nIHwgbnVsbCk6IHN0cmluZyA9PiB7XG4gIGlmICghb3B0aW9uKSByZXR1cm4gJyM3YzNhZWQnO1xuICBzd2l0Y2ggKG9wdGlvbi50b1VwcGVyQ2FzZSgpKSB7XG4gICAgY2FzZSAnSElHSCc6XG4gICAgICByZXR1cm4gJyMxMGI5ODEnOyAvLyBFbWVyYWxkXG4gICAgY2FzZSAnTE9XJzpcbiAgICAgIHJldHVybiAnIzA2YjZkNCc7IC8vIEN5YW5cbiAgICBjYXNlICdUT1AnOlxuICAgICAgcmV0dXJuICcjZjU5ZTBiJzsgLy8gQW1iZXJcbiAgICBjYXNlICdCT1RUT00nOlxuICAgICAgcmV0dXJuICcjOGI1Y2Y2JzsgLy8gUHVycGxlXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiAnIzdjM2FlZCc7XG4gIH1cbn07XG5cbmNvbnN0IENhcmRWaWV3OiBSZWFjdC5GQzx7IGNhcmQ6IEFuYWx5c2lzQ2FyZCB9PiA9ICh7IGNhcmQgfSkgPT4ge1xuICBpZiAoY2FyZC5jYXJkVHlwZSA9PT0gJ0pPS0VSJykge1xuICAgIGNvbnN0IG9wdGlvbkRpc3BsYXkgPSBnZXRKb2tlck9wdGlvbkRpc3BsYXkoY2FyZC5qb2tlck9wdGlvbik7XG4gICAgY29uc3Qgb3B0aW9uQ29sb3IgPSBnZXRKb2tlck9wdGlvbkNvbG9yKGNhcmQuam9rZXJPcHRpb24pO1xuICAgIGNvbnN0IHJlcXVlc3RlZFN1aXRTeW1ib2wgPSBnZXRTdWl0U3ltYm9sKGNhcmQucmVxdWVzdGVkU3VpdCk7XG4gICAgY29uc3QgcmVxdWVzdGVkU3VpdENvbG9yID0gZ2V0U3VpdENvbG9yKGNhcmQucmVxdWVzdGVkU3VpdCk7XG5cbiAgICByZXR1cm4gKFxuICAgICAgPEJveFxuICAgICAgICBhcz1cInNwYW5cIlxuICAgICAgICBkaXNwbGF5PVwiaW5saW5lLWZsZXhcIlxuICAgICAgICBhbGlnbkl0ZW1zPVwiY2VudGVyXCJcbiAgICAgICAganVzdGlmeUNvbnRlbnQ9XCJjZW50ZXJcIlxuICAgICAgICBweT1cInhzXCJcbiAgICAgICAgcHg9XCJzbVwiXG4gICAgICAgIG1yPVwieHNcIlxuICAgICAgICBtYj1cInhzXCJcbiAgICAgICAgc3R5bGU9e3tcbiAgICAgICAgICBib3JkZXJSYWRpdXM6ICc2cHgnLFxuICAgICAgICAgIGJvcmRlcjogYDJweCBzb2xpZCAke29wdGlvbkNvbG9yfWAsXG4gICAgICAgICAgYmFja2dyb3VuZENvbG9yOiBgJHtvcHRpb25Db2xvcn0xNWAsXG4gICAgICAgICAgY29sb3I6IG9wdGlvbkNvbG9yLFxuICAgICAgICAgIGZvbnRXZWlnaHQ6IDYwMCxcbiAgICAgICAgICBmb250U2l6ZTogJzEzcHgnLFxuICAgICAgICAgIG1pbldpZHRoOiAnMzZweCcsXG4gICAgICAgIH19XG4gICAgICA+XG4gICAgICAgIDxJY29uIGljb249XCJTdGFyXCIgc2l6ZT17MTJ9IHN0eWxlPXt7IG1hcmdpblJpZ2h0OiA0IH19IC8+XG4gICAgICAgIDxzcGFuIHN0eWxlPXt7IG1hcmdpblJpZ2h0OiByZXF1ZXN0ZWRTdWl0U3ltYm9sID8gNCA6IDAgfX0+e29wdGlvbkRpc3BsYXkgfHwgJ0pPS0VSJ308L3NwYW4+XG4gICAgICAgIHtyZXF1ZXN0ZWRTdWl0U3ltYm9sICYmIChcbiAgICAgICAgICA8c3BhbiBzdHlsZT17eyBjb2xvcjogcmVxdWVzdGVkU3VpdENvbG9yLCBmb250V2VpZ2h0OiA3MDAgfX0+e3JlcXVlc3RlZFN1aXRTeW1ib2x9PC9zcGFuPlxuICAgICAgICApfVxuICAgICAgPC9Cb3g+XG4gICAgKTtcbiAgfVxuXG4gIGNvbnN0IHN5bWJvbCA9IGdldFN1aXRTeW1ib2woY2FyZC5zdWl0KTtcbiAgY29uc3QgY29sb3IgPSBnZXRTdWl0Q29sb3IoY2FyZC5zdWl0KTtcbiAgY29uc3QgcmFua0Rpc3BsYXkgPSBnZXRSYW5rRGlzcGxheShjYXJkLnJhbmspO1xuXG4gIHJldHVybiAoXG4gICAgPEJveFxuICAgICAgYXM9XCJzcGFuXCJcbiAgICAgIGRpc3BsYXk9XCJpbmxpbmUtZmxleFwiXG4gICAgICBhbGlnbkl0ZW1zPVwiY2VudGVyXCJcbiAgICAgIGp1c3RpZnlDb250ZW50PVwiY2VudGVyXCJcbiAgICAgIHB5PVwieHNcIlxuICAgICAgcHg9XCJzbVwiXG4gICAgICBiZz1cIndoaXRlXCJcbiAgICAgIG1yPVwieHNcIlxuICAgICAgbWI9XCJ4c1wiXG4gICAgICBzdHlsZT17e1xuICAgICAgICBib3JkZXJSYWRpdXM6ICc2cHgnLFxuICAgICAgICBib3JkZXI6ICcxcHggc29saWQgI2UyZThmMCcsXG4gICAgICAgIGJveFNoYWRvdzogJzAgMXB4IDJweCByZ2JhKDAsMCwwLDAuMDUpJyxcbiAgICAgICAgZm9udFdlaWdodDogNjAwLFxuICAgICAgICBmb250U2l6ZTogJzE0cHgnLFxuICAgICAgICBtaW5XaWR0aDogJzQycHgnLFxuICAgICAgICBjb2xvcixcbiAgICAgIH19XG4gICAgPlxuICAgICAgPHNwYW4gc3R5bGU9e3sgbWFyZ2luUmlnaHQ6IDIgfX0+e3JhbmtEaXNwbGF5fTwvc3Bhbj5cbiAgICAgIDxzcGFuIHN0eWxlPXt7IGZvbnRTaXplOiAnMTZweCcgfX0+e3N5bWJvbH08L3NwYW4+XG4gICAgPC9Cb3g+XG4gICk7XG59O1xuXG5jb25zdCBHYW1lQW5hbHlzaXNDb21wb25lbnQ6IFJlYWN0LkZDPEJhc2VQcm9wZXJ0eVByb3BzPiA9IChwcm9wcykgPT4ge1xuICBjb25zdCB7IHJlY29yZCB9ID0gcHJvcHM7XG4gIGNvbnN0IGFuYWx5c2lzSnNvbiA9IHJlY29yZD8ucGFyYW1zPy5hbmFseXNpc0pzb247XG5cbiAgY29uc3QgW3NlbGVjdGVkUm91bmRJbmRleCwgc2V0U2VsZWN0ZWRSb3VuZEluZGV4XSA9IHVzZVN0YXRlPG51bWJlcj4oMCk7XG4gIGNvbnN0IFt2aWV3TW9kZSwgc2V0Vmlld01vZGVdID0gdXNlU3RhdGU8J3N0cnVjdHVyZWQnIHwgJ3RpbWVsaW5lJz4oJ3N0cnVjdHVyZWQnKTtcbiAgY29uc3QgW2ZpbHRlckFjdGlvbiwgc2V0RmlsdGVyQWN0aW9uXSA9IHVzZVN0YXRlPHN0cmluZz4oJycpO1xuICBjb25zdCBbZmlsdGVyUGxheWVyLCBzZXRGaWx0ZXJQbGF5ZXJdID0gdXNlU3RhdGU8c3RyaW5nPignJyk7XG5cbiAgY29uc3QgYW5hbHlzaXM6IEdhbWVBbmFseXNpcyB8IG51bGwgPSB1c2VNZW1vKCgpID0+IHtcbiAgICBpZiAoIWFuYWx5c2lzSnNvbikgcmV0dXJuIG51bGw7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBKU09OLnBhcnNlKGFuYWx5c2lzSnNvbik7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIHBhcnNlIGFuYWx5c2lzIEpTT04nLCBlKTtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfSwgW2FuYWx5c2lzSnNvbl0pO1xuXG4gIGNvbnN0IHBsYXllcnNNYXAgPSB1c2VNZW1vKCgpID0+IHtcbiAgICBjb25zdCBtYXAgPSBuZXcgTWFwKCk7XG4gICAgaWYgKGFuYWx5c2lzKSB7XG4gICAgICBhbmFseXNpcy5wbGF5ZXJzLmZvckVhY2goKHApID0+IG1hcC5zZXQoU3RyaW5nKHAuaWQpLCBwLm5hbWUgfHwgcC51c2VybmFtZSB8fCBwLmlkKSk7XG4gICAgfVxuICAgIHJldHVybiBtYXA7XG4gIH0sIFthbmFseXNpc10pO1xuXG4gIGNvbnN0IGdldFBsYXllck5hbWUgPSAoaWQ6IHN0cmluZyB8IG51bGwpID0+IChpZCA/IHBsYXllcnNNYXAuZ2V0KGlkKSB8fCBpZCA6ICdVbmtub3duJyk7XG5cbiAgY29uc3QgZmlsdGVyZWRFdmVudHMgPSB1c2VNZW1vKCgpID0+IHtcbiAgICBpZiAoIWFuYWx5c2lzIHx8ICFhbmFseXNpcy5ldmVudHMpIHJldHVybiBbXTtcbiAgICByZXR1cm4gYW5hbHlzaXMuZXZlbnRzLmZpbHRlcigoZSkgPT4ge1xuICAgICAgaWYgKGZpbHRlckFjdGlvbiAmJiBlLmFjdGlvbiAhPT0gZmlsdGVyQWN0aW9uKSByZXR1cm4gZmFsc2U7XG4gICAgICBpZiAoZmlsdGVyUGxheWVyICYmIGUucGxheWVySWQgIT09IGZpbHRlclBsYXllcikgcmV0dXJuIGZhbHNlO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG4gIH0sIFthbmFseXNpcywgZmlsdGVyQWN0aW9uLCBmaWx0ZXJQbGF5ZXJdKTtcblxuICBpZiAoIWFuYWx5c2lzKSB7XG4gICAgcmV0dXJuIChcbiAgICAgIDxCb3ggcD1cInhsXCIgYmc9XCJ3aGl0ZVwiIHN0eWxlPXt7IGJvcmRlclJhZGl1czogJzhweCcgfX0+XG4gICAgICAgIDxUZXh0Pk5vIGFuYWx5c2lzIGRhdGEgYXZhaWxhYmxlIG9yIGludmFsaWQgSlNPTi48L1RleHQ+XG4gICAgICA8L0JveD5cbiAgICApO1xuICB9XG5cbiAgY29uc3QgY3VycmVudFJvdW5kID0gYW5hbHlzaXMucm91bmRzW3NlbGVjdGVkUm91bmRJbmRleF07XG5cbiAgcmV0dXJuIChcbiAgICA8Qm94PlxuICAgICAgPEJveCBmbGV4IGZsZXhEaXJlY3Rpb249XCJyb3dcIiBqdXN0aWZ5Q29udGVudD1cInNwYWNlLWJldHdlZW5cIiBhbGlnbkl0ZW1zPVwiY2VudGVyXCIgbWI9XCJ4bFwiPlxuICAgICAgICA8VGV4dCBhcz1cImgyXCIgZm9udFNpemU9XCIyeGxcIiBmb250V2VpZ2h0PVwiYm9sZFwiPlxuICAgICAgICAgIEdhbWUgUmVwbGF5XG4gICAgICAgIDwvVGV4dD5cbiAgICAgICAgPEJveCBmbGV4IGdhcD1cImRlZmF1bHRcIj5cbiAgICAgICAgICA8QnV0dG9uXG4gICAgICAgICAgICB2YXJpYW50PXt2aWV3TW9kZSA9PT0gJ3N0cnVjdHVyZWQnID8gJ3ByaW1hcnknIDogJ2xpZ2h0J31cbiAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldFZpZXdNb2RlKCdzdHJ1Y3R1cmVkJyl9XG4gICAgICAgICAgICBzaXplPVwic21cIlxuICAgICAgICAgID5cbiAgICAgICAgICAgIDxJY29uIGljb249XCJMYXlvdXRcIiBzdHlsZT17eyBtYXJnaW5SaWdodDogOCB9fSAvPiBSb3VuZCBWaWV3XG4gICAgICAgICAgPC9CdXR0b24+XG4gICAgICAgICAgPEJ1dHRvblxuICAgICAgICAgICAgdmFyaWFudD17dmlld01vZGUgPT09ICd0aW1lbGluZScgPyAncHJpbWFyeScgOiAnbGlnaHQnfVxuICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2V0Vmlld01vZGUoJ3RpbWVsaW5lJyl9XG4gICAgICAgICAgICBzaXplPVwic21cIlxuICAgICAgICAgID5cbiAgICAgICAgICAgIDxJY29uIGljb249XCJMaXN0XCIgc3R5bGU9e3sgbWFyZ2luUmlnaHQ6IDggfX0gLz4gVGltZWxpbmUgVmlld1xuICAgICAgICAgIDwvQnV0dG9uPlxuICAgICAgICA8L0JveD5cbiAgICAgIDwvQm94PlxuXG4gICAgICB7LyogU3RydWN0dXJlZCBWaWV3ICovfVxuICAgICAge3ZpZXdNb2RlID09PSAnc3RydWN0dXJlZCcgJiYgKFxuICAgICAgICA8PlxuICAgICAgICAgIDxCb3ggbWI9XCJ4bFwiIHN0eWxlPXt7IG92ZXJmbG93WDogJ2F1dG8nLCB3aGl0ZVNwYWNlOiAnbm93cmFwJywgcGFkZGluZ0JvdHRvbTogJzhweCcgfX0+XG4gICAgICAgICAgICB7YW5hbHlzaXMucm91bmRzLm1hcCgociwgaWR4KSA9PiB7XG4gICAgICAgICAgICAgIGNvbnN0IGlzQWN0aXZlID0gaWR4ID09PSBzZWxlY3RlZFJvdW5kSW5kZXg7XG4gICAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgPEJ1dHRvblxuICAgICAgICAgICAgICAgICAga2V5PXtgJHtyLnB1bGthfS0ke3Iucm91bmR9YH1cbiAgICAgICAgICAgICAgICAgIHZhcmlhbnQ9e2lzQWN0aXZlID8gJ3ByaW1hcnknIDogJ2xpZ2h0J31cbiAgICAgICAgICAgICAgICAgIHNpemU9XCJzbVwiXG4gICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXRTZWxlY3RlZFJvdW5kSW5kZXgoaWR4KX1cbiAgICAgICAgICAgICAgICAgIHN0eWxlPXt7XG4gICAgICAgICAgICAgICAgICAgIG1hcmdpblJpZ2h0OiAnOHB4JyxcbiAgICAgICAgICAgICAgICAgICAgb3BhY2l0eTogaXNBY3RpdmUgPyAxIDogMC43LFxuICAgICAgICAgICAgICAgICAgfX1cbiAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICBQe3IucHVsa2F9LVJ7ci5yb3VuZH1cbiAgICAgICAgICAgICAgICA8L0J1dHRvbj5cbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH0pfVxuICAgICAgICAgIDwvQm94PlxuXG4gICAgICAgICAge2N1cnJlbnRSb3VuZCA/IChcbiAgICAgICAgICAgIDxCb3ggYW5pbWF0ZT5cbiAgICAgICAgICAgICAgPEJveFxuICAgICAgICAgICAgICAgIGZsZXhcbiAgICAgICAgICAgICAgICBmbGV4RGlyZWN0aW9uPVwicm93XCJcbiAgICAgICAgICAgICAgICBqdXN0aWZ5Q29udGVudD1cInNwYWNlLWJldHdlZW5cIlxuICAgICAgICAgICAgICAgIGFsaWduSXRlbXM9XCJjZW50ZXJcIlxuICAgICAgICAgICAgICAgIHA9XCJsZ1wiXG4gICAgICAgICAgICAgICAgbWI9XCJ4bFwiXG4gICAgICAgICAgICAgICAgYmc9XCJ3aGl0ZVwiXG4gICAgICAgICAgICAgICAgc3R5bGU9e3tcbiAgICAgICAgICAgICAgICAgIGJvcmRlclJhZGl1czogJzEycHgnLFxuICAgICAgICAgICAgICAgICAgYm9yZGVyOiAnMXB4IHNvbGlkICNlZGYyZjcnLFxuICAgICAgICAgICAgICAgICAgYm94U2hhZG93OiAnMCA0cHggNnB4IC0xcHggcmdiYSgwLCAwLCAwLCAwLjA1KScsXG4gICAgICAgICAgICAgICAgfX1cbiAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgIDxCb3g+XG4gICAgICAgICAgICAgICAgICA8TGFiZWw+Um91bmQgRGV0YWlsczwvTGFiZWw+XG4gICAgICAgICAgICAgICAgICA8VGV4dCBmb250U2l6ZT1cImxnXCIgZm9udFdlaWdodD1cImJvbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgUHVsa2Ege2N1cnJlbnRSb3VuZC5wdWxrYX0gwrcgUm91bmQge2N1cnJlbnRSb3VuZC5yb3VuZH1cbiAgICAgICAgICAgICAgICAgIDwvVGV4dD5cbiAgICAgICAgICAgICAgICAgIDxUZXh0IGNvbG9yPVwiZ3JleS42MFwiPntjdXJyZW50Um91bmQuY2FyZHNQZXJQbGF5ZXJ9IGNhcmRzIHBlciBwbGF5ZXI8L1RleHQ+XG4gICAgICAgICAgICAgICAgPC9Cb3g+XG5cbiAgICAgICAgICAgICAgICA8Qm94IHRleHRBbGlnbj1cImNlbnRlclwiPlxuICAgICAgICAgICAgICAgICAgPExhYmVsPlRydW1wPC9MYWJlbD5cbiAgICAgICAgICAgICAgICAgIDxCb3ggZmxleCBhbGlnbkl0ZW1zPVwiY2VudGVyXCIgZ2FwPVwic21cIj5cbiAgICAgICAgICAgICAgICAgICAge2N1cnJlbnRSb3VuZC50cnVtcCA9PT0gJ05PX1RSVU1QJyB8fFxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50Um91bmQudHJ1bXA/LnRvVXBwZXJDYXNlKCkgPT09ICdOT19UUlVNUCcgPyAoXG4gICAgICAgICAgICAgICAgICAgICAgPEJhZGdlIHZhcmlhbnQ9XCJsaWdodFwiPk5PIFRSVU1QPC9CYWRnZT5cbiAgICAgICAgICAgICAgICAgICAgKSA6IGN1cnJlbnRSb3VuZC50cnVtcCA/IChcbiAgICAgICAgICAgICAgICAgICAgICA8PlxuICAgICAgICAgICAgICAgICAgICAgICAgPFRleHRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZm9udFNpemU9XCIzeGxcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICBsaW5lSGVpZ2h0PVwiMVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlPXt7IGNvbG9yOiBnZXRTdWl0Q29sb3IoY3VycmVudFJvdW5kLnRydW1wKSB9fVxuICAgICAgICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICAgICAgICB7Z2V0U3VpdFN5bWJvbChjdXJyZW50Um91bmQudHJ1bXApfVxuICAgICAgICAgICAgICAgICAgICAgICAgPC9UZXh0PlxuICAgICAgICAgICAgICAgICAgICAgICAgPFRleHQgZm9udFdlaWdodD1cImJvbGRcIiBzdHlsZT17eyBjb2xvcjogZ2V0U3VpdENvbG9yKGN1cnJlbnRSb3VuZC50cnVtcCkgfX0+XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHtnZXRTdWl0TmFtZShjdXJyZW50Um91bmQudHJ1bXApfVxuICAgICAgICAgICAgICAgICAgICAgICAgPC9UZXh0PlxuICAgICAgICAgICAgICAgICAgICAgIDwvPlxuICAgICAgICAgICAgICAgICAgICApIDogKFxuICAgICAgICAgICAgICAgICAgICAgIDxCYWRnZSB2YXJpYW50PVwibGlnaHRcIj5Vbmtub3duPC9CYWRnZT5cbiAgICAgICAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAgICAgIDwvQm94PlxuICAgICAgICAgICAgICAgIDwvQm94PlxuXG4gICAgICAgICAgICAgICAgPEJveCB0ZXh0QWxpZ249XCJyaWdodFwiPlxuICAgICAgICAgICAgICAgICAgPExhYmVsPkRlYWxlcjwvTGFiZWw+XG4gICAgICAgICAgICAgICAgICA8QmFkZ2UgdmFyaWFudD1cImluZm9cIj57Z2V0UGxheWVyTmFtZShjdXJyZW50Um91bmQuZGVhbGVySWQpfTwvQmFkZ2U+XG4gICAgICAgICAgICAgICAgPC9Cb3g+XG4gICAgICAgICAgICAgIDwvQm94PlxuXG4gICAgICAgICAgICAgIHsvKiBCZXRzIFNlY3Rpb24gKi99XG4gICAgICAgICAgICAgIDxCb3hcbiAgICAgICAgICAgICAgICBtYj1cInhsXCJcbiAgICAgICAgICAgICAgICBiZz1cIndoaXRlXCJcbiAgICAgICAgICAgICAgICBib3JkZXI9XCJkZWZhdWx0XCJcbiAgICAgICAgICAgICAgICBzdHlsZT17e1xuICAgICAgICAgICAgICAgICAgYm9yZGVyUmFkaXVzOiAnMTJweCcsXG4gICAgICAgICAgICAgICAgICBvdmVyZmxvdzogJ2hpZGRlbicsXG4gICAgICAgICAgICAgICAgICBib3hTaGFkb3c6ICcwIDJweCA1cHggcmdiYSgwLDAsMCwwLjAyKScsXG4gICAgICAgICAgICAgICAgfX1cbiAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgIDxCb3ggcHg9XCJ4bFwiIHB5PVwibGdcIiBib3JkZXJCb3R0b209XCJkZWZhdWx0XCIgYmc9XCJncmV5LjIwXCI+XG4gICAgICAgICAgICAgICAgICA8VGV4dCBhcz1cImgzXCIgZm9udFNpemU9XCJsZ1wiIGZvbnRXZWlnaHQ9XCJib2xkXCIgY29sb3I9XCJncmV5LjgwXCI+XG4gICAgICAgICAgICAgICAgICAgIEJldHNcbiAgICAgICAgICAgICAgICAgIDwvVGV4dD5cbiAgICAgICAgICAgICAgICA8L0JveD5cbiAgICAgICAgICAgICAgICA8Qm94IHA9XCJ4bFwiPlxuICAgICAgICAgICAgICAgICAgPEJveCBmbGV4IGZsZXhXcmFwPVwid3JhcFwiIGdhcD1cInhsXCI+XG4gICAgICAgICAgICAgICAgICAgIHtPYmplY3QuZW50cmllcyhjdXJyZW50Um91bmQuYmV0cykubWFwKChbcGlkLCBiZXRdKSA9PiAoXG4gICAgICAgICAgICAgICAgICAgICAgPEJveFxuICAgICAgICAgICAgICAgICAgICAgICAga2V5PXtwaWR9XG4gICAgICAgICAgICAgICAgICAgICAgICBwPVwibWRcIlxuICAgICAgICAgICAgICAgICAgICAgICAgYmc9XCJncmV5LjEwXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlPXt7IGJvcmRlclJhZGl1czogJzhweCcsIG1pbldpZHRoOiAnMTIwcHgnIH19XG4gICAgICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICAgICAgPFRleHQgdmFyaWFudD1cInNtXCIgY29sb3I9XCJncmV5LjYwXCIgbWI9XCJ4c1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICB7Z2V0UGxheWVyTmFtZShwaWQpfVxuICAgICAgICAgICAgICAgICAgICAgICAgPC9UZXh0PlxuICAgICAgICAgICAgICAgICAgICAgICAgPFRleHQgZm9udFNpemU9XCIyeGxcIiBmb250V2VpZ2h0PVwiYm9sZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICB7YmV0fVxuICAgICAgICAgICAgICAgICAgICAgICAgPC9UZXh0PlxuICAgICAgICAgICAgICAgICAgICAgIDwvQm94PlxuICAgICAgICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgICAgICAgIDwvQm94PlxuICAgICAgICAgICAgICAgIDwvQm94PlxuICAgICAgICAgICAgICA8L0JveD5cblxuICAgICAgICAgICAgICB7LyogVHJpY2tzIFNlY3Rpb24gKi99XG4gICAgICAgICAgICAgIDxCb3hcbiAgICAgICAgICAgICAgICBtYj1cInhsXCJcbiAgICAgICAgICAgICAgICBiZz1cIndoaXRlXCJcbiAgICAgICAgICAgICAgICBib3JkZXI9XCJkZWZhdWx0XCJcbiAgICAgICAgICAgICAgICBzdHlsZT17e1xuICAgICAgICAgICAgICAgICAgYm9yZGVyUmFkaXVzOiAnMTJweCcsXG4gICAgICAgICAgICAgICAgICBvdmVyZmxvdzogJ2hpZGRlbicsXG4gICAgICAgICAgICAgICAgICBib3hTaGFkb3c6ICcwIDJweCA1cHggcmdiYSgwLDAsMCwwLjAyKScsXG4gICAgICAgICAgICAgICAgfX1cbiAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgIDxCb3ggcHg9XCJ4bFwiIHB5PVwibGdcIiBib3JkZXJCb3R0b209XCJkZWZhdWx0XCIgYmc9XCJncmV5LjIwXCI+XG4gICAgICAgICAgICAgICAgICA8VGV4dCBhcz1cImgzXCIgZm9udFNpemU9XCJsZ1wiIGZvbnRXZWlnaHQ9XCJib2xkXCIgY29sb3I9XCJncmV5LjgwXCI+XG4gICAgICAgICAgICAgICAgICAgIFRyaWNrcyAoe2N1cnJlbnRSb3VuZC50cmlja3MubGVuZ3RofSlcbiAgICAgICAgICAgICAgICAgIDwvVGV4dD5cbiAgICAgICAgICAgICAgICA8L0JveD5cbiAgICAgICAgICAgICAgICA8Qm94IHA9XCJ4bFwiPlxuICAgICAgICAgICAgICAgICAge2N1cnJlbnRSb3VuZC50cmlja3MubWFwKCh0cmljaywgdElkeCkgPT4gKFxuICAgICAgICAgICAgICAgICAgICA8Qm94XG4gICAgICAgICAgICAgICAgICAgICAga2V5PXt0SWR4fVxuICAgICAgICAgICAgICAgICAgICAgIG1iPVwieGxcIlxuICAgICAgICAgICAgICAgICAgICAgIHN0eWxlPXt7XG4gICAgICAgICAgICAgICAgICAgICAgICBib3JkZXI6ICcxcHggc29saWQgI2UyZThmMCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBib3JkZXJSYWRpdXM6ICc4cHgnLFxuICAgICAgICAgICAgICAgICAgICAgICAgb3ZlcmZsb3c6ICdoaWRkZW4nLFxuICAgICAgICAgICAgICAgICAgICAgIH19XG4gICAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgICA8Qm94XG4gICAgICAgICAgICAgICAgICAgICAgICBwPVwibWRcIlxuICAgICAgICAgICAgICAgICAgICAgICAgYmc9XCJncmV5LjEwXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsZXhcbiAgICAgICAgICAgICAgICAgICAgICAgIGp1c3RpZnlDb250ZW50PVwic3BhY2UtYmV0d2VlblwiXG4gICAgICAgICAgICAgICAgICAgICAgICBhbGlnbkl0ZW1zPVwiY2VudGVyXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlPXt7IGJvcmRlckJvdHRvbTogJzFweCBzb2xpZCAjZTJlOGYwJyB9fVxuICAgICAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxUZXh0IGZvbnRXZWlnaHQ9XCJib2xkXCI+VHJpY2sge3RyaWNrLmluZGV4fTwvVGV4dD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxCb3ggZmxleCBhbGlnbkl0ZW1zPVwiY2VudGVyXCIgZ2FwPVwic21cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgPFRleHQgdmFyaWFudD1cInNtXCIgY29sb3I9XCJncmV5LjYwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgV2lubmVyOlxuICAgICAgICAgICAgICAgICAgICAgICAgICA8L1RleHQ+XG4gICAgICAgICAgICAgICAgICAgICAgICAgIDxCYWRnZSB2YXJpYW50PVwic3VjY2Vzc1wiPntnZXRQbGF5ZXJOYW1lKHRyaWNrLndpbm5lcklkKX08L0JhZGdlPlxuICAgICAgICAgICAgICAgICAgICAgICAgICA8QmFkZ2UgdmFyaWFudD1cImxpZ2h0XCI+e3RyaWNrLndpbm5lclRyaWNrc30gdHJpY2socyk8L0JhZGdlPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9Cb3g+XG4gICAgICAgICAgICAgICAgICAgICAgPC9Cb3g+XG5cbiAgICAgICAgICAgICAgICAgICAgICA8VGFibGU+XG4gICAgICAgICAgICAgICAgICAgICAgICA8VGFibGVIZWFkPlxuICAgICAgICAgICAgICAgICAgICAgICAgICA8VGFibGVSb3c+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPFRhYmxlQ2VsbD5QbGF5ZXI8L1RhYmxlQ2VsbD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8VGFibGVDZWxsPkNhcmQgUGxheWVkPC9UYWJsZUNlbGw+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPFRhYmxlQ2VsbD5Sb2xlPC9UYWJsZUNlbGw+XG4gICAgICAgICAgICAgICAgICAgICAgICAgIDwvVGFibGVSb3c+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L1RhYmxlSGVhZD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxUYWJsZUJvZHk+XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHt0cmljay5jYXJkcy5tYXAoKGMsIGNJZHgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpc1dpbm5lciA9IGMucGxheWVySWQgPT09IHRyaWNrLndpbm5lcklkO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGlzTGVhZCA9IGMucGxheWVySWQgPT09IHRyaWNrLmxlYWRlcklkO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGlzVHJ1bXAgPVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYy5jYXJkLmNhcmRUeXBlICE9PSAnSk9LRVInICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjLmNhcmQuc3VpdD8udG9VcHBlckNhc2UoKSA9PT0gY3VycmVudFJvdW5kLnRydW1wPy50b1VwcGVyQ2FzZSgpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxUYWJsZVJvd1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBrZXk9e2NJZHh9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlPXt7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYmFja2dyb3VuZENvbG9yOiBpc1dpbm5lciA/ICcjZjBmZGY0JyA6ICd0cmFuc3BhcmVudCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH19XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxUYWJsZUNlbGw+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPEJveCBmbGV4IGFsaWduSXRlbXM9XCJjZW50ZXJcIiBnYXA9XCJzbVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPFRleHQgZm9udFdlaWdodD17aXNXaW5uZXIgPyAnYm9sZCcgOiAnbm9ybWFsJ30+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtnZXRQbGF5ZXJOYW1lKGMucGxheWVySWQpfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9UZXh0PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge2lzV2lubmVyICYmIChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPEJhZGdlIHNpemU9XCJzbVwiIHZhcmlhbnQ9XCJzdWNjZXNzXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg4pyTIFdJTlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L0JhZGdlPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L0JveD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9UYWJsZUNlbGw+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxUYWJsZUNlbGw+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPEJveCBmbGV4IGFsaWduSXRlbXM9XCJjZW50ZXJcIiBnYXA9XCJ4c1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPENhcmRWaWV3IGNhcmQ9e2MuY2FyZH0gLz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtpc1RydW1wICYmIChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPEJhZGdlIHNpemU9XCJzbVwiIHZhcmlhbnQ9XCJwcmltYXJ5XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgVFJVTVBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9CYWRnZT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICl9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9Cb3g+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvVGFibGVDZWxsPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8VGFibGVDZWxsPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtpc0xlYWQgJiYgKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPEJhZGdlIHNpemU9XCJzbVwiIHZhcmlhbnQ9XCJpbmZvXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIExFQURcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvQmFkZ2U+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9UYWJsZUNlbGw+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L1RhYmxlUm93PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0pfVxuICAgICAgICAgICAgICAgICAgICAgICAgPC9UYWJsZUJvZHk+XG4gICAgICAgICAgICAgICAgICAgICAgPC9UYWJsZT5cblxuICAgICAgICAgICAgICAgICAgICAgIHthbmFseXNpcy5oYXNIYW5kcyAmJiB0cmljay5oYW5kc0JlZm9yZSAmJiAoXG4gICAgICAgICAgICAgICAgICAgICAgICA8Qm94IHA9XCJsZ1wiIGJnPVwid2hpdGVcIiBzdHlsZT17eyBib3JkZXJUb3A6ICcxcHggZGFzaGVkICNlMmU4ZjAnIH19PlxuICAgICAgICAgICAgICAgICAgICAgICAgICA8TGFiZWwgbWI9XCJzbVwiPkhhbmRzIGJlZm9yZSB0cmljazwvTGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICAgIDxCb3ggZmxleCBmbGV4V3JhcD1cIndyYXBcIiBnYXA9XCJsZ1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtPYmplY3QuZW50cmllcyh0cmljay5oYW5kc0JlZm9yZSkubWFwKChbcGlkLCBjYXJkc10pID0+IChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxCb3gga2V5PXtwaWR9IHN0eWxlPXt7IG1pbldpZHRoOiAnMjAwcHgnIH19PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8VGV4dFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhcmlhbnQ9XCJ4c1wiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sb3I9XCJncmV5LjYwXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYj1cInhzXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0VHJhbnNmb3JtPVwidXBwZXJjYXNlXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb250V2VpZ2h0PVwiYm9sZFwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7Z2V0UGxheWVyTmFtZShwaWQpfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L1RleHQ+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxCb3g+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge2NhcmRzLm1hcCgoY2FyZCwgaSkgPT4gKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPENhcmRWaWV3IGtleT17aX0gY2FyZD17Y2FyZH0gLz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7Y2FyZHMubGVuZ3RoID09PSAwICYmIChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxUZXh0IHZhcmlhbnQ9XCJzbVwiIGNvbG9yPVwiZ3JleS40MFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBFbXB0eVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9UZXh0PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICl9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvQm94PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9Cb3g+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKSl9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIDwvQm94PlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9Cb3g+XG4gICAgICAgICAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAgICAgICAgPC9Cb3g+XG4gICAgICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgICAgICA8L0JveD5cbiAgICAgICAgICAgICAgPC9Cb3g+XG5cbiAgICAgICAgICAgICAgey8qIFJvdW5kIFJlc3VsdHMgU2VjdGlvbiAqL31cbiAgICAgICAgICAgICAge2N1cnJlbnRSb3VuZC5zY29yZXMgJiYgKFxuICAgICAgICAgICAgICAgIDxCb3hcbiAgICAgICAgICAgICAgICAgIG1iPVwieGxcIlxuICAgICAgICAgICAgICAgICAgYmc9XCJ3aGl0ZVwiXG4gICAgICAgICAgICAgICAgICBib3JkZXI9XCJkZWZhdWx0XCJcbiAgICAgICAgICAgICAgICAgIHN0eWxlPXt7XG4gICAgICAgICAgICAgICAgICAgIGJvcmRlclJhZGl1czogJzEycHgnLFxuICAgICAgICAgICAgICAgICAgICBvdmVyZmxvdzogJ2hpZGRlbicsXG4gICAgICAgICAgICAgICAgICAgIGJveFNoYWRvdzogJzAgMnB4IDVweCByZ2JhKDAsMCwwLDAuMDIpJyxcbiAgICAgICAgICAgICAgICAgIH19XG4gICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgPEJveCBweD1cInhsXCIgcHk9XCJsZ1wiIGJvcmRlckJvdHRvbT1cImRlZmF1bHRcIiBiZz1cImdyZXkuMjBcIj5cbiAgICAgICAgICAgICAgICAgICAgPFRleHQgYXM9XCJoM1wiIGZvbnRTaXplPVwibGdcIiBmb250V2VpZ2h0PVwiYm9sZFwiIGNvbG9yPVwiZ3JleS44MFwiPlxuICAgICAgICAgICAgICAgICAgICAgIFJvdW5kIFJlc3VsdHNcbiAgICAgICAgICAgICAgICAgICAgPC9UZXh0PlxuICAgICAgICAgICAgICAgICAgPC9Cb3g+XG4gICAgICAgICAgICAgICAgICA8Qm94IHA9XCJ4bFwiPlxuICAgICAgICAgICAgICAgICAgICA8VGFibGU+XG4gICAgICAgICAgICAgICAgICAgICAgPFRhYmxlSGVhZD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxUYWJsZVJvdz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgPFRhYmxlQ2VsbD5QbGF5ZXI8L1RhYmxlQ2VsbD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgPFRhYmxlQ2VsbD5CaWQ8L1RhYmxlQ2VsbD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgPFRhYmxlQ2VsbD5Ucmlja3MgV29uPC9UYWJsZUNlbGw+XG4gICAgICAgICAgICAgICAgICAgICAgICAgIDxUYWJsZUNlbGw+Um91bmQgU2NvcmU8L1RhYmxlQ2VsbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvVGFibGVSb3c+XG4gICAgICAgICAgICAgICAgICAgICAgPC9UYWJsZUhlYWQ+XG4gICAgICAgICAgICAgICAgICAgICAgPFRhYmxlQm9keT5cbiAgICAgICAgICAgICAgICAgICAgICAgIHtPYmplY3QuZW50cmllcyhjdXJyZW50Um91bmQuc2NvcmVzKS5tYXAoKFtwaWQsIHNjb3JlXSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB3b25Db3VudCA9IGN1cnJlbnRSb3VuZC50cmlja3MuZmlsdGVyKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICh0KSA9PiB0Lndpbm5lcklkID09PSBwaWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICkubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBiaWQgPSBjdXJyZW50Um91bmQuYmV0c1twaWRdIHx8IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPFRhYmxlUm93IGtleT17cGlkfT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxUYWJsZUNlbGw+e2dldFBsYXllck5hbWUocGlkKX08L1RhYmxlQ2VsbD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxUYWJsZUNlbGw+e2JpZH08L1RhYmxlQ2VsbD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxUYWJsZUNlbGw+e3dvbkNvdW50fTwvVGFibGVDZWxsPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPFRhYmxlQ2VsbD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPEJhZGdlIHZhcmlhbnQ9e3Njb3JlID4gMCA/ICdzdWNjZXNzJyA6ICdkYW5nZXInfT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7c2NvcmUgPiAwID8gYCske3Njb3JlfWAgOiBzY29yZX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9CYWRnZT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvVGFibGVDZWxsPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvVGFibGVSb3c+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KX1cbiAgICAgICAgICAgICAgICAgICAgICA8L1RhYmxlQm9keT5cbiAgICAgICAgICAgICAgICAgICAgPC9UYWJsZT5cbiAgICAgICAgICAgICAgICAgIDwvQm94PlxuICAgICAgICAgICAgICAgIDwvQm94PlxuICAgICAgICAgICAgICApfVxuICAgICAgICAgICAgPC9Cb3g+XG4gICAgICAgICAgKSA6IChcbiAgICAgICAgICAgIDxCb3hcbiAgICAgICAgICAgICAgcD1cInh4bFwiXG4gICAgICAgICAgICAgIHRleHRBbGlnbj1cImNlbnRlclwiXG4gICAgICAgICAgICAgIGJnPVwid2hpdGVcIlxuICAgICAgICAgICAgICBzdHlsZT17eyBib3JkZXJSYWRpdXM6ICcxMnB4JywgYm9yZGVyOiAnMXB4IGRhc2hlZCAjY2JkNWUxJyB9fVxuICAgICAgICAgICAgPlxuICAgICAgICAgICAgICA8SWNvbiBpY29uPVwiTGF5b3V0XCIgc2l6ZT17MzJ9IGNvbG9yPVwiZ3JleS40MFwiIC8+XG4gICAgICAgICAgICAgIDxUZXh0IG10PVwibWRcIiBjb2xvcj1cImdyZXkuNjBcIj5cbiAgICAgICAgICAgICAgICBTZWxlY3QgYSByb3VuZCBmcm9tIGFib3ZlIHRvIHZpZXcgZGV0YWlscy5cbiAgICAgICAgICAgICAgPC9UZXh0PlxuICAgICAgICAgICAgPC9Cb3g+XG4gICAgICAgICAgKX1cbiAgICAgICAgPC8+XG4gICAgICApfVxuXG4gICAgICB7LyogVGltZWxpbmUgVmlldyAqL31cbiAgICAgIHt2aWV3TW9kZSA9PT0gJ3RpbWVsaW5lJyAmJiAoXG4gICAgICAgIDxCb3ggYmc9XCJ3aGl0ZVwiIHA9XCJ4bFwiIHN0eWxlPXt7IGJvcmRlclJhZGl1czogJzEycHgnLCBib3JkZXI6ICcxcHggc29saWQgI2VkZjJmNycgfX0+XG4gICAgICAgICAgPEJveCBmbGV4IGdhcD1cImxnXCIgbWI9XCJ4bFwiPlxuICAgICAgICAgICAgPEJveCBmbGV4R3Jvdz17MX0+XG4gICAgICAgICAgICAgIDxMYWJlbD5GaWx0ZXIgYnkgQWN0aW9uPC9MYWJlbD5cbiAgICAgICAgICAgICAgPHNlbGVjdFxuICAgICAgICAgICAgICAgIHZhbHVlPXtmaWx0ZXJBY3Rpb259XG4gICAgICAgICAgICAgICAgb25DaGFuZ2U9eyhlKSA9PiBzZXRGaWx0ZXJBY3Rpb24oZS50YXJnZXQudmFsdWUpfVxuICAgICAgICAgICAgICAgIHN0eWxlPXt7XG4gICAgICAgICAgICAgICAgICB3aWR0aDogJzEwMCUnLFxuICAgICAgICAgICAgICAgICAgcGFkZGluZzogJzEwcHgnLFxuICAgICAgICAgICAgICAgICAgYm9yZGVyUmFkaXVzOiAnNnB4JyxcbiAgICAgICAgICAgICAgICAgIGJvcmRlcjogJzFweCBzb2xpZCAjY2JkNWUxJyxcbiAgICAgICAgICAgICAgICAgIGJhY2tncm91bmRDb2xvcjogJyNmOGZhZmMnLFxuICAgICAgICAgICAgICAgIH19XG4gICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICA8b3B0aW9uIHZhbHVlPVwiXCI+QWxsIEFjdGlvbnM8L29wdGlvbj5cbiAgICAgICAgICAgICAgICB7YW5hbHlzaXMuZXZlbnRUeXBlcy5tYXAoKHR5cGUpID0+IChcbiAgICAgICAgICAgICAgICAgIDxvcHRpb24ga2V5PXt0eXBlfSB2YWx1ZT17dHlwZX0+XG4gICAgICAgICAgICAgICAgICAgIHt0eXBlfVxuICAgICAgICAgICAgICAgICAgPC9vcHRpb24+XG4gICAgICAgICAgICAgICAgKSl9XG4gICAgICAgICAgICAgIDwvc2VsZWN0PlxuICAgICAgICAgICAgPC9Cb3g+XG4gICAgICAgICAgICA8Qm94IGZsZXhHcm93PXsxfT5cbiAgICAgICAgICAgICAgPExhYmVsPkZpbHRlciBieSBQbGF5ZXI8L0xhYmVsPlxuICAgICAgICAgICAgICA8c2VsZWN0XG4gICAgICAgICAgICAgICAgdmFsdWU9e2ZpbHRlclBsYXllcn1cbiAgICAgICAgICAgICAgICBvbkNoYW5nZT17KGUpID0+IHNldEZpbHRlclBsYXllcihlLnRhcmdldC52YWx1ZSl9XG4gICAgICAgICAgICAgICAgc3R5bGU9e3tcbiAgICAgICAgICAgICAgICAgIHdpZHRoOiAnMTAwJScsXG4gICAgICAgICAgICAgICAgICBwYWRkaW5nOiAnMTBweCcsXG4gICAgICAgICAgICAgICAgICBib3JkZXJSYWRpdXM6ICc2cHgnLFxuICAgICAgICAgICAgICAgICAgYm9yZGVyOiAnMXB4IHNvbGlkICNjYmQ1ZTEnLFxuICAgICAgICAgICAgICAgICAgYmFja2dyb3VuZENvbG9yOiAnI2Y4ZmFmYycsXG4gICAgICAgICAgICAgICAgfX1cbiAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgIDxvcHRpb24gdmFsdWU9XCJcIj5BbGwgUGxheWVyczwvb3B0aW9uPlxuICAgICAgICAgICAgICAgIHthbmFseXNpcy5wbGF5ZXJzLm1hcCgocDogYW55KSA9PiAoXG4gICAgICAgICAgICAgICAgICA8b3B0aW9uIGtleT17cC5pZH0gdmFsdWU9e1N0cmluZyhwLmlkKX0+XG4gICAgICAgICAgICAgICAgICAgIHtwLm5hbWUgfHwgcC51c2VybmFtZSB8fCBwLmlkfVxuICAgICAgICAgICAgICAgICAgPC9vcHRpb24+XG4gICAgICAgICAgICAgICAgKSl9XG4gICAgICAgICAgICAgIDwvc2VsZWN0PlxuICAgICAgICAgICAgPC9Cb3g+XG4gICAgICAgICAgPC9Cb3g+XG5cbiAgICAgICAgICA8VGFibGU+XG4gICAgICAgICAgICA8VGFibGVIZWFkPlxuICAgICAgICAgICAgICA8VGFibGVSb3c+XG4gICAgICAgICAgICAgICAgPFRhYmxlQ2VsbD5UaW1lPC9UYWJsZUNlbGw+XG4gICAgICAgICAgICAgICAgPFRhYmxlQ2VsbD5Db250ZXh0PC9UYWJsZUNlbGw+XG4gICAgICAgICAgICAgICAgPFRhYmxlQ2VsbD5BY3Rpb248L1RhYmxlQ2VsbD5cbiAgICAgICAgICAgICAgICA8VGFibGVDZWxsPlBsYXllcjwvVGFibGVDZWxsPlxuICAgICAgICAgICAgICAgIDxUYWJsZUNlbGw+RGV0YWlsczwvVGFibGVDZWxsPlxuICAgICAgICAgICAgICA8L1RhYmxlUm93PlxuICAgICAgICAgICAgPC9UYWJsZUhlYWQ+XG4gICAgICAgICAgICA8VGFibGVCb2R5PlxuICAgICAgICAgICAgICB7ZmlsdGVyZWRFdmVudHMubWFwKChldmVudCkgPT4gKFxuICAgICAgICAgICAgICAgIDxUYWJsZVJvdyBrZXk9e2V2ZW50LmluZGV4fT5cbiAgICAgICAgICAgICAgICAgIDxUYWJsZUNlbGw+XG4gICAgICAgICAgICAgICAgICAgIDxUZXh0IHZhcmlhbnQ9XCJzbVwiIGNvbG9yPVwiZ3JleS42MFwiPlxuICAgICAgICAgICAgICAgICAgICAgIHtuZXcgRGF0ZShldmVudC50aW1lc3RhbXApLnRvTG9jYWxlVGltZVN0cmluZyhbXSwge1xuICAgICAgICAgICAgICAgICAgICAgICAgaG91cjogJzItZGlnaXQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWludXRlOiAnMi1kaWdpdCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWNvbmQ6ICcyLWRpZ2l0JyxcbiAgICAgICAgICAgICAgICAgICAgICB9KX1cbiAgICAgICAgICAgICAgICAgICAgPC9UZXh0PlxuICAgICAgICAgICAgICAgICAgPC9UYWJsZUNlbGw+XG4gICAgICAgICAgICAgICAgICA8VGFibGVDZWxsPlxuICAgICAgICAgICAgICAgICAgICA8QmFkZ2UgdmFyaWFudD1cImxpZ2h0XCIgc2l6ZT1cInNtXCI+XG4gICAgICAgICAgICAgICAgICAgICAgUHtldmVudC5wdWxrYX0tUntldmVudC5yb3VuZH1cbiAgICAgICAgICAgICAgICAgICAgPC9CYWRnZT5cbiAgICAgICAgICAgICAgICAgIDwvVGFibGVDZWxsPlxuICAgICAgICAgICAgICAgICAgPFRhYmxlQ2VsbD5cbiAgICAgICAgICAgICAgICAgICAgPEJhZGdlIHZhcmlhbnQ9XCJwcmltYXJ5XCIgc2l6ZT1cInNtXCI+XG4gICAgICAgICAgICAgICAgICAgICAge2V2ZW50LmFjdGlvbn1cbiAgICAgICAgICAgICAgICAgICAgPC9CYWRnZT5cbiAgICAgICAgICAgICAgICAgIDwvVGFibGVDZWxsPlxuICAgICAgICAgICAgICAgICAgPFRhYmxlQ2VsbD5cbiAgICAgICAgICAgICAgICAgICAgPFRleHQgZm9udFdlaWdodD1cImJvbGRcIj57Z2V0UGxheWVyTmFtZShldmVudC5wbGF5ZXJJZCl9PC9UZXh0PlxuICAgICAgICAgICAgICAgICAgPC9UYWJsZUNlbGw+XG4gICAgICAgICAgICAgICAgICA8VGFibGVDZWxsPlxuICAgICAgICAgICAgICAgICAgICB7ZXZlbnQuYWN0aW9uID09PSAnQ0FSRCcgJiYgZXZlbnQuZGF0YT8uY2FyZElkICYmIChcbiAgICAgICAgICAgICAgICAgICAgICA8Q2FyZFZpZXdcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhcmQ9e3tcbiAgICAgICAgICAgICAgICAgICAgICAgICAgY2FyZElkOiBTdHJpbmcoZXZlbnQuZGF0YS5jYXJkSWQpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBjYXJkVHlwZTogZXZlbnQuZGF0YS5jYXJkVHlwZSBhcyBzdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHN1aXQ6IGV2ZW50LmRhdGEuc3VpdCBhcyBzdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHJhbms6IGV2ZW50LmRhdGEucmFuayBhcyBzdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGpva2VyT3B0aW9uOiBldmVudC5kYXRhLmpva2VyT3B0aW9uIGFzIHN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWVzdGVkU3VpdDogZXZlbnQuZGF0YS5yZXF1ZXN0ZWRTdWl0IGFzIHN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIH19XG4gICAgICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAgICAgICAge2V2ZW50LmFjdGlvbiA9PT0gJ0JFVCcgJiYgKFxuICAgICAgICAgICAgICAgICAgICAgIDxUZXh0PlxuICAgICAgICAgICAgICAgICAgICAgICAgQmV0IDxzdHJvbmc+e1N0cmluZyhldmVudC5kYXRhPy5hbW91bnQpfTwvc3Ryb25nPlxuICAgICAgICAgICAgICAgICAgICAgIDwvVGV4dD5cbiAgICAgICAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAgICAgICAge2V2ZW50LmFjdGlvbiA9PT0gJ1RSVU1QJyAmJiAoXG4gICAgICAgICAgICAgICAgICAgICAgPFRleHQ+XG4gICAgICAgICAgICAgICAgICAgICAgICBTZWxlY3RlZCBUcnVtcDogPHN0cm9uZz57U3RyaW5nKGV2ZW50LmRhdGE/LnRydW1wKX08L3N0cm9uZz5cbiAgICAgICAgICAgICAgICAgICAgICA8L1RleHQ+XG4gICAgICAgICAgICAgICAgICAgICl9XG4gICAgICAgICAgICAgICAgICAgIHtldmVudC5hY3Rpb24gPT09ICdUUklDS19XSU5ORVInICYmIChcbiAgICAgICAgICAgICAgICAgICAgICA8VGV4dD5cbiAgICAgICAgICAgICAgICAgICAgICAgIFdvbiB0cmljayB3aXRoIDxzdHJvbmc+e1N0cmluZyhldmVudC5kYXRhPy50cmlja3MpfTwvc3Ryb25nPiBwb2ludHNcbiAgICAgICAgICAgICAgICAgICAgICA8L1RleHQ+XG4gICAgICAgICAgICAgICAgICAgICl9XG4gICAgICAgICAgICAgICAgICAgIHshWydDQVJEJywgJ0JFVCcsICdUUlVNUCcsICdUUklDS19XSU5ORVInXS5pbmNsdWRlcyhldmVudC5hY3Rpb24pICYmXG4gICAgICAgICAgICAgICAgICAgICAgZXZlbnQuZGF0YSAmJiAoXG4gICAgICAgICAgICAgICAgICAgICAgICA8VGV4dCB2YXJpYW50PVwic21cIiBjb2xvcj1cImdyZXkuNjBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAge0pTT04uc3RyaW5naWZ5KGV2ZW50LmRhdGEpLnN1YnN0cmluZygwLCA1MCl9XG4gICAgICAgICAgICAgICAgICAgICAgICA8L1RleHQ+XG4gICAgICAgICAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAgICAgIDwvVGFibGVDZWxsPlxuICAgICAgICAgICAgICAgIDwvVGFibGVSb3c+XG4gICAgICAgICAgICAgICkpfVxuICAgICAgICAgICAgICB7ZmlsdGVyZWRFdmVudHMubGVuZ3RoID09PSAwICYmIChcbiAgICAgICAgICAgICAgICA8VGFibGVSb3c+XG4gICAgICAgICAgICAgICAgICA8VGFibGVDZWxsIGNvbFNwYW49ezV9IHN0eWxlPXt7IHRleHRBbGlnbjogJ2NlbnRlcicsIHBhZGRpbmc6ICczMnB4JyB9fT5cbiAgICAgICAgICAgICAgICAgICAgPFRleHQgY29sb3I9XCJncmV5LjQwXCI+Tm8gZXZlbnRzIGZvdW5kIG1hdGNoaW5nIHlvdXIgZmlsdGVyczwvVGV4dD5cbiAgICAgICAgICAgICAgICAgIDwvVGFibGVDZWxsPlxuICAgICAgICAgICAgICAgIDwvVGFibGVSb3c+XG4gICAgICAgICAgICAgICl9XG4gICAgICAgICAgICA8L1RhYmxlQm9keT5cbiAgICAgICAgICA8L1RhYmxlPlxuICAgICAgICA8L0JveD5cbiAgICAgICl9XG5cbiAgICAgIHshYW5hbHlzaXMuaGFzSGFuZHMgJiYgKFxuICAgICAgICA8Qm94IG10PVwieGxcIiBwPVwibWRcIiBiZz1cImluZm8uMTBcIiBzdHlsZT17eyBib3JkZXJSYWRpdXM6ICc2cHgnIH19PlxuICAgICAgICAgIDxUZXh0IHZhcmlhbnQ9XCJzbVwiIGNvbG9yPVwiaW5mby4xMDBcIj5cbiAgICAgICAgICAgIE5vdGU6IERldGFpbGVkIGhhbmQgZGF0YSBpcyBub3QgYXZhaWxhYmxlIGZvciB0aGlzIGdhbWUgYW5hbHlzaXMgKHNlcnZlciBtaWdodCBiZVxuICAgICAgICAgICAgY29uZmlndXJlZCB0byBub3Qgc3RvcmUgaGFuZHMgZm9yIHByaXZhY3kvc3RvcmFnZSByZWFzb25zKS5cbiAgICAgICAgICA8L1RleHQ+XG4gICAgICAgIDwvQm94PlxuICAgICAgKX1cbiAgICA8L0JveD5cbiAgKTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IEdhbWVBbmFseXNpc0NvbXBvbmVudDtcbiIsIkFkbWluSlMuVXNlckNvbXBvbmVudHMgPSB7fVxuaW1wb3J0IEdhbWVBbmFseXNpcyBmcm9tICcuLi9zcmMvY29tcG9uZW50cy9HYW1lQW5hbHlzaXMvaW5kZXgnXG5BZG1pbkpTLlVzZXJDb21wb25lbnRzLkdhbWVBbmFseXNpcyA9IEdhbWVBbmFseXNpcyJdLCJuYW1lcyI6WyJnZXRTdWl0U3ltYm9sIiwic3VpdCIsInRvVXBwZXJDYXNlIiwiZ2V0U3VpdENvbG9yIiwiZ2V0U3VpdE5hbWUiLCJnZXRSYW5rRGlzcGxheSIsInJhbmsiLCJ1bmRlZmluZWQiLCJudW1SYW5rIiwicGFyc2VJbnQiLCJTdHJpbmciLCJnZXRKb2tlck9wdGlvbkRpc3BsYXkiLCJvcHRpb24iLCJnZXRKb2tlck9wdGlvbkNvbG9yIiwiQ2FyZFZpZXciLCJjYXJkIiwiY2FyZFR5cGUiLCJvcHRpb25EaXNwbGF5Iiwiam9rZXJPcHRpb24iLCJvcHRpb25Db2xvciIsInJlcXVlc3RlZFN1aXRTeW1ib2wiLCJyZXF1ZXN0ZWRTdWl0IiwicmVxdWVzdGVkU3VpdENvbG9yIiwiUmVhY3QiLCJjcmVhdGVFbGVtZW50IiwiQm94IiwiYXMiLCJkaXNwbGF5IiwiYWxpZ25JdGVtcyIsImp1c3RpZnlDb250ZW50IiwicHkiLCJweCIsIm1yIiwibWIiLCJzdHlsZSIsImJvcmRlclJhZGl1cyIsImJvcmRlciIsImJhY2tncm91bmRDb2xvciIsImNvbG9yIiwiZm9udFdlaWdodCIsImZvbnRTaXplIiwibWluV2lkdGgiLCJJY29uIiwiaWNvbiIsInNpemUiLCJtYXJnaW5SaWdodCIsInN5bWJvbCIsInJhbmtEaXNwbGF5IiwiYmciLCJib3hTaGFkb3ciLCJHYW1lQW5hbHlzaXNDb21wb25lbnQiLCJwcm9wcyIsInJlY29yZCIsImFuYWx5c2lzSnNvbiIsInBhcmFtcyIsInNlbGVjdGVkUm91bmRJbmRleCIsInNldFNlbGVjdGVkUm91bmRJbmRleCIsInVzZVN0YXRlIiwidmlld01vZGUiLCJzZXRWaWV3TW9kZSIsImZpbHRlckFjdGlvbiIsInNldEZpbHRlckFjdGlvbiIsImZpbHRlclBsYXllciIsInNldEZpbHRlclBsYXllciIsImFuYWx5c2lzIiwidXNlTWVtbyIsIkpTT04iLCJwYXJzZSIsImUiLCJjb25zb2xlIiwiZXJyb3IiLCJwbGF5ZXJzTWFwIiwibWFwIiwiTWFwIiwicGxheWVycyIsImZvckVhY2giLCJwIiwic2V0IiwiaWQiLCJuYW1lIiwidXNlcm5hbWUiLCJnZXRQbGF5ZXJOYW1lIiwiZ2V0IiwiZmlsdGVyZWRFdmVudHMiLCJldmVudHMiLCJmaWx0ZXIiLCJhY3Rpb24iLCJwbGF5ZXJJZCIsIlRleHQiLCJjdXJyZW50Um91bmQiLCJyb3VuZHMiLCJmbGV4IiwiZmxleERpcmVjdGlvbiIsImdhcCIsIkJ1dHRvbiIsInZhcmlhbnQiLCJvbkNsaWNrIiwiRnJhZ21lbnQiLCJvdmVyZmxvd1giLCJ3aGl0ZVNwYWNlIiwicGFkZGluZ0JvdHRvbSIsInIiLCJpZHgiLCJpc0FjdGl2ZSIsImtleSIsInB1bGthIiwicm91bmQiLCJvcGFjaXR5IiwiYW5pbWF0ZSIsIkxhYmVsIiwiY2FyZHNQZXJQbGF5ZXIiLCJ0ZXh0QWxpZ24iLCJ0cnVtcCIsIkJhZGdlIiwibGluZUhlaWdodCIsImRlYWxlcklkIiwib3ZlcmZsb3ciLCJib3JkZXJCb3R0b20iLCJmbGV4V3JhcCIsIk9iamVjdCIsImVudHJpZXMiLCJiZXRzIiwicGlkIiwiYmV0IiwidHJpY2tzIiwibGVuZ3RoIiwidHJpY2siLCJ0SWR4IiwiaW5kZXgiLCJ3aW5uZXJJZCIsIndpbm5lclRyaWNrcyIsIlRhYmxlIiwiVGFibGVIZWFkIiwiVGFibGVSb3ciLCJUYWJsZUNlbGwiLCJUYWJsZUJvZHkiLCJjYXJkcyIsImMiLCJjSWR4IiwiaXNXaW5uZXIiLCJpc0xlYWQiLCJsZWFkZXJJZCIsImlzVHJ1bXAiLCJoYXNIYW5kcyIsImhhbmRzQmVmb3JlIiwiYm9yZGVyVG9wIiwidGV4dFRyYW5zZm9ybSIsImkiLCJzY29yZXMiLCJzY29yZSIsIndvbkNvdW50IiwidCIsImJpZCIsIm10IiwiZmxleEdyb3ciLCJ2YWx1ZSIsIm9uQ2hhbmdlIiwidGFyZ2V0Iiwid2lkdGgiLCJwYWRkaW5nIiwiZXZlbnRUeXBlcyIsInR5cGUiLCJldmVudCIsIkRhdGUiLCJ0aW1lc3RhbXAiLCJ0b0xvY2FsZVRpbWVTdHJpbmciLCJob3VyIiwibWludXRlIiwic2Vjb25kIiwiZGF0YSIsImNhcmRJZCIsImFtb3VudCIsImluY2x1ZGVzIiwic3RyaW5naWZ5Iiwic3Vic3RyaW5nIiwiY29sU3BhbiIsIkFkbWluSlMiLCJVc2VyQ29tcG9uZW50cyIsIkdhbWVBbmFseXNpcyJdLCJtYXBwaW5ncyI6Ijs7Ozs7OztFQWdCQTs7RUFtREE7O0VBRUEsTUFBTUEsYUFBYSxHQUFJQyxJQUFtQixJQUFLO0VBQzdDLEVBQUEsSUFBSSxDQUFDQSxJQUFJLEVBQUUsT0FBTyxFQUFFO0VBQ3BCLEVBQUEsUUFBUUEsSUFBSSxDQUFDQyxXQUFXLEVBQUU7RUFDeEIsSUFBQSxLQUFLLFFBQVE7RUFDWCxNQUFBLE9BQU8sR0FBRztFQUNaLElBQUEsS0FBSyxVQUFVO0VBQ2IsTUFBQSxPQUFPLEdBQUc7RUFDWixJQUFBLEtBQUssT0FBTztFQUNWLE1BQUEsT0FBTyxHQUFHO0VBQ1osSUFBQSxLQUFLLFFBQVE7RUFDWCxNQUFBLE9BQU8sR0FBRztFQUNaLElBQUE7RUFDRSxNQUFBLE9BQU8sRUFBRTtFQUNiO0VBQ0YsQ0FBQztFQUVELE1BQU1DLFlBQVksR0FBSUYsSUFBbUIsSUFBSztFQUM1QyxFQUFBLElBQUksQ0FBQ0EsSUFBSSxFQUFFLE9BQU8sU0FBUztFQUMzQixFQUFBLFFBQVFBLElBQUksQ0FBQ0MsV0FBVyxFQUFFO0VBQ3hCLElBQUEsS0FBSyxRQUFRO0VBQ2IsSUFBQSxLQUFLLFVBQVU7RUFDYixNQUFBLE9BQU8sU0FBUztFQUFFO0VBQ3BCLElBQUEsS0FBSyxPQUFPO0VBQ1osSUFBQSxLQUFLLFFBQVE7RUFDWCxNQUFBLE9BQU8sU0FBUztFQUFFO0VBQ3BCLElBQUE7RUFDRSxNQUFBLE9BQU8sU0FBUztFQUFFO0VBQ3RCO0VBQ0YsQ0FBQztFQUVELE1BQU1FLFdBQVcsR0FBSUgsSUFBbUIsSUFBYTtFQUNuRCxFQUFBLElBQUksQ0FBQ0EsSUFBSSxFQUFFLE9BQU8sRUFBRTtFQUNwQixFQUFB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
