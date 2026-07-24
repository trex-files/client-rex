# REX MU — Cliente: CHANGELOG y notas de release

> Historial de versiones del cliente + notas operativas de lanzamiento/parches.
> El **cómo** mecánico (build del instalador, generar cada parche) vive en
> [`LAUNCH-PLAN.md`](./LAUNCH-PLAN.md). Este archivo dice **qué** salió en cada
> versión y las reglas de integridad/compatibilidad.

---

## v0.1-beta — Launch baseline (2026-07-24)

**Es el baseline del updater (versión numérica interna `0`).** Los parches
arrancan en `client-patch-1`. Tags git: `client-beta-v0` (baseline del updater)
y `v0.1-beta` (nombre público), ambos sobre el mismo commit de `release`.

### Contenido (fixes shippeados en este Main.exe)
- **Jewel Bank**: retiro custom 1-9 válido + chequeo de espacio con mensaje de error.
- **Marketplace**: pestaña Vender oculta las monedas deshabilitadas (no más checkbox WP muerto).
- **Master Skill Tree**: la EXP se refresca al abrir la ventana (0xF3:0x54) — se acabó el 0.00%.
- **Chaos Castle**: mensaje de rechazo informativo (no más "Cloak level incorrect"),
  slot de inventario correcto con inventario extendido, y form de resultado
  reconstruido con chrome REX (antes assets EX700 rotos).
- **UI eventos**: panel de contador (tiempo + mobs) reubicado arriba del botón "Events".
- **Servidor (aparte, no va en el cliente)**: EventEntryLevel data-driven restaurado,
  2 bugs secundarios de Master EXP. Se despliega en el GameServer, no en el instalador.

### Baseline de hashes
`patch-manifests/hashes-v0.json` regenerado byte-exacto al Main.exe nuevo
(`sha256 7e058c3a…`, 13442048 bytes). Baseline byte-exacto al Main.exe shippeado,
verificado con `make-patch --emit-hashes-only` (solo la entrada de Main.exe difiere
del build previo — los binarios de MSVC no son byte-reproducibles).
**Regla de oro**: si recompilás binarios antes de publicar, regenerá hashes-v0
o los FullPatch salen mal (ver LAUNCH-PLAN, FASE A paso 3).

---

## Modelo de integridad de updates (beta)

**Actual: sha256 + HTTPS. Sin firma criptográfica.**
- El launcher baja `version.txt` + los zips por TLS desde el dominio y verifica
  cada archivo contra su `sha256` en el manifiesto (detecta descargas corruptas).
- La **autenticidad** depende de que el hosting (R2 + Vercel + DNS) no esté
  comprometido. No hay clave privada que firme nada → **no hay clave que backupear**.
- **Ruta de upgrade** (si más adelante se quiere blindar el canal): firma Ed25519
  del manifiesto — el launcher lleva la clave pública embebida y rechaza un
  manifiesto no firmado aunque comprometan el CDN. Requiere cambio en el launcher
  (frozen ⇒ instalador nuevo), por eso conviene decidirlo antes de distribuir a lo grande.

---

## Compatibilidad Windows (verificado por análisis del PE + .iss)

| SO | Instalador | Cliente |
|----|-----------|---------|
| Windows 7 / 8 / 8.1 / 10 / 11 (x86 y x64) | ✅ | ✅ |
| Windows XP / Vista | ❌ (instalador Inno 6, `MinVersion=6.1`) | no soportado |

- **`Launcher.exe` y `Main.exe` son autocontenidos**: CRT enlazado estáticamente
  (0 imports de `msvcp*`/`vcruntime*`/`api-ms-win-crt`), solo importan DLLs
  **in-box** de Windows (GDI32, OPENGL32, DSOUND, WININET, WINHTTP, CRYPT32…)
  + DLLs bundleadas app-local (FreeImage, wzAudio, ogg/vorbis). **No requiere
  ningún redistributable** (VC++, .NET, DirectX).
- **OpenGL 3.3**: con GPU + drivers usa GL por hardware; sin drivers cae al
  **Mesa software** bundleado (`libgallium_wgl.dll` + `opengl32-mesa.dll`) —
  corre igual (más lento). O sea no muere en máquinas/VMs sin OpenGL.
- **32-bit**: corre en x86 y x64.
- Instala en `C:\Games\REX MMORPG` (NO Program Files) y abre permisos de escritura
  (icacls) para que el updater in-place funcione sin pedir admin cada vez.
- Para un instalador que corra en **Windows XP** habría que compilar el .iss con
  **Inno Setup 5.6.1** (el juego igual corre; es solo el setup). No es el build actual.

> ⚠️ Esto es análisis estático (imports del PE + .iss), no test en cada SO. Antes
> de la beta pública conviene un **smoke test** de instalar+abrir+entrar al juego
> en una VM limpia de al menos Win10/11 y Win7.

---

## Reglas operativas (recordatorio)

- **Buildear/hashear SIEMPRE desde un checkout LIMPIO de `release`** (o `git clean -xdf`),
  nunca desde tu carpeta de dev/test: los residuos de runtime del cliente
  (`REX.txt`, `Screenshots/`, `STACK_ERROR/`, `MuError.log`, `Main`, `Main.pdb/.exp/.lib`)
  ensucian el baseline/instalador. El `.iss` y `tools/make-patch.mjs` ya los excluyen
  (criterio alineado entre ambos), pero el checkout limpio es la red de seguridad.
- **Publicar en orden**: zips a R2 primero, `version.txt` a Vercel al final.
- **Launcher congelado**: bug del launcher = instalador nuevo, no parche.
