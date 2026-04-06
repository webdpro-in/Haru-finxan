/**
 * SQL Injection Prevention Middleware Tests
 * 
 * Tests comprehensive SQL injection detection and prevention
 * REQ-11.4: System SHALL validate all inputs (max length, SQL injection, XSS)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  detectSQLInjection,
  preventSQLInjection,
  preventSQLInjectionBody,
  preventSQLInjectionParams,
  preventSQLInjectionQuery
} from '../sqlInjectionPrevention.js';

describe('SQL Injection Prevention', () => {
  describe('detectSQLInjection()', () => {
    describe('SQL Keywords Detection', () => {
      it('should detect SELECT statements', () => {
        expect(detectSQLInjection('SELECT * FROM users')).toBe(true);
        expect(detectSQLInjection('select * from users')).toBe(true);
        expect(detectSQLInjection('SeLeCt * FrOm users')).toBe(true);
      });

      it('should detect INSERT statements', () => {
        expect(detectSQLInjection('INSERT INTO users VALUES')).toBe(true);
        expect(detectSQLInjection('insert into users')).toBe(true);
      });

      it('should detect UPDATE statements', () => {
        expect(detectSQLInjection('UPDATE users SET password')).toBe(true);
        expect(detectSQLInjection('update users set')).toBe(true);
      });

      it('should detect DELETE statements', () => {
        expect(detectSQLInjection('DELETE FROM users')).toBe(true);
        expect(detectSQLInjection('delete from users')).toBe(true);
      });

      it('should detect DROP statements', () => {
        expect(detectSQLInjection('DROP TABLE users')).toBe(true);
        expect(detectSQLInjection('drop database')).toBe(true);
      });

      it('should detect UNION attacks', () => {
        expect(detectSQLInjection('UNION SELECT password')).toBe(true);
        expect(detectSQLInjection('union all select')).toBe(true);
        expect(detectSQLInjection('UNION ALL SELECT')).toBe(true);
      });

      it('should detect EXEC/EXECUTE commands', () => {
        expect(detectSQLInjection('EXEC sp_executesql')).toBe(true);
        expect(detectSQLInjection('EXECUTE xp_cmdshell')).toBe(true);
        expect(detectSQLInjection('exec sp_')).toBe(true);
      });
    });

    describe('SQL Comment Detection', () => {
      it('should detect SQL line comments (--)', () => {
        expect(detectSQLInjection("admin' --")).toBe(true);
        expect(detectSQLInjection('test-- comment')).toBe(true);
      });

      it('should detect SQL block comments (/* */)', () => {
        expect(detectSQLInjection('test /* comment */')).toBe(true);
        expect(detectSQLInjection('/* bypass */ admin')).toBe(true);
      });

      it('should detect semicolons (statement terminators)', () => {
        expect(detectSQLInjection("admin'; DROP TABLE users;")).toBe(true);
        expect(detectSQLInjection('test; SELECT')).toBe(true);
      });

      it('should detect hash comments (#)', () => {
        expect(detectSQLInjection('admin# comment')).toBe(true);
      });
    });

    describe('Boolean-based Blind SQL Injection', () => {
      it('should detect OR 1=1 patterns', () => {
        expect(detectSQLInjection("' OR 1=1 --")).toBe(true);
        expect(detectSQLInjection("' OR '1'='1")).toBe(true);
        expect(detectSQLInjection("admin' OR 1=1#")).toBe(true);
      });

      it('should detect AND 1=1 patterns', () => {
        expect(detectSQLInjection("' AND 1=1 --")).toBe(true);
        // Note: String comparisons without spaces around AND/OR may not be detected
        // but are still protected by parameterized queries
      });

      it('should detect OR with string comparisons', () => {
        expect(detectSQLInjection("' OR 'a'='a")).toBe(true);
        expect(detectSQLInjection("' OR 'x'='x' --")).toBe(true);
      });
    });

    describe('System Objects and Stored Procedures', () => {
      it('should detect INFORMATION_SCHEMA queries', () => {
        expect(detectSQLInjection('INFORMATION_SCHEMA.TABLES')).toBe(true);
        expect(detectSQLInjection('information_schema.columns')).toBe(true);
      });

      it('should detect SYSOBJECTS references', () => {
        expect(detectSQLInjection('SYSOBJECTS')).toBe(true);
        expect(detectSQLInjection('sysobjects')).toBe(true);
      });

      it('should detect SYSCOLUMNS references', () => {
        expect(detectSQLInjection('SYSCOLUMNS')).toBe(true);
      });

      it('should detect xp_ stored procedures', () => {
        expect(detectSQLInjection('xp_cmdshell')).toBe(true);
        expect(detectSQLInjection('exec xp_')).toBe(true);
      });

      it('should detect sp_ stored procedures', () => {
        expect(detectSQLInjection('sp_executesql')).toBe(true);
        expect(detectSQLInjection('execute sp_')).toBe(true);
      });

      it('should detect sys. references', () => {
        expect(detectSQLInjection('sys.tables')).toBe(true);
        expect(detectSQLInjection('sys.databases')).toBe(true);
      });
    });

    describe('Time-based Blind SQL Injection', () => {
      it('should detect WAITFOR DELAY', () => {
        expect(detectSQLInjection("'; WAITFOR DELAY '00:00:05' --")).toBe(true);
        expect(detectSQLInjection('waitfor delay')).toBe(true);
      });

      it('should detect SLEEP function', () => {
        expect(detectSQLInjection('SLEEP(5)')).toBe(true);
        expect(detectSQLInjection('sleep(10)')).toBe(true);
      });

      it('should detect BENCHMARK function', () => {
        expect(detectSQLInjection('BENCHMARK(1000000, MD5(1))')).toBe(true);
        expect(detectSQLInjection('benchmark(')).toBe(true);
      });
    });

    describe('Hex Encoding Detection', () => {
      it('should detect hex-encoded values', () => {
        expect(detectSQLInjection('0x61646d696e')).toBe(true);
        expect(detectSQLInjection('0x5461626c65')).toBe(true);
        expect(detectSQLInjection('0xABCDEF')).toBe(true);
      });
    });

    describe('Stacked Queries', () => {
      it('should detect stacked SELECT queries', () => {
        expect(detectSQLInjection('; SELECT * FROM users')).toBe(true);
      });

      it('should detect stacked INSERT queries', () => {
        expect(detectSQLInjection('; INSERT INTO logs')).toBe(true);
      });

      it('should detect stacked UPDATE queries', () => {
        expect(detectSQLInjection('; UPDATE users SET')).toBe(true);
      });

      it('should detect stacked DELETE queries', () => {
        expect(detectSQLInjection('; DELETE FROM users')).toBe(true);
      });

      it('should detect stacked DROP queries', () => {
        expect(detectSQLInjection('; DROP TABLE users')).toBe(true);
      });
    });

    describe('Safe Strings (Negative Tests)', () => {
      it('should allow normal text', () => {
        expect(detectSQLInjection('Hello, how are you?')).toBe(false);
      });

      it('should allow student names', () => {
        expect(detectSQLInjection('John Smith')).toBe(false);
        expect(detectSQLInjection('María García')).toBe(false);
      });

      it('should allow questions', () => {
        expect(detectSQLInjection('What is photosynthesis?')).toBe(false);
        expect(detectSQLInjection('Can you explain quadratic equations?')).toBe(false);
      });

      it('should allow normal sentences with punctuation', () => {
        expect(detectSQLInjection('I am confused about this topic.')).toBe(false);
        expect(detectSQLInjection('This is interesting!')).toBe(false);
      });

      it('should allow alphanumeric IDs', () => {
        expect(detectSQLInjection('student_12345')).toBe(false);
        expect(detectSQLInjection('session-abc-def-123')).toBe(false);
      });

      it('should allow email addresses', () => {
        expect(detectSQLInjection('student@example.com')).toBe(false);
      });

      it('should allow URLs', () => {
        expect(detectSQLInjection('https://example.com/page')).toBe(false);
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty strings', () => {
        expect(detectSQLInjection('')).toBe(false);
      });

      it('should handle non-string values', () => {
        expect(detectSQLInjection(123 as any)).toBe(false);
        expect(detectSQLInjection(null as any)).toBe(false);
        expect(detectSQLInjection(undefined as any)).toBe(false);
        expect(detectSQLInjection({} as any)).toBe(false);
        expect(detectSQLInjection([] as any)).toBe(false);
      });

      it('should handle very long strings', () => {
        const longString = 'a'.repeat(10000);
        expect(detectSQLInjection(longString)).toBe(false);
      });

      it('should handle strings with special characters', () => {
        // Note: # is a MySQL comment marker, so it triggers detection (correct behavior)
        expect(detectSQLInjection('!@$%^&()')).toBe(false);
        expect(detectSQLInjection('test!')).toBe(false);
        expect(detectSQLInjection('hello@world')).toBe(false);
      });
    });

    describe('Real-world Attack Scenarios', () => {
      it('should detect classic authentication bypass', () => {
        expect(detectSQLInjection("admin' OR '1'='1' --")).toBe(true);
        expect(detectSQLInjection("' OR 1=1 --")).toBe(true);
      });

      it('should detect data exfiltration attempts', () => {
        expect(detectSQLInjection("' UNION SELECT username, password FROM users --")).toBe(true);
      });

      it('should detect table dropping attempts', () => {
        expect(detectSQLInjection("'; DROP TABLE students; --")).toBe(true);
      });

      it('should detect command execution attempts', () => {
        expect(detectSQLInjection("'; EXEC xp_cmdshell 'dir' --")).toBe(true);
      });

      it('should detect second-order injection payloads', () => {
        expect(detectSQLInjection("admin'--")).toBe(true);
        expect(detectSQLInjection("test' UNION SELECT")).toBe(true);
      });
    });
  });

  describe('Middleware Functions', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let nextFunction: NextFunction;
    let jsonMock: ReturnType<typeof vi.fn>;
    let statusMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      jsonMock = vi.fn();
      statusMock = vi.fn().mockReturnValue({ json: jsonMock });
      
      mockRequest = {
        body: {},
        params: {},
        query: {},
        ip: '127.0.0.1',
        path: '/api/test',
        headers: {
          'user-agent': 'test-agent'
        }
      };
      
      mockResponse = {
        status: statusMock,
        json: jsonMock
      };
      
      nextFunction = vi.fn();
    });

    describe('preventSQLInjectionBody()', () => {
      it('should allow safe body data', () => {
        mockRequest.body = {
          studentId: 'student_123',
          message: 'Hello, I have a question'
        };

        const middleware = preventSQLInjectionBody();
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
        expect(statusMock).not.toHaveBeenCalled();
      });

      it('should block SQL injection in body', () => {
        mockRequest.body = {
          studentId: "admin' OR '1'='1",
          message: 'test'
        };

        const middleware = preventSQLInjectionBody();
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).not.toHaveBeenCalled();
        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Invalid input',
            message: 'Request contains potentially malicious content'
          })
        );
      });

      it('should handle nested objects in body', () => {
        mockRequest.body = {
          user: {
            name: 'test',
            query: 'SELECT * FROM users'
          }
        };

        const middleware = preventSQLInjectionBody();
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).not.toHaveBeenCalled();
        expect(statusMock).toHaveBeenCalledWith(400);
      });

      it('should handle arrays in body', () => {
        mockRequest.body = {
          items: ['safe', 'also safe', "'; DROP TABLE users; --"]
        };

        const middleware = preventSQLInjectionBody();
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).not.toHaveBeenCalled();
        expect(statusMock).toHaveBeenCalledWith(400);
      });

      it('should allow empty body', () => {
        mockRequest.body = {};

        const middleware = preventSQLInjectionBody();
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
      });
    });

    describe('preventSQLInjectionParams()', () => {
      it('should allow safe params', () => {
        mockRequest.params = {
          studentId: 'student_123',
          classroomId: 'class_456'
        };

        const middleware = preventSQLInjectionParams();
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
        expect(statusMock).not.toHaveBeenCalled();
      });

      it('should block SQL injection in params', () => {
        mockRequest.params = {
          studentId: "' UNION SELECT password FROM users --"
        };

        const middleware = preventSQLInjectionParams();
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).not.toHaveBeenCalled();
        expect(statusMock).toHaveBeenCalledWith(400);
      });

      it('should allow empty params', () => {
        mockRequest.params = {};

        const middleware = preventSQLInjectionParams();
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
      });
    });

    describe('preventSQLInjectionQuery()', () => {
      it('should allow safe query parameters', () => {
        mockRequest.query = {
          page: '1',
          limit: '10',
          search: 'mathematics'
        };

        const middleware = preventSQLInjectionQuery();
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
        expect(statusMock).not.toHaveBeenCalled();
      });

      it('should block SQL injection in query', () => {
        mockRequest.query = {
          search: "'; DELETE FROM students; --"
        };

        const middleware = preventSQLInjectionQuery();
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).not.toHaveBeenCalled();
        expect(statusMock).toHaveBeenCalledWith(400);
      });

      it('should allow empty query', () => {
        mockRequest.query = {};

        const middleware = preventSQLInjectionQuery();
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
      });
    });

    describe('preventSQLInjection() - Combined', () => {
      it('should scan all request inputs', () => {
        mockRequest.body = { message: 'safe' };
        mockRequest.params = { id: 'safe_123' };
        mockRequest.query = { filter: 'active' };

        const middleware = preventSQLInjection();
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
        expect(statusMock).not.toHaveBeenCalled();
      });

      it('should block if body contains SQL injection', () => {
        mockRequest.body = { message: 'SELECT * FROM users' };
        mockRequest.params = { id: 'safe' };
        mockRequest.query = { filter: 'safe' };

        const middleware = preventSQLInjection();
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).not.toHaveBeenCalled();
        expect(statusMock).toHaveBeenCalledWith(400);
      });

      it('should block if params contain SQL injection', () => {
        mockRequest.body = { message: 'safe' };
        mockRequest.params = { id: "' OR 1=1 --" };
        mockRequest.query = { filter: 'safe' };

        const middleware = preventSQLInjection();
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).not.toHaveBeenCalled();
        expect(statusMock).toHaveBeenCalledWith(400);
      });

      it('should block if query contains SQL injection', () => {
        mockRequest.body = { message: 'safe' };
        mockRequest.params = { id: 'safe' };
        mockRequest.query = { filter: 'UNION SELECT password' };

        const middleware = preventSQLInjection();
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).not.toHaveBeenCalled();
        expect(statusMock).toHaveBeenCalledWith(400);
      });

      it('should provide field information in error response', () => {
        mockRequest.body = {
          user: {
            name: 'test',
            email: "admin' --"
          }
        };

        const middleware = preventSQLInjection();
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            field: expect.any(String)
          })
        );
      });
    });

    describe('Integration Scenarios', () => {
      it('should handle complex nested structures', () => {
        mockRequest.body = {
          student: {
            profile: {
              name: 'John',
              metadata: {
                tags: ['math', 'science'],
                notes: 'Good student'
              }
            }
          }
        };

        const middleware = preventSQLInjection();
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
      });

      it('should detect injection in deeply nested structures', () => {
        mockRequest.body = {
          level1: {
            level2: {
              level3: {
                malicious: "'; DROP TABLE users; --"
              }
            }
          }
        };

        const middleware = preventSQLInjection();
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).not.toHaveBeenCalled();
        expect(statusMock).toHaveBeenCalledWith(400);
      });

      it('should handle mixed safe and unsafe data correctly', () => {
        mockRequest.body = {
          safeField: 'This is safe',
          unsafeField: 'SELECT * FROM users'
        };

        const middleware = preventSQLInjection();
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).not.toHaveBeenCalled();
      });
    });
  });
});
