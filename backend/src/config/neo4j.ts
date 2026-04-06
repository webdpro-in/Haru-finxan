/**
 * Neo4j Driver Configuration
 * Handles knowledge graph database connection with connection pooling
 */

import neo4j, { Driver, Session } from 'neo4j-driver';

const neo4jUri = process.env.NEO4J_URI || 'neo4j://localhost:7687';
const neo4jUser = process.env.NEO4J_USER || 'neo4j';
const neo4jPassword = process.env.NEO4J_PASSWORD || 'password';

if (!process.env.NEO4J_URI || !process.env.NEO4J_PASSWORD) {
  console.warn('⚠️  Neo4j credentials not configured. Knowledge graph features will be unavailable.');
}

// Create Neo4j driver with connection pooling
export const driver: Driver = neo4j.driver(
  neo4jUri,
  neo4j.auth.basic(neo4jUser, neo4jPassword),
  {
    maxConnectionPoolSize: 10,
    connectionAcquisitionTimeout: 30000, // 30 seconds
    maxTransactionRetryTime: 30000,
    connectionTimeout: 30000,
    disableLosslessIntegers: true
  }
);

/**
 * Get a new session for executing queries
 */
export function getSession(): Session {
  return driver.session({
    database: 'neo4j',
    defaultAccessMode: neo4j.session.READ
  });
}

/**
 * Execute a Cypher query
 */
export async function executeQuery<T = any>(
  cypher: string,
  params: Record<string, any> = {}
): Promise<T[]> {
  const session = getSession();
  try {
    const result = await session.run(cypher, params);
    return result.records.map(record => record.toObject() as T);
  } finally {
    await session.close();
  }
}

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  const session = getSession();
  try {
    await session.run('RETURN 1');
    console.log('✅ Neo4j connection successful');
    return true;
  } catch (err) {
    console.error('❌ Neo4j connection error:', err);
    return false;
  } finally {
    await session.close();
  }
}

/**
 * Close driver connection (call on app shutdown)
 */
export async function closeDriver(): Promise<void> {
  await driver.close();
  console.log('Neo4j driver closed');
}

/**
 * Helper function to handle Neo4j errors
 */
export function handleNeo4jError(error: any): never {
  console.error('Neo4j error:', error);
  const message = error?.message || 'Unknown error';
  throw new Error(`Knowledge graph error: ${message}`);
}
