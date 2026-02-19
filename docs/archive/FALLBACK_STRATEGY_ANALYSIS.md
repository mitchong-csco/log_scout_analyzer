# Fallback Strategy Analysis: Why Use matched_text?

## Current Fallback Logic

```rust
let merged_message = if annotation.is_empty() {
    tracing::warn!("Annotation is EMPTY! Falling back to matched_text");
    detection.matched_text.clone()  // ← Fallback 1
} else {
    let substituted = Self::substitute_template(&annotation, &detection.field_values);
    if substituted.is_empty() {
        tracing::warn!("Annotation substitution resulted in EMPTY string! Falling back to matched_text");
        detection.matched_text.clone()  // ← Fallback 2
    } else {
        substituted
    }
};
```

There are **two fallback scenarios**:
1. **Annotation is missing/empty** - Pattern has no message template
2. **Substitution fails** - Template exists but field extraction produced no values

---

## Current Reasoning (Why Fallback Exists)

### Problem It Solves

The fallback exists to prevent **showing nothing to the user** when something goes wrong.

```
Scenario: Pattern matches but annotation is empty

Without fallback:
  Log line: "ERROR: Connection failed to server.com:5060"
  Pattern annotation: "" (empty)
  Merged message: "" (empty string shown to user)
  ❌ User sees nothing - diagnostic is uninformative
  
With fallback:
  Log line: "ERROR: Connection failed to server.com:5060"
  Pattern annotation: "" (empty)
  Merged message: "ERROR: Connection failed to server.com:5060" (matched text)
  ✓ User sees something useful
```

### The Reasoning

**"Better to show raw matched text than nothing at all"**

This is a defensive programming approach:
- If data is incomplete/broken, still provide *some* useful information
- Don't fail silently
- Give users enough context to understand what was detected

---

## Potential Issues with Fallback

### 1. **Hides Data Quality Problems**

```
Pattern 1: Has annotation = "User {{ user }} failed"
Pattern 2: No annotation = "" (empty)

Both match the same log line.

User sees:
- Pattern 1: "User john.doe failed" (good)
- Pattern 2: "ERROR: User authentication failure reason code 401" (raw regex match)

Problem: No indication that Pattern 2's annotation was missing
         The raw text might be LESS informative than the annotation would be
```

### 2. **Shows Different Quality Messages for Same Issue**

```
Log: "2026-02-13 10:34:22 ERROR call dropped due to network error"

Pattern A with annotation:
  Message: "Call dropped - Network error"

Pattern B without annotation (fallback):
  Message: "2026-02-13 10:34:22 ERROR call dropped due to network error"

User gets inconsistent experience: sometimes clean, sometimes raw
```

### 3. **Substitution Failure Masks Template Problems**

```
Annotation: "Call dropped - Reason: {{ reason }} - Duration: {{ duration }}"
Extracted fields: {reason: "Network Error"} (duration extraction failed)

If both fields required but only one found:
  - Substitution produces: "" (empty because not all fields found)
  - Fallback kicks in: Uses matched_text instead
  
Problem: No indication that template substitution failed
         No feedback that field extraction was incomplete
```

### 4. **Raw Text Can Be Very Long**

```
Log line: "2026-02-13 10:34:22.123 [THREAD-5678] [SIP/2.0/UDP 192.168.1.1:5060] ERROR REGISTER failed attempt 3/5 reason=403_FORBIDDEN duration=2500ms retry_after=300 via_sent=user.example.com via_received=proxy.example.com contact=sip:user@192.168.1.1:5060"

Annotation: "" (missing)
Fallback: Shows entire long line
Result: Cluttered diagnostic message
```

---

## Alternative Approaches

### Option A: Require Annotation (Strict Approach)

```rust
let merged_message = if annotation.is_empty() {
    // Error: Don't create diagnostic at all
    return None;  // Skip this pattern match
} else {
    let substituted = Self::substitute_template(&annotation, &detection.field_values);
    // Must succeed or error
    substituted
}
```

**Pros:**
- ✅ Forces all patterns to have annotations
- ✅ Guarantees consistent message quality
- ✅ No ambiguity about data source

**Cons:**
- ❌ Patterns without annotations silently ignored
- ❌ No detection reported for broken patterns
- ❌ Hard to debug missing annotations

---

### Option B: Use Pattern Name/ID (Identity Approach)

```rust
let merged_message = if annotation.is_empty() {
    // Use pattern name as fallback, not matched text
    detection.pattern.name.clone()
} else {
    let substituted = Self::substitute_template(&annotation, &detection.field_values);
    if substituted.is_empty() {
        detection.pattern.name.clone()  // Use name, not matched text
    } else {
        substituted
    }
};
```

**Example:**
```
Pattern name: "Call Dropped - Network Error"
Annotation: "" (missing)
Message: "Call Dropped - Network Error" (consistent, clean)
```

**Pros:**
- ✅ Consistent message length
- ✅ Cleaner UI
- ✅ Still informative
- ✅ Shows "what pattern matched" not "raw log text"

**Cons:**
- ❌ Loses context from actual log line
- ❌ Less detail than matched text
- ❌ May be less actionable

---

### Option C: Partial Substitution (Lenient Approach)

