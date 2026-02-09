# TagScout Integration for Log Scout Analyzer

> Leverage existing annotations and patterns from the TagScout MongoDB Library in your Log Scout Analyzer workflow.

## 📋 Overview

This integration connects Log Scout Analyzer with the **TagScout Library** MongoDB database, allowing you to:

- **Sync patterns** automatically from TagScout's curated collection
- **Leverage existing knowledge** from thousands of annotated log patterns
- **Filter by product** (Jabber, CUCM, Webex, etc.)
- **Export to VS Code** settings for immediate use
- **Keep patterns updated** with auto-sync capabilities
- **Generate documentation** for your team

## 🗄️ TagScout Database

- **Database**: `task_TagScoutLibrary`
- **Connection**: MongoDB replica set on Cisco internal network
- **Access**: Read-only authentication
- **Collections**: annotations, patterns, categories

```
mongodb://TagScoutLibrary_ro:***@bdb-int-prod-mongos-1.cisco.com:27017,
bdb-int-prod-mongos-2.cisco.com:27017/task_TagScoutLibrary?tls=true
```

## 🚀 Quick Start

### Installation

```bash
cd log_scout_analyzer/tagscout-integration
npm install
npm run build
```

### Test Connection

```bash
npm run test-connection
```

Expected output:
```
✓ Connected to TagScout MongoDB: task_TagScoutLibrary
✓ Connection successful!

Database Information:
  Database: task_TagScoutLibrary
  Available Products (15):
    - Jabber
    - CUCM
    - Webex
    ...
```

### Sync Patterns

```bash
npm run sync
```

This will:
1. Connect to TagScout MongoDB
2. Fetch all annotations
3. Convert to Log Scout patterns
4. Cache locally for performance
5. Generate VS Code settings

## 📚 Usage

### CLI Commands

#### Test Connection
```bash
npx tagscout-cli test
```

#### List Available Resources
```bash
npx tagscout-cli list

# Verbose mode (shows components)
npx tagscout-cli list --verbose
```

#### Sync All Patterns
```bash
npx tagscout-cli sync

# Force refresh (ignore cache)
npx tagscout-cli sync --force

# Filter by product
npx tagscout-cli sync --product Jabber
```

#### Export to VS Code Settings
```bash
npx tagscout-cli export --output tagscout-settings.json
```

Then copy patterns into your VS Code `settings.json`:
```json
{
  "logScoutAnalyzer.patterns.errors": [ /* patterns here */ ],
  "logScoutAnalyzer.patterns.warnings": [ /* patterns here */ ],
  "logScoutAnalyzer.patterns.info": [ /* patterns here */ ]
}
```

#### Generate Documentation
```bash
npx tagscout-cli docs --output PATTERNS.md
```

#### Show Statistics
```bash
npx tagscout-cli stats

# For specific product
npx tagscout-cli stats --product Jabber
```

#### Show Sync Status
```bash
npx tagscout-cli status
```

#### Clear Cache
```bash
npx tagscout-cli clear-cache
```

#### Auto-Sync Mode
```bash
# Start auto-sync (runs every 60 minutes)
npx tagscout-cli sync --auto-sync

# Custom interval (30 minutes)
npx tagscout-cli sync --auto-sync --interval 30
```

### Programmatic Usage

#### Basic Sync

```typescript
import { createSyncService } from './sync-service';

async function syncPatterns() {
  const service = await createSyncService({
    autoSync: false,
    mergeWithExisting: true,
    backupBeforeSync: true
  });

  const result = await service.syncPatterns();
  
  console.log(`Synced ${result.totalPatterns} patterns`);
  console.log(`Added ${result.patternsAdded} new patterns`);
  
  await service.disconnect();
}

syncPatterns();
```

#### Fetch Specific Product Patterns

