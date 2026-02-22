# Contract Testing Strategy 🤝

## Mission: Ensure API Contracts Are Never Broken

Contract testing ensures that interfaces between components remain stable and backward-compatible.

## Core Principle

**Test the contract, not the implementation.**

```
Breaking Change in Production = Process Failure
Breaking Change in Tests = Process Success
```

## What Are Contract Tests?

Contract tests verify:
- **API Signatures**: Method names, parameters, return types
- **Data Formats**: JSON schemas, message structures
- **Protocol Compliance**: LSP protocol, VS Code extension API
- **Backward Compatibility**: Old clients work with new servers

Unlike integration tests, contract tests:
- ✅ Don't require both systems running
- ✅ Run fast (no network calls)
- ✅ Catch breaking changes early
- ✅ Document expected behavior

## Contract Testing Categories

### 1. LSP Protocol Contract Tests

Ensure LSP server adheres to Language Server Protocol specification.

```typescript
suite('Contract: LSP Protocol', () => {
  test('Initialize request follows protocol', () => {
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        processId: 12345,
        rootUri: 'file:///workspace',
        capabilities: {}
      }
    };

    // Schema validation
    assert.ok(request.jsonrpc, 'Must have jsonrpc version');
    assert.strictEqual(request.jsonrpc, '2.0', 'Must be JSON-RPC 2.0');
    assert.ok(request.id !== undefined, 'Must have request id');
    assert.strictEqual(request.method, 'initialize', 'Must specify method');
    assert.ok(request.params, 'Must have params');
    assert.ok(request.params.capabilities, 'Must include capabilities');
  });

  test('Initialize response follows protocol', () => {
    const response = {
      jsonrpc: '2.0',
      id: 1,
      result: {
        capabilities: {
          textDocumentSync: 1,
          diagnosticProvider: true,
          hoverProvider: true,
          completionProvider: {
            triggerCharacters: ['.', ':']
          }
        },
        serverInfo: {
          name: 'log-scout-lsp',
          version: '1.0.0'
        }
      }
    };

    // Response structure validation
    assert.ok(response.result, 'Must have result');
    assert.ok(response.result.capabilities, 'Must declare capabilities');
    assert.ok(response.result.serverInfo, 'Must include server info');
    assert.ok(response.result.serverInfo.name, 'Must have server name');
    assert.ok(response.result.serverInfo.version, 'Must have version');
  });

  test('Error responses follow protocol', () => {
    const errorResponse = {
      jsonrpc: '2.0',
      id: 1,
      error: {
        code: -32600,
        message: 'Invalid Request',
        data: { reason: 'Missing method' }
      }
    };

    // Error structure validation
    assert.ok(errorResponse.error, 'Must have error object');
    assert.ok(typeof errorResponse.error.code === 'number', 'Error code must be number');
    assert.ok(errorResponse.error.message, 'Must have error message');
    
    // Protocol error codes
    const validCodes = [-32700, -32600, -32601, -32602, -32603];
    const isStandardCode = validCodes.includes(errorResponse.error.code) || 
                          (errorResponse.error.code >= -32099 && errorResponse.error.code <= -32000);
    
    assert.ok(isStandardCode, 'Error code must follow protocol');
  });

  test('TextDocument/didOpen notification follows protocol', () => {
    const notification = {
      jsonrpc: '2.0',
      method: 'textDocument/didOpen',
      params: {
        textDocument: {
          uri: 'file:///test.log',
          languageId: 'log',
          version: 1,
          text: 'Log content here'
        }
      }
    };

    // Notification structure (no id field)
    assert.strictEqual(notification.id, undefined, 'Notifications must not have id');
    assert.ok(notification.method, 'Must have method');
    assert.ok(notification.params, 'Must have params');
    assert.ok(notification.params.textDocument, 'Must have textDocument');
    assert.ok(notification.params.textDocument.uri, 'Must have URI');
    assert.ok(notification.params.textDocument.languageId, 'Must have languageId');
    assert.ok(notification.params.textDocument.version !== undefined, 'Must have version');
    assert.ok(notification.params.textDocument.text !== undefined, 'Must have text');
  });

  test('Diagnostics follow protocol schema', () => {
    const diagnostics = [
      {
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 10 }
        },
        severity: 1, // Error
        message: 'Error found',
        source: 'log-scout'
      }
    ];

    diagnostics.forEach(diagnostic => {
      assert.ok(diagnostic.range, 'Must have range');
      assert.ok(diagnostic.range.start, 'Must have start position');
      assert.ok(diagnostic.range.end, 'Must have end position');
      assert.ok(typeof diagnostic.range.start.line === 'number', 'Line must be number');
      assert.ok(typeof diagnostic.range.start.character === 'number', 'Character must be number');
      assert.ok(diagnostic.severity >= 1 && diagnostic.severity <= 4, 'Severity must be 1-4');
      assert.ok(diagnostic.message, 'Must have message');
    });
  });

  test('Hover response follows protocol', () => {
    const hover = {
      contents: {
        kind: 'markdown',
        value: '**Error**: Something went wrong'
      },
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 5 }
      }
    };

    assert.ok(hover.contents, 'Must have contents');
    
    if (typeof hover.contents === 'object') {
      assert.ok(hover.contents.kind === 'markdown' || hover.contents.kind === 'plaintext', 
        'Must specify content kind');
      assert.ok(hover.contents.value, 'Must have value');
    }
    
    // Range is optional
    if (hover.range) {
      assert.ok(hover.range.start, 'Range must have start');
      assert.ok(hover.range.end, 'Range must have end');
    }
  });

  test('CompletionItem follows protocol', () => {
    const completionItem = {
      label: 'ERROR',
      kind: 1, // Text
      detail: 'Error log level',
      documentation: 'Indicates an error occurred',
      insertText: 'ERROR',
      filterText: 'ERROR'
    };

    assert.ok(completionItem.label, 'Must have label');
    assert.ok(typeof completionItem.kind === 'number', 'Kind must be number');
    assert.ok(completionItem.kind >= 1 && completionItem.kind <= 25, 'Kind must be valid CompletionItemKind');
  });
});
```

