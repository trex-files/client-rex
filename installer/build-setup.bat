@echo off
setlocal
rem ============================================================================
rem  build-setup.bat  --  compila el instalador REX MMORPG con Inno Setup 6.
rem ============================================================================
rem  Uso (en Windows, desde un checkout de la branch release):
rem    build-setup.bat                        origen = ..\ClientFile (default)
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

rem --- Guard anti-puntero-LFS -------------------------------------------------
rem  Si el cliente se checkouteo sin 'git lfs pull', Launcher.exe/Main.exe son
rem  punteros de texto (~130 bytes) en vez de los binarios reales -> instalador
rem  roto. Verificar Main.exe antes de compilar.
if "%~1"=="" (set "SRC=%~dp0..\ClientFile") else (set "SRC=%~1")
if not exist "%SRC%\Main.exe" (
  echo [ERROR] No se encuentra "%SRC%\Main.exe". Revisa la ruta del cliente.
  exit /b 1
)
for %%A in ("%SRC%\Main.exe") do set "MAINSZ=%%~zA"
if %MAINSZ% LSS 1000000 (
  echo [ERROR] Main.exe pesa %MAINSZ% bytes = puntero Git LFS, no el binario real.
  echo         Corre  git lfs pull  en el checkout de release y volve a intentar.
  exit /b 1
)

rem --- Aviso: strays sin trackear que se EMPAQUETARIAN --------------------------
rem  Inno copia toda la carpeta; un archivo suelto (ej. Main.rar) que no este en
rem  git se cuela en el instalador. Avisar (no bloquear) si los hay.
where git >nul 2>&1
if not errorlevel 1 (
  git -C "%SRC%" ls-files --others --exclude-standard > "%TEMP%\_rexstrays.txt" 2>nul
  for %%A in ("%TEMP%\_rexstrays.txt") do if %%~zA GTR 0 (
    echo [AVISO] Archivos SIN TRACKEAR en el cliente que se empaquetarian:
    type "%TEMP%\_rexstrays.txt"
    echo         Borralos ^(o revisa 'git status' / 'git clean -nxd'^) antes de distribuir.
  )
  del "%TEMP%\_rexstrays.txt" >nul 2>&1
)

rem --- Compilar ---------------------------------------------------------------
if "%~1"=="" (
  echo [build-setup] Origen: ..\ClientFile
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
