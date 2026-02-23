@echo off
echo ========================================
echo Verifying Version Increment Fix
echo ========================================
echo.

cd vscode-extension

echo [TEST 1] Checking current version...
call npm run status | findstr "Extension:"
echo.

echo [TEST 2] Verifying build:all includes version:increment...
node -p "require('./package.json').scripts['build:all'].includes('version:increment') ? '✅ PASS: build:all includes version:increment' : '❌ FAIL: build:all missing version:increment'"
echo.

echo [TEST 3] Verifying package:only exists...
node -p "require('./package.json').scripts['package:only'] ? '✅ PASS: package:only command exists' : '❌ FAIL: package:only missing'"
echo.

echo [TEST 4] Verifying deploy uses package:only...
node -p "require('./package.json').scripts['deploy'].includes('package:only') ? '✅ PASS: deploy uses package:only' : '❌ FAIL: deploy doesnt use package:only'"
echo.

echo [TEST 5] Verifying package doesnt have direct version:increment...
node -p "!require('./package.json').scripts['package'].includes('version:increment &&') ? '✅ PASS: package has no direct version:increment' : '❌ FAIL: package still has direct version:increment'"
echo.

cd ../zed-extension
echo ========================================
echo Checking Zed Extension...
echo ========================================
echo.

echo [TEST 6] Verifying zed build:all includes version:increment...
node -p "require('./package.json').scripts['build:all'].includes('version:increment') ? '✅ PASS: zed build:all includes version:increment' : '❌ FAIL: zed build:all missing version:increment'"
echo.

echo [TEST 7] Verifying zed package:only exists...
node -p "require('./package.json').scripts['package:only'] ? '✅ PASS: zed package:only exists' : '❌ FAIL: zed package:only missing'"
echo.

echo [TEST 8] Verifying zed deploy uses package:only...
node -p "require('./package.json').scripts['deploy'].includes('package:only') ? '✅ PASS: zed deploy uses package:only' : '❌ FAIL: zed deploy doesnt use package:only'"
echo.

cd ..

echo ========================================
echo Verification Complete
echo ========================================
echo.
echo All tests should show ✅ PASS
echo.
echo If all tests passed, the fix is working correctly!
echo Version will now only increment during compilation.
echo.
pause