### 2. VS Code Extension API Contract Tests

Ensure extension respects VS Code extension API contracts.

```typescript
suite('Contract: VS Code Extension API', () => {
  test('Extension manifest follows schema', () => {
    const manifest = require('../../../package.json');

    // Required fields
    assert.ok(manifest.name, 'Must have name');
    assert.ok(manifest.version, 'Must have version');
    assert.ok(manifest.engines, 'Must specify engines');
    assert.ok(manifest.engines.vscode, 'Must specify VS Code version');
    assert.ok(manifest.activationEvents, 'Must have activation events');
    assert.ok(manifest.main, 'Must have main entry point');
    assert.ok(manifest.contributes, 'Must have contributes section');

    // Version format
    assert.match(manifest.version, /^\d+\.\d+\.\d+$/, 'Version must be semver');

    // Engine version format
    assert.match(manifest.engines.vscode, /^\^?\d+\.\d+\.\d+$/, 'VS Code version must be valid');
  });

  test('Commands follow naming convention', () => {
    const manifest = require('../../../package.json');
    const commands = manifest.contributes.commands || [];

    commands.forEach(cmd => {
      assert.ok(cmd.command, 'Command must have id');
      assert.ok(cmd.title, 'Command must have title');
      
      // Convention: extension-name.commandName
      assert.match(
        cmd.command, 
        /^[a-z][a-zA-Z0-9]*\.[a-z][a-zA-Z0-9]*$/,
        `Command id must follow convention: ${cmd.command}`
      );
      
      // Title should be descriptive
      assert.ok(cmd.title.length > 5, 'Command title should be descriptive');
    });
  });

  test('Configuration properties follow schema', () => {
    const manifest = require('../../../package.json');
    const config = manifest.contributes.configuration;

    if (config) {
      assert.ok(config.properties, 'Configuration must have properties');

      Object.entries(config.properties).forEach(([key, prop]) => {
        // Naming convention
        assert.match(
          key,
          /^[a-z][a-zA-Z0-9]*\.[a-z][a-zA-Z0-9.]*$/,
          `Config key must follow convention: ${key}`
        );

        // Required fields
        assert.ok(prop.type, `Property ${key} must have type`);
        assert.ok(prop.description, `Property ${key} must have description`);
        assert.ok(prop.default !== undefined, `Property ${key} must have default value`);

        // Type validation
        const validTypes = ['string', 'number', 'boolean', 'array', 'object'];
        assert.ok(
          validTypes.includes(prop.type),
          `Property ${key} has invalid type: ${prop.type}`
        );
      });
    }
  });

  test('Activation events are valid', () => {
    const manifest = require('../../../package.json');
    const events = manifest.activationEvents || [];

    events.forEach(event => {
      const validPrefixes = [
        'onLanguage:',
        'onCommand:',
        'onView:',
        'onFileSystem:',
        'workspaceContains:',
        'onStartupFinished',
        '*'
      ];

      const hasValidPrefix = validPrefixes.some(prefix => 
        event === prefix || event.startsWith(prefix)
      );

      assert.ok(
        hasValidPrefix,
        `Invalid activation event: ${event}`
      );
    });
  });

  test('Views follow contribution schema', () => {
    const manifest = require('../../../package.json');
    const views = manifest.contributes.views;

    if (views) {
      Object.entries(views).forEach(([containerName, viewList]) => {
        viewList.forEach(view => {
          assert.ok(view.id, 'View must have id');
          assert.ok(view.name, 'View must have name');
          
          // Optional fields
          if (view.when) {
            assert.ok(typeof view.when === 'string', 'View when clause must be string');
          }
        });
      });
    }
  });

  test('TreeDataProvider implements required interface', () => {
    class TestProvider implements vscode.TreeDataProvider<any> {
      getTreeItem(element: any): vscode.TreeItem {
        return new vscode.TreeItem('test');
      }
      
      getChildren(element?: any): vscode.ProviderResult<any[]> {
        return [];
      }
    }

    const provider = new TestProvider();

    // Contract: Must implement required methods
    assert.ok(typeof provider.getTreeItem === 'function', 'Must implement getTreeItem');
    assert.ok(typeof provider.getChildren === 'function', 'Must implement getChildren');

    // Contract: Methods return correct types
    const item = provider.getTreeItem({});
    assert.ok(item instanceof vscode.TreeItem, 'getTreeItem must return TreeItem');

    const children = provider.getChildren();
    assert.ok(Array.isArray(children) || children === undefined, 'getChildren must return array or undefined');
  });
});
```

