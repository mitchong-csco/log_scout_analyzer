# Automated Documentation Strategy 📚

## Mission: Documentation That Writes Itself

Documentation should be generated from code, tests, and comments—not manually maintained.

## Core Principle

**If documentation is manual, it's outdated. Automate everything.**

```
Manual Documentation = Outdated Documentation
Generated Documentation = Always Current
```

## Why Automated Documentation Matters

### Problems with Manual Documentation

❌ Becomes outdated immediately after writing
❌ Developers forget to update it
❌ Time-consuming to maintain
❌ Often incomplete or inconsistent
❌ Duplicates information in code

### Benefits of Automation

✅ Always in sync with code
✅ Generated from single source of truth
✅ Comprehensive and consistent
✅ No maintenance burden
✅ Enforced through CI/CD

## Documentation Categories

### 1. API Documentation (from JSDoc)

Generate API docs from TypeScript/JSDoc comments.

#### Setup TypeDoc

```bash
npm install --save-dev typedoc typedoc-plugin-markdown
```

#### Configure TypeDoc

```json
// typedoc.json
{
  "entryPoints": ["src/extension.ts"],
  "out": "docs/api",
  "plugin": ["typedoc-plugin-markdown"],
  "readme": "README.md",
  "excludePrivate": true,
  "excludeProtected": true,
  "excludeExternals": true,
  "includeVersion": true,
  "categorizeByGroup": true,
  "categoryOrder": ["Core", "Providers", "Utilities", "*"],
  "sort": ["source-order"]
}
```

#### Write Documented Code

```typescript
/**
 * Parses log file content and extracts structured entries.
 * 
 * @remarks
 * This parser supports multiple log formats including:
 * - Plain text with timestamps
 * - JSON formatted logs
 * - Syslog format
 * - Custom patterns via configuration
 * 
 * @param content - The log file content to parse
 * @param options - Optional parsing configuration
 * @returns A ParseResult containing entries and any errors
 * 
 * @throws {InvalidFormatError} When log format is not recognized
 * @throws {ParseError} When parsing fails critically
 * 
 * @example
 * Basic usage:
 * ```typescript
 * const result = parseLog(logContent);
 * console.log(`Found ${result.entries.length} log entries`);
 * ```
 * 
 * @example
 * With custom patterns:
 * ```typescript
 * const result = parseLog(logContent, {
 *   patterns: customPatterns,
 *   strict: true
 * });
 * ```
 * 
 * @category Core
 * @since 1.0.0
 */
export function parseLog(
  content: string,
  options?: ParseOptions
): ParseResult {
  // Implementation
}

/**
 * Configuration options for log parsing.
 * 
 * @public
 */
export interface ParseOptions {
  /**
   * Custom patterns to use for parsing.
   * If not provided, default patterns are used.
   */
  patterns?: Pattern[];
  
  /**
   * Whether to use strict parsing mode.
   * In strict mode, unrecognized lines cause errors.
   * @defaultValue false
   */
  strict?: boolean;
  
  /**
   * Maximum number of lines to parse.
   * Useful for large files.
   * @defaultValue Infinity
   */
  maxLines?: number;
}

/**
 * Result of log parsing operation.
 * 
 * @public
 */
export interface ParseResult {
  /**
   * Successfully parsed log entries.
   */
  entries: LogEntry[];
  
  /**
   * Errors encountered during parsing.
   * Non-critical errors that didn't stop parsing.
   */
  errors: ParseError[];
  
  /**
   * Metadata about the parsing operation.
   */
  metadata: {
    /** Total lines processed */
    totalLines: number;
    /** Time taken in milliseconds */
    duration: number;
    /** Format detected */
    format: string;
  };
}
```

#### Generate Documentation

```bash
# Generate API docs
npm run docs:generate

# Serve locally to preview
npm run docs:serve

# Open http://localhost:8080
```

### 2. Test Documentation (from Test Scenarios)

Generate feature documentation from test descriptions.

#### Write Self-Documenting Tests