```typescript
import { TagScoutClient } from './tagscout-client';
import { PatternConverter } from './pattern-converter';

async function getJabberPatterns() {
  const client = TagScoutClient.fromEnvironment();
  await client.connect();

  // Fetch Jabber annotations
  const annotations = await client.fetchAnnotationsByProduct('Jabber');
  
  // Convert to Log Scout patterns
  const converter = new PatternConverter();
  const patterns = converter.convertToPatternStrings(annotations, {
    validateRegex: true,
    deduplicatePatterns: true,
    optimizePatterns: true
  });

  console.log('Jabber Patterns:');
  console.log(`  Errors: ${patterns.errors.length}`);
  console.log(`  Warnings: ${patterns.warnings.length}`);
  console.log(`  Info: ${patterns.info.length}`);

  await client.disconnect();
  
  return patterns;
}
```

#### Search Annotations

```typescript
import { TagScoutClient } from './tagscout-client';

async function searchPatterns(searchTerm: string) {
  const client = TagScoutClient.fromEnvironment();
  await client.connect();

  const results = await client.searchAnnotations(searchTerm, {
    product: 'Jabber',
    limit: 50
  });

  results.forEach(annotation => {
    console.log(`${annotation.severity}: ${annotation.description}`);
    console.log(`  Pattern: ${annotation.pattern}`);
  });

  await client.disconnect();
}

searchPatterns('authentication failed');
```

#### Filter by Severity

```typescript
import { TagScoutClient } from './tagscout-client';

async function getErrorPatterns() {
  const client = TagScoutClient.fromEnvironment();
  await client.connect();

  const errors = await client.fetchAnnotationsBySeverity('error', {
    product: 'Jabber',
    limit: 100
  });

  console.log(`Found ${errors.length} error patterns`);

  await client.disconnect();
  return errors;
}
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Log Scout Analyzer                        │
│                   (VS Code Extension)                        │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │
                            │ (patterns)
                            │
┌─────────────────────────────────────────────────────────────┐
│              TagScout Integration Layer                      │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │   Client     │  │  Converter   │  │  Sync Service   │  │
│  │  (MongoDB)   │  │  (Transform) │  │  (Orchestrate)  │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │
                            │ (fetch)
                            │
┌─────────────────────────────────────────────────────────────┐
│                TagScout MongoDB Library                      │
│              task_TagScoutLibrary Database                   │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ Annotations  │  │   Patterns   │  │   Categories    │  │
│  │ Collection   │  │  Collection  │  │   Collection    │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 📦 Components

### 1. TagScout Client (`tagscout-client.ts`)

Handles MongoDB connection and data fetching:

- **Connection management** - Connect/disconnect with retry logic
- **Query operations** - Fetch by product, category, severity, tags
- **Search functionality** - Text search across patterns
- **Statistics** - Get counts and distributions
- **Metadata** - Fetch products, components, categories

### 2. Pattern Converter (`pattern-converter.ts`)

Transforms TagScout annotations to Log Scout format:

- **Pattern conversion** - Map annotation schema to Log Scout
- **Regex validation** - Ensure patterns are valid regex
- **Pattern optimization** - Optimize regex for performance
- **Deduplication** - Remove duplicate patterns
- **Grouping** - Group by severity, category, product
- **Export formats** - VS Code settings, documentation

### 3. Sync Service (`sync-service.ts`)

Orchestrates pattern synchronization:

- **Auto-sync** - Scheduled updates with configurable interval
- **Caching** - Local cache with expiry
- **Merging** - Merge with existing patterns
- **Backup** - Backup before sync
- **Status tracking** - Monitor sync status and history
- **Error handling** - Robust error handling and recovery

### 4. CLI (`cli.ts`)

Command-line interface for all operations:

- **Interactive commands** - User-friendly CLI
- **Progress indicators** - Visual feedback
- **Error reporting** - Clear error messages
- **Help system** - Comprehensive help and examples

## 🔧 Configuration

### Environment Variables

```bash
# Optional: Override default connection string
export TAGSCOUT_MONGODB_URI="mongodb://user:pass@host:27017/database?tls=true"
```

### Sync Configuration

```typescript
interface SyncConfig {
  autoSync?: boolean;           // Enable auto-sync
  syncInterval?: number;        // Interval in minutes (default: 60)
  cacheDir?: string;            // Cache directory path
  cacheExpiry?: number;         // Cache expiry in hours (default: 24)
  products?: string[];          // Filter by products
  severities?: string[];        // Filter by severities
  categories?: string[];        // Filter by categories
  mergeWithExisting?: boolean;  // Merge with existing patterns (default: true)
  backupBeforeSync?: boolean;   // Backup before sync (default: true)
}
```

### Conversion Options

```typescript
interface ConversionOptions {
  validateRegex?: boolean;        // Validate patterns are valid regex
  optimizePatterns?: boolean;     // Optimize regex patterns
  includeMetadata?: boolean;      // Include pattern metadata
  filterByProduct?: string[];     // Filter by products
  filterBySeverity?: string[];    // Filter by severities
  filterByCategory?: string[];    // Filter by categories
  deduplicatePatterns?: boolean;  // Remove duplicates
  sortByPriority?: boolean;       // Sort by priority (severity)
}
```

## 📊 Pattern Format

### TagScout Annotation (Input)

```typescript
{
  _id: "507f1f77bcf86cd799439011",
  pattern: "\\b(ERROR|FAIL)\\b",
  category: "network",
  severity: "error",
  description: "Network connection failure",
  tags: ["network", "connection", "error"],
  product: "Jabber",
  component: "NetworkManager",
  regex: "(?i)connection\\s+(failed|timeout)",
  examples: [
    "ERROR: Connection failed to server",
    "FAIL: Connection timeout after 30s"
  ],
  metadata: {
    author: "john.doe",
    createdAt: "2024-01-15T10:30:00Z",
    updatedAt: "2024-01-20T14:45:00Z",
    version: "1.2"
  }
}
```

### Log Scout Pattern (Output)

```typescript
{
  pattern: "(?i)connection\\s+(failed|timeout)",
  severity: "error",
  category: "network",
  message: "Network connection failure",
  tags: ["network", "connection", "error"],
  product: "Jabber",
  component: "NetworkManager",
  source: "tagscout",
  metadata: {
    id: "507f1f77bcf86cd799439011",
    version: "1.2",
    author: "john.doe",
    lastUpdated: "2024-01-20T14:45:00Z"
  }
}
```

### VS Code Settings Format

```json
{
  "logScoutAnalyzer.patterns.errors": [
    "(?i)connection\\s+(failed|timeout)",
    "(?i)authentication\\s+failed",
    "(?i)unable\\s+to\\s+connect"
  ],
  "logScoutAnalyzer.patterns.warnings": [
    "(?i)retrying\\s+connection",
    "(?i)slow\\s+response"
  ],
  "logScoutAnalyzer.patterns.info": [
    "(?i)connection\\s+established",
    "(?i)authenticated\\s+successfully"
  ]
}
```

## 🎯 Use Cases

### 1. Sync Jabber Patterns

```bash
# Fetch and sync all Jabber patterns
npx tagscout-cli sync --product Jabber

