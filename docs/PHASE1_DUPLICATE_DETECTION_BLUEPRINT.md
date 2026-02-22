# Phase 1: Duplicate Detection - Implementation Blueprint

**Version**: 1.0  
**Timeline**: 2 weeks (10 working days)  
**Effort**: 10-15 person-days  
**Status**: Ready to implement  

---

## 📋 Executive Summary

This blueprint provides a step-by-step implementation guide for Phase 1: Duplicate Detection. By following this plan, you'll prevent 60-80% of duplicate patterns within 2 weeks.

**What You'll Build**:
- Level 1: Exact duplicate detection (content hash)
- Level 2: Regex similarity detection (structural comparison)
- Level 3: Semantic similarity detection (optional, requires LLM)
- Level 4: Behavioral fingerprint detection (background job)
- User-friendly UI/UX workflow

**Success Criteria**:
- ✅ 80%+ exact duplicates blocked
- ✅ 60%+ similar patterns detected
- ✅ User feedback positive (helpful, not annoying)
- ✅ <100ms overhead per pattern upload
- ✅ Zero false negatives (never block valid unique patterns)

---

## 🗓️ Day-by-Day Implementation Plan

### Week 1: Core Detection (Days 1-5)

#### **Day 1: Level 1 - Exact Duplicate Detection**

**Goal**: Block identical patterns from being uploaded

**Tasks**:
1. Create `pattern_deduplication.rs` module
2. Implement content hash algorithm
3. Add MongoDB index on `content_hash`
4. Create pre-upload validation function
5. Write unit tests

**Files to Create/Modify**:
- `src/services/pattern_deduplication.rs` (new)
- `src/models/user_pattern.rs` (modify schema)
- `src/api/pattern_upload.rs` (add validation)

**Code Skeleton**:

```rust
// src/services/pattern_deduplication.rs

use sha2::{Sha256, Digest};
use serde::{Serialize, Deserialize};
use regex::Regex;

/// Duplicate check result returned to UI
#[derive(Debug, Serialize, Deserialize)]
pub struct DuplicateCheckResult {
    pub has_exact_duplicate: bool,
    pub exact_duplicate_id: Option<String>,
    pub has_similar_patterns: bool,
    pub similar_patterns: Vec<SimilarPattern>,
    pub severity: DuplicateSeverity,
    pub message: String,
    pub suggested_action: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum DuplicateSeverity {
    None,      // No duplicates found
    Info,      // Similar patterns exist (informational)
    Warning,   // Very similar patterns exist (should review)
    Error,     // Exact duplicate exists (block)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SimilarPattern {
    pub pattern_id: String,
    pub name: String,
    pub pattern: String,
    pub similarity_score: f64,
    pub similarity_type: String,
    pub created_by: String,
    pub created_at: String,
}

/// Calculate content hash for exact duplicate detection
pub fn calculate_content_hash(pattern: &str, category: &str, severity: &str) -> String {
    let normalized_pattern = normalize_regex(pattern);
    let content = format!("{}:{}:{}", normalized_pattern, category, severity);
    
    let mut hasher = Sha256::new();
    hasher.update(content.as_bytes());
    format!("{:x}", hasher.finalize())
}

/// Normalize regex pattern for consistent hashing
fn normalize_regex(pattern: &str) -> String {
    pattern.trim()
        .to_lowercase()
        .replace(r"\s+", " ")  // Normalize whitespace
        .replace("  ", " ")     // Collapse multiple spaces
}

/// Check for exact duplicates in MongoDB
pub async fn check_exact_duplicate(
    db: &mongodb::Database,
    team_id: &str,
    content_hash: &str,
) -> Result<Option<String>, Box<dyn std::error::Error>> {
    let collection = db.collection::<mongodb::bson::Document>("user_patterns");
    
    let filter = mongodb::bson::doc! {
        "team_id": team_id,
        "deduplication.content_hash": content_hash,
    };
    
    if let Some(doc) = collection.find_one(filter, None).await? {
        let pattern_id = doc.get_str("_id").ok().map(String::from);
        Ok(pattern_id)
    } else {
        Ok(None)
    }
}
```

**MongoDB Schema Update**:

```javascript
// Add to user_patterns collection
{
  _id: ObjectId,
  pattern: { ... },
  team_id: "team_123",
  
  // NEW: Deduplication metadata
  deduplication: {
    content_hash: "sha256_hash_here",
    normalized_regex: "error.*timeout",
    created_at: ISODate("2024-01-01"),
  }
}

// NEW: Index for fast exact duplicate lookup
db.user_patterns.createIndex(
  { "team_id": 1, "deduplication.content_hash": 1 },
  { unique: true, sparse: true, name: "idx_content_hash" }
);
```

**Deliverable**: Exact duplicates are blocked with clear error message.

---

#### **Day 2: Level 2 - Regex Similarity Detection (Part 1)**

**Goal**: Detect structurally similar regex patterns

**Tasks**:
1. Implement regex tokenization
2. Implement structural comparison algorithm
3. Calculate similarity score (0.0 - 1.0)
4. Write unit tests with edge cases
5. Benchmark performance (<10ms target)

**Code Skeleton**:

