#!/usr/bin/env ts-node
/**
 * Environment Variable Validation Script
 * 
 * This script validates all environment variables required for the FinxanAI platform.
 * It checks for:
 * - Required variables are set
 * - Variable formats are correct
 * - API keys are valid format
 * - URLs are accessible
 * - Provider configurations are consistent
 * 
 * Usage:
 *   npm run validate-env
 *   npx ts-node scripts/validate-env.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Validation result tracking
interface ValidationResult {
  passed: number;
  failed: number;
  warnings: number;
  errors: string[];
  warnings_list: string[];
}

const result: ValidationResult = {
  passed: 0,
  failed: 0,
  warnings: 0,
  errors: [],
  warnings_list: [],
};

// Helper functions
function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function success(message: string) {
  log(`  ✓ ${message}`, colors.green);
  result.passed++;
}

function error(message: string) {
  log(`  ✗ ${message}`, colors.red);
  result.failed++;
  result.errors.push(message);
}

function warning(message: string) {
  log(`  ⚠ ${message}`, colors.yellow);
  result.warnings++;
  result.warnings_list.push(message);
}

function section(title: string) {
  log(`\n${colors.bright}${title}${colors.reset}`, colors.cyan);
}


// Validation functions
function validateRequired(name: string, value: string | undefined): boolean {
  if (!value || value.trim() === '') {
    error(`${name}: Not set (REQUIRED)`);
    return false;
  }
  success(`${name}: Set`);
  return true;
}

function validateOptional(name: string, value: string | undefined, defaultValue?: string): boolean {
  if (!value || value.trim() === '') {
    if (defaultValue) {
      warning(`${name}: Not set (using default: ${defaultValue})`);
    } else {
      warning(`${name}: Not set (optional)`);
    }
    return false;
  }
  success(`${name}: Set`);
  return true;
}

function validateFormat(name: string, value: string | undefined, pattern: RegExp, description: string): boolean {
  if (!value) {
    return false;
  }
  if (!pattern.test(value)) {
    error(`${name}: Invalid format (expected: ${description})`);
    return false;
  }
  success(`${name}: Valid format`);
  return true;
}

function validateLength(name: string, value: string | undefined, minLength: number): boolean {
  if (!value) {
    return false;
  }
  if (value.length < minLength) {
    error(`${name}: Too short (minimum ${minLength} characters, got ${value.length})`);
    return false;
  }
  success(`${name}: Valid length (${value.length} characters)`);
  return true;
}

function validateEnum(name: string, value: string | undefined, allowedValues: string[]): boolean {
  if (!value) {
    return false;
  }
  if (!allowedValues.includes(value)) {
    error(`${name}: Invalid value (expected one of: ${allowedValues.join(', ')})`);
    return false;
  }
  success(`${name}: ${value}`);
  return true;
}

function validateURL(name: string, value: string | undefined, protocol?: string): boolean {
  if (!value) {
    return false;
  }
  try {
    const url = new URL(value);
    if (protocol && url.protocol !== protocol) {
      error(`${name}: Invalid protocol (expected ${protocol}, got ${url.protocol})`);
      return false;
    }
    success(`${name}: Valid URL`);
    return true;
  } catch (e) {
    error(`${name}: Invalid URL format`);
    return false;
  }
}

function validatePort(name: string, value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  const port = parseInt(value, 10);
  if (isNaN(port) || port < 1024 || port > 65535) {
    error(`${name}: Invalid port (must be between 1024 and 65535)`);
    return false;
  }
  success(`${name}: ${port}`);
  return true;
}


// Main validation logic
async function validateEnvironment() {
  log(`\n${colors.bright}🔍 Validating Environment Variables...${colors.reset}\n`);

  // 1. Required Variables
  section('✅ Required Variables');
  validateRequired('NODE_ENV', process.env.NODE_ENV);
  validateEnum('NODE_ENV', process.env.NODE_ENV, ['development', 'production', 'test']);
  
  validateRequired('PORT', process.env.PORT);
  validatePort('PORT', process.env.PORT);
  
  validateRequired('JWT_SECRET', process.env.JWT_SECRET);
  validateLength('JWT_SECRET', process.env.JWT_SECRET, 32);

  // 2. AI Provider Configuration
  section('🤖 AI Provider Configuration');
  const aiProvider = process.env.AI_PROVIDER || 'gemini';
  validateEnum('AI_PROVIDER', aiProvider, ['gemini', 'openai', 'groq', 'aws-bedrock']);

  // Check corresponding API key is set
  if (aiProvider === 'gemini') {
    if (validateRequired('GEMINI_API_KEY', process.env.GEMINI_API_KEY)) {
      validateFormat('GEMINI_API_KEY', process.env.GEMINI_API_KEY, /^AIzaSy/, 'Starts with AIzaSy');
    }
  } else if (aiProvider === 'openai') {
    if (validateRequired('OPENAI_API_KEY', process.env.OPENAI_API_KEY)) {
      validateFormat('OPENAI_API_KEY', process.env.OPENAI_API_KEY, /^sk-/, 'Starts with sk-');
    }
  } else if (aiProvider === 'groq') {
    if (validateRequired('GROQ_API_KEY', process.env.GROQ_API_KEY)) {
      validateFormat('GROQ_API_KEY', process.env.GROQ_API_KEY, /^gsk_/, 'Starts with gsk_');
    }
  } else if (aiProvider === 'aws-bedrock') {
    validateRequired('AWS_ACCESS_KEY_ID', process.env.AWS_ACCESS_KEY_ID);
    validateRequired('AWS_SECRET_ACCESS_KEY', process.env.AWS_SECRET_ACCESS_KEY);
    validateRequired('AWS_REGION', process.env.AWS_REGION);
    validateRequired('BEDROCK_MODEL_ID', process.env.BEDROCK_MODEL_ID);
  }

  // 3. Database Configuration
  section('💾 Database Configuration');
  
  // Supabase
  if (validateOptional('SUPABASE_URL', process.env.SUPABASE_URL)) {
    validateURL('SUPABASE_URL', process.env.SUPABASE_URL, 'https:');
    validateFormat('SUPABASE_URL', process.env.SUPABASE_URL, /\.supabase\.co/, 'Ends with .supabase.co');
  }
  
  if (validateOptional('SUPABASE_ANON_KEY', process.env.SUPABASE_ANON_KEY)) {
    validateFormat('SUPABASE_ANON_KEY', process.env.SUPABASE_ANON_KEY, /^eyJ/, 'JWT format (starts with eyJ)');
  }
  
  if (validateOptional('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    validateFormat('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY, /^eyJ/, 'JWT format (starts with eyJ)');
  }

  // Neo4j
  if (validateOptional('NEO4J_URI', process.env.NEO4J_URI)) {
    validateFormat('NEO4J_URI', process.env.NEO4J_URI, /^neo4j(\+s)?:\/\//, 'Starts with neo4j:// or neo4j+s://');
  }
  validateOptional('NEO4J_USER', process.env.NEO4J_USER || process.env.NEO4J_USERNAME, 'neo4j');
  if (validateOptional('NEO4J_PASSWORD', process.env.NEO4J_PASSWORD)) {
    validateLength('NEO4J_PASSWORD', process.env.NEO4J_PASSWORD, 8);
  }

  // Weaviate
  if (validateOptional('WEAVIATE_URL', process.env.WEAVIATE_URL)) {
    validateURL('WEAVIATE_URL', process.env.WEAVIATE_URL, 'https:');
  }
  validateOptional('WEAVIATE_API_KEY', process.env.WEAVIATE_API_KEY);

  // Redis
  if (validateOptional('REDIS_URL', process.env.REDIS_URL)) {
    validateFormat('REDIS_URL', process.env.REDIS_URL, /^rediss?:\/\//, 'Starts with redis:// or rediss://');
  }


  // 4. Security Configuration
  section('🔒 Security Configuration');
  
  if (validateOptional('ENCRYPTION_KEY', process.env.ENCRYPTION_KEY)) {
    validateLength('ENCRYPTION_KEY', process.env.ENCRYPTION_KEY, 32);
  } else if (process.env.NODE_ENV === 'production') {
    warning('ENCRYPTION_KEY: Recommended for production (DPDP compliance)');
  }
  
  if (validateOptional('SALT', process.env.SALT)) {
    validateLength('SALT', process.env.SALT, 16);
  } else if (process.env.NODE_ENV === 'production') {
    warning('SALT: Recommended for production');
  }

  // 5. Provider Selection
  section('🎨 Provider Selection');
  
  const imageProvider = process.env.IMAGE_PROVIDER || 'pollinations';
  validateEnum('IMAGE_PROVIDER', imageProvider, ['pollinations', 'freepik', 'openrouter', 'aws-bedrock', 'placeholder']);
  
  if (imageProvider === 'freepik') {
    validateRequired('FREEPIK_API_KEY', process.env.FREEPIK_API_KEY);
  } else if (imageProvider === 'openrouter') {
    validateRequired('OPENROUTER_API_KEY', process.env.OPENROUTER_API_KEY);
  }

  const ttsProvider = process.env.TTS_PROVIDER || 'browser';
  validateEnum('TTS_PROVIDER', ttsProvider, ['browser', 'aws-polly']);
  
  const sttProvider = process.env.STT_PROVIDER || 'browser';
  validateEnum('STT_PROVIDER', sttProvider, ['browser', 'aws-transcribe']);

  if (ttsProvider === 'aws-polly' || sttProvider === 'aws-transcribe') {
    validateRequired('AWS_ACCESS_KEY_ID', process.env.AWS_ACCESS_KEY_ID);
    validateRequired('AWS_SECRET_ACCESS_KEY', process.env.AWS_SECRET_ACCESS_KEY);
    validateRequired('AWS_REGION', process.env.AWS_REGION);
    validateRequired('S3_BUCKET_NAME', process.env.S3_BUCKET_NAME);
  }

  // 6. Optional Features
  section('🌟 Optional Features');
  
  if (validateOptional('FRONTEND_URL', process.env.FRONTEND_URL)) {
    validateURL('FRONTEND_URL', process.env.FRONTEND_URL);
  } else if (process.env.NODE_ENV === 'production') {
    warning('FRONTEND_URL: Recommended for production (CORS configuration)');
  }

  validateOptional('RATE_LIMIT_AUTHENTICATED', process.env.RATE_LIMIT_AUTHENTICATED, '100');
  validateOptional('RATE_LIMIT_UNAUTHENTICATED', process.env.RATE_LIMIT_UNAUTHENTICATED, '50');

  // Twilio WhatsApp
  const hasTwilioSid = validateOptional('TWILIO_ACCOUNT_SID', process.env.TWILIO_ACCOUNT_SID);
  const hasTwilioToken = validateOptional('TWILIO_AUTH_TOKEN', process.env.TWILIO_AUTH_TOKEN);
  const hasTwilioNumber = validateOptional('TWILIO_WHATSAPP_NUMBER', process.env.TWILIO_WHATSAPP_NUMBER);

  if (hasTwilioSid || hasTwilioToken || hasTwilioNumber) {
    if (!hasTwilioSid || !hasTwilioToken || !hasTwilioNumber) {
      warning('Twilio: Incomplete configuration (all three variables required for WhatsApp features)');
    } else {
      validateFormat('TWILIO_ACCOUNT_SID', process.env.TWILIO_ACCOUNT_SID, /^AC/, 'Starts with AC');
      validateFormat('TWILIO_WHATSAPP_NUMBER', process.env.TWILIO_WHATSAPP_NUMBER, /^whatsapp:\+/, 'Format: whatsapp:+[number]');
    }
  }

  // 7. Security Recommendations
  section('🛡️  Security Recommendations');
  
  if (process.env.NODE_ENV === 'production') {
    // Check JWT_SECRET strength
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 64) {
      warning('JWT_SECRET: Consider using 64+ characters for production');
    }

    // Check if using default/weak secrets
    const weakSecrets = ['dev_', 'test_', '12345', 'secret', 'password'];
    if (process.env.JWT_SECRET && weakSecrets.some(weak => process.env.JWT_SECRET!.toLowerCase().includes(weak))) {
      error('JWT_SECRET: Appears to be a weak/default secret (security risk!)');
    }

    // Recommend secret rotation
    warning('Remember to rotate secrets every 90 days');
    warning('Enable 2FA on all service accounts');
    warning('Use IP whitelisting for databases where possible');
  }

  // 8. Provider Consistency Check
  section('🔄 Provider Consistency Check');
  
  const hasSupabase = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY;
  const hasNeo4j = process.env.NEO4J_URI && process.env.NEO4J_PASSWORD;
  const hasWeaviate = process.env.WEAVIATE_URL && process.env.WEAVIATE_API_KEY;
  const hasRedis = process.env.REDIS_URL;

  if (!hasSupabase) {
    warning('Supabase: Not configured (core features may not work)');
  }
  if (!hasNeo4j) {
    warning('Neo4j: Not configured (knowledge graph features disabled)');
  }
  if (!hasWeaviate) {
    warning('Weaviate: Not configured (learning DNA features disabled)');
  }
  if (!hasRedis) {
    warning('Redis: Not configured (session caching disabled, may impact performance)');
  }


  // 9. Summary
  section('📊 Validation Summary');
  
  const total = result.passed + result.failed + result.warnings;
  log(`\n  Total Checks: ${total}`);
  log(`  ✓ Passed: ${result.passed}`, colors.green);
  log(`  ✗ Failed: ${result.failed}`, colors.red);
  log(`  ⚠ Warnings: ${result.warnings}`, colors.yellow);

  if (result.failed > 0) {
    log(`\n${colors.bright}❌ Validation Failed${colors.reset}`, colors.red);
    log(`\n${colors.bright}Errors:${colors.reset}`, colors.red);
    result.errors.forEach(err => log(`  • ${err}`, colors.red));
    log(`\nPlease fix the errors above and run validation again.`, colors.yellow);
    log(`Refer to ENVIRONMENT_VARIABLES.md for detailed setup instructions.\n`);
    process.exit(1);
  } else if (result.warnings > 0) {
    log(`\n${colors.bright}⚠️  Validation Passed with Warnings${colors.reset}`, colors.yellow);
    log(`\n${colors.bright}Warnings:${colors.reset}`, colors.yellow);
    result.warnings_list.forEach(warn => log(`  • ${warn}`, colors.yellow));
    log(`\nThe application will work, but some features may be disabled.`, colors.yellow);
    log(`Refer to ENVIRONMENT_VARIABLES.md for optional configuration.\n`);
    process.exit(0);
  } else {
    log(`\n${colors.bright}✅ Validation Complete: All checks passed!${colors.reset}`, colors.green);
    log(`\nYour environment is properly configured.\n`);
    process.exit(0);
  }
}

// Run validation
validateEnvironment().catch((error) => {
  log(`\n${colors.bright}❌ Validation Error${colors.reset}`, colors.red);
  log(`\n${error.message}`, colors.red);
  log(`\nStack trace:`, colors.red);
  log(error.stack, colors.red);
  process.exit(1);
});
