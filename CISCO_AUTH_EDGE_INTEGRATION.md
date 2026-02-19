# MS Edge Browser Integration for Cookie-Based Authentication

## Overview

You can integrate MS Edge browser authentication with your VS Code extension and extract the `bdb_cookie` in multiple ways. Here are the best approaches.

---

## 🎯 Approach Comparison

| Approach | Pros | Cons | Best For |
|----------|------|------|----------|
| **Embedded WebView** | Full control, no external browser | Limited HTML5 features | Desktop/embedded auth |
| **System Browser + Callback** | Native experience, user control | Need callback server | Native browser experience |
| **Puppeteer/Playwright** | Automate Edge, get cookies | Headless only, complex | Automation/testing |
| **Cookie Extraction File** | Direct access if admin | Security risks, file access | Advanced scenarios |

---

## ✅ Recommended: Embedded WebView Approach

This is the cleanest and most secure approach. The extension controls the authentication flow entirely within VS Code.

### Step 1: Create a WebView-Based Login

Create file: `vscode-extension/src/auth/webviewAuth.ts`

```typescript
import * as vscode from 'vscode';
import * as http from 'http';
import * as url from 'url';

export class WebViewAuthProvider {
  private static readonly viewType = 'ciscoAuth.webview';
  private panel: vscode.WebviewPanel | undefined;
  private redirectServer: http.Server | undefined;
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  /**
   * Show login in embedded WebView
   */
  async showLoginWebView(): Promise<{
    accessToken: string;
    cookies: Record<string, string>;
  } | null> {
    return new Promise((resolve) => {
      this.panel = vscode.window.createWebviewPanel(
        WebViewAuthProvider.viewType,
        'Cisco Scripts Login',
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
        }
      );

      // Listen for messages from webview
      this.panel.webview.onDidReceiveMessage((message) => {
        if (message.command === 'authenticated') {
          resolve({
            accessToken: message.accessToken,
            cookies: message.cookies,
          });
          this.panel?.dispose();
        } else if (message.command === 'error') {
          vscode.window.showErrorMessage(message.error);
          resolve(null);
          this.panel?.dispose();
        }
      });

      this.panel.webview.html = this.getWebViewContent();

      this.panel.onDidDispose(
        () => {
          this.panel = undefined;
          resolve(null);
        },
        undefined,
        this.context.subscriptions
      );
    });
  }

  /**
   * Generate WebView HTML with authentication form
   */
  private getWebViewContent(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cisco Scripts Authentication</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            padding: 40px;
            max-width: 400px;
            width: 100%;
        }

        .logo {
            text-align: center;
            margin-bottom: 30px;
        }

        .logo h1 {
            color: #333;
            font-size: 24px;
            margin-bottom: 10px;
        }

        .logo p {
            color: #666;
            font-size: 14px;
        }

        .form-group {
            margin-bottom: 20px;
        }

        label {
            display: block;
            margin-bottom: 8px;
            color: #333;
            font-weight: 500;
            font-size: 14px;
        }

        input[type="text"],
        input[type="password"] {
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 14px;
            transition: border-color 0.3s;
        }

        input[type="text"]:focus,
        input[type="password"]:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .button-group {
            display: flex;
            gap: 10px;
            margin-top: 30px;
        }

        button {
            flex: 1;
            padding: 12px;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
        }

        .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }

        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
        }

        .btn-secondary {
            background: #f0f0f0;
            color: #333;
        }

        .btn-secondary:hover {
            background: #e0e0e0;
        }

        .error {
            color: #dc3545;
            font-size: 13px;
            margin-top: 5px;
            display: none;
        }

        .loading {
            display: none;
            text-align: center;
            padding: 20px;
        }

        .spinner {
            border: 3px solid #f3f3f3;
            border-top: 3px solid #667eea;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 10px;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .info {
            background: #e7f3ff;
            border-left: 4px solid #2196F3;
            padding: 12px;
            border-radius: 4px;
            margin-bottom: 20px;
            font-size: 13px;
            color: #0c5aa0;
        }

        .oauth-flow {
            display: none;
        }

        .oauth-flow.active {
            display: block;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            <h1>🔐 Cisco Scripts</h1>
            <p>Authentication</p>
        </div>

        <!-- OAuth Flow Instructions -->
        <div class="oauth-flow active" id="oauthFlow">
            <div class="info">
                <strong>OAuth2 Flow:</strong> Click "Login with Cisco" to open the authentication page in your browser.
            </div>
            <button class="btn-primary" onclick="startOAuthFlow()" style="width: 100%;">
                🌐 Login with Cisco
            </button>
            <p style="text-align: center; margin-top: 20px; color: #666; font-size: 13px;">
                Or paste authorization code below:
            </p>
            <div class="form-group">
                <input type="text" id="authCode" placeholder="Paste authorization code here" />
                <div class="error" id="codeError"></div>
            </div>
            <button class="btn-primary" onclick="submitAuthCode()" style="width: 100%;">
                Continue with Code
            </button>
        </div>

        <!-- Loading State -->
        <div class="loading" id="loadingState">
            <div class="spinner"></div>
            <p>Authenticating...</p>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function startOAuthFlow() {
            vscode.postMessage({
                command: 'openBrowser',
                url: 'https://scripts.cisco.com/login'
            });
        }

        async function submitAuthCode() {
            const code = document.getElementById('authCode').value.trim();
            if (!code) {
                showError('codeError', 'Please enter an authorization code');
                return;
            }

            showLoading(true);

            try {
                const response = await fetch('https://scripts.cisco.com/api/v2/auth/redirect:path', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                // This won't work from WebView due to CORS
                // Instead, send to extension to handle
                vscode.postMessage({
                    command: 'exchangeCode',
                    code: code
                });
            } catch (error) {
                showError('codeError', error.message);
                showLoading(false);
            }
        }

        function showError(elementId, message) {
            const element = document.getElementById(elementId);
            element.textContent = message;
            element.style.display = 'block';
        }

        function showLoading(show) {
            document.getElementById('loadingState').style.display = show ? 'block' : 'none';
            document.getElementById('oauthFlow').style.display = show ? 'none' : 'block';
        }

        // Listen for messages from extension
        window.addEventListener('message', async (event) => {
            const message = event.data;

            if (message.command === 'codexchangeResult') {
                if (message.success) {
                    vscode.postMessage({
                        command: 'authenticated',
                        accessToken: message.accessToken,
                        cookies: message.cookies
                    });
                } else {
                    showError('codeError', message.error || 'Authentication failed');
                    showLoading(false);
                }
            }
        });
    </script>
</body>
</html>
    `;
  }
}
```

### Step 2: Update CiscoAuthClient for WebView Integration

Update: `vscode-extension/src/auth/ciscoAuthClient.ts`

Add this method to the CiscoAuthClient class:

```typescript
/**
 * Handle authentication from WebView
 */