### 3. Internal API Contract Tests

Ensure internal modules expose stable interfaces.

```typescript
suite('Contract: Internal APIs', () => {
  test('LogParser interface remains stable', () => {
    interface LogParser {
      parse(content: string): ParseResult;
      parseAsync(content: string): Promise<ParseResult>;
      setPatterns(patterns: Pattern[]): void;
    }

    interface ParseResult {
      entries: LogEntry[];
      errors: ParseError[];
      metadata: Record<string, any>;
    }

    // Import actual parser
    const parser = new LogParser();

    // Contract validation
    assert.ok(typeof parser.parse === 'function', 'Must have parse method');
    assert.ok(typeof parser.parseAsync === 'function', 'Must have parseAsync method');
    assert.ok(typeof parser.setPatterns === 'function', 'Must have setPatterns method');

    // Return type validation
    const result = parser.parse('test log');
    assert.ok(Array.isArray(result.entries), 'Must return entries array');
    assert.ok(Array.isArray(result.errors), 'Must return errors array');
    assert.ok(typeof result.metadata === 'object', 'Must return metadata object');
  });

  test('BundleManager interface remains stable', () => {
    interface BundleManager {
      import(path: string): Promise<Bundle>;
      export(bundle: Bundle, path: string): Promise<void>;
      getAll(): Bundle[];
      getById(id: string): Bundle | undefined;
      delete(id: string): Promise<void>;
    }

    const manager = new BundleManager();

    // Contract validation
    assert.ok(typeof manager.import === 'function', 'Must have import method');
    assert.ok(typeof manager.export === 'function', 'Must have export method');
    assert.ok(typeof manager.getAll === 'function', 'Must have getAll method');
    assert.ok(typeof manager.getById === 'function', 'Must have getById method');
    assert.ok(typeof manager.delete === 'function', 'Must have delete method');

    // Return types
    const bundles = manager.getAll();
    assert.ok(Array.isArray(bundles), 'getAll must return array');

    const bundle = manager.getById('test');
    assert.ok(bundle === undefined || typeof bundle === 'object', 'getById must return Bundle or undefined');
  });

  test('Configuration schema remains stable', () => {
    interface Configuration {
      get<T>(key: string): T;
      get<T>(key: string, defaultValue: T): T;
      update(key: string, value: any): Promise<void>;
      has(key: string): boolean;
    }

    const config = vscode.workspace.getConfiguration('logScoutAnalyzer');

    // Contract validation
    assert.ok(typeof config.get === 'function', 'Must have get method');
    assert.ok(typeof config.update === 'function', 'Must have update method');
    assert.ok(typeof config.has === 'function', 'Must have has method');
  });

  test('Event emitter interface remains stable', () => {
    interface EventEmitter<T> {
      event: vscode.Event<T>;
      fire(data: T): void;
      dispose(): void;
    }

    const emitter = new vscode.EventEmitter<string>();

    // Contract validation
    assert.ok(typeof emitter.event === 'function', 'Must have event property');
    assert.ok(typeof emitter.fire === 'function', 'Must have fire method');
    assert.ok(typeof emitter.dispose === 'function', 'Must have dispose method');
  });
});
```

