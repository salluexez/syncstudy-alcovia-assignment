import type { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase } from '../storage/db';
import { runLocalMigrations } from '../storage/migrations';
import {
  METADATA_KEYS,
  MetadataRepository
} from '../storage/repositories/metadataRepository';
import { createUuid } from '../sync/uuid';
import type { NetworkMode } from '../types/domain';

export const DEFAULT_STUDENT_ID = '11111111-1111-4111-8111-111111111111';
export const DEFAULT_STUDENT_NAME = 'SyncStudy Student';

export type LocalStorageContext = {
  readonly database: SQLiteDatabase;
  readonly deviceId: string;
  readonly deviceLabel: string;
  readonly lamportCounter: number;
  readonly lastServerSequence: number;
  readonly networkMode: NetworkMode;
  readonly studentId: string;
};

const createDeviceLabel = (deviceId: string): string => `Device ${deviceId.slice(0, 8)}`;

export class LocalStorageService {
  public async initialize(): Promise<LocalStorageContext> {
    const database = await getDatabase();
    await runLocalMigrations(database);

    const metadata = new MetadataRepository(database);

    const studentId = await this.ensureValue(metadata, METADATA_KEYS.studentId, DEFAULT_STUDENT_ID);
    const deviceId = await this.ensureValue(metadata, METADATA_KEYS.deviceId, createUuid());
    const deviceLabel = await this.ensureValue(
      metadata,
      METADATA_KEYS.deviceLabel,
      createDeviceLabel(deviceId)
    );

    const lamportCounter = await this.ensureNumber(metadata, METADATA_KEYS.lamportCounter, 0);
    const lastServerSequence = await this.ensureNumber(
      metadata,
      METADATA_KEYS.lastServerSequence,
      0
    );
    const networkMode = await this.ensureNetworkMode(metadata);

    return {
      database,
      deviceId,
      deviceLabel,
      lamportCounter,
      lastServerSequence,
      networkMode,
      studentId
    };
  }

  private async ensureValue(
    metadata: MetadataRepository,
    key: string,
    fallback: string
  ): Promise<string> {
    const existingValue = await metadata.get(key);

    if (existingValue) {
      return existingValue;
    }

    await metadata.set(key, fallback);
    return fallback;
  }

  private async ensureNumber(
    metadata: MetadataRepository,
    key: string,
    fallback: number
  ): Promise<number> {
    const existingValue = await metadata.get(key);

    if (existingValue !== null) {
      return Number(existingValue);
    }

    await metadata.setNumber(key, fallback);
    return fallback;
  }

  private async ensureNetworkMode(metadata: MetadataRepository): Promise<NetworkMode> {
    const existingValue = await metadata.get(METADATA_KEYS.networkMode);

    if (existingValue === 'offline' || existingValue === 'online') {
      return existingValue;
    }

    await metadata.setNetworkMode('online');
    return 'online';
  }
}
