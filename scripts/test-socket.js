const { io } = require('socket.io-client');

console.log('Testing connection to http://localhost:3000...');

const socket = io('http://localhost:3000', {
  transports: ['websocket'],
  query: {
    userId: 'test-user-1',
    userName: 'TestUser',
  },
  auth: {
    initData: 'query_id=...',
  },
});

socket.on('connect', () => {
  console.log('✅ Connected successfully! Socket ID:', socket.id);
  process.exit(0);
});

socket.on('connect_error', (err) => {
  console.error('❌ Connection error:', err.message);
  process.exit(1);
});

// Timeout
setTimeout(() => {
  console.error('❌ Timeout waiting for connection');
  process.exit(1);
}, 5000);
