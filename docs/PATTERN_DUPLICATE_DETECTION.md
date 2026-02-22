# Pattern Duplicate Detection Strategy

**Date**: February 21, 2024  
**Purpose**: Prevent duplicate patterns and detect similar patterns across TagScout + User patterns  
**Status**: Design & Implementation Guide

---

## 📋 Executive Summary

**Duplicate Scenarios We Must Handle:**

1. ✅ Exact duplicates (same user uploads twice)
2. ✅ Cross-user duplicates (two users create identical pattern)
3. ✅ Similar patterns (same intent, different regex)
4. ✅ TagScout collision (user pattern duplicates TagScout)
5. ✅ Team overlap (same pattern in multiple teams)
6. ✅ Pattern updates (versioning, not duplication)

**Detection Methods:**
- **Exact match** - Content hash (instant)
- **Regex similarity** - Normalized comparison (fast)
- **Semantic similarity** - Description/intent matching (moderate)
- **Behavioral fingerprint** - What logs they match (slow, runtime)

---

## 🎯 Duplicate Detection Levels

### **Level 1: Exact Duplicate (BLOCK)**

**Scenario:**
```
User uploads:
  pattern: "HTTP/\d\.\d\s+500"
  description: "HTTP 500 Internal Server Error"

Existing pattern (same user or different):
  pattern: "HTTP/\d\.\d\s+500"
  description: "HTTP 500 Internal Server Error"

Action: BLOCK with error
```

**Detection Method:** Content hash

```javascript
// MongoDB unique index
db.user_patterns.createIndex(
  { "content_hash": 1, "team_id": 1 },
  { unique: true, name: "unique_content_per_team" }
);

// Content hash calculation
content_hash = SHA256(
  normalize_regex(pattern.pattern) +
  normalize_text(pattern.description) +
  pattern.severity +
  pattern.category
);
```

**Implementation:**

```rust
pub fn calculate_content_hash(pattern: &Pattern) -> String {
    let normalized_regex = normalize_regex(&pattern.pattern);
    let normalized_desc = normalize_text(&pattern.description);
    
    let content = format!(
        "{}|{}|{}|{}",
        normalized_regex,
        normalized_desc,
        pattern.severity,
        pattern.category
    );
    
    use sha2::{Sha256, Digest};
    let mut hasher = Sha256::new();
    hasher.update(content.as_bytes());
    format!("{:x}", hasher.finalize())
}

fn normalize_regex(regex: &str) -> String {
    regex
        .replace(r"\s+", r"\s+")      // Normalize whitespace
        .replace(r"\s*", r"\s*")      // Normalize optional space
        .replace("[ ]+", r"\s+")       // Convert space to \s+
        .trim()
        .to_lowercase()
}

fn normalize_text(text: &str) -> String {
    text
        .trim()
        .to_lowercase()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}
```

---

### **Level 2: Regex Similarity (WARN + SUGGEST)**

**Scenario:**
```
User uploads:
  pattern: "HTTP.*500.*Error"

Similar existing patterns:
  1. "HTTP/\d\.\d\s+500" (85% similar)
  2. "HTTP.*500" (90% similar)
  3. "HTTP response.*500.*Internal Server Error" (75% similar)

Action: WARN and show similar patterns
```

**Detection Method:** Regex edit distance + structure comparison

