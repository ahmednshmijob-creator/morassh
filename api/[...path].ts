import express from 'express';
import cors from 'cors';
import paymentRouter from '../artifacts/api-server/src/routes/payment';
import aiRouter from '../artifacts/api-server/src/routes/ai';

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/healthz', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/ai', aiRouter);
app.use('/api/payment', paymentRouter);

export default app;
