@echo off
setlocal
set ROOT=%~dp0

rem Ensure local workspace binaries are preferred
set PATH=%ROOT%node_modules\.bin;%ROOT%;%PATH%

call "%ROOT%node_modules\.bin\oh-my-opencode.cmd" %*
