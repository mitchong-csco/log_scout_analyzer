# Test Data Management Strategy 📊

## Mission: Realistic, Maintainable, Versioned Test Data

Test data should be realistic, easy to maintain, and version-controlled.

## Core Principle

**Garbage in, garbage out. Realistic test data finds realistic bugs.**

```
Poor Test Data = False Confidence
Realistic Test Data = Real Quality
```

## Why Test Data Management Matters

### Problems with Ad-Hoc Test Data

❌ Hardcoded strings in tests (unmaintainable)
❌ Generated data that's unrealistic (misses real bugs)
❌ Outdated test files (tests pass but code fails on real data)
❌ No shared fixtures (duplication everywhere)
❌ Large binary files in git (repo bloat)

### Benefits of Proper Management

✅ Realistic data finds realistic bugs
✅ Shared fixtures reduce duplication
✅ Easy to update across all tests
✅ Version-controlled and reviewable
✅ Documentation through examples

## Test Data Organization

### Directory Structure

```
vscode-extension/src/test/fixtures/
├── README.md                          # Documentation
├── archives/
│   ├── small-valid.zip               # < 100KB
│   ├── medium-valid.zip              # 1-10MB
│   ├── large-valid.zip               # > 10MB
│   ├── corrupted.zip                 # Intentionally broken
│   ├── empty.zip                     # Edge case
│   ├── zip-bomb.zip                  # Security test
│   ├── symlink-attack.zip            # Security test
│   └── nested-archives.zip           # Edge case
├── logs/
│   ├── typical-session.log           # Normal operation
│   ├── error-heavy.log               # Many errors
│   ├── unicode-heavy.log             # International chars
│   ├── large-file.log                # Performance test
│   ├── multiline-entries.log         # Stack traces
│   ├── json-formatted.log            # Structured logs
│   ├── mixed-formats.log             # Multiple formats
│   └── empty.log                     # Edge case
├── configs/
│   ├── minimal.json                  # Bare minimum
│   ├── full-featured.json            # All options
│   ├── legacy-v1.json                # Old format
│   ├── legacy-v2.json                # Migration test
│   ├── invalid-syntax.json           # Error handling
│   └── default.json                  # Baseline
├── security/
│   ├── malicious-paths.json          # Path traversal attempts
│   ├── malicious-filenames.json      # Injection attempts
│   ├── xss-payloads.json             # XSS test cases
│   └── sql-injection.json            # SQL injection tests
├── performance/
│   ├── small-log.log                 # 100KB, 1000 lines
│   ├── medium-log.log                # 1MB, 10,000 lines
│   ├── large-log.log                 # 10MB, 100,000 lines
│   └── huge-log.log                  # 50MB, 500,000 lines
└── bundles/
    ├── simple-bundle.json            # Basic bundle
    ├── complex-bundle.json           # Many files
    └── versioned-bundle-v1.json      # Compatibility test
```

## Fixture Categories

### 1. Golden Files (Expected Outputs)

Store expected outputs for comparison.

```typescript
suite('Test Data: Golden Files', () => {
  test('Parse output matches golden file', () => {
    const input = loadFixture('logs/typical-session.log');
    const expected = loadFixture('golden/typical-session-parsed.json');
    
    const result = parseLog(input);
    
    assert.deepStrictEqual(
      result,
      JSON.parse(expected),
      'Output should match golden file'
    );
  });
  
  test('Update golden file when needed', () => {
    const input = loadFixture('logs/typical-session.log');
    const result = parseLog(input);
    
    // To update: npm run test:update-golden
    if (process.env.UPDATE_GOLDEN) {
      saveFixture('golden/typical-session-parsed.json', JSON.stringify(result, null, 2));
    } else {
      const expected = loadFixture('golden/typical-session-parsed.json');
      assert.deepStrictEqual(result, JSON.parse(expected));
    }
  });
});
```

### 2. Synthetic Fixtures (Generated)

Generate test data programmatically.

