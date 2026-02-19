# Cisco Scripts API Authentication - Visual Guide

## 🎬 The Complete Flow (Step by Step)

```
┌─────────────────────────────────────────────────────────────────────┐
│                      STEP 1: USER LOGS IN                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  User in VS Code                                                   │
│  │                                                                  │
│  ├─→ [Click "Login to Cisco Scripts" button/command]             │
│  │                                                                  │
│  ├─→ Browser opens → https://scripts.cisco.com/login             │
│  │                                                                  │
│  ├─→ User enters credentials                                     │
│  │   │                                                             │
│  │   ├─ Username: [###########]                                  │
│  │   ├─ Password: [###########]                                  │
│  │   └─ [LOGIN BUTTON]                                           │
│  │                                                                  │
│  └─→ Redirects to callback URL with authorization code          │
│      └─ https://callback.logscout.local/code=abc123xyz...       │
│         ↓                                                           │
│      Extension captures CODE parameter                            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│               STEP 2: EXCHANGE CODE FOR TOKEN                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  VS Code Extension                                                 │
│  │                                                                  │
│  └─→ Execute command: "cisco.auth.login"                         │
│      │                                                              │
│      └─→ Sends to LSP Server:                                    │
│          {                                                          │
│            "jsonrpc": "2.0",                                       │
│            "method": "workspace/executeCommand",                   │
│            "params": {                                             │
│              "command": "cisco.auth.login",                        │
│              "arguments": ["abc123xyz..."]                         │
│            }                                                        │
│          }                                                          │
│          │                                                          │
│          ↓                                                          │
│      LSP Server (Rust)                                            │
│      │                                                              │
│      └─→ auth_client.exchange_code_for_token(code, "/app")       │
│          │                                                          │
│          └─→ Makes HTTP GET Request:                            │
│              ┌──────────────────────────────────────────────────┐ │
│              │ GET /api/v2/auth/redirect:path                  │ │
│              │ Host: scripts.cisco.com                         │ │
│              │ Query: path=/app&code=abc123xyz...             │ │
│              │                                                  │ │
│              │ HTTP/1.1 201 Created                            │ │
│              │ Set-Cookie: bdb_cookie=...                     │ │
│              │ Content-Type: application/json                 │ │
│              │                                                  │ │
│              │ {                                               │ │
│              │   "access_token": "eyJ...",                    │ │
│              │   "token_type": "Bearer",                      │ │
│              │   "expires_in": 3600,                          │ │
│              │   "refresh_token": "ref..."                    │ │
│              │ }                                               │ │
│              └──────────────────────────────────────────────────┘ │
│          │                                                          │
│          ├─→ Parse JSON response                                 │
│          ├─→ Store token in memory                               │
│          ├─→ Store token in VS Code globalState (persisted)     │
│          └─→ Return success to Extension                         │
│                                                                     │
│  VS Code Extension receives:                                      │
│  { success: true, message: "Logged in!" }                        │
│  │                                                                  │
│  └─→ Show notification: "✓ Successfully logged in"              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│              STEP 3: USE TOKEN FOR API REQUESTS                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  User clicks: "List Scripts"                                       │
│  │                                                                  │
│  └─→ Extension sends: "cisco.scripts.list" command               │
│      │                                                              │
│      └─→ LSP Server receives command                             │
│          │                                                          │
│          ├─→ Get stored token from memory                        │
│          │   token = "eyJ..."                                    │
│          │                                                          │
│          └─→ Make authenticated request:                        │
│              ┌──────────────────────────────────────────────────┐ │
│              │ GET /api/v2/scripts                              │ │
│              │ Host: scripts.cisco.com                         │ │
│              │ Authorization: Bearer eyJ...                    │ │
│              │                                                  │ │
│              │ HTTP/1.1 200 OK                                 │ │
│              │ Content-Type: application/json                 │ │
│              │                                                  │ │
│              │ {                                               │ │
│              │   "scripts": [                                  │ │
│              │     { "id": "1", "name": "Script 1" },         │ │
│              │     { "id": "2", "name": "Script 2" },         │ │
│              │     ...                                         │ │
│              │   ]                                             │ │
│              │ }                                               │ │
│              └──────────────────────────────────────────────────┘ │
│          │                                                          │
│          └─→ Return scripts to Extension                         │
│              │                                                      │
│              └─→ Display in sidebar/panel                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Token Lifecycle

```
┌────────────────────────────────────────────────────────────────┐
│                    TOKEN LIFECYCLE                             │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [NO TOKEN]                                                    │
│      │                                                          │
│      └─→ User logs in                                         │
│          │                                                      │
│          ↓                                                      │
│  [TOKEN RECEIVED]  (expires_in: 3600 seconds)                │
│  │                                                              │
│  ├─→ Get token successfully                                  │
│  │   └─ Store in memory                                      │
│  │   └─ Save to globalState                                 │
│  │   └─ Set expiration timer                                │
│  │       └─ Current time + 3600 seconds                     │
│  │                                                              │
│  ├─→ Make API requests                                       │
│  │   └─ Include: Authorization: Bearer TOKEN               │
│  │   └─ All requests succeed (200 OK)                      │
│  │                                                              │
│  ├─→ Time passes...                                          │
│  │                                                              │
│  ├─→ Token approaches expiration                            │
│  │   └─ System checks: time.now() >= expiration_time       │
│  │   └─ Log warning (optional)                             │
│  │                                                              │
│  ├─→ Token expires                                           │
│  │   └─ isAuthenticated() returns false                    │
│  │   └─ Next API request fails with 401                   │
│  │                                                              │
│  └─→ User must log in again                                 │
│      │                                                          │
│      └─ Repeat from start                                    │
│                                                                 │
│  Alternative: Token Refresh (if supported)                   │
│      │                                                          │
│      ├─→ Token near expiration                              │
│      │   └─ Call: auth_client.refresh_token()              │
│      │   └─ Send: refresh_token to /api/v2/auth/refresh    │
│      │   └─ Get: new access_token                          │
│      │   └─ Update expiration timer                         │
│      │                                                          │
│      └─→ Continue using without re-authentication          │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Architecture: How It All Fits Together

