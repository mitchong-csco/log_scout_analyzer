# Cisco Scripts Authentication - Implementation Summary

## 📋 What You Need to Know

The Cisco Scripts API uses a **simple two-step authentication**:

```
Step 1: Get Authorization Code
        ↓
Step 2: POST code → GET access_token
        ↓
Step 3: Use token in Authorization header
```

## 🚀 Quick Answer to Your Question

**Yes, you can definitely do this!** Here's the minimal code:

```rust
// Step 1: User gets authorization code from Cisco login
let code = "authorization_code_from_cisco";

// Step 2: Exchange code for token
let response = reqwest::Client::new()
    .get("https://scripts.cisco.com/api/v2/auth/redirect:path")
    .query(&[("path", "/app"), ("code", &code)])
    .send()
    .await?;

let json: serde_json::Value = response.json().await?;
let access_token = &json["access_token"];

// Step 3: Use token for all subsequent requests
reqwest::Client::new()
    .get("https://scripts.cisco.com/api/v2/scripts")
    .bearer_auth(access_token)
    .send()
    .await?;
```

## 📚 Files Created for You

### 1. **CISCO_AUTH_QUICK_START.md** (Start here!)
   - Quick overview in all languages
   - Copy-paste examples
   - Common errors and solutions

### 2. **CISCO_AUTH_IMPLEMENTATION.md** (Detailed guide)
   - Complete technical documentation
   - Security best practices
   - Full implementations in Rust, Python, TypeScript

### 3. **crates/tagscout-integration/src/cisco_auth.rs** (Ready-to-use Rust module)
   - Complete, production-ready authentication client
   - Error handling
   - Unit tests included
   - Just copy into your project!

### 4. **examples/cisco_auth_example.rs** (Working example)
   - Full runnable example
   - Shows real authentication flow
   - Includes unit tests
   - Run with: `CISCO_AUTH_CODE=xxx cargo run --example cisco_auth_example`

### 5. **CISCO_AUTH_LSP_INTEGRATION.rs** (LSP integration)
   - How to integrate into your LSP server
   - Command handlers
   - Example LSP commands:
     - `cisco.auth.login` - Login with code
     - `cisco.auth.logout` - Clear token
     - `cisco.auth.status` - Check auth status
     - `cisco.scripts.list` - Use token for API call

## 🔧 Implementation Steps

### Option 1: Use the Provided Rust Module (Recommended)

```bash
# 1. Copy the cisco_auth.rs file
cp crates/tagscout-integration/src/cisco_auth.rs your_crate/src/

# 2. Add to your module's lib.rs or main.rs
pub mod cisco_auth;

# 3. Use it
use cisco_auth::CiscoAuthClient;

let client = CiscoAuthClient::new("https://scripts.cisco.com");
let token_response = client.exchange_code_for_token(code, "/app".to_string()).await?;
```

### Option 2: Implement from Scratch

```rust
let client = reqwest::Client::new();
let response = client
    .get("https://scripts.cisco.com/api/v2/auth/redirect:path")
    .query(&[("path", "/app"), ("code", &auth_code)])
    .send()
    .await?;

let token_data: TokenResponse = response.json().await?;
```

### Option 3: Use in Python

```python
import requests

response = requests.get(
    "https://scripts.cisco.com/api/v2/auth/redirect:path",
    params={"path": "/app", "code": auth_code}
)
access_token = response.json()["access_token"]
```

## ⚡ Key API Details

| Aspect | Value |
|--------|-------|
| **Endpoint** | `GET https://scripts.cisco.com/api/v2/auth/redirect:path` |
| **Auth Code Source** | User logs in at Cisco portal |
| **Path Parameter** | `/app` (or `/ui`, `/app_dev`, or empty) |
| **Query Parameter** | `code=<authorization_code>` |
| **Response Code** | 201 Created (success) |
| **Token Header** | `Authorization: Bearer <access_token>` |
| **Cookie** | `bdb_cookie` (auto-handled by HTTP clients) |

## 🔐 Security Checklist

- ✅ Use HTTPS only
- ✅ Never log access tokens
- ✅ Store token in memory (not files)
- ✅ Implement token expiration handling
- ✅ Use Bearer token in Authorization header
- ✅ Handle cookie responses automatically
- ✅ Implement proper error handling

## 🧪 Test It

