# Security Testing Strategy 🔒

## Mission: Zero Security Vulnerabilities in Production

Security is not optional. Every feature must be validated for security vulnerabilities before deployment.

## Core Principle

**Test security concerns as rigorously as functional requirements.**

```
Security Issue Found in Production = Process Failure
Security Issue Found in Tests = Process Success
```

## Security Testing Categories

### 1. Input Validation Tests

Validate all user inputs are properly sanitized and validated.

#### What to Test

```typescript
suite('Security: Input Validation', () => {
  test('Rejects path traversal attempts', () => {
    const maliciousPaths = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32',
      '/etc/shadow',
      'C:\\Windows\\System32\\config\\SAM',
      '....//....//....//etc/passwd',
      '..%2F..%2F..%2Fetc%2Fpasswd'
    ];

    maliciousPaths.forEach(path => {
      assert.throws(
        () => importArchive(path),
        /Invalid path/,
        `Should reject path traversal: ${path}`
      );
    });
  });

  test('Sanitizes filenames to prevent injection', () => {
    const dangerous = [
      'file<script>alert("xss")</script>.zip',
      'file";rm -rf /;".zip',
      'file`whoami`.zip',
      'file$(whoami).zip',
      'file|whoami.zip',
      'file&whoami.zip',
      'file\x00.zip',
      'file\n.zip'
    ];

    dangerous.forEach(filename => {
      const safe = sanitizeFilename(filename);
      
      // Should not contain dangerous characters
      assert.ok(!safe.includes('<'), 'Should remove HTML tags');
      assert.ok(!safe.includes('>'), 'Should remove HTML tags');
      assert.ok(!safe.includes('`'), 'Should remove backticks');
      assert.ok(!safe.includes('$'), 'Should remove command substitution');
      assert.ok(!safe.includes('|'), 'Should remove pipes');
      assert.ok(!safe.includes('&'), 'Should remove shell operators');
      assert.ok(!safe.includes('\x00'), 'Should remove null bytes');
      assert.ok(!safe.includes('\n'), 'Should remove newlines');
    });
  });

  test('Validates file extensions against whitelist', () => {
    const validExtensions = ['.zip', '.tar', '.gz', '.tgz', '.log'];
    const invalidFiles = [
      'malware.exe',
      'script.bat',
      'hack.sh',
      'virus.com',
      'trojan.scr'
    ];

    invalidFiles.forEach(file => {
      assert.throws(
        () => validateFileExtension(file),
        /Invalid file type/,
        `Should reject: ${file}`
      );
    });
  });

  test('Limits file size to prevent DoS', () => {
    const MAX_SIZE = 100 * 1024 * 1024; // 100MB
    const hugeFile = { size: 500 * 1024 * 1024 }; // 500MB

    assert.throws(
      () => validateFileSize(hugeFile.size),
      /File too large/,
      'Should reject files over size limit'
    );
  });

  test('Validates archive structure before extraction', () => {
    // Zip bomb detection
    const suspiciousArchive = {
      compressedSize: 1024,
      uncompressedSize: 10 * 1024 * 1024 * 1024 // 10GB
    };

    const ratio = suspiciousArchive.uncompressedSize / suspiciousArchive.compressedSize;
    
    assert.ok(
      ratio > 1000,
      'Should detect high compression ratio (potential zip bomb)'
    );
  });
});
```

### 2. Authentication & Authorization Tests

Ensure proper access controls are enforced.

```typescript
suite('Security: Access Control', () => {
  test('Does not expose sensitive paths in error messages', () => {
    try {
      loadConfig('nonexistent.json');
      assert.fail('Should throw error');
    } catch (error) {
      const message = error.message.toLowerCase();
      
      // Should not reveal system paths
      assert.ok(!message.includes('c:\\users\\'), 'Should not expose Windows paths');
      assert.ok(!message.includes('/home/'), 'Should not expose Unix paths');
      assert.ok(!message.includes('appdata'), 'Should not expose AppData paths');
    }
  });

  test('Validates workspace trust before file operations', () => {
    const untrustedWorkspace = { isTrusted: false };
    
    assert.throws(
      () => executeCommand(untrustedWorkspace, 'import'),
      /Workspace not trusted/,
      'Should require trusted workspace'
    );
  });

  test('Restricts file access to workspace directory', () => {
    const workspace = '/path/to/workspace';
    const attemptedPath = '/etc/passwd';

    const resolved = path.resolve(workspace, attemptedPath);
    const isWithinWorkspace = resolved.startsWith(path.resolve(workspace));

    assert.ok(
      !isWithinWorkspace,
      'Should detect access outside workspace'
    );
  });
});
```

### 3. Data Protection Tests

Ensure sensitive data is properly handled.

```typescript
suite('Security: Data Protection', () => {
  test('Does not log API keys or tokens', () => {
    const sensitiveConfig = {
      apiKey: 'secret-key-12345',
      token: 'bearer-token-67890',
      password: 'super-secret'
    };

    const logSpy = new LogCapture();
    logger.info('Loading config', sensitiveConfig);

    const allLogs = logSpy.getAllLogs().join(' ');
    
    assert.ok(!allLogs.includes('secret-key-12345'), 'Should not log API key');
    assert.ok(!allLogs.includes('bearer-token-67890'), 'Should not log token');
    assert.ok(!allLogs.includes('super-secret'), 'Should not log password');
    
    // Should have redacted placeholders
    assert.ok(allLogs.includes('***'), 'Should show redacted placeholder');
  });

  test('Sanitizes data before display in UI', () => {
    const maliciousData = {
      filename: '<script>alert("xss")</script>',
      content: '<img src=x onerror=alert("xss")>'
    };

    const displayed = renderToUI(maliciousData);
    
    assert.ok(!displayed.includes('<script>'), 'Should escape script tags');
    assert.ok(!displayed.includes('onerror='), 'Should escape event handlers');
    assert.ok(displayed.includes('&lt;'), 'Should HTML-encode dangerous chars');
  });

  test('Clears sensitive data from memory after use', () => {
    const credentials = { password: 'secret123' };
    
    processCredentials(credentials);
    
    // After processing, credentials should be cleared
    assert.strictEqual(credentials.password, null, 'Should clear password');
  });

  test('Does not store sensitive data in plaintext', () => {
    const config = {
      apiKey: 'my-secret-key'
    };

    saveConfig(config);
    
    const savedContent = fs.readFileSync(configPath, 'utf8');
    assert.ok(!savedContent.includes('my-secret-key'), 'Should encrypt API key');
    assert.ok(savedContent.includes('encrypted:'), 'Should mark as encrypted');
  });
});
```

### 4. Injection Prevention Tests

Protect against various injection attacks.

```typescript
suite('Security: Injection Prevention', () => {
  test('Prevents command injection in shell operations', () => {
    const maliciousInput = 'file.zip; rm -rf /';
    
    // Should not execute shell commands
    assert.throws(
      () => extractArchive(maliciousInput),
      /Invalid characters/,
      'Should reject shell metacharacters'
    );
  });

  test('Prevents SQL injection (if using database)', () => {
    const maliciousQuery = "'; DROP TABLE users; --";
    
    // Should use parameterized queries
    const result = searchLogs(maliciousQuery);
    
    // Query should be treated as literal string, not executed
    assert.ok(result !== undefined, 'Should not crash');
  });

  test('Prevents XSS in webview content', () => {
    const maliciousHTML = '<script>alert("xss")</script>';
    
    const webviewContent = generateWebviewContent({
      title: maliciousHTML
    });

    // Should escape HTML
    assert.ok(!webviewContent.includes('<script>'), 'Should escape script tags');
    assert.ok(webviewContent.includes('&lt;script&gt;'), 'Should HTML-encode');
  });

  test('Prevents prototype pollution', () => {
    const maliciousPayload = {
      '__proto__': { polluted: true }
    };

    const result = deepMerge({}, maliciousPayload);
    
    // Should not pollute prototype
    assert.strictEqual(
      {}.polluted,
      undefined,
      'Should not pollute Object prototype'
    );
  });
});
```

### 5. Dependency Security Tests

Ensure third-party dependencies are secure.

```typescript
suite('Security: Dependencies', () => {
  test('No known vulnerable dependencies', async () => {
    const auditResult = execSync('npm audit --json', { encoding: 'utf8' });
    const audit = JSON.parse(auditResult);

    const criticalVulns = audit.metadata.vulnerabilities.critical || 0;
    const highVulns = audit.metadata.vulnerabilities.high || 0;

    assert.strictEqual(
      criticalVulns,
      0,
      `Found ${criticalVulns} critical vulnerabilities`
    );
    
    assert.strictEqual(
      highVulns,
      0,
      `Found ${highVulns} high vulnerabilities`
    );
  });

  test('Dependencies are up-to-date', () => {
    const outdated = execSync('npm outdated --json', { encoding: 'utf8' });
    
    if (outdated) {
      const packages = JSON.parse(outdated);
      const criticalPackages = ['axios', 'vscode-languageclient'];
      
      criticalPackages.forEach(pkg => {
        assert.ok(
          !packages[pkg],
          `Critical package ${pkg} is outdated`
        );
      });
    }
  });

  test('No dependencies with known security advisories', async () => {
    const retire = execSync('retire --path src --outputformat json', { 
      encoding: 'utf8' 
    });
    
    const results = JSON.parse(retire);
    const vulnerabilities = results.filter(r => r.results && r.results.length > 0);
    
    assert.strictEqual(
      vulnerabilities.length,
      0,
      'Found vulnerable dependencies via retire.js'
    );
  });
});
```

## Security Testing Checklist

Before marking any feature complete, verify:

### Input Handling
- [ ] All file paths validated against traversal
- [ ] All filenames sanitized
- [ ] File extensions whitelisted
- [ ] File sizes limited
- [ ] Archive structures validated
- [ ] User inputs escaped/encoded

### Authentication & Authorization
- [ ] Workspace trust verified
- [ ] File access restricted to workspace
- [ ] No sensitive paths in errors
- [ ] Proper access controls enforced

### Data Protection
- [ ] No secrets in logs
- [ ] No secrets in error messages
- [ ] Sensitive data encrypted at rest
- [ ] Sensitive data cleared from memory
- [ ] UI displays sanitized data

### Injection Prevention
- [ ] No command injection possible
- [ ] No SQL injection possible (if applicable)
- [ ] No XSS in webviews
- [ ] No prototype pollution
- [ ] All user input treated as untrusted

### Dependencies
- [ ] No critical/high vulnerabilities in npm audit
- [ ] No vulnerable dependencies in retire.js
- [ ] Dependencies reasonably up-to-date
- [ ] License compliance verified

## Security Testing Workflow

### During Development

```bash
# Before every commit
npm run security:test

