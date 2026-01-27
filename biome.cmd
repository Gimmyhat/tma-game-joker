@echo off
setlocal
set SCRIPT_DIR=%~dp0

call "%SCRIPT_DIR%node_modules\\.bin\\biome.cmd" %*
