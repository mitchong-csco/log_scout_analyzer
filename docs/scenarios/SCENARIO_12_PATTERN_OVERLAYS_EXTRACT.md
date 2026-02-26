# Scenario 12: Pattern Overlays - Field Extraction for Metrics 📋

**Status:** 📋 Planned  
**Priority:** Medium  
**Feature Area:** Pattern Overlays  
**User Persona:** Sarah the Cisco UC Engineer

---

## 🎯 User Story

*"As Sarah, I want to extract response times from database logs to find the slowest queries."*

---

## 📖 Context

Sarah is investigating performance issues in case 700435046. The database logs contain query completion messages with timing information, but it's buried in unstructured text:

```
2026-02-24 10:15:23,456 INFO - Database query completed in 1247ms for UPDATE operation
2026-02-24 10:15:24,123 INFO - Database query completed in 45ms for SELECT operation
2026-02-24 10:15:25,789 INFO - Database query completed in 2301ms for UPDATE operation
```

Sarah needs to:
- **Extract** structured data (duration, query type) from unstructured logs
- **Aggregate** metrics (average, max, min) across thousands of queries
- **Identify** performance outliers (slowest queries)
- **Visualize** performance by query type
- **Export** structured data to CSV for further analysis

Manual extraction is error-prone and doesn't scale to 10,000+ log entries.

---

## 🎬 Target User Flow

### Step 1: Identify Data to Extract
1. Sarah opens RTMT bundle for case 700435046
2. She notices database performance logs with timing information
3. Pattern: `Database query completed in <duration>ms for <query_type>`
4. She wants to extract `duration` and `query_type` as structured fields

### Step 2: Create Extract Overlay
5. Sarah opens Command Palette (Ctrl+Shift+P)
6. Types "Create Pattern Overlay"
7. Selects **"Create Pattern Overlay"**
8. Dialog appears:

```
┌─────────────────────────────────────────────────┐
│ Create Pattern Overlay                          │
├─────────────────────────────────────────────────┤
│                                                 │
│ Layer Name:                                     │
│ [Database Performance Metrics]                  │
│                                                 │
│ Pattern with Capture Groups:                    │
│ [Database query completed in (?P<duration>\d+)  │
│  ms for (?P<query_type>\w+)]                   │
│                                                 │
│ Scope:                                          │
│ ○ All bundles                                   │
│ ● This bundle only (700435046)                  │
│ ○ Hostname: [_____________________ ▼]          │
│                                                 │
│ Action:                                         │
│ ○ Suppress (hide from Problems Panel)          │
│ ○ Add tags: [____________]                     │
│ ● Extract fields to structured data            │
│                                                 │
│ Field Definitions:                              │
│ ┌────────────────────────────────────────────┐ │
│ │ Field Name   │ Type     │ Capture Group   │ │
│ │──────────────┼──────────┼─────────────────│ │
│ │ duration     │ integer  │ (?P<duration>)  │ │
│ │ query_type   │ string   │ (?P<query_type>)│ │
│ │              │          │                 │ │
│ │ [+ Add Field]                             │ │
│ └────────────────────────────────────────────┘ │
│                                                 │
│ State:                                          │
│ ○ Draft (inactive, for editing)                │
│ ● Staged (preview mode)                        │
│ ○ Active (apply immediately)                   │
│                                                 │
│        [Preview]  [Cancel]  [Save Overlay]     │
└─────────────────────────────────────────────────┘
```

### Step 3: Preview Extracted Data
9. Sarah clicks **"Preview"**
10. Preview panel shows extracted fields from sample logs:

