/**
 * Database Migration Management System
 * Handles migration creation, execution, and rollback with proper versioning
 */

import fs from 'fs-extra';
import path from 'path';
import pool from '../config/database';
import { appLogger } from './logger';

export interface Migration {
  version: string;
  name: string;
  description: string;
  up: string;
  down: string;
  timestamp: Date;
  checksum?: string;
}

export interface MigrationStatus {
  version: string;
  name: string;
  appliedAt: Date;
  checksum: string;
}

export interface MigrationResult {
  success: boolean;
  migrations: string[];
  errors: { version: string; error: string }[];
  skipped: string[];
}

/**
 * Migration Manager class
 */
export class MigrationManager {
  private migrationsDir: string;
  private logger = appLogger.child({ component: 'MigrationManager' });

  constructor(migrationsDir: string = 'src/database/migrations') {
    this.migrationsDir = path.resolve(migrationsDir);
  }

  /**
   * Initialize migration system - create migrations table if it doesn't exist
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing migration system');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        checksum VARCHAR(64) NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        execution_time_ms INTEGER,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    // Ensure migrations directory exists
    await fs.ensureDir(this.migrationsDir);
    
    this.logger.info('Migration system initialized');
  }

  /**
   * Create a new migration file
   */
  async createMigration(name: string, description?: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[-:\.]/g, '').slice(0, 14);
    const version = `${timestamp}_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    const filename = `${version}.sql`;
    const filepath = path.join(this.migrationsDir, filename);

    const template = `-- Migration: ${name}
-- Version: ${version}
-- Description: ${description || ''}
-- Created: ${new Date().toISOString()}

-- ================================
-- UP MIGRATION
-- ================================

-- Add your forward migration SQL here
-- Example:
-- CREATE TABLE example (
--   id SERIAL PRIMARY KEY,
--   name VARCHAR(255) NOT NULL,
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- ================================
-- DOWN MIGRATION  
-- ================================

-- Add your rollback migration SQL here
-- Example:
-- DROP TABLE IF EXISTS example;
`;

    await fs.writeFile(filepath, template);
    
    this.logger.info(`Created migration: ${filename}`, { version, name });
    return filepath;
  }

  /**
   * Parse migration file to extract up/down SQL
   */
  private async parseMigrationFile(filepath: string): Promise<Migration> {
    const content = await fs.readFile(filepath, 'utf-8');
    const filename = path.basename(filepath);
    
    // Extract version from filename
    const versionMatch = filename.match(/^(\d{14}_[^.]+)/);
    if (!versionMatch) {
      throw new Error(`Invalid migration filename format: ${filename}`);
    }
    const version = versionMatch[1];
    
    // Extract metadata from comments
    const nameMatch = content.match(/-- Migration: (.+)/);
    const descMatch = content.match(/-- Description: (.+)/);
    const timestampMatch = content.match(/-- Created: (.+)/);
    
    const name = nameMatch?.[1]?.trim() || 'Unknown';
    const description = descMatch?.[1]?.trim() || '';
    const timestamp = timestampMatch?.[1] ? new Date(timestampMatch[1]) : new Date();

    // Split content by UP/DOWN sections
    const upSection = content.match(/-- UP MIGRATION\s*--.*?\n(.*?)-- DOWN MIGRATION/s);
    const downSection = content.match(/-- DOWN MIGRATION\s*--.*?\n(.*?)$/s);

    if (!upSection || !downSection) {
      throw new Error(`Migration ${filename} must contain both UP and DOWN sections`);
    }

    const up = upSection[1].trim();
    const down = downSection[1].trim();

    // Generate checksum
    const checksum = this.generateChecksum(up + down);

    return {
      version,
      name,
      description,
      up,
      down,
      timestamp,
      checksum
    };
  }

  /**
   * Get all migration files
   */
  async getAllMigrations(): Promise<Migration[]> {
    const files = await fs.readdir(this.migrationsDir);
    const migrationFiles = files
      .filter(file => file.endsWith('.sql'))
      .sort(); // Chronological order by filename

    const migrations: Migration[] = [];
    for (const file of migrationFiles) {
      try {
        const filepath = path.join(this.migrationsDir, file);
        const migration = await this.parseMigrationFile(filepath);
        migrations.push(migration);
      } catch (error) {
        this.logger.error(`Failed to parse migration ${file}`, error as Error);
        throw error;
      }
    }

    return migrations;
  }

  /**
   * Get applied migrations from database
   */
  async getAppliedMigrations(): Promise<MigrationStatus[]> {
    const result = await pool.query(`
      SELECT version, name, applied_at, checksum
      FROM schema_migrations
      ORDER BY version
    `);

    return result.rows.map(row => ({
      version: row.version,
      name: row.name,
      appliedAt: row.applied_at,
      checksum: row.checksum
    }));
  }

  /**
   * Get pending migrations
   */
  async getPendingMigrations(): Promise<Migration[]> {
    const allMigrations = await this.getAllMigrations();
    const appliedMigrations = await this.getAppliedMigrations();
    const appliedVersions = new Set(appliedMigrations.map(m => m.version));

    return allMigrations.filter(m => !appliedVersions.has(m.version));
  }

  /**
   * Run migrations up (apply pending migrations)
   */
  async up(targetVersion?: string): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      migrations: [],
      errors: [],
      skipped: []
    };

    let pendingMigrations = await this.getPendingMigrations();

    // Filter to target version if specified
    if (targetVersion) {
      pendingMigrations = pendingMigrations.filter(m => m.version <= targetVersion);
    }

    if (pendingMigrations.length === 0) {
      this.logger.info('No pending migrations to apply');
      return result;
    }

    this.logger.info(`Applying ${pendingMigrations.length} migration(s)`);

    for (const migration of pendingMigrations) {
      const startTime = Date.now();
      
      try {
        // Begin transaction
        await pool.query('BEGIN');

        this.logger.info(`Applying migration: ${migration.version} - ${migration.name}`);

        // Execute UP migration
        if (migration.up.trim()) {
          await pool.query(migration.up);
        }

        // Record migration as applied
        const executionTime = Date.now() - startTime;
        await pool.query(`
          INSERT INTO schema_migrations (version, name, description, checksum, execution_time_ms)
          VALUES ($1, $2, $3, $4, $5)
        `, [migration.version, migration.name, migration.description, migration.checksum, executionTime]);

        // Commit transaction
        await pool.query('COMMIT');

        result.migrations.push(migration.version);
        this.logger.info(`Migration applied successfully: ${migration.version} (${executionTime}ms)`);

      } catch (error) {
        // Rollback transaction
        await pool.query('ROLLBACK');
        
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.error(`Migration failed: ${migration.version}`, error as Error);
        
        result.success = false;
        result.errors.push({
          version: migration.version,
          error: errorMsg
        });

        // Stop on first error
        break;
      }
    }

    return result;
  }

  /**
   * Run migrations down (rollback migrations)
   */
  async down(steps: number = 1): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      migrations: [],
      errors: [],
      skipped: []
    };

    const appliedMigrations = await this.getAppliedMigrations();
    const allMigrations = await this.getAllMigrations();

    // Get migrations to rollback (most recent first)
    const migrationsToRollback = appliedMigrations
      .reverse()
      .slice(0, steps);

    if (migrationsToRollback.length === 0) {
      this.logger.info('No migrations to rollback');
      return result;
    }

    this.logger.info(`Rolling back ${migrationsToRollback.length} migration(s)`);

    for (const appliedMigration of migrationsToRollback) {
      const migration = allMigrations.find(m => m.version === appliedMigration.version);
      
      if (!migration) {
        const errorMsg = `Migration file not found: ${appliedMigration.version}`;
        this.logger.error(errorMsg);
        result.errors.push({
          version: appliedMigration.version,
          error: errorMsg
        });
        result.success = false;
        continue;
      }

      const startTime = Date.now();

      try {
        // Begin transaction
        await pool.query('BEGIN');

        this.logger.info(`Rolling back migration: ${migration.version} - ${migration.name}`);

        // Execute DOWN migration
        if (migration.down.trim()) {
          await pool.query(migration.down);
        }

        // Remove from migrations table
        await pool.query('DELETE FROM schema_migrations WHERE version = $1', [migration.version]);

        // Commit transaction
        await pool.query('COMMIT');

        result.migrations.push(migration.version);
        const executionTime = Date.now() - startTime;
        this.logger.info(`Migration rolled back successfully: ${migration.version} (${executionTime}ms)`);

      } catch (error) {
        // Rollback transaction
        await pool.query('ROLLBACK');
        
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.error(`Migration rollback failed: ${migration.version}`, error as Error);
        
        result.success = false;
        result.errors.push({
          version: migration.version,
          error: errorMsg
        });

        // Stop on first error
        break;
      }
    }

    return result;
  }

  /**
   * Get migration status
   */
  async getStatus(): Promise<{
    applied: MigrationStatus[];
    pending: Migration[];
    total: number;
  }> {
    const applied = await this.getAppliedMigrations();
    const pending = await this.getPendingMigrations();
    const total = applied.length + pending.length;

    return { applied, pending, total };
  }

  /**
   * Reset all migrations (dangerous - use with caution)
   */
  async reset(): Promise<MigrationResult> {
    this.logger.warn('Resetting all migrations - this will rollback ALL applied migrations');
    
    const appliedMigrations = await this.getAppliedMigrations();
    return this.down(appliedMigrations.length);
  }

  /**
   * Generate checksum for migration content
   */
  private generateChecksum(content: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }
}

/**
 * CLI commands for migration management
 */
export class MigrationCLI {
  private manager: MigrationManager;

  constructor(migrationsDir?: string) {
    this.manager = new MigrationManager(migrationsDir);
  }

  async create(name: string, description?: string): Promise<void> {
    try {
      await this.manager.initialize();
      const filepath = await this.manager.createMigration(name, description);
      console.log(`✅ Created migration: ${filepath}`);
    } catch (error) {
      console.error('❌ Failed to create migration:', error);
      process.exit(1);
    }
  }

  async up(targetVersion?: string): Promise<void> {
    try {
      await this.manager.initialize();
      const result = await this.manager.up(targetVersion);
      
      if (result.success) {
        console.log(`✅ Applied ${result.migrations.length} migration(s)`);
        result.migrations.forEach(version => console.log(`  - ${version}`));
      } else {
        console.log(`❌ Migration failed`);
        result.errors.forEach(({ version, error }) => {
          console.error(`  - ${version}: ${error}`);
        });
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Migration up failed:', error);
      process.exit(1);
    }
  }

  async down(steps: number = 1): Promise<void> {
    try {
      await this.manager.initialize();
      const result = await this.manager.down(steps);
      
      if (result.success) {
        console.log(`✅ Rolled back ${result.migrations.length} migration(s)`);
        result.migrations.forEach(version => console.log(`  - ${version}`));
      } else {
        console.log(`❌ Migration rollback failed`);
        result.errors.forEach(({ version, error }) => {
          console.error(`  - ${version}: ${error}`);
        });
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Migration down failed:', error);
      process.exit(1);
    }
  }

  async status(): Promise<void> {
    try {
      await this.manager.initialize();
      const status = await this.manager.getStatus();
      
      console.log('📊 Migration Status');
      console.log('==================');
      console.log(`Total migrations: ${status.total}`);
      console.log(`Applied: ${status.applied.length}`);
      console.log(`Pending: ${status.pending.length}`);
      console.log('');
      
      if (status.applied.length > 0) {
        console.log('Applied Migrations:');
        status.applied.forEach(m => {
          console.log(`  ✅ ${m.version} - ${m.name} (${m.appliedAt.toISOString()})`);
        });
        console.log('');
      }
      
      if (status.pending.length > 0) {
        console.log('Pending Migrations:');
        status.pending.forEach(m => {
          console.log(`  ⏳ ${m.version} - ${m.name}`);
        });
      }
    } catch (error) {
      console.error('❌ Failed to get migration status:', error);
      process.exit(1);
    }
  }

  async reset(): Promise<void> {
    try {
      console.log('⚠️  WARNING: This will rollback ALL migrations!');
      console.log('This action cannot be undone.');
      
      // In a real CLI, you'd prompt for confirmation here
      await this.manager.initialize();
      const result = await this.manager.reset();
      
      if (result.success) {
        console.log(`✅ Reset complete - rolled back ${result.migrations.length} migration(s)`);
      } else {
        console.log(`❌ Reset failed`);
        result.errors.forEach(({ version, error }) => {
          console.error(`  - ${version}: ${error}`);
        });
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Migration reset failed:', error);
      process.exit(1);
    }
  }
}

// Export default manager instance
export const migrationManager = new MigrationManager();
export default migrationManager;