```rust
pub fn calculate_regex_similarity(regex1: &str, regex2: &str) -> f64 {
    let norm1 = normalize_regex(regex1);
    let norm2 = normalize_regex(regex2);
    
    // 1. Structure similarity (what they capture)
    let structure_sim = compare_regex_structure(&norm1, &norm2);
    
    // 2. Edit distance (how different the strings are)
    let edit_sim = 1.0 - (levenshtein_distance(&norm1, &norm2) as f64 
                          / norm1.len().max(norm2.len()) as f64);
    
    // 3. Token overlap (common patterns)
    let token_sim = calculate_token_overlap(&norm1, &norm2);
    
    // Weighted average
    (structure_sim * 0.5) + (edit_sim * 0.3) + (token_sim * 0.2)
}

fn compare_regex_structure(regex1: &str, regex2: &str) -> f64 {
    // Compare capture groups, quantifiers, character classes
    let captures1 = count_capture_groups(regex1);
    let captures2 = count_capture_groups(regex2);
    
    let quantifiers1 = count_quantifiers(regex1);
    let quantifiers2 = count_quantifiers(regex2);
    
    let char_classes1 = count_character_classes(regex1);
    let char_classes2 = count_character_classes(regex2);
    
    // Similarity based on structural elements
    let capture_sim = 1.0 - ((captures1 as i32 - captures2 as i32).abs() as f64 / 
                             captures1.max(captures2).max(1) as f64);
    let quant_sim = 1.0 - ((quantifiers1 as i32 - quantifiers2 as i32).abs() as f64 / 
                           quantifiers1.max(quantifiers2).max(1) as f64);
    let class_sim = 1.0 - ((char_classes1 as i32 - char_classes2 as i32).abs() as f64 / 
                           char_classes1.max(char_classes2).max(1) as f64);
    
    (capture_sim + quant_sim + class_sim) / 3.0
}

fn calculate_token_overlap(regex1: &str, regex2: &str) -> f64 {
    let tokens1: HashSet<_> = extract_meaningful_tokens(regex1).into_iter().collect();
    let tokens2: HashSet<_> = extract_meaningful_tokens(regex2).into_iter().collect();
    
    let intersection = tokens1.intersection(&tokens2).count();
    let union = tokens1.union(&tokens2).count();
    
    if union == 0 { 0.0 } else { intersection as f64 / union as f64 }
}

fn extract_meaningful_tokens(regex: &str) -> Vec<String> {
    // Extract words, numbers, common patterns
    let mut tokens = Vec::new();
    
    // Literal words
    for word in regex.split(|c: char| !c.is_alphanumeric()).filter(|w| w.len() > 2) {
        tokens.push(word.to_lowercase());
    }
    
    // Pattern elements
    if regex.contains(r"\d") { tokens.push("digit".into()); }
    if regex.contains(r"\w") { tokens.push("word".into()); }
    if regex.contains(r"\s") { tokens.push("space".into()); }
    if regex.contains("HTTP") { tokens.push("http".into()); }
    
    tokens
}
```

**MongoDB Query:**

```javascript
// Find similar patterns
db.user_patterns.aggregate([
  {
    $addFields: {
      normalized_pattern: {
        $toLower: "$pattern.pattern"
      }
    }
  },
  {
    $match: {
      $or: [
        // Text search on normalized pattern
        { normalized_pattern: { $regex: "http.*500", $options: "i" } },
        // Category match
        { "pattern.category": "HTTP" }
      ]
    }
  },
  {
    $project: {
      pattern: 1,
      similarity_score: 1  // Computed in application
    }
  }
]);
```

---

### **Level 3: Semantic Similarity (INFO + SUGGEST MERGE)**

**Scenario:**
```
User uploads:
  name: "HTTP Internal Server Error"
  description: "Catches 500 errors from web server"

Similar patterns (by intent):
  1. name: "HTTP 500 Error Detection"
     description: "Detects internal server errors (500)"
     → 80% semantic similarity

  2. name: "Server Error Pattern"
     description: "Matches HTTP 500 status codes"
     → 70% semantic similarity

Action: INFO - Suggest reviewing similar patterns
```

**Detection Method:** Text embedding + cosine similarity

