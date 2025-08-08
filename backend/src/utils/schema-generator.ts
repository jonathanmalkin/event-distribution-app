/**
 * Automated TypeScript Interface Generation from PostgreSQL Schema
 * Solves schema-code synchronization issues by auto-generating interfaces
 */

import pool from '../config/database';
import fs from 'fs-extra';
import path from 'path';

interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  character_maximum_length: number | null;
  numeric_precision: number | null;
  numeric_scale: number | null;
}

interface TableInfo {
  table_name: string;
  table_comment: string | null;
}

interface ForeignKeyInfo {
  table_name: string;
  column_name: string;
  foreign_table_name: string;
  foreign_column_name: string;
  constraint_name: string;
}

interface GeneratedInterface {
  name: string;
  content: string;
  exports: string[];
}

/**
 * Maps PostgreSQL data types to TypeScript types
 */
function mapPostgresToTypeScript(
  dataType: string,
  isNullable: boolean = false,
  maxLength?: number | null
): string {
  let tsType: string;

  switch (dataType.toLowerCase()) {
    case 'integer':
    case 'bigint':
    case 'smallint':
    case 'decimal':
    case 'numeric':
    case 'real':
    case 'double precision':
    case 'serial':
    case 'bigserial':
      tsType = 'number';
      break;
    
    case 'boolean':
      tsType = 'boolean';
      break;
    
    case 'timestamp':
    case 'timestamp with time zone':
    case 'timestamp without time zone':
    case 'date':
    case 'time':
      tsType = 'Date';
      break;
    
    case 'json':
    case 'jsonb':
      tsType = 'any'; // Could be made more specific based on usage
      break;
    
    case 'uuid':
      tsType = 'string';
      break;
    
    case 'varchar':
    case 'character varying':
    case 'char':
    case 'character':
    case 'text':
    default:
      tsType = 'string';
      break;
  }

  return isNullable ? `${tsType} | null` : tsType;
}

/**
 * Fetches all tables from the database
 */
async function getTables(): Promise<TableInfo[]> {
  const query = `
    SELECT 
      t.table_name,
      obj_description(c.oid) as table_comment
    FROM information_schema.tables t
    LEFT JOIN pg_class c ON c.relname = t.table_name
    WHERE t.table_schema = 'public' 
    AND t.table_type = 'BASE TABLE'
    ORDER BY t.table_name;
  `;
  
  const result = await pool.query(query);
  return result.rows;
}

/**
 * Fetches column information for a specific table
 */
async function getTableColumns(tableName: string): Promise<ColumnInfo[]> {
  const query = `
    SELECT 
      column_name,
      data_type,
      is_nullable,
      column_default,
      character_maximum_length,
      numeric_precision,
      numeric_scale
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = $1
    ORDER BY ordinal_position;
  `;
  
  const result = await pool.query(query, [tableName]);
  return result.rows;
}

/**
 * Fetches foreign key relationships
 */
async function getForeignKeys(): Promise<ForeignKeyInfo[]> {
  const query = `
    SELECT 
      tc.table_name, 
      kcu.column_name, 
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      tc.constraint_name
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public';
  `;
  
  const result = await pool.query(query);
  return result.rows;
}

/**
 * Gets primary key columns for a table
 */
async function getPrimaryKeys(tableName: string): Promise<string[]> {
  const query = `
    SELECT kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'PRIMARY KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name = $1;
  `;
  
  const result = await pool.query(query, [tableName]);
  return result.rows.map(row => row.column_name);
}

/**
 * Converts snake_case to PascalCase
 */
