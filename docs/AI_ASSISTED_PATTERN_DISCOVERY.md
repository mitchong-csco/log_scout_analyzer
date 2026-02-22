# AI-Assisted Pattern Discovery & Creation Strategy

**Date**: February 21, 2024  
**Purpose**: Intelligent pattern discovery through behavioral learning + AI chat assistance  
**Status**: Design & Architecture Guide

---

## 🎯 Executive Summary

**Two AI Systems Working Together:**

1. **Behavioral Learning Engine** (Passive)
   - Watches what users do with logs
   - Detects patterns in user behavior
   - Suggests new patterns automatically
   - "You keep looking at timeout errors - want a pattern?"

2. **AI Pattern Assistant** (Active)
   - Chat interface for pattern creation
   - Analyzes log lines and suggests regex
   - Explains patterns in plain English
   - Interactive refinement

**Result:** Users don't need regex expertise. System learns what's important and helps create patterns.

---

## 🧠 System 1: Behavioral Learning Engine

### **What We Track**

```javascript
// User behavior tracking
{
  user_id: "mitchong@cisco.com",
  session_id: "sess_abc123",
  
  // Behavioral signals
  interactions: [
    {
      timestamp: ISODate("2024-02-21T10:30:15Z"),
      action: "line_clicked",
      log_line: "2024-02-21 10:30:00 ERROR Connection timeout to 10.1.1.5:5060",
      log_hash: "abc123...",
      context: {
        file: "jabber.log",
        line_number: 1523,
        surrounding_lines: [...],
      }
    },
    {
      timestamp: ISODate("2024-02-21T10:30:45Z"),
      action: "line_copied",
      log_line: "2024-02-21 10:30:30 ERROR Connection timeout to 10.2.3.8:5060",
      log_hash: "def456...",
    },
    {
      timestamp: ISODate("2024-02-21T10:31:20Z"),
      action: "search_executed",
      search_query: "timeout",
      results_count: 47,
    },
    {
      timestamp: ISODate("2024-02-21T10:32:00Z"),
      action: "line_highlighted",
      log_line: "2024-02-21 10:31:00 ERROR Connection timeout to 10.5.2.1:5060",
      log_hash: "ghi789...",
    }
  ],
  
  // Detected patterns in behavior
  detected_interests: [
    {
      interest_type: "repeated_keyword",
      keyword: "timeout",
      occurrences: 15,
      confidence: 0.92
    },
    {
      interest_type: "repeated_structure",
      pattern_suggestion: "ERROR Connection timeout to [IP]:[PORT]",
      occurrences: 8,
      confidence: 0.88
    }
  ]
}
```

### **Behavioral Signals We Learn From**

| Signal | What It Means | Weight |
|--------|---------------|--------|
| **Line clicked** | User interested in this line | 1.0 |
| **Line copied** | High interest - might investigate | 2.0 |
| **Line highlighted** | Marked as important | 1.5 |
| **Search executed** | Looking for specific pattern | 1.2 |
| **Diagnostic expanded** | Wants more details | 1.3 |
| **Multiple similar lines** | Pattern emerging | 3.0 |
| **Time spent on line** | Deep investigation | 0.5/second |
| **Line shared/exported** | Very important | 2.5 |

### **Pattern Discovery Algorithm**