```
┌─────────────────────────────────────────────────────────────┐
│ Preview: Database Performance Metrics                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ✅ 3,247 log entries matched                                │
│ ✅ Extracted 2 fields: duration, query_type                 │
│                                                             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                             │
│ 📊 Summary Statistics:                                      │
│                                                             │
│ duration (integer):                                         │
│   • Min:     12ms                                           │
│   • Max:     4,582ms                                        │
│   • Avg:     687ms                                          │
│   • Median:  421ms                                          │
│   • p95:     1,847ms                                        │
│                                                             │
│ query_type (string):                                        │
│   • SELECT:  1,847 entries (avg: 156ms)                    │
│   • UPDATE:  1,204 entries (avg: 1,247ms) ⚠️               │
│   • INSERT:  196 entries (avg: 89ms)                       │
│                                                             │
│ ⚠️  Slowest Queries (>2000ms):                              │
│   • UPDATE: 47 occurrences (max: 4,582ms)                  │
│   • SELECT: 3 occurrences (max: 2,301ms)                   │
│                                                             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                             │
│ Sample Extracted Records (first 5):                         │
│                                                             │
│ 1. duration=1247, query_type=UPDATE                         │
│    📄 CCM00000001.txt:1423                                  │
│                                                             │
│ 2. duration=45, query_type=SELECT                           │
│    📄 CCM00000001.txt:1424                                  │
│                                                             │
│ 3. duration=2301, query_type=UPDATE                         │
│    📄 CCM00000001.txt:1426                                  │
│                                                             │
│ 4. duration=89, query_type=INSERT                           │
│    📄 CCM00000001.txt:1428                                  │
│                                                             │
│ 5. duration=421, query_type=SELECT                          │
│    📄 CCM00000001.txt:1429                                  │
│                                                             │
│               [Cancel]  [Activate Overlay]                  │
└─────────────────────────────────────────────────────────────┘
```

### Step 4: Activate Overlay
11. Sarah confirms and clicks **"Activate Overlay"**
12. Overlay state changes from "Staged" → "Active"
13. Fields are extracted from all 3,247 matching log entries

### Step 5: View Aggregated Metrics
14. Tree view shows extracted data grouped by query type:

```
📦 SCOUT RESULTS (Extracted Metrics)
├─ 📊 Database Performance Metrics
│  ├─ 📈 SELECT (1,847 queries)
│  │  ├─ Avg: 156ms
│  │  ├─ Max: 2,301ms
│  │  ├─ Min: 12ms
│  │  └─ [View Details]
│  ├─ 📈 UPDATE (1,204 queries) ⚠️
│  │  ├─ Avg: 1,247ms
│  │  ├─ Max: 4,582ms ❌
│  │  ├─ Min: 234ms
│  │  └─ [View Details]
│  └─ 📈 INSERT (196 queries)
│     ├─ Avg: 89ms
│     ├─ Max: 345ms
│     └─ Min: 23ms
```

### Step 6: Drill Down to Slow Queries
15. Sarah clicks "UPDATE (1,204 queries)" to expand
16. Sees detailed breakdown:
    - 47 queries > 2000ms (flagged as outliers)
    - Most slow queries between 10:15-10:18 (possible spike)
17. Clicks "View Details" on slowest query (4,582ms)
18. Jumps to log file at exact line with full context

### Step 7: Export Structured Data
19. Sarah right-clicks "Database Performance Metrics"
20. Selects **"Export to CSV"**
21. File saved: `db-performance-700435046.csv`

```csv
timestamp,file,line,duration,query_type,severity
2026-02-24T10:15:23.456,CCM00000001.txt,1423,1247,UPDATE,INFO
2026-02-24T10:15:24.123,CCM00000001.txt,1424,45,SELECT,INFO
2026-02-24T10:15:25.789,CCM00000001.txt,1426,2301,UPDATE,WARNING
...
```

22. Sarah imports into Excel/Python for deeper analysis
23. Creates performance charts and identifies UPDATE query bottleneck
24. Attaches findings to TAC case

---

## ✅ Success Criteria

