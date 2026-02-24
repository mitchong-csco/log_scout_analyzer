# Performance Testing Strategy ⚡

## Mission: Fast, Responsive, Scalable

Performance is a feature. Users should never wait unnecessarily or experience lag.

## Core Principle

**If it's slow in tests, it's slow for users. Measure everything.**

```
Performance Regression in Production = Process Failure
Performance Regression in Tests = Process Success
```

## Performance Testing Categories

### 1. Unit Performance Tests (Fast Operations)

Test individual operations complete within acceptable time limits.

```typescript
suite('Performance: Core Operations', () => {
  test('File parsing completes in < 100ms for typical files', () => {
    const typicalLog = generateLogFile({ lines: 1000, size: '50KB' });
    
    const start = performance.now();
    const parsed = parseLogFile(typicalLog);
    const duration = performance.now() - start;
    
    assert.ok(duration < 100, `Parsing took ${duration}ms (expected < 100ms)`);
    assert.ok(parsed.entries.length === 1000, 'Should parse all entries');
  });

  test('Pattern matching is O(n) not O(n²)', () => {
    const sizes = [100, 1000, 10000];
    const times = [];
    
    sizes.forEach(size => {
      const content = generateLogFile({ lines: size });
      const start = performance.now();
      matchPatterns(content, errorPatterns);
      const duration = performance.now() - start;
      times.push(duration);
    });
    
    // Time should scale linearly (within margin)
    // 10x size should be ~10x time, not 100x
    const ratio = times[2] / times[0]; // 10000/100 = 100x size
    assert.ok(
      ratio < 200, // Should be ~100x time, allow 2x margin
      `Performance degrades non-linearly: ${ratio}x slower for 100x data`
    );
  });

  test('Configuration loading is cached', () => {
    const firstLoad = performance.now();
    loadConfig();
    const firstDuration = performance.now() - firstLoad;
    
    const secondLoad = performance.now();
    loadConfig();
    const secondDuration = performance.now() - secondLoad;
    
    // Second load should be at least 10x faster (from cache)
    assert.ok(
      secondDuration < firstDuration / 10,
      `Cache not working: first=${firstDuration}ms, second=${secondDuration}ms`
    );
  });

  test('Tree view updates are debounced', async () => {
    const updateSpy = new UpdateCounter();
    const provider = new TreeDataProvider(updateSpy);
    
    // Trigger 100 rapid updates
    for (let i = 0; i < 100; i++) {
      provider.notifyChange();
    }
    
    await sleep(500); // Wait for debounce
    
    // Should have batched updates, not 100 individual updates
    assert.ok(
      updateSpy.count < 10,
      `Too many updates: ${updateSpy.count} (expected < 10 from debouncing)`
    );
  });
});
```

### 2. Integration Performance Tests (UI Responsiveness)

Test user-facing operations feel instant.

```typescript
suite('Performance: User Experience', () => {
  test('Command execution starts in < 50ms', async () => {
    const start = performance.now();
    const promise = executeCommand('scout.importArchive');
    const timeToStart = performance.now() - start;
    
    assert.ok(
      timeToStart < 50,
      `Command took ${timeToStart}ms to start (expected < 50ms)`
    );
    
    await promise; // Let it complete
  });

  test('Tree view renders in < 100ms for 1000 items', () => {
    const items = generateTreeItems(1000);
    
    const start = performance.now();
    const tree = renderTreeView(items);
    const duration = performance.now() - start;
    
    assert.ok(
      duration < 100,
      `Tree rendering took ${duration}ms (expected < 100ms)`
    );
  });

  test('Search results appear in < 200ms', async () => {
    const largeLog = generateLogFile({ lines: 10000 });
    
    const start = performance.now();
    const results = await searchLog(largeLog, 'ERROR');
    const duration = performance.now() - start;
    
    assert.ok(
      duration < 200,
      `Search took ${duration}ms (expected < 200ms)`
    );
  });

  test('Syntax highlighting does not block UI', async () => {
    const largeFile = generateLogFile({ lines: 5000 });
    
    const start = performance.now();
    await applySyntaxHighlighting(largeFile);
    const duration = performance.now() - start;
    
    // Should be async and not block
    assert.ok(
      duration < 500,
      `Highlighting blocked for ${duration}ms (expected < 500ms)`
    );
  });
});
```