```typescript
/**
 * @feature Import Progress Indicator
 * @description Shows progress notification during archive import
 * @category User Experience
 */
suite('Feature: Import Progress Indicator', () => {
  /**
   * @scenario User imports a small archive
   * @given A valid archive file under 10MB
   * @when User executes import command
   * @then Progress notification appears
   * @and Progress shows percentage and status
   * @and Import completes successfully
   */
  test('Shows progress for small archive', async () => {
    const archive = loadFixture('archives/small-valid.zip');
    const progressSpy = new ProgressSpy();
    
    await importArchive(archive, progressSpy);
    
    assert.ok(progressSpy.wasShown, 'Progress notification should appear');
    assert.ok(progressSpy.updates.length > 0, 'Should report progress');
    assert.strictEqual(progressSpy.finalStatus, 'complete', 'Should complete');
  });
  
  /**
   * @scenario User cancels import during progress
   * @given Import operation in progress
   * @when User clicks cancel button
   * @then Import stops immediately
   * @and Temporary files are cleaned up
   * @and User sees cancellation message
   */
  test('Allows cancellation during import', async () => {
    const largeArchive = loadFixture('archives/large-valid.zip');
    const progressSpy = new ProgressSpy();
    
    const promise = importArchive(largeArchive, progressSpy);
    
    // Cancel after 100ms
    setTimeout(() => progressSpy.cancel(), 100);
    
    await assert.rejects(promise, /cancelled/, 'Should reject on cancel');
    assert.ok(tempFilesCleanedUp(), 'Should clean up temp files');
  });
  
  /**
   * @scenario Import fails with error
   * @given A corrupted archive file
   * @when User attempts import
   * @then Error message is shown
   * @and Progress indicator closes
   * @and User can try again
   */
  test('Handles import errors gracefully', async () => {
    const corruptedArchive = loadFixture('archives/corrupted.zip');
    const progressSpy = new ProgressSpy();
    
    await assert.rejects(
      importArchive(corruptedArchive, progressSpy),
      /corrupt/i,
      'Should error on corrupted archive'
    );
    
    assert.ok(progressSpy.wasClosed, 'Progress should close on error');
  });
});
```

#### Extract Documentation from Tests

```javascript
// scripts/generate-test-docs.js
const fs = require('fs');
const path = require('path');

function extractTestDocumentation(testFile) {
  const content = fs.readFileSync(testFile, 'utf8');
  const features = [];
  
  // Extract @feature blocks
  const featureRegex = /\/\*\*[\s\S]*?@feature\s+(.+?)[\s\S]*?\*\//g;
  let match;
  
  while ((match = featureRegex.exec(content)) !== null) {
    const block = match[0];
    const feature = {
      name: extractTag(block, 'feature'),
      description: extractTag(block, 'description'),
      category: extractTag(block, 'category'),
      scenarios: []
    };
    
    // Extract scenarios within this feature
    const scenarioRegex = /\/\*\*[\s\S]*?@scenario\s+(.+?)[\s\S]*?\*\//g;
    let scenarioMatch;
    
    while ((scenarioMatch = scenarioRegex.exec(block)) !== null) {
      const scenarioBlock = scenarioMatch[0];
      feature.scenarios.push({
        name: extractTag(scenarioBlock, 'scenario'),
        given: extractTag(scenarioBlock, 'given'),
        when: extractTag(scenarioBlock, 'when'),
        then: extractTag(scenarioBlock, 'then'),
        and: extractTags(scenarioBlock, 'and')
      });
    }
    
    features.push(feature);
  }
  
  return features;
}

function generateFeatureDocumentation(features) {
  let markdown = '# Feature Documentation\n\n';
  markdown += '_Auto-generated from test scenarios_\n\n';
  
  features.forEach(feature => {
    markdown += `## ${feature.name}\n\n`;
    markdown += `${feature.description}\n\n`;
    markdown += `**Category**: ${feature.category}\n\n`;
    
    markdown += '### Scenarios\n\n';
    
    feature.scenarios.forEach((scenario, idx) => {
      markdown += `#### ${idx + 1}. ${scenario.name}\n\n`;
      markdown += `- **Given**: ${scenario.given}\n`;
      markdown += `- **When**: ${scenario.when}\n`;
      markdown += `- **Then**: ${scenario.then}\n`;
      
      if (scenario.and.length > 0) {
        scenario.and.forEach(and => {
          markdown += `- **And**: ${and}\n`;
        });
      }
      
      markdown += '\n';
    });
    
    markdown += '---\n\n';
  });
  
  return markdown;
}

// Generate documentation
const testFiles = findTestFiles('src/test');
const allFeatures = testFiles.flatMap(extractTestDocumentation);
const markdown = generateFeatureDocumentation(allFeatures);

fs.writeFileSync('docs/FEATURES.md', markdown);
console.log('✅ Generated docs/FEATURES.md');
```

### 3. Configuration Documentation (from Schema)

Generate configuration docs from package.json schema.

```javascript
// scripts/generate-config-docs.js
const packageJson = require('../package.json');

