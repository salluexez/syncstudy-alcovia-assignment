import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './db.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDirectory = path.join(dirname, 'migrations');

const ensureMigrationsTable = async (): Promise<void> => {
  await db.query(`
    create table if not exists schema_migrations (
      id text primary key,
      applied_at timestamptz not null default now()
    )
  `);
};

const getAppliedMigrationIds = async (): Promise<Set<string>> => {
  const result = await db.query<{ id: string }>('select id from schema_migrations');
  return new Set(result.rows.map((row) => row.id));
};

export const runMigrations = async (): Promise<string[]> => {
  await ensureMigrationsTable();

  const appliedMigrationIds = await getAppliedMigrationIds();
  const filenames = (await readdir(migrationsDirectory))
    .filter((filename) => filename.endsWith('.sql'))
    .sort();

  const appliedNow: string[] = [];

  for (const filename of filenames) {
    if (appliedMigrationIds.has(filename)) {
      continue;
    }

    const sql = await readFile(path.join(migrationsDirectory, filename), 'utf8');

    await db.query('begin');

    try {
      await db.query(sql);
      await db.query('insert into schema_migrations (id) values ($1)', [filename]);
      await db.query('commit');
      appliedNow.push(filename);
    } catch (error) {
      await db.query('rollback');
      throw error;
    }
  }

  return appliedNow;
};
