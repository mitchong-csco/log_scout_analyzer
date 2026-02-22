"use strict";
// WebView-based authentication for Cisco Scripts
// File: vscode-extension/src/auth/webviewAuth.ts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebViewAuthProvider = void 0;
const vscode = __importStar(require("vscode"));
const axios_1 = __importDefault(require("axios"));
class WebViewAuthProvider {
    constructor(context) {
        this.authResolve = null;
        this.context = context;
    }
    /**
     * Show authentication WebView
     */
    async authenticate() {
        return new Promise((resolve) => {
            this.authResolve = resolve;
            // Dispose any existing panel
            this.panel?.dispose();
            this.panel = vscode.window.createWebviewPanel(WebViewAuthProvider.viewType, 'Cisco Scripts - Login', vscode.ViewColumn.One, {
                enableScripts: true,
                enableCommandUris: true,
                retainContextWhenHidden: false,
                localResourceRoots: [],
            });
            this.panel.webview.html = this.getHtmlContent();
            // Handle messages from WebView
            this.panel.webview.onDidReceiveMessage((message) => {
                this.handleWebViewMessage(message);
            }, undefined, this.context.subscriptions);
            // Handle panel disposal
            this.panel.onDidDispose(() => {
                this.panel = undefined;
                if (this.authResolve) {
                    this.authResolve(null);
                }
            }, undefined, this.context.subscriptions);
            vscode.window.showInformationMessage('Cisco Scripts authentication panel opened');
        });
    }
    /**
     * Handle messages from WebView
     */
    async handleWebViewMessage(message) {
        switch (message.command) {
            case 'exchangeCode':
                await this.handleCodeExchange(message.code);
                break;
            case 'openBrowser':
                await vscode.env.openExternal(vscode.Uri.parse('https://scripts.cisco.com/login'));
                this.panel?.webview.postMessage({
                    command: 'browserOpened',
                    message: 'Login page opened in your browser. Please complete authentication and paste the authorization code above.',
                });
                break;
            case 'ready':
                this.panel?.webview.postMessage({
                    command: 'initialized',
                });
                break;
        }
    }
    /**
     * Exchange authorization code for access token
     */
    async handleCodeExchange(code) {
        try {
            this.panel?.webview.postMessage({
                command: 'loading',
                show: true,
            });
            // Make request to Cisco API
            const response = await axios_1.default.get('https://scripts.cisco.com/api/v2/auth/redirect:path', {
                params: {
                    path: '/app',
                    code: code,
                },
                withCredentials: true,
                validateStatus: (status) => status === 201 || status === 200,
            });
            // Extract cookies from response headers
            const cookies = this.extractCookies(response.headers);
            const result = {
                accessToken: response.data.access_token,
                cookies,
                tokenType: response.data.token_type || 'Bearer',
                expiresIn: response.data.expires_in,
            };
            // Send success message to WebView
            this.panel?.webview.postMessage({
                command: 'success',
                message: 'Authentication successful!',
            });
            // Resolve promise with result
            if (this.authResolve) {
                this.authResolve(result);
            }
            // Dispose panel after short delay
            setTimeout(() => this.panel?.dispose(), 1000);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            // Send error message to WebView
            this.panel?.webview.postMessage({
                command: 'error',
                message: errorMessage,
            });
            // Log error but don't expose token
            console.error('Code exchange failed:', {
                error: errorMessage,
                status: error instanceof axios_1.default.AxiosError ? error.response?.status : undefined,
            });
        }
    }
    /**
     * Extract cookies from response headers
     */
    extractCookies(headers) {
        const cookies = {};
        const setCookieHeader = headers['set-cookie'];
        if (!setCookieHeader) {
            return cookies;
        }
        const cookieArray = Array.isArray(setCookieHeader)
            ? setCookieHeader
            : [setCookieHeader];
        cookieArray.forEach((cookieStr) => {
            // Parse cookie string: "name=value; Path=/; Secure; HttpOnly"
            const parts = cookieStr.split(';');
            const [nameValue] = parts;
            if (nameValue && nameValue.includes('=')) {
                const [name, value] = nameValue.split('=').map((s) => s.trim());
                if (name && value) {
                    cookies[name] = value;
                }
            }
        });
        return cookies;
    }
    /**
     * Generate HTML content for WebView
     */
    getHtmlContent() {
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

        :root {
            --primary: #667eea;
            --primary-dark: #764ba2;
            --success: #10b981;
            --error: #ef4444;
            --text-primary: #1f2937;
            --text-secondary: #6b7280;
            --bg-light: #f9fafb;
            --border-color: #e5e7eb;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif;
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            color: var(--text-primary);
        }

        .container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            padding: 40px;
            max-width: 450px;
            width: 100%;
        }

        .header {
            text-align: center;
            margin-bottom: 30px;
        }

