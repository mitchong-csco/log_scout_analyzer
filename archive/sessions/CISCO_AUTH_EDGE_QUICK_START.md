# MS Edge Integration Quick Start Guide

## ✅ Summary: What You Can Do

Yes! You can:
1. ✅ Open MS Edge (or any browser) directly from the extension
2. ✅ Extract cookies (including `bdb_cookie`) from authentication responses
3. ✅ Use those cookies in subsequent API requests
4. ✅ Store cookies securely in VS Code's secret storage
5. ✅ Use both Bearer tokens AND cookies together for maximum compatibility

---

## 🚀 Three Implementation Approaches

### Approach 1: Embedded WebView (Recommended) ✨

**What it does:**
- Opens a login form inside VS Code
- User logs in without leaving the editor
- Automatically captures tokens and cookies
- Most secure (no external browser windows)

**Files provided:**
- `vscode-extension/src/auth/webviewAuth.ts` (Complete implementation)
- Updated `ciscoAuthClient.ts` with `loginWithWebView()` method

**How to use:**
```typescript
const authClient = new CiscoAuthClient({}, context);

// Open WebView and authenticate
await authClient.loginWithWebView();

// Get the bdb_cookie
const cookie = await authClient.getBdbCookie();

// Make requests with both token and cookie
const data = await authClient.getWithCookies('/api/v2/scripts');
```

**Pros:**
- ✅ No external windows
- ✅ Full control over UI
- ✅ Secure (encrypted storage)
- ✅ Offline capable
- ✅ Beautiful UI included

**Cons:**
- ⚠️ Limited to VS Code environment
- ⚠️ Can't use native browser features

---

### Approach 2: Open System Browser (MS Edge) 

**What it does:**
- Opens native MS Edge browser
- User logs in naturally
- Captures authorization code from callback
- Exchanges code for token + cookies

**Files provided:**
- `CISCO_AUTH_EDGE_INTEGRATION.md` has full implementation
- `SystemBrowserAuth` class (ready to use)

**How to use:**
```typescript
import { SystemBrowserAuth } from './auth/systemBrowserAuth';

const systemAuth = new SystemBrowserAuth();
const result = await systemAuth.authenticate();

if (result) {
  console.log('Token:', result.accessToken);
  console.log('Cookie:', result.cookies.bdb_cookie);
}
```

**Pros:**
- ✅ Native browser experience
- ✅ User's favorite browser
- ✅ Full browser features
- ✅ More familiar to users

**Cons:**
- ⚠️ Requires callback server on localhost
- ⚠️ More complex setup
- ⚠️ External window

---

### Approach 3: Automated Browser (Puppeteer)

**What it does:**
- Automates browser login using Puppeteer/Playwright
- Captures cookies directly from browser
- No user interaction needed
- Great for testing/automation

**Files provided:**
- `CISCO_AUTH_EDGE_INTEGRATION.md` has `AutomatedBrowserAuth` class

**How to use:**
```typescript
const automatedAuth = new AutomatedBrowserAuth();
const result = await automatedAuth.authenticateWithPuppeteer(
  'username@cisco.com',
  'password'
);

console.log('bdb_cookie:', result.bdb_cookie);
```

**Pros:**
- ✅ Fully automated
- ✅ Great for testing
- ✅ Programmatic control
- ✅ Browser agnostic

**Cons:**
- ⚠️ Requires Puppeteer/Playwright
- ⚠️ Slower
- ⚠️ Browser must be installed
- ⚠️ Not for interactive use

---

## 📋 Quick Integration Steps

### Step 1: Choose Your Approach

```
🎯 Most users?          → Embedded WebView (Approach 1)
🎯 Power users?         → System Browser (Approach 2)
🎯 Testing/Automation?  → Puppeteer (Approach 3)
```

### Step 2: Copy Files

For **Embedded WebView** (recommended):
```bash
# Already provided:
# ✓ vscode-extension/src/auth/webviewAuth.ts
# ✓ Updated ciscoAuthClient.ts with WebView methods
```