```
┌─────────────────────────────────────────────────────────────────┐
│                    VS CODE EXTENSION                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  UI Layer                                                       │
│  ├─ Activity Bar Button: "Login"                              │
│  ├─ Command Palette: "Cisco Auth: Login"                      │
│  ├─ Status Bar: "Authenticated ✓"                            │
│  └─ Sidebar Tree: "Scripts", "Templates"                    │
│      │                                                          │
│      └─→ Auth Client (TypeScript)                           │
│          ├─ login(code, path)                               │
│          ├─ get(endpoint)                                   │
│          ├─ post(endpoint, data)                            │
│          ├─ logout()                                         │
│          └─ getStatus()                                     │
│              │                                                 │
│              └─→ Calls LSP Server                          │
│                  (via JSON-RPC)                             │
│                                                                 │
└────────────────────────────┬──────────────────────────────────┘
                             │ JSON-RPC 2.0
                             │ TCP/IPC Socket
                             ↓
┌────────────────────────────────────────────────────────────────┐
│                    LSP SERVER (Rust)                            │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Language Server Protocol Handler                             │
│  ├─ initialize()                                              │
│  ├─ workspace/executeCommand                                  │
│  │  ├─ "cisco.auth.login" → execute_login_command()          │
│  │  ├─ "cisco.auth.logout" → execute_logout_command()        │
│  │  └─ "cisco.scripts.list" → execute_list_command()         │
│  │      │                                                       │
│  │      └─→ Auth Handler                                    │
│  │          ├─ handle_login_command()                       │
│  │          ├─ handle_logout_command()                      │
│  │          └─ handle_list_scripts_command()                │
│  │              │                                              │
│  │              └─→ CiscoAuthClient (Rust)                 │
│  │                  ├─ new(base_url)                        │
│  │                  ├─ exchange_code_for_token()            │
│  │                  ├─ get(endpoint)                        │
│  │                  ├─ post(endpoint, body)                 │
│  │                  └─ get_access_token()                  │
│  │                      │                                      │
│  │                      └─→ HTTP Client (reqwest)          │
│  │                          └─ Makes requests to          │
│  │                             Cisco API                   │
│  │                                                              │
│  └─ textDocument/didChange                                    │
│      └─ Analyze logs with TagScout patterns                 │
│                                                                 │
└────────────────────────────┬──────────────────────────────────┘
                             │ HTTPS
                             ↓
┌────────────────────────────────────────────────────────────────┐
│              CISCO SCRIPTS API (Cloud)                          │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  GET /api/v2/auth/redirect:path                              │
│  ├─ Validates code                                            │
│  ├─ Issues access_token                                      │
│  └─ Sets bdb_cookie                                          │
│                                                                 │
│  GET /api/v2/scripts                                         │
│  ├─ Validates Bearer token                                   │
│  └─ Returns authorized data                                  │
│                                                                 │
│  GET /api/v2/templates                                       │
│  POST /api/v2/execute                                        │
│  etc.                                                          │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Data Flow: Token Storage & Usage

```
┌───────────────────────────────────────────────────────┐
│        TOKEN STORAGE & USAGE FLOW                     │
├───────────────────────────────────────────────────────┤
│                                                       │
│  1. Token Received                                   │
│     ↓                                                │
│     {                                                │
│       "access_token": "eyJ1234567...",              │
│       "expires_in": 3600,                           │
│       "token_type": "Bearer"                        │
│     }                                                │
│     │                                                │
│     ├─→ LSP Server Memory (Arc<Mutex<Option>>)     │
│     │   └─ Fast access                             │
│     │   └─ Lost on restart                         │
│     │                                                │
│     └─→ VS Code GlobalState (Encrypted)            │
│         ├─ Persisted across restarts               │
│         ├─ Encrypted by VS Code                    │
│         └─ Loaded on extension activation          │
│                                                       │
│  2. Using Token                                      │
│     ↓                                                │
│     When API request needed:                        │
│     │                                                │
│     ├─→ Check: isAuthenticated()?                  │
│     │                                                │
│     ├─→ YES: Use token                            │
│     │   GET /api/v2/scripts                        │
│     │   Authorization: Bearer eyJ1234567...       │
│     │   ↓                                           │
│     │   200 OK ← Success                           │
│     │                                                │
│     └─→ NO: Prompt login                           │
│         "Please log in first"                      │
│                                                       │
│  3. Token Expiration Check                          │
│     ↓                                                │
│     Before each request:                            │
│     │                                                │
│     if (current_time >= expiration_time) {         │
│       clearToken()                                 │
│       show "Token expired"                         │
│       prompt for re-login                         │
│     }                                                │
│                                                       │
└───────────────────────────────────────────────────────┘
```

---

## ⚠️ Error Handling Flow

```
┌────────────────────────────────────────────────────────────┐
│              ERROR HANDLING FLOW                           │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  TOKEN EXCHANGE REQUEST                                  │
│  │                                                        │
│  ├─→ Code Invalid/Expired                              │
│  │   └─ Response: 400 Bad Request                      │
│  │   └─ Action: Show error, ask for new code         │
│  │                                                        │
│  ├─→ Network Error                                      │
│  │   └─ Response: Connection timeout                   │
│  │   └─ Action: Retry with backoff, show error      │
│  │                                                        │
│  └─→ Server Error                                       │
│      └─ Response: 500 Server Error                      │
│      └─ Action: Retry later, check status page       │
│                                                            │
│  API REQUEST WITH TOKEN                                 │
│  │                                                        │
│  ├─→ Token Not Stored                                   │
│  │   └─ Condition: isAuthenticated() == false         │
│  │   └─ Action: Redirect to login                    │
│  │                                                        │
│  ├─→ Token Expired                                      │
│  │   └─ Response: 401 Unauthorized                     │
│  │   └─ Action: Clear token, prompt login           │
│  │                                                        │
│  ├─→ Token Invalid                                      │
│  │   └─ Response: 403 Forbidden                       │
│  │   └─ Action: Show error, prompt login            │
│  │                                                        │
│  ├─→ Network Error                                      │
│  │   └─ Response: Connection timeout                   │
│  │   └─ Action: Retry with backoff                  │
│  │                                                        │
│  └─→ Rate Limited                                       │
│      └─ Response: 429 Too Many Requests              │
│      └─ Action: Exponential backoff, retry          │
│                                                            │
│  RECOVERY                                                │
│  │                                                        │
│  ├─ Automatic: Retry logic for transient errors      │
│  ├─ Manual: User can force re-login with button     │
│  ├─ Logging: Log errors but NOT tokens              │
│  └─ UI: Show user-friendly error messages           │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 📈 Sequence Diagram: Complete Flow

