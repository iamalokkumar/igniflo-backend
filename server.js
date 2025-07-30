const http = require('http');
const app = require('./app');
const cors = require("cors");
const mongoose = require('mongoose');
const { Server } = require('socket.io');
require('dotenv').config();
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));
// ✅ Health Check Route
app.get('/healthz', (_, res) => res.send('OK'));

// Create HTTP Server
const server = http.createServer(app);

// Configure Socket.io
const io = new Server(server, {
  cors: {
    origin: [process.env.CLIENT_URL, 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT'],
    credentials: true,
  },
});

// WebSocket Setup
require('./sockets/order.socket')(io);

const PORT = process.env.PORT || 8080;

// Connect to MongoDB and start server
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    server.listen(PORT, () =>
      console.log(`🚀 Server running on port ${PORT}`)
    );
  })
  .catch((err) => console.error('❌ MongoDB connection failed:', err));
