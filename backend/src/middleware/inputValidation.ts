/**
 * Input Validation Middleware
 * 
 * Provides comprehensive input validation and sanitization to prevent
 * SQL injection, XSS, and other injection attacks.
 * 
 * REQ-11.4: System SHALL validate all inputs (max length, SQL injection, XSS)
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

/**
 * Configuration for field validation
 */
interface ValidationConfig {
  maxLength?: number;
  minLength?: number;
  pattern?: RegExp;
  required?: boolean;
  allowedChars?: RegExp;
  sanitize?: boolean;
}

/**
 * Default validation configurations for common field types
 */
const DEFAULT_CONFIGS: Record<string, ValidationConfig> = {
  studentId: {
    maxLength: 100,
    minLength: 1,
    required: true,
    pattern: /^[a-zA-Z0-9_-]+$/,
  },
  sessionId: {
    maxLength: 100,
    minLength: 1,
    required: true,
    pattern: /^[a-zA-Z0-9_-]+$/,
  },
  classroomId: {
    maxLength: 100,
    minLength: 1,
    required: true,
    pattern: /^[a-zA-Z0-9_-]+$/,
  },
  questionId: {
    maxLength: 100,
    minLength: 1,
    required: true,
    pattern: /^[a-zA-Z0-9_-]+$/,
  },
  predictionId: {
    maxLength: 100,
    minLength: 1,
    required: true,
    pattern: /^[a-zA-Z0-9_-]+$/,
  },
  name: {
    maxLength: 200,
    minLength: 1,
    sanitize: true,
  },
  message: {
    maxLength: 5000,
    minLength: 1,
    required: true,
    sanitize: true,
  },
  question: {
    maxLength: 2000,
    minLength: 1,
    sanitize: true,
  },
  answer: {
    maxLength: 10000,
    minLength: 1,
    sanitize: true,
  },
  email: {
    maxLength: 255,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
};

/**
 * Detect SQL injection attempts in a string
 */
export function detectSQLInjection(input: string): boolean {
  if (typeof input !== 'string') return false;
  
  // Recreate patterns to avoid global flag state issues
  const patterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)/i,
    /(--|\/\*|\*\/|xp_|sp_)/,
    /(';|';|UNION\s+SELECT|UNION\s+ALL\s+SELECT)/i,
    /(\bEXEC\b|\bEXECUTE\b)/i,
    /(INFORMATION_SCHEMA|SYSOBJECTS|SYSCOLUMNS)/i,
    /('\s+(OR|AND)\s+')/i,
  ];
  
  return patterns.some(pattern => pattern.test(input));
}

/**
 * Detect XSS attempts in a string
 */
export function detectXSS(input: string): boolean {
  if (typeof input !== 'string') return false;
  
  // Recreate patterns to avoid global flag state issues
  const patterns = [
    /<script[\s\S]*?>[\s\S]*?<\/script>/i,
    /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/i,
    /javascript:/i,
    /on\w+\s*=/i, // Event handlers like onclick=
    /<embed[\s\S]*?>/i,
    /<object[\s\S]*?>/i,
  ];
  
  return patterns.some(pattern => pattern.test(input));
}

/**
 * Sanitize a string by removing potentially dangerous characters
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';
  
  // Remove null bytes
  let sanitized = input.replace(/\0/g, '');
  
  // Escape HTML special characters
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
  
  return sanitized;
}

/**
 * Validate a single field against its configuration
 */
export function validateField(
  fieldName: string,
  value: any,
  config: ValidationConfig
): { valid: boolean; error?: string; sanitized?: any } {
  // Check if required
  if (config.required && (value === undefined || value === null || value === '')) {
    return { valid: false, error: `${fieldName} is required` };
  }
  
  // Skip validation if not required and value is empty
  if (!config.required && (value === undefined || value === null || value === '')) {
    return { valid: true, sanitized: value };
  }
  
  // Convert to string for validation
  const strValue = String(value);
  
  // Check length constraints
  if (config.maxLength && strValue.length > config.maxLength) {
    return {
      valid: false,
      error: `${fieldName} exceeds maximum length of ${config.maxLength}`,
    };
  }
  
  if (config.minLength && strValue.length < config.minLength) {
    return {
      valid: false,
      error: `${fieldName} must be at least ${config.minLength} characters`,
    };
  }
  
  // Check pattern
  if (config.pattern && !config.pattern.test(strValue)) {
    return {
      valid: false,
      error: `${fieldName} contains invalid characters`,
    };
  }
  
  // Check for SQL injection
  if (detectSQLInjection(strValue)) {
    logger.warn('SQL injection attempt detected', { fieldName, value: strValue });
    return {
      valid: false,
      error: `${fieldName} contains potentially malicious content`,
    };
  }
  
  // Check for XSS
  if (detectXSS(strValue)) {
    logger.warn('XSS attempt detected', { fieldName, value: strValue });
    return {
      valid: false,
      error: `${fieldName} contains potentially malicious content`,
    };
  }
  
  // Sanitize if configured
  const sanitized = config.sanitize ? sanitizeString(strValue) : value;
  
  return { valid: true, sanitized };
}