```rust
use std::collections::HashMap;
use chrono::{DateTime, Utc, Duration};

pub struct BehavioralLearningEngine {
    user_interactions: Vec<UserInteraction>,
    discovered_patterns: Vec<DiscoveredPattern>,
    interest_threshold: f64,
}

#[derive(Debug, Clone)]
pub struct UserInteraction {
    pub timestamp: DateTime<Utc>,
    pub action: InteractionType,
    pub log_line: String,
    pub log_hash: String,
    pub context: InteractionContext,
}

#[derive(Debug, Clone)]
pub enum InteractionType {
    LineClicked,
    LineCopied,
    LineHighlighted,
    SearchExecuted { query: String, results: usize },
    DiagnosticExpanded,
    LineShared,
    TimeSpent { seconds: u64 },
}

#[derive(Debug, Clone)]
pub struct DiscoveredPattern {
    pub pattern_id: String,
    pub suggested_regex: String,
    pub example_lines: Vec<String>,
    pub confidence: f64,
    pub interest_score: f64,
    pub suggested_extractors: Vec<SuggestedExtractor>,
    pub discovered_at: DateTime<Utc>,
    pub user_actions_count: usize,
}

#[derive(Debug, Clone)]
pub struct SuggestedExtractor {
    pub name: String,
    pub regex: String,
    pub example_value: String,
    pub confidence: f64,
}

impl BehavioralLearningEngine {
    pub fn new(interest_threshold: f64) -> Self {
        Self {
            user_interactions: Vec::new(),
            discovered_patterns: Vec::new(),
            interest_threshold,
        }
    }
    
    /// Record user interaction with a log line
    pub fn record_interaction(&mut self, interaction: UserInteraction) {
        self.user_interactions.push(interaction);
        
        // Trigger pattern discovery every 10 interactions
        if self.user_interactions.len() % 10 == 0 {
            self.discover_patterns();
        }
    }
    
    /// Discover patterns from user behavior
    pub fn discover_patterns(&mut self) {
        // 1. Group interactions by similarity
        let groups = self.group_similar_interactions();
        
        // 2. Calculate interest scores for each group
        for group in groups {
            let interest_score = self.calculate_interest_score(&group);
            
            if interest_score >= self.interest_threshold {
                // 3. Extract common pattern
                if let Some(pattern) = self.extract_common_pattern(&group) {
                    // 4. Suggest extractors
                    let extractors = self.suggest_extractors(&pattern, &group);
                    
                    let discovered = DiscoveredPattern {
                        pattern_id: format!("discovered_{}", uuid::Uuid::new_v4()),
                        suggested_regex: pattern.regex,
                        example_lines: group.iter().map(|i| i.log_line.clone()).collect(),
                        confidence: pattern.confidence,
                        interest_score,
                        suggested_extractors: extractors,
                        discovered_at: Utc::now(),
                        user_actions_count: group.len(),
                    };
                    
                    self.discovered_patterns.push(discovered);
                }
            }
        }
    }
    
    /// Group similar log lines user interacted with
    fn group_similar_interactions(&self) -> Vec<Vec<UserInteraction>> {
        let mut groups: Vec<Vec<UserInteraction>> = Vec::new();
        
        // Use recent interactions only (last 30 minutes)
        let recent_threshold = Utc::now() - Duration::minutes(30);
        let recent: Vec<_> = self.user_interactions.iter()
            .filter(|i| i.timestamp > recent_threshold)
            .cloned()
            .collect();
        
        for interaction in recent {
            // Find similar group or create new one
            let mut found_group = false;
            
            for group in &mut groups {
                if let Some(first) = group.first() {
                    if self.are_structurally_similar(&first.log_line, &interaction.log_line) {
                        group.push(interaction.clone());
                        found_group = true;
                        break;
                    }
                }
            }
            
            if !found_group {
                groups.push(vec![interaction]);
            }
        }
        
        // Filter groups with at least 3 occurrences
        groups.into_iter().filter(|g| g.len() >= 3).collect()
    }
    
    /// Check if two log lines have similar structure
    fn are_structurally_similar(&self, line1: &str, line2: &str) -> bool {
        // Normalize by replacing numbers, IPs, timestamps with placeholders
        let normalized1 = self.normalize_log_line(line1);
        let normalized2 = self.normalize_log_line(line2);
        
        // Calculate similarity
        let similarity = strsim::jaro_winkler(&normalized1, &normalized2);
        similarity > 0.85
    }
    
    /// Normalize log line for pattern matching
    fn normalize_log_line(&self, line: &str) -> String {
        let mut normalized = line.to_string();
        
        // Replace timestamps
        normalized = regex::Regex::new(r"\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}")
            .unwrap()
            .replace_all(&normalized, "[TIMESTAMP]")
            .to_string();
        
        // Replace IP addresses
        normalized = regex::Regex::new(r"\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}")
            .unwrap()
            .replace_all(&normalized, "[IP]")
            .to_string();
        
        // Replace numbers
        normalized = regex::Regex::new(r"\b\d+\b")
            .unwrap()
            .replace_all(&normalized, "[NUM]")
            .to_string();
        
        normalized
    }
    
    /// Calculate interest score based on user actions
    fn calculate_interest_score(&self, interactions: &[UserInteraction]) -> f64 {
        let mut score = 0.0;
        
        for interaction in interactions {
            score += match interaction.action {
                InteractionType::LineClicked => 1.0,
                InteractionType::LineCopied => 2.0,
                InteractionType::LineHighlighted => 1.5,
                InteractionType::SearchExecuted { .. } => 1.2,
                InteractionType::DiagnosticExpanded => 1.3,
                InteractionType::LineShared => 2.5,
                InteractionType::TimeSpent { seconds } => 0.5 * seconds as f64,
            };
        }
        
        // Normalize by time window
        let time_window_hours = 0.5; // 30 minutes
        score / time_window_hours
    }
    
    /// Extract common pattern from similar lines
    fn extract_common_pattern(&self, interactions: &[UserInteraction]) -> Option<ExtractedPattern> {
        if interactions.is_empty() {
            return None;
        }
        
        // Get all log lines
        let lines: Vec<&str> = interactions.iter().map(|i| i.log_line.as_str()).collect();
        
        // Find common structure
        let common_parts = self.find_common_parts(&lines);
        let variable_parts = self.find_variable_parts(&lines);
        
        // Build regex pattern
        let regex = self.build_regex_pattern(&common_parts, &variable_parts);
        
        // Calculate confidence
        let confidence = self.calculate_pattern_confidence(&regex, &lines);
        
        Some(ExtractedPattern {
            regex,
            confidence,
            common_parts,
            variable_parts,
        })
    }
    
    /// Find common literal text across all lines
    fn find_common_parts(&self, lines: &[&str]) -> Vec<String> {
        if lines.is_empty() {
            return Vec::new();
        }
        
        let mut common = Vec::new();
        let first_words: Vec<&str> = lines[0].split_whitespace().collect();
        
        for word in first_words {
            // Check if this word appears in all lines
            if lines.iter().all(|line| line.contains(word)) {
                common.push(word.to_string());
            }
        }
        
        common
    }
    
    /// Find variable parts (numbers, IPs, etc.)
    fn find_variable_parts(&self, lines: &[&str]) -> Vec<VariablePart> {
        let mut variables = Vec::new();
        
        // Detect IP addresses
        if lines.iter().all(|line| regex::Regex::new(r"\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}").unwrap().is_match(line)) {
            variables.push(VariablePart {
                name: "IP_ADDRESS".into(),
                regex_pattern: r"(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})".into(),
                example_values: lines.iter().filter_map(|line| {
                    regex::Regex::new(r"\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}")
                        .unwrap()
                        .find(line)
                        .map(|m| m.as_str().to_string())
                }).take(3).collect(),
            });
        }
        
        // Detect ports
        if lines.iter().all(|line| regex::Regex::new(r":\d{2,5}\b").unwrap().is_match(line)) {
            variables.push(VariablePart {
                name: "PORT".into(),
                regex_pattern: r":(\d{2,5})".into(),
                example_values: lines.iter().filter_map(|line| {
                    regex::Regex::new(r":(\d{2,5})")
                        .unwrap()
                        .captures(line)
                        .and_then(|c| c.get(1).map(|m| m.as_str().to_string()))
                }).take(3).collect(),
            });
        }
        
        // Detect timestamps
        if lines.iter().all(|line| regex::Regex::new(r"\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}").unwrap().is_match(line)) {
            variables.push(VariablePart {
                name: "TIMESTAMP".into(),
                regex_pattern: r"(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})".into(),
                example_values: vec!["2024-02-21 10:30:00".into()],
            });
        }
        
        variables
    }
    
    /// Build regex pattern from common and variable parts
    fn build_regex_pattern(&self, common: &[String], variables: &[VariablePart]) -> String {
        // Start with common parts
        let mut pattern = common.join(".*?");
        
        // Add variable patterns
        for var in variables {
            if pattern.is_empty() {
                pattern = var.regex_pattern.clone();
            } else {
                pattern = format!("{}.*?{}", pattern, var.regex_pattern);
            }
        }
        
        pattern
    }
    
    /// Calculate confidence that this pattern is correct
    fn calculate_pattern_confidence(&self, regex: &str, lines: &[&str]) -> f64 {
        if let Ok(re) = regex::Regex::new(regex) {
            let matches = lines.iter().filter(|line| re.is_match(line)).count();
            matches as f64 / lines.len() as f64
        } else {
            0.0
        }
    }
    
    /// Suggest extractors for discovered pattern
    fn suggest_extractors(&self, pattern: &ExtractedPattern, interactions: &[UserInteraction]) -> Vec<SuggestedExtractor> {
        let mut extractors = Vec::new();
        
        for var in &pattern.variable_parts {
            extractors.push(SuggestedExtractor {
                name: var.name.clone(),
                regex: var.regex_pattern.clone(),
                example_value: var.example_values.first().cloned().unwrap_or_default(),
                confidence: 0.85,
            });
        }
        
        extractors
    }
    
    /// Get patterns ready for user suggestion
    pub fn get_suggestions_for_user(&self) -> Vec<PatternSuggestion> {
        self.discovered_patterns.iter()
            .filter(|p| p.confidence >= 0.75 && p.interest_score >= self.interest_threshold)
            .map(|p| PatternSuggestion {
                pattern: p.clone(),
                suggestion_text: format!(
                    "You've interacted with {} similar log lines. Create a pattern?",
                    p.user_actions_count
                ),
                example_lines: p.example_lines.clone(),
            })
            .collect()
    }
}

#[derive(Debug, Clone)]
struct ExtractedPattern {
    regex: String,
    confidence: f64,
    common_parts: Vec<String>,
    variable_parts: Vec<VariablePart>,
}

#[derive(Debug, Clone)]
struct VariablePart {
    name: String,
    regex_pattern: String,
    example_values: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct PatternSuggestion {
    pub pattern: DiscoveredPattern,
    pub suggestion_text: String,
    pub example_lines: Vec<String>,
}

#[derive(Debug, Clone)]
struct InteractionContext {
    file: String,
    line_number: usize,
}
```

