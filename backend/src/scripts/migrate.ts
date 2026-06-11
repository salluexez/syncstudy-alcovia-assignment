import { closeDatabase } from '../database/db.js';
import { runMigrations } from '../database/migrations.js';

try {
  const appliedMigrations = await runMigrations();

  if (appliedMigrations.length === 0) {
    console.log('Database schema is already up to date.');
  } else {
    console.log(`Applied migrations: ${appliedMigrations.join(', ')}`);
  }
} finally {
  await closeDatabase();
}