async authenticateFromWebView(): Promise<void> {
  const authProvider = new WebViewAuthProvider(this.context);
  
  const result = await authProvider.showLoginWebView();
  if (result) {
    this.accessToken = result.accessToken;
    
    // Store cookies if present
    if (result.cookies && result.cookies.bdb_cookie) {
      *this.bdb_cookie.lock().await = Some(result.cookies.bdb_cookie);
    }

    // Save to globalState
    this.saveToken(result.accessToken);
  }
}
```

---

## 🌐 Approach 2: System Browser with Callback Server

If you want users to use their native Edge browser:

Create file: `vscode-extension/src/auth/systemBrowserAuth.ts`

```typescript
import * as vscode from 'vscode';
import * as http from 'http';
import * as url from 'url';
import * as querystring from 'querystring';
import axios from 'axios';

export class SystemBrowserAuth {
  private localCallbackPort = 5678;
  private localCallbackHost = 'localhost';
  private callbackPromise: Promise<string> | null = null;
  private callbackResolve: ((code: string) => void) | null = null;

  /**
   * Start authentication flow using system browser
   */
  async authenticate(): Promise<{ accessToken: string; cookies: any } | null> {
    try {
      // 1. Start local callback server
      const server = await this.startCallbackServer();

      // 2. Generate authorization URL
      const authUrl = new URL('https://scripts.cisco.com/login');
      authUrl.searchParams.append('redirect_uri', 
        `http://${this.localCallbackHost}:${this.localCallbackPort}/callback`
      );
      authUrl.searchParams.append('response_type', 'code');

      // 3. Open in default browser (Edge if set as default)
      await vscode.env.openExternal(vscode.Uri.parse(authUrl.toString()));

      vscode.window.showInformationMessage(
        'Opening Cisco login in your browser. Please authenticate.'
      );

      // 4. Wait for callback
      const code = await this.waitForCallback();

      // 5. Clean up server
      server.close();

      // 6. Exchange code for token
      const { accessToken, cookies } = await this.exchangeCodeForToken(code);

      return { accessToken, cookies };
    } catch (error) {
      vscode.window.showErrorMessage(
        `Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return null;
    }
  }

  /**
   * Start local HTTP server to receive OAuth callback
   */
  private startCallbackServer(): Promise<http.Server> {
    return new Promise((resolve, reject) => {
      const server = http.createServer((req, res) => {
        if (req.url?.startsWith('/callback')) {
          const parsedUrl = url.parse(req.url, true);
          const code = parsedUrl.query.code as string;
          const error = parsedUrl.query.error as string;

          if (error) {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end(`<h1>Authentication Error</h1><p>${error}</p>`);
            if (this.callbackResolve) {
              this.callbackResolve('');
            }
          } else if (code) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
<html>
  <head>
    <title>Authentication Successful</title>
    <style>
      body { font-family: sans-serif; text-align: center; padding: 50px; }
      .success { color: green; font-size: 24px; }
    </style>
  </head>
  <body>
    <div class="success">✓ Authentication Successful!</div>
    <p>You can close this window and return to VS Code.</p>
  </body>
</html>
            `);
            if (this.callbackResolve) {
              this.callbackResolve(code);
            }
          }
        }
      });

      server.listen(this.localCallbackPort, this.localCallbackHost, () => {
        resolve(server);
      });

      server.on('error', reject);
    });
  }

  /**
   * Wait for OAuth callback with authorization code
   */
  private waitForCallback(): Promise<string> {
    return new Promise((resolve) => {
      this.callbackResolve = resolve;
      this.callbackPromise = new Promise((res) => {
        // 60-second timeout
        setTimeout(() => res(''), 60000);
      });
    });
  }

  /**
   * Exchange authorization code for access token
   */
  private async exchangeCodeForToken(
    code: string
  ): Promise<{ accessToken: string; cookies: any }> {
    const response = await axios.get(
      'https://scripts.cisco.com/api/v2/auth/redirect:path',
      {
        params: {
          path: '/app',
          code: code,
        },
        withCredentials: true, // Important for cookies
      }
    );

    // Extract cookies from response headers
    const cookieHeader = response.headers['set-cookie'];
    const cookies: Record<string, string> = {};

    if (cookieHeader) {
      const cookieArray = Array.isArray(cookieHeader)
        ? cookieHeader
        : [cookieHeader];

      cookieArray.forEach((cookie) => {
        const [nameValue] = cookie.split(';');
        const [name, value] = nameValue.split('=');
        cookies[name.trim()] = value.trim();
      });
    }

    return {
      accessToken: response.data.access_token,
      cookies,
    };
  }
}
```

---

## 🤖 Approach 3: Puppeteer/Playwright (Automation)

For automated testing or when you need full control:

```typescript
import puppeteer from 'puppeteer';

