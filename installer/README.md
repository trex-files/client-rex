# Instalador del cliente REX MMORPG (Inno Setup)

Versión canónica del instalador. Genera `REXSetup100.exe`, que instala el
cliente en `C:\Games\REX MMORPG`, con acceso directo en escritorio + menú
inicio al **Launcher** (no a Main.exe), permisos de escritura para el updater,
e icono dragón.

## Archivos

- `REX-MU-Online.iss` — script Inno Setup 6 (canónico, versionado aquí).
- `rex.ico` — icono del setup (dragón). **Entradas BMP/DIB** (16-256), NO
  all-PNG: Inno falla al incrustar iconos totalmente PNG → setup sin icono.
- `build-setup.bat` — compila con ISCC.exe (one-click).

## Relación con la branch `release`

El instalador empaqueta el **cliente limpio shippeable** = la branch `release`
de `client-rex` (árbol `ClientFile/`). El `.iss` NO vive dentro de ese árbol (es
tooling, no contenido del cliente; si estuviera dentro se colaría en el
instalador y en los parches). Vive aquí, en el repo, y opera *sobre* un checkout
de `release`.

`ClientFile` (nombre interno del repo) ≠ `REX MMORPG` (carpeta instalada) ≠
`REX MU` (nombre del producto). El cliente usa rutas relativas al cwd, así que
la carpeta instalada puede llamarse como sea. `ClientFile` está hardcodeado en
GetMainInfo/Launcher.vcxproj — **no renombrarlo**.

## Flujo de armado (en Windows)

1. Checkout de la branch release:
   `git clone -b release <client-rex> && cd client-rex`
   (o `git checkout release` en un clon existente).
2. Preparar la carpeta de origen. Dos opciones:
   - Copiar/renombrar `ClientFile\` a una carpeta **`REX MU Online\`** al lado
     del `.iss` (+ `rex.ico`, `build-setup.bat`), o
   - Dejar `ClientFile\` donde está y pasar su ruta:
     `build-setup.bat "C:\...\client-rex\ClientFile"`.
3. Compilar: `build-setup.bat` (o F9 en el IDE Inno, o
   `ISCC.exe REX-MU-Online.iss`).
4. Sale `Output\REXSetup100.exe` (~2.5 GB). Firmarlo (opcional, recomendado)
   para evitar SmartScreen/AV.

## Qué NO se empaqueta (Excludes del .iss)

`config.ini` y `Mu.ini` van con `onlyifdoesntexist` (no pisar prefs en
reinstalación). Se excluyen `desktop.ini`, `Thumbs.db`, `*.pdb/.exp/.lib/.log`,
`*.bmd.bak`, `Screenshots\*`, y el leftover `Main`. `rex.main` SÍ se sobrescribe
(puntero al server actual).

Nota: la branch `release` ya viene sin esa basura (se purgó del repo), pero los
Excludes son cinturón-y-tiradores por si el origen es una carpeta de Windows con
`Thumbs.db`/pdbs locales.

## Claves del .iss (por qué)

- `MyInstallFolder="REX MMORPG"` → `DefaultDirName={sd}\Games\REX MMORPG`.
  `MyAppName="REX MU"` (producto/accesos/desinstalador). `AppId` **constante**
  entre versiones (si cambia, Windows lo trata como otro producto).
- **NO Program Files**: el updater in-place se rompe ahí por UAC/VirtualStore.
- `[Run] icacls ... *S-1-5-32-545:(OI)(CI)M /T` abre escritura al grupo Usuarios
  (SID neutro al idioma) para que el updater parchee sin elevación.
- `PrivilegesRequired=admin` (instalar fuera de user-dir + icacls) una vez.
- `SetupIconFile=rex.ico`; el icono queda incrustado en el .exe (no depende del
  nombre del archivo de salida).
- `SrcDir` overridable por `/DSrcDir=...` desde `build-setup.bat`.