### **User Experience: Behavioral Suggestions**

```
┌─────────────────────────────────────────────────────────────┐
│ 💡 Pattern Discovery Suggestion                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  I noticed you've interacted with 8 similar log lines:      │
│                                                              │
│  Example lines:                                              │
│  • "2024-02-21 10:30:00 ERROR Connection timeout to          │
│     10.1.1.5:5060"                                           │
│  • "2024-02-21 10:30:30 ERROR Connection timeout to          │
│     10.2.3.8:5060"                                           │
│  • "2024-02-21 10:31:00 ERROR Connection timeout to          │
│     10.5.2.1:5060"                                           │
│                                                              │
│  ✨ Suggested Pattern:                                       │
│  Name: Connection Timeout Pattern                            │
│  Regex: ERROR Connection timeout to (\d+\.\d+\.\d+\.\d+):(\d+) │
│                                                              │
│  ✨ Suggested Extractors:                                    │
│  • IP_ADDRESS: 10.1.1.5, 10.2.3.8, 10.5.2.1                  │
│  • PORT: 5060, 5060, 5060                                    │
│                                                              │
│  📊 Confidence: 88%                                          │
│  👤 Based on your behavior in the last 30 minutes            │
│                                                              │
│  [Create Pattern] [Refine with AI] [Not Interested]         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🤖 System 2: AI Pattern Assistant (Chat Interface)

### **Architecture**

```
User Input (Log Line)
    ↓
