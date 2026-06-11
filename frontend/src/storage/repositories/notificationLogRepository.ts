import type { SQLiteDatabase } from 'expo-sqlite';
import type { LocalNotificationLog } from '../../types/domain';
import { mapNotificationLog, type NotificationLogRow } from './rowMappers';

export class LocalNotificationLogRepository {
  public constructor(private readonly database: SQLiteDatabase) {}

  public async add(log: LocalNotificationLog): Promise<void> {
    await this.database.runAsync(
      `
        insert into local_notification_logs (
          id,
          session_id,
          event_id,
          status,
          message,
          created_at
        )
        values (?, ?, ?, ?, ?, ?)
      `,
      log.id,
      log.sessionId,
      log.eventId,
      log.status,
      log.message,
      log.createdAt
    );
  }

  public async listAll(): Promise<LocalNotificationLog[]> {
    const rows = await this.database.getAllAsync<NotificationLogRow>(
      'select * from local_notification_logs order by created_at desc, id'
    );

    return rows.map(mapNotificationLog);
  }
}
