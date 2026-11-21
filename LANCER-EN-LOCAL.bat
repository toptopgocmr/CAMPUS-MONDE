@echo off
chcp 65001 >nul
title Campus Monde - serveur local PHP / MySQL
cd /d "%~dp0"

rem --- Recherche de PHP : WampServer, puis XAMPP, puis PATH ---
set "PHP="
for /d %%D in ("C:\wamp64\bin\php\php*") do if exist "%%D\php.exe" set "PHP=%%D\php.exe"
if not defined PHP for /d %%D in ("C:\wamp\bin\php\php*") do if exist "%%D\php.exe" set "PHP=%%D\php.exe"
if not defined PHP if exist "C:\xampp\php\php.exe" set "PHP=C:\xampp\php\php.exe"
if not defined PHP set "PHP=php"

"%PHP%" -r "exit(PHP_VERSION_ID>=80100?0:1);" >nul 2>nul
if errorlevel 1 (
  echo [ERREUR] PHP 8.1 ou plus recent est introuvable.
  echo Dans WampServer, installe ou active une version PHP 8.1+ puis relance ce fichier.
  pause
  exit /b 1
)
"%PHP%" -r "exit(extension_loaded('pdo_mysql')?0:1);" >nul 2>nul
if errorlevel 1 (
  echo [ERREUR] L'extension pdo_mysql n'est pas activee pour %PHP%
  echo Ouvre le php.ini de ce dossier et retire le ; devant la ligne extension=pdo_mysql
  pause
  exit /b 1
)

echo.
echo  PHP utilise : %PHP%
echo  Avant de continuer : WampServer doit etre lance (icone VERTE pres de l'horloge).
echo.
echo  Site public      : http://localhost:8000
echo  Espace etudiant  : http://localhost:8000  (bouton Connexion)
echo  Administration   : http://localhost:8000/#admin
echo  Les codes de verification et MFA s'affichent ci-dessous.
echo  Pour arreter : Ctrl+C
echo.
start "" cmd /c "timeout /t 3 >nul & start http://localhost:8000"
"%PHP%" -d upload_max_filesize=6M -d post_max_size=8M -S localhost:8000 -t public public\index.php
pause