```
User            VS Code Ext      LSP Server       Cisco API
 │                 │                 │               │
 │ Click Login     │                 │               │
 ├────────────────>│                 │               │
 │                 │                 │               │
 │ Opens browser   │                 │               │
 │<────────────────┤                 │               │
 │                 │                 │               │
 │ Logs in, gets code (redirected)  │               │
 │ Copies code     │                 │               │
 ├────────────────>│                 │               │
 │                 │ executeCommand  │               │
 │                 │ (cisco.auth.login, code)        │
 │                 ├────────────────>│               │
 │                 │                 │               │
 │                 │                 │ exchange_code │
 │                 │                 ├──────────────>│
 │                 │                 │               │
 │                 │                 │  GET /api/v2/ │
 │                 │                 │  auth/... ?   │
 │                 │                 │  code=...     │
 │                 │                 │               │
 │                 │                 │<──────────────┤
 │                 │                 │               │
 │                 │                 │ 201 Created   │
 │                 │                 │ {token: "..."│
 │                 │                 │  expires: ...│
 │                 │                 │}              │
 │                 │                 │               │
 │                 │ ✓ success       │               │
 │                 │<────────────────┤               │
 │                 │                 │               │
 │ ✓ Logged in     │                 │               │
 │<────────────────┤                 │               │
 │                 │                 │               │
 │ Click List...   │                 │               │
 ├────────────────>│                 │               │
 │                 │ executeCommand  │               │
 │                 │ (cisco.scripts) │               │
 │                 ├────────────────>│               │
 │                 │                 │               │
 │                 │                 │ get("/api/... │
 │                 │                 │   Bearer token│
 │                 ├──────────────────────────────>│
 │                 │                 │               │
 │                 │                 │<──────────────┤
 │                 │                 │               │
 │                 │                 │ 200 OK        │
 │                 │                 │ {...scripts..│
 │                 │                 │}              │
 │                 │ scripts data    │               │
 │                 │<────────────────┤               │
 │                 │                 │               │
 │ Display list    │                 │               │
 │<────────────────┤                 │               │
 │                 │                 │               │
```

