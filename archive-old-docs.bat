@echo off
REM Archive old session and status documentation files
REM Created: 2025-02-24
REM Purpose: Move old technical status files to archive, keep user-focused docs in root

echo ========================================
echo Archive Old Documentation Script
echo ========================================
echo.
echo This will move old session/status files to archive/sessions/
echo User-focused files (USER_SCENARIOS.md, PROJECT_STATUS.md) stay in root
echo.
pause

REM Create archive directories if they don't exist
if not exist "archive\sessions" mkdir "archive\sessions"
if not exist "archive\status" mkdir "archive\status"

echo.
echo Moving session summaries...
move /Y SESSION_*.md archive\sessions\ 2>nul
move /Y *_SESSION_*.md archive\sessions\ 2>nul

echo.
echo Moving phase documentation...
move /Y PHASE*.md archive\sessions\ 2>nul

echo.
echo Moving completion summaries...
move /Y *_COMPLETE*.md archive\sessions\ 2>nul
move /Y COMPLETE_*.md archive\sessions\ 2>nul
move /Y FULLY_*.md archive\sessions\ 2>nul

echo.
echo Moving fix/bug documentation...
move /Y FIX_*.md archive\sessions\ 2>nul
move /Y *_FIX*.md archive\sessions\ 2>nul
move /Y FIXES_*.md archive\sessions\ 2>nul

echo.
echo Moving build documentation...
move /Y BUILD_*.md archive\sessions\ 2>nul
move /Y *_BUILD_*.md archive\sessions\ 2>nul

echo.
echo Moving deployment documentation...
move /Y DEPLOY*.md archive\sessions\ 2>nul
move /Y *_DEPLOY*.md archive\sessions\ 2>nul

echo.
echo Moving status reports...
move /Y STATUS_*.md archive\status\ 2>nul
move /Y *_STATUS*.md archive\status\ 2>nul
move /Y CURRENT_STATUS*.md archive\status\ 2>nul

echo.
echo Moving TODO and task documentation...
move /Y TODO_*.md archive\sessions\ 2>nul
move /Y TASK_*.md archive\sessions\ 2>nul

echo.
echo Moving summary documentation...
move /Y SUMMARY_*.md archive\sessions\ 2>nul
move /Y *_SUMMARY*.md archive\sessions\ 2>nul
move /Y TODAYS_*.md archive\sessions\ 2>nul

echo.
echo Moving review documentation...
move /Y REVIEW_*.md archive\sessions\ 2>nul
move /Y *_REVIEW*.md archive\sessions\ 2>nul

echo.
echo Moving implementation documentation...
move /Y IMPLEMENTATION_*.md archive\sessions\ 2>nul
move /Y *_IMPLEMENTATION*.md archive\sessions\ 2>nul