```rust
// src/services/pattern_deduplication.rs (continued)

use std::collections::HashSet;

/// Calculate similarity between two regex patterns
/// Returns score from 0.0 (completely different) to 1.0 (identical)
pub fn calculate_regex_similarity(pattern1: &str, pattern2: &str) -> f64 {
    let tokens1 = extract_meaningful_tokens(pattern1);
    let tokens2 = extract_meaningful_tokens(pattern2);
    
    // Calculate Jaccard similarity
    let intersection: HashSet<_> = tokens1.intersection(&tokens2).collect();
    let union: HashSet<_> = tokens1.union(&tokens2).collect();
    
    if union.is_empty() {
        return 0.0;
    }
    
    let jaccard = intersection.len() as f64 / union.len() as f64;
    
    // Also compare structure (character types)
    let structure_score = compare_regex_structure(pattern1, pattern2);
    
    // Weighted combination
    0.7 * jaccard + 0.3 * structure_score
}

/// Extract meaningful tokens from regex pattern
fn extract_meaningful_tokens(pattern: &str) -> HashSet<String> {
    let mut tokens = HashSet::new();
    
    // Extract literal words (3+ chars)
    let word_regex = Regex::new(r"[a-zA-Z]{3,}").unwrap();
    for word in word_regex.find_iter(pattern) {
        tokens.insert(word.as_str().to_lowercase());
    }
    
    // Extract regex metacharacters
    let meta_chars = vec![r"\d", r"\w", r"\s", r".*", r".+", r"\b"];
    for meta in meta_chars {
        if pattern.contains(meta) {
            tokens.insert(meta.to_string());
        }
    }
    
    tokens
}

/// Compare structural similarity of regex patterns
fn compare_regex_structure(pattern1: &str, pattern2: &str) -> f64 {
    let struct1 = extract_structure_signature(pattern1);
    let struct2 = extract_structure_signature(pattern2);
    
    // Calculate Levenshtein distance
    let distance = levenshtein_distance(&struct1, &struct2);
    let max_len = struct1.len().max(struct2.len()) as f64;
    
    if max_len == 0.0 {
        return 1.0;
    }
    
    1.0 - (distance as f64 / max_len)
}

/// Extract structure signature (e.g., "LLLWWWLLL" for "abc\d+def")
fn extract_structure_signature(pattern: &str) -> String {
    let mut sig = String::new();
    let mut chars = pattern.chars().peekable();
    
    while let Some(ch) = chars.next() {
        if ch == '\\' {
            if let Some(next) = chars.peek() {
                sig.push(match next {
                    'd' | 'w' | 's' => 'W',  // Wildcard
                    _ => 'E',                 // Escape
                });
                chars.next();
            }
        } else if ch.is_alphanumeric() {
            sig.push('L');  // Literal
        } else if ".*+?[]{}()".contains(ch) {
            sig.push('M');  // Metacharacter
        }
    }
    
    sig
}

/// Simple Levenshtein distance implementation
fn levenshtein_distance(s1: &str, s2: &str) -> usize {
    let len1 = s1.len();
    let len2 = s2.len();
    let mut matrix = vec![vec![0; len2 + 1]; len1 + 1];
    
    for i in 0..=len1 {
        matrix[i][0] = i;
    }
    for j in 0..=len2 {
        matrix[0][j] = j;
    }
    
    for (i, c1) in s1.chars().enumerate() {
        for (j, c2) in s2.chars().enumerate() {
            let cost = if c1 == c2 { 0 } else { 1 };
            matrix[i + 1][j + 1] = (matrix[i][j + 1] + 1)
                .min(matrix[i + 1][j] + 1)
                .min(matrix[i][j] + cost);
        }
    }
    
    matrix[len1][len2]
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_identical_patterns() {
        let pattern = r"ERROR: Connection timeout (\d+)ms";
        assert_eq!(calculate_regex_similarity(pattern, pattern), 1.0);
    }
    
    #[test]
    fn test_similar_patterns() {
        let p1 = r"ERROR: Connection timeout (\d+)ms";
        let p2 = r"ERROR: Connection timeout (\d+) milliseconds";
        let score = calculate_regex_similarity(p1, p2);
        assert!(score > 0.7, "Expected high similarity, got {}", score);
    }
    
    #[test]
    fn test_different_patterns() {
        let p1 = r"ERROR: Connection timeout";
        let p2 = r"SUCCESS: User login complete";
        let score = calculate_regex_similarity(p1, p2);
        assert!(score < 0.3, "Expected low similarity, got {}", score);
    }
}
```

**Deliverable**: Similarity calculation works with >90% accuracy on test cases.

---

#### **Day 3: Level 2 - Regex Similarity Detection (Part 2)**

**Goal**: Query MongoDB for similar patterns and return results

**Tasks**:
1. Implement MongoDB similarity search
2. Add normalized_regex index
3. Integrate with validation flow
4. Performance optimization
5. Write integration tests

**Code Skeleton**:

