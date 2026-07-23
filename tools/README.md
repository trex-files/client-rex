# Pipeline de parches del Launcher REX MU

Genera los `.zip` de parche y el manifest `version.txt` que consume el
auto-updater del launcher (`Source/8.Tools/Launcher/Updater.cpp`).

## Modelo mental: el "espejo publicado" (por hashes, no por copias)

Cada parche se genera por **diferencia por hash**, nunca a mano. Para diferenciar
solo hacen falta los **hashes** de las versiones de referencia, no el árbol
completo — así no guardas copias de 2.8 GB por versión:

- **baseline (v0)** — el contenido del instalador publicado el día del
  lanzamiento. Su manifest de hashes (`hashes-v0.json`) sirve para el `FullPatch`
  (un usuario que instala el Setup original de golpe se pone al día con una sola
  descarga). El árbol en sí es el propio `Setup.exe`, archivable en R2.
- **espejo publicado (vN-1)** — `hashes-v{N-1}.json`, lo que tienen los usuarios
  tras el último parche. Sirve para el `PatchN` incremental.

Para armar `PatchN` solo necesitas (1) saber **qué** archivos cambiaron —del diff
de hashes— y (2) el **contenido nuevo** —del build actual que acabas de compilar—.
El contenido viejo nunca se necesita. Por eso el script emite `hashes-v{N}.json`
en cada corrida y puede consumir `--mirror-hashes` / `--baseline-hashes`.

### Dónde vive cada artefacto
- **`Setup.exe` (baseline, 2.8 GB)** → R2 `dl.rexmu.online/releases/` (descarga
  pública + copia de recuperación). Es a la vez lo que instalan los usuarios y el
  contenido v0.
- **`hashes-v{N}.json` (pocos MB)** → **git, en el repo `client-rex`** (p.ej.
  `patch-manifests/hashes-v{N}.json`), commiteado junto al tag `client-patch-N`.
  Es texto, versionado y diffeable (`git diff hashes-v3.json hashes-v4.json`
  muestra qué archivos cambió el parche 4). Vive con el código, no en R2 — R2 es
  solo para los binarios que descargan los usuarios.
- **`PatchN.zip` / `FullPatch.zip`** → R2 `dl.rexmu.online/patches/`.
- **`version.txt`** → sitio (Vercel), publicado AL FINAL.

### Generar el baseline una sola vez
```bash
node make-patch.mjs --build <instalador v0> --version 0 --out . --emit-hashes-only
# -> hashes-v0.json ; commitéalo. El árbol del instalador puede archivarse en R2.
```

## Contrato con el launcher (no romper)

- `version.txt`: líneas `key=value`.
  - `latest=N`
  - `full=<url>|<crc32-hex>|<size>` — FullPatch acumulativo (v0 → N)
  - `patch.K=<url>|<crc32-hex>|<size>` — incremental K-1 → K
- `crc32` = CRC-32 IEEE del **archivo .zip completo** (lo valida
  `ComputeFileCrc32` tras descargar). El script usa `zlib.crc32`, idéntico.
- El launcher **excluye siempre** `Launcher.exe` y `config.ini` al aplicar; el
  script tampoco los mete en ningún zip.
- Los zips guardan rutas relativas con `/`; el launcher las normaliza a `\`.

## Uso

Flujo recomendado (por hashes, sin carpetas de referencia en disco):

```bash
node make-patch.mjs \
  --build           <dir build vN> \
  --version         N \
  --out             <dir salida> \
  --baseline-hashes hashes-v0.json \
  --mirror-hashes   hashes-v{N-1}.json \
  --prev-manifest   version.txt(anterior)
```

También se puede diferenciar contra carpetas completas con `--mirror <dir>` /
`--baseline <dir>` (mutuamente excluyentes con sus variantes `-hashes`).

Opcionales: sin mirror no hay incremental (solo full); sin baseline el full
incluye todo el build; sin `--prev-manifest` el manifest no arrastra las líneas
`patch.K` históricas (un usuario varias versiones atrás no podría encadenar — el
script avisa si el path no existe). `--emit-hashes-only` solo emite el manifest
de hashes; `--dry-run` no escribe nada. Requiere Node 20.12+ (usa `zlib.crc32`).

Cada corrida normal emite además `hashes-v{N}.json` — commitéalo en git.

## Runbook de publicación (mismo ritual siempre)

1. Compilar el cliente (Main.exe, etc.), congelar el build vN.
2. `node make-patch.mjs ...` → genera `FullPatch.zip`, `PatchN.zip`, `version.txt`.
3. **Probar como usuario**: aplicar `PatchN.zip` sobre una copia del espejo,
   apuntar el launcher a un manifest de staging, dejar que baje/aplique y entrar
   al juego de verdad.
4. Subir los `.zip` a R2 (`dl.rexmu.online/patches/`) **primero**.
5. Publicar `version.txt` en la web **al final** (si va antes, hay una ventana en
   que los launchers ven un parche que da 404).
6. Aplicar el `PatchN.zip` al espejo publicado y anotar el CHANGELOG. Listo para
   el ciclo siguiente.

## Limitación conocida: sin borrado

El pipeline **no borra** archivos: un asset retirado del build queda huérfano en
el cliente del usuario. El script avisa (`WARNING`) qué archivos del espejo ya
no están en el build. Evitar renombres/retiros entre versiones, o extender el
manifest y el `Updater` con un mecanismo de borrado.
