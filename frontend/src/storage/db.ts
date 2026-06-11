import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { LOCAL_DATABASE_NAME } from './schema';

let databasePromise: Promise<SQLiteDatabase> | null = null;

export const getDatabase = async (): Promise<SQLiteDatabase> => {
  databasePromise ??= openDatabaseAsync(LOCAL_DATABASE_NAME);
  return databasePromise;
};

export const closeDatabase = async (): Promise<void> => {
  const database = await databasePromise;

  if (database) {
    await database.closeAsync();
  }

  databasePromise = null;
};

export type LocalDatabase = SQLiteDatabase;
