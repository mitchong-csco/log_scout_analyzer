# Tests Needed: Action Panel Empty State Handling

## 🎯 Overview

**Current Status**: ❌ **NO TESTS EXIST** for `ScoutAnalyzerPanel` or Action Panel functionality

**What needs testing**: Empty state handling, lifecycle states, and data provider integration

---

## 📊 Test Coverage Gaps

### Files Without Tests

1. **`vscode-extension/src/scoutAnalyzerPanel.ts`** (2,093 lines)
   - ❌ No unit tests
   - ❌ No integration tests
   - ❌ No UI tests
   - **Coverage**: 0%

2. **Action Panel Webview** (embedded HTML/JavaScript)
   - ❌ No tests for message handling
   - ❌ No tests for empty state rendering
   - ❌ No tests for error state rendering
   - **Coverage**: 0%

---

## 🧪 Required Test Suites

### Suite 1: Unit Tests - State Logic

**File**: `vscode-extension/src/test/suite/unit/scoutAnalyzerPanel.test.ts`

**Purpose**: Test state determination logic without launching VS Code

```typescript
suite('ScoutAnalyzerPanel - Unit Tests', () => {
  
  suite('_sendCurrentResults() State Logic', () => {
    
    test('Should send initial state when provider not set', () => {
      // Arrange: No provider set
      ScoutAnalyzerPanel.setDataProvider(undefined);
      
      // Act: Call _sendCurrentResults()
      const messages = captureMessages();
      
      // Assert: Should send emptyState, not error
      assert.strictEqual(messages[0].command, 'emptyState');
      assert.strictEqual(messages[0].state, 'initial');
      assert.strictEqual(messages[0].icon, '🔍');
      assert.strictEqual(messages[0].title, 'Ready to Analyze');
      assert.ok(!messages[0].error, 'Should not have error field');
    });
    
    test('Should send empty results state when no results', () => {
      // Arrange: Provider set but no results
      const mockProvider = {
        getResults: () => []
      };
      ScoutAnalyzerPanel.setDataProvider(mockProvider);
      
      // Act
      const messages = captureMessages();
      
      // Assert
      assert.strictEqual(messages[0].command, 'emptyState');
      assert.strictEqual(messages[0].state, 'no-results');
      assert.strictEqual(messages[0].icon, '✨');
      assert.strictEqual(messages[0].title, 'No Issues Found');
      assert.ok(!messages[0].error, 'Should not have error field');
    });
    
    test('Should send results data when has results', () => {
      // Arrange: Provider with results
      const mockResults = [
        { severity: 'error', message: 'Test error', line: 1 }
      ];
      const mockProvider = {
        getResults: () => mockResults
      };
      ScoutAnalyzerPanel.setDataProvider(mockProvider);
      
      // Act
      const messages = captureMessages();
      
      // Assert
      assert.strictEqual(messages[0].command, 'resultsData');
      assert.strictEqual(messages[0].results.length, 1);
      assert.ok(!messages[0].error, 'Should not have error field');
    });
    
    test('Should NOT send error for empty initial state', () => {
      // This is the bug we're fixing
      ScoutAnalyzerPanel.setDataProvider(undefined);
      
      const messages = captureMessages();
      
      // Assert: Should never see this error message for empty state
      assert.ok(
        !messages[0].error || 
        !messages[0].error.includes('No data provider available'),
        'Should not show "No data provider" error for initial state'
      );
    });
  });
  
  suite('setDataProvider()', () => {
    
    test('Should accept provider and refresh panel', () => {
      const mockProvider = { getResults: () => [] };
      
      ScoutAnalyzerPanel.setDataProvider(mockProvider);
      
      // Should be accessible
      assert.ok(ScoutAnalyzerPanel.resultsDataProvider);
    });
    
    test('Should refresh open panel when provider set', () => {
      // TODO: Test that _update() is called when panel is open
    });
  });
});
```

---

### Suite 2: Integration Tests - VS Code API

**File**: `vscode-extension/src/test/suite/integration/actionPanel.test.ts`

