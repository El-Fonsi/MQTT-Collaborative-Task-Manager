import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config';
import { connectBroker } from './mqtt/broker';
import authRoutes from './routes/auth';
import roomRoutes from './routes/rooms';

const app = express();

app.use(cors({ origin: config.frontendUrl, credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function main() {
  try {
    connectBroker();
    console.log('[MQTT] Broker connection initiated');

    app.listen(config.port, () => {
      console.log(`[Server] Running on http://localhost:${config.port}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

main();