```rust
// src/services/pattern_deduplication.rs (continued)

/// Find similar patterns in MongoDB
pub async fn find_similar_patterns(
    db: &mongodb::Database,
    team_id: &str,
    pattern: &str,
    similarity_threshold: f64,
) -> Result<Vec<SimilarPattern>, Box<dyn std::error::Error>> {
    let collection = db.collection::<mongodb::bson::Document>("user_patterns");
    
    // Step 1: Get candidate patterns (same category, active)
    let filter = mongodb::bson::doc! {
        "team_id": team_id,
        "pattern.category": extract_category_hint(pattern),
        "status": "active",
    };
    
    let mut cursor = collection.find(filter, None).await?;
    let mut similar_patterns = Vec::new();
    
    // Step 2: Calculate similarity for each candidate
    while let Some(doc) = cursor.next().await {
        if let Ok(doc) = doc {
            let existing_pattern = doc.get_str("pattern.pattern").ok();
            let pattern_id = doc.get_str("_id").ok();
            let name = doc.get_str("pattern.name").ok();
            
            if let (Some(existing), Some(id), Some(name)) = (existing_pattern, pattern_id, name) {
                let score = calculate_regex_similarity(pattern, existing);
                
                if score >= similarity_threshold {
                    similar_patterns.push(SimilarPattern {
                        pattern_id: id.to_string(),
                        name: name.to_string(),
                        pattern: existing.to_string(),
                        similarity_score: score,
                        similarity_type: "regex_structural".to_string(),
                        created_by: doc.get_str("created_by").unwrap_or("unknown").to_string(),
                        created_at: doc.get_str("created_at").unwrap_or("").to_string(),
                    });
                }
            }
        }
    }
    
    // Sort by similarity score (highest first)
    similar_patterns.sort_by(|a, b| {
        b.similarity_score.partial_cmp(&a.similarity_score).unwrap()
    });
    
    Ok(similar_patterns)
}

/// Extract category hint from pattern for filtering
fn extract_category_hint(pattern: &str) -> String {
    let pattern_lower = pattern.to_lowercase();
    
    if pattern_lower.contains("error") || pattern_lower.contains("exception") {
        "error".to_string()
    } else if pattern_lower.contains("warn") {
        "warning".to_string()
    } else if pattern_lower.contains("info") {
        "info".to_string()
    } else {
        "unknown".to_string()
    }
}
```

**MongoDB Index**:

```javascript
// Add index for faster category filtering
db.user_patterns.createIndex(
  { "team_id": 1, "pattern.category": 1, "status": 1 },
  { name: "idx_team_category_status" }
);
```

**Deliverable**: Similar patterns are found in <50ms on database with 1000+ patterns.

---

#### **Day 4: Pre-Upload Validation Workflow**

**Goal**: Integrate detection into pattern upload API

**Tasks**:
1. Create unified validation function
2. Add to pattern upload endpoint
3. Return appropriate error/warning responses
4. Add configuration for thresholds
5. Write API integration tests

**Code Skeleton**:

```rust
// src/services/pattern_deduplication.rs (continued)

/// Main validation function called before pattern upload
pub async fn validate_pattern_before_upload(
    db: &mongodb::Database,
    team_id: &str,
    pattern: &str,
    category: &str,
    severity: &str,
    config: &DuplicationConfig,
) -> Result<DuplicateCheckResult, Box<dyn std::error::Error>> {
    
    let mut result = DuplicateCheckResult {
        has_exact_duplicate: false,
        exact_duplicate_id: None,
        has_similar_patterns: false,
        similar_patterns: Vec::new(),
        severity: DuplicateSeverity::None,
        message: String::new(),
        suggested_action: String::new(),
    };
    
    // Level 1: Check for exact duplicate
    if config.exact_match_enabled {
        let content_hash = calculate_content_hash(pattern, category, severity);
        
        if let Some(duplicate_id) = check_exact_duplicate(db, team_id, &content_hash).await? {
            result.has_exact_duplicate = true;
            result.exact_duplicate_id = Some(duplicate_id.clone());
            result.severity = DuplicateSeverity::Error;
            result.message = format!(
                "This pattern already exists (ID: {}). Cannot create duplicate.",
                duplicate_id
            );
            result.suggested_action = "Use the existing pattern or modify this pattern to make it unique.".to_string();
            return Ok(result);  // Stop here - exact duplicate blocks upload
        }
    }
    
    // Level 2: Check for similar patterns
    if config.regex_similarity_enabled {
        let similar = find_similar_patterns(
            db,
            team_id,
            pattern,
            config.regex_similarity_threshold,
        ).await?;
        
        if !similar.is_empty() {
            result.has_similar_patterns = true;
            result.similar_patterns = similar;
            result.severity = DuplicateSeverity::Warning;
            result.message = format!(
                "Found {} similar pattern(s). Consider using or enhancing an existing pattern.",
                result.similar_patterns.len()
            );
            result.suggested_action = "Review similar patterns below. You can still create this pattern if it's truly different.".to_string();
        }
    }
    
    Ok(result)
}

/// Configuration for duplicate detection
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DuplicationConfig {
    pub exact_match_enabled: bool,
    pub regex_similarity_enabled: bool,
    pub regex_similarity_threshold: f64,  // Default: 0.75
}

impl Default for DuplicationConfig {
    fn default() -> Self {
        Self {
            exact_match_enabled: true,
            regex_similarity_enabled: true,
            regex_similarity_threshold: 0.75,
        }
    }
}
```

**API Integration**:

