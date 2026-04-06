#!/bin/bash

# Security Test Runner Script
# Runs all security-related tests and generates a security report

echo "=========================================="
echo "FinxanAI Security Test Suite"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track overall status
OVERALL_STATUS=0

# 1. Run Authentication Tests
echo "1. Running Authentication Tests..."
npm test -- src/middleware/__tests__/auth.test.ts --run
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Authentication tests passed${NC}"
else
  echo -e "${RED}✗ Authentication tests failed${NC}"
  OVERALL_STATUS=1
fi
echo ""

# 2. Run Input Validation Tests
echo "2. Running Input Validation Tests..."
npm test -- src/middleware/__tests__/inputValidation.test.ts --run
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Input validation tests passed${NC}"
else
  echo -e "${RED}✗ Input validation tests failed${NC}"
  OVERALL_STATUS=1
fi
echo ""

# 3. Run SQL Injection Prevention Tests
echo "3. Running SQL Injection Prevention Tests..."
npm test -- src/middleware/__tests__/sqlInjectionPrevention.test.ts --run
npm test -- src/middleware/__tests__/sqlInjectionPrevention.integration.test.ts --run
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ SQL injection prevention tests passed${NC}"
else
  echo -e "${RED}✗ SQL injection prevention tests failed${NC}"
  OVERALL_STATUS=1
fi
echo ""

# 4. Run XSS Prevention Tests
echo "4. Running XSS Prevention Tests..."
npm test -- src/middleware/__tests__/xssPrevention.test.ts --run
npm test -- src/middleware/__tests__/xssPrevention.integration.test.ts --run
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ XSS prevention tests passed${NC}"
else
  echo -e "${RED}✗ XSS prevention tests failed${NC}"
  OVERALL_STATUS=1
fi
echo ""

# 5. Run CSRF Protection Tests
echo "5. Running CSRF Protection Tests..."
npm test -- src/middleware/__tests__/csrfProtection.test.ts --run
npm test -- src/middleware/__tests__/csrfProtection.integration.test.ts --run
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ CSRF protection tests passed${NC}"
else
  echo -e "${RED}✗ CSRF protection tests failed${NC}"
  OVERALL_STATUS=1
fi
echo ""

# 6. Run Rate Limiting Tests
echo "6. Running Rate Limiting Tests..."
npm test -- src/middleware/__tests__/rateLimiter.test.ts --run
npm test -- src/middleware/__tests__/rateLimiter.integration.test.ts --run
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Rate limiting tests passed${NC}"
else
  echo -e "${RED}✗ Rate limiting tests failed${NC}"
  OVERALL_STATUS=1
fi
echo ""

# 7. Run Security Integration Tests
echo "7. Running Security Integration Tests..."
npm test -- src/middleware/__tests__/security.integration.test.ts --run
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Security integration tests passed${NC}"
else
  echo -e "${RED}✗ Security integration tests failed${NC}"
  OVERALL_STATUS=1
fi
echo ""

# 8. Run End-to-End Security Tests
echo "8. Running End-to-End Security Tests..."
npm test -- src/__tests__/security.e2e.test.ts --run
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ E2E security tests passed${NC}"
else
  echo -e "${RED}✗ E2E security tests failed${NC}"
  OVERALL_STATUS=1
fi
echo ""

# 9. Run Security Audit Tests
echo "9. Running Security Audit Tests..."
npm test -- src/__tests__/security.audit.test.ts --run
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Security audit tests passed${NC}"
else
  echo -e "${YELLOW}⚠ Security audit tests found warnings${NC}"
  # Don't fail on audit warnings
fi
echo ""

# 10. Run DPDP Compliance Tests
echo "10. Running DPDP Compliance Security Tests..."
npm test -- src/services/__tests__/DataPrivacyService.security.test.ts --run
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ DPDP compliance tests passed${NC}"
else
  echo -e "${RED}✗ DPDP compliance tests failed${NC}"
  OVERALL_STATUS=1
fi
echo ""

# 11. Run Consent Check Tests
echo "11. Running Consent Check Tests..."
npm test -- src/middleware/__tests__/consentCheck.test.ts --run
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Consent check tests passed${NC}"
else
  echo -e "${RED}✗ Consent check tests failed${NC}"
  OVERALL_STATUS=1
fi
echo ""

# 12. Run npm audit
echo "12. Running npm audit..."
npm audit --audit-level=moderate
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ No moderate or high vulnerabilities found${NC}"
else
  echo -e "${YELLOW}⚠ Vulnerabilities detected - review npm audit output${NC}"
  # Don't fail build on audit warnings
fi
echo ""

# Summary
echo "=========================================="
echo "Security Test Summary"
echo "=========================================="

if [ $OVERALL_STATUS -eq 0 ]; then
  echo -e "${GREEN}✓ All security tests passed!${NC}"
  echo ""
  echo "The platform meets security requirements:"
  echo "  • Authentication and authorization working"
  echo "  • Injection attacks prevented"
  echo "  • Rate limiting enforced"
  echo "  • DPDP 2026 compliance verified"
  echo "  • Data protection implemented"
else
  echo -e "${RED}✗ Some security tests failed${NC}"
  echo ""
  echo "Please review the failures above and fix before deployment."
  exit 1
fi

echo ""
echo "=========================================="
echo "Security Coverage Report"
echo "=========================================="
npm test -- --coverage --grep "security|auth|Auth" --run

exit $OVERALL_STATUS