### 3. Scalability Tests (Large Data)

Test system handles large datasets gracefully.

```typescript
suite('Performance: Scalability', () => {
  test('Handles 10MB log file without hanging', async () => {
    const largeLog = generateLogFile({ size: '10MB' });
    
    const start = performance.now();
    const result = await importLog(largeLog);
    const duration = performance.now() - start;
    
    assert.ok(duration < 5000, `Import took ${duration}ms (expected < 5s)`);
    assert.ok(result.success, 'Should complete successfully');
  });

  test('Handles 1000+ bundles in tree view', () => {
    const manyBundles = generateBundles(1000);
    
    const start = performance.now();
    const provider = new BundleTreeProvider(manyBundles);
    const items = provider.getChildren();
    const duration = performance.now() - start;
    
    assert.ok(
      duration < 500,
      `Tree with 1000 bundles took ${duration}ms (expected < 500ms)`
    );
  });

  test('Memory usage stays under 500MB for large operations', async () => {
    const initialMemory = process.memoryUsage().heapUsed;
    
    // Process large file
    const hugeLog = generateLogFile({ size: '50MB' });
    await processLog(hugeLog);
    
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB
    
    assert.ok(
      memoryIncrease < 500,
      `Memory increased by ${memoryIncrease}MB (expected < 500MB)`
    );
  });

  test('Archive extraction handles 100+ files', async () => {
    const largeArchive = generateArchive({ files: 100 });
    
    const start = performance.now();
    const result = await extractArchive(largeArchive);
    const duration = performance.now() - start;
    
    assert.ok(
      duration < 10000,
      `Extraction took ${duration}ms (expected < 10s)`
    );
    assert.strictEqual(result.files.length, 100, 'Should extract all files');
  });

  test('Streaming large files does not load entire file into memory', async () => {
    const hugeLog = generateLogFile({ size: '100MB' });
    const initialMemory = process.memoryUsage().heapUsed;
    
    // Process using streaming
    await processLogStream(hugeLog);
    
    const peakMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = (peakMemory - initialMemory) / 1024 / 1024; // MB
    
    // Should use streaming, not load entire 100MB
    assert.ok(
      memoryIncrease < 50,
      `Memory increased by ${memoryIncrease}MB for 100MB file (should stream)`
    );
  });
});
```

### 4. LSP Performance Tests (Language Server)

Test LSP operations are responsive.

```typescript
suite('Performance: LSP Operations', () => {
  test('LSP server starts in < 2 seconds', async () => {
    const start = performance.now();
    await startLSPServer();
    const duration = performance.now() - start;
    
    assert.ok(
      duration < 2000,
      `LSP startup took ${duration}ms (expected < 2s)`
    );
  });

  test('Diagnostics computed in < 500ms', async () => {
    const document = generateLogDocument({ lines: 1000 });
    
    const start = performance.now();
    const diagnostics = await computeDiagnostics(document);
    const duration = performance.now() - start;
    
    assert.ok(
      duration < 500,
      `Diagnostics took ${duration}ms (expected < 500ms)`
    );
  });

  test('Autocomplete responds in < 100ms', async () => {
    const document = generateLogDocument({ lines: 500 });
    const position = { line: 250, character: 10 };
    
    const start = performance.now();
    const completions = await getCompletions(document, position);
    const duration = performance.now() - start;
    
    assert.ok(
      duration < 100,
      `Autocomplete took ${duration}ms (expected < 100ms)`
    );
  });

  test('Hover information appears instantly', async () => {
    const document = generateLogDocument({ lines: 1000 });
    const position = { line: 500, character: 15 };
    
    const start = performance.now();
    const hover = await getHover(document, position);
    const duration = performance.now() - start;
    
    assert.ok(
      duration < 50,
      `Hover took ${duration}ms (expected < 50ms)`
    );
  });
});
```