```rust
let merged_message = if annotation.is_empty() {
    tracing::warn!("Annotation is EMPTY!");
    detection.pattern.name.clone()
} else {
    // Partial substitution: substitute what we can, keep {{ FIELD }} for missing
    let substituted = Self::substitute_template(&annotation, &detection.field_values);
    if substituted.is_empty() {
        // If everything was substituted away, show pattern name
        detection.pattern.name.clone()
    } else {
        substituted  // Even if partial like "User {{ missing_field }} failed"
    }
};
```

**Example:**
```
Annotation: "User {{ user }} from IP {{ ip }} failed"
Extracted: {user: "john.doe"} (ip extraction failed)
Result: "User john.doe from IP {{ ip }} failed"

Message shows:
- What succeeded: user field (john.doe)
- What failed: ip field ({{ ip }} placeholder remains)
- Still informative and shows incomplete extraction
```

**Pros:**
- ✅ Shows what was extracted
- ✅ Shows what failed
- ✅ Useful feedback for debugging
- ✅ Still better than empty

**Cons:**
- ❌ Message includes raw template syntax
- ❌ May look unprofessional to end users
- ❌ Different from what user expects

---

### Option D: Three-Tier Fallback (Sophisticated)

```rust
let merged_message = if annotation.is_empty() {
    // Tier 1 fallback: Use pattern name
    detection.pattern.name.clone()
} else {
    let substituted = Self::substitute_template(&annotation, &detection.field_values);
    
    if substituted.is_empty() {
        // Tier 2 fallback: Try partial substitution
        if substituted.contains("{{") {
            // Partial substitution - use it
            substituted
        } else {
            // Complete substitution failed - use pattern name
            detection.pattern.name.clone()
        }
    } else {
        // Full success
        substituted
    }
};
```

**Priority order:**
1. Full substitution (best)
2. Partial substitution (okay)
3. Pattern name (fallback)
4. Matched text (last resort - not used)

---

## Recommendation Decision Table

| Scenario | Current (matched_text) | Option A (require) | Option B (name) | Option C (partial) | Option D (tiered) |
|----------|--------|-----------|---------|---------|---------|
| Annotation missing | Shows raw log | Skips diagnostic | Shows pattern name | Shows pattern name | Shows pattern name |
| Extraction fails | Shows raw log | Shows raw log | Shows pattern name | Shows partial {{ FIELD }} | Shows partial or name |
| Perfect match | Uses annotation ✓ | Uses annotation ✓ | Uses annotation ✓ | Uses annotation ✓ | Uses annotation ✓ |
| Consistency | Low (varies) | High | High | Medium | High |
| User experience | Detailed but raw | Clean or nothing | Clean but generic | Informative but unusual | Best of both |
| Debuggability | Hard to tell why | Clear: missing data | Clear: missing | Clear: partial extract | Clear: what level matched |

---

## What's Wrong with Current Approach?

### The Main Issue:
**Using matched_text can show the entire raw log line, which:**
1. ❌ Clutters the diagnostic
2. ❌ Looks inconsistent (some messages clean, some raw)
3. ❌ Hides that annotation/extraction failed
4. ❌ Mixes semantic levels (pattern message vs log content)
5. ❌ Can be very long and hard to read

### Example of the Problem:
```
Two patterns match the same line:

Pattern 1 (good annotation):
  Message: "Failed authentication for user johndoe"

Pattern 2 (no annotation):
  Message: "2026-02-13 10:34:22.456 [AUTH-SERVICE] [THREAD-1234] ERROR Failed authentication for user johndoe from IP 192.168.1.100 reason=INVALID_PASSWORD retry_after=300 attempts=3/5 lockout_threshold=5"
  
Result: Inconsistent, confusing UX
```

---

## My Suggestion

**I recommend: Option B (Pattern Name) or Option D (Three-Tier)**

**Reason:**
1. **Consistent**: Messages are always semantic (pattern-level), never raw log-level
2. **Clean**: Fixed-length, informative messages
3. **Transparent**: Easy to see what happened (annotation missing, extraction failed, etc.)
4. **Professional**: Looks intentional, not broken

**Implementation:**

```rust
let merged_message = if annotation.is_empty() {
    tracing::warn!("Annotation is empty for pattern '{}'", detection.pattern.name);
    detection.pattern.name.clone()  // Use pattern name instead
} else {
    let substituted = Self::substitute_template(&annotation, &detection.field_values);
    if substituted.is_empty() {
        tracing::warn!("Annotation substitution resulted in empty string for pattern '{}'", detection.pattern.name);
        detection.pattern.name.clone()  // Use pattern name instead
    } else {
        substituted
    }
};
```

This way:
- ✅ Always shows something meaningful
- ✅ Messages are consistent
- ✅ Clear what happened (see the warning log)
- ✅ Better UX in editor

---

## Questions to Consider

1. **What should happen if annotation is missing?**
   - Current: Show raw log
   - Better: Show pattern name (descriptive)

2. **What should happen if field extraction fails?**
   - Current: Show raw log
   - Better: Show pattern name + log warning
   - Or: Show partial template with {{ MISSING_FIELD }}

3. **Should we differentiate between failures?**
   - Different message for "no annotation" vs "extraction failed"?

4. **What's the user expectation?**
   - Should they see: Pattern name, raw log, partial template, or nothing?

---

## Summary

The current fallback to `matched_text` assumes:
> "Better messy details than nothing"

But it causes:
- Inconsistent message quality
- Cluttered diagnostics
- Hidden data problems
- Mixing of semantic levels

**Alternatives are cleaner and more professional.**

What approach would you prefer?

