import * as assert from "assert";

/**
 * Unit Tests for Pattern Override Management
 *
 * These tests validate pattern management logic without VS Code runtime:
 * - Pattern CRUD operations
 * - Regex validation
 * - Pattern matching logic
 * - Priority handling
 * - Import/Export transformation
 *
 * Run with: npm run test:wiring (fast, no VS Code launch)
 */

suite("Pattern Override Management - Unit Tests", () => {
  suite("1. Pattern Creation", () => {
    test("Should create pattern with required fields", () => {
      const pattern = createPattern({
        id: "test-pattern-1",
        name: "Test Pattern",
        regex: "ERROR.*",
        severity: "error",
      });

      assert.ok(pattern.id, "Pattern should have ID");
      assert.strictEqual(pattern.name, "Test Pattern");
      assert.strictEqual(pattern.regex, "ERROR.*");
      assert.strictEqual(pattern.severity, "error");
    });

    test("Should generate ID if not provided", () => {
      const pattern1 = createPattern({
        name: "Pattern 1",
        regex: "test",
        severity: "warning",
      });

      const pattern2 = createPattern({
        name: "Pattern 2",
        regex: "test",
        severity: "warning",
      });

      assert.ok(pattern1.id, "Should have ID");
      assert.ok(pattern2.id, "Should have ID");
      assert.notStrictEqual(pattern1.id, pattern2.id, "IDs should be unique");
    });

    test("Should set default values for optional fields", () => {
      const pattern = createPattern({
        name: "Minimal Pattern",
        regex: "test",
        severity: "info",
      });

      assert.ok(pattern.enabled !== undefined, "Should have enabled flag");
      assert.ok(pattern.priority !== undefined, "Should have priority");
      assert.ok(pattern.createdAt, "Should have creation timestamp");
    });

    test("Should validate severity on creation", () => {
      const validSeverities = ["error", "warning", "info", "hint"];

      for (const severity of validSeverities) {
        const pattern = createPattern({
          name: "Test",
          regex: "test",
          severity: severity as any,
        });
        assert.strictEqual(pattern.severity, severity);
      }
    });

    test("Should reject invalid severity", () => {
      assert.throws(() => {
        createPattern({
          name: "Test",
          regex: "test",
          severity: "invalid" as any,
        });
      }, "Should throw for invalid severity");
    });
  });

  suite("2. Pattern Validation", () => {
    test("Should validate regex patterns", () => {
      const validPatterns = [
        "ERROR.*",
        "\\d{3}-\\d{3}-\\d{4}",
        "^(INFO|WARN|ERROR)",
        "[A-Z]+",
        "(?:group)",
        "\\w+@\\w+\\.\\w+",
      ];

      for (const regex of validPatterns) {
        const result = validatePattern({ regex });
        assert.ok(
          result.isValid,
          `Pattern "${regex}" should be valid: ${result.error}`
        );
      }
    });

    test("Should reject invalid regex patterns", () => {
      const invalidPatterns = [
        "[unclosed",
        "(?:incomplete",
        "\\",
        "(unmatched",
        "*invalid",
        "(?P<name)", // Python-style named groups not supported
      ];

      for (const regex of invalidPatterns) {
        const result = validatePattern({ regex });
        assert.ok(
          !result.isValid,
          `Pattern "${regex}" should be invalid`
        );
        assert.ok(result.error, "Should provide error message");
      }
    });

    test("Should validate pattern name requirements", () => {
      const tests = [
        { name: "", valid: false, reason: "Empty name" },
        { name: "A", valid: true, reason: "Single char" },
        { name: "Valid Name", valid: true, reason: "Normal name" },
        { name: "a".repeat(100), valid: true, reason: "Long but valid" },
        { name: "a".repeat(256), valid: false, reason: "Too long" },
      ];

      for (const { name, valid, reason } of tests) {
        const result = validatePattern({ name, regex: "test" });
        assert.strictEqual(
          result.isValid,
          valid,
          `${reason}: "${name}" validation failed`
        );
      }
    });

    test("Should validate priority range", () => {
      const tests = [
        { priority: -1, valid: false },
        { priority: 0, valid: false },
        { priority: 1, valid: true },
        { priority: 50, valid: true },
        { priority: 100, valid: true },
        { priority: 1000, valid: true },
        { priority: 1001, valid: false },
      ];

      for (const { priority, valid } of tests) {
        const result = validatePattern({ regex: "test", priority });
        assert.strictEqual(
          result.isValid,
          valid,
          `Priority ${priority} validation failed`
        );
      }
    });

    test("Should validate description length", () => {
      const shortDesc = "Short description";
      const longDesc = "a".repeat(1000);
      const tooLongDesc = "a".repeat(10001);

      assert.ok(validatePattern({ regex: "test", description: shortDesc }).isValid);
      assert.ok(validatePattern({ regex: "test", description: longDesc }).isValid);
      assert.ok(!validatePattern({ regex: "test", description: tooLongDesc }).isValid);
    });
  });

  suite("3. Pattern Matching", () => {
    test("Should match simple patterns", () => {
      const pattern = { regex: "ERROR" };
      const tests = [
        { line: "ERROR: Something went wrong", matches: true },
        { line: "INFO: Everything is fine", matches: false },
        { line: "This contains ERROR in middle", matches: true },
      ];

      for (const { line, matches } of tests) {
        const result = matchPattern(pattern, line);
        assert.strictEqual(
          result,
          matches,
          `Pattern matching failed for: "${line}"`
        );
      }
    });

    test("Should match patterns with capture groups", () => {
      const pattern = { regex: "ERROR: (.+)" };
      const line = "ERROR: Something went wrong";

      const match = matchPatternWithCaptures(pattern, line);
      assert.ok(match, "Should match line");
      assert.ok(match?.captures, "Should have captures");
      assert.strictEqual(match?.captures[0], "Something went wrong");
    });

    test("Should match case-sensitive patterns", () => {
      const pattern = { regex: "ERROR", caseSensitive: true };
      const tests = [
        { line: "ERROR occurred", matches: true },
        { line: "error occurred", matches: false },
        { line: "Error occurred", matches: false },
      ];

      for (const { line, matches } of tests) {
        const result = matchPattern(pattern, line);
        assert.strictEqual(
          result,
          matches,
          `Case-sensitive matching failed for: "${line}"`
        );
      }
    });

    test("Should match case-insensitive patterns", () => {
      const pattern = { regex: "ERROR", caseSensitive: false };
      const tests = [
        { line: "ERROR occurred", matches: true },
        { line: "error occurred", matches: true },
        { line: "Error occurred", matches: true },
        { line: "ErRoR occurred", matches: true },
      ];

      for (const { line, matches } of tests) {
        const result = matchPattern(pattern, line);
        assert.strictEqual(
          result,
          matches,
          `Case-insensitive matching failed for: "${line}"`
        );
      }
    });

    test("Should match anchored patterns", () => {
      const startPattern = { regex: "^ERROR" };
      const endPattern = { regex: "ERROR$" };

      assert.ok(matchPattern(startPattern, "ERROR at start"));
      assert.ok(!matchPattern(startPattern, "Not at ERROR start"));

      assert.ok(matchPattern(endPattern, "Ends with ERROR"));
      assert.ok(!matchPattern(endPattern, "ERROR not at end"));
    });

    test("Should handle complex regex patterns", () => {
      const patterns = [
        {
          regex: "\\d{4}-\\d{2}-\\d{2}",
          line: "Date: 2024-02-21",
          matches: true,
        },
        {
          regex: "\\w+@\\w+\\.\\w+",
          line: "Email: user@example.com",
          matches: true,
        },
        {
          regex: "\\[([A-Z]+)\\]",
          line: "[ERROR] Message here",
          matches: true,
        },
      ];

      for (const { regex, line, matches } of patterns) {
        const result = matchPattern({ regex }, line);
        assert.strictEqual(
          result,
          matches,
          `Complex pattern "${regex}" failed for: "${line}"`
        );
      }
    });
  });

  suite("4. Pattern Priority", () => {
    test("Should sort patterns by priority", () => {
      const patterns = [
        { id: "1", name: "pattern1", regex: "", severity: "warning" as const, priority: 50 },
        { id: "2", name: "pattern2", regex: "", severity: "warning" as const, priority: 10 },
        { id: "3", name: "pattern3", regex: "", severity: "warning" as const, priority: 100 },
        { id: "4", name: "pattern4", regex: "", severity: "warning" as const, priority: 25 },
      ];

      const sorted = sortPatternsByPriority(patterns);

      assert.strictEqual(sorted[0].id, "3", "Highest priority first");
      assert.strictEqual(sorted[1].id, "1", "Second highest");
      assert.strictEqual(sorted[2].id, "4", "Third");
      assert.strictEqual(sorted[3].id, "2", "Lowest priority last");
    });

    test("Should handle equal priorities", () => {
      const patterns = [
        { id: "1", name: "pattern1", regex: "", severity: "warning" as const, priority: 50, createdAt: "2024-01-01" },
        { id: "2", name: "pattern2", regex: "", severity: "warning" as const, priority: 50, createdAt: "2024-01-02" },
        { id: "3", name: "pattern3", regex: "", severity: "warning" as const, priority: 50, createdAt: "2024-01-03" },
      ];

      const sorted = sortPatternsByPriority(patterns);

      // When priorities are equal, should maintain stable sort or use secondary criteria
      assert.strictEqual(sorted.length, 3);
      assert.ok(sorted[0].priority === 50);
    });

    test("Should find first matching pattern by priority", () => {
      const patterns = [
        { id: "low", name: "low", regex: "ERROR", severity: "warning" as const, priority: 10 },
        { id: "high", name: "high", regex: "ERROR", severity: "error" as const, priority: 100 },
        { id: "medium", name: "medium", regex: "ERROR", severity: "warning" as const, priority: 50 },
      ];

      const line = "ERROR: Test message";
      const match = findFirstMatch(patterns, line);

      assert.strictEqual(match?.id, "high", "Should match highest priority first");
    });

    test("Should skip disabled patterns", () => {
      const patterns = [
        { id: "high", name: "high", regex: "ERROR", severity: "error" as const, priority: 100, enabled: false },
        { id: "medium", name: "medium", regex: "ERROR", severity: "warning" as const, priority: 50, enabled: true },
      ];

      const line = "ERROR: Test message";
      const match = findFirstMatch(patterns, line);

      assert.strictEqual(match?.id, "medium", "Should skip disabled pattern");
    });
  });

  suite("5. Pattern Import/Export", () => {
    test("Should export patterns to JSON", () => {
      const patterns = [
        createPattern({
          id: "1",
          name: "Error Pattern",
          regex: "ERROR",
          severity: "error",
        }),
        createPattern({
          id: "2",
          name: "Warning Pattern",
          regex: "WARN",
          severity: "warning",
        }),
      ];

      const exported = exportPatterns(patterns);
      const parsed = JSON.parse(exported);

      assert.strictEqual(parsed.length, 2);
      assert.strictEqual(parsed[0].name, "Error Pattern");
      assert.strictEqual(parsed[1].name, "Warning Pattern");
    });

    test("Should import patterns from JSON", () => {
      const json = JSON.stringify([
        {
          id: "1",
          name: "Error Pattern",
          regex: "ERROR",
          severity: "error",
        },
        {
          id: "2",
          name: "Warning Pattern",
          regex: "WARN",
          severity: "warning",
        },
      ]);

      const imported = importPatterns(json);

      assert.strictEqual(imported.length, 2);
      assert.strictEqual(imported[0].name, "Error Pattern");
      assert.strictEqual(imported[1].name, "Warning Pattern");
    });

    test("Should validate imported patterns", () => {
      const invalidJson = JSON.stringify([
        {
          // Missing required fields
          id: "1",
          name: "Invalid",
        },
      ]);

      assert.throws(() => {
        importPatterns(invalidJson);
      }, "Should reject invalid pattern");
    });

    test("Should handle import conflicts", () => {
      const existingPatterns = [
        { id: "1", name: "Existing", regex: "TEST", severity: "warning" as const },
      ];

      const newPatterns = [
        { id: "1", name: "New", regex: "TEST", severity: "warning" as const }, // Same ID
      ];

      const merged = mergePatterns(existingPatterns, newPatterns, "skip");
      assert.strictEqual(merged.length, 1);
      assert.strictEqual(merged[0].name, "Existing", "Should skip duplicate");

      const replaced = mergePatterns(existingPatterns, newPatterns, "replace");
      assert.strictEqual(replaced.length, 1);
      assert.strictEqual(replaced[0].name, "New", "Should replace existing");

      const kept = mergePatterns(existingPatterns, newPatterns, "keep-both");
      assert.strictEqual(kept.length, 2, "Should keep both with unique IDs");
    });

    test("Should preserve metadata on export", () => {
      const pattern = createPattern({
        name: "Test",
        regex: "TEST",
        severity: "info",
        description: "Test description",
        tags: ["tag1", "tag2"],
      });

      const exported = exportPatterns([pattern]);
      const parsed = JSON.parse(exported);

      assert.strictEqual(parsed[0].description, "Test description");
      assert.deepStrictEqual(parsed[0].tags, ["tag1", "tag2"]);
    });
  });

  suite("6. Pattern Updates", () => {
    test("Should update pattern properties", () => {
      const pattern = createPattern({
        id: "test-1",
        name: "Original",
        regex: "OLD",
        severity: "error",
      });

      const updated = updatePattern(pattern, {
        name: "Updated",
        regex: "NEW",
      });

      assert.strictEqual(updated.id, "test-1", "ID should not change");
      assert.strictEqual(updated.name, "Updated");
      assert.strictEqual(updated.regex, "NEW");
      assert.strictEqual(updated.severity, "error", "Unchanged field preserved");
    });

    test("Should validate updates", () => {
      const pattern = createPattern({
        name: "Test",
        regex: "TEST",
        severity: "info",
      });

      assert.throws(() => {
        updatePattern(pattern, { regex: "[invalid" });
      }, "Should reject invalid regex update");
    });

    test("Should track update timestamp", () => {
      const pattern = createPattern({
        name: "Test",
        regex: "TEST",
        severity: "info",
      });

      const originalTime = pattern.createdAt;

      // Wait a tiny bit
      const updated = updatePattern(pattern, { name: "Updated" });

      assert.ok(updated.updatedAt, "Should have update timestamp");
      assert.strictEqual(updated.createdAt, originalTime, "Creation time unchanged");
    });
  });

  suite("7. Pattern Deletion", () => {
    test("Should mark pattern as deleted", () => {
      const pattern = createPattern({
        id: "test-1",
        name: "Test",
        regex: "TEST",
        severity: "info",
      });

      const deleted = deletePattern(pattern);
      assert.ok(deleted.deleted, "Should be marked deleted");
      assert.ok(deleted.deletedAt, "Should have deletion timestamp");
    });

    test("Should filter deleted patterns", () => {
      const patterns = [
        createPattern({ name: "Active 1", regex: "TEST1", severity: "info" }),
        createPattern({ name: "Active 2", regex: "TEST2", severity: "info" }),
        { ...createPattern({ name: "Deleted", regex: "TEST3", severity: "info" }), deleted: true },
      ];

      const active = getActivePatterns(patterns);
      assert.strictEqual(active.length, 2, "Should exclude deleted patterns");
    });
  });

  suite("8. Pattern Search", () => {
    test("Should search patterns by name", () => {
      const patterns = [
        createPattern({ name: "Error Pattern", regex: "ERROR", severity: "error" }),
        createPattern({ name: "Warning Pattern", regex: "WARN", severity: "warning" }),
        createPattern({ name: "Info Pattern", regex: "INFO", severity: "info" }),
      ];

      const results = searchPatterns(patterns, "Error");
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].name, "Error Pattern");
    });

    test("Should search patterns by regex", () => {
      const patterns = [
        createPattern({ name: "Test 1", regex: "ERROR.*", severity: "error" }),
        createPattern({ name: "Test 2", regex: "WARN.*", severity: "warning" }),
        createPattern({ name: "Test 3", regex: "ERROR|WARN", severity: "error" }),
      ];

      const results = searchPatterns(patterns, "ERROR");
      assert.strictEqual(results.length, 2, "Should find patterns with ERROR in regex");
    });

    test("Should search case-insensitively", () => {
      const patterns = [
        createPattern({ name: "Error Pattern", regex: "TEST", severity: "error" }),
      ];

      const resultsLower = searchPatterns(patterns, "error");
      const resultsUpper = searchPatterns(patterns, "ERROR");

      assert.strictEqual(resultsLower.length, 1);
      assert.strictEqual(resultsUpper.length, 1);
    });

    test("Should filter by severity", () => {
      const patterns = [
        createPattern({ name: "Test 1", regex: "TEST", severity: "error" }),
        createPattern({ name: "Test 2", regex: "TEST", severity: "warning" }),
        createPattern({ name: "Test 3", regex: "TEST", severity: "error" }),
      ];

      const errors = filterBySeverity(patterns, "error");
      assert.strictEqual(errors.length, 2);
    });
  });

  suite("9. Pattern Statistics", () => {
    test("Should count patterns by severity", () => {
      const patterns = [
        createPattern({ name: "1", regex: "T", severity: "error" }),
        createPattern({ name: "2", regex: "T", severity: "error" }),
        createPattern({ name: "3", regex: "T", severity: "warning" }),
        createPattern({ name: "4", regex: "T", severity: "info" }),
      ];

      const stats = getPatternStats(patterns);
      assert.strictEqual(stats.error, 2);
      assert.strictEqual(stats.warning, 1);
      assert.strictEqual(stats.info, 1);
      assert.strictEqual(stats.hint, 0);
    });

    test("Should count enabled vs disabled", () => {
      const patterns = [
        { ...createPattern({ name: "1", regex: "T", severity: "info" }), enabled: true },
        { ...createPattern({ name: "2", regex: "T", severity: "info" }), enabled: true },
        { ...createPattern({ name: "3", regex: "T", severity: "info" }), enabled: false },
      ];

      const stats = getPatternStats(patterns);
      assert.strictEqual(stats.enabled, 2);
      assert.strictEqual(stats.disabled, 1);
    });
  });
});