```rust
pub fn calculate_semantic_similarity(
    pattern1: &Pattern,
    pattern2: &Pattern,
) -> f64 {
    // Combine name + description for semantic comparison
    let text1 = format!("{} {}", pattern1.name, pattern1.description);
    let text2 = format!("{} {}", pattern2.name, pattern2.description);
    
    // Simple token-based similarity (can upgrade to embeddings)
    let tokens1 = tokenize_and_stem(&text1);
    let tokens2 = tokenize_and_stem(&text2);
    
    let set1: HashSet<_> = tokens1.into_iter().collect();
    let set2: HashSet<_> = tokens2.into_iter().collect();
    
    let intersection = set1.intersection(&set2).count();
    let union = set1.union(&set2).count();
    
    if union == 0 { 0.0 } else { intersection as f64 / union as f64 }
}

fn tokenize_and_stem(text: &str) -> Vec<String> {
    text.to_lowercase()
        .split(|c: char| !c.is_alphanumeric())
        .filter(|w| w.len() > 2)
        .map(|w| stem(w))  // Basic stemming
        .collect()
}

fn stem(word: &str) -> String {
    // Simple stemming rules
    let word = word.trim_end_matches("ing");
    let word = word.trim_end_matches("ed");
    let word = word.trim_end_matches("s");
    word.to_string()
}
```

**Advanced: Using Text Embeddings** (Optional)

```rust
// Using sentence transformers or similar
pub async fn calculate_embedding_similarity(
    text1: &str,
    text2: &str,
    embedding_service: &EmbeddingService,
) -> Result<f64> {
    let embedding1 = embedding_service.embed(text1).await?;
    let embedding2 = embedding_service.embed(text2).await?;
    
    Ok(cosine_similarity(&embedding1, &embedding2))
}

fn cosine_similarity(vec1: &[f32], vec2: &[f32]) -> f64 {
    let dot_product: f32 = vec1.iter().zip(vec2).map(|(a, b)| a * b).sum();
    let magnitude1: f32 = vec1.iter().map(|x| x * x).sum::<f32>().sqrt();
    let magnitude2: f32 = vec2.iter().map(|x| x * x).sum::<f32>().sqrt();
    
    (dot_product / (magnitude1 * magnitude2)) as f64
}
```

---

### **Level 4: Behavioral Fingerprint (RUNTIME DETECTION)**

**Scenario:**
```
Two patterns that look different but match the same logs:

Pattern A: "HTTP/\d\.\d\s+500"
Pattern B: "HTTP.*500.*"

Runtime detection:
  - Both patterns match same 500 log lines
  - Behavioral overlap: 95%
  - Suggest: Pattern B is too broad, use Pattern A

Action: SUGGEST consolidation after runtime analysis
```

**Detection Method:** Log matching overlap

```rust
pub struct PatternFingerprint {
    pub pattern_id: String,
    pub matched_log_hashes: HashSet<u64>,  // Hashes of matched logs
    pub match_count: usize,
}

pub fn calculate_behavioral_overlap(
    fp1: &PatternFingerprint,
    fp2: &PatternFingerprint,
) -> f64 {
    let intersection = fp1.matched_log_hashes
        .intersection(&fp2.matched_log_hashes)
        .count();
    
    let union = fp1.matched_log_hashes
        .union(&fp2.matched_log_hashes)
        .count();
    
    if union == 0 { 0.0 } else { intersection as f64 / union as f64 }
}

// Track during runtime
impl PatternEngine {
    pub fn record_match(&mut self, pattern_id: &str, log_line: &str) {
        let log_hash = hash_log_line(log_line);
        
        self.fingerprints
            .entry(pattern_id.to_string())
            .or_insert_with(|| PatternFingerprint {
                pattern_id: pattern_id.to_string(),
                matched_log_hashes: HashSet::new(),
                match_count: 0,
            })
            .matched_log_hashes
            .insert(log_hash);
    }
    
    pub fn detect_behavioral_duplicates(&self, threshold: f64) -> Vec<(String, String, f64)> {
        let mut duplicates = Vec::new();
        let patterns: Vec<_> = self.fingerprints.values().collect();
        
        for i in 0..patterns.len() {
            for j in (i+1)..patterns.len() {
                let overlap = calculate_behavioral_overlap(patterns[i], patterns[j]);
                if overlap >= threshold {
                    duplicates.push((
                        patterns[i].pattern_id.clone(),
                        patterns[j].pattern_id.clone(),
                        overlap
                    ));
                }
            }
        }
        
        duplicates
    }
}

fn hash_log_line(log_line: &str) -> u64 {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    
    let normalized = log_line.trim().to_lowercase();
    let mut hasher = DefaultHasher::new();
    normalized.hash(&mut hasher);
    hasher.finish()
}
```