For **System Browser**:
```bash
# Create from CISCO_AUTH_EDGE_INTEGRATION.md
cp CISCO_AUTH_EDGE_INTEGRATION.md systemBrowserAuth.ts
```

For **Puppeteer**:
```bash
npm install puppeteer
# Copy class from CISCO_AUTH_EDGE_INTEGRATION.md
```

### Step 3: Update Extension Commands

In your `extension.ts`:

```typescript
import { CiscoAuthClient } from './auth/ciscoAuthClient';

export async function activate(context: vscode.ExtensionContext) {
  const authClient = new CiscoAuthClient({}, context);

  // Register login command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'logScout.cisco.loginWebView',
      async () => {
        try {
          await authClient.loginWithWebView();
        } catch (error) {
          vscode.window.showErrorMessage(
            `Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
    )
  );

  // Register logout command
  context.subscriptions.push(
    vscode.commands.registerCommand('logScout.cisco.logout', async () => {
      await authClient.logoutAndClearCookies();
    })
  );

  // Register fetch scripts command (uses both token and cookie)
  context.subscriptions.push(
    vscode.commands.registerCommand('logScout.cisco.scripts.list', async () => {
      if (!authClient.isAuthenticated()) {
        vscode.window.showWarningMessage('Please log in first');
        await vscode.commands.executeCommand('logScout.cisco.loginWebView');
        return;
      }

      try {
        const scripts = await authClient.getWithCookies('/api/v2/scripts');
        vscode.window.showInformationMessage(
          `Found ${scripts.length} scripts`
        );
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to fetch scripts: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    })
  );
}
```

### Step 4: Update package.json

Add to contribution points:

```json
{
  "contributes": {
    "commands": [
      {
        "command": "logScout.cisco.loginWebView",
        "title": "Cisco Scripts: Login (WebView)",
        "category": "Log Scout"
      },
      {
        "command": "logScout.cisco.logout",
        "title": "Cisco Scripts: Logout",
        "category": "Log Scout"
      },
      {
        "command": "logScout.cisco.scripts.list",
        "title": "Cisco Scripts: List Scripts",
        "category": "Log Scout"
      }
    ]
  }
}
```

### Step 5: Test It

1. Open VS Code
2. Open Command Palette (Ctrl+Shift+P)
3. Run "Log Scout: Login (WebView)"
4. WebView opens with login form
5. Click "Open Login in Browser" or paste code
6. Authenticate
7. Extension stores token + cookie
8. Ready to use! ✓

---

## 🔐 Cookie & Token Management

### Storing Cookies Securely

```typescript
// Store in VS Code secret storage (encrypted)
await context.secrets.store('cisco.bdb_cookie', cookieValue);

// Retrieve securely
const cookie = await context.secrets.get('cisco.bdb_cookie');

// Delete on logout
await context.secrets.delete('cisco.bdb_cookie');
```

### Using Both Token and Cookie

```typescript
// Some APIs prefer Bearer token
const data1 = await client.get('/api/v2/scripts');

// Others prefer cookies
const data2 = await client.getWithCookies('/api/v2/templates');

