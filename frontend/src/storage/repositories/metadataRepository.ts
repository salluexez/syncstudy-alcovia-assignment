import type { SQLiteDatabase } from 'expo-sqlite';
import type { NetworkMode } from '../../types/domain';

export const METADATA_KEYS = {
  deviceId: 'deviceId',
  deviceLabel: 'deviceLabel',
  lamportCounter: 'lamportCounter',
  lastServerSequence: 'lastServerSequence',
  networkMode: 'networkMode',
  studentId: 'studentId'
} as const;

type MetadataRow = {
  readonly value: string;
};

export class MetadataRepository {
  public constructor(private readonly database: SQLiteDatabase) {}

  public async get(key: string): Promise<string | null> {
    const row = await this.database.getFirstAsync<MetadataRow>(
      'select value from local_metadata where key = ?',
      key
    );

    return row?.value ?? null;
  }

  public async set(key: string, value: string): Promise<void> {
    await this.database.runAsync(
      `
        insert into local_metadata (key, value)
        values (?, ?)
        on conflict (key) do update set value = excluded.value
      `,
      key,
      value
    );
  }

  public async getNumber(key: string, fallback: number): Promise<number> {
    const value = await this.get(key);
    return value === null ? fallback : Number(value);
  }

  public async setNumber(key: string, value: number): Promise<void> {
    await this.set(key, String(value));
  }

  public async getNetworkMode(): Promise<NetworkMode> {
    const value = await this.get(METADATA_KEYS.networkMode);
    return value === 'offline' ? 'offline' : 'online';
  }

  public async setNetworkMode(mode: NetworkMode): Promise<void> {
    await this.set(METADATA_KEYS.networkMode, mode);
  }

  public async incrementLamport(): Promise<number> {
    const nextLamport = (await this.getNumber(METADATA_KEYS.lamportCounter, 0)) + 1;
    await this.setNumber(METADATA_KEYS.lamportCounter, nextLamport);
    return nextLamport;
  }
}
