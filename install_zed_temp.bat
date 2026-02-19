@echo off
set ZED_DIR=%LOCALAPPDATA%Zedextensionsinstalledlog-scout-analyzer
if exist %ZED_DIR% rmdir /s /q %ZED_DIR%
mkdir %ZED_DIR%
xcopy /E /I /Y zed-extension %ZED_DIR% ^
if errorlevel 0 echo Zed extension installed successfully!
