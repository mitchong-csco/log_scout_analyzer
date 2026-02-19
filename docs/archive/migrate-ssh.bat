@echo off
REM Git Migration - Push Both Branches (Using SSH Alias)

echo ============================================================
echo Git Repository Migration to mitchong-csco
echo ============================================================
echo.

echo Local branches:
git branch
echo.

echo Current remote:
git remote -v
echo.

REM Hardcode the remote for mitchong-csco
set REMOTE=git@git-csco:mitchong-csco/log_scout_analyzer.git

echo.
echo Updating remote to: %REMOTE%
git remote set-url origin %REMOTE%

echo.
echo New remote:
git remote -v
echo.

echo Testing SSH connection...
ssh -T git@git-csco

echo.
echo Pushing feature/pattern-overrides...
git push -u origin feature/pattern-overrides

echo.
echo Pushing master...
git push -u origin master

echo.
echo ============================================================
echo Success! Both branches pushed to mitchong-csco
echo ============================================================
pause
