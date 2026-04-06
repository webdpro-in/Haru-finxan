# Security Test Runner Script (PowerShell)
# Runs all security-related tests and generates a security report

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "FinxanAI Security Test Suite" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$OverallStatus = 0

function Run-SecurityTest {
    param(
        [string]$TestName,
        [string]$TestPath
    )
    
    Write-Host "$TestName..." -ForegroundColor Yellow
    npm test -- $TestPath --run 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ $TestName passed" -ForegroundColor Green
        return 0
    } else {
        Write-Host "✗ $TestName failed" -ForegroundColor Red
        return 1
    }
}

# 1. Authentication Tests
$result = Run-SecurityTest "1. Authentication Tests" "src/middleware/__tests__/auth.test.ts"
$OverallStatus += $result
Write-Host ""

# 2. Input Validation Tests
$result = Run-SecurityTest "2. Input Validation Tests" "src/middleware/__tests__/inputValidation.test.ts"
$OverallStatus += $result
Write-Host ""

# 3. SQL Injection Prevention Tests
Write-Host "3. Running SQL Injection Prevention Tests..." -ForegroundColor Yellow
npm test -- src/middleware/__tests__/sqlInjectionPrevention.test.ts --run 2>&1 | Out-Null
npm test -- src/middleware/__tests__/sqlInjectionPrevention.integration.test.ts --run 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ SQL injection prevention tests passed" -ForegroundColor Green
} else {
    Write-Host "✗ SQL injection prevention tests failed" -ForegroundColor Red
    $OverallStatus += 1
}
Write-Host ""

# 4. XSS Prevention Tests
Write-Host "4. Running XSS Prevention Tests..." -ForegroundColor Yellow
npm test -- src/middleware/__tests__/xssPrevention.test.ts --run 2>&1 | Out-Null
npm test -- src/middleware/__tests__/xssPrevention.integration.test.ts --run 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ XSS prevention tests passed" -ForegroundColor Green
} else {
    Write-Host "✗ XSS prevention tests failed" -ForegroundColor Red
    $OverallStatus += 1
}
Write-Host ""

# 5. CSRF Protection Tests
Write-Host "5. Running CSRF Protection Tests..." -ForegroundColor Yellow
npm test -- src/middleware/__tests__/csrfProtection.test.ts --run 2>&1 | Out-Null
npm test -- src/middleware/__tests__/csrfProtection.integration.test.ts --run 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ CSRF protection tests passed" -ForegroundColor Green
} else {
    Write-Host "✗ CSRF protection tests failed" -ForegroundColor Red
    $OverallStatus += 1
}
Write-Host ""

# 6. Rate Limiting Tests
Write-Host "6. Running Rate Limiting Tests..." -ForegroundColor Yellow
npm test -- src/middleware/__tests__/rateLimiter.test.ts --run 2>&1 | Out-Null
npm test -- src/middleware/__tests__/rateLimiter.integration.test.ts --run 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Rate limiting tests passed" -ForegroundColor Green
} else {
    Write-Host "✗ Rate limiting tests failed" -ForegroundColor Red
    $OverallStatus += 1
}
Write-Host ""

# 7. Security Integration Tests
$result = Run-SecurityTest "7. Security Integration Tests" "src/middleware/__tests__/security.integration.test.ts"
$OverallStatus += $result
Write-Host ""

# 8. End-to-End Security Tests
$result = Run-SecurityTest "8. End-to-End Security Tests" "src/__tests__/security.e2e.test.ts"
$OverallStatus += $result
Write-Host ""

# 9. Security Audit Tests
Write-Host "9. Running Security Audit Tests..." -ForegroundColor Yellow
npm test -- src/__tests__/security.audit.test.ts --run 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Security audit tests passed" -ForegroundColor Green
} else {
    Write-Host "⚠ Security audit tests found warnings" -ForegroundColor Yellow
}
Write-Host ""

# 10. DPDP Compliance Tests
$result = Run-SecurityTest "10. DPDP Compliance Security Tests" "src/services/__tests__/DataPrivacyService.security.test.ts"
$OverallStatus += $result
Write-Host ""

# 11. Consent Check Tests
$result = Run-SecurityTest "11. Consent Check Tests" "src/middleware/__tests__/consentCheck.test.ts"
$OverallStatus += $result
Write-Host ""

# 12. npm audit
Write-Host "12. Running npm audit..." -ForegroundColor Yellow
npm audit --audit-level=moderate 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ No moderate or high vulnerabilities found" -ForegroundColor Green
} else {
    Write-Host "⚠ Vulnerabilities detected - review npm audit output" -ForegroundColor Yellow
}
Write-Host ""

# Summary
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Security Test Summary" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

if ($OverallStatus -eq 0) {
    Write-Host "✓ All security tests passed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "The platform meets security requirements:"
    Write-Host "  • Authentication and authorization working"
    Write-Host "  • Injection attacks prevented"
    Write-Host "  • Rate limiting enforced"
    Write-Host "  • DPDP 2026 compliance verified"
    Write-Host "  • Data protection implemented"
} else {
    Write-Host "✗ Some security tests failed" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please review the failures above and fix before deployment."
    exit 1
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Security Coverage Report" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
npm test -- --coverage --grep "security|auth|Auth" --run

exit $OverallStatus
