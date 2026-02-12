/**
 * Annotation Dashboard - Client-side script
 * Iteration 2: Dynamic rendering from postMessage data
 */

declare const acquireVsCodeApi: any;
const vscode = acquireVsCodeApi();

let currentAnnotations: any[] = [];
let hiddenCategories: string[] = [];
let renderedCards: Map<string, HTMLElement> = new Map();
let searchDebounceTimer: any = null;
let isVirtualScrollEnabled = false;
const VIRTUAL_SCROLL_THRESHOLD = 500; // Enable virtual scroll for 500+ items (increased for stability)
let timeRangeStart: Date | null = null;
let timeRangeEnd: Date | null = null;
let minimapVisible = true;
let minimapMode: 'filter' | 'range' = 'filter'; // 'filter' shows only filtered, 'range' shows all with highlight
let searchQuery = '';
let searchIsRegex = false;
let logMinTime: number = 0; // Earliest log timestamp in milliseconds
let logMaxTime: number = 0; // Latest log timestamp in milliseconds
let useServerSideFiltering = false; // Dynamic: true for large datasets (5000+)
let totalAnnotationCount = 0; // Total count from server
let lastLoggedFilterStrategy: boolean | null = null; // Track previous strategy to avoid spam

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
});

// Listen for messages from extension
window.addEventListener('message', event => {
    const message = event.data;
    switch (message.command) {
        case 'updateAnnotations':
            currentAnnotations = message.annotations;
            // Update filtering strategy based on metadata
            if (message.metadata) {
                useServerSideFiltering = message.metadata.useServerSideFiltering || false;
                totalAnnotationCount = message.metadata.totalCount || message.annotations.length;
                // Only log when strategy changes to avoid console spam
                if (lastLoggedFilterStrategy !== useServerSideFiltering) {
                    console.log(`[Filter Strategy] Dataset size: ${totalAnnotationCount}, Using ${useServerSideFiltering ? 'SERVER-SIDE' : 'CLIENT-SIDE'} filtering`);
                    lastLoggedFilterStrategy = useServerSideFiltering;
                }
            }
            renderAnnotations(currentAnnotations);
            break;
        case 'setFilterState':
            applyFilterState(message.state);
            break;
    }
});