### Functional Requirements
- ✅ **Regex capture groups → structured fields** - Named groups become fields
- ✅ **Type coercion** - String → integer/float/boolean/datetime
- ✅ **Aggregation** - Calculate avg, max, min, sum, count
- ✅ **Grouping** - Group by any extracted field
- ✅ **Filtering** - Filter by field value ranges
- ✅ **Export to CSV** - Structured data export with headers

### User Experience
- ✅ **< 5 clicks** to create extract overlay
- ✅ **< 3 seconds** to extract 10k records
- ✅ **Visual preview** - See sample extracted data before activation
- ✅ **Inline validation** - Regex tested against sample logs
- ✅ **Clear errors** - Helpful messages for invalid patterns

### Technical
- ✅ **Performance** - Extract 10k records in < 1 second
- ✅ **Memory efficient** - Stream processing for large files
- ✅ **Type safety** - Type validation for extracted fields
- ✅ **Error handling** - Graceful handling of regex mismatches

---

## 📊 Acceptance Tests

### Test 1: Create Extract Overlay
```gherkin
Given Sarah has opened bundle "700435046"
When she creates an overlay with action "Extract fields"
And defines pattern "Database query completed in (?P<duration>\d+)ms for (?P<query_type>\w+)"
And maps capture groups to fields {duration: integer, query_type: string}
And saves in "Active" state
Then 3,247 records are extracted
And fields are available in tree view
```

### Test 2: Type Coercion
```gherkin
Given an extract overlay with field "duration" type "integer"
When the pattern matches "1247ms"
Then the extracted value is 1247 (integer)
And not "1247" (string)
```

### Test 3: Aggregation
```gherkin
Given 1,204 UPDATE queries are extracted with durations
When Sarah views the "UPDATE" group in tree view
Then summary shows:
  • Avg: 1,247ms
  • Max: 4,582ms
  • Min: 234ms
  • Count: 1,204
```

### Test 4: Filter by Value Range
```gherkin
Given extracted field "duration" with values 12ms to 4,582ms
When Sarah filters "duration > 2000"
Then tree view shows only 50 entries
And all have duration > 2000ms
```

### Test 5: Export to CSV
```gherkin
Given 3,247 records are extracted
When Sarah right-clicks the metrics group and selects "Export to CSV"
Then a CSV file is created with:
  • Header row with field names
  • 3,247 data rows
  • Metadata columns (timestamp, file, line)
```

### Test 6: Regex Validation
```gherkin
Given Sarah is creating an extract overlay
When she enters pattern with capture group "(?P<duration>\d+)"
But field name is "query_time" (doesn't match group name)
Then validation error is shown
And pattern cannot be saved until fixed
```

---

## 🏗️ Technical Implementation

### Data Structure (JSON)

```json
{
  "layerId": "overlay-db-performance",
  "name": "Database Performance Metrics",
  "type": "case",
  "priority": 100,
  "scope": {
    "level": "bundle",
    "id": "700435046"
  },
  "state": "active",
  "enabled": true,
  "version": "1.0.0",
  "author": "sarah@mihomes.com",
  "createdAt": "2026-02-24T11:30:00Z",
  "updatedAt": "2026-02-24T11:30:00Z",
  "rules": [
    {
      "id": "extract-db-performance",
      "signature": {
        "type": "regex",
        "pattern": "Database query completed in (?P<duration>\\d+)ms for (?P<query_type>\\w+)",
        "flags": "i"
      },
      "action": {
        "type": "extract",
        "fields": {
          "duration": {
            "type": "integer",
            "captureGroup": "duration",
            "unit": "ms"
          },
          "query_type": {
            "type": "string",
            "captureGroup": "query_type"
          }
        }
      },
      "priority": 1,
      "state": "active",
      "notes": "Extract DB query performance metrics for analysis"
    }
  ]
}
```

### Extracted Record Type

