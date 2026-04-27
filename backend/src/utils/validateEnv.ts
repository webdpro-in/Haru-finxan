/**
 * Validate environment variables at startup. Errors abort boot; warnings log only.
 */

interface ValidationError {
  variable: string;
  message: string;
}

class EnvironmentValidator {
  private errors: ValidationError[] = [];
  private warnings: ValidationError[] = [];

  validate() {
    this.errors = [];
    this.warnings = [];

    // Auto-generate JWT_SECRET if not provided (for easy deployment)
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      const crypto = require('crypto');
      process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
      console.warn('⚠️  JWT_SECRET auto-generated. Set JWT_SECRET environment variable for production!');
    }

    const aiProvider = process.env.AI_PROVIDER || 'groq';
    if (!['groq', 'gemini', 'openai'].includes(aiProvider)) {
      this.errors.push({ variable: 'AI_PROVIDER', message: `must be one of groq|gemini|openai (got ${aiProvider})` });
    }
    if (aiProvider === 'groq') this.required('GROQ_API_KEY');
    if (aiProvider === 'gemini') this.required('GEMINI_API_KEY');
    if (aiProvider === 'openai') this.required('OPENAI_API_KEY');

    this.optional('SUPABASE_URL', 'auth + credits will run in in-memory mode');
    this.optional('SUPABASE_SERVICE_KEY', 'auth + credits will run in in-memory mode');
    this.optional('FRONTEND_URL', 'CORS will use localhost defaults');

    return { isValid: this.errors.length === 0, errors: this.errors, warnings: this.warnings };
  }

  private required(name: string, minLength?: number) {
    const value = process.env[name];
    if (!value || !value.trim()) {
      this.errors.push({ variable: name, message: `${name} is required but not set` });
      return;
    }
    if (minLength && value.length < minLength) {
      this.errors.push({ variable: name, message: `${name} must be ≥ ${minLength} chars (got ${value.length})` });
    }
  }

  private optional(name: string, warning: string) {
    if (!process.env[name]?.trim()) {
      this.warnings.push({ variable: name, message: `${name} not set — ${warning}` });
    }
  }
}

export function validateEnvironmentOrThrow(): void {
  const result = new EnvironmentValidator().validate();

  if (result.warnings.length) {
    console.warn('\n⚠️  Environment warnings:');
    result.warnings.forEach((w) => console.warn(`  - ${w.variable}: ${w.message}`));
  }

  if (!result.isValid) {
    console.error('\n❌ Environment validation failed:');
    result.errors.forEach((e) => console.error(`  - ${e.variable}: ${e.message}`));
    throw new Error('Environment validation failed');
  }

  console.log('✅ Environment validated\n');
}
