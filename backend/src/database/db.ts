import pg from 'pg';
import { config } from '../config.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 10
});

export type Database = {
  query<T extends pg.QueryResultRow = pg.QueryResultRow>(
    text: string,
    values?: readonly unknown[]
  ): Promise<pg.QueryResult<T>>;
};

export const db: Database = {
  query: <T extends pg.QueryResultRow = pg.QueryResultRow>(
    text: string,
    values?: readonly unknown[]
  ) => pool.query<T>(text, values ? [...values] : undefined)
};

export const checkDatabaseConnection = async (): Promise<void> => {
  await db.query('select 1');
};

export const closeDatabase = async (): Promise<void> => {
  await pool.end();
};