### 4. Data Format Contract Tests

Ensure data structures remain compatible.

```typescript
suite('Contract: Data Formats', () => {
  test('Bundle JSON schema remains stable', () => {
    const bundle = {
      id: 'bundle-123',
      name: 'Test Bundle',
      version: 1,
      createdAt: '2024-01-01T00:00:00Z',
      files: [
        {
          path: 'log1.log',
          size: 1024,
          type: 'log'
        }
      ],
      metadata: {
        source: 'import',
        tags: ['test']
      }
    };

    // Required fields
    assert.ok(bundle.id, 'Must have id');
    assert.ok(bundle.name, 'Must have name');
    assert.ok(bundle.version, 'Must have version');
    assert.ok(bundle.createdAt, 'Must have createdAt');
    assert.ok(Array.isArray(bundle.files), 'Must have files array');
    assert.ok(bundle.metadata, 'Must have metadata');

    // Field types
    assert.strictEqual(typeof bundle.id, 'string', 'id must be string');
    assert.strictEqual(typeof bundle.name, 'string', 'name must be string');
    assert.strictEqual(typeof bundle.version, 'number', 'version must be number');
    assert.match(bundle.createdAt, /^\d{4}-\d{2}-\d{2}T/, 'createdAt must be ISO date');

    // Nested structure
    bundle.files.forEach(file => {
      assert.ok(file.path, 'File must have path');
      assert.ok(typeof file.size === 'number', 'File size must be number');
      assert.ok(file.type, 'File must have type');
    });
  });

  test('Log entry schema remains stable', () => {
    const entry = {
      line: 42,
      timestamp: '2024-01-01T12:00:00Z',
      level: 'ERROR',
      message: 'Something went wrong',
      metadata: {
        thread: 'main',
        file: 'app.js'
      }
    };

    // Required fields
    assert.ok(typeof entry.line === 'number', 'Must have line number');
    assert.ok(entry.timestamp, 'Must have timestamp');
    assert.ok(entry.level, 'Must have level');
    assert.ok(entry.message, 'Must have message');

    // Optional fields
    if (entry.metadata) {
      assert.strictEqual(typeof entry.metadata, 'object', 'metadata must be object');
    }
  });

  test('Pattern schema remains stable', () => {
    const pattern = {
      id: 'error-pattern-1',
      name: 'Error Pattern',
      regex: '/ERROR|Error/i',
      severity: 'error',
      tags: ['error', 'critical'],
      enabled: true
    };

    // Required fields
    assert.ok(pattern.id, 'Must have id');
    assert.ok(pattern.name, 'Must have name');
    assert.ok(pattern.regex, 'Must have regex');
    assert.ok(pattern.severity, 'Must have severity');
    assert.ok(typeof pattern.enabled === 'boolean', 'Must have enabled flag');

    // Valid severity
    const validSeverities = ['error', 'warning', 'info', 'debug'];
    assert.ok(
      validSeverities.includes(pattern.severity),
      'Severity must be valid'
    );
  });

  test('Configuration export format remains stable', () => {
    const config = {
      version: 1,
      patterns: [],
      settings: {
        autoAnalyze: true,
        maxFileSize: 100
      },
      exportedAt: '2024-01-01T00:00:00Z'
    };

    // Required fields
    assert.ok(config.version, 'Must have version');
    assert.ok(Array.isArray(config.patterns), 'Must have patterns array');
    assert.ok(config.settings, 'Must have settings');
    assert.ok(config.exportedAt, 'Must have exportedAt');

    // Version must be number
    assert.strictEqual(typeof config.version, 'number', 'version must be number');
  });
});
```

