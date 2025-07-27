module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('🟢 New WebSocket connection');

    socket.on('disconnect', () => {
      console.log('🔴 WebSocket disconnected');
    });
  });

  global.io = io;
};