```rust
// src/api/pattern_upload.rs

use crate::services::pattern_deduplication::{validate_pattern_before_upload, DuplicationConfig};

#[post("/api/patterns/validate")]
pub async fn validate_pattern(
    db: web::Data<mongodb::Database>,
    pattern_data: web::Json<PatternUploadRequest>,
    user: AuthenticatedUser,
) -> Result<HttpResponse, Error> {
    
    let config = DuplicationConfig::default();
    
    match validate_pattern_before_upload(
        &db,
        &user.team_id,
        &pattern_data.pattern,
        &pattern_data.category,
        &pattern_data.severity,
        &config,
    ).await {
        Ok(result) => Ok(HttpResponse::Ok().json(result)),
        Err(e) => {
            error!("Validation error: {}", e);
            Ok(HttpResponse::InternalServerError().json(json!({
                "error": "Validation failed",
                "details": e.to_string(),
            })))
        }
    }
}

#[post("/api/patterns/upload")]
pub async fn upload_pattern(
    db: web::Data<mongodb::Database>,
    pattern_data: web::Json<PatternUploadRequest>,
    user: AuthenticatedUser,
) -> Result<HttpResponse, Error> {
    
    // Validate first
    let config = DuplicationConfig::default();
    let validation = validate_pattern_before_upload(
        &db,
        &user.team_id,
        &pattern_data.pattern,
        &pattern_data.category,
        &pattern_data.severity,
        &config,
    ).await?;
    
    // Block if exact duplicate
    if validation.has_exact_duplicate {
        return Ok(HttpResponse::Conflict().json(validation));
    }
    
    // Calculate content hash for storage
    let content_hash = calculate_content_hash(
        &pattern_data.pattern,
        &pattern_data.category,
        &pattern_data.severity,
    );
    
    let normalized_regex = normalize_regex(&pattern_data.pattern);
    
    // Create pattern document
    let pattern_doc = doc! {
        "team_id": &user.team_id,
        "pattern": {
            "name": &pattern_data.name,
            "pattern": &pattern_data.pattern,
            "category": &pattern_data.category,
            "severity": &pattern_data.severity,
        },
        "deduplication": {
            "content_hash": content_hash,
            "normalized_regex": normalized_regex,
            "created_at": bson::DateTime::now(),
        },
        "created_by": &user.user_id,
        "created_at": bson::DateTime::now(),
        "status": "active",
    };
    
    // Insert into MongoDB
    let collection = db.collection("user_patterns");
    let result = collection.insert_one(pattern_doc, None).await?;
    
    Ok(HttpResponse::Created().json(json!({
        "pattern_id": result.inserted_id,
        "validation_warnings": validation,
    })))
}
```

**Deliverable**: Pattern upload validates and returns appropriate responses.

---

#### **Day 5: UI/UX Flow Implementation**

**Goal**: Create user-friendly duplicate detection experience

**Tasks**:
1. Design UI mockups (if not done)
2. Implement validation response handling
3. Create similar pattern display component
4. Add "Override" and "Use Existing" buttons
5. User testing with sample patterns

**UI Flow**:

```
┌─────────────────────────────────────────────────────────────┐
│  Pattern Upload Form                                         │
│  ──────────────────────────────────────────────────────────  │
│                                                               │
│  Name: [Connection Timeout Error                 ]           │
│  Pattern: [ERROR: Connection timeout (\d+)ms     ]           │
│  Category: [Error ▼]  Severity: [High ▼]                    │
│                                                               │
│  [Validate Pattern]  [Upload Pattern]                        │
└─────────────────────────────────────────────────────────────┘

User clicks "Validate Pattern" or "Upload Pattern"
↓

┌─────────────────────────────────────────────────────────────┐
│  ⚠️  Similar Patterns Found                                  │
│  ──────────────────────────────────────────────────────────  │
│                                                               │
│  We found 2 similar patterns. Consider using one of these:   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 🎯 Connection Timeout (95% similar)                 │    │
│  │ Pattern: ERROR: Connection timeout (\d+)ms          │    │
│  │ Created by: john@team.com • 2 weeks ago            │    │
│  │                                                     │    │
│  │ [View Pattern]  [Use This Pattern]                 │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 📊 Timeout Errors (82% similar)                     │    │
│  │ Pattern: ERROR: Request timeout after (\d+)ms       │    │
│  │ Created by: jane@team.com • 1 month ago            │    │
│  │                                                     │    │
│  │ [View Pattern]  [Use This Pattern]                 │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  My pattern is different because: [____________]             │
│                                                               │
│  [Go Back]  [Upload Anyway]                                  │
└─────────────────────────────────────────────────────────────┘

If exact duplicate:
↓

┌─────────────────────────────────────────────────────────────┐
│  ❌ Duplicate Pattern Detected                               │
│  ──────────────────────────────────────────────────────────  │
│                                                               │
│  This pattern already exists in your team's library.         │
│                                                               │
│  Existing pattern: "Connection Timeout"                      │
│  Created by: john@team.com on Jan 15, 2024                  │
│                                                               │
│  ⚡ You can use the existing pattern as-is, or:             │
│    • Enhance it with additional extractors                   │
│    • Modify your pattern to make it unique                   │
│                                                               │
│  [View Existing Pattern]  [Modify My Pattern]                │
└─────────────────────────────────────────────────────────────┘
```

**Frontend Code (React/TypeScript example)**:

