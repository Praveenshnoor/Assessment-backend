const { io } = require('socket.io-client');

const SOCKET_URL = 'http://localhost:5000';

console.log('Testing Socket.IO connection to:', SOCKET_URL);

const socket = io(SOCKET_URL, {
  transports: ['polling', 'websocket'],
  reconnection: true,
  timeout: 20000,
  forceNew: true
});

socket.on('connect', () => {
  console.log('✅ Connected successfully!');
  console.log('Socket ID:', socket.id);
  console.log('Transport:', socket.io.engine.transport.name);
  
  // Test admin join
  socket.emit('admin:join-monitoring');
  console.log('📡 Sent admin:join-monitoring event');
  
  // Disconnect after 5 seconds
  setTimeout(() => {
    console.log('🔌 Disconnecting...');
    socket.disconnect();
  }, 5000);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
  console.error('Error type:', error.type);
  console.error('Error description:', error.description);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 Disconnected. Reason:', reason);
  process.exit(0);
});

socket.on('active-sessions', (sessions) => {
  console.log('📋 Received active sessions:', sessions.length, 'sessions');
});

socket.on('monitoring-config', (config) => {
  console.log('⚙️ Received monitoring config:', config);
});

// Timeout after 30 seconds
setTimeout(() => {
  console.log('⏰ Test timeout - exiting');
  process.exit(1);
}, 30000);