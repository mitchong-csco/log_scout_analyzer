#!/bin/bash
# Add logging to the extension

cp src/lib.rs src/lib.rs.backup

# Add logging to the new() method
sed -i '28a\        eprintln!("=== LOG SCOUT ANALYZER EXTENSION LOADING ===");\n        eprintln!("Extension initialized successfully");\n        eprintln!("Version: 0.1.0");\n        eprintln!("===========================================");' src/lib.rs

# Add logging to language_server_command
sed -i '/fn language_server_command/a\        eprintln!("[LOG SCOUT] language_server_command called");' src/lib.rs

# Add logging to load_patterns_from_worktree  
sed -i '/fn load_patterns_from_worktree/a\        eprintln!("[LOG SCOUT] Loading patterns from worktree");' src/lib.rs

echo "Logging added to extension"