```typescript
class FixtureBuilder {
  static createLogFile(options: {
    lines: number;
    size?: string;
    errorRate?: number;
    format?: 'plain' | 'json';
  }): string {
    const lines = [];
    const errorRate = options.errorRate || 0.1;
    
    for (let i = 0; i < options.lines; i++) {
      const timestamp = new Date(Date.now() - i * 1000).toISOString();
      const level = Math.random() < errorRate ? 'ERROR' : 'INFO';
      const message = this.generateMessage(level);
      
      if (options.format === 'json') {
        lines.push(JSON.stringify({ timestamp, level, message }));
      } else {
        lines.push(`${timestamp} [${level}] ${message}`);
      }
    }
    
    return lines.join('\n');
  }
  
  static createArchive(options: {
    files: number;
    size?: 'small' | 'medium' | 'large';
    corrupt?: boolean;
  }): Buffer {
    const zip = new JSZip();
    
    for (let i = 0; i < options.files; i++) {
      const content = this.createLogFile({ lines: 100 });
      zip.file(`log-${i}.log`, content);
    }
    
    if (options.corrupt) {
      return this.corruptZip(zip.generateNodeStream());
    }
    
    return zip.generateAsync({ type: 'nodebuffer' });
  }
  
  static createBundle(options: {
    id?: string;
    files?: number;
    version?: number;
  }): Bundle {
    return {
      id: options.id || `bundle-${Date.now()}`,
      name: `Test Bundle`,
      version: options.version || 1,
      createdAt: new Date().toISOString(),
      files: Array.from({ length: options.files || 3 }, (_, i) => ({
        path: `log-${i}.log`,
        size: 1024 * (i + 1),
        type: 'log'
      })),
      metadata: {
        source: 'test',
        tags: ['test']
      }
    };
  }
  
  private static generateMessage(level: string): string {
    const messages = {
      ERROR: [
        'Failed to connect to database',
        'Null pointer exception',
        'Timeout waiting for response',
        'Unable to read file'
      ],
      INFO: [
        'Application started',
        'Request processed successfully',
        'Configuration loaded',
        'Connection established'
      ]
    };
    
    const pool = messages[level] || messages.INFO;
    return pool[Math.floor(Math.random() * pool.length)];
  }
}

// Usage in tests
suite('Using Generated Fixtures', () => {
  test('Parse generated log file', () => {
    const log = FixtureBuilder.createLogFile({
      lines: 1000,
      errorRate: 0.1
    });
    
    const result = parseLog(log);
    
    assert.strictEqual(result.entries.length, 1000);
    assert.ok(result.entries.filter(e => e.level === 'ERROR').length > 50);
  });
  
  test('Import generated archive', async () => {
    const archive = await FixtureBuilder.createArchive({
      files: 10,
      size: 'small'
    });
    
    const result = await importArchive(archive);
    
    assert.strictEqual(result.files.length, 10);
  });
});
```

### 3. Real-World Samples (Anonymized)

Capture real data for testing (with sensitive info removed).

```typescript
/**
 * Anonymize real log files for testing
 */
function anonymizeLog(content: string): string {
  return content
    // Remove IP addresses
    .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '192.168.1.1')
    // Remove email addresses
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, 'user@example.com')
    // Remove API keys
    .replace(/\b[A-Za-z0-9]{32,}\b/g, 'REDACTED_API_KEY')
    // Remove file paths
    .replace(/[A-Z]:\\[\w\s\-\\\.]+/g, 'C:\\path\\to\\file')
    .replace(/\/[\w\s\-\/\.]+/g, '/path/to/file')
    // Remove usernames
    .replace(/user[=:][\w]+/gi, 'user=anonymous');
}

// Script to create fixtures from production logs
if (require.main === module) {
  const realLog = fs.readFileSync('production.log', 'utf8');
  const anonymized = anonymizeLog(realLog);
  fs.writeFileSync('src/test/fixtures/logs/real-world-sample.log', anonymized);
  console.log('✅ Created anonymized fixture');
}
```

### 4. Boundary Value Fixtures

Test edge cases and boundaries.

```typescript
class BoundaryFixtures {
  static createEdgeCases() {
    return {
      empty: {
        log: '',
        archive: Buffer.from([]),
        config: '{}'
      },
      
      minimal: {
        log: 'Single line',
        config: '{"version":1}'
      },
      
      maxSize: {
        log: FixtureBuilder.createLogFile({ 
          lines: 1000000 // 1M lines
        })
      },
      
      specialChars: {
        log: 'Line with null\x00byte\nLine with emoji 🚀\nLine with unicode: 日本語',
        filename: 'file<>:|?.log'
      },
      
      boundary: {
        tinyFile: Buffer.alloc(1), // 1 byte
        smallFile: Buffer.alloc(1024), // 1 KB
        mediumFile: Buffer.alloc(1024 * 1024), // 1 MB
        largeFile: Buffer.alloc(10 * 1024 * 1024), // 10 MB
        hugeFile: Buffer.alloc(100 * 1024 * 1024) // 100 MB
      }
    };
  }
}

suite('Test Data: Boundary Cases', () => {
  const edges = BoundaryFixtures.createEdgeCases();
  
  test('Handle empty log file', () => {
    const result = parseLog(edges.empty.log);
    assert.strictEqual(result.entries.length, 0);
  });
  
  test('Handle special characters', () => {
    const result = parseLog(edges.specialChars.log);
    assert.ok(result.entries.length > 0);
  });
  
  test('Handle maximum file size', () => {
    const result = parseLog(edges.maxSize.log);
    assert.ok(result.entries.length > 0);
  });
});
```