**Purpose**: Test Action Panel in real VS Code Extension Host

```typescript
import * as vscode from 'vscode';
import * as assert from 'assert';

suite('Action Panel - Integration Tests', () => {
  
  suite('Command Registration', () => {
    
    test('openActionPanel command should be registered', async () => {
      const commands = await vscode.commands.getCommands();
      assert.ok(
        commands.includes('logScoutAnalyzer.openActionPanel'),
        'Command should be registered'
      );
    });
    
    test('Command should execute without error', async () => {
      await assert.doesNotReject(
        vscode.commands.executeCommand('logScoutAnalyzer.openActionPanel'),
        'Command should not throw'
      );
    });
  });
  
  suite('Lifecycle States', () => {
    
    test('Should handle initial state (no files open)', async () => {
      // Close all editors
      await vscode.commands.executeCommand('workbench.action.closeAllEditors');
      
      // Open action panel
      await vscode.commands.executeCommand('logScoutAnalyzer.openActionPanel');
      
      // Panel should open without errors
      // Should show "Ready to Analyze" state
      // TODO: Capture webview messages to verify
    });
    
    test('Should handle empty results state (clean log)', async () => {
      // Open a log file with no issues
      const cleanLogUri = vscode.Uri.file('/test/fixtures/clean.log');
      await vscode.workspace.openTextDocument(cleanLogUri);
      
      // Wait for analysis
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Open action panel
      await vscode.commands.executeCommand('logScoutAnalyzer.openActionPanel');
      
      // Should show "No Issues Found" state
    });
    
    test('Should handle active state (log with errors)', async () => {
      // Open a log file with errors
      const errorLogUri = vscode.Uri.file('/test/fixtures/errors.log');
      await vscode.workspace.openTextDocument(errorLogUri);
      
      // Wait for analysis
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Open action panel
      await vscode.commands.executeCommand('logScoutAnalyzer.openActionPanel');
      
      // Should show results
    });
  });
  
  suite('Data Provider Integration', () => {
    
    test('Should connect to resultsTreeProvider', async () => {
      // Verify that setDataProvider was called during activation
      // TODO: Access extension state to verify connection
    });
    
    test('Should receive updates when results change', async () => {
      // Open panel
      await vscode.commands.executeCommand('logScoutAnalyzer.openActionPanel');
      
      // Open log file (triggers analysis)
      const logUri = vscode.Uri.file('/test/fixtures/test.log');
      await vscode.workspace.openTextDocument(logUri);
      
      // Wait for analysis
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Panel should receive updated results
    });
  });
});
```

---

### Suite 3: UI Component Tests - Webview

**File**: `vscode-extension/src/test/suite/ui/actionPanelWebview.test.ts`

**Purpose**: Test webview message handling and rendering

```typescript
suite('Action Panel Webview - UI Tests', () => {
  
  suite('Message Handling', () => {
    
    test('Should handle emptyState message', () => {
      const message = {
        command: 'emptyState',
        state: 'initial',
        icon: '🔍',
        title: 'Ready to Analyze',
        message: 'Open a log file to get started',
        helpText: 'Scout Analyzer will automatically detect patterns...',
        actions: [
          { label: 'Open File', command: 'vscode.open' }
        ]
      };
      
      // renderEmptyState(message) should:
      // - Display icon
      // - Display title
      // - Display message
      // - Display help text
      // - Render action buttons
      // - NOT show error styling
    });
    
    test('Should handle resultsData message with empty array', () => {
      const message = {
        command: 'resultsData',
        results: []
      };
      
      // Should still render UI, not show error
    });
    
    test('Should handle resultsData message with data', () => {
      const message = {
        command: 'resultsData',
        results: [
          { severity: 'error', message: 'Test', line: 1 }
        ]
      };
      
      // Should render results table/list
    });
    
    test('Should NOT show error styling for empty states', () => {
      const message = {
        command: 'emptyState',
        state: 'initial'
      };
      
      // CSS should use neutral colors, not error colors
      // Should not have error icon (⚠️ or ❌)
    });
  });
  
  suite('Empty State Rendering', () => {
    
    test('Should render initial state correctly', () => {
      // Icon should be 🔍 or 📂 (welcoming)
      // Title should be "Ready to Analyze"
      // Should have action buttons
      // Should NOT use error colors
    });
    
    test('Should render no-results state correctly', () => {
      // Icon should be ✨ or ✅ (positive)
      // Title should be "No Issues Found"
      // Message should be encouraging
      // Should have help text
    });
    
    test('Should render error state correctly', () => {
      // Icon should be ⚠️ (warning)
      // Should use error styling
      // Should have recovery actions
      // Should be visually distinct from empty states
    });
  });
  
  suite('Action Buttons', () => {
    
    test('Should render action buttons from message', () => {
      const actions = [
        { label: 'Open File', command: 'vscode.open' },
        { label: 'Learn More', command: 'logScoutAnalyzer.showDocs' }
      ];
      
      // Should render 2 buttons
      // Buttons should be clickable
      // Buttons should execute correct commands
    });
    
    test('Should execute VS Code command when action clicked', () => {
      // Click "Open File" button
      // Should post message: { command: 'executeVscodeCommand', vscodeCommand: 'vscode.open' }
    });
  });
});
```