AI Pattern Assistant (LLM)
    ├─ Analyze structure
    ├─ Detect patterns
    ├─ Suggest regex
    ├─ Recommend extractors
    └─ Generate tests
    ↓
Interactive Refinement
    ├─ User accepts/rejects
    ├─ User provides feedback
    └─ AI adjusts suggestions
    ↓
Pattern Created & Validated
```

### **AI Assistant Implementation**

```rust
pub struct AIPatternAssistant {
    llm_client: LLMClient,
    conversation_history: Vec<Message>,
}

pub struct LLMClient {
    api_key: String,
    model: String,  // "gpt-4", "claude-3", etc.
}

#[derive(Debug, Clone)]
pub struct Message {
    pub role: String,  // "user", "assistant", "system"
    pub content: String,
}

impl AIPatternAssistant {
    pub fn new(api_key: String) -> Self {
        let mut assistant = Self {
            llm_client: LLMClient {
                api_key,
                model: "gpt-4".into(),
            },
            conversation_history: Vec::new(),
        };
        
        // Initialize with system prompt
        assistant.conversation_history.push(Message {
            role: "system".into(),
            content: SYSTEM_PROMPT.into(),
        });
        
        assistant
    }
    
    /// Analyze a log line and suggest a pattern
    pub async fn analyze_log_line(&mut self, log_line: &str) -> Result<PatternAnalysis> {
        let user_message = format!(
            "Analyze this log line and suggest a regex pattern with extractors:\n\n{}",
            log_line
        );
        
        self.conversation_history.push(Message {
            role: "user".into(),
            content: user_message,
        });
        
        let response = self.llm_client.complete(&self.conversation_history).await?;
        
        self.conversation_history.push(Message {
            role: "assistant".into(),
            content: response.clone(),
        });
        
        // Parse response into structured format
        self.parse_analysis(&response)
    }
    
