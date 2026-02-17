import * as vscode from "vscode";
import { getLSPClient } from "./lspClient";

/**
 * Item types for Scout Inventor
 */
export enum InventorItemType {
    Category,
    Product,
    Pattern,
}

interface PatternData {
    id: string;
    name: string;
    category: string;
    service?: string;
    severity: string;
}

/**
 * Tree item for Scout Inventor
 */
export class InventorItem extends vscode.TreeItem {
    public metadata?: string;
    
    constructor(
        public readonly label: string,
        public readonly type: InventorItemType,
        public readonly commandId?: string,
        public readonly collapsibleState?: vscode.TreeItemCollapsibleState,
        public readonly children?: InventorItem[]
    ) {
        super(
            label,
            collapsibleState || vscode.TreeItemCollapsibleState.None
        );

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

/**
 * Provides the Scout Inventor tree view with pattern library
 */
export class ScoutInventorProvider
    implements vscode.TreeDataProvider<InventorItem>
{
    private _onDidChangeTreeData: vscode.EventEmitter<
        InventorItem | undefined | null | void
    > = new vscode.EventEmitter<InventorItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<
        InventorItem | undefined | null | void
    > = this._onDidChangeTreeData.event;

    private patterns: PatternData[] = [];

    constructor() {
        this.loadPatterns();
    }
    
    private async loadPatterns() {
        try {
            const lspClient = getLSPClient();
            if (!lspClient) {
                return;
            }
            
            const result: any = await lspClient.sendRequest('workspace/executeCommand', {
                command: 'logScout.getPatterns',
                arguments: []
            });
            
            if (result && result.patterns) {
                this.patterns = result.patterns.map((p: any) => ({
                    id: p.id,
                    name: p.name,
                    category: p.category || 'uncategorized',
                    service: p.service,
                    severity: p.severity
                }));
                this.refresh();
            }
        } catch (error) {
            console.error('Failed to load patterns:', error);
        }
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: InventorItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: InventorItem): Thenable<InventorItem[]> {
        if (!element) {
            // Root level items - products
            return Promise.resolve(this.getRootItems());
        } else if (element.type === InventorItemType.Product) {
            // Categories under product
            return Promise.resolve(this.getCategoryItems(element.label));
        } else if (element.type === InventorItemType.Category) {
            // Patterns under category
            const [product, category] = element.metadata?.split('|') || ['', ''];
            return Promise.resolve(this.getPatternItems(product, category));
        }
        return Promise.resolve([]);
    }

    /**
     * Get root level items - products/services
     */
    private getRootItems(): InventorItem[] {
        const byProduct = new Map<string, PatternData[]>();
        
        this.patterns.forEach(p => {
            const product = p.service || 'general';
            if (!byProduct.has(product)) {
                byProduct.set(product, []);
            }
            byProduct.get(product)!.push(p);
        });
        
        const items: InventorItem[] = [];
        Array.from(byProduct.keys()).sort().forEach(product => {
            const patternCount = byProduct.get(product)!.length;
            const productItem = new InventorItem(
                product,
                InventorItemType.Product,
                undefined,
                vscode.TreeItemCollapsibleState.Collapsed
            );
            productItem.description = `${patternCount} patterns`;
            productItem.iconPath = new vscode.ThemeIcon('package', new vscode.ThemeColor('charts.blue'));
            items.push(productItem);
        });
        
        return items;
    }
    
    /**
     * Get category items for a product
     */
    private getCategoryItems(product: string): InventorItem[] {
        const productPatterns = this.patterns.filter(p => (p.service || 'general') === product);
        
        const byCategory = new Map<string, PatternData[]>();
        productPatterns.forEach(p => {
            const category = p.category || 'uncategorized';
            if (!byCategory.has(category)) {
                byCategory.set(category, []);
            }
            byCategory.get(category)!.push(p);
        });
        
        const items: InventorItem[] = [];
        Array.from(byCategory.keys()).sort().forEach(category => {
            const patternCount = byCategory.get(category)!.length;
            const categoryItem = new InventorItem(
                category,
                InventorItemType.Category,
                undefined,
                vscode.TreeItemCollapsibleState.Collapsed
            );
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
    private getPatternItems(product: string, category: string): InventorItem[] {
        const patterns = this.patterns.filter(p => 
            (p.service || 'general') === product && 
            (p.category || 'uncategorized') === category
        );
        
        const items: InventorItem[] = [];
        patterns.forEach(p => {
            const patternItem = new InventorItem(
                p.name,
                InventorItemType.Pattern,
                'logScoutAnalyzer.showPatternById'
            );
            patternItem.description = p.severity;
            patternItem.metadata = p.id;
            patternItem.tooltip = `Pattern ID: ${p.id}`;
            patternItem.command = {
                command: 'logScoutAnalyzer.showPatternById',
                title: 'Show Pattern Details',
                arguments: [[p.id]]
            };
            
            // Icon based on severity
            const severityIcons: { [key: string]: string } = {
                'error': 'error',
                'warning': 'warning',
                'info': 'info',
                'hint': 'lightbulb'
            };
            const severityColors: { [key: string]: string } = {
                'error': 'errorForeground',
                'warning': 'charts.yellow',
                'info': 'charts.blue',
                'hint': 'charts.green'
            };
            
            patternItem.iconPath = new vscode.ThemeIcon(
                severityIcons[p.severity] || 'circle-outline',
                new vscode.ThemeColor(severityColors[p.severity] || 'foreground')
            );
            
            items.push(patternItem);
        });
        
        return items;
    }
}