### 5. Benchmark Tests (Track Over Time)

Establish baselines and track performance trends.

```typescript
suite('Performance: Benchmarks', () => {
  test('BASELINE: Small file import (1MB)', async () => {
    const file = generateLogFile({ size: '1MB' });
    const iterations = 10;
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await importLog(file);
      times.push(performance.now() - start);
    }
    
    const avg = times.reduce((a, b) => a + b) / iterations;
    const min = Math.min(...times);
    const max = Math.max(...times);
    
    console.log(`BENCHMARK: 1MB import - avg: ${avg.toFixed(2)}ms, min: ${min.toFixed(2)}ms, max: ${max.toFixed(2)}ms`);
    
    // Store baseline for comparison
    saveBenchmark('import-1mb', { avg, min, max });
    
    // Assert against baseline (allow 20% regression)
    const baseline = loadBenchmark('import-1mb');
    if (baseline) {
      assert.ok(
        avg < baseline.avg * 1.2,
        `Performance regression: ${avg}ms vs baseline ${baseline.avg}ms`
      );
    }
  });

  test('BASELINE: Pattern matching (10k lines)', () => {
    const content = generateLogFile({ lines: 10000 });
    const iterations = 100;
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      matchPatterns(content, allPatterns);
      times.push(performance.now() - start);
    }
    
    const avg = times.reduce((a, b) => a + b) / iterations;
    
    console.log(`BENCHMARK: Pattern matching - ${avg.toFixed(2)}ms for 10k lines`);
    saveBenchmark('pattern-match-10k', { avg });
    
    // Should process at least 1000 lines/ms
    const linesPerMs = 10000 / avg;
    assert.ok(
      linesPerMs > 100,
      `Too slow: ${linesPerMs} lines/ms (expected > 100)`
    );
  });

  test('BASELINE: Tree view rendering (1000 items)', () => {
    const items = generateTreeItems(1000);
    const iterations = 10;
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      renderTreeView(items);
      times.push(performance.now() - start);
    }
    
    const avg = times.reduce((a, b) => a + b) / iterations;
    
    console.log(`BENCHMARK: Tree rendering - ${avg.toFixed(2)}ms for 1000 items`);
    saveBenchmark('tree-render-1000', { avg });
  });
});
```

## Performance Budgets

Set and enforce performance budgets for key operations:

### User-Facing Operations (Perceived Performance)
- **Command start**: < 50ms (feels instant)
- **UI interaction**: < 100ms (no perceived lag)
- **Search results**: < 200ms (acceptable wait)
- **File save**: < 500ms (brief feedback)

### Background Operations (Throughput)
- **Small file import (< 1MB)**: < 1s
- **Medium file import (1-10MB)**: < 5s
- **Large file import (10-50MB)**: < 30s
- **Archive extraction**: < 10s for typical archives

### Memory Usage
- **Idle extension**: < 50MB
- **Small operation**: < 100MB
- **Large operation**: < 500MB
- **Maximum ever**: < 1GB

### LSP Operations
- **Server startup**: < 2s
- **Diagnostics**: < 500ms
- **Autocomplete**: < 100ms
- **Hover**: < 50ms
- **Code actions**: < 200ms

## Performance Testing Workflow

### During Development

```bash
# Quick performance check (fast tests only)
npm run perf:test

# Full benchmark suite (slower, more comprehensive)
npm run perf:benchmark

# Profile specific operation
npm run perf:profile

# Compare against baseline
npm run perf:compare
```

### Before Committing

```bash
# Ensure no performance regressions
npm run dev:verify  # Includes performance tests
```

### In CI/CD

```yaml
performance-check:
  runs-on: windows-latest
  steps:
    - name: Run performance tests
      run: npm run perf:test
      
    - name: Run benchmarks
      run: npm run perf:benchmark
      
    - name: Compare against baseline
      run: npm run perf:compare
      
    - name: Fail on regression
      run: |
        if [ $? -ne 0 ]; then
          echo "Performance regression detected!"
          exit 1
        fi
```

