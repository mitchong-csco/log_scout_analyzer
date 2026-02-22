// API Discovery and Documentation Browser
// File: vscode-extension/src/docs/documentationBrowser.ts

import * as vscode from "vscode";
import axios, { AxiosInstance } from "axios";

interface ApiEndpoint {
  path: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  description: string;
  parameters?: Record<string, any>;
  response?: Record<string, any>;
  authentication: "Bearer" | "Cookie" | "Both";
  requiresCookie: boolean;
}

interface ApiDocumentation {
  title: string;
  description: string;
  baseUrl: string;
  endpoints: ApiEndpoint[];
  lastUpdated: Date;
}

/**
 * Discover available APIs from Cisco Scripts documentation
 * Uses the bdb_cookie to access protected documentation
 */
export class DocumentationBrowser {
  private httpClient: AxiosInstance;
  private baseUrl: string;
  private accessToken: string | null = null;
  private bdbCookie: string | null = null;
  private cachedDocs: ApiDocumentation | null = null;

  constructor(
    baseUrl: string = "https://scripts.cisco.com",
    _context: vscode.ExtensionContext,
  ) {
    this.baseUrl = baseUrl;
    this.httpClient = axios.create({
      baseURL: baseUrl,
      timeout: 15000,
      withCredentials: true,
    });
  }

  /**
   * Set authentication credentials
   */
  setCredentials(accessToken: string, bdbCookie: string): void {
    this.accessToken = accessToken;
    this.bdbCookie = bdbCookie;

    // Update axios instance with credentials
    this.httpClient.defaults.headers.common["Authorization"] =
      `Bearer ${accessToken}`;

    if (bdbCookie) {
      this.httpClient.defaults.headers.common["Cookie"] =
        `bdb_cookie=${bdbCookie}`;
    }
  }

  /**
   * Discover all available APIs from documentation
   * This fetches the API documentation from Cisco Scripts site
   */
  async discoverApis(): Promise<ApiDocumentation | null> {
    try {
      if (!this.accessToken || !this.bdbCookie) {
        vscode.window.showErrorMessage(
          "Not authenticated. Please log in first.",
        );
        return null;
      }

      vscode.window.showInformationMessage(
        "Discovering APIs from documentation...",
      );

      // Try multiple documentation endpoints
      const docEndpoints = [
        "/api/v2/documentation",
        "/api/docs",
        "/api/v2/docs",
        "/docs/api",
        "/api/v2/endpoints",
      ];

      for (const endpoint of docEndpoints) {
        try {
          const response = await this.httpClient.get(endpoint);
          if (response.data) {
            const docs = this.parseDocumentation(response.data);
            this.cachedDocs = docs;
            return docs;
          }
        } catch (error) {
          // Try next endpoint
          continue;
        }
      }

      // Fallback: Try to scrape common endpoints
      return await this.discoverCommonEndpoints();
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to discover APIs: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return null;
    }
  }

  /**
   * Discover common Cisco Scripts endpoints
   * Falls back to known endpoints if documentation not available
   */
  private async discoverCommonEndpoints(): Promise<ApiDocumentation> {
    const commonEndpoints: ApiEndpoint[] = [
      {
        path: "/api/v2/scripts",
        method: "GET",
        description: "List all available scripts",
        parameters: {
          limit: "number (optional)",
          offset: "number (optional)",
          search: "string (optional)",
        },
        response: {
          scripts: "array of script objects",
          total: "number",
        },
        authentication: "Both",
        requiresCookie: true,
      },
      {
        path: "/api/v2/scripts/:id",
        method: "GET",
        description: "Get a specific script by ID",
        parameters: {
          id: "string (required) - Script ID",
        },
        response: {
          id: "string",
          name: "string",
          description: "string",
          content: "string",
        },
        authentication: "Both",
        requiresCookie: true,
      },
      {
        path: "/api/v2/scripts/:id/execute",
        method: "POST",
        description: "Execute a script with given parameters",
        parameters: {
          id: "string (required) - Script ID",
          params: "object (optional) - Script parameters",
        },
        response: {
          result: "object",
          status: "string",
          timestamp: "string",
        },
        authentication: "Both",
        requiresCookie: true,
      },
      {
        path: "/api/v2/templates",
        method: "GET",
        description: "List all available templates",
        parameters: {
          limit: "number (optional)",
          offset: "number (optional)",
        },
        response: {
          templates: "array of template objects",
          total: "number",
        },
        authentication: "Both",
        requiresCookie: true,
      },
      {
        path: "/api/v2/auth/redirect:path",
        method: "GET",
        description: "Exchange authorization code for access token",
        parameters: {
          path: "string (required) - Redirect path",
          code: "string (required) - Authorization code",
        },
        response: {
          access_token: "string",
          token_type: "string",
          expires_in: "number",
        },
        authentication: "Bearer",
        requiresCookie: false,
      },
    ];

    return {
      title: "Cisco Scripts API",
      description: "Available endpoints for Cisco Scripts",
      baseUrl: this.baseUrl,
      endpoints: commonEndpoints,
      lastUpdated: new Date(),
    };
  }