---

### Suite 4: Wiring Tests - Configuration

**File**: Add to `vscode-extension/src/test/suite/wiring.test.ts`

```typescript
suite('Action Panel Wiring', () => {
  
  test('openActionPanel command should be in package.json', () => {
    const commands = packageJson.contributes?.commands || [];
    const cmd = commands.find(c => c.command === 'logScoutAnalyzer.openActionPanel');
    
    assert.ok(cmd, 'Command should be defined');
    assert.ok(cmd.title, 'Command should have title');
  });
  
  test('ScoutAnalyzerPanel class should be imported in extension.ts', () => {
    assert.ok(
      extensionTs.includes('import') && extensionTs.includes('ScoutAnalyzerPanel'),
      'Should import ScoutAnalyzerPanel'
    );
  });
  
  test('setDataProvider should be called during activation', () => {
    assert.ok(
      extensionTs.includes('ScoutAnalyzerPanel.setDataProvider'),
      'Should call setDataProvider during activation'
    );
  });
});
```

---

## 🎯 Test Scenarios by State

### Initial State (No Files Open)

**Test Cases**:
- [ ] Action Panel opens successfully
- [ ] Shows welcoming icon (🔍 or 📂)
- [ ] Shows "Ready to Analyze" title
- [ ] Shows helpful message
- [ ] Shows action buttons (Open File, Learn More)
- [ ] Does NOT show error icon (⚠️ or ❌)
- [ ] Does NOT use error colors
- [ ] Does NOT show "No data provider available" message

**Expected Message**:
```json
{
  "command": "emptyState",
  "state": "initial",
  "icon": "🔍",
  "title": "Ready to Analyze",
  "message": "Open a log file to see analysis results"
}
```

---

### Empty Results State (Clean Log)

**Test Cases**:
- [ ] Opens log file with no errors
- [ ] LSP analyzes file (0 diagnostics)
- [ ] Action Panel shows positive message
- [ ] Shows success/neutral icon (✨ or ✅)
- [ ] Shows "No Issues Found" title
- [ ] Shows encouraging message
- [ ] Does NOT show error styling
- [ ] Provides help text about checking LSP connection

**Expected Message**:
```json
{
  "command": "emptyState",
  "state": "no-results",
  "icon": "✨",
  "title": "No Issues Found",
  "message": "Your log file looks clean!"
}
```

---

### Active State (Has Results)

**Test Cases**:
- [ ] Opens log file with errors
- [ ] LSP analyzes file (N diagnostics)
- [ ] Action Panel shows results
- [ ] Shows results count
- [ ] Shows results table/list
- [ ] Results are interactive
- [ ] No empty state shown

**Expected Message**:
```json
{
  "command": "resultsData",
  "results": [
    { "severity": "error", "message": "...", "line": 1 }
  ]
}
```

---

### Error State (Actual Error)

