require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const { Server } = require('socket.io');
const routes = require('./routes');
const { setIO } = require('./config/socket');
const { startMqtt } = require('./services/mqttService');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_ORIGIN || '*', methods: ['GET', 'POST'] }
});
setIO(io);

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || '*' }));
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true, service: 'LabFlow-CT API' }));
app.use('/api', routes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Erro interno do servidor.' });
});

io.on('connection', socket => {
  console.log('[WS] cliente conectado:', socket.id);
});

const port = Number(process.env.PORT || 3001);
server.listen(port, () => {
  console.log(`API rodando na porta ${port}`);
  startMqtt();
});
