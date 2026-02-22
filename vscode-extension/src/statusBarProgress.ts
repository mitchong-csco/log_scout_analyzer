import * as vscode from "vscode";

/**
 * Status bar progress indicator with animated icons for bundle operations
 */
export class StatusBarProgress {
  private statusBarItem: vscode.StatusBarItem;
  private currentPhase: ProgressPhase | null = null;
  private blinkInterval: NodeJS.Timeout | null = null;
  private blinkState: boolean = false;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100,
    );
  }

  /**
   * Start showing progress for a specific phase
   */
  show(phase: ProgressPhase, message?: string): void {
    this.currentPhase = phase;
    this.blinkState = false;

    // Clear any existing blink interval
    if (this.blinkInterval) {
      clearInterval(this.blinkInterval);
    }

    const phaseConfig = PHASE_CONFIGS[phase];

    // Set initial state
    this.updateStatusBar(phaseConfig, message);
    this.statusBarItem.show();

    // Start blinking animation
    this.blinkInterval = setInterval(() => {
      this.blinkState = !this.blinkState;
      this.updateStatusBar(phaseConfig, message);
    }, phaseConfig.blinkInterval || 500);
  }

  /**
   * Update status bar with current blink state
   */
  private updateStatusBar(config: PhaseConfig, customMessage?: string): void {
    const icon = this.blinkState ? config.iconActive : config.iconInactive;
    const message = customMessage || config.message;
    this.statusBarItem.text = `${icon} ${message}`;
    this.statusBarItem.tooltip = config.tooltip;
    this.statusBarItem.backgroundColor = config.background;
  }

  /**
   * Show success state (non-blinking)
   */
  success(message: string, autoHide: boolean = true): void {
    this.stop();
    this.statusBarItem.text = `$(check) ${message}`;
    this.statusBarItem.tooltip = "Operation completed successfully";
    this.statusBarItem.backgroundColor = new vscode.ThemeColor(
      "statusBarItem.prominentBackground",
    );
    this.statusBarItem.show();

    if (autoHide) {
      setTimeout(() => this.hide(), 3000);
    }
  }

  /**
   * Show error state (non-blinking)
   */
  error(message: string, autoHide: boolean = true): void {
    this.stop();
    this.statusBarItem.text = `$(error) ${message}`;
    this.statusBarItem.tooltip = "Operation failed";
    this.statusBarItem.backgroundColor = new vscode.ThemeColor(
      "statusBarItem.errorBackground",
    );
    this.statusBarItem.show();

    if (autoHide) {
      setTimeout(() => this.hide(), 5000);
    }
  }

  /**
   * Show warning state (non-blinking)
   */
  warning(message: string, autoHide: boolean = true): void {
    this.stop();
    this.statusBarItem.text = `$(warning) ${message}`;
    this.statusBarItem.tooltip = "Operation completed with warnings";
    this.statusBarItem.backgroundColor = new vscode.ThemeColor(
      "statusBarItem.warningBackground",
    );
    this.statusBarItem.show();

    if (autoHide) {
      setTimeout(() => this.hide(), 4000);
    }
  }

  /**
   * Update message while keeping current phase animation
   */
  updateMessage(message: string): void {
    if (this.currentPhase) {
      const phaseConfig = PHASE_CONFIGS[this.currentPhase];
      this.updateStatusBar(phaseConfig, message);
    }
  }

  /**
   * Stop blinking and hide
   */
  hide(): void {
    this.stop();
    this.statusBarItem.hide();
  }

  /**
   * Stop blinking animation
   */
  stop(): void {
    if (this.blinkInterval) {
      clearInterval(this.blinkInterval);
      this.blinkInterval = null;
    }
    this.currentPhase = null;
    this.statusBarItem.backgroundColor = undefined;
  }

  /**
   * Dispose of status bar item
   */
  dispose(): void {
    this.stop();
    this.statusBarItem.dispose();
  }
}

/**
 * Progress phases for bundle operations
 */
export enum ProgressPhase {
  Creating = "creating",
  Extracting = "extracting",
  Importing = "importing",
  Analyzing = "analyzing",
  Processing = "processing",
  Validating = "validating",
  Finalizing = "finalizing",
}

/**
 * Configuration for each progress phase
 */
interface PhaseConfig {
  iconActive: string;
  iconInactive: string;
  message: string;
  tooltip: string;
  blinkInterval: number;
  background?: vscode.ThemeColor;
}

/**
 * Phase configurations with animated icons
 */
const PHASE_CONFIGS: Record<ProgressPhase, PhaseConfig> = {
  [ProgressPhase.Creating]: {
    iconActive: "$(add)",
    iconInactive: "$(circle-outline)",
    message: "Creating bundle...",
    tooltip: "Creating new bundle structure",
    blinkInterval: 500,
  },
  [ProgressPhase.Extracting]: {
    iconActive: "$(package)",
    iconInactive: "$(circle-outline)",
    message: "Extracting archive...",
    tooltip: "Extracting files from archive",
    blinkInterval: 400,
  },
  [ProgressPhase.Importing]: {
    iconActive: "$(cloud-download)",
    iconInactive: "$(circle-outline)",
    message: "Importing logs...",
    tooltip: "Importing log files into bundle",
    blinkInterval: 450,
  },
  [ProgressPhase.Analyzing]: {
    iconActive: "$(search)",
    iconInactive: "$(circle-outline)",
    message: "Analyzing bundle...",
    tooltip: "Running analysis on bundle logs",
    blinkInterval: 500,
  },
  [ProgressPhase.Processing]: {
    iconActive: "$(gear)",
    iconInactive: "$(circle-outline)",
    message: "Processing...",
    tooltip: "Processing bundle data",
    blinkInterval: 400,
  },
  [ProgressPhase.Validating]: {
    iconActive: "$(checklist)",
    iconInactive: "$(circle-outline)",
    message: "Validating...",
    tooltip: "Validating bundle contents",
    blinkInterval: 500,
  },
  [ProgressPhase.Finalizing]: {
    iconActive: "$(sync)",
    iconInactive: "$(circle-outline)",
    message: "Finalizing...",
    tooltip: "Finalizing bundle creation",
    blinkInterval: 350,
  },
};

/**
 * Helper function to create a managed progress indicator
 * that automatically shows phases and handles completion
 */
export class ManagedProgress {
  constructor(private progress: StatusBarProgress) {}

  /**
   * Run an async operation with automatic progress indication
   */
  async run<T>(
    phase: ProgressPhase,
    operation: () => Promise<T>,
    options?: {
      successMessage?: string;
      errorMessage?: string;
      initialMessage?: string;
    },
  ): Promise<T> {
    this.progress.show(phase, options?.initialMessage);

    try {
      const result = await operation();
      if (options?.successMessage) {
        this.progress.success(options.successMessage);
      } else {
        this.progress.hide();
      }
      return result;
    } catch (error) {
      const errorMsg =
        options?.errorMessage ||
        `Operation failed: ${error instanceof Error ? error.message : String(error)}`;
      this.progress.error(errorMsg);
      throw error;
    }
  }

  /**
   * Run multiple phases in sequence
   */
  async runPhases(
    phases: {
      phase: ProgressPhase;
      message?: string;
      operation: () => Promise<any>;
    }[],
  ): Promise<void> {
    for (const { phase, message, operation } of phases) {
      this.progress.show(phase, message);
      await operation();
    }
  }
}
