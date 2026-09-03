# Patch 12 — REGENERADO 2 VECES (2026-09-03), FALTA PUBLICAR

El Patch12 del intento 2026-09-02 17:37 UTC nunca se publicó, se descartó y se
regeneró (commit `bc0f494b`, 13:xx UTC). Pocos minutos después se detectó que
`Main.exe` había vuelto a cambiar en el working tree (recompilado por otro
proceso, PE link 2026-09-03 12:49:44 UTC, +512 B, **sin ningún cambio de
código fuente** — `git status` en `client-rex` no mostraba nada más que ese
binario) — se comiteó (`27a6ad66`) y se **regeneró el patch por segunda vez**
contra el mismo baseline/espejo para no publicar un build viejo.

## Qué llevaba el intento anterior (ya incluido)

Ver commits `134855287`..`51b9c874c` (i18n Grand Reset/Rex-Grand-Adventure
Coins, Glory Points, fix sockets T9-T10, fix Exp/s Hunting Log, selector de
servidor v2) — sin cambios, esos ya estaban.

## Qué se agregó en esta regeneración (commit `bc0f494b`, 2026-09-03)

- **Rename de 4 ítems** en los DOS catálogos de nombre, 4 idiomas cada uno (8
  archivos): `GM Gift→Accessory Box`, `Green Chaos Box→Mystic Box`,
  `Red Chaos Box→Royal Box`, `Purple Chaos Box→Eternal Box`. ES/PT traducidos
  de verdad (antes eran copia literal del inglés), VI con traducción propia.
  Detalle completo: memoria `grandshop_populated_22_products_2026-09-02.md`.
- **`EnableTwoServers = 0 → 1`** en `MainInfo.ini` (decisión del dueño,
  intencional) + `Main.exe`/`rex.main` recompilados en consecuencia (PE link
  2026-09-02 21:23:13 UTC — más nuevo que el `bc7cbc52` del intento anterior,
  16:52:54 UTC).

## Números verificados (regeneración FINAL, 2026-09-03, commit `27a6ad66`)

```
Patch12.zip   crc=8eb93e5f  size=11791081   153 ficheros
FullPatch.zip crc=7db9fdd8  size=46800079   967 ficheros
version.txt   latest=12, 12 lineas (full + patch.1..12)
```

(Los números `e45c3c88`/`37bcf4a4` de la corrida anterior quedaron OBSOLETOS
por el recompile de `Main.exe` — no usar.)

Verificado antes de dar por bueno:
- CRC32 y tamaño de `full` y `patch.12` recalculados independientemente
  (`zlib.crc32` + `stat`) contra `version.txt`: 2/2 OK.
- `Main.exe` y `rex.main` dentro de `Patch12.zip` son **byte a byte
  idénticos** al working tree post-commit (`27a6ad66`) — sha256
  `91e03d08…` / `6e5c75a1…` — verificado por streaming (`unzip -p | sha256sum`,
  sin extraer a disco por el tmpfs de 512 MB lleno).
- Los 8 `Item_*.bmd`/`ItemTooltip_*.bmd` renombrados están presentes en el
  zip, con el tamaño exacto esperado (688132 / 1015812 B, sin cambio de
  tamaño — son ediciones in-place).
- Cero `.pdb/.exp/.log/.bak`, `Launcher.exe`, `config.ini`, `MainEdit.exe` en
  `Patch12.zip` ni en `FullPatch.zip` (verificado con `unzip -l`, sin extraer).
- `git status` en `client-rex` limpio antes de construir (solo el commit
  `27a6ad66` del Main.exe recompilado, nada más pendiente).

## 🔴 No verificable desde este sandbox (sin toolchain Windows)

Igual que el intento anterior: no se puede decompilar `Main.exe`/`rex.main`
para confirmar contenido más allá del hash — solo que es exactamente el
binario que está comiteado en HEAD. No se construyó desde un clone limpio
(mismo motivo de espacio en disco que Patch11/intento anterior de Patch12) —
compensado revisando `git status --ignored` a mano.

## Recomendación antes de publicar

Probar el build en juego — especialmente `EnableTwoServers=1` (feature nueva,
sin probar en este sandbox) y que el rename de los 4 ítems se vea bien en
tienda/inventario/tooltip.

## Publicación (cuando se decida) — mismo orden de siempre

1. `Patch12.zip` + `FullPatch.zip` a R2 `patches/`.
2. Purgar cache de Cloudflare para `FullPatch.zip`.
3. Probar como usuario real.
4. Recién ahí, `version.txt` a Vercel.
5. Commit `patch-manifests/hashes-v12.json` (+ `version-v12.txt` de respaldo) +
   tag `client-patch-12` + push.

## Lado servidor / Cash Shop (aparte, no bloquea este cliente)

- Exp/s y Glory Points: mitad servidor en `muserver-rex` sigue sin desplegar.
- Grand Shop (22 productos nuevos en Cash Shop): el rename de nombre de ítem
  YA viaja en este patch, pero los PRODUCTOS del Grand Shop en sí (`CashShopData.dat`)
  todavía no se exportaron desde el editor Windows — eso es un pipeline
  separado (`Output/Server` + `Output/Client` → `4.GameServer/Data/CashShop/` y
  `ClientFile/Data/InGameShopScript/`), no pasa por `make-patch.mjs`.
