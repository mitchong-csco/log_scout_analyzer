"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScoutInventorProvider = exports.InventorItem = exports.InventorItemType = void 0;
const vscode = __importStar(require("vscode"));
const lspClient_1 = require("./lspClient");
/**
 * Item types for Scout Inventor
 */
var InventorItemType;
(function (InventorItemType) {
    InventorItemType[InventorItemType["Category"] = 0] = "Category";
    InventorItemType[InventorItemType["Product"] = 1] = "Product";
    InventorItemType[InventorItemType["Pattern"] = 2] = "Pattern";
})(InventorItemType || (exports.InventorItemType = InventorItemType = {}));
/**
 * Tree item for Scout Inventor
 */
class InventorItem extends vscode.TreeItem {
    constructor(label, type, commandId, collapsibleState, children) {
        super(label, collapsibleState || vscode.TreeItemCollapsibleState.None);
        this.label = label;
        this.type = type;
        this.commandId = commandId;
        this.collapsibleState = collapsibleState;
        this.children = children;
        // Set context value for when clauses
        this.contextValue = type.toString();
        // Set command if provided
        if (commandId) {
            this.command = {
                command: commandId,
                title: label,
            };
        }
    }
}
exports.InventorItem = InventorItem;
/**
 * Provides the Scout Inventor tree view with pattern library
 */
class ScoutInventorProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.patterns = [];
        this.loadPatterns();
    }
    async loadPatterns() {
        try {
            const lspClient = (0, lspClient_1.getLSPClient)();
            if (!lspClient) {
                return;
            }
            const result = await lspClient.sendRequest('workspace/executeCommand', {
                command: 'logScout.getPatterns',
                arguments: []
            });
            if (result && result.patterns) {
                this.patterns = result.patterns.map((p) => ({
                    id: p.id,
                    name: p.name,
                    category: p.category || 'uncategorized',
                    service: p.service,
                    severity: p.severity
                }));
                this.refresh();
            }
        }
        catch (error) {
            console.error('Failed to load patterns:', error);
        }
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!element) {
            // Root level items - products
            return Promise.resolve(this.getRootItems());
        }
        else if (element.type === InventorItemType.Product) {
            // Categories under product
            return Promise.resolve(this.getCategoryItems(element.label));
        }
        else if (element.type === InventorItemType.Category) {
            // Patterns under category
            const [product, category] = element.metadata?.split('|') || ['', ''];
            return Promise.resolve(this.getPatternItems(product, category));
        }
        return Promise.resolve([]);
    }
    /**
     * Get root level items - products/services
     */
    getRootItems() {
        const byProduct = new Map();
        this.patterns.forEach(p => {
            const product = p.service || 'general';
            if (!byProduct.has(product)) {
                byProduct.set(product, []);
            }
            byProduct.get(product).push(p);
        });
        const items = [];
        Array.from(byProduct.keys()).sort().forEach(product => {
            const patternCount = byProduct.get(product).length;
            const productItem = new InventorItem(product, InventorItemType.Product, undefined, vscode.TreeItemCollapsibleState.Collapsed);
            productItem.description = `${patternCount} patterns`;
            productItem.iconPath = new vscode.ThemeIcon('package', new vscode.ThemeColor('charts.blue'));
            items.push(productItem);
        });
        return items;
    }
    /**
     * Get category items for a product
     */
    getCategoryItems(product) {
        const productPatterns = this.patterns.filter(p => (p.service || 'general') === product);
        const byCategory = new Map();
        productPatterns.forEach(p => {
            const category = p.category || 'uncategorized';
            if (!byCategory.has(category)) {
                byCategory.set(category, []);
            }
            byCategory.get(category).push(p);
        });
        const items = [];
        Array.from(byCategory.keys()).sort().forEach(category => {
            const patternCount = byCategory.get(category).length;
            const categoryItem = new InventorItem(category, InventorItemType.Category, undefined, vscode.TreeItemCollapsibleState.Collapsed);
            categoryItem.description = `${patternCount} patterns`;
            categoryItem.metadata = `${product}|${category}`;
            categoryItem.iconPath = new vscode.ThemeIcon('symbol-folder', new vscode.ThemeColor('charts.orange'));
            items.push(categoryItem);
        });
        return items;
    }
    /**
     * Get pattern items for a product/category
     */
    getPatternItems(product, category) {
        const patterns = this.patterns.filter(p => (p.service || 'general') === product &&
            (p.category || 'uncategorized') === category);
        const items = [];
        patterns.forEach(p => {
            const patternItem = new InventorItem(p.name, InventorItemType.Pattern, 'logScoutAnalyzer.showPatternById');
            patternItem.description = p.severity;
            patternItem.metadata = p.id;
            patternItem.tooltip = `Pattern ID: ${p.id}`;
            patternItem.command = {
                command: 'logScoutAnalyzer.showPatternById',
                title: 'Show Pattern Details',
                arguments: [[p.id]]
            };
            // Icon based on severity
            const severityIcons = {
                'error': 'error',
                'warning': 'warning',
                'info': 'info',
                'hint': 'lightbulb'
            };
            const severityColors = {
                'error': 'errorForeground',
                'warning': 'charts.yellow',
                'info': 'charts.blue',
                'hint': 'charts.green'
            };
            patternItem.iconPath = new vscode.ThemeIcon(severityIcons[p.severity] || 'circle-outline', new vscode.ThemeColor(severityColors[p.severity] || 'foreground'));
            items.push(patternItem);
        });
        return items;
    }
}
exports.ScoutInventorProvider = ScoutInventorProvider;
//# sourceMappingURL=scoutInventorProvider.js.map