/**
 * Weaviate Client Configuration
 * Handles vector database connection for Learning DNA and semantic search
 */

import weaviate, { WeaviateClient } from 'weaviate-ts-client';

const weaviateUrl = process.env.WEAVIATE_URL || 'http://localhost:8080';
const weaviateApiKey = process.env.WEAVIATE_API_KEY || '';

if (!process.env.WEAVIATE_URL) {
  console.warn('⚠️  Weaviate credentials not configured. Vector search features will be unavailable.');
}

// Create Weaviate client
export const client: WeaviateClient = weaviate.client({
  scheme: weaviateUrl.startsWith('https') ? 'https' : 'http',
  host: weaviateUrl.replace(/^https?:\/\//, ''),
  apiKey: weaviateApiKey ? new weaviate.ApiKey(weaviateApiKey) : undefined,
  headers: {
    'X-Application-Name': 'finxan-ai'
  }
});

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const result = await client.misc.metaGetter().do();
    console.log('✅ Weaviate connection successful');
    console.log(`   Version: ${result.version}`);
    return true;
  } catch (err) {
    console.error('❌ Weaviate connection error:', err);
    return false;
  }
}

/**
 * Initialize schema for Learning DNA, Concepts, and QA Pairs
 */
export async function initializeSchema(): Promise<void> {
  try {
    // Check if classes already exist
    const schema = await client.schema.getter().do();
    const existingClasses = schema.classes?.map((c: any) => c.class) || [];
    
    // Learning DNA class
    if (!existingClasses.includes('LearningDNA')) {
      await client.schema.classCreator().withClass({
        class: 'LearningDNA',
        description: 'Student learning behavioral patterns and preferences',
        vectorizer: 'none', // We'll provide our own vectors
        properties: [
          { name: 'studentId', dataType: ['string'], description: 'Student identifier' },
          { name: 'sessionId', dataType: ['string'], description: 'Session identifier' },
          { name: 'timestamp', dataType: ['number'], description: 'Unix timestamp' },
          { name: 'preferredExplanationStyle', dataType: ['string'], description: 'Visual, Analytical, Story-based, or Analogy-driven' },
          { name: 'avgResponseTime', dataType: ['number'], description: 'Average response time in ms' },
          { name: 'confusionTriggers', dataType: ['string[]'], description: 'Topics that trigger confusion' }
        ]
      }).do();
      console.log('✅ Created LearningDNA class');
    }
    
    // Concept class
    if (!existingClasses.includes('Concept')) {
      await client.schema.classCreator().withClass({
        class: 'Concept',
        description: 'Educational concepts with semantic embeddings',
        vectorizer: 'none',
        properties: [
          { name: 'conceptId', dataType: ['string'], description: 'Concept identifier' },
          { name: 'conceptName', dataType: ['string'], description: 'Concept name' },
          { name: 'subject', dataType: ['string'], description: 'Subject area' },
          { name: 'description', dataType: ['text'], description: 'Concept description' },
          { name: 'keywords', dataType: ['string[]'], description: 'Related keywords' }
        ]
      }).do();
      console.log('✅ Created Concept class');
    }
    
    // QAPair class
    if (!existingClasses.includes('QAPair')) {
      await client.schema.classCreator().withClass({
        class: 'QAPair',
        description: 'Question-answer pairs for RAG',
        vectorizer: 'none',
        properties: [
          { name: 'question', dataType: ['text'], description: 'Question text' },
          { name: 'answer', dataType: ['text'], description: 'Answer text' },
          { name: 'subject', dataType: ['string'], description: 'Subject area' },
          { name: 'grade', dataType: ['int'], description: 'Grade level' },
          { name: 'source', dataType: ['string'], description: 'Source (ncert, teacher, verified)' },
          { name: 'upvotes', dataType: ['int'], description: 'Number of upvotes' }
        ]
      }).do();
      console.log('✅ Created QAPair class');
    }
    
    console.log('✅ Weaviate schema initialized');
  } catch (err) {
    console.error('❌ Error initializing Weaviate schema:', err);
    throw err;
  }
}

/**
 * Store Learning DNA vector
 */
export async function storeLearningDNA(
  studentId: string,
  sessionId: string,
  properties: Record<string, any>,
  vector: number[]
): Promise<string> {
  try {
    const result = await client.data.creator()
      .withClassName('LearningDNA')
      .withProperties({
        studentId,
        sessionId,
        timestamp: Date.now(),
        ...properties
      })
      .withVector(vector)
      .do();
    
    return result.id;
  } catch (err) {
    console.error('Error storing Learning DNA:', err);
    throw err;
  }
}

/**
 * Find similar learners using vector similarity
 */
export async function findSimilarLearners(
  vector: number[],
  limit: number = 10
): Promise<any[]> {
  try {
    const result = await client.graphql
      .get()
      .withClassName('LearningDNA')
      .withNearVector({ vector })
      .withLimit(limit)
      .withFields('studentId preferredExplanationStyle _additional { distance }')
      .do();
    
    return result.data.Get.LearningDNA || [];
  } catch (err) {
    console.error('Error finding similar learners:', err);
    throw err;
  }
}

/**
 * Helper function to handle Weaviate errors
 */
export function handleWeaviateError(error: any): never {
  console.error('Weaviate error:', error);
  const message = error?.message || 'Unknown error';
  throw new Error(`Vector database error: ${message}`);
}