```typescript
interface ExtractedRecord {
  id: string;                      // Unique record ID
  overlayId: string;               // Which overlay extracted this
  ruleId: string;                  // Which rule matched
  
  // Source location
  source: {
    file: string;                  // CCM00000001.txt
    line: number;                  // 1423
    timestamp: Date;               // Parsed from log
    rawMessage: string;            // Original log line
  };
  
  // Extracted fields (dynamic based on overlay definition)
  fields: Record<string, any>;     // {duration: 1247, query_type: "UPDATE"}
  
  // Metadata
  extractedAt: Date;
  version: string;                 // Overlay version
}

interface ExtractedFieldDefinition {
  type: 'string' | 'integer' | 'float' | 'boolean' | 'datetime';
  captureGroup: string;            // Must match (?P<name>) in pattern
  unit?: string;                   // Optional unit (ms, MB, %)
  transform?: (value: string) => any;  // Optional transformation
}
```

### Code Flow

```typescript
// 1. Extract Action Implementation
export function applyExtract(
  logEntries: LogEntry[], 
  rule: Rule
): ExtractedRecord[] {
  const regex = new RegExp(rule.signature.pattern, rule.signature.flags || 'i');
  const action = rule.action as ExtractAction;
  const records: ExtractedRecord[] = [];
  
  logEntries.forEach(entry => {
    const match = regex.exec(entry.message);
    if (!match || !match.groups) {
      return; // No match
    }
    
    // Extract and coerce fields
    const fields: Record<string, any> = {};
    for (const [fieldName, fieldDef] of Object.entries(action.fields)) {
      const rawValue = match.groups[fieldDef.captureGroup];
      if (rawValue !== undefined) {
        fields[fieldName] = coerceType(rawValue, fieldDef.type);
      }
    }
    
    // Create extracted record
    records.push({
      id: generateId(),
      overlayId: rule.overlayId,
      ruleId: rule.id,
      source: {
        file: entry.file,
        line: entry.line,
        timestamp: entry.timestamp,
        rawMessage: entry.message
      },
      fields,
      extractedAt: new Date(),
      version: '1.0.0'
    });
  });
  
  return records;
}

// 2. Type Coercion
function coerceType(value: string, type: FieldType): any {
  switch (type) {
    case 'integer':
      return parseInt(value, 10);
    case 'float':
      return parseFloat(value);
    case 'boolean':
      return value.toLowerCase() === 'true';
    case 'datetime':
      return new Date(value);
    case 'string':
    default:
      return value;
  }
}

// 3. Aggregation Engine
class MetricsAggregator {
  aggregate(records: ExtractedRecord[], field: string): AggregateStats {
    const values = records
      .map(r => r.fields[field])
      .filter(v => typeof v === 'number');
    
    if (values.length === 0) {
      return { count: 0 };
    }
    
    values.sort((a, b) => a - b);
    
    return {
      count: values.length,
      min: values[0],
      max: values[values.length - 1],
      avg: values.reduce((sum, v) => sum + v, 0) / values.length,
      median: values[Math.floor(values.length / 2)],
      p95: values[Math.floor(values.length * 0.95)],
      sum: values.reduce((sum, v) => sum + v, 0)
    };
  }
  
  groupBy(records: ExtractedRecord[], field: string): Record<string, ExtractedRecord[]> {
    const groups: Record<string, ExtractedRecord[]> = {};
    
    records.forEach(record => {
      const key = String(record.fields[field] ?? 'null');
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(record);
    });
    
    return groups;
  }
}

// 4. CSV Export
class CSVExporter {
  export(records: ExtractedRecord[]): string {
    if (records.length === 0) {
      return '';
    }
    
    // Build header from first record's fields
    const fieldNames = Object.keys(records[0].fields);
    const header = ['timestamp', 'file', 'line', ...fieldNames].join(',');
    
    // Build rows
    const rows = records.map(record => {
      const values = [
        record.source.timestamp.toISOString(),
        record.source.file,
        record.source.line,
        ...fieldNames.map(field => record.fields[field] ?? '')
      ];
      return values.join(',');
    });
    
    return [header, ...rows].join('\n');
  }
}
```

