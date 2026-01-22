// Simple E2E test - run with: node apps/backend/scripts/e2e-simple.js
const { io } = require('socket.io-client');

const SERVER_URL = 'http://localhost:3000';
const PLAYERS = 4;

function createPlayer(index) {
  return new Promise((resolve, reject) => {
    const name = `Player${index + 1}`;
    const userId = `e2e_${index + 1}_${Date.now()}`;
    const socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      query: {
        userId,
        userName: name,
      },
      auth: {
        initData: `mock_${userId}`,
      },
    });

    const player = { name, userId, socket, state: null };

    socket.on('connect', () => {
      console.log(`[${name}] connected: ${socket.id}`);
      resolve(player);
    });

    socket.on('connect_error', (err) => {
      console.log(`[${name}] connect error: ${err.message}`);
      reject(err);
    });

    socket.on('room_joined', (data) => {
      console.log(`[${name}] room: ${data.roomId} (${data.playersCount}/4)`);
    });

    socket.on('waiting_for_players', (data) => {
      console.log(`[${name}] waiting: ${data.current}/${data.required}`);
    });

    socket.on('player_joined', (data) => {
      console.log(`[${name}] +${data.playerName} (${data.playersCount}/4)`);
    });

    socket.on('game_started', () => {
      console.log(`[${name}] GAME STARTED`);
    });

    socket.on('game_state', (data) => {
      player.state = data.state;
      const handCount = Array.isArray(data.yourHand) ? data.yourHand.length : 0;
      console.log(
        `[${name}] state: ${data.state.phase}, round=${data.state.round}, hand=${handCount}`,
      );
    });

    socket.on('error', (data) => {
      console.log(`[${name}] error:`, data);
    });

    setTimeout(() => reject(new Error('timeout')), 5000);
  });
}

async function main() {
  console.log('=== Joker E2E Test ===');

  const players = [];

  try {
    for (let i = 0; i < PLAYERS; i += 1) {
      const player = await createPlayer(i);
      players.push(player);
      await new Promise((r) => setTimeout(r, 100));
    }

    console.log('All connected, finding game...');

    for (const player of players) {
      player.socket.emit('find_game', {});
      await new Promise((r) => setTimeout(r, 200));
    }

    await new Promise((r) => setTimeout(r, 3000));

    console.log('=== Results ===');
    for (const player of players) {
      console.log(`[${player.name}] ${player.state ? player.state.phase : 'no state'}`);
    }
  } catch (error) {
    console.error('E2E test failed:', error.message);
  } finally {
    for (const player of players) {
      player.socket.disconnect();
    }
    console.log('=== Done ===');
    process.exit(0);
  }
}

main();