### With cURL
```bash
curl -X GET "https://scripts.cisco.com/api/v2/auth/redirect:path?path=/app&code=YOUR_CODE"
```

### With Python
```bash
python -c "
import requests
code = 'YOUR_CODE'
r = requests.get('https://scripts.cisco.com/api/v2/auth/redirect:path', 
                  params={'path': '/app', 'code': code})
print(r.json())
"
```

### With the Example
```bash
CISCO_AUTH_CODE=YOUR_CODE cargo run --example cisco_auth_example
```

## 📝 LSP Integration Example

```rust
// In your LSP execute_command handler
match command.as_str() {
    "cisco.auth.login" => {
        let code = args[0].as_str()?;
        let token = auth_client.exchange_code_for_token(
            code.to_string(), 
            "/app".to_string()
        ).await?;
        
        return Ok(serde_json::json!({
            "success": true,
            "token": token.access_token
        }));
    }
    
    "cisco.scripts.list" => {
        let response = auth_client.get("/api/v2/scripts").await?;
        return Ok(response.json().await?);
    }
    
    // ... more commands
}
```

## 🎯 Typical Flow

```
┌─ User in VS Code/Zed ──────────────────────────────┐
│                                                    │
│  1. Run command: "Login to Cisco Scripts"         │
│                                                    │
│  2. Opens browser → Cisco login page              │
│                                                    │
│  3. User logs in → Gets redirect with code        │
│                                                    │
│  4. Extension captures code                       │
│                                                    │
│  5. Extension sends to LSP: "cisco.auth.login"    │
│                                                    │
└──────────────────────────────────────────────────→─┘
                                ↓
┌─ Your Rust LSP Server ─────────────────────────────┐
│                                                    │
│  1. Receive: cisco.auth.login(code)              │
│                                                    │
│  2. Call: CiscoAuthClient::exchange_code_...()   │
│                                                    │
│  3. POST: https://scripts.cisco.com/api/v2/...   │
│           params: path=/app&code=...             │
│                                                    │
│  4. Receive: { access_token: "...", ...}         │
│                                                    │
│  5. Store token in memory                         │
│                                                    │
│  6. Return to client: { success: true }          │
│                                                    │
└───────────────────────────────────────────────────┘
                                ↓
┌─ User wants to use script ─────────────────────────┐
│                                                    │
│  1. Command: "List Scripts"                      │
│                                                    │
│  2. Extension sends: "cisco.scripts.list"        │
│                                                    │
│  3. LSP calls: auth_client.get("/api/v2/...")   │
│     with Authorization: Bearer <token>           │
│                                                    │
│  4. Get response, format, send back              │
│                                                    │
│  5. Display in editor                            │
│                                                    │
└────────────────────────────────────────────────────┘
```

## ❓ FAQ

**Q: Where do I get the authorization code?**
A: User logs in at the Cisco Scripts website. The code is returned in the callback URL.

**Q: How long is the access token valid?**
A: Depends on Cisco's settings, typically 1-24 hours. Check `expires_in` in response.

**Q: Can I refresh the token?**
A: If a `refresh_token` is provided, you can use it to get a new token without re-authentication.

**Q: What's the `bdb_cookie`?**
A: Session cookie from Cisco. Most HTTP libraries handle this automatically.

**Q: Should I store the token in a file?**
A: No, keep it in memory. If you need persistence, use OS keyring/credential manager.

**Q: Can I use this from the extension?**
A: Better to keep it in the LSP server. The server stores the token securely and handles all API calls.

**Q: What if I get 400 error?**
A: Check that:
- Code is valid and not expired
- Path parameter matches regex: `^$|(/\(app|ui|app_dev\).*)`
- Code hasn't been used already (codes are single-use)

## 📖 Next Steps

1. **Read** CISCO_AUTH_QUICK_START.md (5 min)
2. **Review** the example: examples/cisco_auth_example.rs (10 min)
3. **Integrate** cisco_auth.rs into your project (5 min)
4. **Test** with your Cisco credentials (10 min)
5. **Deploy** to production

## 🆘 Need Help?

- Check error messages in CISCO_AUTH_IMPLEMENTATION.md
- Run the example to see the flow
- Review security best practices
- Check Cisco Scripts API documentation

---

**Status**: ✅ Ready to implement!
**Complexity**: ⭐ Easy (2 HTTP calls + token storage)
**Time to implement**: 30-60 minutes