// Some need both
const headers = {
  'Authorization': `Bearer ${token}`,
  'Cookie': `bdb_cookie=${cookie}`
};
const data3 = await axios.get(url, { headers });
```

---

## 📊 Comparison Table

| Feature | WebView | Browser | Puppeteer |
|---------|---------|---------|-----------|
| **Setup Complexity** | Easy | Medium | Hard |
| **User Experience** | Excellent | Good | N/A |
| **Security** | Highest | High | Medium |
| **Automation** | No | Limited | Yes |
| **Browser Control** | Limited | Full | Full |
| **Dependencies** | None | None | Puppeteer |
| **Offline** | Works | No | No |
| **Cookie Support** | ✅ | ✅ | ✅ |
| **Token Support** | ✅ | ✅ | ✅ |

---

## 🎯 Recommended Setup

```
┌─────────────────────────────────────────┐
│     VS Code Extension                   │
│                                          │
│  ┌──────────────────────────────────┐  │
│  │  Login Command                   │  │
│  └──────────────────────────────────┘  │
│               │                         │
│               ↓                         │
│  ┌──────────────────────────────────┐  │
│  │  WebViewAuthProvider             │  │
│  │  ├─ loginWithWebView()           │  │
│  │  └─ Extract token + cookies      │  │
│  └──────────────────────────────────┘  │
│               │                         │
│               ↓                         │
│  ┌──────────────────────────────────┐  │
│  │  CiscoAuthClient                 │  │
│  │  ├─ Store token in memory        │  │
│  │  ├─ Store cookie in secrets      │  │
│  │  ├─ Make API calls with both     │  │
│  │  └─ Handle expiration            │  │
│  └──────────────────────────────────┘  │
│               │                         │
│               ↓                         │
│  ┌──────────────────────────────────┐  │
│  │  Cisco Scripts API                │  │
│  │  ✓ Authenticated                 │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

---

## 🧪 Testing the Implementation

### Test WebView Authentication

```typescript
// Test that WebView opens
async function testWebViewAuth() {
  const client = new CiscoAuthClient({}, context);
  
  try {
    await client.loginWithWebView();
    console.log('✓ WebView opened successfully');
    
    const token = client.getAccessToken();
    console.log('✓ Token stored:', !!token);
    
    const cookie = await client.getBdbCookie();
    console.log('✓ Cookie stored:', !!cookie);
    
  } catch (error) {
    console.error('✗ Test failed:', error);
  }
}
```

### Test Cookie in Requests

```typescript
async function testCookieRequest() {
  const client = new CiscoAuthClient({}, context);
  
  try {
    const scripts = await client.getWithCookies('/api/v2/scripts');
    console.log('✓ Cookie-based request successful');
    console.log('✓ Retrieved', scripts.length, 'scripts');
    
  } catch (error) {
    console.error('✗ Request failed:', error);
  }
}
```

---

## 📝 Summary of What's Provided

### Files Created:
1. ✅ `vscode-extension/src/auth/webviewAuth.ts` - Complete WebView implementation
2. ✅ Updated `ciscoAuthClient.ts` - New methods for WebView + cookies
3. ✅ `CISCO_AUTH_EDGE_INTEGRATION.md` - All 3 approaches documented
4. ✅ This guide - Quick integration steps

### What You Get:
- ✅ Beautiful embedded login UI
- ✅ Token + Cookie extraction
- ✅ Secure cookie storage
- ✅ Cookie-based API requests
- ✅ Bearer token requests
- ✅ Combined token + cookie requests
- ✅ Automatic expiration handling
- ✅ Clean logout with cookie clearing

---

## ❓ FAQ

**Q: Can I use MS Edge specifically?**
A: Yes! With Approach 2 (System Browser), Edge will open if it's your default browser. Or use Puppeteer to launch Edge explicitly.

**Q: Are cookies encrypted?**
A: Yes! VS Code's `context.secrets` API encrypts them using the OS keyring.

**Q: Do I need both token AND cookie?**
A: Usually one or the other. The WebView approach provides both for maximum flexibility.

**Q: What if the cookie expires?**
A: Re-authenticate. The WebView will open again and get a fresh cookie.

**Q: Can I use this in the LSP server?**
A: The LSP server can use the token passed from the extension. See `CISCO_AUTH_LSP_INTEGRATION.rs`.

**Q: How do I test this?**
A: Get real Cisco credentials and test with actual login flow.

---

## ✨ Next Steps

1. ✅ Choose your approach (WebView recommended)
2. ✅ Copy the provided files
3. ✅ Follow integration steps above
4. ✅ Test with real credentials
5. ✅ Deploy! 🚀

---

**Ready to implement?** Start with the WebView approach - it's the most straightforward!
