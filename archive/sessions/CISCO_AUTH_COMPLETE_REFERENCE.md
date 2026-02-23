# Complete Reference: Cisco Scripts API Authentication

## 📌 TL;DR - The Answer

**Yes, you can perform login and access the Cisco Scripts site.**

The process is:

```
1. User logs in → Gets code
2. Your app: GET /api/v2/auth/redirect:path?path=/app&code=CODE
3. Response: { access_token, token_type, expires_in, ... }
4. Use token: GET /api/v2/scripts -H "Authorization: Bearer TOKEN"
```

---

## 🎯 Complete Implementation Checklist

- [ ] **Understand the flow** (read: CISCO_AUTH_QUICK_START.md)
- [ ] **Choose your approach** (rust module vs. from-scratch)
- [ ] **Add HTTP client** to dependencies (reqwest/axios/requests)
- [ ] **Implement token exchange** (copy the code below)
- [ ] **Store token securely** (memory + VS Code globalState for extension)
- [ ] **Use token in requests** (Authorization: Bearer header)
- [ ] **Handle expiration** (check expires_in field)
- [ ] **Test it** (use example code)
- [ ] **Integrate with LSP** (register commands)
- [ ] **Add UI** (login button/command in VS Code)

---

## 🚀 Implementation Options

### Option 1: Copy Rust Module (5 minutes)

**Best for**: LSP server integration

```bash
# 1. Copy the file
cp crates/tagscout-integration/src/cisco_auth.rs your_crate/src/

# 2. Add to your module
pub mod cisco_auth;
use cisco_auth::CiscoAuthClient;

# 3. Use it
let client = CiscoAuthClient::new("https://scripts.cisco.com");
let token_resp = client.exchange_code_for_token(code, "/app".to_string()).await?;
```

### Option 2: TypeScript for VS Code Extension (5 minutes)

**Best for**: VS Code extension

```bash
# 1. Copy the file
cp vscode-extension/src/auth/ciscoAuthClient.ts your_extension/src/auth/

# 2. Use it
import { CiscoAuthClient } from './auth/ciscoAuthClient';
const client = new CiscoAuthClient({}, context);
const token = await client.login(code, '/app');
```

### Option 3: Minimal Python (5 minutes)

**Best for**: Standalone tools or testing

```python
import requests

code = "YOUR_CODE"
response = requests.get(
    "https://scripts.cisco.com/api/v2/auth/redirect:path",
    params={"path": "/app", "code": code}
)
token = response.json()["access_token"]
```

---

## 📡 API Reference

### Token Exchange Endpoint

| Property | Value |
|----------|-------|
| **Method** | GET |
| **URL** | `https://scripts.cisco.com/api/v2/auth/redirect:path` |
| **Success Code** | 201 Created |
| **Error Codes** | 400 Bad Request, 500 Server Error |

### Path Parameters

```
path (required): string
  Format: ^$|(/\(app|ui|app_dev\).*)
  Examples:
    - /app         ✓ Main application
    - /ui          ✓ User interface
    - /app_dev     ✓ Development environment
    -              ✓ Empty path
    - /invalid     ✗ Invalid
```

### Query Parameters

```
code (required): string
  - Authorization code from Cisco login
  - Single-use only
  - Expires after ~10 minutes
  - Example: code=abc123xyz789
```

### Response Headers

```
Set-Cookie: bdb_cookie=<value>; Path=/; Secure; HttpOnly
```

### Response Body

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "optional_refresh_token_here"
}
```

### Using the Token

```bash
# HTTP Request with token
curl -H "Authorization: Bearer ACCESS_TOKEN_HERE" \
  https://scripts.cisco.com/api/v2/scripts
```

---

## 📋 Minimal Complete Example

### Rust

```rust
use reqwest::Client;
use serde_json::Value;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 1. Get token
    let code = "AUTH_CODE_HERE";
    let response = Client::new()
        .get("https://scripts.cisco.com/api/v2/auth/redirect:path")
        .query(&[("path", "/app"), ("code", code)])
        .send()
        .await?;

    let json: Value = response.json().await?;
    let token = json["access_token"].as_str().unwrap();

    // 2. Use token
    let data = Client::new()
        .get("https://scripts.cisco.com/api/v2/scripts")
        .bearer_auth(token)
        .send()
        .await?
        .json::<Value>()
        .await?;

    println!("{:#}", data);
    Ok(())
}
```

### Python

```python
import requests