  /**
   * Parse documentation response into structured format
   */
  private parseDocumentation(data: any): ApiDocumentation {
    // This would parse the actual documentation from Cisco's API
    // For now, return the structure
    return {
      title: data.title || "Cisco Scripts API",
      description: data.description || "API Documentation",
      baseUrl: this.baseUrl,
      endpoints: data.endpoints || [],
      lastUpdated: new Date(),
    };
  }

  /**
   * Get details about a specific endpoint
   */
  async getEndpointDetails(path: string): Promise<ApiEndpoint | null> {
    const docs = this.cachedDocs || (await this.discoverApis());
    if (!docs) return null;

    return (
      docs.endpoints.find((e) => e.path === path || e.path.includes(path)) ||
      null
    );
  }

  /**
   * Test an API endpoint
   */
  async testEndpoint(
    endpoint: ApiEndpoint,
    params?: Record<string, any>,
  ): Promise<any> {
    try {
      let url = endpoint.path;

      // Replace path parameters
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          url = url.replace(`:${key}`, String(value));
        });
      }

      const response = await this.httpClient({
        method: endpoint.method,
        url,
        data: endpoint.method !== "GET" ? params : undefined,
        params: endpoint.method === "GET" ? params : undefined,
      });

      return {
        status: response.status,
        data: response.data,
        headers: response.headers,
      };
    } catch (error) {
      return {
        status:
          error instanceof axios.AxiosError
            ? (error as any).response?.status
            : 500,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Generate code snippet for using an endpoint
   */
  generateCodeSnippet(
    endpoint: ApiEndpoint,
    language: "typescript" | "python" | "javascript" = "typescript",
  ): string {
    switch (language) {
      case "typescript":
        return this.generateTypeScriptSnippet(endpoint);
      case "python":
        return this.generatePythonSnippet(endpoint);
      case "javascript":
        return this.generateJavaScriptSnippet(endpoint);
      default:
        return "";
    }
  }

  private generateTypeScriptSnippet(endpoint: ApiEndpoint): string {
    const params = endpoint.parameters
      ? Object.entries(endpoint.parameters)
          .map(([key]) => `  ${key}: 'value',`)
          .join("\n")
      : "";

    return `// ${endpoint.description}
const response = await authClient.${endpoint.method === "GET" ? "getWithCookies" : "post"}(
  '${endpoint.path}'${endpoint.method !== "GET" ? `,\n  {\n${params}\n  }` : ""}
);

console.log(response);`;
  }

  private generatePythonSnippet(endpoint: ApiEndpoint): string {
    const params = endpoint.parameters
      ? Object.entries(endpoint.parameters)
          .map(([_key, _value]) => `    '${_key}': 'value',`)
          .join("\n")
      : "";

    return `# ${endpoint.description}
import requests

response = requests.${endpoint.method.toLowerCase()}(
    '${this.baseUrl}${endpoint.path}',
    headers={
        'Authorization': f'Bearer {token}',
        'Cookie': f'bdb_cookie={cookie}'
    }${params ? `,\n    json={\n${params}\n    }` : ""}
)

print(response.json())`;
  }

  private generateJavaScriptSnippet(endpoint: ApiEndpoint): string {
    const params = endpoint.parameters
      ? Object.entries(endpoint.parameters)
          .map(([key]) => `  ${key}: 'value',`)
          .join("\n")
      : "";

    return `// ${endpoint.description}
const response = await fetch('${this.baseUrl}${endpoint.path}', {
  method: '${endpoint.method}',
  headers: {
    'Authorization': \`Bearer \${token}\`,
    'Cookie': \`bdb_cookie=\${cookie}\`
  }${params ? `,\n  body: JSON.stringify({\n${params}\n  })` : ""}
});

const data = await response.json();
console.log(data);`;
  }

  /**
   * Get cached documentation
   */
  getCachedDocs(): ApiDocumentation | null {
    return this.cachedDocs;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cachedDocs = null;
  }
}

/**
 * Documentation WebView Panel
 */
export class DocsWebViewProvider {
  private static readonly viewType = "ciscoScripts.docs";
  private panel: vscode.WebviewPanel | undefined;
  private context: vscode.ExtensionContext;

  constructor(
    context: vscode.ExtensionContext,
    _browser: DocumentationBrowser,
  ) {
    this.context = context;
  }

  /**
   * Show documentation in WebView
   */
  async show(docs: any): Promise<void> {
    if (!this.panel) {
      this.panel = vscode.window.createWebviewPanel(
        DocsWebViewProvider.viewType,
        "Cisco Scripts Documentation",
        vscode.ViewColumn.Beside,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
        },
      );

      this.panel.onDidDispose(
        () => {
          this.panel = undefined;
        },
        undefined,
        this.context.subscriptions,
      );

      this.panel.webview.onDidReceiveMessage(
        (message) => this.handleWebViewMessage(message),
        undefined,
        this.context.subscriptions,
      );
    }

    this.panel.webview.html = this.getHtmlContent(docs);
  }

  /**
   * Handle messages from WebView
   */
  private async handleWebViewMessage(message: any): Promise<void> {
    switch (message.command) {
      case "testEndpoint":
        // Handle endpoint testing
        break;
      case "copySnippet":
        await vscode.env.clipboard.writeText(message.snippet);
        vscode.window.showInformationMessage("Snippet copied to clipboard!");
        break;
    }
  }

  /**
   * Generate HTML content for documentation
   */
  private getHtmlContent(docs: any): string {
    const endpoints = docs.endpoints || [];

    const endpointsHtml = endpoints
      .map(
        (ep: ApiEndpoint) => `
      <div class="endpoint-card">
        <div class="endpoint-header">
          <span class="method method-${ep.method.toLowerCase()}">${ep.method}</span>
          <code class="path">${ep.path}</code>
        </div>
        <p class="description">${ep.description}</p>

        ${
          ep.parameters
            ? `
          <div class="section">
            <h4>Parameters</h4>
            <ul>
              ${Object.entries(ep.parameters)
                .map(([key, value]) => `<li><code>${key}</code>: ${value}</li>`)
                .join("")}
            </ul>
          </div>
        `
            : ""
        }

        ${
          ep.response
            ? `
          <div class="section">
            <h4>Response</h4>
            <ul>
              ${Object.entries(ep.response)
                .map(([key, value]) => `<li><code>${key}</code>: ${value}</li>`)
                .join("")}
            </ul>
          </div>
        `
            : ""
        }

        <div class="endpoint-footer">
          <span class="auth">Auth: ${ep.authentication}</span>
          ${ep.requiresCookie ? '<span class="cookie">Requires Cookie</span>' : ""}
        </div>
      </div>
    `,
      )
      .join("");

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cisco Scripts API Documentation</title>
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
            --warning: #f59e0b;
            --error: #ef4444;
            --bg: #1e1e1e;
            --bg-light: #2d2d2d;
            --text: #e0e0e0;
            --text-dim: #999;
            --border: #444;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif;
            background: var(--bg);
            color: var(--text);
            line-height: 1.6;
            padding: 20px;
        }

        h1 {
            font-size: 28px;
            margin-bottom: 10px;
            color: white;
        }

        h2 {
            font-size: 20px;
            margin: 20px 0 10px 0;
            color: var(--primary);
            border-bottom: 2px solid var(--primary);
            padding-bottom: 10px;
        }

        h4 {
            font-size: 14px;
            margin: 10px 0 8px 0;
            color: var(--primary);
        }

        .subtitle {
            color: var(--text-dim);
            margin-bottom: 20px;
        }

        .endpoint-card {
            background: var(--bg-light);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 16px;
            transition: border-color 0.2s;
        }

        .endpoint-card:hover {
            border-color: var(--primary);
        }

        .endpoint-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;
        }

        .method {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            min-width: 50px;
            text-align: center;
            color: white;
        }

        .method-get {
            background: #3b82f6;
        }

        .method-post {
            background: #10b981;
        }

        .method-put {
            background: #f59e0b;
        }

        .method-delete {
            background: #ef4444;
        }

        .method-patch {
            background: #8b5cf6;
        }

        .path {
            font-family: 'Monaco', 'Courier New', monospace;
            font-size: 13px;
            color: var(--primary);
            flex: 1;
            overflow-x: auto;
        }

        .description {
            color: var(--text-dim);
            margin-bottom: 12px;
            font-size: 14px;
        }

        .section {
            background: rgba(255, 255, 255, 0.05);
            border-left: 3px solid var(--primary);
            padding: 10px 12px;
            margin: 10px 0;
            border-radius: 4px;
        }

        .section ul {
            list-style: none;
            padding-left: 0;
        }

        .section li {
            padding: 4px 0;
            font-size: 13px;
            color: var(--text);
        }

        .section code {
            background: rgba(0, 0, 0, 0.3);
            padding: 2px 6px;
            border-radius: 3px;
            color: #a6e22e;
            font-family: 'Monaco', 'Courier New', monospace;
            font-size: 12px;
        }

        .endpoint-footer {
            display: flex;
            gap: 8px;
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid var(--border);
            font-size: 12px;
        }

        .auth,
        .cookie {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 3px;
            background: rgba(102, 126, 234, 0.1);
            color: var(--primary);
        }

        .cookie {
            background: rgba(16, 185, 129, 0.1);
            color: var(--success);
        }

        code {
            background: rgba(0, 0, 0, 0.3);
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Monaco', 'Courier New', monospace;
            font-size: 13px;
        }
    </style>
</head>
<body>
    <h1>📚 ${docs.title || "Cisco Scripts API"}</h1>
    <p class="subtitle">${docs.description || "API Documentation"}</p>

    <h2>Available Endpoints</h2>
    <div class="endpoints">
        ${endpointsHtml}
    </div>

    <script>
        const vscode = acquireVsCodeApi();
    </script>
</body>
</html>
    `;
  }
}
