import * as path from "path";
import * as fs from "fs";
import * as vscode from "vscode";
import * as https from "https";
import * as http from "http";
import { FileLogger } from "./fileLogger";

let logger: FileLogger | undefined;

/**
 * Set the file logger instance
 */
export function setLSPDownloaderLogger(fileLogger: FileLogger): void {
  logger = fileLogger;
}

/**
 * Download LSP server binary from GitHub releases
 */
export async function downloadLSPServer(
  context: vscode.ExtensionContext,
  version: string = "latest",
  outputChannel: vscode.OutputChannel,
): Promise<string> {
  const platform = getPlatformInfo();
  const binDir = path.join(context.extensionPath, "bin");
  
  // Ensure bin directory exists
  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }

  const serverExecutable = path.join(binDir, platform.executableName);
  
  // Check if binary already exists
  if (fs.existsSync(serverExecutable)) {
    outputChannel.appendLine(`📦 LSP server binary already exists: ${serverExecutable}`);
    logger?.logLSP("Using existing LSP server binary", "info");
    return serverExecutable;
  }

  outputChannel.appendLine(`📥 Downloading LSP server for ${platform.name}...`);
  logger?.logLSP(`Downloading LSP server for ${platform.name}`, "info");

  try {
    // Get release info
    const releaseInfo = await getReleaseInfo(version);
    const asset = releaseInfo.assets.find((a: any) => a.name === platform.assetName);
    
    if (!asset) {
      throw new Error(`No binary found for platform: ${platform.name}`);
    }

    // Download the binary
    const downloadUrl = asset.browser_download_url;
    await downloadFile(downloadUrl, serverExecutable, outputChannel);

    // Make executable (Unix systems)
    if (platform.name !== "win32") {
      fs.chmodSync(serverExecutable, "755");
    }

    outputChannel.appendLine(`✅ LSP server downloaded successfully: ${serverExecutable}`);
    logger?.logLSP("LSP server downloaded successfully", "info");
    
    return serverExecutable;
  } catch (error: any) {
    outputChannel.appendLine(`❌ Failed to download LSP server: ${error.message}`);
    logger?.logLSPError(error.message, "downloadLSPServer");
    
    // Show user-friendly error with manual download option
    const downloadOption = "Download Manually";
    const result = await vscode.window.showErrorMessage(
      `Failed to download LSP server: ${error.message}`,
      downloadOption,
      "Cancel"
    );

    if (result === downloadOption) {
      // Open GitHub releases page
      vscode.env.openExternal(vscode.Uri.parse("https://github.com/mitchong-csco/log-scout-lsp-server/releases"));
    }

    throw error;
  }
}

/**
 * Get platform information for binary selection
 */
function getPlatformInfo() {
  const platform = process.platform;
  const arch = process.arch;

  if (platform === "win32") {
    return {
      name: "win32",
      executableName: "log-scout-lsp-server.exe",
      assetName: arch === "x64" ? "log-scout-lsp-server-windows-x64.exe" : "log-scout-lsp-server-windows.exe"
    };
  } else if (platform === "linux") {
    return {
      name: "linux",
      executableName: "log-scout-lsp-server-linux",
      assetName: arch === "x64" ? "log-scout-lsp-server-linux-x64" : "log-scout-lsp-server-linux"
    };
  } else if (platform === "darwin") {
    return {
      name: "darwin",
      executableName: "log-scout-lsp-server-mac",
      assetName: arch === "x64" ? "log-scout-lsp-server-macos-x64" : "log-scout-lsp-server-macos"
    };
  } else {
    throw new Error(`Unsupported platform: ${platform}`);
  }
}

/**
 * Get release information from GitHub API
 */
async function getReleaseInfo(version: string): Promise<any> {
  const apiUrl = version === "latest" 
    ? "https://api.github.com/repos/mitchong-csco/log-scout-lsp-server/releases/latest"
    : `https://api.github.com/repos/mitchong-csco/log-scout-lsp-server/releases/tags/${version}`;

  return new Promise((resolve, reject) => {
    const url = apiUrl.startsWith("https") ? https : http;
    
    const request = url.get(apiUrl, {
      headers: {
        "User-Agent": "log-scout-analyzer-vscode-extension",
        "Accept": "application/vnd.github.v3+json"
      }
    }, (response) => {
      let data = "";

      response.on("data", (chunk) => {
        data += chunk;
      });

      response.on("end", () => {
        try {
          const release = JSON.parse(data);
          resolve(release);
        } catch (error) {
          reject(new Error(`Failed to parse release info: ${error}`));
        }
      });
    });

    request.on("error", (error) => {
      reject(new Error(`Failed to fetch release info: ${error.message}`));
    });

    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error("Request timeout"));
    });
  });
}

/**
 * Download file from URL to local path
 */
async function downloadFile(
  url: string, 
  destination: string, 
  outputChannel: vscode.OutputChannel
): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destination);
    const request = (url.startsWith("https") ? https : http).get(url, (response) => {
      
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }

      const totalSize = parseInt(response.headers["content-length"] || "0");
      let downloadedSize = 0;

      response.on("data", (chunk) => {
        file.write(chunk);
        downloadedSize += chunk.length;
        
        // Show progress
        if (totalSize > 0) {
          const progress = Math.round((downloadedSize / totalSize) * 100);
          outputChannel.appendLine(`📥 Download progress: ${progress}%`);
        }
      });

      response.on("end", () => {
        file.end();
        resolve();
      });

      response.on("error", (error) => {
        reject(error);
      });
    });

    request.on("error", (error) => {
      reject(error);
    });

    file.on("error", (error) => {
      reject(error);
    });
  });
}

/**
 * Check if LSP server binary exists and is up to date
 */
export async function checkLSPServer(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
): Promise<string | null> {
  const platform = getPlatformInfo();
  const serverExecutable = path.join(context.extensionPath, "bin", platform.executableName);

  if (!fs.existsSync(serverExecutable)) {
    return null;
  }

  outputChannel.appendLine(`📦 Found LSP server binary: ${serverExecutable}`);
  logger?.logLSP("Found existing LSP server binary", "info");
  
  return serverExecutable;
}
