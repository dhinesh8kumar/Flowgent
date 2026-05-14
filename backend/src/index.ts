import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import healthRouter from './routes/health';
import authRouter from './routes/auth';
import tenantsRouter from './routes/tenants';
import webhookRouter from './routes/webhook';
import bookingsRouter from './routes/bookings';
import customersRouter from './routes/customers';
import servicesRouter from './routes/services';
import { logger } from './utils/logger';

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://dashboard-zevio.co.in'
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true
}));

app.use('/webhook', express.raw({ type: 'application/json' }), (req, _res, next) => {
  if (Buffer.isBuffer(req.body)) req.body = JSON.parse(req.body.toString());
  next();
});

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health',
}));

app.use('/health', healthRouter);
app.use('/auth', authRouter);
app.use('/tenants', tenantsRouter);
app.use('/webhook', webhookRouter);
app.use('/bookings', bookingsRouter);
app.use('/customers', customersRouter);
app.use('/services', servicesRouter);

app.use((_req, res) => res.status(404).json({ success: false, error: 'Route not found' }));

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

app.listen(PORT, () => {
  logger.info(`Water Tanker SaaS running on port ${PORT}`);
  logger.info(`Health: http://localhost:${PORT}/health`);
});

export default app;
