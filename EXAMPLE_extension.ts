// Complete VS Code Extension Example
// File: vscode-extension/src/extension.ts
// This is a COMPLETE, WORKING EXAMPLE showing:
// 1. Authentication with WebView
// 2. Cookie extraction
// 3. API discovery from documentation
// 4. Making authenticated API calls
// 5. Displaying results to user

import * as vscode from 'vscode';
import { CiscoAuthClient } from './auth/ciscoAuthClient';
import { WebViewAuthProvider } from './auth/webviewAuth';
import { DocumentationBrowser, DocsWebViewProvider } from './docs/documentationBrowser';

// ============================================================================
// GLOBAL STATE
// ============================================================================

let authClient: CiscoAuthClient;
let docsBrowser: DocumentationBrowser;
let docsWebViewProvider: DocsWebViewProvider;

// ============================================================================
// EXTENSION ACTIVATION
// ============================================================================

export async function activate(context: vscode.ExtensionContext) {
  console.log('Log Scout Analyzer extension activating...');

  // Initialize authentication client
  authClient = new CiscoAuthClient({}, context);
  docsBrowser = new DocumentationBrowser('https://scripts.cisco.com', context);
  docsWebViewProvider = new DocsWebViewProvider(context, docsBrowser);

  // ==================== COMMAND 1: LOGIN ====================
  const loginCommand = vscode.commands.registerCommand(
    'logScout.ciscoAuth.login',
    async () => {
      try {
        vscode.window.showInformationMessage('Opening Cisco authentication...');

        // Show WebView and wait for authentication
        await authClient.loginWithWebView();

        // Check if successful
        if (authClient.isAuthenticated()) {
          const token = authClient.getAccessToken();
          const cookie = await authClient.getBdbCookie();

          // Update status bar
          updateStatusBar('🟢 Authenticated');

          vscode.window.showInformationMessage(
            '✅ Successfully authenticated with Cisco Scripts!'
          );

          // Set credentials in documentation browser
          if (token && cookie) {
            docsBrowser.setCredentials(token, cookie);
          }

          // Show discovery notification
          vscode.window.showInformationMessage(
            'You can now use "Browse Docs" command to see available APIs'
          );
        }
      } catch (error) {
        updateStatusBar('🔴 Not authenticated');
        vscode.window.showErrorMessage(
          `Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  );

  // ==================== COMMAND 2: BROWSE DOCUMENTATION ====================
  const browseDocsCommand = vscode.commands.registerCommand(
    'logScout.cisco.browseDocs',
    async () => {
      if (!authClient.isAuthenticated()) {
        vscode.window.showWarningMessage(
          'Please log in first using "Login to Cisco Scripts" command'
        );
        await vscode.commands.executeCommand('logScout.ciscoAuth.login');
        return;
      }

      try {
        vscode.window.showInformationMessage('Discovering available APIs...');

        // Discover APIs from documentation
        const docs = await docsBrowser.discoverApis();

        if (docs) {
          // Show documentation in WebView
          await docsWebViewProvider.show(docs);

          vscode.window.showInformationMessage(
            `✅ Found ${docs.endpoints.length} available endpoints`
          );
        } else {
          vscode.window.showWarningMessage(
            'Could not discover APIs. Check connection and authentication.'
          );
        }
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to browse docs: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  );

  // ==================== COMMAND 3: LIST SCRIPTS ====================
  const listScriptsCommand = vscode.commands.registerCommand(
    'logScout.cisco.scripts.list',
    async () => {
      if (!authClient.isAuthenticated()) {
        vscode.window.showWarningMessage('Please log in first');
        await vscode.commands.executeCommand('logScout.ciscoAuth.login');
        return;
      }

      try {
        vscode.window.showInformationMessage('Fetching scripts from Cisco API...');

        // Use authenticated client with both token and cookie
        const scripts = await authClient.getWithCookies('/api/v2/scripts');

        // Display results
        if (Array.isArray(scripts)) {
          vscode.window.showInformationMessage(
            `✅ Found ${scripts.length} scripts`
          );

          // Show in quick pick
          const picked = await vscode.window.showQuickPick(
            scripts.map((s: any) => ({
              label: s.name || 'Unnamed Script',
              description: s.description || 'No description',
              detail: `ID: ${s.id}`,
              script: s,
            })),
            { title: 'Available Scripts' }
          );

          if (picked) {
            // Show script details in output channel
            showScriptDetails(picked.script);
          }
        } else if (scripts.scripts && Array.isArray(scripts.scripts)) {
          vscode.window.showInformationMessage(
            `✅ Found ${scripts.scripts.length} scripts`
          );
        } else {
          console.log('Scripts response:', scripts);
          vscode.window.showInformationMessage('Retrieved scripts successfully');
        }
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to fetch scripts: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        console.error('Error details:', error);
      }
    }
  );

  // ==================== COMMAND 4: TEST ENDPOINT ====================
  const testEndpointCommand = vscode.commands.registerCommand(
    'logScout.cisco.testEndpoint',
    async () => {
      if (!authClient.isAuthenticated()) {
        vscode.window.showWarningMessage('Please log in first');
        return;
      }

      try {
        // Get endpoint to test
        const endpoint = await vscode.window.showInputBox({
          prompt: 'Enter endpoint to test (e.g., /api/v2/scripts)',
          value: '/api/v2/scripts',
        });

        if (!endpoint) return;

        vscode.window.showInformationMessage('Testing endpoint...');

        // Test the endpoint
        const result = await authClient.get(endpoint);

        // Show result
        showOutputMessage(
          'Endpoint Test Result',
          JSON.stringify(result, null, 2)
        );
      } catch (error) {
        vscode.window.showErrorMessage(
          `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  );

  // ==================== COMMAND 5: LOGOUT ====================
  const logoutCommand = vscode.commands.registerCommand(
    'logScout.ciscoAuth.logout',
    async () => {
      try {
        await authClient.logoutAndClearCookies();
        docsBrowser.clearCache();
        updateStatusBar('🔴 Not authenticated');
        vscode.window.showInformationMessage(
          '✅ Successfully logged out. Credentials cleared.'
        );
      } catch (error) {
        vscode.window.showErrorMessage(
          `Logout failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  );

  // ==================== COMMAND 6: CHECK STATUS ====================
  const statusCommand = vscode.commands.registerCommand(
    'logScout.ciscoAuth.status',
    async () => {
      const isAuth = authClient.isAuthenticated();
      const message = isAuth
        ? '✅ Authenticated\n\nYou can now:\n• Browse documentation\n• List scripts\n• Make API calls'
        : '❌ Not authenticated\n\nPlease log in first using "Login to Cisco Scripts" command';

      vscode.window.showInformationMessage(message);
    }
  );

  // ==================== REGISTER ALL COMMANDS ====================
  context.subscriptions.push(
    loginCommand,
    browseDocsCommand,
    listScriptsCommand,
    testEndpointCommand,
    logoutCommand,
    statusCommand
  );

  // ==================== CREATE STATUS BAR ITEM ====================
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.command = 'logScout.ciscoAuth.status';
  statusBarItem.text = '🔴 Cisco: Not authenticated';
  statusBarItem.tooltip = 'Click to check authentication status';
  statusBarItem.show();

  context.subscriptions.push(statusBarItem);

  // Check if already authenticated from previous session
  if (authClient.isAuthenticated()) {
    updateStatusBar('🟢 Authenticated');

    const token = authClient.getAccessToken();
    const cookie = await authClient.getBdbCookie();
    if (token && cookie) {
      docsBrowser.setCredentials(token, cookie);
    }
  }

  // ==================== OUTPUT CHANNEL ====================
  const outputChannel = vscode.window.createOutputChannel('Cisco Scripts');
  context.subscriptions.push(outputChannel);

  // Store for global use
  (global as any).ciscoOutputChannel = outputChannel;

  console.log('✅ Log Scout Analyzer extension activated');
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Update status bar with authentication status
 */
function updateStatusBar(status: string): void {
  const statusBar = vscode.window.statusBarItems.find(
    (item) => item.command === 'logScout.ciscoAuth.status'
  );
  if (statusBar) {
    statusBar.text = `Cisco: ${status}`;
  }
}

/**
 * Show script details in output channel
 */
function showScriptDetails(script: any): void {
  const outputChannel = (global as any).ciscoOutputChannel;
  if (!outputChannel) return;

  outputChannel.clear();
  outputChannel.appendLine('='.repeat(60));
  outputChannel.appendLine(`SCRIPT: ${script.name || 'Unnamed'}`);
  outputChannel.appendLine('='.repeat(60));
  outputChannel.appendLine(`ID: ${script.id}`);
  outputChannel.appendLine(`Description: ${script.description || 'N/A'}`);
  outputChannel.appendLine('');
  outputChannel.appendLine('Content:');
  outputChannel.appendLine('-'.repeat(60));
  outputChannel.appendLine(script.content || 'No content');
  outputChannel.show();
}

/**
 * Show a message in the output channel
 */
function showOutputMessage(title: string, content: string): void {
  const outputChannel = (global as any).ciscoOutputChannel;
  if (!outputChannel) return;

  outputChannel.clear();
  outputChannel.appendLine('='.repeat(60));
  outputChannel.appendLine(title);
  outputChannel.appendLine('='.repeat(60));
  outputChannel.appendLine(content);
  outputChannel.show();
}

export function deactivate() {
  console.log('Log Scout Analyzer extension deactivating');
}