# 1. Get token
code = "AUTH_CODE_HERE"
r = requests.get(
    "https://scripts.cisco.com/api/v2/auth/redirect:path",
    params={"path": "/app", "code": code}
)
token = r.json()["access_token"]

# 2. Use token
headers = {"Authorization": f"Bearer {token}"}
data = requests.get(
    "https://scripts.cisco.com/api/v2/scripts",
    headers=headers
).json()

print(data)
```

### TypeScript

```typescript
async function main() {
  // 1. Get token
  const code = "AUTH_CODE_HERE";
  const r1 = await fetch(
    `https://scripts.cisco.com/api/v2/auth/redirect:path?path=/app&code=${code}`
  );
  const { access_token: token } = await r1.json();

  // 2. Use token
  const headers = { "Authorization": `Bearer ${token}` };
  const data = await fetch(
    "https://scripts.cisco.com/api/v2/scripts",
    { headers }
  ).then(r => r.json());

  console.log(data);
}

main();
```

---

## 🔒 Security Best Practices

### Do's ✅

- ✅ Use HTTPS always
- ✅ Store token in memory only
- ✅ Use Bearer token format
- ✅ Check token expiration
- ✅ Handle 401 Unauthorized (token expired)
- ✅ Use proper HTTP client with built-in security
- ✅ Log errors, not tokens
- ✅ Implement retry logic with backoff

### Don'ts ❌

- ❌ Don't log the access token
- ❌ Don't store token in files/config
- ❌ Don't hardcode credentials
- ❌ Don't use HTTP (always HTTPS)
- ❌ Don't reuse authorization codes
- ❌ Don't expose token in URLs
- ❌ Don't commit tokens to git

---

## 🧪 Testing Your Implementation

### 1. Manual Test with cURL

```bash
# Replace YOUR_CODE with actual authorization code
curl -v -X GET \
  "https://scripts.cisco.com/api/v2/auth/redirect:path?path=/app&code=YOUR_CODE"

# Expected response (201 Created):
# {
#   "access_token": "...",
#   "token_type": "Bearer",
#   "expires_in": 3600
# }
```

### 2. Run the Rust Example

```bash
# Set environment variable with your code
set CISCO_AUTH_CODE=YOUR_CODE

# Run example
cargo run --example cisco_auth_example
```

### 3. Test with Python Script

```bash
python << 'EOF'
import requests
import sys

code = "YOUR_CODE"
try:
    r = requests.get(
        "https://scripts.cisco.com/api/v2/auth/redirect:path",
        params={"path": "/app", "code": code},
        timeout=5
    )
    print(f"Status: {r.status_code}")
    print(f"Response: {r.json()}")
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
EOF
```

### 4. Unit Tests

```rust
#[tokio::test]
async fn test_token_exchange() {
    let client = CiscoAuthClient::new("https://scripts.cisco.com");
    
    // This requires a valid code, so usually mocked in tests
    // Example mock implementation:
    #[tokio::test]
    async fn test_token_storage() {
        let client = CiscoAuthClient::new("https://scripts.cisco.com");
        
        // Simulate successful authentication
        *client.access_token.lock().await = 
            Some("test_token".to_string());
        
        // Verify token is stored
        assert!(client.is_authenticated().await);
    }
}
```

---

## 🛠️ Troubleshooting

### Problem: 400 Bad Request

**Causes:**
- Invalid authorization code
- Code has expired
- Path parameter doesn't match regex
- Code already used

**Solution:**
- Get a fresh code
- Verify path is `/app`, `/ui`, `/app_dev`, or empty
- Check code immediately, don't delay

### Problem: 401 Unauthorized

**Causes:**
- Token has expired
- Token is invalid/malformed
- Token not provided in Authorization header

**Solution:**
- Check token expiration (expires_in field)
- Re-authenticate with fresh code
- Ensure Bearer token format: `Authorization: Bearer TOKEN`

### Problem: Connection Timeout

**Causes:**
- Network issue
- Firewall blocking
- Cisco API temporarily down

**Solution:**
- Check internet connection
- Check firewall/proxy settings
- Retry with exponential backoff
- Check Cisco status page

### Problem: CORS Error (Browser)

**Causes:**
- Calling API from browser without CORS headers
- Cisco API doesn't allow browser requests

**Solution:**
- Make request from your backend (LSP server)
- Don't call directly from extension
- Use your LSP server as proxy

### Problem: Token Expires Too Quickly

**Causes:**
- Server-side configuration
- Token actually expired
- Clock skew

**Solution:**
- Use refresh_token if provided
- Re-authenticate
- Check system clock is correct

---

## 📊 State Management

### In VS Code Extension

```typescript
// Store in extension global state (persisted)
const tokenData = {
  token: "...",
  expiresAt: new Date()
};