/**
 * Middleware factory: Validate request body fields
 */
export function validateBody(
  fieldConfigs: Record<string, ValidationConfig>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];
    const sanitizedBody: Record<string, any> = {};
    
    // Validate each configured field
    for (const [fieldName, config] of Object.entries(fieldConfigs)) {
      const value = req.body[fieldName];
      const result = validateField(fieldName, value, config);
      
      if (!result.valid) {
        errors.push(result.error!);
      } else {
        sanitizedBody[fieldName] = result.sanitized;
      }
    }
    
    // If there are errors, return 400
    if (errors.length > 0) {
      logger.warn('Input validation failed', { errors, path: req.path });
      return res.status(400).json({
        error: 'Validation failed',
        details: errors,
      });
    }
    
    // Replace body with sanitized values
    req.body = { ...req.body, ...sanitizedBody };
    
    next();
  };
}

/**
 * Middleware factory: Validate request params
 */
export function validateParams(
  fieldConfigs: Record<string, ValidationConfig>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];
    const sanitizedParams: Record<string, any> = {};
    
    // Validate each configured param
    for (const [fieldName, config] of Object.entries(fieldConfigs)) {
      const value = req.params[fieldName];
      const result = validateField(fieldName, value, config);
      
      if (!result.valid) {
        errors.push(result.error!);
      } else {
        sanitizedParams[fieldName] = result.sanitized;
      }
    }
    
    // If there are errors, return 400
    if (errors.length > 0) {
      logger.warn('Param validation failed', { errors, path: req.path });
      return res.status(400).json({
        error: 'Validation failed',
        details: errors,
      });
    }
    
    // Replace params with sanitized values
    req.params = { ...req.params, ...sanitizedParams };
    
    next();
  };
}

/**
 * Middleware factory: Validate request query parameters
 */
export function validateQuery(
  fieldConfigs: Record<string, ValidationConfig>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];
    const sanitizedQuery: Record<string, any> = {};
    
    // Validate each configured query param
    for (const [fieldName, config] of Object.entries(fieldConfigs)) {
      const value = req.query[fieldName];
      const result = validateField(fieldName, value, config);
      
      if (!result.valid) {
        errors.push(result.error!);
      } else {
        sanitizedQuery[fieldName] = result.sanitized;
      }
    }
    
    // If there are errors, return 400
    if (errors.length > 0) {
      logger.warn('Query validation failed', { errors, path: req.path });
      return res.status(400).json({
        error: 'Validation failed',
        details: errors,
      });
    }
    
    // Replace query with sanitized values
    req.query = { ...req.query, ...sanitizedQuery };
    
    next();
  };
}

/**
 * Pre-configured validation middleware for common use cases
 */