---

## 🗄️ MongoDB Schema for Duplicate Detection

### **Enhanced user_patterns Collection**

```javascript
{
  _id: ObjectId("..."),
  
  // Pattern content
  pattern: { /* ... */ },
  
  // Duplicate detection metadata
  deduplication: {
    // Content hash for exact duplicate detection
    content_hash: "a1b2c3d4e5f6...",  // SHA256
    
    // Normalized regex for similarity search
    normalized_regex: "http.*500.*error",
    
    // Text tokens for semantic search
    semantic_tokens: ["http", "500", "error", "internal", "server"],
    
    // Behavioral fingerprint (populated at runtime)
    fingerprint: {
      sample_matches: 1523,
      unique_log_hashes: ["hash1", "hash2", ...],  // Sample
      last_updated: ISODate("2024-02-21T10:00:00Z")
    }
  },
  
  // Relationships
  relationships: {
    // If this pattern was derived from another
    derived_from: ObjectId("..."),
    
    // Similar patterns detected
    similar_patterns: [
      {
        pattern_id: ObjectId("..."),
        similarity_type: "regex",  // regex, semantic, behavioral
        similarity_score: 0.85,
        detected_at: ISODate("2024-02-21T10:00:00Z")
      }
    ],
    
    // If this pattern supersedes another
    supersedes: [ObjectId("...")]
  },
  
  // Rest of schema...
}
```

### **Indexes for Fast Duplicate Detection**

```javascript
// Exact duplicate prevention
db.user_patterns.createIndex(
  { "deduplication.content_hash": 1, "team_id": 1 },
  { unique: true, sparse: true }
);

// Regex similarity search
db.user_patterns.createIndex(
  { "deduplication.normalized_regex": "text" }
);

// Semantic similarity search
db.user_patterns.createIndex(
  { "deduplication.semantic_tokens": 1 }
);

// Category-based grouping
db.user_patterns.createIndex(
  { "pattern.category": 1, "pattern.severity": 1 }
);
```

---

## 🚦 Duplicate Detection Workflow

### **Pre-Upload Validation**

