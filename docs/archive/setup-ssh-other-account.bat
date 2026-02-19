@echo off
REM SSH Setup Helper for Other GitHub Account
REM This script helps generate SSH key and configure it

echo ============================================================
echo SSH Setup for Your Other GitHub Account
echo ============================================================
echo.
echo This script will help you:
echo 1. Generate a new SSH key for your other account
echo 2. Display the public key to add to GitHub
echo 3. Create SSH config file
echo.

REM ============================================================
echo Step 1: Generate SSH Key
echo ============================================================
echo.

set /p OTHER_EMAIL="Enter email for your OTHER GitHub account: "

if "%OTHER_EMAIL%"=="" (
    echo ERROR: Email required
    pause
    exit /b 1
)

echo.
echo Generating SSH key for: %OTHER_EMAIL%
echo Key will be saved as: id_ed25519_other
echo.

REM Check if key already exists
if exist "%USERPROFILE%\.ssh\id_ed25519_other" (
    echo.
    echo WARNING: Key already exists at %USERPROFILE%\.ssh\id_ed25519_other
    echo.
    set /p OVERWRITE="Overwrite existing key? (y/n): "
    if /i not "%OVERWRITE%"=="y" (
        echo Cancelled. Using existing key.
        goto :show_public_key
    )
)

echo.
echo Generating key...
echo You will be asked for a passphrase (recommended but optional)
echo.
pause

ssh-keygen -t ed25519 -C "%OTHER_EMAIL%" -f "%USERPROFILE%\.ssh\id_ed25519_other"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Failed to generate SSH key
    echo Make sure you have ssh-keygen installed (comes with Git for Windows)
    pause
    exit /b 1
)

echo.
echo ✓ SSH key generated successfully!
echo.

REM ============================================================
:show_public_key
echo Step 2: Add Public Key to GitHub
echo ============================================================
echo.
echo Your PUBLIC key (copy this to GitHub):
echo ────────────────────────────────────────────────────────────
type "%USERPROFILE%\.ssh\id_ed25519_other.pub"
echo ────────────────────────────────────────────────────────────
echo.

REM Try to copy to clipboard
type "%USERPROFILE%\.ssh\id_ed25519_other.pub" | clip 2>nul
if %ERRORLEVEL% EQU 0 (
    echo ✓ Public key copied to clipboard!
) else (
    echo Copy the key above manually (Ctrl+C)
)

echo.
echo Next steps:
echo 1. Open incognito browser
echo 2. Login to your OTHER GitHub account
echo 3. Go to: https://github.com/settings/keys
echo 4. Click "New SSH key"
echo 5. Title: "Windows - Other Account"
echo 6. Paste the key (already in clipboard!)
echo 7. Click "Add SSH key"
echo.
pause

REM ============================================================
echo Step 3: Create SSH Config File
echo ============================================================
echo.

set CONFIG_FILE=%USERPROFILE%\.ssh\config

REM Create .ssh directory if it doesn't exist
if not exist "%USERPROFILE%\.ssh" mkdir "%USERPROFILE%\.ssh"

REM Check if config file exists
if exist "%CONFIG_FILE%" (
    echo SSH config file already exists
    echo.
    set /p APPEND="Append to existing config? (y/n): "
    if /i not "%APPEND%"=="y" (
        echo Skipping config file update
        goto :test_connection
    )
) else (
    echo Creating new SSH config file
)

echo.
echo Adding configuration for github-other...
echo.

REM Append to config file
(
echo.
echo # Other GitHub account - Auto-generated
echo Host github-other
echo     HostName github.com
echo     User git
echo     IdentityFile ~/.ssh/id_ed25519_other
echo     IdentitiesOnly yes
) >> "%CONFIG_FILE%"

echo ✓ SSH config updated!
echo.
echo Config location: %CONFIG_FILE%
echo.

REM ============================================================
:test_connection
echo Step 4: Test SSH Connection
echo ============================================================
echo.
echo Testing connection to GitHub with your other account...
echo.
echo If this asks "Are you sure you want to continue connecting?"
echo Type: yes
echo.
pause

ssh -T git@github-other

if %ERRORLEVEL% EQU 1 (
    echo.
    echo ✓ Connection successful!
    echo You should see "Hi YOUR-OTHER-USERNAME!"
) else (
    echo.
    echo Connection test complete.
    echo Check the output above to verify your username.
)

echo.

REM ============================================================
echo Summary
echo ============================================================
echo.
echo ✓ SSH key generated: %USERPROFILE%\.ssh\id_ed25519_other
echo ✓ Public key: %USERPROFILE%\.ssh\id_ed25519_other.pub
echo ✓ SSH config: %USERPROFILE%\.ssh\config
echo.
echo ============================================================
echo How to Use:
echo ============================================================
echo.
echo When cloning or adding remote for your OTHER account, use:
echo   git clone git@github-other:YOUR-OTHER-USERNAME/repo.git
echo.
echo Or update existing remote:
echo   git remote set-url origin git@github-other:YOUR-OTHER-USERNAME/repo.git
echo.
echo For your log_scout_analyzer migration:
echo   cd c:\Users\mitchong\code\log_scout_analyzer
echo   git remote set-url origin git@github-other:YOUR-OTHER-USERNAME/log-scout-analyzer.git
echo   git push
echo.
echo ============================================================
echo Next Steps:
echo ============================================================
echo.
echo 1. Make sure you added the SSH key to GitHub (if not done yet)
echo 2. Update your repository remote URL to use github-other
echo 3. Try: git push
echo 4. Should work without password! ✓
echo.

pause
