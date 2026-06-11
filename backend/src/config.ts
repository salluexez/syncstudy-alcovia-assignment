import 'dotenv/config';

export type AppConfig = {
  readonly nodeEnv: string;
  readonly port: number;
  readonly databaseUrl: string;
  readonly n8nFocusSuccessWebhookUrl: string;
};

export const config: AppConfig = {
  databaseUrl:
    process.env.DATABASE_URL ??
    'postgres://postgres:postgres@localhost:5432/syncstudy',
  n8nFocusSuccessWebhookUrl:
    process.env.N8N_FOCUS_SUCCESS_WEBHOOK_URL ??
    'http://localhost:5678/webhook/focus-success',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000)
};