```rust
pub async fn validate_pattern_before_upload(
    pattern: &Pattern,
    mongodb: &Database,
    team_id: &str,
) -> Result<DuplicateCheckResult> {
    let mut result = DuplicateCheckResult::default();
    
    // 1. Calculate hashes and normalized forms
    let content_hash = calculate_content_hash(pattern);
    let normalized_regex = normalize_regex(&pattern.pattern);
    let semantic_tokens = tokenize_and_stem(&format!("{} {}", pattern.name, pattern.description));
    
    // 2. Check exact duplicate (Level 1)
    let exact_match = mongodb
        .collection::<Document>("user_patterns")
        .find_one(
            doc! {
                "deduplication.content_hash": &content_hash,
                "team_id": team_id
            },
            None,
        )
        .await?;
    
    if let Some(existing) = exact_match {
        result.has_exact_duplicate = true;
        result.exact_duplicate_id = existing.get_object_id("_id").ok().map(|id| id.to_string());
        result.severity = DuplicateSeverity::Error;
        result.message = "Exact duplicate pattern already exists".into();
        return Ok(result);  // BLOCK
    }
    
    // 3. Check regex similarity (Level 2)
    let similar_patterns = find_similar_patterns_by_regex(
        mongodb,
        &normalized_regex,
        team_id,
        0.70,  // 70% similarity threshold
    ).await?;
    
    if !similar_patterns.is_empty() {
        result.has_similar_patterns = true;
        result.similar_patterns = similar_patterns.clone();
        result.severity = DuplicateSeverity::Warning;
        result.message = format!(
            "Found {} similar pattern(s). Consider reviewing before uploading.",
            similar_patterns.len()
        );
    }
    
    // 4. Check semantic similarity (Level 3)
    let semantic_matches = find_similar_patterns_by_semantics(
        mongodb,
        &semantic_tokens,
        team_id,
        0.60,  // 60% semantic similarity
    ).await?;
    
    if !semantic_matches.is_empty() {
        result.semantic_matches = semantic_matches;
        if result.severity == DuplicateSeverity::None {
            result.severity = DuplicateSeverity::Info;
            result.message = "Found patterns with similar intent. Review recommended.".into();
        }
    }
    
    // 5. Check TagScout collision
    let tagscout_collision = check_tagscout_collision(
        mongodb,
        pattern,
        0.90,  // 90% similarity to TagScout = suggest override
    ).await?;
    
    if let Some(tagscout_pattern) = tagscout_collision {
        result.tagscout_collision = Some(tagscout_pattern);
        result.severity = DuplicateSeverity::Warning;
        result.message = "Similar pattern exists in TagScout. Consider using pattern override instead of creating new pattern.".into();
    }
    
    Ok(result)
}

#[derive(Debug, Clone)]
pub struct DuplicateCheckResult {
    pub has_exact_duplicate: bool,
    pub exact_duplicate_id: Option<String>,
    
    pub has_similar_patterns: bool,
    pub similar_patterns: Vec<SimilarPattern>,
    
    pub semantic_matches: Vec<SimilarPattern>,
    
    pub tagscout_collision: Option<Pattern>,
    
    pub severity: DuplicateSeverity,
    pub message: String,
}

#[derive(Debug, Clone, PartialEq)]
pub enum DuplicateSeverity {
    None,
    Info,      // Semantic matches - informational only
    Warning,   // Similar patterns - user should review
    Error,     // Exact duplicate - block upload
}

#[derive(Debug, Clone)]
pub struct SimilarPattern {
    pub pattern_id: String,
    pub name: String,
    pub similarity_score: f64,
    pub similarity_type: String,  // "regex", "semantic", "behavioral"
    pub created_by: String,
}
```

---

## 🎨 UI/UX for Duplicate Detection

### **Scenario 1: Exact Duplicate (Error)**

```
┌─────────────────────────────────────────────────────────────┐
│ ❌ Cannot Upload Pattern                                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  This pattern already exists:                                │
│                                                              │
│  📋 Pattern Name: HTTP 500 Error Detection                   │
│  👤 Created by: john@cisco.com                               │
│  📅 Created: 2024-02-15                                      │
│  ⭐ Quality Score: 85/100 (Grade B)                          │
│                                                              │
│  Suggestion: Use the existing pattern or create an          │
│  override if you need to customize it.                       │
│                                                              │
│  [View Existing Pattern] [Create Override Instead] [Cancel] │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### **Scenario 2: Similar Patterns (Warning)**

```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️  Similar Patterns Detected                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Your pattern:                                               │
│  Pattern: HTTP.*500.*Error                                   │
│  Name: HTTP Internal Server Error                            │
│                                                              │
│  Found 2 similar patterns:                                   │
│                                                              │
│  1. HTTP 500 Detection (85% similar)                         │
│     Created by: sarah@cisco.com                              │
│     Pattern: HTTP/\d\.\d\s+500                               │
│     [View Details]                                           │
│                                                              │
│  2. Server Error Pattern (78% similar)                       │
│     Created by: mike@cisco.com                               │
│     Pattern: HTTP.*500.*                                     │
│     [View Details]                                           │
│                                                              │
│  ⚠️  Uploading similar patterns can cause:                   │
│     • Duplicate diagnostics                                  │
│     • Performance degradation                                │
│     • Team confusion                                         │
│                                                              │
│  [Review Similar Patterns] [Upload Anyway] [Cancel]         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### **Scenario 3: TagScout Collision (Warning)**