---

## 🎯 Implementation Checklist - Visual

```
PHASE 1: SETUP
  ☐ Add reqwest/axios to dependencies
  ☐ Create ciscoAuthClient module
  ☐ Understand API endpoints

PHASE 2: AUTHENTICATION
  ☐ Implement exchange_code_for_token()
  ☐ Parse TokenResponse
  ☐ Handle errors (400, 500)
  ☐ Store token in memory

PHASE 3: PERSISTENCE
  ☐ Save token to VS Code globalState
  ☐ Load token on extension startup
  ☐ Check token expiration
  ☐ Handle expiration (clear + re-login)

PHASE 4: API USAGE
  ☐ Implement get(endpoint) with Bearer token
  ☐ Implement post(endpoint, body) with Bearer token
  ☐ Handle 401 Unauthorized (expired token)
  ☐ Retry logic for transient errors

PHASE 5: INTEGRATION
  ☐ Register LSP commands
  ☐ Add UI buttons/commands
  ☐ Integrate with existing features
  ☐ Test end-to-end

PHASE 6: PRODUCTION
  ☐ Error logging (no tokens!)
  ☐ Security review
  ☐ Load testing
  ☐ Documentation
  ☐ Deploy!
```

---

This visual guide complements the technical documentation. Use this as a reference while implementing!
