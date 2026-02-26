# Scenario 5: Error Recovery ✅

**Status:** ✅ Fully Implemented  
**Priority:** 🔴 Critical  
**User Persona:** Sarah the Cisco UC Engineer  

---

## 📖 User Story

*"As Sarah, when something goes wrong (corrupted file, invalid archive), I get a clear error message and know what to do next."*

---

## 🎯 User Flow

### Primary Flow: Corrupted Archive

1. Sarah tries to import corrupted zip file
2. Extension shows notification: "Archive extraction failed: corrupted data"
3. Notification includes "Try Again" and "Select Different File" buttons
4. Sarah clicks "Select Different File"
5. File picker opens, Sarah selects correct file
6. Import succeeds

### Alternative Flows

**LSP Server Crash:**
- Extension auto-restarts server
- Shows recovery notification
- Continues working transparently

**Invalid File Format:**
- Clear message: "File type not supported: .docx. Expected: .log, .txt, .zip"
- Suggests valid file types

**Permissions Error:**
- Message: "Cannot read file. Check file permissions."
- Provides troubleshooting link

**Network Patterns Unavailable:**
- Falls back to offline cached patterns
- Shows notification: "Using cached patterns (offline mode)"

---

## ✅ Implementation Status

**Status:** ✅ **Fully Implemented**

### Completed Features
- ✅ Graceful error handling (try/catch throughout)
- ✅ User-friendly messages (no stack traces shown)
- ✅ Recovery actions (buttons in notifications)
- ✅ LSP auto-restart (transparent to user)
- ✅ Offline fallback (cached patterns from TagScout)
- ✅ Detailed logging (output panel for debugging)

---

## 🧪 Test Coverage

**Status:** 🚧 **Partial**

- ✅ Error scenarios: Unit tested
- 🚧 Recovery flows: Manual testing
- ❌ E2E error workflows: Not automated

---

## 📚 Documentation

- **Troubleshooting:** See README.md
- **UX Principles:** `.zed/AI_ASSISTANT_GUIDE.md` (UX section)

---

## ⏱️ Time to Complete

**1-2 minutes** (recovery time)

---

## 🔗 Related Scenarios

- **Scenario 1:** Import & Analyze Log Bundle
- **Scenario 9:** Large Bundle Performance

---

**Last Updated:** January 8, 2025