```
┌─────────────────────────────────────────────────────────────┐
│ 💡 TagScout Pattern Already Exists                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Your pattern is very similar (90%) to a TagScout pattern:  │
│                                                              │
│  📦 TagScout Pattern:                                        │
│  ID: 5bdf4f12bb2545966802cdb0                                │
│  Name: HTTP Internal Server Error                            │
│  Pattern: HTTP/\d\.\d\s+500                                  │
│  Quality: A (95/100)                                         │
│                                                              │
│  ✅ Recommendation:                                          │
│  Instead of creating a new pattern, create a                 │
│  "Pattern Override" to customize the existing one.           │
│                                                              │
│  Benefits of override:                                       │
│  • Inherits updates from TagScout                            │
│  • No duplicate diagnostics                                  │
│  • Easier to maintain                                        │
│                                                              │
│  [Create Override] [Upload New Pattern Anyway] [Cancel]     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Runtime Duplicate Detection

### **Background Job: Detect Behavioral Duplicates**

```rust
pub async fn run_behavioral_duplicate_detection(
    mongodb: &Database,
    pattern_engine: &PatternEngine,
) -> Result<()> {
    tracing::info!("Running behavioral duplicate detection...");
    
    // Get behavioral overlaps from runtime data
    let duplicates = pattern_engine.detect_behavioral_duplicates(0.90);  // 90% overlap
    
    if duplicates.is_empty() {
        tracing::info!("No behavioral duplicates detected");
        return Ok(());
    }
    
    tracing::warn!("Found {} behavioral duplicate pairs", duplicates.len());
    
    // Update MongoDB with detected relationships
    for (pattern_id1, pattern_id2, overlap) in duplicates {
        mongodb
            .collection::<Document>("user_patterns")
            .update_one(
                doc! { "_id": ObjectId::parse_str(&pattern_id1)? },
                doc! {
                    "$addToSet": {
                        "relationships.similar_patterns": {
                            "pattern_id": ObjectId::parse_str(&pattern_id2)?,
                            "similarity_type": "behavioral",
                            "similarity_score": overlap,
                            "detected_at": Utc::now()
                        }
                    }
                },
                None,
            )
            .await?;
        
        // Notify pattern owners
        notify_pattern_owner(
            &pattern_id1,
            &format!(
                "Your pattern has {}% behavioral overlap with another pattern. Consider consolidating.",
                (overlap * 100.0) as u32
            )
        ).await?;
    }
    
    Ok(())
}

// Run daily
pub async fn schedule_duplicate_detection(
    mongodb: Database,
    pattern_engine: Arc<RwLock<PatternEngine>>,
) {
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_secs(86400));  // 24 hours
        
        loop {
            interval.tick().await;
            
            let engine = pattern_engine.read().await;
            if let Err(e) = run_behavioral_duplicate_detection(&mongodb, &*engine).await {
                tracing::error!("Behavioral duplicate detection failed: {}", e);
            }
        }
    });
}
```

---

## 📊 Duplicate Detection Dashboard

### **Team Pattern Health View**

```
┌─────────────────────────────────────────────────────────────┐
│ 📊 Pattern Health Dashboard - Engineering Team              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Total Patterns: 156                                         │
│  ├─ TagScout: 1,224                                         │
│  ├─ Team Created: 156                                       │
│  └─ Active: 142 | Deprecated: 14                            │
│                                                              │
│  ⚠️  Duplicate Issues:                                       │
│  ├─ Exact Duplicates: 0                                     │
│  ├─ High Similarity (>80%): 8 pattern groups                │
│  ├─ Behavioral Overlap (>90%): 3 pattern pairs              │
│  └─ TagScout Collisions: 12                                 │
│                                                              │
│  🎯 Recommended Actions:                                     │
│  1. Review 8 similar pattern groups [Review]                │
│  2. Consolidate 3 overlapping patterns [View Details]       │
│  3. Convert 12 collisions to overrides [Start Wizard]       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎛️ Configuration

```yaml
# config/duplicate_detection.yaml
duplicate_detection:
  # Level 1: Exact duplicate detection
  exact_match:
    enabled: true
    action: "block"  # block, warn, allow
  
  # Level 2: Regex similarity
  regex_similarity:
    enabled: true
    threshold: 0.70  # 70% similarity triggers warning
    action: "warn"
  
  # Level 3: Semantic similarity
  semantic_similarity:
    enabled: true
    threshold: 0.60  # 60% semantic similarity
    action: "info"
  
  # Level 4: Behavioral fingerprint
  behavioral_detection:
    enabled: true
    threshold: 0.90  # 90% log overlap
    check_interval_hours: 24
    action: "notify"  # notify, warn, suggest_merge
  
  # TagScout collision detection
  tagscout_collision:
    enabled: true
    threshold: 0.90  # 90% similarity to TagScout
    action: "suggest_override"
  
  # Team-specific overrides
  team_overrides:
    allow_duplicates_across_teams: true  # Same pattern in different teams OK
    require_approval_for_similar: true   # Similar patterns need approval
```

---

## ✅ Implementation Checklist

### **Phase 1: Basic Detection (3 days)**
- [ ] Implement content hash calculation
- [ ] Add MongoDB unique index on content_hash
- [ ] Implement exact duplicate blocking
- [ ] Add UI error message for exact duplicates

### **Phase 2: Similarity Detection (4 days)**
- [ ] Implement regex normalization
- [ ] Implement regex similarity algorithm
- [ ] Add MongoDB text indexes
- [ ] Implement similarity search queries
- [ ] Add UI warning for similar patterns

### **Phase 3: Semantic Detection (3 days)**
- [ ] Implement text tokenization and stemming
- [ ] Implement semantic similarity calculation
- [ ] Add semantic search to pre-upload check
- [ ] Add UI info panel for semantic matches

### **Phase 4: Behavioral Detection (5 days)**
- [ ] Implement pattern fingerprinting in runtime
- [ ] Add fingerprint storage in MongoDB
- [ ] Implement behavioral overlap detection
- [ ] Schedule background detection job
- [ ] Add notification system for detected duplicates

### **Phase 5: Dashboard (3 days)**
- [ ] Create pattern health dashboard
- [ ] Add duplicate detection metrics
- [ ] Implement consolidation wizard
- [ ] Add TagScout collision converter

---

## 🎯 Success Metrics

**Goals:**
- ✅ Zero exact duplicates in database
- ✅ <5% high-similarity patterns (>80%)
- ✅ <10% TagScout collisions
- ✅ Team satisfaction with duplicate detection

**Monitoring:**
```javascript
// MongoDB aggregation
db.user_patterns.aggregate([
  {
    $group: {
      _id: "$deduplication.content_hash",
      count: { $sum: 1 },
      patterns: { $push: "$_id" }
    }
  },
  {
    $match: { count: { $gt: 1 } }
  }
]);

// Result: List of duplicate groups (should be empty)
```

---

## 📚 References

**Related Documentation:**
- `PATTERN_MANAGEMENT_STRATEGY.md` - Overall architecture
- `PATTERN_QUALITY_EVALUATION.md` - Quality scoring system
- `crates/pattern-engine/src/learning.rs` - Learning system

**MongoDB Collections:**
- `user_patterns.deduplication` - Duplicate detection metadata
- `user_patterns.relationships` - Pattern relationships
- `pattern_metrics` - Runtime behavioral data

---

**Status**: Design Complete, Ready for Implementation  
**Estimated Effort**: 18 days (3.5 weeks)  
**Priority**: HIGH - Critical for collaborative pattern system