    /// Interactive refinement
    pub async fn refine_pattern(&mut self, feedback: &str) -> Result<PatternAnalysis> {
        self.conversation_history.push(Message {
            role: "user".into(),
            content: feedback.into(),
        });
        
        let response = self.llm_client.complete(&self.conversation_history).await?;
        
        self.conversation_history.push(Message {
            role: "assistant".into(),
            content: response.clone(),
        });
        
        self.parse_analysis(&response)
    }
    
    /// Test pattern against multiple log lines
    pub async fn test_pattern(&mut self, pattern: &str, test_lines: &[String]) -> Result<TestResults> {
        let user_message = format!(
            "Test this pattern against these log lines:\n\nPattern: {}\n\nTest lines:\n{}",
            pattern,
            test_lines.join("\n")
        );
        
        self.conversation_history.push(Message {
            role: "user".into(),
            content: user_message,
        });
        
        let response = self.llm_client.complete(&self.conversation_history).await?;
        
        self.parse_test_results(&response)
    }
    
    fn parse_analysis(&self, response: &str) -> Result<PatternAnalysis> {
        // Parse LLM response into structured format
        // Look for JSON blocks or structured text
        
        // For now, simplified parsing
        Ok(PatternAnalysis {
            suggested_regex: self.extract_regex(response),
            suggested_name: self.extract_name(response),
            suggested_description: self.extract_description(response),
            suggested_extractors: self.extract_extractors(response),
            explanation: response.to_string(),
            confidence: 0.85,
        })
    }
    
    fn extract_regex(&self, text: &str) -> String {
        // Extract regex from markdown code blocks or specific markers
        if let Some(start) = text.find("```regex") {
            if let Some(end) = text[start..].find("```") {
                return text[start+8..start+end].trim().to_string();
            }
        }
        String::new()
    }
    
    fn extract_name(&self, text: &str) -> String {
        // Extract name from response
        if let Some(start) = text.find("Name:") {
            if let Some(end) = text[start..].find('\n') {
                return text[start+5..start+end].trim().to_string();
            }
        }
        "Generated Pattern".into()
    }
    
    fn extract_description(&self, text: &str) -> String {
        if let Some(start) = text.find("Description:") {
            if let Some(end) = text[start..].find('\n') {
                return text[start+12..start+end].trim().to_string();
            }
        }
        String::new()
    }
    
    fn extract_extractors(&self, text: &str) -> Vec<ExtractorSuggestion> {
        let mut extractors = Vec::new();
        
        // Look for extractor definitions in response
        // Format: "Extractor: NAME - regex: PATTERN - example: VALUE"
        
        for line in text.lines() {
            if line.contains("Extractor:") || line.contains("Parameter:") {
                // Parse extractor details
                if let Some(extractor) = self.parse_extractor_line(line) {
                    extractors.push(extractor);
                }
            }
        }
        
        extractors
    }
    
    fn parse_extractor_line(&self, line: &str) -> Option<ExtractorSuggestion> {
        // Simplified parsing
        Some(ExtractorSuggestion {
            name: "EXTRACTED_PARAM".into(),
            regex: r"(\w+)".into(),
            description: "Extracted parameter".into(),
            example_value: "example".into(),
        })
    }
    
    fn parse_test_results(&self, response: &str) -> Result<TestResults> {
        Ok(TestResults {
            total_tests: 0,
            passed: 0,
            failed: 0,
            details: response.to_string(),
        })
    }
}

#[derive(Debug, Clone)]
pub struct PatternAnalysis {
    pub suggested_regex: String,
    pub suggested_name: String,
    pub suggested_description: String,
    pub suggested_extractors: Vec<ExtractorSuggestion>,
    pub explanation: String,
    pub confidence: f64,
}