## Fixture Management

### Loading Fixtures

```typescript
// Utility functions
function loadFixture(relativePath: string): string {
  const fixturePath = path.join(__dirname, 'fixtures', relativePath);
  return fs.readFileSync(fixturePath, 'utf8');
}

function loadBinaryFixture(relativePath: string): Buffer {
  const fixturePath = path.join(__dirname, 'fixtures', relativePath);
  return fs.readFileSync(fixturePath);
}

function loadJsonFixture<T>(relativePath: string): T {
  const content = loadFixture(relativePath);
  return JSON.parse(content);
}

// Usage
suite('Using Fixtures', () => {
  test('Load text fixture', () => {
    const log = loadFixture('logs/typical-session.log');
    assert.ok(log.length > 0);
  });
  
  test('Load binary fixture', () => {
    const archive = loadBinaryFixture('archives/small-valid.zip');
    assert.ok(archive.length > 0);
  });
  
  test('Load JSON fixture', () => {
    const config = loadJsonFixture<Configuration>('configs/minimal.json');
    assert.ok(config.version);
  });
});
```

### Fixture Validation

```bash
# Run fixture validation
npm run test:validate-fixtures
```

```typescript
// scripts/validate-fixtures.js validates:
// - File sizes match expectations
// - JSON files are valid
// - Archives can be extracted
// - No sensitive data in fixtures
// - All referenced fixtures exist
```

### Fixture Generation

```bash
# Generate all fixtures
npm run test:generate-fixtures

# Generate specific category
npm run test:generate-fixtures -- --category=performance
```

```javascript
// scripts/generate-fixtures.js
const categories = {
  performance: generatePerformanceFixtures,
  security: generateSecurityFixtures,
  logs: generateLogFixtures,
  archives: generateArchiveFixtures
};

function generatePerformanceFixtures() {
  const sizes = [
    { name: 'small', lines: 1000 },
    { name: 'medium', lines: 10000 },
    { name: 'large', lines: 100000 },
    { name: 'huge', lines: 500000 }
  ];
  
  sizes.forEach(({ name, lines }) => {
    const content = FixtureBuilder.createLogFile({ lines });
    const path = `src/test/fixtures/performance/${name}-log.log`;
    fs.writeFileSync(path, content);
    console.log(`✅ Generated ${path} (${lines} lines)`);
  });
}
```

## Fixture Versioning

### Track Fixture Changes

```
fixtures/
├── .fixture-versions.json
└── logs/
    └── typical-session.log
```

```json
// .fixture-versions.json
{
  "logs/typical-session.log": {
    "version": 2,
    "created": "2024-01-01",
    "updated": "2024-02-15",
    "hash": "abc123def456",
    "description": "Updated to include more error examples"
  }
}
```

### Fixture Changelog

Keep track of why fixtures changed:

```markdown
# Fixture Changelog

## 2024-02-15
- **logs/typical-session.log**: Added multiline stack traces (v2)
- **archives/corrupted.zip**: Made more realistic corruption (v2)

## 2024-01-01
- Initial fixtures created
```

## Test Data Anti-Patterns

### ❌ Avoid These

#### 1. Hardcoded Test Data in Tests

```typescript
// BAD: Hardcoded in test
test('Parse log', () => {
  const log = `2024-01-01 ERROR Something failed
2024-01-01 INFO Started`;
  // ...
});

// GOOD: Use fixture
test('Parse log', () => {
  const log = loadFixture('logs/typical-session.log');
  // ...
});
```

#### 2. Unrealistic Test Data

```typescript
// BAD: Unrealistic
const log = "ERROR\nERROR\nERROR";

// GOOD: Realistic
const log = loadFixture('logs/error-heavy.log');
// Contains realistic timestamps, formats, messages
```

#### 3. Large Files in Git

```typescript
// BAD: 100MB file committed
fixtures/huge-file.log (100MB)

// GOOD: Generate large files
test('Handle large file', () => {
  const hugeLog = FixtureBuilder.createLogFile({ 
    lines: 500000 
  });
  // ...
});
```

#### 4. Sensitive Data in Fixtures

```typescript
// BAD: Real credentials
fixtures/config.json: { "apiKey": "sk-real-key-12345" }

// GOOD: Anonymized
fixtures/config.json: { "apiKey": "sk-test-key-xxxxx" }
```

## Fixture Documentation

Every fixture should be documented:

```markdown
# Test Fixtures Documentation

## logs/typical-session.log

**Purpose**: Test normal log parsing with common patterns

**Characteristics**:
- 1000 lines
- 10% error rate
- Contains timestamps, levels, messages
- Includes multiline stack traces
- Mixed log formats (plain text and JSON)

**Use Cases**:
- Parsing tests
- Pattern matching tests
- UI rendering tests

**Last Updated**: 2024-02-15 (v2)

**Sample**:
```
2024-01-01T12:00:00Z [INFO] Application started
2024-01-01T12:00:01Z [ERROR] Failed to connect
  at Connection.connect (connection.js:42)
  at Server.start (server.js:15)
