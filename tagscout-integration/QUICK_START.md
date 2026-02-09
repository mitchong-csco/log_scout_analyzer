# TagScout Integration - Quick Start Guide

> Get up and running with TagScout patterns in 5 minutes

## 🎯 What You'll Achieve

By the end of this guide, you'll have:
- ✅ Connected to TagScout MongoDB
- ✅ Synced patterns to your local system
- ✅ Exported patterns for use in Log Scout Analyzer
- ✅ Generated pattern documentation

---

## 📋 Prerequisites

- Node.js 16+ installed
- Access to Cisco internal network or VPN
- VS Code with Log Scout Analyzer extension installed

---

## 🚀 5-Minute Setup

### Step 1: Install Dependencies (30 seconds)

```bash
cd log_scout_analyzer/tagscout-integration
npm install
```

### Step 2: Build the Project (30 seconds)

```bash
npm run build
```

### Step 3: Test Connection (30 seconds)

```bash
npm run test-connection
```

**Expected Output:**
```
✓ Connected to TagScout MongoDB: task_TagScoutLibrary
✓ Connection successful!

Database Information:
  Database: task_TagScoutLibrary
  Available Products (15):
    - Jabber
    - CUCM
    - Webex
    - Unity Connection
    ...
```

✅ **If you see the above, you're ready to go!**

❌ **If connection fails:**
- Ensure you're on Cisco VPN
- Check network connectivity
- Verify MongoDB credentials

### Step 4: Sync Patterns (2 minutes)

```bash
npm run sync
```

**What happens:**
1. Connects to TagScout MongoDB
2. Fetches all available annotations
3. Converts to Log Scout format
4. Validates and optimizes patterns
5. Caches locally for fast access

**Expected Output:**
```
🔄 Starting TagScout pattern sync...
📥 Fetching annotations from TagScout...
✓ Fetched 5234 annotations
🔄 Converting annotations to patterns...
✓ Converted 5180 patterns
  - Errors: 1234
  - Warnings: 1567
  - Info: 1845
  - Debug: 534
✓ Cached patterns to .tagscout-cache/tagscout-patterns.json
✓ Sync completed in 5432ms
```

### Step 5: Export for Log Scout (1 minute)

```bash
npx tagscout-cli export --output tagscout-settings.json
```

This creates a `tagscout-settings.json` file with VS Code settings format.

---

## 📝 Using Patterns in Log Scout Analyzer

### Option A: Quick Copy-Paste

1. Open the generated `tagscout-settings.json`
2. Copy the pattern arrays
3. Open VS Code Settings (Ctrl+,)
4. Click "Open Settings (JSON)"
5. Paste the patterns

### Option B: Merge with Existing

```bash
# Generate settings for specific product
npx tagscout-cli export --product Jabber --output jabber-patterns.json
```

Then manually merge with your existing settings.

### VS Code Settings Example

```json
{
  "logScoutAnalyzer.enableDiagnostics": true,
  "logScoutAnalyzer.patterns.errors": [
    "(?i)connection\\s+(failed|timeout|refused)",
    "(?i)authentication\\s+(failed|error)",
    "(?i)unable\\s+to\\s+connect",
    // ... more patterns from TagScout
  ],
  "logScoutAnalyzer.patterns.warnings": [
    "(?i)retrying\\s+connection",
    "(?i)slow\\s+response",
    // ... more patterns
  ],
  "logScoutAnalyzer.patterns.info": [
    "(?i)connection\\s+established",
    "(?i)authenticated\\s+successfully",
    // ... more patterns
  ]
}
```

---

## 🎯 Product-Specific Patterns

### Jabber

```bash
# Sync only Jabber patterns
npx tagscout-cli sync --product Jabber

# Export Jabber settings
npx tagscout-cli export --product Jabber --output jabber-settings.json

# Show Jabber statistics
npx tagscout-cli stats --product Jabber
```

### CUCM

```bash
npx tagscout-cli sync --product CUCM
npx tagscout-cli export --product CUCM --output cucm-settings.json
```

### Webex

```bash
npx tagscout-cli sync --product Webex
npx tagscout-cli export --product Webex --output webex-settings.json
```

---

## 📊 Useful Commands

### View Available Products

```bash
npx tagscout-cli list
```

### Show Pattern Statistics

```bash
npx tagscout-cli stats
```

**Output:**
```
Total Annotations: 5234

By Severity:
  error      1234  (23.6%)
  warning    1567  (29.9%)
  info       1845  (35.2%)
  debug       588  (11.2%)

By Category:
  network              845  (16.1%)
  authentication       678  (13.0%)
  call-control         567  (10.8%)
  media                445  (8.5%)
  ...
```

### Generate Documentation

```bash
npx tagscout-cli docs --output PATTERNS.md
```

Creates comprehensive markdown documentation of all patterns.

### Check Sync Status

```bash
npx tagscout-cli status
```

**Output:**
```
Auto-sync: ✗ Disabled
Currently Running: No
Cache Valid: ✓ Yes
Total Patterns: 5180
Last Sync: 2/9/2026, 8:30:45 AM
```

### Clear Cache

```bash
npx tagscout-cli clear-cache
```

Forces next sync to fetch fresh data from MongoDB.

---

## 🔄 Auto-Sync Mode

Keep patterns automatically updated:

```bash
# Start auto-sync (updates every 60 minutes)
npx tagscout-cli sync --auto-sync

# Custom interval (every 30 minutes)
npx tagscout-cli sync --auto-sync --interval 30
```

**Best Practice:** Run auto-sync in background:
```bash
# Start in background
nohup npx tagscout-cli sync --auto-sync --interval 60 > sync.log 2>&1 &

# Check logs
tail -f sync.log
```

---

## 🧪 Testing Your Setup