// ============================================================================
// HELPER FUNCTIONS (Pattern Management Logic)
// ============================================================================

interface Pattern {
  id?: string;
  name: string;
  regex: string;
  severity: "error" | "warning" | "info" | "hint";
  description?: string;
  tags?: string[];
  priority?: number;
  enabled?: boolean;
  caseSensitive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deleted?: boolean;
  deletedAt?: string;
}

function createPattern(pattern: Partial<Pattern> & Pick<Pattern, "name" | "regex" | "severity">): Pattern {
  const validSeverities = ["error", "warning", "info", "hint"];
  if (!validSeverities.includes(pattern.severity)) {
    throw new Error(`Invalid severity: ${pattern.severity}`);
  }

  return {
    id: pattern.id || generatePatternId(),
    name: pattern.name,
    regex: pattern.regex,
    severity: pattern.severity,
    description: pattern.description,
    tags: pattern.tags,
    priority: pattern.priority ?? 50,
    enabled: pattern.enabled ?? true,
    caseSensitive: pattern.caseSensitive ?? false,
    createdAt: pattern.createdAt || new Date().toISOString(),
  };
}

function generatePatternId(): string {
  return `pattern_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

function validatePattern(pattern: Partial<Pattern>): { isValid: boolean; error?: string } {
  if (pattern.regex) {
    try {
      new RegExp(pattern.regex);
    } catch (error) {
      return { isValid: false, error: `Invalid regex: ${(error as Error).message}` };
    }
  }

  if (pattern.name !== undefined) {
    if (pattern.name.length === 0) {
      return { isValid: false, error: "Pattern name cannot be empty" };
    }
    if (pattern.name.length > 255) {
      return { isValid: false, error: "Pattern name is too long" };
    }
  }

  if (pattern.priority !== undefined) {
    if (pattern.priority < 1 || pattern.priority > 1000) {
      return { isValid: false, error: "Priority must be between 1 and 1000" };
    }
  }

  if (pattern.description !== undefined && pattern.description.length > 10000) {
    return { isValid: false, error: "Description is too long" };
  }

  return { isValid: true };
}

function matchPattern(pattern: Pick<Pattern, "regex" | "caseSensitive">, line: string): boolean {
  const flags = pattern.caseSensitive ? "" : "i";
  const regex = new RegExp(pattern.regex, flags);
  return regex.test(line);
}

function matchPatternWithCaptures(pattern: Pick<Pattern, "regex">, line: string): { captures: string[] } | null {
  const regex = new RegExp(pattern.regex);
  const match = line.match(regex);
  return match ? { captures: match.slice(1) } : null;
}

function sortPatternsByPriority(patterns: Pattern[]): Pattern[] {
  return [...patterns].sort((a, b) => (b.priority || 0) - (a.priority || 0));
}

function findFirstMatch(patterns: Pattern[], line: string): Pattern | null {
  const sorted = sortPatternsByPriority(patterns.filter(p => p.enabled !== false));
  for (const pattern of sorted) {
    if (matchPattern(pattern, line)) {
      return pattern;
    }
  }
  return null;
}

function exportPatterns(patterns: Pattern[]): string {
  return JSON.stringify(patterns, null, 2);
}

function importPatterns(json: string): Pattern[] {
  const parsed = JSON.parse(json);
  return parsed.map((p: any) => {
    if (!p.regex) {
      throw new Error("Invalid pattern: missing regex");
    }
    return createPattern(p);
  });
}

function mergePatterns(
  existing: Pattern[],
  newPatterns: Pattern[],
  strategy: "skip" | "replace" | "keep-both"
): Pattern[] {
  if (strategy === "replace") {
    const existingMap = new Map(existing.map(p => [p.id, p]));
    newPatterns.forEach(p => existingMap.set(p.id!, p));
    return Array.from(existingMap.values());
  }

  if (strategy === "keep-both") {
    const existingIds = new Set(existing.map(p => p.id));
    const renamed = newPatterns.map(p => {
      if (existingIds.has(p.id)) {
        return { ...p, id: generatePatternId() };
      }
      return p;
    });
    return [...existing, ...renamed];
  }

  // skip strategy
  const existingIds = new Set(existing.map(p => p.id));
  const nonDuplicates = newPatterns.filter(p => !existingIds.has(p.id));
  return [...existing, ...nonDuplicates];
}

function updatePattern(pattern: Pattern, updates: Partial<Pattern>): Pattern {
  const merged = { ...pattern, ...updates };
  const validation = validatePattern(merged);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }
  return {
    ...merged,
    updatedAt: new Date().toISOString(),
  };
}

function deletePattern(pattern: Pattern): Pattern {
  return {
    ...pattern,
    deleted: true,
    deletedAt: new Date().toISOString(),
  };
}

function getActivePatterns(patterns: Pattern[]): Pattern[] {
  return patterns.filter(p => !p.deleted);
}

function searchPatterns(patterns: Pattern[], query: string): Pattern[] {
  const lower = query.toLowerCase();
  return patterns.filter(
    p =>
      p.name.toLowerCase().includes(lower) ||
      p.regex.toLowerCase().includes(lower) ||
      p.description?.toLowerCase().includes(lower)
  );
}

function filterBySeverity(patterns: Pattern[], severity: string): Pattern[] {
  return patterns.filter(p => p.severity === severity);
}

function getPatternStats(patterns: Pattern[]): Record<string, number> {
  const stats: Record<string, number> = {
    error: 0,
    warning: 0,
    info: 0,
    hint: 0,
    enabled: 0,
    disabled: 0,
  };

  for (const pattern of patterns) {
    stats[pattern.severity]++;
    if (pattern.enabled !== false) {
      stats.enabled++;
    } else {
      stats.disabled++;
    }
  }

  return stats;
}
