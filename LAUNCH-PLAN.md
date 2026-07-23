# REX MMORPG — Plan de lanzamiento y actualizaciones del cliente

Este repo (`client-rex`) es **autocontenido** para shipear y actualizar el
cliente. Un checkout de `release` trae todo lo necesario:

```
client-rex/
  ClientFile/          <- el cliente (lo UNICO que se instala/parchea)
  installer/           <- .iss + rex.ico + build-setup.bat (genera el Setup.exe)
  tools/               <- make-patch.mjs, promote-to-release.sh, RUNBOOK
  patch-manifests/     <- hashes-vN.json (huellas de cada version publicada)
  LAUNCH-PLAN.md       <- este archivo
```

`installer/`, `tools/`, `patch-manifests/` son **hermanos** de `ClientFile/`,
así que **no se instalan ni se parchean** (el `.iss` empaqueta `ClientFile\*`;
make-patch hashea solo `ClientFile`).

## Branches

- **dev / main** = desarrollo. Churn, features a medio hacer, binarios con
  símbolos. Se sincronizan como hasta ahora.
- **release** = cliente limpio shippeable. Su árbol de `ClientFile/` == lo que
  tiene el usuario en disco (menos config.ini/Launcher.exe, per-usuario). Se
  avanza SOLO con contenido curado, vía `promote-to-release.sh`.
- **tags**: `client-beta-v0` (instalador de lanzamiento), `client-patch-N` (cada
  parche). El diff exacto de un parche = `git diff client-patch-{N-1} client-patch-N -- ClientFile`.

`ClientFile` (nombre interno) ≠ `REX MMORPG` (carpeta instalada) ≠ `REX MU`
(producto). No renombrar `ClientFile` (hardcodeado en GetMainInfo/Launcher).

## Hosting

| Artefacto | Dónde |
|---|---|
| `REXSetup100.exe` (instalador) | R2 `dl.rexmu.online/releases/` (descarga pública) |
| `PatchN.zip` / `FullPatch.zip` | R2 `dl.rexmu.online/patches/` |
| `version.txt` (manifest) | sitio Vercel `rexmu.online/update/version.txt` — **al final** |
| `hashes-vN.json`, tags | git (este repo) |

## FASE A — Lanzamiento (v0, una vez)

1. Compilar en Windows: Launcher.exe (con los fixes) + Main.exe → a `ClientFile\`.
   Commit en dev, push, FF main. **Si recompilás binarios, regenerá hashes-v0**
   (paso 3) — el baseline debe ser byte-exacto a lo que shipea.
2. Promover a release: `tools/promote-to-release.sh main "release: v0 launch"`,
   revisar diff, `git push origin release`. Tag `client-beta-v0`, push --tags.
3. (Si cambiaron binarios) regenerar el baseline de hashes desde un contenido
   LIMPIO (sin residuos de build):
   `node tools/make-patch.mjs --build <ClientFile limpio> --version 0 \
        --out patch-manifests --emit-hashes-only`
   Commit `patch-manifests/hashes-v0.json`.
   ⚠️ make-patch excluye Launcher.exe/config.ini/Mu.ini + residuos
   (.pdb/.exp/.log/.bak, Main, Main.lib, MuError.log, Thumbs.db, desktop.ini),
   PERO NO .lib/.obj (son datos de terreno). Aun así, generá desde una carpeta
   sin pdbs (checkout limpio) para no arrastrar residuos al baseline.
4. Instalador: `installer/build-setup.bat` (o pasar la ruta del ClientFile).
   Sale `Output\REXSetup100.exe`. Subir a R2 `releases/`. Confirmar manifest
   vivo `latest=0`.
5. Prueba E2E: instalar desde el Setup → launcher abre → entrar al juego.

## FASE B — Cada actualización (patch N ≥ 1)

1. **Curar**: en dev/main, terminar y probar los cambios (compilar Main.exe si
   cambió, actualizar `Data`). Solo contenido intencional y testeado.
2. **Promover**: `tools/promote-to-release.sh main "release: patch N — <resumen>"`.
   Revisar `git diff release~1 release -- ClientFile`. `git push origin release`.
3. **Generar** (desde un checkout LIMPIO de release):
   ```
   node tools/make-patch.mjs --build <ClientFile> --version N \
        --out patch-out \
        --baseline-hashes patch-manifests/hashes-v0.json \
        --mirror-hashes   patch-manifests/hashes-v{N-1}.json \
        --prev-manifest   <version.txt de la publicación anterior>
   ```
   → `PatchN.zip`, `FullPatch.zip`, `version.txt`, `hashes-vN.json`.
4. **Probar como usuario**: aplicar `PatchN.zip` sobre una copia del cliente
   anterior; apuntar el launcher a un manifest de staging; que baje/aplique;
   entrar al juego.
5. **Publicar**: subir los `.zip` a R2 `patches/` **primero**; publicar
   `version.txt` en Vercel **al final** (si va antes, ventana de 404).
6. **Registrar**: commit `patch-manifests/hashes-vN.json` + tag `client-patch-N`
   + push --tags. Anotar CHANGELOG.

## Reglas que no se rompen

- **Launcher congelado**: el updater nunca parchea `Launcher.exe` ni
  `config.ini`. Bug del launcher post-launch = instalador nuevo, no parche.
- **Settings solo por Data**: `config.ini`/`Mu.ini` son per-usuario y excluidos;
  cambios client-wide van en `Data` (ej. `rex.main`).
- **Cambios aditivos**: el pipeline no borra archivos; renombrar deja huérfano
  el viejo (make-patch avisa). Evitar renombres o aceptar el huérfano.
- **Publicar en orden**: zips a R2 → `version.txt` al final.
- **hashes-v0 = bytes shipeados**: si recompilás binarios antes de lanzar,
  regenerá hashes-v0, o todos los FullPatch saldrán mal.

## Cadencia (beta)

- **Día fijo de parche semanal** (anunciado), con lo acumulado.
- **Carril de hotfix**: mismo runbook sin ceremonia, solo para crash/exploit/
  bloqueo de progresión. El resto espera al día de parche.
- Instalador **congelado en v0** para la beta (usuarios nuevos: Setup v0 +
  FullPatch acumulado). Re-cortar a un baseline vK más adelante si conviene.
