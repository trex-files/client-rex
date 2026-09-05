# Patch 14 — GENERADO 2026-09-05 07:35 UTC, FALTA PUBLICAR

> El Patch 13 SÍ salió a producción el 04/09 04:52 UTC (12 ficheros, crc `042cb46d`,
> 4025671 B; verificado descargándolo del CDN y contra `hashes-v13.json` de `4910c2ec`).
> Las dos "regeneraciones del 13" del 05/09 (crc `d8fea293` y `90915503`) fueron un error:
> no se publicaron y sus manifests se descartaron. `version-v13.txt`/`hashes-v13.json`
> vuelven a ser los de producción. Este Patch 14 es el incremental v13 (prod) → build actual.

## Números (verificados)

```
Patch14.zip    crc=9ff695fd  size=9915972   (9,5 MB)   299 ficheros
FullPatch.zip  crc=be8ae58e  size=52145799  (49,7 MB)  1254 ficheros
version.txt    latest=14, 14 líneas (full + patch.1..14); patch.13 conserva 042cb46d|4025671
```

Comando exacto:

```
node tools/make-patch.mjs --build ClientFile --version 14 --out patch-out \
  --mirror-hashes patch-manifests/hashes-v13.json \
  --baseline-hashes patch-manifests/hashes-v0.json \
  --prev-manifest patch-manifests/version-v13.txt
```

## Qué lleva

Los mismos 304 ficheros de la regeneración del 13 (New Visual: 165 modelos de Player,
106 de Item, 7 tipografías RexUI Prime, 5 texturas de UI, 4 `Item_*.bmd` + textos,
`rex.main`, `tabmap_markers`, `Filter.bmd` vacío, `Main.exe` 06:53:35 UTC) **menos 5 que
ya salieron idénticos en el Patch 13 de producción**: `Data/Custom/Move/MoveLevelDiscount.txt`
y los 4 `Data/InGameShopScript/512.2011.00{6,7}/IBS*.txt`. Los otros 7 ficheros del 13 de
prod (`Main.exe`, `Text_*`) van de nuevo porque cambiaron después.

## Verificado

- CRC32 + tamaño de `full`, `patch.13` y `patch.14` contra `version.txt`: 3/3 OK.
- 0 prohibidos, 0 basura. 0 huérfanos: los 28176 paths de `hashes-v13.json` (prod) existen.
- `Main.exe` en el zip: PE válido, link 2026-09-05 06:53:35 UTC.
- `rex.main` en el zip: sha256 `ad7e1b62…` (la confirmada por el dueño).
- Diff contra la regeneración 304 del 13: 0 distintos, 0 nuevos, 5 menos (los de arriba).
- Los 5 residuos del artista (`HDK_Sword_old.bmd`, `godesteel.smd`, `wing01.SMD`,
  `wing01_1.SMD`, `Item762_Armor-New.ozj`) siguen entrando, como en el 13 regenerado.

## Publicar (manual, en este orden)

1. Subir `patch-out/Patch14.zip` y `patch-out/FullPatch.zip` a R2.
2. Purgar `FullPatch.zip` en Cloudflare (sirve el viejo hasta 4 h).
3. Subir `patch-out/version.txt` AL FINAL.

Nada probado en juego: sin cliente ejecutable en este entorno.