```typescript
// components/PatternUpload.tsx

interface ValidationResult {
  has_exact_duplicate: boolean;
  exact_duplicate_id?: string;
  has_similar_patterns: boolean;
  similar_patterns: SimilarPattern[];
  severity: 'none' | 'info' | 'warning' | 'error';
  message: string;
  suggested_action: string;
}

const PatternUploadForm: React.FC = () => {
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showOverrideReason, setShowOverrideReason] = useState(false);
  
  const handleValidate = async () => {
    const response = await fetch('/api/patterns/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pattern: formData.pattern,
        category: formData.category,
        severity: formData.severity,
      }),
    });
    
    const result = await response.json();
    setValidationResult(result);
    
    if (result.has_similar_patterns) {
      setShowOverrideReason(true);
    }
  };
  
  const handleUpload = async (override: boolean = false) => {
    // If exact duplicate, block completely
    if (validationResult?.has_exact_duplicate && !override) {
      toast.error(validationResult.message);
      return;
    }
    
    // Upload pattern
    const response = await fetch('/api/patterns/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...formData,
        override_warning: override,
        override_reason: overrideReason,
      }),
    });
    
    if (response.ok) {
      toast.success('Pattern uploaded successfully!');
      navigate('/patterns');
    }
  };
  
  return (
    <div className="pattern-upload">
      {/* Form fields */}
      
      {validationResult?.severity === 'error' && (
        <Alert severity="error">
          <AlertTitle>Duplicate Pattern Detected</AlertTitle>
          {validationResult.message}
          <Button onClick={() => navigate(`/patterns/${validationResult.exact_duplicate_id}`)}>
            View Existing Pattern
          </Button>
        </Alert>
      )}
      
      {validationResult?.severity === 'warning' && (
        <Alert severity="warning">
          <AlertTitle>Similar Patterns Found</AlertTitle>
          {validationResult.message}
          
          <div className="similar-patterns">
            {validationResult.similar_patterns.map(similar => (
              <SimilarPatternCard key={similar.pattern_id} pattern={similar} />
            ))}
          </div>
          
          {showOverrideReason && (
            <TextField
              label="Why is your pattern different?"
              multiline
              rows={2}
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
            />
          )}
          
          <Button onClick={() => handleUpload(true)}>Upload Anyway</Button>
        </Alert>
      )}
    </div>
  );
};
```

**Deliverable**: Users can upload patterns with clear duplicate warnings/blocks.

---

### Week 2: Advanced Features (Days 6-10)

#### **Day 6: Level 3 - Semantic Similarity (Optional)**

**Goal**: Detect semantically similar patterns using LLM

**Tasks**:
1. Set up LLM client (OpenAI/Anthropic)
2. Implement embedding generation
3. Calculate cosine similarity
4. Integrate into validation flow
5. Write tests with mock LLM

**Code Skeleton**:

```rust
// src/services/semantic_similarity.rs

use reqwest::Client;
use serde::{Deserialize, Serialize};

pub struct LLMClient {
    client: Client,
    api_key: String,
    model: String,
}

impl LLMClient {
    pub fn new(api_key: String) -> Self {
        Self {
            client: Client::new(),
            api_key,
            model: "text-embedding-ada-002".to_string(),
        }
    }
    
    /// Generate embedding vector for text
    pub async fn get_embedding(&self, text: &str) -> Result<Vec<f32>, Box<dyn std::error::Error>> {
        let response = self.client
            .post("https://api.openai.com/v1/embeddings")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .json(&serde_json::json!({
                "model": self.model,
                "input": text,
            }))
            .send()
            .await?
            .json::<EmbeddingResponse>()
            .await?;
        
        Ok(response.data[0].embedding.clone())
    }
}

#[derive(Deserialize)]
struct EmbeddingResponse {
    data: Vec<EmbeddingData>,
}

#[derive(Deserialize)]
struct EmbeddingData {
    embedding: Vec<f32>,
}

/// Calculate cosine similarity between two vectors
pub fn cosine_similarity(a: &[f32], b: &[f32]) -> f64 {
    let dot: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    let mag_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
    let mag_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();
    
    (dot / (mag_a * mag_b)) as f64
}

/// Find semantically similar patterns
pub async fn find_semantic_similar(
    llm_client: &LLMClient,
    db: &mongodb::Database,
    team_id: &str,
    pattern_text: &str,
    threshold: f64,
) -> Result<Vec<SimilarPattern>, Box<dyn std::error::Error>> {
    // Generate embedding for input pattern
    let pattern_embedding = llm_client.get_embedding(pattern_text).await?;
    
    // Get all patterns with embeddings
    let collection = db.collection::<mongodb::bson::Document>("user_patterns");
    let filter = doc! {
        "team_id": team_id,
        "deduplication.embedding": { "$exists": true },
    };
    
    let mut cursor = collection.find(filter, None).await?;
    let mut similar = Vec::new();
    
    while let Some(doc) = cursor.next().await {
        if let Ok(doc) = doc {
            if let Some(embedding) = doc.get_array("deduplication.embedding").ok() {
                let stored_embedding: Vec<f32> = embedding
                    .iter()
                    .filter_map(|v| v.as_f64().map(|f| f as f32))
                    .collect();
                
                let similarity = cosine_similarity(&pattern_embedding, &stored_embedding);
                
                if similarity >= threshold {
                    similar.push(SimilarPattern {
                        pattern_id: doc.get_str("_id").unwrap_or("").to_string(),
                        name: doc.get_str("pattern.name").unwrap_or("").to_string(),
                        pattern: doc.get_str("pattern.pattern").unwrap_or("").to_string(),
                        similarity_score: similarity,
                        similarity_type: "semantic".to_string(),
                        created_by: doc.get_str("created_by").unwrap_or("").to_string(),
                        created_at: doc.get_str("created_at").unwrap_or("").to_string(),
                    });
                }
            }
        }
    }
    
    similar.sort_by(|a, b| b.similarity_score.partial_cmp(&a.similarity_score).unwrap());
    Ok(similar)
}
```

**Configuration**:

```toml
# config.toml
[duplicate_detection.semantic]
enabled = true
threshold = 0.85
llm_provider = "openai"
model = "text-embedding-ada-002"
```

**Deliverable**: Semantic similarity works for description-based detection (optional feature).

---

#### **Day 7-8: Level 4 - Behavioral Fingerprint Detection**

**Goal**: Detect duplicate patterns at runtime based on matching behavior

**Tasks**:
1. Implement log line hashing
2. Record pattern matches in database
3. Create background job for detection
4. Generate duplicate reports
5. Write integration tests