**Test Cases**:
- [ ] LSP server crashes
- [ ] Action Panel shows error state
- [ ] Shows error icon (⚠️)
- [ ] Uses error styling
- [ ] Shows specific error message
- [ ] Provides recovery actions (Reconnect, View Logs)
- [ ] Visually distinct from empty states

**Expected Message**:
```json
{
  "command": "resultsData",
  "results": [],
  "error": "LSP connection lost. Click 'Reconnect' to restore."
}
```

---

## 🚀 Implementation Priority

### Phase 1: Wiring Tests (Fastest - 1 hour)
- [ ] Add wiring tests to verify command registration
- [ ] Verify setDataProvider is called
- [ ] Verify imports are correct

**Why first**: No VS Code launch required, fastest to implement and run

---

### Phase 2: Unit Tests (2-3 hours)
- [ ] Create `scoutAnalyzerPanel.test.ts`
- [ ] Test `_sendCurrentResults()` state logic
- [ ] Test `setDataProvider()` method
- [ ] Mock the provider and verify messages

**Why second**: Tests core logic without full integration overhead

---

### Phase 3: Integration Tests (3-4 hours)
- [ ] Create `actionPanel.test.ts`
- [ ] Test command execution
- [ ] Test lifecycle states with real VS Code
- [ ] Test data provider integration

**Why third**: Requires VS Code launch but tests real integration

---

### Phase 4: UI Component Tests (2-3 hours)
- [ ] Create `actionPanelWebview.test.ts`
- [ ] Test message handling
- [ ] Test empty state rendering
- [ ] Test action button execution

**Why last**: Most complex, requires webview testing infrastructure

---

## 📊 Success Criteria

### Before Tests (Current State)
- ❌ 0% test coverage for Action Panel
- ❌ No automated verification of empty states
- ❌ Bug (showing error for initial state) could regress
- ❌ Manual testing only

### After Tests (Target State)
- ✅ 80%+ test coverage for Action Panel
- ✅ All lifecycle states verified
- ✅ Regression protection for empty state bug
- ✅ Automated CI/CD verification
- ✅ Fast feedback loop (wiring tests in 16ms)

---

## 🔧 Test Infrastructure Needed

### 1. Message Capture Utility
```typescript
// Helper to capture postMessage calls
function captureMessages() {
  const messages = [];
  const originalPostMessage = panel._postMessage;
  panel._postMessage = (msg) => {
    messages.push(msg);
    originalPostMessage.call(panel, msg);
  };
  return messages;
}
```

### 2. Mock Provider
```typescript
// Mock resultsTreeProvider for testing
class MockResultsProvider {
  private results: any[] = [];
  
  setResults(results: any[]) {
    this.results = results;
  }
  
  getResults() {
    return this.results;
  }
}
```

### 3. Test Fixtures
```
vscode-extension/src/test/fixtures/
├── clean.log          (no errors)
├── errors.log         (has errors)
├── warnings.log       (has warnings)
└── empty.log          (empty file)
```

---

## 📝 Related Documentation

- **AI_ASSISTANT_GUIDE.md** - UX/Lifecycle principles
- **UX_FIX_ACTION_PANEL_EMPTY_STATE.md** - Implementation guide
- **UI_TESTING_GUIDE.md** - Testing infrastructure
- **DATA_PROVIDER_ARCHITECTURE.md** - Architecture details

---

## 🎯 Next Steps

1. **Review this test plan** - Confirm scope and priority
2. **Implement Phase 1 (Wiring)** - Fast win, adds some coverage
3. **Implement Phase 2 (Unit)** - Core logic coverage
4. **Implement the UX fix** - Fix the actual bug
5. **Implement Phase 3 & 4** - Full integration coverage

---

**Priority**: High (No test coverage for critical UI component)  
**Effort**: 8-12 hours (all phases)  
**Impact**: High (Regression protection + UX verification)  
**Status**: Specification Complete, Ready to Implement

---

**Created**: 2024-02-22  
**Purpose**: Define test requirements for Action Panel empty state handling  
**Blockers**: None - Infrastructure exists, just need to write tests