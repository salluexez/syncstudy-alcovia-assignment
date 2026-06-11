import cors from 'cors';
import express, { type Express, type Request, type Response } from 'express';

export const createApp = (): Express => {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_request: Request, response: Response) => {
    response.status(200).json({ ok: true });
  });

  return app;
};