echo.
echo Moving feature-specific documentation...
move /Y BUNDLE_*.md archive\sessions\ 2>nul
move /Y CISCO_*.md archive\sessions\ 2>nul
move /Y RTMT_*.md archive\sessions\ 2>nul
move /Y ADAPTIVE_*.md archive\sessions\ 2>nul
move /Y ASYNC_*.md archive\sessions\ 2>nul
move /Y AUTO_*.md archive\sessions\ 2>nul
move /Y BACKWARD_*.md archive\sessions\ 2>nul
move /Y BINARY_*.md archive\sessions\ 2>nul
move /Y BOTH_*.md archive\sessions\ 2>nul
move /Y COMMAND_*.md archive\sessions\ 2>nul
move /Y COMMIT_*.md archive\sessions\ 2>nul
move /Y COMPATIBILITY_*.md archive\sessions\ 2>nul
move /Y CTRACE_*.md archive\sessions\ 2>nul
move /Y DATA_*.md archive\sessions\ 2>nul
move /Y DIAGRAM_*.md archive\sessions\ 2>nul
move /Y DUAL_*.md archive\sessions\ 2>nul
move /Y DYNAMIC_*.md archive\sessions\ 2>nul
move /Y ENHANCED_*.md archive\sessions\ 2>nul
move /Y EXTRACTION_*.md archive\sessions\ 2>nul
move /Y ICON_*.md archive\sessions\ 2>nul
move /Y IMPORT_*.md archive\sessions\ 2>nul
move /Y INTEGRATION_*.md archive\sessions\ 2>nul
move /Y INTELLIGENT_*.md archive\sessions\ 2>nul
move /Y LEARNING_*.md archive\sessions\ 2>nul
move /Y MISSING_*.md archive\sessions\ 2>nul
move /Y MULTIPLE_*.md archive\sessions\ 2>nul
move /Y NESTED_*.md archive\sessions\ 2>nul
move /Y NOTIFICATION_*.md archive\sessions\ 2>nul
move /Y PACKAGE_*.md archive\sessions\ 2>nul
move /Y QCSONE_*.md archive\sessions\ 2>nul
move /Y TDD_*.md archive\sessions\ 2>nul
move /Y UNIFIED_*.md archive\sessions\ 2>nul
move /Y UX_*.md archive\sessions\ 2>nul
move /Y VALIDATION_*.md archive\sessions\ 2>nul
move /Y VERIFICATION_*.md archive\sessions\ 2>nul
move /Y VERSION_*.md archive\sessions\ 2>nul
move /Y VISUAL_*.md archive\sessions\ 2>nul
move /Y VSCODE_*.md archive\sessions\ 2>nul
move /Y VSIX_*.md archive\sessions\ 2>nul
move /Y WEBPACK_*.md archive\sessions\ 2>nul
move /Y WORKSPACE_*.md archive\sessions\ 2>nul
move /Y ZED_*.md archive\sessions\ 2>nul

echo.
echo Moving quick reference documentation...
move /Y QUICK_*.md archive\sessions\ 2>nul
move /Y *_QUICK_*.md archive\sessions\ 2>nul

echo.
echo Moving emoji-prefixed files...
move /Y ✅*.md archive\sessions\ 2>nul
move /Y 🎉*.md archive\sessions\ 2>nul
move /Y 🚀*.md archive\sessions\ 2>nul

echo.
echo Moving miscellaneous technical docs...
move /Y ARCHIVE_*.md archive\sessions\ 2>nul
move /Y BEFORE_AFTER_*.md archive\sessions\ 2>nul
move /Y CALL-*.md archive\sessions\ 2>nul
move /Y DEMONSTRATION_*.md archive\sessions\ 2>nul
move /Y DELIVERY_*.md archive\sessions\ 2>nul
move /Y E2E_STATUS*.md archive\sessions\ 2>nul
move /Y EXAMPLE_*.md archive\sessions\ 2>nul
move /Y EXTENSION_*.md archive\sessions\ 2>nul
move /Y FINAL_*.md archive\sessions\ 2>nul
move /Y FORMAT_*.md archive\sessions\ 2>nul
move /Y GIT_*.md archive\sessions\ 2>nul
move /Y GITHUB_*.md archive\sessions\ 2>nul
move /Y HYBRID_*.md archive\sessions\ 2>nul
move /Y INDEX_*.md archive\sessions\ 2>nul
move /Y MARKDOWN_*.md archive\sessions\ 2>nul
move /Y MIGRATION_*.md archive\sessions\ 2>nul
move /Y NPM_*.md archive\sessions\ 2>nul
move /Y PATH_C*.md archive\sessions\ 2>nul
move /Y ROOT_CAUSE*.md archive\sessions\ 2>nul
move /Y STATUS_BAR*.md archive\sessions\ 2>nul
move /Y TESTS_NEEDED*.md archive\sessions\ 2>nul
move /Y UNDOCUMENTED_*.md archive\sessions\ 2>nul
move /Y USING_*.md archive\sessions\ 2>nul

echo.
echo ========================================
echo Archive complete!
echo ========================================
echo.
echo Old documentation moved to:
echo   - archive\sessions\  (session summaries, features)
echo   - archive\status\    (status reports)
echo.
echo Files kept in root:
echo   - USER_SCENARIOS.md     (master scenario list)
echo   - PROJECT_STATUS.md     (current status)
echo   - README.md             (project overview)
echo   - E2E_TEST_SCENARIOS.md (test specifications)
echo   - E2E_TEST_AUDIT_USER_PERSPECTIVE.md (test audit)
echo   - ROADMAP.md            (future plans)
echo.
pause