function generateConfigDocumentation() {
  const config = packageJson.contributes.configuration;
  let markdown = '# Configuration Reference\n\n';
  markdown += '_Auto-generated from package.json_\n\n';
  
  Object.entries(config.properties).forEach(([key, prop]) => {
    markdown += `## \`${key}\`\n\n`;
    markdown += `${prop.description}\n\n`;
    
    markdown += `- **Type**: \`${prop.type}\`\n`;
    markdown += `- **Default**: \`${JSON.stringify(prop.default)}\`\n`;
    
    if (prop.enum) {
      markdown += `- **Options**: ${prop.enum.map(v => `\`${v}\``).join(', ')}\n`;
    }
    
    if (prop.minimum !== undefined) {
      markdown += `- **Minimum**: ${prop.minimum}\n`;
    }
    
    if (prop.maximum !== undefined) {
      markdown += `- **Maximum**: ${prop.maximum}\n`;
    }
    
    markdown += '\n';
    
    // Add example
    markdown += '**Example:**\n\n';
    markdown += '```json\n';
    markdown += `{\n  "${key}": ${JSON.stringify(prop.default, null, 2)}\n}\n`;
    markdown += '```\n\n';
    
    markdown += '---\n\n';
  });
  
  return markdown;
}

const markdown = generateConfigDocumentation();
fs.writeFileSync('docs/CONFIGURATION.md', markdown);
console.log('✅ Generated docs/CONFIGURATION.md');
```

### 4. Command Documentation (from package.json)

```javascript
// scripts/generate-command-docs.js
function generateCommandDocumentation() {
  const commands = packageJson.contributes.commands;
  let markdown = '# Command Reference\n\n';
  markdown += '_Auto-generated from package.json_\n\n';
  
  commands.forEach(cmd => {
    const cmdName = cmd.command.split('.')[1];
    markdown += `## ${cmd.title}\n\n`;
    markdown += `**Command ID**: \`${cmd.command}\`\n\n`;
    
    if (cmd.category) {
      markdown += `**Category**: ${cmd.category}\n\n`;
    }
    
    // Extract keybinding if exists
    const keybinding = packageJson.contributes.keybindings?.find(
      kb => kb.command === cmd.command
    );
    
    if (keybinding) {
      markdown += `**Keybinding**: \`${keybinding.key}\`\n\n`;
    }
    
    markdown += '**Usage:**\n\n';
    markdown += '1. Open Command Palette (`Ctrl+Shift+P`)\n';
    markdown += `2. Type "${cmd.title}"\n`;
    markdown += '3. Press Enter\n\n';
    
    markdown += '---\n\n';
  });
  
  return markdown;
}
```

### 5. Changelog (from Git Commits)

```javascript
// scripts/generate-changelog.js
const { execSync } = require('child_process');

function generateChangelog() {
  const tags = execSync('git tag --sort=-v:refname', { encoding: 'utf8' })
    .trim()
    .split('\n');
  
  let markdown = '# Changelog\n\n';
  markdown += '_Auto-generated from git commits_\n\n';
  
  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i];
    const previousTag = tags[i + 1];
    
    markdown += `## ${tag}\n\n`;
    
    const range = previousTag ? `${previousTag}..${tag}` : tag;
    const commits = execSync(`git log ${range} --pretty=format:"%s|%an|%ad" --date=short`, {
      encoding: 'utf8'
    }).trim().split('\n');
    
    const categories = {
      features: [],
      fixes: [],
      docs: [],
      other: []
    };
    
    commits.forEach(commit => {
      const [message, author, date] = commit.split('|');
      
      if (message.startsWith('feat:')) {
        categories.features.push({ message: message.replace('feat:', '').trim(), author, date });
      } else if (message.startsWith('fix:')) {
        categories.fixes.push({ message: message.replace('fix:', '').trim(), author, date });
      } else if (message.startsWith('docs:')) {
        categories.docs.push({ message: message.replace('docs:', '').trim(), author, date });
      } else {
        categories.other.push({ message, author, date });
      }
    });
    
    if (categories.features.length > 0) {
      markdown += '### ✨ Features\n\n';
      categories.features.forEach(c => {
        markdown += `- ${c.message} (${c.author}, ${c.date})\n`;
      });
      markdown += '\n';
    }
    
    if (categories.fixes.length > 0) {
      markdown += '### 🐛 Bug Fixes\n\n';
      categories.fixes.forEach(c => {
        markdown += `- ${c.message} (${c.author}, ${c.date})\n`;
      });
      markdown += '\n';
    }
    
    markdown += '---\n\n';
  }
  
  return markdown;
}
```

### 6. README Sections (from Templates)

```javascript
// scripts/generate-readme.js
function generateReadme() {
  const template = fs.readFileSync('docs/templates/README.template.md', 'utf8');
  
  // Replace placeholders with generated content
  let readme = template
    .replace('{{VERSION}}', packageJson.version)
    .replace('{{DESCRIPTION}}', packageJson.description)
    .replace('{{FEATURES}}', generateFeaturesList())
    .replace('{{COMMANDS}}', generateCommandsList())
    .replace('{{CONFIGURATION}}', generateConfigSummary())
    .replace('{{INSTALLATION}}', generateInstallationInstructions());
  
  return readme;
}

