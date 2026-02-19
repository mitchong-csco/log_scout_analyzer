// TypeScript Implementation for VS Code Extension
// File: vscode-extension/src/auth/ciscoAuthClient.ts

import axios, { AxiosInstance, AxiosError } from "axios";
import * as vscode from "vscode";
import { WebViewAuthProvider } from "./webviewAuth";

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
}

interface AuthConfig {
  baseUrl?: string;
  clientId?: string;
  clientSecret?: string;
}

class CiscoAuthClient {
  private readonly baseUrl: string;
  private readonly httpClient: AxiosInstance;
  private accessToken: string | null = null;
  private bdbCookie: string | null = null;
  private tokenExpiration: Date | null = null;
  private readonly context: vscode.ExtensionContext;

  constructor(config: AuthConfig = {}, context: vscode.ExtensionContext) {
    this.baseUrl = config.baseUrl || "https://scripts.cisco.com";
    this.context = context;

    // Create axios instance with proper defaults
    this.httpClient = axios.create({
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
    this.httpClient.interceptors.response.use(
      (response) => {
        // Extract and store bdb_cookie from Set-Cookie header
        const setCookie = response.headers["set-cookie"];
        if (setCookie) {
          this.bdbCookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
        }
        return response;
      },
      (error) => Promise.reject(error),
    );
  }

  /**
   * Load stored token from VS Code workspace state
   */
  private loadStoredToken(): void {
    const stored = this.context.globalState.get<{
      token: string;
      expiration: string;
    }>("cisco.auth.token");

    if (stored) {
      this.accessToken = stored.token;
      this.tokenExpiration = new Date(stored.expiration);

      // Check if token is still valid
      if (this.tokenExpiration && this.tokenExpiration <= new Date()) {
        vscode.window.showWarningMessage(
          "Cisco authentication token has expired. Please log in again.",
        );
        this.accessToken = null;
      }
    }
  }

  /**
   * Save token to VS Code workspace state
   */
  private saveToken(token: string, expiresIn?: number): void {
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
  async login(
    code: string,
    redirectPath: string = "/app",
  ): Promise<TokenResponse> {
    try {
      vscode.window.showInformationMessage(
        "Authenticating with Cisco Scripts...",
      );

      const response = await this.httpClient.get<TokenResponse>(
        "/api/v2/auth/redirect:path",
        {
          params: {
            path: redirectPath,
            code: code,
          },
          validateStatus: (status) => status === 201 || status === 200,
        },
      );

      if (!response.data.access_token) {
        throw new Error("No access token in response");
      }

      // Store token and expiration
      this.accessToken = response.data.access_token;
      this.saveToken(response.data.access_token, response.data.expires_in);
      this.tokenExpiration = response.data.expires_in
        ? new Date(Date.now() + response.data.expires_in * 1000)
        : null;

      vscode.window.showInformationMessage(
        "✓ Successfully logged in to Cisco Scripts",
      );
      return response.data;
    } catch (error) {
      const message =
        error instanceof AxiosError
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
  async loginWithWebView(): Promise<void> {
    try {
      const webViewAuth = new WebViewAuthProvider(this.context);
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
        await this.context.secrets.store(
          "cisco.bdb_cookie",
          result.cookies.bdb_cookie,
        );
      }

      // Store token expiration
      if (result.expiresIn) {
        this.tokenExpiration = new Date(Date.now() + result.expiresIn * 1000);
      }

      // Save token to globalState
      this.saveToken(result.accessToken, result.expiresIn);

      vscode.window.showInformationMessage(
        "✓ Successfully authenticated with Cisco Scripts",
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      vscode.window.showErrorMessage(
        `WebView authentication failed: ${message}`,
      );
      throw error;
    }
  }

  /**
   * Get bdb_cookie (for direct cookie-based requests)
   */
  async getBdbCookie(): Promise<string | null> {
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
  async getWithCookies(endpoint: string): Promise<any> {
    const token = this.get_access_token();
    const cookie = await this.getBdbCookie();

    if (!token) {
      throw new Error("Not authenticated. Please log in first.");
    }

    const headers: any = {
      Authorization: `Bearer ${token}`,
    };

    if (cookie) {
      headers.Cookie = `bdb_cookie=${cookie}`;
    }

    try {
      const response = await this.httpClient.get(endpoint, { headers });
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 401) {
        this.clearToken();
        vscode.window.showErrorMessage(
          "Authentication token expired. Please log in again.",
        );
      }
      throw error;
    }
  }

  /**
   * Make authenticated GET request
   */
  async get<T = any>(endpoint: string): Promise<T> {
    if (!this.accessToken) {
      throw new Error("Not authenticated. Please log in first.");
    }

    try {
      const response = await this.httpClient.get<T>(endpoint, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 401) {
        this.clearToken();
        vscode.window.showErrorMessage(
          "Authentication token expired. Please log in again.",
        );
      }
      throw error;
    }
  }

  /**
   * Make authenticated POST request
   */
  async post<T = any>(endpoint: string, data: any = {}): Promise<T> {
    if (!this.accessToken) {
      throw new Error("Not authenticated. Please log in first.");
    }

    try {
      const response = await this.httpClient.post<T>(endpoint, data, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 401) {
        this.clearToken();
        vscode.window.showErrorMessage(
          "Authentication token expired. Please log in again.",
        );
      }
      throw error;
    }
  }

  /**
   * Clear all auth data (logout)
   */
  async logoutAndClearCookies(): Promise<void> {
    this.clearToken();
    await this.context.secrets.delete("cisco.bdb_cookie");
    await this.context.globalState.update("cisco.auth.token", undefined);
    vscode.window.showInformationMessage(
      "✓ Logged out and cleared credentials",
    );
  }

  /**
   * Clear stored token (logout)
   */
  async logout(): Promise<void> {
    this.clearToken();
    await this.context.globalState.update("cisco.auth.token", undefined);
    vscode.window.showInformationMessage("✓ Logged out from Cisco Scripts");
  }

  /**
   * Internal method to clear token
   */
  private clearToken(): void {
    this.accessToken = null;
    this.bdbCookie = null;
    this.tokenExpiration = null;
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    if (!this.accessToken) return false;

    // Check expiration
    if (this.tokenExpiration && this.tokenExpiration <= new Date()) {
      return false;
    }

    return true;
  }

  /**
   * Get token status information
   */
  getStatus(): {
    authenticated: boolean;
    expiresAt: Date | null;
    hasBdbCookie: boolean;
  } {
    return {
      authenticated: this.isAuthenticated(),
      expiresAt: this.tokenExpiration,
      hasBdbCookie: !!this.bdbCookie,
    };
  }
}

export { CiscoAuthClient, TokenResponse, AuthConfig };

// ============================================================================
// VS CODE COMMAND INTEGRATION
// ============================================================================

import * as vscode from "vscode";

/**
 * Register authentication commands
 */
export function registerAuthCommands(
  context: vscode.ExtensionContext,
  authClient: CiscoAuthClient,
): void {
  // Login command
  context.subscriptions.push(
    vscode.commands.registerCommand("logScout.cisco.login", async () => {
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

        const redirectPath =
          (await vscode.window.showQuickPick(["/app", "/ui", "/app_dev"], {
            placeHolder: "Select redirect path",
          })) || "/app";

        await authClient.login(codeInput, redirectPath);
      } catch (error) {
        vscode.window.showErrorMessage(
          `Login failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }),
  );

  // Logout command
  context.subscriptions.push(
    vscode.commands.registerCommand("logScout.cisco.logout", async () => {
      await authClient.logout();
    }),
  );

  // Status command
  context.subscriptions.push(
    vscode.commands.registerCommand("logScout.cisco.status", async () => {
      const status = authClient.getStatus();
      const message = status.authenticated
        ? `✓ Authenticated (expires: ${status.expiresAt?.toLocaleString() || "unknown"})`
        : "✗ Not authenticated";

      vscode.window.showInformationMessage(message);
    }),
  );

  // List scripts command
  context.subscriptions.push(
    vscode.commands.registerCommand("logScout.cisco.scripts.list", async () => {
      if (!authClient.isAuthenticated()) {
        vscode.window.showErrorMessage(
          "Not authenticated. Please log in first.",
        );
        await vscode.commands.executeCommand("logScout.cisco.login");
        return;
      }

      try {
        const scripts = await authClient.get("/api/v2/scripts");
        vscode.window.showInformationMessage(
          `Found ${Object.keys(scripts).length} scripts`,
        );
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to list scripts: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }),
  );
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
