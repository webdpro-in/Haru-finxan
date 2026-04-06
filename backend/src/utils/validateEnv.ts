/**
 * Environment Variable Validation Utility
 * 
 * Validates critical environment variables at startup.
 * Throws errors for missing required variables.
 */

interface ValidationError {
  variable: string;
  message: string;
  severity: 'error' | 'warning';
}

export class EnvironmentValidator {
  private errors: ValidationError[] = [];
  private warnings: ValidationError[] = [];

  /**
   * Validate all required environment variables
   */
  validate(): { isValid: boolean; errors: ValidationError[]; warnings: ValidationError[] } {
    this.errors = [];
    this.warnings = [];

    // Required variables
    this.validateRequired('NODE_ENV', ['development', 'production', 'test']);
    this.validateRequired('PORT');
    this.validateRequired('JWT_SECRET', undefined, 32);

    // AI Provider
    const aiProvider = process.env.AI_PROVIDER || 'gemini';
    this.validateEnum('AI_PROVIDER', aiProvider, ['gemini', 'openai', 'groq', 'aws-bedrock'], 'warning');

    // Check corresponding AI provider key
    if (aiProvider === 'gemini') {
      this.validateRequired('GEMINI_API_KEY');
    } else if (aiProvider === 'openai') {
      this.validateRequired('OPENAI_API_KEY');
    } else if (aiProvider === 'groq') {
      this.validateRequired('GROQ_API_KEY');
    } else if (aiProvider === 'aws-bedrock') {
      this.validateRequired('AWS_ACCESS_KEY_ID');
      this.validateRequired('AWS_SECRET_ACCESS_KEY');
      this.validateRequired('AWS_REGION');
    }

    // Database configuration (warnings only - app can start without them)
    this.validateOptional('SUPABASE_URL', 'Core database features may not work');
    this.validateOptional('NEO4J_URI', 'Knowledge graph features disabled');
    this.validateOptional('WEAVIATE_URL', 'Learning DNA features disabled');
    this.validateOptional('REDIS_URL', 'Session caching disabled');

    // Security (warnings for production)
    if (process.env.NODE_ENV === 'production') {
      this.validateOptional('ENCRYPTION_KEY', 'Recommended for DPDP compliance', 32);
      this.validateOptional('SALT', 'Recommended for data hashing', 16);
      this.validateOptional('FRONTEND_URL', 'CORS configuration may not work properly');
    }

    return {
      isValid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
    };
  }

  /**
   * Validate a required environment variable
   */
  private validateRequired(
    name: string,
    allowedValues?: string[],
    minLength?: number
  ): void {
    const value = process.env[name];

    if (!value || value.trim() === '') {
      this.errors.push({
        variable: name,
        message: `${name} is required but not set`,
        severity: 'error',
      });
      return;
    }

    if (minLength && value.length < minLength) {
      this.errors.push({
        variable: name,
        message: `${name} must be at least ${minLength} characters (got ${value.length})`,
        severity: 'error',
      });
    }

    if (allowedValues && !allowedValues.includes(value)) {
      this.errors.push({
        variable: name,
        message: `${name} must be one of: ${allowedValues.join(', ')} (got: ${value})`,
        severity: 'error',
      });
    }
  }

  /**
   * Validate an optional environment variable
   */
  private validateOptional(
    name: string,
    warningMessage: string,
    minLength?: number
  ): void {
    const value = process.env[name];

    if (!value || value.trim() === '') {
      this.warnings.push({
        variable: name,
        message: `${name} is not set. ${warningMessage}`,
        severity: 'warning',
      });
      return;
    }

    if (minLength && value.length < minLength) {
      this.warnings.push({
        variable: name,
        message: `${name} should be at least ${minLength} characters (got ${value.length})`,
        severity: 'warning',
      });
    }
  }

  /**
   * Validate enum value
   */
  private validateEnum(
    name: string,
    value: string,
    allowedValues: string[],
    severity: 'error' | 'warning' = 'error'
  ): void {
    if (!allowedValues.includes(value)) {
      const error = {
        variable: name,
        message: `${name} must be one of: ${allowedValues.join(', ')} (got: ${value})`,
        severity,
      };

      if (severity === 'error') {
        this.errors.push(error);
      } else {
        this.warnings.push(error);
      }
    }
  }
}

/**
 * Validate environment variables and throw if invalid
 */
export function validateEnvironmentOrThrow(): void {
  const validator = new EnvironmentValidator();
  const result = validator.validate();

  // Log warnings
  if (result.warnings.length > 0) {
    console.warn('\n⚠️  Environment Variable Warnings:');
    result.warnings.forEach((warning) => {
      console.warn(`  ⚠ ${warning.variable}: ${warning.message}`);
    });
    console.warn('');
  }

  // Throw on errors
  if (!result.isValid) {
    console.error('\n❌ Environment Variable Validation Failed:');
    result.errors.forEach((error) => {
      console.error(`  ✗ ${error.variable}: ${error.message}`);
    });
    console.error('\nPlease set the required environment variables and restart the server.');
    console.error('Refer to ENVIRONMENT_VARIABLES.md for detailed setup instructions.\n');
    throw new Error('Environment validation failed');
  }

  console.log('✅ Environment variables validated successfully\n');
}
