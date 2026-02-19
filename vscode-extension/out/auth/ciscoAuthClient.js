"use strict";
// TypeScript Implementation for VS Code Extension
// File: vscode-extension/src/auth/ciscoAuthClient.ts
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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CiscoAuthClient = void 0;
exports.registerAuthCommands = registerAuthCommands;
const axios_1 = __importStar(require("axios"));
const vscode = __importStar(require("vscode"));
const webviewAuth_1 = require("./webviewAuth");
class CiscoAuthClient {
    constructor(config = {}, context) {
        this.accessToken = null;
        this.bdbCookie = null;
        this.tokenExpiration = null;
        this.baseUrl = config.baseUrl || "https://scripts.cisco.com";
        this.context = context;
        // Create axios instance with proper defaults
        this.httpClient = axios_1.default.create({
            baseURL: this.baseUrl,
            timeout: 10000,
            withCredentials: true, // Important for cookies
            headers: {
                "User-Agent": "LogScoutAnalyzer/1.0",
            },
        });
        // Load stored token from workspace state
        this.loadStoredToken();
        // Add response interceptor for cookie handling
        this.httpClient.interceptors.response.use((response) => {
            // Extract and store bdb_cookie from Set-Cookie header
            const setCookie = response.headers["set-cookie"];
            if (setCookie) {
                this.bdbCookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
            }
            return response;
        }, (error) => Promise.reject(error));
    }
    /**
     * Load stored token from VS Code workspace state
     */
    loadStoredToken() {
        const stored = this.context.globalState.get("cisco.auth.token");
        if (stored) {
            this.accessToken = stored.token;
            this.tokenExpiration = new Date(stored.expiration);
            // Check if token is still valid
            if (this.tokenExpiration && this.tokenExpiration <= new Date()) {
                vscode.window.showWarningMessage("Cisco authentication token has expired. Please log in again.");
                this.accessToken = null;
            }
        }
    }
    /**
     * Save token to VS Code workspace state
     */
    saveToken(token, expiresIn) {
        const expiration = expiresIn
            ? new Date(Date.now() + expiresIn * 1000)
            : new Date(Date.now() + 24 * 60 * 60 * 1000); // Default 24h
        this.context.globalState.update("cisco.auth.token", {
            token,
            expiration: expiration.toISOString(),
        });
    }
    /**
     * Exchange authorization code for access token
     *
     * @param code - Authorization code from Cisco login
     * @param redirectPath - Redirect path (default: "/app")
     */
    async login(code, redirectPath = "/app") {
        try {
            vscode.window.showInformationMessage("Authenticating with Cisco Scripts...");
            const response = await this.httpClient.get("/api/v2/auth/redirect:path", {
                params: {
                    path: redirectPath,
                    code: code,
                },
                validateStatus: (status) => status === 201 || status === 200,
            });
            if (!response.data.access_token) {
                throw new Error("No access token in response");
            }
            // Store token and expiration
            this.accessToken = response.data.access_token;
            this.saveToken(response.data.access_token, response.data.expires_in);
            this.tokenExpiration = response.data.expires_in
                ? new Date(Date.now() + response.data.expires_in * 1000)
                : null;
            vscode.window.showInformationMessage("✓ Successfully logged in to Cisco Scripts");
            return response.data;
        }
        catch (error) {
            const message = error instanceof axios_1.AxiosError
                ? error.response?.data || error.message
                : String(error);
            vscode.window.showErrorMessage(`Authentication failed: ${message}`);
            throw error;
        }
    }
    /**
     * Authenticate using embedded WebView
     * Opens a WebView panel with login UI
     */
    async loginWithWebView() {
        try {
            const webViewAuth = new webviewAuth_1.WebViewAuthProvider(this.context);
            const result = await webViewAuth.authenticate();
            if (!result) {
                vscode.window.showWarningMessage("Authentication cancelled");
                return;
            }
            // Store token
            this.accessToken = result.accessToken;
            // Store cookie (especially bdb_cookie)
            if (result.cookies && result.cookies.bdb_cookie) {
                this.bdbCookie = result.cookies.bdb_cookie;
                await this.context.secrets.store("cisco.bdb_cookie", result.cookies.bdb_cookie);
            }
            // Store token expiration
            if (result.expiresIn) {
                this.tokenExpiration = new Date(Date.now() + result.expiresIn * 1000);
            }
            // Save token to globalState
            this.saveToken(result.accessToken, result.expiresIn);
            vscode.window.showInformationMessage("✓ Successfully authenticated with Cisco Scripts");
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            vscode.window.showErrorMessage(`WebView authentication failed: ${message}`);
            throw error;
        }
    }
    /**
     * Get bdb_cookie (for direct cookie-based requests)
     */
    async getBdbCookie() {
        if (!this.bdbCookie) {
            // Try to load from secure storage
            this.bdbCookie =
                (await this.context.secrets.get("cisco.bdb_cookie")) || null;
        }
        return this.bdbCookie;
    }
    /**
     * Make request with both Bearer token and cookies
     */
    async getWithCookies(endpoint) {
        const token = this.get_access_token();
        const cookie = await this.getBdbCookie();
        if (!token) {
            throw new Error("Not authenticated. Please log in first.");
        }
        const headers = {
            Authorization: `Bearer ${token}`,
        };
        if (cookie) {
            headers.Cookie = `bdb_cookie=${cookie}`;
        }
        try {
            const response = await this.httpClient.get(endpoint, { headers });
            return response.data;
        }
        catch (error) {
            if (error instanceof axios_1.AxiosError && error.response?.status === 401) {
                this.clearToken();
                vscode.window.showErrorMessage("Authentication token expired. Please log in again.");
            }
            throw error;
        }
    }
    /**
     * Make authenticated GET request
     */
    async get(endpoint) {
        if (!this.accessToken) {
            throw new Error("Not authenticated. Please log in first.");
        }
        try {
            const response = await this.httpClient.get(endpoint, {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                },
            });
            return response.data;
        }
        catch (error) {
            if (error instanceof axios_1.AxiosError && error.response?.status === 401) {
                this.clearToken();
                vscode.window.showErrorMessage("Authentication token expired. Please log in again.");
            }
            throw error;
        }
    }
    /**
     * Make authenticated POST request
     */
    async post(endpoint, data = {}) {
        if (!this.accessToken) {
            throw new Error("Not authenticated. Please log in first.");
        }
        try {
            const response = await this.httpClient.post(endpoint, data, {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                },
            });
            return response.data;
        }
        catch (error) {
            if (error instanceof axios_1.AxiosError && error.response?.status === 401) {
                this.clearToken();
                vscode.window.showErrorMessage("Authentication token expired. Please log in again.");
            }
            throw error;
        }
    }
    /**
     * Clear all auth data (logout)
     */
    async logoutAndClearCookies() {
        this.clearToken();
        await this.context.secrets.delete("cisco.bdb_cookie");
        await this.context.globalState.update("cisco.auth.token", undefined);
        vscode.window.showInformationMessage("✓ Logged out and cleared credentials");
    }
    /**
     * Clear stored token (logout)
     */
    async logout() {
        this.clearToken();
        await this.context.globalState.update("cisco.auth.token", undefined);
        vscode.window.showInformationMessage("✓ Logged out from Cisco Scripts");
    }
    /**
     * Internal method to clear token
     */
    clearToken() {
        this.accessToken = null;
        this.bdbCookie = null;
        this.tokenExpiration = null;
    }
    /**
     * Get current access token
     */
    getAccessToken() {
        return this.accessToken;
    }
    /**
     * Check if authenticated
     */
    isAuthenticated() {
        if (!this.accessToken)
            return false;
        // Check expiration
        if (this.tokenExpiration && this.tokenExpiration <= new Date()) {
            return false;
        }
        return true;
    }
    /**
     * Get token status information
     */
    getStatus() {
        return {
            authenticated: this.isAuthenticated(),
            expiresAt: this.tokenExpiration,
            hasBdbCookie: !!this.bdbCookie,
        };
    }
}
exports.CiscoAuthClient = CiscoAuthClient;
/**
 * Register authentication commands
 */
