// Simple E2E test - run with: node scripts/e2e-simple.js
const { io } = require('socket.io-client');

const SERVER_URL = 'http://localhost:3000';

async function createPlayer(index) {
  return new Promise((resolve, reject) => {
    const name = `Player${index + 1}`;
    console.log(`[${name}] Connecting...`);

    const socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      auth: { initData: `mock_${name}_${Date.now()}` },
    });

    const player = { name, socket, roomId: null, gameState: null };

    socket.on('connect', () => {
      console.log(`[${name}] Connected: ${socket.id}`);
      resolve(player);
    });

    socket.on('connect_error', (err) => {
      console.log(`[${name}] Error: ${err.message}`);
      reject(err);
    });

    socket.on('room_joined', (data) => {
      console.log(`[${name}] Room: ${data.roomId} (${data.playersCount}/4)`);
      player.roomId = data.roomId;
    });

    socket.on('waiting_for_players', (data) => {
      console.log(`[${name}] Waiting: ${data.current}/${data.required}`);
    });

    socket.on('player_joined', (data) => {
      console.log(`[${name}] +${data.playerName} (${data.playersCount}/4)`);
    });

    socket.on('game_started', () => {
      console.log(`[${name}] GAME STARTED!`);
    });

    socket.on('game_state', (data) => {
      player.gameState = data.state;
      console.log(
        `[${name}] State: ${data.state.phase}, round=${data.state.round}, hand=${data.yourHand.length} cards`,
      );
    });

    socket.on('error', (data) => {
      console.log(`[${name}] Error:`, data);
    });

    setTimeout(() => reject(new Error('timeout')), 5000);
  });
}

async function main() {
  console.log('\n=== Joker E2E Test ===\n');

  const players = [];

  try {
    // Connect 4 players
    for (let i = 0; i < 4; i++) {
      const p = await createPlayer(i);
      players.push(p);
      await new Promise((r) => setTimeout(r, 100));
    }

    console.log('\n--- All connected, finding game ---\n');

    // All find game
    for (const p of players) {
      p.socket.emit('find_game', {});
      await new Promise((r) => setTimeout(r, 200));
    }

    // Wait for game
    await new Promise((r) => setTimeout(r, 3000));

    console.log('\n--- Final State ---\n');
    for (const p of players) {
      if (p.gameState) {
        console.log(`[${p.name}] ${p.gameState.phase}`);
      } else {
        console.log(`[${p.name}] No state`);
      }
    }

    console.log('\n=== Test Complete ===\n');
  } catch (err) {
    console.error('Failed:', err.message);
  } finally {
    players.forEach((p) => p.socket.disconnect());
    process.exit(0);
  }
}

main();
