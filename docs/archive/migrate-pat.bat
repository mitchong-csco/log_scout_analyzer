@echo off
REM Git Migration using Personal Access Token (HTTPS)

echo ============================================================
echo Git Migration to mitchong-csco (Using PAT)
echo ============================================================
echo.

echo Current remote:
git remote -v
echo.

echo Updating remote to HTTPS...
git remote set-url origin https://github.com/mitchong-csco/log_scout_analyzer.git

echo.
echo New remote:
git remote -v
echo.

echo ============================================================
echo Now pushing branches...
echo ============================================================
echo.
echo When prompted for username: mitchong-csco
echo When prompted for password: paste your Personal Access Token
echo.
pause

echo Pushing feature/pattern-overrides...
git push -u origin feature/pattern-overrides

echo.
echo Pushing master...
git push -u origin master

echo.
echo ============================================================
echo Done! Both branches pushed.
echo ============================================================
pause