### 5. Backward Compatibility Tests

Ensure new versions work with old data.

```typescript
suite('Contract: Backward Compatibility', () => {
  test('Can read bundles from v1 format', () => {
    const v1Bundle = {
      id: 'old-bundle',
      name: 'Old Bundle',
      version: 1,
      files: ['file1.log', 'file2.log'] // Old format: array of paths
    };

    // New code should handle old format
    const bundle = readBundle(v1Bundle);
    
    assert.ok(bundle.id === v1Bundle.id, 'Should preserve id');
    assert.ok(bundle.name === v1Bundle.name, 'Should preserve name');
    assert.ok(Array.isArray(bundle.files), 'Should have files');
    
    // Should convert to new format
    bundle.files.forEach(file => {
      assert.ok(file.path, 'Should have path property');
      assert.ok(file.size !== undefined, 'Should have size property');
    });
  });

  test('New bundles are forward-compatible', () => {
    const v2Bundle = {
      id: 'new-bundle',
      name: 'New Bundle',
      version: 2,
      files: [
        { path: 'file1.log', size: 1024, type: 'log', hash: 'abc123' }
      ],
      metadata: {
        tags: ['test'],
        description: 'New field'
      }
    };

    // Old code (ignoring new fields) should still work
    const essentialFields = {
      id: v2Bundle.id,
      name: v2Bundle.name,
      version: v2Bundle.version,
      files: v2Bundle.files
    };

    assert.ok(essentialFields.id, 'Essential fields preserved');
    assert.ok(essentialFields.name, 'Essential fields preserved');
    assert.ok(essentialFields.version, 'Essential fields preserved');
    assert.ok(essentialFields.files, 'Essential fields preserved');
  });

  test('Configuration migration from v1 to v2', () => {
    const v1Config = {
      'logScout.patterns': ['ERROR', 'WARN']
    };

    // Migrate to v2 format
    const v2Config = migrateConfig(v1Config, 1, 2);

    assert.ok(v2Config['logScoutAnalyzer.patterns.errors'], 'Should migrate to new key');
    assert.ok(v2Config['logScoutAnalyzer.patterns.warnings'], 'Should migrate to new key');
  });

  test('LSP protocol version negotiation', () => {
    // Client supports 3.16
    const clientCapabilities = {
      textDocument: {
        diagnostic: { dynamicRegistration: true } // 3.17 feature
      }
    };

    // Server supports 3.16
    const serverCapabilities = getServerCapabilities(clientCapabilities);

    // Should not advertise features not supported by server version
    if (!supportsVersion('3.17')) {
      assert.ok(
        !serverCapabilities.diagnosticProvider,
        'Should not advertise 3.17 features when server is 3.16'
      );
    }
  });
});
```