---

## 🎨 UI Mockups

### Extract Overlay Dialog

```
┌─────────────────────────────────────────────────┐
│ Create Pattern Overlay - Extract Fields         │
├─────────────────────────────────────────────────┤
│                                                 │
│ Pattern (with named capture groups):            │
│ ┌─────────────────────────────────────────────┐ │
│ │ Database query completed in (?P<duration>   │ │
│ │ \d+)ms for (?P<query_type>\w+)             │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ [Test Pattern] ✅ 3,247 matches                 │
│                                                 │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                 │
│ Field Mappings:                                  │
│                                                 │
│ ┌────────────────────────────────────────────┐ │
│ │ Field      │ Type    │ Capture Group      │ │
│ │────────────┼─────────┼────────────────────│ │
│ │ duration   │ integer │ duration           │ │
│ │ query_type │ string  │ query_type         │ │
│ │            │         │                    │ │
│ │ [+ Add Field]                             │ │
│ └────────────────────────────────────────────┘ │
│                                                 │
│ Available Types:                                │
│ • string    • integer   • float                 │
│ • boolean   • datetime                          │
│                                                 │
│        [Preview]  [Cancel]  [Save]              │
└─────────────────────────────────────────────────┘
```

### Metrics Tree View

```
📦 EXTRACTED METRICS
└─ 📊 Database Performance (3,247 records)
   ├─ Group by: [query_type ▼] [duration range] [timestamp]
   │
   ├─ 📈 SELECT (1,847 records)
   │  ├─ Avg: 156ms, Max: 2,301ms, Min: 12ms
   │  ├─ 📄 Slow queries (>500ms): 47 records
   │  └─ [View All] [Export CSV] [Create Chart]
   │
   ├─ 📈 UPDATE (1,204 records) ⚠️
   │  ├─ Avg: 1,247ms, Max: 4,582ms, Min: 234ms
   │  ├─ 📄 Slow queries (>2000ms): 47 records ❌
   │  │  ├─ Line 1426: 2,301ms
   │  │  ├─ Line 2847: 4,582ms 🔥
   │  │  └─ Line 3142: 3,847ms
   │  └─ [View All] [Export CSV] [Create Chart]
   │
   └─ 📈 INSERT (196 records)
      ├─ Avg: 89ms, Max: 345ms, Min: 23ms
      └─ [View All] [Export CSV] [Create Chart]
```

### Metrics Detail Panel