#[derive(Debug, Clone)]
pub struct ExtractorSuggestion {
    pub name: String,
    pub regex: String,
    pub description: String,
    pub example_value: String,
}

#[derive(Debug, Clone)]
pub struct TestResults {
    pub total_tests: usize,
    pub passed: usize,
    pub failed: usize,
    pub details: String,
}

const SYSTEM_PROMPT: &str = r#"
You are an expert log analysis assistant. Your role is to help users create regex patterns 
for analyzing log files.

When a user provides a log line, you should:

1. Analyze the structure of the log line
2. Identify important components (timestamps, IPs, error codes, messages, etc.)
3. Suggest a regex pattern that captures these components
4. Recommend parameter extractors with descriptive names
5. Explain the pattern in plain English
6. Suggest severity levels and categories

Format your response as:

**Pattern Analysis**

Name: [Descriptive name]
Description: [What this pattern detects]

**Suggested Regex:**
```regex
[Your regex pattern here]
```

**Extractors:**
- EXTRACTOR_NAME: regex: `(pattern)` - example: "value" - description: what it captures

**Explanation:**
[Plain English explanation of how the pattern works]

**Recommendations:**
- Severity: [error/warning/info]
- Category: [category name]
- Additional notes: [any other suggestions]

Be concise but thorough. Focus on practical, working patterns.
"#;

impl LLMClient {
    async fn complete(&self, messages: &[Message]) -> Result<String> {
        // Call OpenAI/Anthropic/etc. API
        // Simplified for example
        
        // In production, would use actual API client:
        /*
        let client = reqwest::Client::new();
        let response = client
            .post("https://api.openai.com/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .json(&serde_json::json!({
                "model": self.model,
                "messages": messages,
            }))
            .send()
            .await?;
        
        let result: serde_json::Value = response.json().await?;
        Ok(result["choices"][0]["message"]["content"].as_str().unwrap().to_string())
        */
        
        // Placeholder
        Ok("AI response would go here".into())
    }
}
```

### **User Experience: AI Chat Interface**

```
┌─────────────────────────────────────────────────────────────┐
│ 🤖 AI Pattern Assistant                                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  You: Can you help me create a pattern for this log line?   │
│                                                              │
│  "2024-02-21 10:30:15 ERROR [SIPStack] Received 503         │
│   Service Unavailable from 10.1.1.5:5060"                   │
│                                                              │
│  ──────────────────────────────────────────────────────────│
│                                                              │
│  🤖 Assistant: I've analyzed this log line. Here's a pattern:│
│                                                              │
│  **Pattern Analysis**                                        │
│  Name: SIP Service Unavailable Response                     │
│  Description: Detects SIP 503 errors from remote servers    │
│                                                              │
│  **Suggested Regex:**                                        │
│  ```regex                                                    │
│  ERROR \[SIPStack\] Received (\d{3}) (.*?) from             │
│  (\d+\.\d+\.\d+\.\d+):(\d+)                                  │
│  ```                                                         │
│                                                              │
│  **Extractors:**                                             │
│  • STATUS_CODE: `(\d{3})` - "503"                            │
│  • MESSAGE: `(.*?)` - "Service Unavailable"                  │
│  • SERVER_IP: `(\d+\.\d+\.\d+\.\d+)` - "10.1.1.5"            │
│  • SERVER_PORT: `(\d+)` - "5060"                             │
│                                                              │
│  **Explanation:**                                            │
│  This pattern captures SIP error responses. The STATUS_CODE  │
│  lets you filter by error type (503 = unavailable, 408 =     │
│  timeout, etc.). SERVER_IP identifies which server is having │
│  issues.                                                     │
│                                                              │
│  **Recommendations:**                                        │
│  • Severity: error                                           │
│  • Category: SIP                                             │
│  • Consider adding condition: STATUS_CODE >= 500 → critical  │
│                                                              │
│  [Create Pattern] [Test on More Lines] [Refine] [Start Over]│
│                                                              │
│  ──────────────────────────────────────────────────────────│
│                                                              │
│  You: Can you add a timestamp extractor?                     │
│                                                              │
│  🤖 Assistant: Sure! I'll update the pattern to include      │
│  the timestamp...                                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Integration: Behavioral Learning + AI Assistant

### **Combined Workflow**