**Code Skeleton**:

```rust
// src/services/behavioral_detection.rs

use std::collections::{HashMap, HashSet};
use sha2::{Sha256, Digest};

/// Record a pattern match for behavioral analysis
pub async fn record_pattern_match(
    db: &mongodb::Database,
    pattern_id: &str,
    log_line: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    let log_hash = hash_log_line(log_line);
    
    let collection = db.collection::<mongodb::bson::Document>("pattern_matches");
    let doc = doc! {
        "pattern_id": pattern_id,
        "log_hash": log_hash,
        "matched_at": bson::DateTime::now(),
    };
    
    collection.insert_one(doc, None).await?;
    Ok(())
}

/// Hash log line for deduplication
fn hash_log_line(log_line: &str) -> String {
    let normalized = log_line
        .trim()
        .to_lowercase()
        .replace(r"\d+", "NUM")  // Replace numbers
        .replace(r"\s+", " ");   // Normalize whitespace
    
    let mut hasher = Sha256::new();
    hasher.update(normalized.as_bytes());
    format!("{:x}", hasher.finalize())
}

/// Background job: Detect behavioral duplicates
pub async fn detect_behavioral_duplicates(
    db: &mongodb::Database,
    team_id: &str,
    overlap_threshold: f64,
) -> Result<Vec<BehavioralDuplicate>, Box<dyn std::error::Error>> {
    // Get all patterns for team
    let patterns = get_team_patterns(db, team_id).await?;
    
    // Get match data for each pattern
    let mut pattern_matches: HashMap<String, HashSet<String>> = HashMap::new();
    
    for pattern in &patterns {
        let matches = get_pattern_matches(db, &pattern.id).await?;
        pattern_matches.insert(pattern.id.clone(), matches);
    }
    
    // Find pairs with high overlap
    let mut duplicates = Vec::new();
    
    for i in 0..patterns.len() {
        for j in (i+1)..patterns.len() {
            let id1 = &patterns[i].id;
            let id2 = &patterns[j].id;
            
            if let (Some(matches1), Some(matches2)) = (
                pattern_matches.get(id1),
                pattern_matches.get(id2),
            ) {
                let overlap = calculate_set_overlap(matches1, matches2);
                
                if overlap >= overlap_threshold {
                    duplicates.push(BehavioralDuplicate {
                        pattern1_id: id1.clone(),
                        pattern1_name: patterns[i].name.clone(),
                        pattern2_id: id2.clone(),
                        pattern2_name: patterns[j].name.clone(),
                        overlap_score: overlap,
                        shared_matches: matches1.intersection(matches2).count(),
                        detected_at: chrono::Utc::now().to_rfc3339(),
                    });
                }
            }
        }
    }
    
    Ok(duplicates)
}

/// Calculate Jaccard similarity between two sets
fn calculate_set_overlap(set1: &HashSet<String>, set2: &HashSet<String>) -> f64 {
    let intersection = set1.intersection(set2).count();
    let union = set1.union(set2).count();
    
    if union == 0 {
        return 0.0;
    }
    
    intersection as f64 / union as f64
}

#[derive(Debug, Serialize)]
pub struct BehavioralDuplicate {
    pub pattern1_id: String,
    pub pattern1_name: String,
    pub pattern2_id: String,
    pub pattern2_name: String,
    pub overlap_score: f64,
    pub shared_matches: usize,
    pub detected_at: String,
}

/// Schedule background job
pub async fn schedule_behavioral_detection(
    db: mongodb::Database,
    interval_hours: u64,
) {
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(
            tokio::time::Duration::from_secs(interval_hours * 3600)
        );
        
        loop {
            interval.tick().await;
            
            info!("Running behavioral duplicate detection...");
            
            // Run detection for all teams
            match detect_behavioral_duplicates(&db, "all", 0.7).await {
                Ok(duplicates) => {
                    info!("Found {} behavioral duplicates", duplicates.len());
                    // Store results and notify users
                }
                Err(e) => {
                    error!("Behavioral detection failed: {}", e);
                }
            }
        }
    });
}
```

**Deliverable**: Background job detects runtime duplicates every 24 hours.

---

#### **Day 9: Testing & Refinement**

**Goal**: Comprehensive testing and bug fixes

**Tasks**:
1. Unit tests for all detection levels
2. Integration tests with real MongoDB
3. Performance benchmarking
4. Edge case testing (empty patterns, special characters)
5. Load testing (1000+ patterns)

**Test Cases**:

```rust
// tests/duplicate_detection_tests.rs

#[cfg(test)]
mod integration_tests {
    use super::*;
    
    #[tokio::test]
    async fn test_exact_duplicate_blocked() {
        let db = setup_test_db().await;
        let team_id = "test_team";
        let pattern = r"ERROR: Connection timeout (\d+)ms";
        
        // Upload first pattern
        let result1 = upload_pattern(&db, team_id, pattern).await;
        assert!(result1.is_ok());
        
        // Try to upload duplicate
        let result2 = upload_pattern(&db, team_id, pattern).await;
        assert!(result2.is_err());
        assert_eq!(result2.unwrap_err().kind(), ErrorKind::Duplicate);
    }
    
    #[tokio::test]
    async fn test_similar_patterns_detected() {
        let db = setup_test_db().await;
        let team_id = "test_team";
        
        upload_pattern(&db, team_id, r"ERROR: timeout (\d+)ms").await.unwrap();
        
        let validation = validate_pattern_before_upload(
            &db,
            team_id,
            r"ERROR: Connection timeout (\d+) milliseconds",
            "error",
            "high",
            &DuplicationConfig::default(),
        ).await.unwrap();
        
        assert!(validation.has_similar_patterns);
        assert!(validation.similar_patterns.len() > 0);
        assert!(validation.similar_patterns[0].similarity_score > 0.7);
    }
    
    #[tokio::test]
    async fn test_performance_1000_patterns() {
        let db = setup_test_db().await;
        let team_id = "test_team";
        
        // Create 1000 patterns
        for i in 0..1000 {
            let pattern = format!(r"ERROR {}: Test pattern (\d+)", i);
            upload_pattern(&db, team_id, &pattern).await.unwrap();
        }
        
        // Measure validation time
        let start = std::time::Instant::now();
        let validation = validate_pattern_before_upload(
            &db,
            team_id,
            r"ERROR: New test pattern (\d+)",
            "error",
            "high",
            &DuplicationConfig::default(),
        ).await.unwrap();
        let elapsed = start.elapsed();
        
        // Should complete in under 100ms
        assert!(elapsed.as_millis() < 100, "Validation took {}ms", elapsed.as_millis());
    }
}
```

**Performance Benchmarks**:

```
Target Performance:
├─ Exact duplicate check: <5ms
├─ Regex similarity (100 patterns): <20ms
├─ Regex similarity (1000 patterns): <100ms
├─ Semantic similarity (if enabled): <500ms
└─ Full validation: <100ms (without semantic)
```

**Deliverable**: All tests pass, performance targets met.

---

#### **Day 10: Documentation & Deployment**

**Goal**: Document the system and prepare for production

**Tasks**:
1. Write API documentation
2. Create user guide
3. Add configuration examples
4. Write deployment guide
5. Create monitoring dashboard queries

**Documentation**:

```markdown
# Duplicate Detection - User Guide

## Overview

The duplicate detection system prevents redundant patterns from cluttering your team's library.

## Detection Levels

### Level 1: Exact Duplicates (BLOCKED)
- **What it detects**: Identical patterns
- **Action**: Upload is blocked
- **Example**: Two patterns with `ERROR: timeout (\d+)ms`

### Level 2: Similar Patterns (WARNING)
- **What it detects**: Structurally similar regex patterns
- **Action**: Warning shown, can override
- **Example**: 
  - Pattern A: `ERROR: timeout (\d+)ms`
  - Pattern B: `ERROR: Connection timeout (\d+) milliseconds`
  - Similarity: 85%

### Level 3: Semantic Similarity (INFO)
- **What it detects**: Patterns with similar meaning
- **Action**: Informational, can proceed
- **Example**:
  - Pattern A: "Database connection failed"
  - Pattern B: "Unable to connect to database"

### Level 4: Behavioral Duplicates (RUNTIME)
- **What it detects**: Patterns that match the same log lines
- **Action**: Notification sent to pattern owners
- **Example**: Two patterns that both match 90% of the same logs

## Configuration

```toml
[duplicate_detection]
enabled = true

[duplicate_detection.exact_match]
enabled = true

[duplicate_detection.regex_similarity]
enabled = true
threshold = 0.75  # 75% similarity triggers warning

[duplicate_detection.semantic_similarity]
enabled = false  # Requires LLM API key
threshold = 0.85

[duplicate_detection.behavioral]
enabled = true
threshold = 0.70
check_interval_hours = 24
```

## API Endpoints

### Validate Pattern
```http
POST /api/patterns/validate
Content-Type: application/json

{
  "pattern": "ERROR: Connection timeout (\\d+)ms",
  "category": "error",
  "severity": "high"
}
```

Response:
```json
{
  "has_exact_duplicate": false,
  "has_similar_patterns": true,
  "similar_patterns": [
    {
      "pattern_id": "pat_123",
      "name": "Connection Timeout",
      "similarity_score": 0.85,
      "similarity_type": "regex_structural"
    }
  ],
  "severity": "warning",
  "message": "Found 1 similar pattern(s)"
}
```

## Monitoring

Key metrics to track:
- `duplicates_blocked_total` - Total exact duplicates prevented
- `duplicates_detected_total` - Total similar patterns detected
- `duplicate_overrides_total` - Times users overrode warnings
- `validation_duration_ms` - Validation latency

Grafana queries:
```promql
# Duplicate block rate
rate(duplicates_blocked_total[5m])

# Average validation time
rate(validation_duration_ms_sum[5m]) / rate(validation_duration_ms_count[5m])
```
```

**Deliverable**: System is documented and ready for production deployment.

---

## 📊 Success Metrics & KPIs

### Immediate Metrics (Week 1-2)

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Exact duplicates blocked | 80%+ | MongoDB: count patterns with duplicate hash attempts |
| Similar patterns detected | 60%+ | API logs: validation warnings |
| False positives | <5% | User feedback: "override" rate with valid reasons |
| Validation latency | <100ms | API metrics: p95 response time |
| User complaints | 0 | Support tickets about blocking valid patterns |

### Long-term Metrics (Month 1-3)

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Database pattern reduction | 40-60% | MongoDB: total patterns vs expected without dedup |
| Pattern discovery improved | 50%+ | User survey: "easier to find existing patterns" |
| Upload success rate | >90% | API: successful uploads / total attempts |
| Behavioral duplicates found | 10-20/month | Background job: detected duplicates |
| User satisfaction | 4+/5 | Survey: "duplicate detection is helpful" |

---

## 🚨 Risk Management