function generateFeaturesList() {
  const features = extractFeaturesFromTests();
  return features.map(f => `- ${f.name}: ${f.description}`).join('\n');
}
```

## Automation Workflow

### During Development

```bash
# Compile and generate docs
npm run compile && npm run docs:generate

# Watch mode: regenerate on file changes
npm run docs:watch
```

### Before Committing

```bash
# Pre-commit hook generates and validates docs
npm run docs:all
npm run docs:validate
```

### In CI/CD

```yaml
# .github/workflows/docs.yml
name: Documentation

on:
  push:
    branches: [main]
  pull_request:

jobs:
  generate-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Generate documentation
        run: npm run docs:all
      
      - name: Validate documentation
        run: npm run docs:validate
      
      - name: Check for changes
        run: |
          if [[ $(git diff docs/) ]]; then
            echo "Documentation is out of sync!"
            echo "Run: npm run docs:all"
            exit 1
          fi
      
      - name: Deploy to GitHub Pages
        if: github.ref == 'refs/heads/main'
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./docs
```

## npm Scripts for Documentation

```json
{
  "scripts": {
    "docs:generate": "typedoc",
    "docs:config": "node scripts/generate-config-docs.js",
    "docs:commands": "node scripts/generate-command-docs.js",
    "docs:features": "node scripts/generate-test-docs.js",
    "docs:changelog": "node scripts/generate-changelog.js",
    "docs:readme": "node scripts/generate-readme.js",
    "docs:all": "npm run docs:generate && npm run docs:config && npm run docs:commands && npm run docs:features && npm run docs:changelog",
    "docs:serve": "http-server docs -p 8080 -o",
    "docs:watch": "nodemon --watch src --ext ts --exec 'npm run docs:generate'",
    "docs:validate": "markdownlint docs/**/*.md",
    "docs:toc": "markdown-toc -i README.md docs/**/*.md",
    "docs:check-links": "markdown-link-check docs/**/*.md"
  }
}
```

## Documentation Quality Checks

### Validate Completeness

```javascript
// scripts/validate-docs.js
function validateDocumentation() {
  const errors = [];
  
  // Check all public APIs are documented
  const publicAPIs = extractPublicAPIs('src');
  publicAPIs.forEach(api => {
    if (!hasJSDoc(api)) {
      errors.push(`Missing documentation: ${api.name}`);
    }
  });
  
  // Check all commands are documented
  const commands = packageJson.contributes.commands;
  commands.forEach(cmd => {
    const docFile = `docs/commands/${cmd.command}.md`;
    if (!fs.existsSync(docFile)) {
      errors.push(`Missing command documentation: ${cmd.command}`);
    }
  });
  
  // Check all features have test documentation
  const features = extractFeaturesFromCode('src');
  features.forEach(feature => {
    if (!hasTestDocumentation(feature)) {
      errors.push(`Missing test documentation: ${feature}`);
    }
  });
  
  if (errors.length > 0) {
    console.error('Documentation validation failed:');
    errors.forEach(err => console.error(`  - ${err}`));
    process.exit(1);
  }
  
  console.log('✅ Documentation validation passed');
}
```

### Check for Outdated Docs

```javascript
// scripts/check-outdated-docs.js
function checkOutdatedDocs() {
  const warnings = [];
  
  // Check if generated docs are up to date
  const lastGenerated = fs.statSync('docs/api/index.html').mtime;
  const lastCodeChange = execSync(
    'git log -1 --format=%ct -- src',
    { encoding: 'utf8' }
  );
  
  if (new Date(lastCodeChange * 1000) > lastGenerated) {
    warnings.push('API documentation is outdated. Run: npm run docs:generate');
  }
  
  // Check if README is synced
  const readmeVersion = extractVersionFromReadme('README.md');
  if (readmeVersion !== packageJson.version) {
    warnings.push('README version mismatch. Run: npm run docs:readme');
  }
  
  if (warnings.length > 0) {
    console.warn('Documentation warnings:');
    warnings.forEach(warn => console.warn(`  ⚠️  ${warn}`));
  }
}
```

## Documentation Standards

### JSDoc Standards

```typescript
/**
 * Brief description (one line).
 * 
 * @remarks
 * Detailed explanation with multiple paragraphs if needed.
 * 
 * Use Markdown formatting:
 * - Lists
 * - **Bold**
 * - `code`
 * 
 * @param paramName - Description of parameter
 * @returns Description of return value
 * 
 * @throws {ErrorType} Description of when this error is thrown
 * 
 * @example
 * ```typescript
 * // Example usage
 * const result = myFunction('input');
 * ```
 * 
 * @category CategoryName
 * @since 1.0.0
 * @deprecated Use newFunction instead
 * @see {@link relatedFunction}
 * 
 * @public
 */
