import { checkDatabaseConnection } from '../database/db.js';

export type ReadinessStatus = {
  readonly ok: boolean;
  readonly database: 'ok' | 'error';
};

export class ReadinessService {
  public async check(): Promise<ReadinessStatus> {
    try {
      await checkDatabaseConnection();
      return {
        database: 'ok',
        ok: true
      };
    } catch {
      return {
        database: 'error',
        ok: false
      };
    }
  }
}