## Contract Testing Workflow

### During Development

```bash
# Run contract tests before any commit
npm run test:wiring  # Includes contract tests

# Specific contract tests
npm run test -- --grep "Contract:"
```

### Before Releasing

```bash
# Full contract validation
npm run test:all

# Verify backward compatibility
npm run test -- --grep "Backward Compatibility"
```

### In CI/CD

```yaml
contract-tests:
  runs-on: windows-latest
  steps:
    - name: Run contract tests
      run: npm run test -- --grep "Contract:"
      
    - name: Verify LSP protocol compliance
      run: npm run test -- --grep "Contract: LSP"
      
    - name: Verify backward compatibility
      run: npm run test -- --grep "Backward Compatibility"
      
    - name: Fail on breaking changes
      run: |
        if [ $? -ne 0 ]; then
          echo "Breaking contract changes detected!"
          exit 1
        fi
```

## Contract Versioning

### Semantic Versioning for APIs

```
Major.Minor.Patch

Major: Breaking changes (contract violated)
Minor: New features (contract extended)
Patch: Bug fixes (contract unchanged)
```

### Examples

```typescript
// PATCH: Bug fix, contract unchanged
// v1.0.0 → v1.0.1
- function parse(content: string): ParseResult
+ function parse(content: string): ParseResult // Same signature, better implementation

// MINOR: New feature, contract extended
// v1.0.0 → v1.1.0
  function parse(content: string): ParseResult
+ function parseWithOptions(content: string, options: Options): ParseResult

// MAJOR: Breaking change, contract violated
// v1.0.0 → v2.0.0
- function parse(content: string): ParseResult
+ function parse(content: string, encoding: string): ParseResult // Added required param!
```

## Contract Documentation

Every public API should document its contract:

```typescript
/**
 * Parses log file content and extracts structured entries.
 * 
 * @contract
 * - Input: Non-null string (may be empty)
 * - Output: ParseResult with entries array (never null)
 * - Throws: Never throws, returns errors in result.errors
 * - Performance: O(n) where n = content length
 * - Side effects: None (pure function)
 * 
 * @param content - Log file content to parse
 * @returns ParseResult with entries and errors
 * 
 * @example
 * const result = parse("ERROR: Something failed");
 * console.log(result.entries); // [{ level: 'ERROR', message: '...' }]
 */
function parse(content: string): ParseResult {
  // Implementation
}
```

## Breaking Change Detection

```typescript
suite('Contract: Breaking Change Detection', () => {
  test('Public API surface has not changed', () => {
    const currentAPI = getPublicAPI();
    const previousAPI = loadPreviousAPI();

    // Check for removed methods
    const removed = previousAPI.methods.filter(m => 
      !currentAPI.methods.find(cm => cm.name === m.name)
    );
    
    assert.strictEqual(
      removed.length,
      0,
      `Breaking: Removed methods: ${removed.map(m => m.name).join(', ')}`
    );

    // Check for changed signatures
    const changed = currentAPI.methods.filter(m => {
      const prev = previousAPI.methods.find(pm => pm.name === m.name);
      return prev && prev.signature !== m.signature;
    });

    assert.strictEqual(
      changed.length,
      0,
      `Breaking: Changed signatures: ${changed.map(m => m.name).join(', ')}`
    );
  });
});
```