function registerAuthCommands(context, authClient) {
    // Login command
    context.subscriptions.push(vscode.commands.registerCommand("logScout.cisco.login", async () => {
        try {
            // Open browser for user to log in
            const codeInput = await vscode.window.showInputBox({
                prompt: "Enter the authorization code from Cisco login page",
                password: false,
                placeHolder: "Paste authorization code here",
            });
            if (!codeInput) {
                return;
            }
            const redirectPath = (await vscode.window.showQuickPick(["/app", "/ui", "/app_dev"], {
                placeHolder: "Select redirect path",
            })) || "/app";
            await authClient.login(codeInput, redirectPath);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Login failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }));
    // Logout command
    context.subscriptions.push(vscode.commands.registerCommand("logScout.cisco.logout", async () => {
        await authClient.logout();
    }));
    // Status command
    context.subscriptions.push(vscode.commands.registerCommand("logScout.cisco.status", async () => {
        const status = authClient.getStatus();
        const message = status.authenticated
            ? `✓ Authenticated (expires: ${status.expiresAt?.toLocaleString() || "unknown"})`
            : "✗ Not authenticated";
        vscode.window.showInformationMessage(message);
    }));
    // List scripts command
    context.subscriptions.push(vscode.commands.registerCommand("logScout.cisco.scripts.list", async () => {
        if (!authClient.isAuthenticated()) {
            vscode.window.showErrorMessage("Not authenticated. Please log in first.");
            await vscode.commands.executeCommand("logScout.cisco.login");
            return;
        }
        try {
            const scripts = await authClient.get("/api/v2/scripts");
            vscode.window.showInformationMessage(`Found ${Object.keys(scripts).length} scripts`);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to list scripts: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }));
}
// ============================================================================
// USAGE IN EXTENSION ACTIVATION
// ============================================================================
/**
 * Example usage in extension.ts
 */
/*
export async function activate(context: vscode.ExtensionContext) {
  // Create auth client
  const authClient = new CiscoAuthClient({
    baseUrl: 'https://scripts.cisco.com',
  }, context);

  // Register commands
  registerAuthCommands(context, authClient);

  // Also pass to LSP client if needed
  const lspClient = // ... your LSP client setup ...

  // Store in context for other modules to use
  context.globalState.setKeysForSync(['cisco.auth.token']);

  console.log('Log Scout Analyzer extension activated');
}
*/
//# sourceMappingURL=ciscoAuthClient.js.map