import type { SQLiteDatabase } from 'expo-sqlite';
import { LOCAL_SCHEMA_VERSION, localSchemaSql } from './schema';

type UserVersionRow = {
  readonly user_version: number;
};

export const runLocalMigrations = async (database: SQLiteDatabase): Promise<void> => {
  await database.execAsync('pragma foreign_keys = on;');

  const versionRow = await database.getFirstAsync<UserVersionRow>('pragma user_version;');
  const currentVersion = versionRow?.user_version ?? 0;

  if (currentVersion > LOCAL_SCHEMA_VERSION) {
    throw new Error(
      `Local database version ${currentVersion} is newer than supported version ${LOCAL_SCHEMA_VERSION}.`
    );
  }

  if (currentVersion === LOCAL_SCHEMA_VERSION) {
    return;
  }

  await database.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.execAsync(localSchemaSql);
    await transaction.execAsync(`pragma user_version = ${LOCAL_SCHEMA_VERSION};`);
  });
};