function renderAnnotations(annotations: any[]) {
    const container = document.getElementById('annotations-list');
    if (!container) return;

    // Clear existing content and cache
    container.innerHTML = '';
    renderedCards.clear();

    // Show empty state if no annotations
    if (annotations.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <div class="empty-state-text">No annotations found</div>
                <div class="empty-state-hint">Open a log file and run analysis to see pattern matches</div>
            </div>
        `;
        return;
    }

    // Enable virtual scrolling for large result sets
    isVirtualScrollEnabled = annotations.length > VIRTUAL_SCROLL_THRESHOLD;
    
    // Update performance info
    const perfInfo = document.getElementById('performance-info');
    if (perfInfo) {
        if (useServerSideFiltering || isVirtualScrollEnabled) {
            perfInfo.style.display = 'flex';
            const modeText = useServerSideFiltering ? '⚡ Server-side filtering active' : '🚀 Virtual scrolling enabled';
            const countText = useServerSideFiltering && totalAnnotationCount > annotations.length 
                ? ` (${annotations.length} of ${totalAnnotationCount})` 
                : ` (${annotations.length} items)`;
            perfInfo.innerHTML = `<span class="codicon codicon-dashboard"></span> ${modeText}${countText}`;
        } else {
            perfInfo.style.display = 'none';
        }
    }
    
    if (isVirtualScrollEnabled) {
        renderWithVirtualScroll(annotations, container);
    } else {
        // Render all cards for smaller sets
        annotations.forEach(annotation => {
            const card = createAnnotationCard(annotation);
            renderedCards.set(annotation.id, card);
            container.appendChild(card);
        });
    }

    // Re-initialize event listeners for new cards
    initializeCardEventListeners();
    
    // Set time range to span of logs
    setTimeRangeFromAnnotations(annotations);
    
    // Render minimap
    renderMinimap(annotations);
    
    // Re-apply current filter state after rendering
    handleFilterChange();
}

function createAnnotationCard(annotation: any): HTMLElement {
    const card = document.createElement('div');
    card.className = 'annotation-card';
    card.setAttribute('data-id', annotation.id);
    card.setAttribute('data-priority', annotation.priority);
    card.setAttribute('data-loglevel', annotation.logLevel || 'info');
    card.setAttribute('data-category', annotation.category);
    card.setAttribute('data-timestamp', annotation.timestamp);

    const priorityClass = (annotation.priority || 'normal').toLowerCase();
    const hasInternalNotes = annotation.internalNotes && annotation.internalNotes.length > 0;
    const hasSeverityTrigger = annotation.severityTrigger && annotation.severityTrigger.length > 0;
    const hasExtractedFields = annotation.extractedFields && Object.keys(annotation.extractedFields).length > 0;

    card.innerHTML = `
        <!-- Card Header -->
        <div class="card-header">
            <div class="header-left">
                <span class="badge category-badge">${escapeHtml(annotation.category)}</span>
                ${hasSeverityTrigger ? `<span class="badge trigger-badge" title="${escapeHtml(annotation.severityTrigger)}">⚡ Triggered</span>` : ''}
            </div>
            <div class="header-right">
                <a href="#" class="file-link" data-file="${escapeHtml(annotation.filePath)}" data-line="${annotation.lineNumber}">
                    ${escapeHtml(annotation.filePath)}:${annotation.lineNumber}
                </a>
                <span class="badge log-level-badge ${annotation.logLevel ? annotation.logLevel.toLowerCase() : ''}">${annotation.logLevel || 'INFO'}</span>
                <div class="card-menu">
                    <button class="card-menu-btn" title="Actions">
                        <span class="codicon codicon-kebab-vertical"></span>
                    </button>
                    <div class="card-menu-dropdown">
                        <button class="menu-item copy-matched-menu" data-text="${escapeHtml(annotation.matchedText)}">
                            <span class="codicon codicon-copy"></span>
                            Copy Matched Text
                        </button>
                        <button class="menu-item hide-category-menu" data-category="${escapeHtml(annotation.category)}">
                            <span class="codicon codicon-eye-closed"></span>
                            Hide Category
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Card Content -->
        <div class="card-content">
            <div class="content-main">
                <div class="timestamp">
                    <span class="codicon codicon-calendar"></span>
                    ${escapeHtml(annotation.timestamp)}
                </div>
                <div class="pattern-info">
                    <strong>Pattern:</strong> ${escapeHtml(annotation.patternName)}
                </div>
                <div class="matched-text" title="${escapeHtml(annotation.rawLogLine)}">
                    <strong>Detected:</strong> 
                    <span class="matched-highlight">${escapeHtml(annotation.matchedText)}</span>
                    <span class="codicon codicon-info" style="margin-left: 8px; opacity: 0.6;" title="Hover for raw log line"></span>
                </div>
                <div class="severity-info">
                    <strong>Priority:</strong> 
                    <span class="priority-badge ${priorityClass}">${(annotation.priority || 'NORMAL').toUpperCase()}</span>
                    ${hasSeverityTrigger ? `<span class="severity-trigger" title="Conditional severity trigger">${escapeHtml(annotation.severityTrigger)}</span>` : ''}
                </div>
                ${hasExtractedFields ? `
                <div class="extracted-fields">
                    <details open>
                        <summary><span class="codicon codicon-database"></span> Extracted Fields (${Object.keys(annotation.extractedFields).length})</summary>
                        <table class="fields-table">
                            ${Object.entries(annotation.extractedFields).map(([key, value]) => `
                            <tr>
                                <td class="field-key"><code>${escapeHtml(key)}</code></td>
                                <td class="field-value">${escapeHtml(String(value))}</td>
                            </tr>
                            `).join('')}
                        </table>
                    </details>
                </div>
                ` : ''}
                ${hasInternalNotes ? `
                <div class="internal-notes">
                    <details>
                        <summary><span class="codicon codicon-note"></span> Internal Notes</summary>
                        <div class="notes-content">${escapeHtml(annotation.internalNotes)}</div>
                    </details>
                </div>
                ` : ''}
            </div>
        </div>
    `;

    return card;
}

function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Render timeline graphic showing date/time position
 */
function renderTimelineGraphic(timestamp: string): string {
    try {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return '';
        
        // Get all annotations to calculate time range
        if (currentAnnotations.length === 0) return '';
        
        const timestamps = currentAnnotations.map(a => new Date(a.timestamp).getTime()).filter(t => !isNaN(t));
        const minTime = Math.min(...timestamps);
        const maxTime = Math.max(...timestamps);
        const currentTime = date.getTime();
        
        // Calculate position percentage
        const range = maxTime - minTime;
        const position = range > 0 ? ((currentTime - minTime) / range) * 100 : 50;
        
        // Format date parts
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        
        return `
            <div class="timeline-graphic">
                <div class="timeline-bar">
                    <div class="timeline-marker" style="left: ${position}%;" title="${dateStr} ${timeStr}"></div>
                </div>
                <div class="timeline-labels">
                    <span class="timeline-date">${dateStr}</span>
                    <span class="timeline-time">${timeStr}</span>
                </div>
            </div>
        `;
    } catch (e) {
        return '';
    }
}

function applyFilterState(state: any) {
    // Store hidden categories globally
    hiddenCategories = state.hiddenCategories || [];
    
    // Apply filter checkboxes
    const filterError = document.getElementById('filter-error') as HTMLInputElement;
    const filterWarning = document.getElementById('filter-warning') as HTMLInputElement;
    const filterInfo = document.getElementById('filter-info') as HTMLInputElement;
    
    if (filterError) filterError.checked = state.filterError;
    if (filterWarning) filterWarning.checked = state.filterWarning;
    if (filterInfo) filterInfo.checked = state.filterInfo;
    
    // Apply sort dropdown
    const sortDropdown = document.getElementById('sort-dropdown') as HTMLSelectElement;
    if (sortDropdown) sortDropdown.value = state.sortBy;
    
    // Update hidden categories display
    updateHiddenCategoriesUI(state.hiddenCategories);
    
    // Apply filters to current view
    handleFilterChange();
}

function updateHiddenCategoriesUI(hiddenCategories: string[]) {
    const hiddenSection = document.getElementById('hidden-categories-section');
    if (!hiddenSection) return;
    
    if (hiddenCategories.length === 0) {
        hiddenSection.style.display = 'none';
    } else {
        hiddenSection.style.display = 'block';
        const container = hiddenSection.querySelector('.hidden-categories-list');
        if (container) {
            container.innerHTML = hiddenCategories.map(cat => `
                <button class="unhide-btn" data-category="${escapeHtml(cat)}">
                    <span class="codicon codicon-eye"></span> ${escapeHtml(cat)}
                </button>
            `).join('');
            
            // Add click handlers for unhide buttons
            container.querySelectorAll('.unhide-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const category = (e.currentTarget as HTMLElement).getAttribute('data-category');
                    if (category) {
                        vscode.postMessage({ command: 'unhideCategory', category });
                    }
                });
            });
        }
    }
}

function initializeEventListeners() {
    // Log level filter buttons
    const logLevelButtons = document.querySelectorAll('.loglevel-toggle-btn');
    logLevelButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const btn = e.currentTarget as HTMLElement;
            btn.classList.toggle('active');
            handleFilterChange();
        });
    });

    // Priority filter buttons
    const priorityButtons = document.querySelectorAll('.priority-toggle-btn');
    priorityButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const btn = e.currentTarget as HTMLElement;
            btn.classList.toggle('active');
            handleFilterChange();
        });
    });

    // Search input
    const searchInput = document.getElementById('search-input') as HTMLInputElement;
    if (searchInput) {
        searchInput.addEventListener('input', handleSearchInput);
    }

    // Sort dropdown
    const sortDropdown = document.getElementById('sort-dropdown') as HTMLSelectElement;
    if (sortDropdown) {
        sortDropdown.addEventListener('change', handleSortChange);
    }

    // Export button
    const exportButton = document.getElementById('export-btn') as HTMLButtonElement;
    if (exportButton) {
        exportButton.addEventListener('click', handleExportAnnotations);
    }
    
    // Time filter buttons
    const timeFilterButtons = document.querySelectorAll('.time-filter-btn');
    timeFilterButtons.forEach(button => {
        button.addEventListener('click', handleTimeFilterClick);
    });
    
    // Minimap toggle
    const toggleMinimapBtn = document.getElementById('toggle-minimap-btn') as HTMLButtonElement;
    if (toggleMinimapBtn) {
        toggleMinimapBtn.addEventListener('click', handleToggleMinimap);
    }
    
    // Minimap mode toggle
    const toggleMinimapMode = document.getElementById('toggle-minimap-mode') as HTMLButtonElement;
    if (toggleMinimapMode) {
        toggleMinimapMode.addEventListener('click', handleToggleMinimapMode);
    }
}

function initializeCardEventListeners() {
    // File links - jump to line
    const fileLinks = document.querySelectorAll('.file-link');
    fileLinks.forEach(link => {
        link.addEventListener('click', handleFileLinkClick);
    });

    // Card menu toggle buttons
    const cardMenuBtns = document.querySelectorAll('.card-menu-btn');
    cardMenuBtns.forEach(btn => {
        btn.addEventListener('click', handleCardMenuToggle);
    });

    // Hide category menu items
    const hideMenuItems = document.querySelectorAll('.hide-category-menu');
    hideMenuItems.forEach(button => {
        button.addEventListener('click', handleHideCategory);
    });

    // Copy matched text menu items
    const copyMenuItems = document.querySelectorAll('.copy-matched-menu');
    copyMenuItems.forEach(button => {
        button.addEventListener('click', handleCopyMatchedText);
    });

    // Severity filter buttons
    const filterButtons = document.querySelectorAll('.severity-toggle-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', handleSeverityToggle);
    });

    // Search input
    const searchInput = document.getElementById('search-input') as HTMLInputElement;
    if (searchInput) {
        searchInput.addEventListener('input', handleSearchInput);
    }
    
    // Regex toggle
    const regexToggle = document.getElementById('toggle-regex') as HTMLButtonElement;
    if (regexToggle) {
        regexToggle.addEventListener('click', handleToggleRegex);
    }

    // Sort dropdown
    const sortDropdown = document.getElementById('sort-dropdown') as HTMLSelectElement;
    if (sortDropdown) {
        sortDropdown.addEventListener('change', handleSortChange);
    }
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!(e.target as HTMLElement).closest('.card-menu')) {
            document.querySelectorAll('.card-menu-dropdown').forEach(dropdown => {
                (dropdown as HTMLElement).classList.remove('show');
            });
        }
    });
}

function handleCardMenuToggle(event: Event) {
    event.stopPropagation();
    const button = event.currentTarget as HTMLButtonElement;
    const dropdown = button.nextElementSibling as HTMLElement;
    
    // Close all other dropdowns
    document.querySelectorAll('.card-menu-dropdown').forEach(dd => {
        if (dd !== dropdown) {
            dd.classList.remove('show');
        }
    });
    
    // Toggle this dropdown
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

function handleFileLinkClick(event: Event) {
    event.preventDefault();
    const link = event.currentTarget as HTMLAnchorElement;
    const filePath = link.getAttribute('data-file');
    const lineStr = link.getAttribute('data-line');
    
    if (filePath && lineStr) {
        const line = parseInt(lineStr, 10);
        vscode.postMessage({
            command: 'jumpToLine',
            filePath: filePath,
            line: line
        });
    }
}

function handleHideCategory(event: Event) {
    const button = event.currentTarget as HTMLButtonElement;
    const category = button.getAttribute('data-category');
    
    if (category) {
        // Add to hidden categories
        if (!hiddenCategories.includes(category)) {
            hiddenCategories.push(category);
        }
        
        // Re-apply all filters (including minimap update)
        handleFilterChange();

        // Notify extension
        vscode.postMessage({
            command: 'hideCategory',
            category: category
        });
    }
}

function handleSeverityToggle(event: Event) {
    const button = event.currentTarget as HTMLButtonElement;
    button.classList.toggle('active');
    handleFilterChange();
}

function handleToggleRegex() {
    searchIsRegex = !searchIsRegex;
    const toggleBtn = document.getElementById('toggle-regex');
    
    if (toggleBtn) {
        if (searchIsRegex) {
            toggleBtn.classList.add('active');
        } else {
            toggleBtn.classList.remove('active');
        }
    }
    
    // Re-apply search with new mode
    if (searchQuery) {
        handleFilterChange();
    }
}

function requestServerSideFilter() {
    // Get current filter button states
    const errorBtn = document.getElementById('filter-error');
    const warnBtn = document.getElementById('filter-warn');
    const infoBtn = document.getElementById('filter-info');
    const debugBtn = document.getElementById('filter-debug');
    const traceBtn = document.getElementById('filter-trace');
    
    const logLevelFilters = {
        error: errorBtn?.classList.contains('active') ?? true,
        warn: warnBtn?.classList.contains('active') ?? true,
        info: infoBtn?.classList.contains('active') ?? true,
        debug: debugBtn?.classList.contains('active') ?? true,
        trace: traceBtn?.classList.contains('active') ?? true
    };

    const criticalBtn = document.getElementById('filter-critical');
    const highBtn = document.getElementById('filter-high');
    const normalBtn = document.getElementById('filter-normal');
    const lowBtn = document.getElementById('filter-low');
    
    const priorityFilters = {
        critical: criticalBtn?.classList.contains('active') ?? true,
        high: highBtn?.classList.contains('active') ?? true,
        normal: normalBtn?.classList.contains('active') ?? true,
        low: lowBtn?.classList.contains('active') ?? true
    };
    
    // Request filtered data from backend
    vscode.postMessage({
        command: 'requestFilteredAnnotations',
        filters: {
            logLevels: logLevelFilters,
            priorities: priorityFilters,
            searchQuery: searchQuery,
            searchIsRegex: searchIsRegex,
            timeRangeStart: timeRangeStart?.toISOString(),
            timeRangeEnd: timeRangeEnd?.toISOString(),
            hiddenCategories: hiddenCategories
        }
    });
}

function handleFilterChange() {
    // For large datasets, request filtered data from server
    if (useServerSideFiltering) {
        requestServerSideFilter();
        return;
    }
    
    // Otherwise use client-side filtering (current implementation)
    
    // Get log level filter states
    const errorBtn = document.getElementById('filter-error');
    const warnBtn = document.getElementById('filter-warn');
    const infoBtn = document.getElementById('filter-info');
    const debugBtn = document.getElementById('filter-debug');
    const traceBtn = document.getElementById('filter-trace');
    
    const logLevelFilters = {
        error: errorBtn?.classList.contains('active') ?? true,
        warn: warnBtn?.classList.contains('active') ?? true,
        info: infoBtn?.classList.contains('active') ?? true,
        debug: debugBtn?.classList.contains('active') ?? true,
        trace: traceBtn?.classList.contains('active') ?? true
    };

    // Get priority filter states
    const criticalBtn = document.getElementById('filter-critical');
    const highBtn = document.getElementById('filter-high');
    const normalBtn = document.getElementById('filter-normal');
    const lowBtn = document.getElementById('filter-low');
    
    const priorityFilters = {
        critical: criticalBtn?.classList.contains('active') ?? true,
        high: highBtn?.classList.contains('active') ?? true,
        normal: normalBtn?.classList.contains('active') ?? true,
        low: lowBtn?.classList.contains('active') ?? true
    };

    const cards = document.querySelectorAll('.annotation-card');
    const visibleAnnotations: any[] = [];
    
    cards.forEach(card => {
        const cardElement = card as HTMLElement;
        const priority = (cardElement.getAttribute('data-priority') || '').toLowerCase();
        const logLevel = (cardElement.getAttribute('data-loglevel') || 'info').toLowerCase();
        const category = cardElement.getAttribute('data-category');
        const timestamp = cardElement.getAttribute('data-timestamp');
        const text = cardElement.textContent?.toLowerCase() || '';
        const annotationId = cardElement.getAttribute('data-id');
        
        // Check if category is hidden
        if (category && hiddenCategories.includes(category)) {
            cardElement.classList.add('filtered-out');
            return;
        }
        
        // Check log level filter
        const logLevelMatch = logLevelFilters[logLevel as keyof typeof logLevelFilters] ?? true;
        if (!logLevelMatch) {
            cardElement.classList.add('filtered-out');
            return;
        }

        // Check priority filter
        const priorityMatch = priorityFilters[priority as keyof typeof priorityFilters] ?? true;
        if (!priorityMatch) {
            cardElement.classList.add('filtered-out');
            return;
        }

        // Check time range filter
        if (timestamp && (timeRangeStart || timeRangeEnd)) {
            const cardTime = new Date(timestamp);
            if (!isNaN(cardTime.getTime())) {
                if (timeRangeStart && cardTime < timeRangeStart) {
                    cardElement.classList.add('filtered-out');
                    return;
                }
                if (timeRangeEnd && cardTime > timeRangeEnd) {
                    cardElement.classList.add('filtered-out');
                    return;
                }
            }
        }

        // Check search filter
        if (searchQuery) {
            let matches = false;
            
            if (searchIsRegex) {
                try {
                    const regex = new RegExp(searchQuery, 'i');
                    matches = regex.test(text);
                } catch (e) {
                    // Invalid regex, fall back to string search
                    matches = text.includes(searchQuery);
                }
            } else {
                matches = text.includes(searchQuery);
            }
            
            if (!matches) {
                cardElement.classList.add('filtered-out');
                return;
            }
        }

        cardElement.classList.remove('filtered-out');
        
        // Add to visible annotations for minimap
        if (annotationId) {
            const annotation = currentAnnotations.find(a => a.id === annotationId);
            if (annotation) {
                visibleAnnotations.push(annotation);
            }
        }
    });
    
    // Update minimap with filtered annotations
    renderMinimap(visibleAnnotations);
    
    // Save filter state
    vscode.postMessage({
        command: 'saveFilterState',
        state: {
            filterError: logLevelFilters.error,
            filterWarn: logLevelFilters.warn,
            filterInfo: logLevelFilters.info,
            filterDebug: logLevelFilters.debug,
            filterTrace: logLevelFilters.trace,
            filterCritical: priorityFilters.critical,
            filterHigh: priorityFilters.high,
            filterNormal: priorityFilters.normal,
            filterLow: priorityFilters.low
        }
    });
}

function handleSearchInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const query = searchIsRegex ? input.value : input.value.toLowerCase();

    // Debounce search to avoid excessive filtering on every keystroke
    if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
    }

    searchDebounceTimer = setTimeout(() => {
        searchQuery = query;
        // Re-apply all filters including the new search query
        handleFilterChange();
    }, 300); // 300ms debounce delay
}

function handleSortChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const sortBy = select.value;

    const container = document.getElementById('annotations-list');
    if (!container) return;

    const cards = Array.from(container.querySelectorAll('.annotation-card'));
    
    cards.sort((a, b) => {
        const cardA = a as HTMLElement;
        const cardB = b as HTMLElement;

        switch (sortBy) {
            case 'priority': {
                const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
                const prioA = priorityOrder[(cardA.getAttribute('data-priority') || '').toLowerCase() as keyof typeof priorityOrder] || 999;
                const prioB = priorityOrder[(cardB.getAttribute('data-priority') || '').toLowerCase() as keyof typeof priorityOrder] || 999;
                return prioA - prioB;
            }
            case 'category': {
                const catA = cardA.getAttribute('data-category') || '';
                const catB = cardB.getAttribute('data-category') || '';
                return catA.localeCompare(catB);
            }
            case 'time':
            default:
                // Keep original order (already sorted by time in HTML)
                return 0;
        }
    });

    // Re-append sorted cards
    cards.forEach(card => container.appendChild(card));
    
    // Save sort preference
    vscode.postMessage({
        command: 'saveFilterState',
        state: {
            sortBy: sortBy
        }
    });
}

function handleCopyMatchedText(event: Event) {
    const button = event.currentTarget as HTMLElement;
    const text = button.getAttribute('data-text');
    
    if (text) {
        // Use the Clipboard API through VS Code
        navigator.clipboard.writeText(text).then(() => {
            // Visual feedback - change icon temporarily
            const icon = button.querySelector('.codicon');
            if (icon) {
                icon.classList.remove('codicon-copy');
                icon.classList.add('codicon-check');
                
                setTimeout(() => {
                    icon.classList.remove('codicon-check');
                    icon.classList.add('codicon-copy');
                }, 1500);
            }
        }).catch(err => {
            console.error('Failed to copy text:', err);
        });
    }
}

function handleExportAnnotations() {
    // Prepare export data
    const exportData = {
        exportDate: new Date().toISOString(),
        totalAnnotations: currentAnnotations.length,
        annotations: currentAnnotations.map(ann => ({
            category: ann.category,
            patternName: ann.patternName,
            severity: ann.severity,
            logLevel: ann.logLevel,
            timestamp: ann.timestamp,
            filePath: ann.filePath,
            lineNumber: ann.lineNumber,
            matchedText: ann.matchedText,
            rawLogLine: ann.rawLogLine,
            extractedFields: ann.extractedFields,
            severityTrigger: ann.severityTrigger,
            internalNotes: ann.internalNotes
        }))
    };

    // Send to extension to save as file
    vscode.postMessage({
        command: 'exportAnnotations',
        data: exportData
    });
}

function handleTimeRangeChange() {
    // Deprecated - replaced by dual slider
}

function handleClearTimeRange() {
    // Deprecated - replaced by dual slider
}

/**
 * Handle dual slider changes
 */
/**
 * Handle time filter button clicks (5m, 30m, 1h, 6h, 24h, All)
 */
function handleTimeFilterClick(event: Event) {
    const button = event.currentTarget as HTMLElement;
    const minutes = parseInt(button.getAttribute('data-minutes') || '0', 10);
    
    // Remove active state from all time filter buttons
    document.querySelectorAll('.time-filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add active state to clicked button
    button.classList.add('active');
    
    if (minutes === 0) {
        // "All" button - clear time filter
        timeRangeStart = null;
        timeRangeEnd = null;
    } else {
        // Calculate time range
        const now = new Date();
        const start = new Date(now.getTime() - minutes * 60 * 1000);
        
        timeRangeStart = start;
        timeRangeEnd = now;
    }
    
    // Re-apply all filters
    handleFilterChange();
}

/**
 * Set time range inputs to the start and end of available annotations
 */
function setTimeRangeFromAnnotations(annotations: any[]) {
    if (annotations.length === 0) return;
    
    const timestamps = annotations
        .map(a => new Date(a.timestamp))
        .filter(d => !isNaN(d.getTime()))
        .sort((a, b) => a.getTime() - b.getTime());
    
    if (timestamps.length === 0) return;
    
    const startTime = timestamps[0];
    const endTime = timestamps[timestamps.length - 1];
    
    // Store log time boundaries
    logMinTime = startTime.getTime();
    logMaxTime = endTime.getTime();
    
    // Reset time filter to show all by default
    timeRangeStart = null;
    timeRangeEnd = null;
}

function handleToggleMinimap() {
    minimapVisible = !minimapVisible;
    const minimapContainer = document.getElementById('minimap-container');
    const toggleBtn = document.getElementById('toggle-minimap-btn');
    
    if (minimapContainer) {
        minimapContainer.style.display = minimapVisible ? 'flex' : 'none';
    }
    
    if (toggleBtn) {
        if (minimapVisible) {
            toggleBtn.classList.add('active');
        } else {
            toggleBtn.classList.remove('active');
        }
    }
    
    // Save preference
    vscode.postMessage({
        command: 'saveFilterState',
        state: {
            minimapVisible: minimapVisible
        }
    });
}

function handleToggleMinimapMode() {
    minimapMode = minimapMode === 'filter' ? 'range' : 'filter';
    
    const modeText = document.getElementById('minimap-mode-text');
    const toggleBtn = document.getElementById('toggle-minimap-mode');
    
    if (modeText) {
        modeText.textContent = minimapMode === 'filter' ? 'Filter' : 'Range';
    }
    
    if (toggleBtn) {
        const icon = toggleBtn.querySelector('.codicon');
        if (icon) {
            icon.className = minimapMode === 'filter' ? 'codicon codicon-filter' : 'codicon codicon-timeline-view';
        }
    }
    
    // Re-render minimap with new mode
    handleFilterChange();
}

/**
 * Virtual scrolling for large result sets (100+ annotations)
 * Only renders cards that are visible in the viewport
 */
function renderWithVirtualScroll(annotations: any[], container: HTMLElement) {
    const cardHeight = 250; // Approximate height of a card in pixels
    const viewportHeight = window.innerHeight;
    const bufferSize = 10; // Render extra cards above/below viewport
    
    // Create a container with total height to enable scrolling
    const totalHeight = annotations.length * cardHeight;
    const scrollContainer = document.createElement('div');
    scrollContainer.style.height = `${totalHeight}px`;
    scrollContainer.style.position = 'relative';
    scrollContainer.id = 'virtual-scroll-container';
    
    // Track which cards are currently rendered
    let currentStartIndex = -1;
    let currentEndIndex = -1;
    
    function updateVisibleCards() {
        const scrollTop = container.scrollTop || window.scrollY || document.documentElement.scrollTop;
        const startIndex = Math.max(0, Math.floor(scrollTop / cardHeight) - bufferSize);
        const endIndex = Math.min(
            annotations.length,
            Math.ceil((scrollTop + viewportHeight) / cardHeight) + bufferSize
        );
        
        // Only re-render if the range changed significantly
        if (startIndex === currentStartIndex && endIndex === currentEndIndex) {
            return;
        }
        
        currentStartIndex = startIndex;
        currentEndIndex = endIndex;
        
        // Clear existing cards
        scrollContainer.innerHTML = '';
        
        // Render only visible cards
        for (let i = startIndex; i < endIndex; i++) {
            const annotation = annotations[i];
            if (!annotation) continue;
            
            const card = createAnnotationCard(annotation);
            
            // Position card absolutely at correct offset
            card.style.position = 'absolute';
            card.style.top = `${i * cardHeight}px`;
            card.style.left = '0';
            card.style.right = '0';
            card.style.width = 'calc(100% - 8px)';
            card.style.margin = '0 4px';
            
            renderedCards.set(annotation.id, card);
            scrollContainer.appendChild(card);
        }
        
        // Re-initialize event listeners
        initializeCardEventListeners();
        
        // Re-apply filters to newly rendered cards
        handleFilterChange();
    }
    
    // Initial render
    container.appendChild(scrollContainer);
    updateVisibleCards();
    
    // Update on scroll (with throttling) 
    let scrollTimeout: any = null;
    const handleScroll = () => {
        if (scrollTimeout) {
            clearTimeout(scrollTimeout);
        }
        scrollTimeout = setTimeout(updateVisibleCards, 50);
    };
    
    window.addEventListener('scroll', handleScroll);
    container.addEventListener('scroll', handleScroll);
}

/**
 * Render minimap visualization of annotation distribution
 */
function renderMinimap(filteredAnnotations: any[]) {
    const minimapCanvas = document.getElementById('minimap-canvas');
    if (!minimapCanvas) return;
    
    // Clear existing markers
    minimapCanvas.innerHTML = '';
    
    // Determine which annotations to show based on mode
    const annotationsToShow = minimapMode === 'filter' ? filteredAnnotations : currentAnnotations;
    
    if (annotationsToShow.length === 0) return;
    
    // Use time-based positioning instead of line numbers
    const timestamps = annotationsToShow
        .map(a => new Date(a.timestamp).getTime())
        .filter(t => !isNaN(t))
        .sort((a, b) => a - b);
    
    if (timestamps.length === 0) return;
    
    const minTime = timestamps[0];
    const maxTime = timestamps[timestamps.length - 1];
    const timeRange = maxTime - minTime || 1;
    
    // If in range mode and time filter is active, draw the range overlay
    if (minimapMode === 'range' && (timeRangeStart || timeRangeEnd)) {
        const rangeOverlay = document.createElement('div');
        rangeOverlay.className = 'minimap-range-overlay';
        
        const startTime = timeRangeStart ? timeRangeStart.getTime() : minTime;
        const endTime = timeRangeEnd ? timeRangeEnd.getTime() : maxTime;
        
        const startPercent = ((startTime - minTime) / timeRange) * 100;
        const endPercent = ((endTime - minTime) / timeRange) * 100;
        
        rangeOverlay.style.top = `${startPercent}%`;
        rangeOverlay.style.height = `${endPercent - startPercent}%`;
        
        minimapCanvas.appendChild(rangeOverlay);
    }
    
    // Create markers for each annotation
    annotationsToShow.forEach(annotation => {
        const timestamp = new Date(annotation.timestamp).getTime();
        if (isNaN(timestamp)) return;
        
        const marker = document.createElement('div');
        
        // In range mode, dim markers outside the time range
        const isInRange = minimapMode === 'filter' || 
                          (!timeRangeStart || timestamp >= timeRangeStart.getTime()) &&
                          (!timeRangeEnd || timestamp <= timeRangeEnd.getTime());
        
        marker.className = `minimap-marker ${annotation.severity}${isInRange ? '' : ' dimmed'}`;
        marker.setAttribute('data-id', annotation.id);
        marker.title = `${annotation.severity.toUpperCase()}: ${annotation.patternName}`;
        
        // Calculate position as percentage based on time
        const position = ((timestamp - minTime) / timeRange) * 100;
        marker.style.top = `${position}%`;
        
        // Click to scroll to annotation
        marker.addEventListener('click', () => {
            const card = document.querySelector(`[data-id="${annotation.id}"]`);
            if (card) {
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Highlight card briefly
                card.classList.add('highlight');
                setTimeout(() => card.classList.remove('highlight'), 2000);
            }
        });
        
        minimapCanvas.appendChild(marker);
    });
    
    // Make the entire canvas clickable to jump to that position
    minimapCanvas.addEventListener('click', (e) => {
        const rect = minimapCanvas.getBoundingClientRect();
        const clickY = e.clientY - rect.top;
        const percentage = clickY / rect.height;
        
        // Calculate scroll position
        const annotationsList = document.getElementById('annotations-list');
        if (annotationsList) {
            const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
            const targetScroll = scrollHeight * percentage;
            window.scrollTo({ top: targetScroll, behavior: 'smooth' });
        }
    });
    
    // Add viewport indicator
    updateMinimapViewport();
}

/**
 * Update minimap viewport indicator based on scroll position
 */
function updateMinimapViewport() {
    const minimapCanvas = document.getElementById('minimap-canvas');
    if (!minimapCanvas) return;
    
    // Remove existing viewport indicator
    const existingViewport = minimapCanvas.querySelector('.minimap-viewport');
    if (existingViewport) {
        existingViewport.remove();
    }
    
    // Calculate viewport position
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const viewportHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    
    if (documentHeight <= viewportHeight) return; // No scroll needed
    
    const viewportStart = (scrollTop / documentHeight) * 100;
    const viewportSize = (viewportHeight / documentHeight) * 100;
    
    // Create viewport indicator
    const viewport = document.createElement('div');
    viewport.className = 'minimap-viewport';
    viewport.style.top = `${viewportStart}%`;
    viewport.style.height = `${viewportSize}%`;
    
    minimapCanvas.appendChild(viewport);
}

// Update viewport indicator on scroll
window.addEventListener('scroll', () => {
    if (currentAnnotations.length > 0) {
        updateMinimapViewport();
    }
});