# Weekly security scan
npm run security:check-all

# Monthly comprehensive audit
npm run security:report
```

### In CI/CD

```yaml
security-check:
  runs-on: windows-latest
  steps:
    - name: Security audit
      run: npm run security:audit
      
    - name: Dependency scan
      run: npm run security:scan
      
    - name: Security tests
      run: npm run security:test
      
    - name: Fail on vulnerabilities
      run: |
        if npm audit --audit-level=high; then
          echo "No high/critical vulnerabilities"
        else
          echo "Security vulnerabilities found!"
          exit 1
        fi
```

## Common Security Vulnerabilities to Test

### 1. Path Traversal
```typescript
// BAD
const filePath = path.join(baseDir, userInput);

// GOOD
const filePath = path.join(baseDir, path.basename(userInput));
if (!filePath.startsWith(path.resolve(baseDir))) {
  throw new Error('Invalid path');
}
```

### 2. Command Injection
```typescript
// BAD
exec(`unzip ${userFilename}`);

// GOOD
execFile('unzip', [userFilename]);
```

### 3. XSS in Webview
```typescript
// BAD
webview.html = `<div>${userInput}</div>`;

// GOOD
webview.html = `<div>${escapeHtml(userInput)}</div>`;
```

### 4. Unvalidated File Operations
```typescript
// BAD
fs.readFileSync(userPath);

