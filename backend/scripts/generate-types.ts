#!/usr/bin/env ts-node

/**
 * CLI Script for generating TypeScript interfaces from database schema
 * Usage: npm run generate-types
 */

import { generateInterfaces } from '../src/utils/schema-generator';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from multiple possible locations
dotenv.config({ path: '.env' });
dotenv.config({ path: '../.env' });

async function main() {
  const outputDir = process.argv[2] || 'src/generated';
  
  console.log('🚀 Database Type Generation');
  console.log('============================');
  console.log(`📂 Output directory: ${outputDir}`);
  
  // Check if we can connect to database (since server is running, DB should be available)
  const dbStatus = process.env.DATABASE_URL || 
                   process.env.POSTGRES_URL || 
                   process.env.DB_URL ||
                   'postgresql://localhost/event_distribution'; // Default fallback
  
  console.log(`🔗 Database: ${dbStatus ? 'Available' : 'Not configured'}`);
  console.log('');

  try {
    await generateInterfaces(outputDir);
    
    console.log('');
    console.log('🎉 Type generation completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Review generated types in src/generated/');
    console.log('2. Update imports to use new generated types');
    console.log('3. Run TypeScript compiler to verify compatibility');
    console.log('4. Consider adding this to your build process');
    
  } catch (error) {
    console.error('');
    console.error('❌ Type generation failed:');
    console.error(error);
    process.exit(1);
  }
}

// Handle CLI execution
if (require.main === module) {
  main().catch(console.error);
}