### Test 1: Verify Connection

```bash
npx tagscout-cli test
```

Should show successful connection with products and categories.

### Test 2: Fetch Sample Patterns

```bash
npx tagscout-cli sync --product Jabber
npx tagscout-cli export --product Jabber --output test.json
cat test.json
```

Should show valid JSON with pattern arrays.

### Test 3: Check Statistics

```bash
npx tagscout-cli stats --product Jabber
```

Should show detailed statistics for Jabber patterns.

---

## 🎨 Customization

### Custom Sync Configuration

Create `tagscout-config.json`:

```json
{
  "autoSync": false,
  "syncInterval": 60,
  "cacheExpiry": 24,
  "products": ["Jabber", "CUCM"],
  "severities": ["error", "warning"],
  "mergeWithExisting": true,
  "backupBeforeSync": true
}
```

Use in code:
```typescript
import { createSyncService } from './sync-service';
import config from './tagscout-config.json';

const service = await createSyncService(config);
```

### Custom Pattern Filters

```typescript
import { TagScoutClient } from './tagscout-client';
import { PatternConverter } from './pattern-converter';

const client = TagScoutClient.fromEnvironment();
await client.connect();

// Fetch with custom filters
const annotations = await client.fetchAnnotations({
  product: 'Jabber',
  category: 'network',
  severity: ['error', 'warning'],
  tags: ['connection', 'authentication']
});

// Convert with custom options
const converter = new PatternConverter();
const patterns = converter.convertToPatternStrings(annotations, {
  validateRegex: true,
  optimizePatterns: true,
  deduplicatePatterns: true
});
```

---

## 🔍 Common Use Cases

### Use Case 1: Analyzing Jabber Logs

```bash
# 1. Sync Jabber patterns
npx tagscout-cli sync --product Jabber

# 2. Export to settings
npx tagscout-cli export --product Jabber --output jabber-settings.json

# 3. Update VS Code settings with patterns

# 4. Open Jabber log in VS Code
# 5. Run "Scout: Analyze Current File"
# 6. View results in Scout panel
```

### Use Case 2: Team Pattern Sharing

```bash
# 1. Generate documentation for team
npx tagscout-cli docs --product Jabber --output JABBER_PATTERNS.md

# 2. Export settings template
npx tagscout-cli export --product Jabber --output team-settings.json

# 3. Commit to team repo
git add JABBER_PATTERNS.md team-settings.json
git commit -m "Add TagScout patterns for Jabber"
git push
```

### Use Case 3: Multi-Product Analysis

```bash
# Sync patterns for multiple products
for product in Jabber CUCM Webex Unity; do
  echo "Syncing $product..."
  npx tagscout-cli sync --product $product
  npx tagscout-cli export --product $product --output "${product,,}-settings.json"
done
```

### Use Case 4: Pattern Research

```bash
# Search for specific patterns
npx tagscout-cli list --verbose

# Get detailed statistics
npx tagscout-cli stats --product Jabber --verbose

# Generate comprehensive documentation
npx tagscout-cli docs --output FULL_PATTERNS.md
```

---

## 🐛 Troubleshooting

### Problem: Cannot Connect

**Error:** `Connection failed: getaddrinfo ENOTFOUND`

**Solution:**
1. Verify VPN connection
2. Check you're on Cisco network
3. Test DNS: `nslookup bdb-int-prod-mongos-1.cisco.com`
4. Try with different network

### Problem: No Patterns Found

**Error:** `Fetched 0 annotations`

**Solution:**
1. Check product name: `npx tagscout-cli list`
2. Verify database has data
3. Try without filters: `npx tagscout-cli sync`
4. Check logs for errors

### Problem: Invalid Patterns

**Error:** `Invalid regex pattern: ...`

**Solution:**
1. Enable validation: `validateRegex: true`
2. Skip invalid patterns automatically
3. Report to TagScout maintainers
4. Use pattern optimization

### Problem: Slow Performance

**Symptom:** Sync takes too long

**Solution:**
1. Use cache: Don't use `--force` unless needed
2. Filter by product: `--product Jabber`
3. Check network latency
4. Reduce batch size in code

### Problem: Cache Issues

**Symptom:** Outdated patterns

**Solution:**
```bash
# Clear cache and force refresh
npx tagscout-cli clear-cache
npx tagscout-cli sync --force
```

---

## 📚 Next Steps

### Learn More

- Read [README.md](./README.md) for detailed documentation
- Explore [examples/](./examples/) for code examples
- Check [API documentation](./docs/API.md) for programmatic usage

### Advanced Topics

- Custom pattern pipelines
- Pattern versioning and rollback
- Integration with CI/CD
- Pattern effectiveness metrics
- Contributing patterns to TagScout

### Get Help

- 🐛 Report issues: GitHub Issues
- 💬 Ask questions: Team chat
- 📖 Documentation: Wiki
- 👥 Support: Log Scout team

---

## ✅ Verification Checklist

Before you're done, verify:

- [ ] Connection test passes
- [ ] Patterns synced successfully
- [ ] Settings exported to JSON
- [ ] Patterns working in Log Scout Analyzer
- [ ] Documentation generated (if needed)
- [ ] Cache directory created
- [ ] No errors in logs

---

## 🎉 You're Ready!

Congratulations! You've successfully integrated TagScout patterns with Log Scout Analyzer.

**What you can do now:**
- Analyze logs with thousands of curated patterns
- Keep patterns automatically updated
- Share patterns with your team
- Contribute improvements back to TagScout

**Need help?** Check the troubleshooting section or reach out to the team.

---

**Happy Log Analyzing! 🔍📊🎯**

---

*Version: 1.0.0*  
*Last Updated: February 9, 2026*  
*Maintained by: Log Scout Team*