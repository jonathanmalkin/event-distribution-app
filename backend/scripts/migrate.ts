#!/usr/bin/env ts-node

/**
 * CLI Script for database migration management
 * Usage: 
 *   npm run migrate create <name> [description]
 *   npm run migrate up [target-version]
 *   npm run migrate down [steps]
 *   npm run migrate status
 *   npm run migrate reset
 */

import { MigrationCLI } from '../src/utils/migration-manager';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const cli = new MigrationCLI();

  console.log('🔄 Database Migration Management');
  console.log('================================');

  if (!process.env.DB_HOST && !process.env.DATABASE_URL) {
    console.error('❌ Database configuration not found');
    console.error('Please ensure database environment variables are configured');
    process.exit(1);
  }

  try {
    switch (command) {
      case 'create':
        const name = args[1];
        const description = args[2];
        if (!name) {
          console.error('❌ Migration name is required');
          console.error('Usage: npm run migrate create <name> [description]');
          process.exit(1);
        }
        await cli.create(name, description);
        break;

      case 'up':
        const targetVersion = args[1];
        await cli.up(targetVersion);
        break;

      case 'down':
        const steps = parseInt(args[1]) || 1;
        await cli.down(steps);
        break;

      case 'status':
        await cli.status();
        break;

      case 'reset':
        console.log('⚠️  WARNING: This will rollback ALL migrations!');
        await cli.reset();
        break;

      default:
        console.log('Available commands:');
        console.log('  create <name> [description] - Create a new migration');
        console.log('  up [target-version]        - Apply pending migrations');
        console.log('  down [steps]               - Rollback migrations (default: 1)');
        console.log('  status                     - Show migration status');
        console.log('  reset                      - Rollback all migrations');
        console.log('');
        console.log('Examples:');
        console.log('  npm run migrate create add_user_table "Add users table with authentication"');
        console.log('  npm run migrate up');
        console.log('  npm run migrate down 2');
        console.log('  npm run migrate status');
        break;
    }
  } catch (error) {
    console.error('❌ Migration command failed:', error);
    process.exit(1);
  }
}

// Handle CLI execution
if (require.main === module) {
  main().catch(console.error);
}