```
1. User analyzes logs (passive)
   ↓
2. Behavioral engine detects patterns
   ↓
3. System suggests: "Create pattern for these lines?"
   ↓
4. User clicks "Refine with AI"
   ↓
5. AI Assistant opens with pre-populated examples
   ↓
6. AI suggests regex + extractors
   ↓
7. User refines interactively
   ↓
8. Pattern created and tested
   ↓
9. Quality check → Upload to MongoDB
   ↓
10. Team benefits from the pattern
```

### **UI Integration**

```
┌─────────────────────────────────────────────────────────────┐
│ 📊 Log Analysis View                                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [Show All] [Errors Only] [Search...] [AI Assistant 🤖]     │
│                                                              │
│  💡 8 patterns detected from your behavior  [View]           │
│                                                              │
│  Log Lines:                                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 2024-02-21 10:30:00 ERROR Connection timeout to     │  │
│  │   10.1.1.5:5060                                      │  │
│  │                                    [Copy] [Highlight]│  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ 2024-02-21 10:30:30 ERROR Connection timeout to     │  │
│  │   10.2.3.8:5060                                      │  │
│  │                                    [Copy] [Highlight]│  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ 2024-02-21 10:31:00 ERROR Connection timeout to     │  │
│  │   10.5.2.1:5060                                      │  │
│  │                                    [Copy] [Highlight]│  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  💡 Pattern detected! [Create Pattern] [Ask AI] [Dismiss]   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 MongoDB Schema for Learning Data

```javascript
{
  // Behavioral learning data
  user_learning: {
    user_id: "mitchong@cisco.com",
    
    // Discovered patterns
    discovered_patterns: [
      {
        pattern_id: "discovered_abc123",
        suggested_regex: "ERROR Connection timeout to ([\\d.]+):(\\d+)",
        example_lines: [...],
        confidence: 0.88,
        interest_score: 15.5,
        user_actions: [
          { action: "line_clicked", count: 5 },
          { action: "line_copied", count: 3 }
        ],
        status: "suggested",  // suggested, accepted, rejected, created
        suggested_at: ISODate("2024-02-21T10:30:00Z"),
        action_taken: null,
        action_taken_at: null
      }
    ],
    
    // User preferences (what they accept/reject)
    preferences: {
      preferred_severity_suggestions: "error",
      auto_accept_high_confidence: true,
      min_confidence_threshold: 0.80,
      preferred_categories: ["SIP", "Network", "Security"]
    },
    
    // Learning statistics
    stats: {
      patterns_suggested: 45,
      patterns_accepted: 32,
      patterns_rejected: 8,
      patterns_refined_with_ai: 12,
      acceptance_rate: 0.71,
      avg_time_to_decision_seconds: 120
    }
  },
  
  // AI assistant conversations
  ai_conversations: [
    {
      conversation_id: "conv_xyz789",
      user_id: "mitchong@cisco.com",
      started_at: ISODate("2024-02-21T11:00:00Z"),
      ended_at: ISODate("2024-02-21T11:15:00Z"),
      
      messages: [
        {
          role: "user",
          content: "Help me create a pattern for timeout errors",
          timestamp: ISODate("2024-02-21T11:00:00Z")
        },
        {
          role: "assistant",
          content: "I'd be happy to help! Could you share an example...",
          timestamp: ISODate("2024-02-21T11:00:05Z")
        }
      ],
      
      result: {
        pattern_created: true,
        pattern_id: "user-pattern-123",
        quality_score: 85.0,
        time_to_create_minutes: 15
      }
    }
  ]
}
```

---

## 🎯 Implementation Roadmap

### **Phase 1: Behavioral Learning (2 weeks)**

**Week 1: Event Tracking**
- [ ] Implement user interaction tracking
- [ ] Create interaction event system
- [ ] Store events in MongoDB
- [ ] Build interaction aggregation pipeline

**Week 2: Pattern Discovery**
- [ ] Implement similarity grouping algorithm
- [ ] Build pattern extraction engine
- [ ] Create interest score calculator
- [ ] Implement suggestion UI

### **Phase 2: AI Assistant (2 weeks)**

**Week 1: LLM Integration**
- [ ] Set up OpenAI/Anthropic API client
- [ ] Implement chat interface
- [ ] Create system prompts
- [ ] Build response parsing

**Week 2: Interactive Refinement**
- [ ] Implement conversation flow
- [ ] Add pattern testing
- [ ] Create preview system
- [ ] Build quality validation

### **Phase 3: Integration (1 week)**
- [ ] Connect behavioral learning to AI assistant
- [ ] Implement combined workflow
- [ ] Add user preferences
- [ ] Create analytics dashboard

### **Phase 4: Learning & Optimization (Ongoing)**
- [ ] A/B test suggestions
- [ ] Optimize pattern discovery algorithm
- [ ] Improve AI prompts based on user feedback
- [ ] Expand to signature/scenario suggestions

---

## 📈 Success Metrics

**Behavioral Learning:**
- Pattern suggestion acceptance rate: >60%
- Time to pattern creation: <5 minutes
- User-discovered patterns per week: >10

**AI Assistant:**
- Pattern creation success rate: >80%
- Average conversation length: <10 messages
- User satisfaction score: >4/5
- Patterns created with AI vs manual: 70/30

**Overall Impact:**
- Total patterns created: 3x increase
- Pattern quality: >80 average score
- Team adoption: >75% of users try AI assistant
- Collaborative enhancements: 2x increase

---

## 🔒 Privacy & Security Considerations

### **Data Privacy**

```yaml
privacy_controls:
  # What we track
  track_interactions: true
  track_log_content: false  # Only hash, not full content
  track_user_identity: true
  
  # Data retention
  interaction_retention_days: 90
  conversation_retention_days: 180
  
  # User control
  allow_opt_out: true
  allow_data_export: true
  allow_data_deletion: true
  
  # Sensitive data
  redact_passwords: true
  redact_api_keys: true
  redact_pii: true
