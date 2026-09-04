# Patch 13 — generado 2026-09-04, FALTA PUBLICAR

## Qué lleva (12 archivos, diff v12 -> v13)

- `Main.exe` recompilado — trae la revisión completa del repo principal
  (`mu-sourcecode` s21, commits `880889862`..`62fcd7a0c`): fix reset-mode BC/DS,
  revert QuestHub Weekly/CooldownTotal, render Level de Box of Kundun en la
  tienda, fallback CPU del GPU-skin, preset low-spec v3, fix del freeze de
  4GB RAM, fix de Power Slash a alta velocidad/FPS bajos.
- `Data/InGameShopScript/512.2011.007/{IBSCategory,IBSPackage,IBSProduct}.txt`
  — carpeta nueva del Cash Shop del Official (versión 7), par de
  `CashShopScriptVersion3=7` ya pusheado en `muserver-rex`.
- `Data/InGameShopScript/512.2011.006/IBSCategory.txt` — 1 línea, rename
  cosmético "Adventure Coins Shop" -> "Adventure Coins" en la carpeta de
  Battle (006). No estaba en mi plan de commits original — quedó en el
  working tree, sin commitear a propósito por si no era intencional
  (verificar con el dueño antes de publicar).
- `Data/Local/{Eng,Por,Spn}/Text_{eng,por,spn}.{bmd,txt}` — relabel Quest Hub
  Common/Unique -> Daily/Weekly + string 5895 "Repeatable every %s".
- `Data/Custom/Move/MoveLevelDiscount.txt` — interruptor MG/DL/RF a 0
  (coincide con `MoveLevelDiscountEnable=0` ya pusheado en `muserver-rex`).

`MainEdit.exe`, `config.ini`, `Launcher.exe` — excluidos por el script como
siempre (verificado: no aparecen en `Patch13.zip` ni en `FullPatch.zip`).

## Números (generado con `node tools/make-patch.mjs`, Node 22.22.0)

```
Patch13.zip   crc=042cb46d  size=4025671    12 ficheros
FullPatch.zip crc=9e343d60  size=46809959   970 ficheros
version.txt   latest=13, 13 lineas (full + patch.1..13)
```

Verificado antes de dar por bueno:
- CRC32 y tamaño de `full` y `patch.13` recalculados independientemente
  (`zlib.crc32` + tamaño de archivo) contra `version.txt`: 2/2 OK.
- `unzip -l` de ambos zips: sin `.pdb/.exp/.log/.bak`, sin `Launcher.exe`,
  `config.ini` ni `MainEdit.exe`.
- `hashes-v13.json` commiteado en `patch-manifests/` (+ `version-v13.txt` de
  respaldo) para poder diferenciar el próximo parche contra este.

## 🔴 No verificable desde este sandbox

Mismo caso que Patch12: sin toolchain Windows para decompilar `Main.exe` más
allá del hash, y sin poder aplicar el patch y entrar al juego de verdad desde
acá. **No probado en juego.**

Recomendado antes de publicar: probar en cliente real el fix de reset-mode
BC/DS, el tab Daily/Weekly del Quest Hub, el ícono de Box of Kundun en la
tienda, el preset low-spec, y que no haya regresión visual del fallback de
GPU-skin.

## Publicación (cuando se decida) — mismo orden de siempre

1. `Patch13.zip` + `FullPatch.zip` a R2 `patches/` (no hecho desde acá — sin
   credenciales R2 en este sandbox).
2. Purgar cache de Cloudflare para `FullPatch.zip`.
3. Probar como usuario real.
4. Recién ahí, `version.txt` a Vercel (no hecho desde acá).
5. Confirmar el commit de `hashes-v13.json`/`version-v13.txt` (ya hecho, ver
   abajo) + tag `client-patch-13` + push (ya hecho).

## Lado servidor (aparte, no bloquea este cliente)

`muserver-rex` s21 ya tiene el lado servidor de todo esto pusheado
(`CashShopScriptVersion3=7`, QuestHub `CustomNpcQuest.txt`, rates
`gs_rates_exp400_reset_coins_grandreset500`, `MoveLevelDiscountEnable=0`) —
reiniciar el GameServer/GameServerCS Official para que tome los rates y el
Cash Shop v7.