## Contract Test Checklist

Before marking any API change complete:

### New Public API
- [ ] Contract documented in JSDoc
- [ ] Contract tests written
- [ ] Example usage provided
- [ ] Versioning strategy documented
- [ ] Backward compatibility considered

### Modified Public API
- [ ] Contract tests updated
- [ ] Breaking changes identified
- [ ] Migration guide created (if breaking)
- [ ] Version number appropriate (major/minor/patch)
- [ ] Deprecation warnings added (if applicable)

### LSP Protocol
- [ ] Request/response schemas tested
- [ ] Error handling tested
- [ ] Protocol version compatibility verified
- [ ] Notifications follow protocol

### Data Formats
- [ ] Schema validation tests
- [ ] Backward compatibility tests
- [ ] Forward compatibility considered
- [ ] Migration path documented

## Success Criteria

You know contract testing is effective when:

- ✅ Breaking changes never reach production
- ✅ Old clients work with new servers
- ✅ API changes are intentional, not accidental
- ✅ Integration issues caught in tests, not production
- ✅ Documentation matches actual behavior

## Common Contract Violations

### ❌ Avoid These

1. **Changing parameter types**
   ```typescript
   // BREAKING
   - parse(content: string)
   + parse(content: Buffer)
   ```

2. **Removing optional parameters makes them required**
   ```typescript
   // BREAKING
   - parse(content: string, options?: Options)
   + parse(content: string, options: Options)
   ```

3. **Changing return types**
   ```typescript
   // BREAKING
   - parse(): ParseResult
   + parse(): Promise<ParseResult>
   ```

4. **Removing public methods**
   ```typescript
   // BREAKING
   - parseSync()
   ```

5. **Changing error behavior**
   ```typescript
   // BREAKING (if contract promised no throws)
   - return { error: 'failed' }
   + throw new Error('failed')
   ```

## Remember

**Contracts are promises. Don't break promises.**

Test contracts as rigorously as functionality. A breaking change that reaches production is a process failure.

**When in doubt, extend rather than change.**

Add new APIs instead of modifying existing ones. Deprecate old APIs gracefully.

**Document your contracts.**

If it's not documented and tested, it's not a contract—it's an accident waiting to happen.

---

## AI Assistant Guidelines

### For AI Assistants Reading This Document

When implementing or modifying APIs:

#### 1. Read Logs First
```bash
# If contract tests fail, read the log
"I see npm run test:all failed. Let me check logs/test-all.log..."
```

Always understand what contract was broken before proposing fixes.

#### 2. Use Templates from This Document
```
"I'll create contract tests using the template from CONTRACT_TESTING.md section 1..."
```

Copy the test templates from this document. They ensure proper contract validation.

#### 3. Check for Breaking Changes
Before modifying any public API, verify:
- [ ] Is this method/property public?
- [ ] Are there existing tests for this API?
- [ ] Will this change break existing callers?
- [ ] Do I need to version this change?
- [ ] Should I deprecate instead of change?

If yes to any, ask human before proceeding.

#### 4. Run Contract Tests Automatically
```bash
# After modifying APIs
npm run test:all

# Check for breaking changes
npm run test -- --grep "Contract:"

# Check logs if failures
type logs\test-all.log
```

#### 5. Document Contracts with JSDoc
Every public API needs contract documentation:
```typescript
/**
 * @contract
 * - Input: Non-null string
 * - Output: ParseResult (never null)
 * - Throws: Never throws, returns errors in result.errors
 * - Performance: O(n) where n = content length
 * 
 * @param content - Log content to parse
 * @returns ParseResult with entries and errors
 */
```