export const ValidationMiddleware = {
  /**
   * Validate student session start request
   */
  sessionStart: validateBody({
    studentId: DEFAULT_CONFIGS.studentId,
  }),
  
  /**
   * Validate student session end request
   */
  sessionEnd: validateBody({
    sessionId: DEFAULT_CONFIGS.sessionId,
    studentId: DEFAULT_CONFIGS.studentId,
  }),
  
  /**
   * Validate anonymous question submission
   */
  anonymousQuestion: validateBody({
    studentId: DEFAULT_CONFIGS.studentId,
    classroomId: DEFAULT_CONFIGS.classroomId,
    question: DEFAULT_CONFIGS.question,
  }),
  
  /**
   * Validate teacher answer to anonymous question
   */
  answerQuestion: [
    validateParams({
      questionId: DEFAULT_CONFIGS.questionId,
    }),
    validateBody({
      answer: DEFAULT_CONFIGS.answer,
    }),
  ],
  
  /**
   * Validate risk alert acknowledgment
   */
  acknowledgeAlert: [
    validateParams({
      predictionId: DEFAULT_CONFIGS.predictionId,
    }),
    validateBody({
      teacherId: { ...DEFAULT_CONFIGS.studentId, required: false },
      notes: { maxLength: 1000, required: false, sanitize: true },
    }),
  ],
  
  /**
   * Validate classroom ID in params
   */
  classroomParam: validateParams({
    classroomId: DEFAULT_CONFIGS.classroomId,
  }),
  
  /**
   * Validate student ID in params
   */
  studentParam: validateParams({
    studentId: DEFAULT_CONFIGS.studentId,
  }),
  
  /**
   * Validate chat message
   */
  chatMessage: validateBody({
    message: DEFAULT_CONFIGS.message,
    studentId: { ...DEFAULT_CONFIGS.studentId, required: false },
  }),
  
  /**
   * Validate lesson plan generation request
   * Task 23.3: Implement POST /api/teacher/lesson-plan/generate endpoint
   */
  generateLessonPlan: validateBody({
    classroomId: DEFAULT_CONFIGS.classroomId,
    subject: {
      maxLength: 100,
      minLength: 1,
      required: true,
      sanitize: true,
    },
    topic: {
      maxLength: 200,
      minLength: 1,
      required: true,
      sanitize: true,
    },
    duration: {
      required: true,
      pattern: /^\d+$/,
    },
    grade: {
      required: true,
      pattern: /^([1-9]|1[0-2])$/,
    },
  }),
  
  /**
   * Validate image search request
   */
  imageSearch: validateBody({
    query: {
      maxLength: 500,
      minLength: 1,
      required: true,
      sanitize: true,
    },
    count: {
      required: false,
      pattern: /^[1-9]\d*$/,
    },
  }),
  
  /**
   * Validate image generation request
   */
  imageGenerate: validateBody({
    prompt: {
      maxLength: 1000,
      minLength: 1,
      required: true,
      sanitize: true,
    },
  }),
  
  /**
   * Validate image prompts analysis request
   */
  imagePromptsAnalyze: validateBody({
    text: {
      maxLength: 10000,
      minLength: 1,
      required: true,
      sanitize: true,
    },
    userMessage: {
      maxLength: 2000,
      required: false,
      sanitize: true,
    },
  }),
  
  /**
   * Validate text-to-speech synthesis request
   */
  synthesize: validateBody({
    text: {
      maxLength: 5000,
      minLength: 1,
      required: true,
      sanitize: true,
    },
    voiceId: {
      maxLength: 50,
      required: false,
      pattern: /^[a-zA-Z0-9_-]+$/,
    },
    languageCode: {
      maxLength: 10,
      required: false,
      pattern: /^[a-z]{2}-[A-Z]{2}$/,
    },
  }),
  
  /**
   * Validate parent ID in params
   */
  parentParam: validateParams({
    id: {
      maxLength: 100,
      minLength: 1,
      required: true,
      pattern: /^[a-zA-Z0-9_-]+$/,
    },
  }),
  
  /**
   * Validate parent child report request
   */
  parentChildReport: [
    validateParams({
      id: {
        maxLength: 100,
        minLength: 1,
        required: true,
        pattern: /^[a-zA-Z0-9_-]+$/,
      },
      studentId: DEFAULT_CONFIGS.studentId,
    }),
    validateQuery({
      date: {
        required: false,
        pattern: /^\d{4}-\d{2}-\d{2}$/,
      },
    }),
  ],
  
  /**
   * Validate class ID in params
   */
  classParam: validateParams({
    classId: {
      maxLength: 100,
      minLength: 1,
      required: true,
      pattern: /^[a-zA-Z0-9_-]+$/,
    },
  }),
  
  /**
   * Validate lesson ID in params
   */
  lessonParam: validateParams({
    lessonId: {
      maxLength: 100,
      minLength: 1,
      required: true,
      pattern: /^[a-zA-Z0-9_-]+$/,
    },
  }),
};

export default ValidationMiddleware;
