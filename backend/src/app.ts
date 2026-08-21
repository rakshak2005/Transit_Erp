import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import apiRoutes from './routes/api.routes';
import swaggerUi from 'swagger-ui-express';
import * as swaggerDocument from '../swagger.json';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// API Swagger Docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// API base routing
app.use('/api', authRoutes);
app.use('/api', apiRoutes);

// General health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

export default app;