        .header-icon {
            font-size: 48px;
            margin-bottom: 12px;
        }

        .header h1 {
            font-size: 28px;
            color: var(--text-primary);
            margin-bottom: 5px;
        }

        .header p {
            color: var(--text-secondary);
            font-size: 14px;
        }

        .content {
            display: none;
        }

        .content.active {
            display: block;
        }

        .section {
            margin-bottom: 20px;
        }

        .section-title {
            font-size: 14px;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .info-box {
            background: #eff6ff;
            border-left: 4px solid #3b82f6;
            padding: 12px;
            border-radius: 4px;
            font-size: 13px;
            color: #1e40af;
            line-height: 1.5;
            margin-bottom: 15px;
        }

        .form-group {
            margin-bottom: 16px;
        }

        label {
            display: block;
            margin-bottom: 6px;
            font-size: 13px;
            font-weight: 500;
            color: var(--text-primary);
        }

        input[type="text"],
        input[type="password"],
        textarea {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid var(--border-color);
            border-radius: 6px;
            font-size: 14px;
            font-family: inherit;
            transition: all 0.2s;
            background: var(--bg-light);
        }

        input[type="text"]:focus,
        input[type="password"]:focus,
        textarea:focus {
            outline: none;
            border-color: var(--primary);
            background: white;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        textarea {
            resize: vertical;
            min-height: 80px;
        }

        .button-group {
            display: flex;
            gap: 10px;
            margin-top: 24px;
        }

        button {
            flex: 1;
            padding: 11px 16px;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .btn-primary {
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
            color: white;
        }

        .btn-primary:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
        }

        .btn-primary:active {
            transform: translateY(0);
        }

        .btn-primary:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .btn-secondary {
            background: var(--bg-light);
            color: var(--text-primary);
            border: 1px solid var(--border-color);
        }

        .btn-secondary:hover:not(:disabled) {
            background: #f3f4f6;
            border-color: var(--text-secondary);
        }

        .error {
            background: #fee2e2;
            border-left: 4px solid #dc2626;
            color: #991b1b;
            padding: 12px;
            border-radius: 4px;
            font-size: 13px;
            margin: 16px 0;
            display: none;
            line-height: 1.5;
        }

        .error.show {
            display: block;
        }

        .success {
            background: #dcfce7;
            border-left: 4px solid #16a34a;
            color: #15803d;
            padding: 12px;
            border-radius: 4px;
            font-size: 13px;
            margin: 16px 0;
            display: none;
            line-height: 1.5;
        }

        .success.show {
            display: block;
        }

        .loading {
            text-align: center;
            padding: 40px 20px;
            display: none;
        }

        .loading.show {
            display: block;
        }

        .spinner {
            border: 3px solid rgba(102, 126, 234, 0.1);
            border-top: 3px solid var(--primary);
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 16px;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .loading-text {
            color: var(--text-secondary);
            font-size: 14px;
        }

        .divider {
            text-align: center;
            margin: 24px 0;
            position: relative;
        }

        .divider::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 0;
            right: 0;
            height: 1px;
            background: var(--border-color);
        }

        .divider-text {
            position: relative;
            display: inline-block;
            background: white;
            padding: 0 12px;
            color: var(--text-secondary);
            font-size: 13px;
        }

        .code-input-wrapper {
            position: relative;
        }

        .code-input-wrapper textarea {
            font-family: 'Monaco', 'Courier New', monospace;
            font-size: 12px;
        }

        .char-count {
            font-size: 12px;
            color: var(--text-secondary);
            margin-top: 4px;
            text-align: right;
        }

        .status {
            padding: 10px;
            border-radius: 6px;
            font-size: 13px;
            margin-bottom: 16px;
            text-align: center;
        }

        .status.info {
            background: #eff6ff;
            color: #1e40af;
        }

        .status.success {
            background: #dcfce7;
            color: #15803d;
        }

        .status.error {
            background: #fee2e2;
            color: #991b1b;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <div class="header-icon">🔐</div>
            <h1>Cisco Scripts</h1>
            <p>Authentication</p>
        </div>

        <!-- Initial Content -->
        <div class="content active" id="initialContent">
            <div class="info-box">
                <strong>How it works:</strong> Click the button below to open the login page in your browser. After authentication, paste the authorization code here.
            </div>

            <div class="form-group">
                <button class="btn-primary" onclick="openBrowser()" style="width: 100%;">
                    🌐 Open Login in Browser
                </button>
            </div>

            <div class="divider">
                <span class="divider-text">OR</span>
            </div>

            <div class="form-group">
                <label for="authCode">Paste Authorization Code</label>
                <div class="code-input-wrapper">
                    <textarea
                        id="authCode"
                        placeholder="Paste your authorization code from the browser callback URL..."
                        onpaste="handlePaste()"
                        onchange="updateCharCount()"
                        oninput="updateCharCount()"
                    ></textarea>
                    <div class="char-count">
                        <span id="charCount">0</span> characters
                    </div>
                </div>
            </div>

            <div class="error" id="codeError"></div>
            <div class="success" id="codeSuccess"></div>

            <div class="button-group">
                <button class="btn-primary" onclick="submitAuthCode()" id="submitBtn">
                    ✓ Authenticate
                </button>
            </div>
        </div>

        <!-- Loading Content -->
        <div class="content" id="loadingContent">
            <div class="loading show">
                <div class="spinner"></div>
                <p class="loading-text">Authenticating with Cisco...</p>
            </div>
        </div>

        <!-- Success Content -->
        <div class="content" id="successContent">
            <div class="status success">
                ✓ Authentication Successful!
            </div>
            <p style="text-align: center; color: var(--text-secondary); font-size: 14px; line-height: 1.6;">
                Your credentials have been verified and stored securely. You can now close this window.
            </p>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const state = {
            isLoading: false,
            isSubmitting: false
        };

        function openBrowser() {
            vscode.postMessage({
                command: 'openBrowser',
                url: 'https://scripts.cisco.com/login'
            });

            showStatus('browserOpened', 'Login page opened in your browser');
        }

        function handlePaste() {
            setTimeout(() => {
                const code = document.getElementById('authCode').value.trim();
                if (code.length > 0) {
                    document.getElementById('codeError').classList.remove('show');
                }
            }, 0);
        }

        function updateCharCount() {
            const code = document.getElementById('authCode').value;
            document.getElementById('charCount').textContent = code.length;
        }

        async function submitAuthCode() {
            const code = document.getElementById('authCode').value.trim();
            const submitBtn = document.getElementById('submitBtn');

            // Clear previous messages
            document.getElementById('codeError').classList.remove('show');
            document.getElementById('codeSuccess').classList.remove('show');

            // Validate
            if (!code) {
                showError('codeError', 'Please enter an authorization code');
                return;
            }

            if (code.length < 10) {
                showError('codeError', 'Authorization code appears to be invalid (too short)');
                return;
            }

            // Disable button and show loading
            submitBtn.disabled = true;
            state.isSubmitting = true;
            showLoading(true);

            try {
                // Send code to extension for processing
                vscode.postMessage({
                    command: 'exchangeCode',
                    code: code
                });

                // The extension will respond with 'success' or 'error' message
            } catch (error) {
                showError('codeError', error.message || 'Authentication failed');
                submitBtn.disabled = false;
                state.isSubmitting = false;
                showLoading(false);
            }
        }

        function showError(elementId, message) {
            const element = document.getElementById(elementId);
            element.textContent = '❌ ' + message;
            element.classList.add('show');
        }

        function showSuccess(elementId, message) {
            const element = document.getElementById(elementId);
            element.textContent = '✓ ' + message;
            element.classList.add('show');
        }

        function showStatus(type, message) {
            if (type === 'browserOpened') {
                showSuccess('codeSuccess', 'Waiting for you to authenticate in the browser. Once done, paste the code above.');
            }
        }

        function showLoading(show) {
            const loadingContent = document.getElementById('loadingContent');
            const initialContent = document.getElementById('initialContent');

            if (show) {
                loadingContent.classList.add('active');
                initialContent.classList.remove('active');
            } else {
                loadingContent.classList.remove('active');
                initialContent.classList.add('active');
            }
        }

        function showSuccessScreen() {
            const successContent = document.getElementById('successContent');
            const initialContent = document.getElementById('initialContent');

            successContent.classList.add('active');
            initialContent.classList.remove('active');
        }

        // Listen for messages from extension
        window.addEventListener('message', (event) => {
            const message = event.data;

            switch (message.command) {
                case 'initialized':
                    console.log('WebView initialized');
                    break;

                case 'browserOpened':
                    showSuccess('codeSuccess', message.message || 'Browser opened. Complete login and paste code.');
                    break;

                case 'success':
                    showSuccess('codeSuccess', message.message || 'Authentication successful!');
                    setTimeout(showSuccessScreen, 500);
                    break;

                case 'error':
                    document.getElementById('submitBtn').disabled = false;
                    state.isSubmitting = false;
                    showLoading(false);
                    showError('codeError', message.message || 'Authentication failed');
                    break;

                case 'loading':
                    if (message.show) {
                        showLoading(true);
                    } else {
                        showLoading(false);
                    }
                    break;
            }
        });

        // Notify extension that WebView is ready
        vscode.postMessage({ command: 'ready' });
    </script>
</body>
</html>
    `;
    }
}
exports.WebViewAuthProvider = WebViewAuthProvider;
WebViewAuthProvider.viewType = 'ciscoAuth.webview';
//# sourceMappingURL=webviewAuth.js.map