```
┌─────────────────────────────────────────────────────────────┐
│ Database Performance: UPDATE Queries                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 📊 Statistics (1,204 queries)                               │
│                                                             │
│   Duration (ms):                                            │
│   ├─ Min:     234ms                                         │
│   ├─ Max:     4,582ms                                       │
│   ├─ Avg:     1,247ms                                       │
│   ├─ Median:  1,108ms                                       │
│   └─ p95:     2,847ms                                       │
│                                                             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                             │
│ 📈 Distribution:                                            │
│                                                             │
│   0-500ms:    ████████████ (234 queries, 19%)              │
│   500-1000ms: █████████████████████ (547 queries, 45%)     │
│   1000-2000ms:███████████ (376 queries, 31%)               │
│   >2000ms:    ██ (47 queries, 4%) ⚠️                        │
│                                                             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                             │
│ 🔥 Top 5 Slowest:                                           │
│                                                             │
│   1. 4,582ms - CCM00000001.txt:2847 [Go to Line]           │
│   2. 3,847ms - CCM00000001.txt:3142 [Go to Line]           │
│   3. 3,124ms - CCM00000002.txt:1456 [Go to Line]           │
│   4. 2,901ms - CCM00000001.txt:4721 [Go to Line]           │
│   5. 2,789ms - CCM00000003.txt:789  [Go to Line]           │
│                                                             │
│        [Export CSV]  [Create Alert]  [Share]                │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Implementation Phases

### Phase 1: Core Extract Action (Week 4)
- [ ] Define `ExtractAction` and `ExtractedRecord` types
- [ ] Implement regex capture group parsing
- [ ] Build type coercion system
- [ ] Write tests for extraction logic
- [ ] Performance test: 10k records in < 1s

### Phase 2: Storage & Indexing (Week 4)
- [ ] Store extracted records in memory cache
- [ ] Build index for fast filtering
- [ ] Implement grouping engine
- [ ] Add persistence layer (optional)

### Phase 3: Aggregation Engine (Week 5)
- [ ] Implement statistical aggregations (avg, max, min, etc.)
- [ ] Build grouping functionality
- [ ] Add filtering by field values
- [ ] Test with large datasets

### Phase 4: UI - Metrics Tree View (Week 5)
- [ ] Create metrics tree provider
- [ ] Show aggregated statistics
- [ ] Add drill-down navigation
- [ ] Implement "Go to Line" links

### Phase 5: CSV Export (Week 6)
- [ ] Build CSV exporter
- [ ] Add metadata columns
- [ ] Handle special characters/escaping
- [ ] Test with various field types

### Phase 6: Advanced Features (Week 6+)
- [ ] Regex pattern tester with sample data
- [ ] Visual chart generation
- [ ] Custom aggregation functions
- [ ] Field transformations (optional)

---

## 📊 Success Metrics

### Developer Metrics
- ✅ 95%+ test coverage for extract action
- ✅ < 1 second to extract 10k records
- ✅ < 100ms to aggregate metrics
- ✅ Zero data loss in extraction

### User Metrics
- ✅ 60% of users create at least one extract overlay
- ✅ Average 2-3 extracted metric sets per case
- ✅ 80% export to CSV for further analysis
- ✅ Average time to insights: < 5 minutes

### Business Impact
- ✅ 70% faster performance analysis
- ✅ Quantitative data for TAC cases
- ✅ Proactive issue detection (outliers)
- ✅ Reusable metrics across similar cases

---

## 🔗 Related Documentation

- **Scenario 10:** Pattern Overlays - Suppress (related action type)
- **Scenario 11:** Pattern Overlays - Tagging (related action type)
- **Technical Design:** `PATTERN_OVERLAYS_SCENARIOS.md` (Extract Action)
- **Implementation TODO:** `PATTERN_OVERLAYS_TODO.md` (Phase 4)
- **Quick Reference:** `PATTERN_OVERLAYS_QUICK_REF.md` (Extract Action)

---

## 📝 Notes

### Design Decisions
1. **Why named capture groups?** - Clear field mapping, self-documenting patterns
2. **Why type coercion?** - Enable numeric aggregations, not just string operations
3. **Why CSV export?** - Universal format, works with Excel/Python/R
4. **Why in-memory cache?** - Fast filtering/grouping, acceptable for typical bundle sizes

### Edge Cases
- **Missing capture group** - Field value = null, logged as warning
- **Type coercion failure** - Fall back to string, log error
- **Duplicate field names** - Last extraction wins, show warning
- **Large datasets** - Stream processing for files >1GB

### Performance Optimizations
- **Compiled regex cache** - Compile once, reuse for all log entries
- **Lazy evaluation** - Only extract when metrics view is opened
- **Indexed fields** - Fast filtering without full scan
- **Chunked processing** - Process 1000 records at a time

### Future Enhancements
- **Visual query builder** - No-code pattern creation
- **Time-series analysis** - Metrics over time with trend lines
- **Alerts** - Notify when metrics exceed thresholds
- **Correlation** - Find relationships between extracted fields
- **AI suggestions** - Suggest useful fields to extract

---

**Last Updated:** 2026-02-24  
**Status:** Ready for Implementation (Phase 4)  
**Assigned To:** TBD