#### 6. Example Response Template

```markdown
## API Change: [Method/Property Name]

### Contract Analysis
- Type: Public API
- Breaking: No (backward compatible)
- Version: Minor bump (1.2.0 → 1.3.0)

### Tests Created
1. Contract test: `test/suite/wiring.test.ts` lines 42-65
2. Backward compat: `test/suite/wiring.test.ts` lines 66-89

### Contract Documentation
```typescript
/**
 * @contract
 * - Accepts: string | Buffer
 * - Returns: Promise<Result>
 * - Throws: Only on invalid input type
 * @since 1.3.0
 */
```

### Test Results
```bash
npm run test:all
# Output saved to logs/test-all.log
✅ All contract tests passing
✅ Backward compatibility verified
✅ No breaking changes detected
```

### Version Impact
- Current: 1.2.0
- New: 1.3.0 (minor bump - added optional parameter)
- Migration: None required (backward compatible)

### Ready for Review
All contract tests passing. Human QA can verify:
1. Run: npm run test:all
2. Check: logs/test-all.log
3. Verify: No breaking changes reported
```

#### 7. When Adding New APIs
```
"I'm adding a new public method [name].
I'll create contract tests per CONTRACT_TESTING.md section 3."
```

New public APIs MUST have contract tests from day one.

#### 8. When Changing Existing APIs
```
"I need to change [method] signature.
This is a breaking change. Should I:
1. Add new method, deprecate old one (recommended)
2. Make breaking change and bump major version
3. Find non-breaking alternative?"
```

Always ask before making breaking changes.

#### 9. Semantic Versioning for APIs
- **Major (X.0.0)**: Breaking changes
  - Required parameter added
  - Return type changed
  - Method removed
  
- **Minor (1.X.0)**: Additions (backward compatible)
  - Optional parameter added
  - New method added
  - New property added
  
- **Patch (1.0.X)**: Bug fixes (no API changes)
  - Internal fixes only
  - No signature changes

#### 10. Common Mistakes to Avoid
- ❌ "It's just a small change, no contract tests needed"
- ❌ Changing parameter types without versioning
- ❌ Removing optional parameters (breaks callers)
- ❌ Changing return types
- ❌ Not documenting contract with JSDoc

#### 11. Always Check Logs for Contract Violations
```
Human: "Tests failed after API change"
AI: "Let me check logs/test-all.log..."
[Reads actual error]
AI: "The log shows: 'Contract violated: parse() now throws, but contract says never throws'.
     I need to either:
     1. Fix implementation to match contract (no throws)
     2. Update contract and bump major version"
```

Don't guess what broke. Read the log. Fix based on actual violation.

#### 12. LSP Protocol Compliance
When working with LSP features:
```bash
# Verify protocol compliance
npm run test -- --grep "Contract: LSP"

# Check logs
type logs\test-all.log
```

LSP protocol violations cause hard-to-debug issues. Test thoroughly.

#### 13. Efficiency Tips
- Use contract test templates from this document
- Run contract tests after every API change
- Check `logs/test-all.log` for contract violations
- Document contracts in JSDoc (saves time later)
- Ask before making breaking changes
- Prefer addition over modification

#### 14. Update This Document
If you discover new contract patterns or violations:
```
"I found a contract violation pattern not covered in CONTRACT_TESTING.md.
Should I add section for [pattern type]?"
```

Keep this document current with new patterns.

### Remember
**Breaking changes in production = Process Failure**
**Breaking changes caught in tests = Process Success**

Your job is to ensure API contracts remain stable BEFORE deployment.

**When working with APIs:**
1. Read this document first (especially versioning rules)
2. Use the test templates provided
3. Document contracts with JSDoc
4. Run contract tests frequently
5. Check logs when failures occur
6. Ask before making breaking changes
7. Update this document if you find gaps

**Make contract testing efficient for humans by preventing breaking changes early.**