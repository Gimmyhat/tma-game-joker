/**
 * E2E Test Script - Simulates 4 players connecting and playing
 * Run: npx ts-node scripts/e2e-test.ts
 */

import { io, Socket } from 'socket.io-client';

const SERVER_URL = 'http://localhost:3000';
const PLAYERS_COUNT = 4;

interface GameState {
  id: string;
  phase: string;
  round: number;
  players: Array<{ id: string; name: string; bet: number | null }>;
  table: unknown[];
  trump: string | null;
}

interface PlayerClient {
  id: string;
  name: string;
  socket: Socket;
  roomId: string | null;
  gameState: GameState | null;
  hand: unknown[];
}

const players: PlayerClient[] = [];

function createPlayer(index: number): Promise<PlayerClient> {
  return new Promise((resolve, reject) => {
    const playerId = `player_${index}_${Date.now()}`;
    const playerName = `Player ${index + 1}`;

    console.log(`[${playerName}] Connecting...`);

    const socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      auth: {
        initData: `mock_init_data_${playerId}`,
      },
    });

    const player: PlayerClient = {
      id: playerId,
      name: playerName,
      socket,
      roomId: null,
      gameState: null,
      hand: [],
    };

    socket.on('connect', () => {
      console.log(`[${playerName}] ✅ Connected (socketId: ${socket.id})`);
      resolve(player);
    });

    socket.on('connect_error', (err) => {
      console.error(`[${playerName}] ❌ Connection error:`, err.message);
      reject(err);
    });

    socket.on('room_joined', (data) => {
      console.log(`[${playerName}] 📦 Joined room:`, data.roomId, `(${data.playersCount} players)`);
      player.roomId = data.roomId;
    });

    socket.on('waiting_for_players', (data) => {
      console.log(`[${playerName}] ⏳ Waiting: ${data.current}/${data.required} players`);
    });

    socket.on('player_joined', (data) => {
      console.log(`[${playerName}] 👋 ${data.playerName} joined (${data.playersCount} total)`);
    });

    socket.on('game_started', (data) => {
      console.log(`[${playerName}] 🎮 Game started! Room: ${data.roomId}`);
    });

    socket.on('game_state', (data) => {
      player.gameState = data.state;
      player.hand = data.yourHand;
      console.log(
        `[${playerName}] 📊 Game state: phase=${data.state.phase}, round=${data.state.round}, hand=${data.yourHand.length} cards`,
      );
    });

    socket.on('error', (data) => {
      console.error(`[${playerName}] ❌ Error:`, data);
    });

    socket.on('disconnect', (reason) => {
      console.log(`[${playerName}] 🔌 Disconnected:`, reason);
    });

    // Timeout after 5 seconds
    setTimeout(() => {
      if (!socket.connected) {
        reject(new Error(`${playerName} connection timeout`));
      }
    }, 5000);
  });
}

async function runTest() {
  console.log('========================================');
  console.log('🃏 Joker E2E Test - 4 Players');
  console.log('========================================\n');

  try {
    // Step 1: Connect all players
    console.log('Step 1: Connecting players...\n');
    for (let i = 0; i < PLAYERS_COUNT; i++) {
      const player = await createPlayer(i);
      players.push(player);
      await new Promise((r) => setTimeout(r, 100)); // Small delay between connections
    }
    console.log('\n✅ All players connected!\n');

    // Step 2: Each player finds a game
    console.log('Step 2: Finding game...\n');
    for (const player of players) {
      console.log(`[${player.name}] Emitting find_game...`);
      player.socket.emit('find_game', {});
      await new Promise((r) => setTimeout(r, 200)); // Stagger requests
    }

    // Step 3: Wait for game to start
    console.log('\nStep 3: Waiting for game to start...\n');
    await new Promise((r) => setTimeout(r, 3000));

    // Step 4: Check game state
    console.log('\n========================================');
    console.log('📊 Final State Check');
    console.log('========================================\n');

    for (const player of players) {
      const state = player.gameState;
      if (state) {
        console.log(
          `[${player.name}] Phase: ${state.phase}, Round: ${state.round}, Hand: ${player.hand.length} cards`,
        );
      } else {
        console.log(`[${player.name}] ❌ No game state received`);
      }
    }

    // Step 5: If in betting phase, make bets
    const firstPlayer = players[0];
    if (firstPlayer.gameState?.phase === 'betting') {
      console.log('\n========================================');
      console.log('🎲 Making Bets');
      console.log('========================================\n');

      // Find current player and make bet
      const currentIndex = firstPlayer.gameState.players.findIndex(
        (p, i) => i === (firstPlayer.gameState as GameState).players.length - 1, // simplified
      );

      for (const player of players) {
        if (player.roomId) {
          console.log(`[${player.name}] Making bet: 0`);
          player.socket.emit('make_bet', { roomId: player.roomId, amount: 0 });
          await new Promise((r) => setTimeout(r, 500));
        }
      }

      await new Promise((r) => setTimeout(r, 2000));

      // Check updated state
      console.log('\n📊 After betting:');
      for (const player of players) {
        if (player.gameState) {
          console.log(`[${player.name}] Phase: ${player.gameState.phase}`);
        }
      }
    }

    console.log('\n========================================');
    console.log('✅ E2E Test Complete!');
    console.log('========================================\n');
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Cleanup
    console.log('Cleaning up connections...');
    for (const player of players) {
      player.socket.disconnect();
    }
    process.exit(0);
  }
}

runTest();