# Export to VS Code settings
npx tagscout-cli export --product Jabber --output jabber-settings.json

# Generate documentation
npx tagscout-cli docs --product Jabber --output JABBER_PATTERNS.md
```

### 2. Auto-Update Patterns

```typescript
// Start auto-sync daemon
import { createSyncService } from './sync-service';

const service = await createSyncService({
  autoSync: true,
  syncInterval: 30,  // Every 30 minutes
  products: ['Jabber', 'CUCM'],
  mergeWithExisting: true
});

service.start();
```

### 3. Custom Pattern Pipeline

```typescript
import { TagScoutClient } from './tagscout-client';
import { PatternConverter } from './pattern-converter';

async function customPipeline() {
  // Fetch annotations
  const client = TagScoutClient.fromEnvironment();
  await client.connect();
  
  const annotations = await client.fetchAnnotations({
    product: 'Jabber',
    severity: ['error', 'warning'],
    tags: ['network', 'authentication']
  });

  // Convert with custom options
  const converter = new PatternConverter();
  const patterns = converter.convertAnnotations(annotations, {
    validateRegex: true,
    optimizePatterns: true,
    filterBySeverity: ['error'],
    deduplicatePatterns: true
  });

  // Filter and process
  const criticalPatterns = patterns.filter(p => 
    p.category === 'network' || p.category === 'authentication'
  );

  // Generate custom output
  console.log(`Found ${criticalPatterns.length} critical patterns`);
  
  await client.disconnect();
}
```

### 4. Pattern Statistics Dashboard

```typescript
import { TagScoutClient } from './tagscout-client';

