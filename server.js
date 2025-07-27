const http = require('http');
const app = require('./app');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
require('dotenv').config();
app.get('/healthz', (_, res) => res.send('OK'));
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ['GET', 'POST', 'PUT'],
  },
});

// WebSocket config
require('./sockets/order.socket')(io);

const PORT = process.env.PORT || 8080;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => console.error('❌ MongoDB connection failed:', err));