await context.globalState.update("cisco.auth.token", tokenData);

// OR store in secret storage (encrypted)
await context.secrets.store("cisco.auth.token", token);
```

### In LSP Server

```rust
// Store in Arc<Mutex<>> for concurrent access
let auth_client = Arc::new(CiscoAuthClient::new(base_url));

// Use in handler
let token = auth_client.get_access_token().await;
```

### In Standalone App

```python
# Store in instance variable
self.access_token = token_response["access_token"]
self.token_expires = time.time() + token_response.get("expires_in", 3600)

# Check before use
if time.time() >= self.token_expires:
    # Re-authenticate
```

---

## 🔄 Token Refresh Flow (Optional)

If the response includes `refresh_token`:

```rust
async fn refresh_access_token(
    &self,
    refresh_token: String,
) -> Result<TokenResponse, AuthError> {
    // Implementation depends on Cisco's endpoint
    // Usually: POST /api/v2/auth/refresh
    // with: { refresh_token: "..." }
    
    // This example assumes standard OAuth2
    let response = self.http_client
        .post(&format!("{}/api/v2/auth/refresh", self.base_url))
        .json(&serde_json::json!({
            "refresh_token": refresh_token
        }))
        .send()
        .await?;
    
    let token_response: TokenResponse = response.json().await?;
    Ok(token_response)
}
```

---

## 📈 Performance Considerations

### Caching

```rust
// Cache token in memory (don't re-authenticate for every request)
let token = auth_client.get_access_token().await;

// Reuse token for multiple API calls
let scripts = auth_client.get("/api/v2/scripts").await?;
let templates = auth_client.get("/api/v2/templates").await?;
```

### Rate Limiting

```rust
// Implement exponential backoff
let mut delay = 100; // milliseconds
for attempt in 0..5 {
    match api_call().await {
        Ok(result) => return Ok(result),
        Err(_) if attempt < 4 => {
            tokio::time::sleep(Duration::from_millis(delay)).await;
            delay *= 2; // Double wait time
        }
        Err(e) => return Err(e),
    }
}
```

### Parallel Requests

```rust
// Use a single token for multiple concurrent requests
let token = auth_client.get_access_token().await.ok_or("Not auth")?;

let (r1, r2, r3) = tokio::join!(
    fetch_with_token("/api/v2/scripts", &token),
    fetch_with_token("/api/v2/templates", &token),
    fetch_with_token("/api/v2/configs", &token),
);
```

---

## 🎓 Learning Resources

1. **OAuth 2.0**: https://tools.ietf.org/html/rfc6749
2. **Bearer Tokens**: https://tools.ietf.org/html/rfc6750
3. **HTTP Status Codes**: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
4. **RESTful API Design**: https://restfulapi.net/

---

## ✅ Final Checklist

- [ ] Authorization code obtained
- [ ] HTTP client added to dependencies
- [ ] Token exchange implemented
- [ ] Token stored securely
- [ ] Authorization header configured
- [ ] Error handling implemented
- [ ] Token expiration checked
- [ ] Tested with manual request
- [ ] Tested with code example
- [ ] Integrated with LSP/extension
- [ ] Security best practices reviewed
- [ ] Documentation updated
- [ ] Ready for production

---

## 🎯 Success Criteria

✅ You successfully authenticate when:

1. You can exchange a code for a token
2. Token response includes `access_token` field
3. You can use that token in Bearer header
4. API calls with token return 200 (success)
5. API calls without token return 401 (unauthorized)
6. Token persists across requests
7. Expired token triggers re-authentication

---

## 📞 Quick Reference Commands

```bash
# Get code from Cisco login
# (Manual step - user logs in)

# Test token exchange (cURL)
curl "https://scripts.cisco.com/api/v2/auth/redirect:path?path=/app&code=CODE"

# Test API call with token (cURL)
curl -H "Authorization: Bearer TOKEN" \
  "https://scripts.cisco.com/api/v2/scripts"

# Run Rust example
CISCO_AUTH_CODE=CODE cargo run --example cisco_auth_example

# Run tests
cargo test --lib cisco_auth

# Deploy
git add CISCO_AUTH_*.md examples/cisco_auth_example.rs
git commit -m "feat: Add Cisco Scripts API authentication"
```

---

**Last Updated**: 2026-02-18  
**Status**: ✅ Complete & Ready  
**Complexity**: Easy  
**Time to Implement**: 30-60 minutes