async function generateDashboard() {
  const client = TagScoutClient.fromEnvironment();
  await client.connect();

  // Get overall stats
  const stats = await client.getStatistics();
  
  console.log('=== TagScout Pattern Dashboard ===');
  console.log(`Total Patterns: ${stats.total}`);
  
  console.log('\nBy Severity:');
  for (const [severity, count] of stats.bySeverity) {
    console.log(`  ${severity}: ${count}`);
  }
  
  console.log('\nBy Product:');
  for (const [product, count] of stats.byProduct) {
    console.log(`  ${product}: ${count}`);
  }
  
  console.log('\nTop Categories:');
  const topCategories = Array.from(stats.byCategory.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
    
  for (const [category, count] of topCategories) {
    console.log(`  ${category}: ${count}`);
  }
  
  await client.disconnect();
}
```

## 🔍 Examples

See the `examples/` directory for complete examples:

- `basic-sync.ts` - Basic synchronization
- `product-specific.ts` - Product-specific patterns
- `custom-filters.ts` - Custom filtering and processing
- `auto-sync-daemon.ts` - Long-running auto-sync service
- `export-all-products.ts` - Export patterns for all products
- `search-patterns.ts` - Search and query patterns
- `merge-patterns.ts` - Merge TagScout with custom patterns

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm test -- --coverage

# Test specific file
npm test tagscout-client.test.ts
```

## 🐛 Troubleshooting

### Connection Issues

**Problem**: Cannot connect to TagScout MongoDB

**Solutions**:
1. Verify you're on Cisco internal network or VPN
2. Check connection string is correct
3. Verify read-only credentials are valid
4. Test with: `npx tagscout-cli test`

### Pattern Validation Errors

**Problem**: Invalid regex patterns causing errors

**Solutions**:
1. Enable regex validation: `validateRegex: true`
2. Check pattern syntax in TagScout database
3. Use pattern optimization: `optimizePatterns: true`
4. Report invalid patterns to TagScout maintainers

### Cache Issues

**Problem**: Outdated patterns being used

**Solutions**:
1. Clear cache: `npx tagscout-cli clear-cache`
2. Force refresh: `npx tagscout-cli sync --force`
3. Check cache expiry setting
4. Verify cache directory permissions

### Performance Issues

**Problem**: Slow sync or query operations

**Solutions**:
1. Use caching for repeated queries
2. Filter by product/category to reduce data
3. Increase MongoDB connection pool size
4. Use pagination for large result sets

## 📈 Performance

- **Connection**: ~500ms initial connection
- **Fetch 1000 annotations**: ~2-3 seconds
- **Convert patterns**: ~100-200ms
- **Cache read**: ~10-20ms
- **Full sync (5000 patterns)**: ~5-8 seconds

## 🔒 Security

- **Read-only access** - Cannot modify TagScout database
- **TLS encryption** - All connections encrypted
- **Credential management** - Use environment variables
- **No sensitive data** - Patterns contain no user data
- **Audit logging** - All operations logged

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📄 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- TagScout Library maintainers for curated patterns
- Log Scout Analyzer team
- Cisco collaboration tools team

## 📞 Support

- **Issues**: GitHub Issues
- **Questions**: Team chat channel
- **Documentation**: [Link to full docs]

## 🗺️ Roadmap

- [ ] Real-time pattern updates via change streams
- [ ] Pattern versioning and rollback
- [ ] Custom pattern contribution to TagScout
- [ ] ML-based pattern suggestions
- [ ] Pattern effectiveness metrics
- [ ] Integration with other log analysis tools

---

**Version**: 1.0.0  
**Last Updated**: February 2026  
**Maintainer**: Log Scout Team