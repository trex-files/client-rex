# Patch 12 — REGENERADO desde cero (2026-09-03), FALTA PUBLICAR

El Patch12 anterior (armado 2026-09-02 17:37 UTC) nunca se publicó, así que se
descartó y se regeneró completo contra el mismo baseline (v0) y espejo (v11 —
última versión realmente publicada), incluyendo TODO lo que se acumuló en
`client-rex` desde entonces.

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

## Números verificados (regenerados 2026-09-03)

```
Patch12.zip   crc=e45c3c88  size=11790928   153 ficheros
FullPatch.zip crc=37bcf4a4  size=46799926   967 ficheros
version.txt   latest=12, 12 lineas (full + patch.1..12)
```

Verificado antes de dar por bueno:
- CRC32 y tamaño de `full` y `patch.12` contra `version.txt`: 2/2 OK.
- `Main.exe` y `rex.main` dentro de `Patch12.zip` son **byte a byte
  idénticos** al working tree post-commit (`bc0f494b`) — sha256
  `a0b6a166…` / `6e5c75a1…`. (Comparar contra `git show HEAD:...` da un
  falso mismatch porque esos dos archivos son LFS — `git show` sin smudge
  devuelve el puntero de 133 B, no el binario.)
- Los 8 `Item_*.bmd`/`ItemTooltip_*.bmd` renombrados están presentes en el
  zip, con el tamaño exacto esperado (688132 / 1015812 B, sin cambio de
  tamaño — son ediciones in-place).
- Cero `.pdb/.exp/.log/.bak`, `Launcher.exe`, `config.ini`, `MainEdit.exe` en
  `Patch12.zip` ni en `FullPatch.zip`.
- `git status --ignored` en `ClientFile/` revisado antes de construir: todo
  lo untracked cae en las exclusiones ya conocidas del script (`.bak` de
  nuestro propio proceso de rename, residuos de build/runtime).

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
