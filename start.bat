@echo off
title Solutions Plan B — CRM

:: Vérifier si Node.js est installé
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  [ERREUR] Node.js n'est pas installe.
    echo  Telecharge-le sur : https://nodejs.org   ^(version LTS recommandee^)
    echo.
    pause
    exit /b 1
)

:: Aller dans le dossier du script
cd /d "%~dp0"

:: Installer les dependances si node_modules est absent
if not exist "node_modules\" (
    echo.
    echo  Installation des dependances ^(premiere fois seulement^)...
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo  [ERREUR] npm install a echoue.
        pause
        exit /b 1
    )
)

:: Ouvrir le navigateur apres un court delai
start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:5173"

:: Demarrer le serveur
echo.
echo  Solutions Plan B CRM — demarrage...
echo  Ouvre ton navigateur sur : http://localhost:5173
echo.
echo  Appuie sur Ctrl+C pour arreter.
echo.
call npm run dev