export class AutomatedBrowserAuth {
  /**
   * Use Puppeteer to automate Edge browser and extract cookies
   */
  async authenticateWithPuppeteer(
    username: string,
    password: string
  ): Promise<{ accessToken: string; bdb_cookie: string } | null> {
    let browser;
    try {
      // Launch Edge browser
      browser = await puppeteer.launch({
        headless: false, // Show browser window
        executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', // Windows path
        args: ['--no-sandbox'],
      });

      const page = await browser.newPage();

      // Set viewport
      await page.setViewport({ width: 1280, height: 720 });

      // Navigate to login
      await page.goto('https://scripts.cisco.com/login', {
        waitUntil: 'networkidle2',
      });

      // Fill in credentials
      await page.type('input[name="username"]', username);
      await page.type('input[name="password"]', password);
      await page.click('button[type="submit"]');

      // Wait for navigation to complete
      await page.waitForNavigation({ waitUntil: 'networkidle2' });

      // Get cookies
      const cookies = await page.cookies();
      const bdbCookie = cookies.find((c) => c.name === 'bdb_cookie');

      // Get access token (if stored in localStorage)
      const accessToken = await page.evaluate(() => {
        return localStorage.getItem('access_token');
      });

      if (bdbCookie && accessToken) {
        return {
          accessToken,
          bdb_cookie: bdbCookie.value,
        };
      }

      return null;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}
```

Add to `package.json`:
```json
{
  "dependencies": {
    "puppeteer": "^21.0.0"
  }
}
```

---

## 💾 Using Extracted Cookies

Once you have the `bdb_cookie`:

```typescript
// Store the cookie
private bdbCookie: string = '';

// Use in requests
async makeAuthenticatedRequest(endpoint: string) {
  const response = await axios.get(endpoint, {
    headers: {
      'Cookie': `bdb_cookie=${this.bdbCookie}`,
      'Authorization': `Bearer ${this.accessToken}`
    }
  });
  return response.data;
}
```

---

## 🔐 Security Considerations

### Do's ✅
- ✅ Use VS Code's secure storage for cookies
- ✅ Encrypt cookie values
- ✅ Use HTTPS only
- ✅ Clear cookies on logout
- ✅ Set expiration timers

### Don'ts ❌
- ❌ Don't log cookies
- ❌ Don't store in plain text config files
- ❌ Don't expose in error messages
- ❌ Don't send cookies unnecessarily

### Secure Storage Pattern

```typescript
// Store securely
await context.secrets.store('bdb_cookie', cookieValue);

// Retrieve securely
const cookie = await context.secrets.get('bdb_cookie');

// Clear on logout
await context.secrets.delete('bdb_cookie');
```

---

## 🎯 Recommendation

For your use case, I recommend:

1. **Primary**: Use **Embedded WebView** approach
   - Pros: Most secure, full control, no external dependencies
   - Cons: Limited to VS Code environment
   
2. **Alternative**: Use **System Browser with Callback**
   - Pros: Native browser experience
   - Cons: Requires localhost callback server

3. **Automation Only**: Use **Puppeteer** approach
   - Pros: Full control, automated testing
   - Cons: Requires headless browser installation

---

## 📋 Quick Implementation Checklist

- [ ] Choose authentication approach
- [ ] Implement WebView or Callback handler
- [ ] Add secure cookie storage
- [ ] Update CiscoAuthClient to use cookies
- [ ] Test with real Cisco credentials
- [ ] Verify cookies work in API calls
- [ ] Add logout to clear cookies
- [ ] Security review

---

## 🧪 Testing

```typescript
// Test cookie extraction
const auth = new WebViewAuthProvider(context);
const result = await auth.showLoginWebView();

if (result?.cookies.bdb_cookie) {
  console.log('✓ Cookie extracted successfully');
}
```

---

This gives you full flexibility to choose the approach that works best for your extension architecture!
