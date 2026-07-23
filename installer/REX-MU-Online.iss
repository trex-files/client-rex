; ============================================================================
;  REX MMORPG — Instalador del cliente (Inno Setup 6)
; ============================================================================
;  Version canonica de este .iss: Source/8.Tools/Launcher/installer/ (repo).
;  Instala en  C:\Games\REX MMORPG  (MyInstallFolder). El producto/accesos
;  siguen llamandose "REX MU" (MyAppName). El nombre interno del repo
;  (ClientFile) NO se toca: el cliente usa rutas relativas al cwd.
;
;  Cómo compilar (en Windows -- ver installer/README.md para el flujo completo):
;    1) Instalar Inno Setup 6:  https://jrsoftware.org/isdl.php
;       (Para que el INSTALADOR corra en Windows XP, usar Inno 5.6.1; Inno 6
;        requiere Win7+ para el setup. El JUEGO igual corre en XP.)
;    2) Poner una carpeta "REX MU Online\" (checkout de la branch release,
;        client-rex/ClientFile) AL LADO de este .iss + rex.ico, o pasar la
;        ruta con  /DSrcDir="C:\ruta\al\ClientFile".
;    3) build-setup.bat  (o F9 en el IDE, o ISCC.exe REX-MU-Online.iss).
;    4) Sale  Output\REXSetup100.exe  (~2.5 GB).
; ============================================================================

#define MyAppName       "REX MU"
#define MyAppVersion    "1.0.0"
#define MyPublisher     "REX MU"
#define MyAppExe        "Launcher.exe"          ; entry point (el Launcher, NO Main.exe)

; Nombre de la carpeta INSTALADA que ve el usuario (C:\Games\<esto>).
; Independiente del nombre del producto (MyAppName) y del nombre interno del
; repo (ClientFile): el cliente usa rutas relativas al cwd, funciona con
; cualquier nombre de carpeta.
#define MyInstallFolder "REX MMORPG"

; Carpeta del cliente en disco desde la que se empaqueta. Overridable por
; linea de comando: ISCC /DSrcDir="C:\ruta\a\mi\checkout\ClientFile" ...
; Default: una carpeta "REX MU Online" AL LADO de este .iss.
#ifndef SrcDir
  #define SrcDir        "REX MU Online"
#endif

[Setup]
; AppId identifica al producto para upgrades/desinstalación.
; ¡MANTENELO CONSTANTE entre versiones! (si lo cambiás, Windows lo trata como otro producto)
AppId={{B7E3B0B1-9C2A-4E5D-A1F4-1A2B3C4D5E6F}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyPublisher}
VersionInfoVersion={#MyAppVersion}

; --- Dónde se instala -------------------------------------------------------
; IMPORTANTE: NO usar Program Files. El Launcher hace update diferencial
; IN-PLACE; en Program Files Windows bloquea la escritura (UAC/VirtualStore)
; y el updater se rompe. Se instala en C:\Games\REX MU y más abajo
; ([Run] icacls) se abren permisos de escritura para que el updater funcione
; sin pedir admin cada vez.
DefaultDirName={sd}\Games\{#MyInstallFolder}
DisableDirPage=no
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
AllowNoIcons=yes

; Requiere admin UNA vez (para poder instalar fuera de la carpeta de usuario
; y abrir permisos). Tras eso, el juego/updater corren sin elevación.
PrivilegesRequired=admin

; Main.exe es 32-bit; corre en x86 y x64. No forzamos modo 64-bit.
MinVersion=6.1

; --- Salida / compresión ----------------------------------------------------
OutputDir=Output
; Nombre del .exe de salida. El icono (rex.ico, dragon) queda INCRUSTADO dentro
; del .exe por SetupIconFile mas abajo — no depende del nombre del archivo, asi
; que NO hace falta renombrar a mano (renombrar en Windows solo confunde el
; cache de iconos del Explorer y parece que "desaparece", pero el .exe lo tiene).
OutputBaseFilename=REXSetup100
; Los assets (OZJ/OZT/OGG) ya vienen comprimidos → lzma2/normal es el mejor
; equilibrio tamaño/tiempo. Subí a "lzma2/max" si querés exprimir ~2-3% más
; (tarda bastante más en empaquetar). SolidCompression ayuda con los miles de
; .bmd/.txt chicos.
Compression=lzma2/normal
SolidCompression=yes
; Inno 6 soporta instaladores >4 GB en un solo .exe (no hace falta DiskSpanning).

; --- Presentación -----------------------------------------------------------
WizardStyle=modern
UninstallDisplayName={#MyAppName}
UninstallDisplayIcon={app}\{#MyAppExe}
; Icono del instalador y del desinstalador = logo REX (cabeza de dragon blanca).
SetupIconFile=rex.ico
; Branding opcional del wizard (si tenés .bmp):
;WizardImageFile=branding_left.bmp
;WizardSmallImageFile=branding_top.bmp

[Languages]
Name: "en"; MessagesFile: "compiler:Default.isl"
Name: "es"; MessagesFile: "compiler:Languages\Spanish.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Dirs]
; El juego necesita esta carpeta para guardar capturas (va vacía).
Name: "{app}\Screenshots"

[Files]
; --- Grueso del cliente -----------------------------------------------------
; Copia TODO "REX MU Online\" salvo:
;   - config.ini / Mu.ini  -> se instalan aparte con onlyifdoesntexist (no pisar)
;   - desktop.ini          -> basura de vista de carpeta
;   - Screenshots\*        -> se crea vacía en [Dirs]
; rex.main SÍ se sobrescribe (es el puntero a tu server; querés el actual).
Source: "{#SrcDir}\*"; DestDir: "{app}"; \
    Excludes: "config.ini,Mu.ini,desktop.ini,Thumbs.db,Screenshots\*,*.pdb,*.exp,*.lib,*.log,*.bmd.bak,Main"; \
    Flags: recursesubdirs createallsubdirs ignoreversion

; --- Config de usuario: solo si NO existe (preserva prefs en reinstalación) --
Source: "{#SrcDir}\config.ini"; DestDir: "{app}"; Flags: onlyifdoesntexist
Source: "{#SrcDir}\Mu.ini";     DestDir: "{app}"; Flags: onlyifdoesntexist

[Icons]
Name: "{group}\{#MyAppName}";        Filename: "{app}\{#MyAppExe}"; WorkingDir: "{app}"
Name: "{group}\Uninstall {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}";  Filename: "{app}\{#MyAppExe}"; WorkingDir: "{app}"; Tasks: desktopicon

[Run]
; Abre permisos de MODIFICAR sobre la carpeta al grupo "Usuarios"
; (SID S-1-5-32-545 = neutro al idioma del Windows) para que el Launcher
; pueda escribir/parchear sin pedir admin. Corre en silencio tras copiar.
Filename: "{sys}\icacls.exe"; \
    Parameters: """{app}"" /grant *S-1-5-32-545:(OI)(CI)M /T /C /Q"; \
    Flags: runhidden waituntilterminated; \
    StatusMsg: "Configurando permisos de actualización..."

; Ofrecer lanzar el juego al terminar (checkbox en la última página).
Filename: "{app}\{#MyAppExe}"; Description: "{cm:LaunchProgram,{#MyAppName}}"; \
    WorkingDir: "{app}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
; El updater/juego generan archivos que Inno no trackea (logs, capturas,
; parches). Borrar toda la carpeta al desinstalar para no dejar ~2.7 GB huérfanos.
Type: filesandordirs; Name: "{app}\Screenshots"
Type: files;          Name: "{app}\MuError.log"
Type: filesandordirs; Name: "{app}"