### Risk 1: False Positives (Blocking Valid Patterns)
**Mitigation**:
- Conservative similarity thresholds (75% default)
- Always allow override with reason
- Monitor override reasons in logs
- Adjust thresholds based on feedback

### Risk 2: Performance Degradation
**Mitigation**:
- Benchmark with 1000+ patterns
- Add MongoDB indexes early
- Cache similarity calculations
- Implement timeout (max 200ms)

### Risk 3: User Frustration
**Mitigation**:
- Clear, helpful error messages
- Show similar patterns prominently
- One-click "use existing" button
- Educational tooltips

### Risk 4: Semantic Similarity Cost (LLM API)
**Mitigation**:
- Make it optional (Level 3)
- Implement only if budget allows
- Cache embeddings for 30 days
- Rate limit to 100 requests/day

---

## 🔧 Configuration Reference

### Recommended Configurations

#### Production (Conservative)
```toml
[duplicate_detection]
enabled = true

[duplicate_detection.exact_match]
enabled = true

[duplicate_detection.regex_similarity]
enabled = true
threshold = 0.75  # Higher = stricter

[duplicate_detection.semantic_similarity]
enabled = false  # Optional, costs money

[duplicate_detection.behavioral]
enabled = true
threshold = 0.70
check_interval_hours = 24
```

#### Development (Aggressive)
```toml
[duplicate_detection]
enabled = true

[duplicate_detection.exact_match]
enabled = true

[duplicate_detection.regex_similarity]
enabled = true
threshold = 0.60  # Lower = more matches

[duplicate_detection.semantic_similarity]
enabled = true
threshold = 0.80

[duplicate_detection.behavioral]
enabled = true
threshold = 0.60
check_interval_hours = 1  # More frequent
```

---

## 📚 Code Structure

```
src/
├── services/
│   ├── pattern_deduplication.rs     (Main logic, 500 lines)
│   │   ├── calculate_content_hash()
│   │   ├── calculate_regex_similarity()
│   │   ├── validate_pattern_before_upload()
│   │   └── DuplicateCheckResult struct
│   │
│   ├── semantic_similarity.rs        (Optional, 300 lines)
│   │   ├── LLMClient
│   │   ├── get_embedding()
│   │   └── cosine_similarity()
│   │
│   └── behavioral_detection.rs       (Background jobs, 400 lines)
│       ├── record_pattern_match()
│       ├── detect_behavioral_duplicates()
│       └── schedule_behavioral_detection()
│
├── api/
│   └── pattern_upload.rs            (API endpoints, modify existing)
│       ├── validate_pattern()       (new)
│       └── upload_pattern()         (modified)
│
├── models/
│   └── user_pattern.rs              (Schema updates)
│       └── Add deduplication fields
│
└── config/
    └── duplicate_detection.toml      (Configuration)

tests/
├── duplicate_detection_tests.rs
├── similarity_tests.rs
└── integration_tests.rs

docs/
├── DUPLICATE_DETECTION_USER_GUIDE.md
└── DUPLICATE_DETECTION_API.md
```

**Total Lines of Code**: ~1500-2000 lines  
**Test Coverage Target**: >80%

---

## ✅ Definition of Done

### Phase 1 Complete When:

- [ ] All 4 detection levels implemented (L3 optional)
- [ ] MongoDB schema updated with deduplication fields
- [ ] Indexes created for performance
- [ ] API endpoints created and tested
- [ ] UI flow implemented and user-tested
- [ ] All unit tests pass (>80% coverage)
- [ ] Integration tests pass
- [ ] Performance benchmarks met (<100ms validation)
- [ ] Documentation complete
- [ ] Deployed to production or staging
- [ ] Monitoring/metrics in place
- [ ] User training completed
- [ ] Success metrics baselined

---

## 🎯 Next Phase Preview

### Phase 2: Local Database (After Phase 1)

**Why it comes next**:
- Independent of duplicate detection
- Improves performance for all users
- Enables offline pattern usage
- Foundation for behavioral data collection

**Quick preview**:
```rust
// Phase 2 will add:
pub struct LocalPatternCache {
    sqlite: SqliteConnection,
    cache_ttl: Duration,
}

impl LocalPatternCache {
    pub fn store_patterns(&self, patterns: Vec<Pattern>) -> Result<()>
    pub fn get_patterns(&self, team_id: &str) -> Result<Vec<Pattern>>
    pub fn sync_with_server(&self) -> Result<()>
}
```

---

## 💡 Pro Tips

### Tip 1: Start with Level 1 + 2
Don't try to build everything at once. Level 1 + 2 give you 90% of the value.

### Tip 2: Tune Thresholds Based on Feedback
Start conservative (75%), adjust based on user override patterns.

### Tip 3: Make Error Messages Helpful
Users should know WHY their pattern was flagged and WHAT to do about it.

### Tip 4: Celebrate the Wins
Track and share: "Prevented 247 duplicate patterns in Month 1!"

### Tip 5: Iterate Quickly
Ship Level 1 in week 1, Level 2 in week 2. Don't wait for perfection.

---

## 📞 Support & Questions

**Issues?** Check the troubleshooting guide in `docs/TROUBLESHOOTING.md`

**Questions?** Reach out on Slack #pattern-quality channel

**Bugs?** File a GitHub issue with the `duplicate-detection` label

---

**Good luck building Phase 1! You've got this! 🚀**

---

**Version**: 1.0  
**Last Updated**: 2024  
**Estimated Completion**: 2 weeks  
**Maintainer**: Your Team