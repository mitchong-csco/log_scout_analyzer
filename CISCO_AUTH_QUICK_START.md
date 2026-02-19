# Quick Start: Cisco Scripts API Authentication

## One-Minute Overview

```
User Login → Get Code → Exchange for Token → Use Token for API Calls
```

The Cisco Scripts API uses a simple OAuth2-style flow:

1. **User authenticates** at Cisco login portal
2. **Receives authorization code**
3. **Exchanges code for access_token** (your implementation)
4. **Uses token** for all subsequent API requests

---

## Quick Implementation (Choose Your Language)

### Rust (For LSP Server)

```rust
use reqwest::Client;

async fn get_access_token(code: String) -> Result<String, Box<dyn std::error::Error>> {
    let client = Client::new();
    let response = client
        .get("https://scripts.cisco.com/api/v2/auth/redirect:path")
        .query(&[("path", "/app"), ("code", &code)])
        .send()
        .await?;

    let json: serde_json::Value = response.json().await?;
    Ok(json["access_token"].as_str().unwrap().to_string())
}

// Usage
let token = get_access_token("your_auth_code".to_string()).await?;
println!("Got token: {}", token);
```

### Python

```python
import requests

def get_access_token(code: str) -> str:
    response = requests.get(
        "https://scripts.cisco.com/api/v2/auth/redirect:path",
        params={"path": "/app", "code": code}
    )
    response.raise_for_status()
    return response.json()["access_token"]

# Usage
token = get_access_token("your_auth_code")
print(f"Got token: {token}")
```

### JavaScript/TypeScript

```typescript
async function getAccessToken(code: string): Promise<string> {
  const response = await fetch(
    `https://scripts.cisco.com/api/v2/auth/redirect:path?path=/app&code=${code}`,
    { method: 'GET' }
  );
  const data = await response.json();
  return data.access_token;
}

// Usage
const token = await getAccessToken("your_auth_code");
console.log(`Got token: ${token}`);
```

---

## Using the Token

Once you have the access token, use it in the `Authorization` header:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  https://scripts.cisco.com/api/v2/scripts
```

**Python:**
```python
headers = {"Authorization": f"Bearer {token}"}
response = requests.get("https://scripts.cisco.com/api/v2/scripts", headers=headers)
```

**JavaScript:**
```typescript
const headers = { "Authorization": `Bearer ${token}` };
const response = await fetch("https://scripts.cisco.com/api/v2/scripts", 
  { headers }
);
```

**Rust:**
```rust
let response = client
    .get("https://scripts.cisco.com/api/v2/scripts")
    .bearer_auth(&token)
    .send()
    .await?;
```

---

## Full Workflow Example

### Step 1: Get Authorization Code
User logs in at Cisco portal and receives a code. This code is short-lived (typically 5-10 minutes).

### Step 2: Exchange Code for Token
**Endpoint:** `GET https://scripts.cisco.com/api/v2/auth/redirect:path`

**Parameters:**
```
path=/app&code=YOUR_AUTH_CODE
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "optional_refresh_token"
}
```

### Step 3: Store and Use Token

```python
# Store securely
access_token = token_response["access_token"]
expires_in = token_response.get("expires_in")  # seconds

# Use in requests
headers = {"Authorization": f"Bearer {access_token}"}
response = requests.get(
    "https://scripts.cisco.com/api/v2/scripts",
    headers=headers
)
```

### Step 4: Handle Token Expiration

```python
import time
from datetime import datetime, timedelta

class TokenManager:
    def __init__(self):
        self.token = None
        self.expires_at = None

    def set_token(self, token_response):
        self.token = token_response["access_token"]
        expires_in = token_response.get("expires_in", 3600)
        self.expires_at = datetime.now() + timedelta(seconds=expires_in)

    def is_expired(self):
        return datetime.now() >= self.expires_at

    def is_valid(self):
        return self.token is not None and not self.is_expired()
```

---

## Implementation in Log Scout Analyzer

### 1. Add Dependencies to Cargo.toml

```toml
[workspace.dependencies]
reqwest = { version = "0.11", features = ["json", "cookies"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

### 2. Create Module

Copy `crates/tagscout-integration/src/cisco_auth.rs` from the provided code.

### 3. Integrate into LSP

Add to your LSP handler:

```rust
// In your LSP execute_command handler
"cisco.auth.login" => {
    let code = arguments.get(0)?.as_str()?.to_string();
    let token_resp = auth_client.exchange_code_for_token(code, "/app".to_string()).await?;
    // Return success response to client
}

"cisco.scripts.fetch" => {
    let response = auth_client.get("/api/v2/scripts").await?;
    let scripts = response.json().await?;
    // Return scripts to client
}
```

### 4. Call from VS Code Extension

```typescript
// In vscode-extension
const result = await vscode.commands.executeCommand(
  'logScout.ciscoAuth.login',
  authorizationCode
);
```

---

## Key Points

✅ **Simple endpoint**: Just GET with two query params  
✅ **Immediate response**: Token comes back immediately in JSON  
✅ **Bearer token**: Use standard `Authorization: Bearer` header  
✅ **Cookie handling**: Response includes `bdb_cookie` header (auto-managed by most HTTP clients)  
✅ **Error codes**: 201=Success, 400=Bad request, 500=Server error

---

## Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| 400 Bad Request | Invalid code or path | Check code is valid, path matches regex |
| 401 Unauthorized | Invalid token on API call | Re-authenticate, token may have expired |
| 500 Server Error | Cisco API down | Retry with exponential backoff |
| No response | Network issue | Check internet, firewall rules |

---

## Testing Your Implementation

### Manual Test with cURL

```bash
# Step 1: Get code (manual login at Cisco portal)
# Then test token exchange:

curl -v -X GET \
  "https://scripts.cisco.com/api/v2/auth/redirect:path?path=/app&code=YOUR_AUTH_CODE"
```

### With Python

```python
import requests

code = "YOUR_AUTH_CODE_HERE"
response = requests.get(
    "https://scripts.cisco.com/api/v2/auth/redirect:path",
    params={"path": "/app", "code": code},
    timeout=10
)

print(f"Status: {response.status_code}")
print(f"Headers: {dict(response.headers)}")
print(f"Body: {response.json()}")
```

### With Rust

```rust
#[tokio::main]
async fn main() {
    let client = reqwest::Client::new();
    let response = client
        .get("https://scripts.cisco.com/api/v2/auth/redirect:path")
        .query(&[("path", "/app"), ("code", "YOUR_AUTH_CODE")])
        .send()
        .await
        .expect("Request failed");
    
    println!("Status: {}", response.status());
    let json = response.json::<serde_json::Value>().await.expect("JSON parse failed");
    println!("Token: {}", json["access_token"]);
}
```

---

## Next Steps

1. ✅ Understand the flow (you're reading this!)
2. 🔄 Implement token exchange in your backend
3. 🔒 Store token securely (memory or encrypted storage)
4. 📡 Use token for API requests
5. ⏰ Implement token refresh/expiration handling
6. 🧪 Test with real Cisco credentials

---

## References

- Full Implementation: `CISCO_AUTH_IMPLEMENTATION.md`
- Rust Module: `crates/tagscout-integration/src/cisco_auth.rs`
- LSP Integration: `CISCO_AUTH_LSP_INTEGRATION.rs`
- API Docs: From your initial request above