// GOOD
if (isWithinWorkspace(userPath) && isAllowedExtension(userPath)) {
  fs.readFileSync(userPath);
}
```

## Security Test Data

Create these fixtures in `src/test/fixtures/security/`:

```
security/
├── malicious-paths.json          # Path traversal attempts
├── malicious-filenames.json      # Injection attempts
├── zip-bomb.zip                  # Compression bomb
├── symlink-attack.zip            # Symlink vulnerability
├── large-file.dat                # DoS via large file
└── xss-payloads.json             # XSS test cases
```

## Security Metrics

Track these monthly:

- **Vulnerabilities Found in Tests**: Should increase (better detection)
- **Vulnerabilities in Production**: Should be 0
- **Time to Fix**: Target < 24 hours for critical
- **Security Test Coverage**: Target > 80%
- **Dependency Vulnerabilities**: Target 0 high/critical

## Automated Security Scanning

### npm audit
```bash
npm audit --audit-level=moderate
```

### retire.js
```bash
retire --path src --outputformat json
```

### Custom Security Tests
```bash
npm run test:security
```

## Security Incident Response

If a security issue is found:

1. **RED**: Write test that reproduces vulnerability
2. **FIX**: Implement security fix
3. **GREEN**: Verify test passes
4. **DEPLOY**: Emergency deploy if critical
5. **DOCUMENT**: Add to security test suite permanently
6. **REVIEW**: Audit similar code patterns

## Security Review Checklist

Before every PR:

- [ ] Security tests written for new code
- [ ] All security tests passing
- [ ] npm audit shows no new vulnerabilities
- [ ] No secrets committed to repo
- [ ] Security implications documented
- [ ] Peer reviewed by security-conscious developer

## Resources

### Tools
- **npm audit**: Built-in vulnerability scanner
- **retire.js**: JavaScript library vulnerability scanner
- **eslint-plugin-security**: Security linting rules
- **snyk**: Continuous security monitoring (optional)

### References
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- VS Code Security: https://code.visualstudio.com/api/extension-guides/webview#security
- Node.js Security: https://nodejs.org/en/docs/guides/security/

## Success Criteria

You know security testing is effective when:

- ✅ No security issues reach production
- ✅ Security tests catch vulnerabilities before code review
- ✅ npm audit always shows 0 high/critical vulnerabilities
- ✅ Security is discussed in every design review
- ✅ Team thinks "what could go wrong?" for every feature

## Remember

**Security is not a feature. It's a requirement.**

Test security concerns with the same rigor as functional requirements. A security vulnerability in production is a process failure, not a code failure.

**When in doubt, fail secure.**

---

## AI Assistant Guidelines

### For AI Assistants Reading This Document

When implementing security-sensitive features:

#### 1. Read Logs First
```bash
# If security tests fail, read the log
"I see npm run test:security failed. Let me check logs/test-security.log..."
```

Always base your fixes on actual error messages, not assumptions.

#### 2. Use Templates from This Document
```
"I'll create security tests using the template from SECURITY_TESTING.md section 1..."
```

Copy the test templates from this document. Don't invent your own structure.

#### 3. Implement All Security Categories
When adding security-sensitive code, ensure you cover:
- [ ] Input validation tests
- [ ] Authentication/authorization tests  
- [ ] Data protection tests
- [ ] Injection prevention tests
- [ ] Dependency security checks

Don't skip categories. Ask human if unsure which apply.

#### 4. Run Security Checks Automatically
```bash
# After implementing security tests
npm run test:security
npm run security:check-all

