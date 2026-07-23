@echo off
setlocal
rem ============================================================================
rem  build-setup.bat  --  compila el instalador REX MMORPG con Inno Setup 6.
rem ============================================================================
rem  Uso (en Windows):
rem    build-setup.bat                        origen = "REX MU Online\" al lado
rem    build-setup.bat "C:\ruta\ClientFile"   origen = esa carpeta del cliente
rem
rem  Requiere Inno Setup 6 (https://jrsoftware.org/isdl.php). Para que el .exe
rem  del instalador corra en Windows XP, usar Inno 5.6.1 (el juego igual corre
rem  en XP; esto es solo para el instalador).
rem ============================================================================

set "ISS=%~dp0REX-MU-Online.iss"

rem --- Localizar ISCC.exe ------------------------------------------------------
set "ISCC=%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe"
if not exist "%ISCC%" set "ISCC=%ProgramFiles%\Inno Setup 6\ISCC.exe"
if not exist "%ISCC%" (
  echo [ERROR] No se encontro ISCC.exe. Instalar Inno Setup 6:
  echo         https://jrsoftware.org/isdl.php
  exit /b 1
)

rem --- Compilar ---------------------------------------------------------------
if "%~1"=="" (
  echo [build-setup] Origen: "REX MU Online\" al lado del .iss
  "%ISCC%" "%ISS%"
) else (
  echo [build-setup] Origen: %~1
  "%ISCC%" /DSrcDir="%~1" "%ISS%"
)

if errorlevel 1 (
  echo [ERROR] La compilacion del instalador fallo.
  exit /b 1
)
echo [OK] Instalador generado en Output\REXSetup100.exe
endlocal