```

## archives/small-valid.zip

**Purpose**: Test basic archive import functionality

**Characteristics**:
- Size: 50KB
- Contains: 5 log files
- All files are valid
- No compression issues

**Use Cases**:
- Import tests
- Extraction tests
- Basic functionality validation

**Last Updated**: 2024-01-01 (v1)
```

## Snapshot Testing

Use snapshots for complex output validation:

```typescript
suite('Test Data: Snapshots', () => {
  test('Parse output matches snapshot', () => {
    const input = loadFixture('logs/typical-session.log');
    const result = parseLog(input);
    
    // Compare against snapshot
    expect(result).toMatchSnapshot();
  });
  
  test('Update snapshots when needed', () => {
    // npm run test -- --updateSnapshot
  });
});
```

## Dynamic Test Data

For tests that need fresh data:

```typescript
suite('Test Data: Dynamic', () => {
  test('Handle current timestamp', () => {
    const log = FixtureBuilder.createLogFile({
      lines: 100,
      timestamp: () => new Date().toISOString() // Fresh timestamp
    });
    
    const result = parseLog(log);
    
    // Verify timestamps are recent
    const latest = new Date(result.entries[0].timestamp);
    const ageMinutes = (Date.now() - latest.getTime()) / 1000 / 60;
    assert.ok(ageMinutes < 1, 'Timestamps should be recent');
  });
  
  test('Handle random variations', () => {
    // Run test multiple times with different data
    for (let i = 0; i < 10; i++) {
      const log = FixtureBuilder.createLogFile({
        lines: Math.floor(Math.random() * 1000) + 100,
        errorRate: Math.random() * 0.5
      });
      
      const result = parseLog(log);
      assert.ok(result.entries.length > 0);
    }
  });
});
```

## Fixture Lifecycle

### Creation
1. Identify need for test data
2. Create fixture (real, synthetic, or generated)
3. Anonymize if from production
4. Document purpose and characteristics
5. Add to version control

### Maintenance
1. Update fixtures when features change
2. Keep fixtures realistic
3. Remove obsolete fixtures
4. Document changes in changelog

### Validation
```bash
# Regularly validate fixtures
npm run test:validate-fixtures

# Check for unused fixtures
npm run test:find-unused-fixtures

# Check for missing fixtures
npm run test:find-missing-fixtures
```

## Fixture Storage

### Small Fixtures (< 1MB)
- ✅ Store in git
- ✅ Version controlled
- ✅ Easy to review

### Large Fixtures (> 1MB)
- ⚠️ Generate dynamically
- ⚠️ Or use Git LFS
- ⚠️ Or download from external source

```javascript
// Download large fixtures if not present
before(async function() {
  if (!fs.existsSync('fixtures/huge-log.log')) {
    this.timeout(60000); // 1 minute
    console.log('Downloading large fixture...');
    await downloadFixture('huge-log.log', FIXTURE_URL);
  }
});
```

## npm Scripts for Fixture Management

```json
{
  "scripts": {
    "test:generate-fixtures": "node scripts/generate-fixtures.js",
    "test:validate-fixtures": "node scripts/validate-fixtures.js",
    "test:update-golden": "UPDATE_GOLDEN=true npm test",
    "test:find-unused-fixtures": "node scripts/find-unused-fixtures.js",
    "test:clean-fixtures": "node scripts/clean-fixtures.js",
    "test:anonymize-fixtures": "node scripts/anonymize-fixtures.js"
  }
}
```

## Success Criteria

You know test data management is effective when:

- ✅ Tests use realistic data
- ✅ Fixtures are easy to understand
- ✅ Fixtures are well-documented
- ✅ No sensitive data in fixtures
- ✅ Fixtures are reusable across tests
- ✅ Easy to add new fixtures
- ✅ Fixtures stay up-to-date with features

## Best Practices Summary

### DO ✅
- Use fixtures for shared test data
- Generate large files dynamically
- Anonymize real-world data
- Document fixture purpose
- Version control small fixtures
- Validate fixtures regularly

### DON'T ❌
- Hardcode test data in tests
- Commit large binary files
- Use unrealistic test data
- Include sensitive information
- Leave fixtures undocumented
- Keep obsolete fixtures

## Remember

**Realistic test data finds realistic bugs.**

Invest in good test data. It pays dividends in quality and confidence.

**Fixtures are part of your codebase.**

Treat them with the same care as production code. Document them, version them, maintain them.

**When in doubt, generate it.**

Don't bloat your repo with large files. Generate dynamic test data when possible.