# Check logs if failures
type logs\test-security.log
type logs\security-check-all.log
```

#### 5. Update This Document
If you discover a new security test category or vulnerability pattern:
```
"I found a security gap not covered in SECURITY_TESTING.md.
Should I add a new test category for [attack type]?"
```

Propose updates to keep this document current.

#### 6. Example Response Template

```markdown
## Security Implementation for [Feature]

### Tests Created
1. Input validation: `test/suite/security.test.ts` lines 42-65
2. Injection prevention: `test/suite/security.test.ts` lines 66-89

### Categories Covered
- ✅ Input validation
- ✅ Injection prevention
- ✅ Data protection
- ⚠️ Authentication not applicable (no auth in this feature)

### Test Results
```bash
npm run test:security
# Output saved to logs/test-security.log
✅ All 5 security tests passing
```

### Security Checklist
- [x] Path traversal tests
- [x] XSS prevention tests
- [x] Command injection tests
- [x] No secrets in logs
- [x] All inputs validated

### Ready for Review
All security tests passing. Human QA can verify:
1. Run: npm run security:check-all
2. Check: logs/security-check-all.log
3. Verify: No vulnerabilities reported
```

#### 7. When in Doubt
```
"I'm implementing [feature] which handles user input.
Should I add prototype pollution tests per SECURITY_TESTING.md section 4.4?"
```

Ask the human before skipping security tests. Better safe than sorry.

#### 8. Common Mistakes to Avoid
- ❌ "This is a simple feature, no security tests needed"
- ❌ "I'll add security tests later"
- ❌ "Manual testing is enough"
- ❌ Guessing what's wrong without reading logs

#### 9. Always Check Logs
```
Human: "Security tests failed"
AI: "Let me check logs/test-security.log..."
[Reads actual error]
AI: "The error shows: 'XSS test failed at line 42 - script tag not escaped'.
     I need to update the sanitization function to escape HTML entities."
```

Don't guess. Read the log. Fix the actual problem.

#### 10. Efficiency Tips
- Use test templates from this document (don't reinvent)
- Run `npm run security:test` frequently during development
- Check `logs/test-security.log` immediately when tests fail
- Keep security tests fast (<100ms per test when possible)
- Group related security tests in same file

### Remember
**Security vulnerabilities in production = Process Failure**

Your job is to catch security issues in tests, not in production.

**When implementing security features:**
1. Read this document first
2. Use the templates provided
3. Run tests frequently
4. Check logs when failures occur
5. Update this document if you find gaps

**Make security testing as automatic and efficient as possible for humans.**