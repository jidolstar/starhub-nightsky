@echo off
echo [1/3] Updating version (patch level)...
call npm version patch --no-git-tag-version

echo [2/3] Building and deploying via gh-pages...
call npm run deploy
if %errorlevel% equ 0 (
    echo SUCCESS! Access your site at: https://jidolstar.github.io/starhub-nightsky/
) else (
    echo FAILED. Please check the logs.
)
pause