### Monthly Benchmarking

```bash
# Full benchmark suite with reporting
npm run perf:benchmark
npm run perf:report

# Review trends over time
# - Are operations getting slower?
# - Are memory leaks present?
# - Are new features impacting performance?
```

## Performance Optimization Techniques

### 1. Lazy Loading

```typescript
// BAD: Load everything upfront
class BundleProvider {
  constructor() {
    this.bundles = loadAllBundles(); // Slow!
  }
}

// GOOD: Load on demand
class BundleProvider {
  private bundles: Bundle[] | null = null;
  
  getBundles() {
    if (!this.bundles) {
      this.bundles = loadAllBundles();
    }
    return this.bundles;
  }
}
```

### 2. Caching

```typescript
// BAD: Recompute every time
function getPatterns() {
  return compilePatterns(rawPatterns); // Expensive!
}

// GOOD: Cache compiled patterns
const patternCache = new Map();
function getPatterns() {
  if (!patternCache.has('patterns')) {
    patternCache.set('patterns', compilePatterns(rawPatterns));
  }
  return patternCache.get('patterns');
}
```

### 3. Debouncing

```typescript
// BAD: Update on every keystroke
onDidChangeText((text) => {
  updateDiagnostics(text); // Called 100x during typing!
});

// GOOD: Debounce updates
const debouncedUpdate = debounce((text) => {
  updateDiagnostics(text);
}, 300);

onDidChangeText((text) => {
  debouncedUpdate(text); // Called once after typing stops
});
```

### 4. Streaming

```typescript
// BAD: Load entire file into memory
const content = fs.readFileSync(largePath, 'utf8');
processContent(content); // 100MB in memory!

// GOOD: Stream and process chunks
const stream = fs.createReadStream(largePath);
stream.on('data', (chunk) => {
  processChunk(chunk); // Only small chunk in memory
});
```

### 5. Virtual Scrolling

```typescript
// BAD: Render all 10,000 items
items.forEach(item => renderItem(item)); // Slow!

// GOOD: Render only visible items
const visibleItems = items.slice(scrollTop, scrollTop + viewportSize);
visibleItems.forEach(item => renderItem(item)); // Fast!
```

### 6. Worker Threads (for CPU-intensive tasks)

```typescript
// BAD: Block main thread
const results = heavyComputation(data); // UI freezes!

// GOOD: Use worker thread
const worker = new Worker('computation-worker.js');
worker.postMessage(data);
worker.onmessage = (results) => {
  updateUI(results); // UI stays responsive
};
```

## Performance Profiling

### CPU Profiling

```bash
# Start with profiling enabled
node --prof src/extension.js

# Run operation that's slow
# ...

# Analyze profile
node --prof-process isolate-*.log > profile.txt

# Review profile.txt for hotspots
```

### Memory Profiling

```typescript
suite('Performance: Memory Profiling', () => {
  test('No memory leaks in repeated operations', async () => {
    const iterations = 100;
    const memorySnapshots = [];
    
    for (let i = 0; i < iterations; i++) {
      await performOperation();
      
      // Force garbage collection (if --expose-gc flag set)
      if (global.gc) {
        global.gc();
      }
      
      memorySnapshots.push(process.memoryUsage().heapUsed);
    }
    
    // Memory should stabilize, not continuously grow
    const firstHalf = memorySnapshots.slice(0, 50);
    const secondHalf = memorySnapshots.slice(50);
    
    const firstAvg = average(firstHalf);
    const secondAvg = average(secondHalf);
    
    const growth = (secondAvg - firstAvg) / firstAvg;
    
    assert.ok(
      growth < 0.1, // Allow 10% growth
      `Memory leak detected: ${(growth * 100).toFixed(1)}% growth`
    );
  });
});
```

## Performance Test Data

Create realistic test data in `src/test/fixtures/performance/`:

```
performance/
├── small-log.log         # 100KB, 1000 lines
├── medium-log.log        # 1MB, 10,000 lines
├── large-log.log         # 10MB, 100,000 lines
├── huge-log.log          # 50MB, 500,000 lines
├── small-archive.zip     # 1MB, 10 files
├── medium-archive.zip    # 10MB, 100 files
└── large-archive.zip     # 50MB, 1000 files
```

## Performance Metrics Dashboard

Track these metrics over time:

```typescript
interface PerformanceMetrics {
  timestamp: Date;
  version: string;
  
  // Operation times (ms)
  smallFileImport: number;
  mediumFileImport: number;
  largeFileImport: number;
  searchTime: number;
  treeRenderTime: number;
  
  // Memory usage (MB)
  idleMemory: number;
  peakMemory: number;
  
  // LSP performance
  lspStartupTime: number;
  diagnosticsTime: number;
  autocompleteTime: number;
}
```

Store metrics and visualize trends:
- Are operations getting faster or slower?
- Which operations need optimization?
- Did recent changes impact performance?

## Performance Regression Detection

```typescript
suite('Performance: Regression Detection', () => {
  test('No regressions vs baseline', () => {
    const current = runAllBenchmarks();
    const baseline = loadBaseline();
    
    const regressions = [];
    
    Object.keys(current).forEach(key => {
      const currentTime = current[key];
      const baselineTime = baseline[key];
      
      if (currentTime > baselineTime * 1.2) { // 20% slower
        regressions.push({
          operation: key,
          current: currentTime,
          baseline: baselineTime,
          regression: ((currentTime - baselineTime) / baselineTime * 100).toFixed(1)
        });
      }
    });
    
    if (regressions.length > 0) {
      console.error('Performance regressions detected:');
      regressions.forEach(r => {
        console.error(`  ${r.operation}: ${r.current}ms (baseline: ${r.baseline}ms) - ${r.regression}% slower`);
      });
    }
    
    assert.strictEqual(
      regressions.length,
      0,
      `${regressions.length} performance regressions found`
    );
  });
});
```

## Success Criteria

You know performance testing is effective when:

- ✅ No user complaints about slowness
- ✅ Performance tests catch regressions before deployment
- ✅ All operations feel instant or provide progress feedback
- ✅ Memory usage is stable (no leaks)
- ✅ Performance improves over time (optimization efforts)

## Common Performance Pitfalls

### ❌ Avoid These

1. **Synchronous operations on large files**
   - Use async/streaming instead

2. **Rendering large lists without virtualization**
   - Render only visible items

3. **No caching of expensive computations**
   - Cache compiled patterns, parsed data, etc.

4. **Blocking the UI thread**
   - Move heavy work to background/workers

5. **Memory leaks from event listeners**
   - Always dispose of listeners

6. **Loading all data upfront**
   - Use lazy loading and pagination

7. **No debouncing on frequent events**
   - Debounce text changes, resize, scroll, etc.

## Remember

**Performance is a feature, not an optimization.**

Build performance testing into your workflow from day one. It's much easier to maintain good performance than to fix performance problems later.

**Measure first, optimize second.**

Don't guess where performance problems are. Profile, measure, then optimize based on data.

**Users judge quality by responsiveness.**

A feature that works correctly but feels slow is still a bad feature.

---

## AI Assistant Guidelines

### For AI Assistants Reading This Document

When implementing performance-sensitive features:

#### 1. Read Logs First
```bash
# If performance tests fail, read the log
"I see npm run test:performance failed. Let me check logs/test-performance.log..."
```

Always base your optimizations on actual measurements, not assumptions.

#### 2. Use Templates from This Document
```
"I'll create performance tests using the template from PERFORMANCE_TESTING.md section 1..."
```

Copy the test templates and performance budgets from this document.

#### 3. Check Performance Budgets
Before implementing, verify the performance budget for your operation type:
- User-facing operations: < 100ms
- Background operations: < 5s for medium files
- LSP operations: < 500ms for diagnostics
- Memory usage: < 500MB for large operations

