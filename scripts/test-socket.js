const { io } = require('socket.io-client');

const URL = 'http://203.31.40.28';
const USER_ID = 'test-bot-' + Math.floor(Math.random() * 1000);

console.log(`Connecting to ${URL} as ${USER_ID}...`);

const socket = io(URL, {
  transports: ['websocket'],
  query: {
    userId: USER_ID,
    userName: 'TestBot',
  },
  auth: {
    initData: 'mock_init_data', // Should be ignored with SKIP_AUTH
  },
});

socket.on('connect', () => {
  console.log('✅ Connected! ID:', socket.id);

  console.log('Sending find_game...');
  socket.emit('find_game', {});
});

socket.on('disconnect', (reason) => {
  console.log('❌ Disconnected:', reason);
});

socket.on('connect_error', (err) => {
  console.log('❌ Connection Error:', err.message);
});

socket.on('error', (err) => {
  console.log('❌ Server Error:', err);
});

// Game events
socket.on('game_started', (data) => {
  console.log('🎮 Game Started!', data);
});

socket.on('game_state', (data) => {
  console.log('📊 Game State Update:', data.state.phase);
});

// Keep alive
setInterval(() => {}, 1000);