```

### Test Documentation Standards

```typescript
/**
 * @feature Feature Name
 * @description Brief description of what the feature does
 * @category Category (e.g., "User Experience", "Performance", "Security")
 * @since 1.0.0
 */
suite('Feature: Feature Name', () => {
  /**
   * @scenario What the user is doing
   * @given Preconditions
   * @when User action
   * @then Expected outcome
   * @and Additional expectations
   */
  test('Descriptive test name', () => {
    // Test implementation
  });
});
```

## Documentation Best Practices

### DO ✅

- Write JSDoc for all public APIs
- Use `@example` for usage examples
- Keep descriptions clear and concise
- Use TypeScript types (they're self-documenting)
- Generate docs as part of build process
- Validate docs in CI/CD
- Version documentation with code

### DON'T ❌

- Write manual documentation that duplicates code
- Document private/internal APIs extensively
- Use vague descriptions like "does stuff"
- Forget to update docs when code changes
- Commit generated docs to git (generate in CI)
- Write documentation without examples

## Documentation Metrics

Track these to measure documentation quality:

```typescript
interface DocumentationMetrics {
  // Coverage
  publicAPIsDocumented: number;
  totalPublicAPIs: number;
  coveragePercentage: number;
  
  // Completeness
  missingExamples: number;
  missingDescriptions: number;
  incompleteJSDoc: number;
  
  // Freshness
  lastGenerated: Date;
  lastCodeChange: Date;
  outdatedDocs: string[];
  
  // Quality
  brokenLinks: number;
  lintErrors: number;
  spellingErrors: number;
}
```

## Success Criteria

You know automated documentation is effective when:

- ✅ Documentation is always current
- ✅ Developers don't manually write docs
- ✅ API changes automatically update docs
- ✅ Users can find answers in docs
- ✅ No outdated documentation exists
- ✅ CI fails if docs are out of sync

## Common Pitfalls

### ❌ Avoid These

1. **Over-documenting obvious code**
   ```typescript
   // BAD
   /** Gets the name */
   getName(): string { return this.name; }
   
   // GOOD
   // No JSDoc needed - type is self-explanatory
   getName(): string { return this.name; }
   ```

2. **Documenting implementation details**
   ```typescript
   // BAD
   /** Uses recursive algorithm with memoization */
   parse(content: string): Result
   
   // GOOD
   /** Parses log content and returns structured entries */
   parse(content: string): Result
   ```

3. **Not providing examples**
   ```typescript
   // BAD
   /** Configures the parser */
   configure(options: Options): void
   
   // GOOD
   /**
    * Configures the parser with custom options.
    * @example
    * ```typescript
    * configure({ strict: true, maxLines: 1000 });
    * ```
    */
   configure(options: Options): void
   ```

## Tools Integration

### VS Code

```json
// .vscode/settings.json
{
  "editor.codeActionsOnSave": {
    "source.addMissingImports": true
  },
  "typescript.suggest.completeFunctionCalls": true,
  "typescript.preferences.includePackageJsonAutoImports": "on"
}
```

### ESLint

```javascript
// .eslintrc.js
module.exports = {
  rules: {
    'jsdoc/require-jsdoc': ['error', {
      require: {
        FunctionDeclaration: true,
        MethodDefinition: true,
        ClassDeclaration: true
      }
    }],
    'jsdoc/require-description': 'error',
    'jsdoc/require-param-description': 'error',
    'jsdoc/require-returns-description': 'error',
    'jsdoc/require-example': 'warn'
  }
};
```

## Remember

**Good documentation writes itself.**

Invest in automation. Your future self (and users) will thank you.

**Code is the source of truth.**

Documentation should be generated from code, not the other way around.

**If it's not automated, it's not maintained.**

Manual documentation rots. Automated documentation stays fresh.