If you'll exceed budget, ask human before proceeding.

#### 4. Run Performance Tests Automatically
```bash
# After implementing performance-sensitive code
npm run test:performance
npm run perf:benchmark

# Check logs if failures
type logs\test-performance.log
type logs\perf-benchmark.log
```

#### 5. Use Optimization Techniques from This Document
When performance is slow, apply techniques from section "Performance Optimization Techniques":
- Lazy loading
- Caching
- Debouncing
- Streaming
- Virtual scrolling
- Worker threads

Don't invent new patterns. Use proven techniques from this document.

#### 6. Example Response Template

```markdown
## Performance Implementation for [Feature]

### Performance Budget
- Target: < 100ms for user action
- Measured: 85ms ✅ (within budget)

### Tests Created
1. Unit performance: `test/suite/performance.test.ts` lines 42-65
2. Scalability test: `test/suite/performance.test.ts` lines 66-89

### Test Results
```bash
npm run test:performance
# Output saved to logs/test-performance.log
✅ All 3 performance tests passing
✅ Operation completes in 85ms (budget: 100ms)
✅ Memory usage: 45MB (budget: 100MB)
```

### Optimizations Applied
- ✅ Lazy loading for tree view items
- ✅ Caching compiled patterns
- ✅ Debounced UI updates (300ms)

### Benchmarks
```
Small file (1MB):   250ms
Medium file (10MB): 2.1s ✅ (budget: 5s)
Large file (50MB):  9.8s ✅ (budget: 30s)
```

### Ready for Review
All performance tests passing. Human QA can verify:
1. Run: npm run perf:test
2. Check: logs/test-performance.log
3. Verify: All operations feel responsive
```

#### 7. When Performance is Slow

If tests show operations exceed budgets:
```
"Performance test shows [operation] takes 150ms (budget: 100ms).
I've identified the bottleneck: [description].
Should I apply [optimization technique] from PERFORMANCE_TESTING.md?"
```

Propose specific optimizations, don't just say "make it faster".

#### 8. Profile Before Optimizing
```bash
# Generate profile data
npm run perf:profile
npm run perf:analyze

# Check logs
type logs\perf-profile.log
type profile.txt
```

Find the actual bottleneck before optimizing.

#### 9. Common Mistakes to Avoid
- ❌ "Performance testing comes later"
- ❌ Optimizing without measuring first
- ❌ Breaking functionality for marginal speed gains
- ❌ Loading entire files into memory
- ❌ No caching of expensive operations
- ❌ Blocking UI thread with heavy work

#### 10. Always Check Logs and Benchmarks
```
Human: "Performance tests failed"
AI: "Let me check logs/test-performance.log..."
[Reads actual measurements]
AI: "The log shows: 'Import took 6.2s (expected < 5s)'.
     The bottleneck is parsing - taking 4.8s of the 6.2s.
     I'll add caching for compiled regex patterns."
```

Don't guess bottlenecks. Measure, read logs, optimize based on data.

#### 11. Efficiency Tips
- Use performance budgets from this document (don't invent)
- Run `npm run test:performance` during development
- Check `logs/test-performance.log` immediately when tests fail
- Profile with `npm run perf:profile` when optimizing
- Compare against baselines with `npm run perf:compare`
- Keep performance tests fast themselves (<100ms when possible)

#### 12. Update This Document

If you discover new performance patterns or optimizations:
```
"I found a performance technique not covered in PERFORMANCE_TESTING.md.
Should I add section for [optimization technique]?"
```

Keep this document current with new learnings.

### Remember
**Performance regressions caught in tests = Success**
**Performance problems found by users = Failure**

Your job is to ensure operations meet performance budgets BEFORE deployment.

**When implementing performance-sensitive features:**
1. Read this document first (especially budgets)
2. Use the test templates provided
3. Measure everything
4. Run tests frequently
5. Check logs when failures occur
6. Apply proven optimization techniques
7. Update this document if you find new patterns

**Make performance testing efficient for humans by catching issues early.**