```

### **LLM Data Handling**

```rust
pub fn sanitize_for_llm(log_line: &str) -> String {
    let mut sanitized = log_line.to_string();
    
    // Redact potential secrets
    sanitized = redact_passwords(&sanitized);
    sanitized = redact_api_keys(&sanitized);
    sanitized = redact_tokens(&sanitized);
    
    // Redact PII
    sanitized = redact_emails(&sanitized);
    sanitized = redact_phone_numbers(&sanitized);
    
    sanitized
}

fn redact_passwords(text: &str) -> String {
    regex::Regex::new(r"(?i)(password|passwd|pwd)[=:]\s*\S+")
        .unwrap()
        .replace_all(text, "$1=[REDACTED]")
        .to_string()
}
```

---

## 💡 Advanced Features (Future)

### **1. Team Learning**
```
Individual learning → Team learning → Organization learning
- Aggregate patterns across team
- Identify common pain points
- Share successful patterns automatically
```

### **2. Contextual Suggestions**
```
Based on:
- Current file type (jabber.log → suggest Jabber patterns)
- Recent diagnostics (lots of errors → suggest error patterns)
- Time of day (maintenance window → suggest different patterns)
```

### **3. Multi-Line Pattern Discovery**
```
Detect sequences:
"Call setup started"
→ "Authentication successful"
→ "Media negotiation"
→ "Call established"

Suggest: Call Flow Scenario pattern
```

### **4. Anomaly-Based Suggestions**
```
Detect unusual log lines:
- Lines that don't match any pattern
- Sudden increase in specific error types
- New error messages

Suggest: Create pattern for anomaly
```

---

## ✅ Summary

**Two Complementary Systems:**

1. **Behavioral Learning** (Passive AI)
   - Watches user actions
   - Detects patterns automatically
   - Suggests patterns proactively
   - Learns user preferences

2. **AI Pattern Assistant** (Active AI)
   - Chat-based interaction
   - Analyzes log lines with LLM
   - Suggests regex + extractors
   - Interactive refinement

**Result:**
- Users don't need regex expertise
- Pattern creation time: 20 min → 3 min
- Pattern quality improves through AI guidance
- System learns what's important to each team
- Continuous improvement loop

**Integration with Collaborative Enhancement:**
- AI-suggested patterns → Quality check → Upload to MongoDB
- Behavioral patterns → Team validation → Collaborative improvement
- Best patterns → Promote to TagScout

**User Experience:**
```
"The system watches what I care about and suggests patterns.
When I want more control, I chat with AI to refine them.
The patterns get better as more people use them.
I don't need to be a regex expert anymore."
```

---

**Status**: Design Complete  
**Next Steps**: Implement behavioral event tracking system  
**Estimated Effort**: 5 weeks total  
**Priority**: HIGH - Dramatically improves user experience