function toPascalCase(str: string): string {
  return str
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

/**
 * Converts snake_case to camelCase
 */
function toCamelCase(str: string): string {
  const pascalCase = toPascalCase(str);
  return pascalCase.charAt(0).toLowerCase() + pascalCase.slice(1);
}

/**
 * Generates TypeScript interface for a single table
 */
async function generateTableInterface(table: TableInfo): Promise<GeneratedInterface> {
  const columns = await getTableColumns(table.table_name);
  const primaryKeys = await getPrimaryKeys(table.table_name);
  
  const interfaceName = toPascalCase(table.table_name);
  const lines: string[] = [];
  
  // Add table comment if available
  if (table.table_comment) {
    lines.push(`/**`);
    lines.push(` * ${table.table_comment}`);
    lines.push(` */`);
  }
  
  lines.push(`export interface ${interfaceName} {`);
  
  // Generate properties for each column
  columns.forEach(column => {
    const propertyName = toCamelCase(column.column_name);
    const isNullable = column.is_nullable === 'YES';
    const tsType = mapPostgresToTypeScript(column.data_type, isNullable);
    const isPrimaryKey = primaryKeys.includes(column.column_name);
    const isOptional = isNullable || column.column_default !== null;
    
    // Add property comment
    const comments: string[] = [];
    if (isPrimaryKey) comments.push('Primary key');
    if (column.column_default) comments.push(`Default: ${column.column_default}`);
    if (column.character_maximum_length) comments.push(`Max length: ${column.character_maximum_length}`);
    
    if (comments.length > 0) {
      lines.push(`  /** ${comments.join(', ')} */`);
    }
    
    const optional = isOptional ? '?' : '';
    lines.push(`  ${propertyName}${optional}: ${tsType};`);
  });
  
  lines.push(`}`);
  lines.push('');
  
  // Generate create/update interfaces
  const createInterfaceName = `Create${interfaceName}`;
  const updateInterfaceName = `Update${interfaceName}`;
  
  // Create interface (omit auto-generated fields)
  lines.push(`export interface ${createInterfaceName} extends Omit<${interfaceName}, 'id' | 'createdAt' | 'updatedAt'> {}`);
  lines.push('');
  
  // Update interface (all fields optional except id)
  lines.push(`export interface ${updateInterfaceName} extends Partial<${interfaceName}> {`);
  lines.push(`  id: number;`);
  lines.push(`}`);
  lines.push('');
  
  return {
    name: interfaceName,
    content: lines.join('\n'),
    exports: [interfaceName, createInterfaceName, updateInterfaceName]
  };
}

/**
 * Generates relationship types based on foreign keys
 */
async function generateRelationshipTypes(foreignKeys: ForeignKeyInfo[]): Promise<string> {
  const lines: string[] = [];
  
  lines.push('/**');
  lines.push(' * Database relationship types');
  lines.push(' */');
  lines.push('');
  
  // Group foreign keys by table
  const tableRelationships = new Map<string, ForeignKeyInfo[]>();
  foreignKeys.forEach(fk => {
    if (!tableRelationships.has(fk.table_name)) {
      tableRelationships.set(fk.table_name, []);
    }
    tableRelationships.get(fk.table_name)!.push(fk);
  });
  
  // Generate relationship interfaces
  tableRelationships.forEach((relationships, tableName) => {
    const interfaceName = `${toPascalCase(tableName)}WithRelations`;
    const baseInterface = toPascalCase(tableName);
    
    lines.push(`export interface ${interfaceName} extends ${baseInterface} {`);
    
    relationships.forEach(rel => {
      const propertyName = toCamelCase(rel.foreign_table_name);
      const relatedType = toPascalCase(rel.foreign_table_name);
      lines.push(`  ${propertyName}?: ${relatedType};`);
    });
    
    lines.push(`}`);
    lines.push('');
  });
  
  return lines.join('\n');
}

/**
 * Main function to generate all interfaces
 */
export async function generateInterfaces(outputDir: string = 'src/generated'): Promise<void> {
  console.log('🔄 Starting database schema introspection...');
  
  try {
    // Ensure output directory exists
    const fullOutputDir = path.join(process.cwd(), outputDir);
    await fs.ensureDir(fullOutputDir);
    
    // Fetch schema information
    const tables = await getTables();
    const foreignKeys = await getForeignKeys();
    
    console.log(`📊 Found ${tables.length} tables to process`);
    
    // Generate interfaces for each table
    const generatedInterfaces: GeneratedInterface[] = [];
    for (const table of tables) {
      console.log(`  ➜ Processing table: ${table.table_name}`);
      const interfaceCode = await generateTableInterface(table);
      generatedInterfaces.push(interfaceCode);
    }
    
    // Generate relationship types
    const relationshipTypes = await generateRelationshipTypes(foreignKeys);
    
    // Create main interfaces file
    const mainFileLines: string[] = [];
    mainFileLines.push('/**');
    mainFileLines.push(' * Auto-generated TypeScript interfaces from database schema');
    mainFileLines.push(' * Generated on: ' + new Date().toISOString());
    mainFileLines.push(' * DO NOT EDIT MANUALLY - This file is auto-generated');
    mainFileLines.push(' */');
    mainFileLines.push('');
    
    // Add all interface content
    generatedInterfaces.forEach(iface => {
      mainFileLines.push(iface.content);
    });
    
    // Add relationship types
    mainFileLines.push(relationshipTypes);
    
    // Write the main file
    const mainFilePath = path.join(fullOutputDir, 'database-types.ts');
    await fs.writeFile(mainFilePath, mainFileLines.join('\n'));
    
    // Create index file for easy imports
    const indexLines: string[] = [];
    indexLines.push('/**');
    indexLines.push(' * Database types index - Re-export all generated types');
    indexLines.push(' */');
    indexLines.push('');
    indexLines.push('export * from "./database-types";');
    
    const indexPath = path.join(fullOutputDir, 'index.ts');
    await fs.writeFile(indexPath, indexLines.join('\n'));
    
    // Update existing model imports (optional compatibility layer)
    await createCompatibilityLayer(fullOutputDir, generatedInterfaces);
    
    console.log('✅ Schema generation completed successfully!');
    console.log(`📁 Generated files:`);
    console.log(`   - ${mainFilePath}`);
    console.log(`   - ${indexPath}`);
    console.log(`📦 Generated ${generatedInterfaces.length} interfaces with relationships`);
    
    return;
    
  } catch (error) {
    console.error('❌ Schema generation failed:', error);
    throw error;
  }
}

/**
 * Creates compatibility layer for existing imports
 */
async function createCompatibilityLayer(outputDir: string, interfaces: GeneratedInterface[]): Promise<void> {
  const compatLines: string[] = [];
  
  compatLines.push('/**');
  compatLines.push(' * Compatibility layer for existing imports');
  compatLines.push(' * Maintains backward compatibility with existing Event.ts imports');
  compatLines.push(' */');
  compatLines.push('');
  
  // Re-export common types with original names
  const exportMappings = [
    { generated: 'Events', original: 'Event' },
    { generated: 'Venues', original: 'Venue' },
    { generated: 'Organizers', original: 'Organizer' }
  ];
  
  exportMappings.forEach(mapping => {
    const generatedInterface = interfaces.find(i => i.name === mapping.generated);
    if (generatedInterface) {
      compatLines.push(`export type ${mapping.original} = ${mapping.generated};`);
      compatLines.push(`export type Create${mapping.original} = Create${mapping.generated};`);
      compatLines.push(`export type Update${mapping.original} = Update${mapping.generated};`);
      compatLines.push('');
    }
  });
  
  compatLines.push('// Re-export all generated types');
  compatLines.push('export * from "./database-types";');
  
  const compatPath = path.join(outputDir, 'compat.ts');
  await fs.writeFile(compatPath, compatLines.join('\n'));
}

/**
 * CLI command to regenerate interfaces
 */
export async function regenerateCommand(): Promise<void> {
  try {
    console.log('🔄 Regenerating TypeScript interfaces from database schema...');
    await generateInterfaces();
    console.log('✅ Regeneration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Regeneration failed:', error);
    process.exit(1);
  }
}

// Allow running as standalone script
if (require.main === module) {
  regenerateCommand();
}