# Patch 20 — GENERADO (2026-09-16, pendiente de publicar)

Cambio único: **`tabmap_markers.txt` regenerado contra el `MonsterList.txt` actual.**

Patch 19 está publicado y verificado en vivo, así que 20 encadena limpio encima:
el manifest arrastra `patch.1` … `patch.19` y agrega `patch.20`.

## Números

```
Patch20.zip    crc=4681a816  size=15082      (15 KB)     1 fichero
FullPatch.zip  crc=fd06603b  size=52777346   (50,3 MB)   1178 ficheros
version.txt    latest=20  (20 lineas patch.N)
```

CRC32/size recalculados de forma independiente sobre los bytes de cada `.zip`
(`zlib.crc32`, Node) — coinciden exacto con lo que reportó `make-patch.mjs`.

Comando corrido (tal cual):

```
cd /workspace/mu-sourcecode/client-rex
node tools/make-patch.mjs --build ClientFile --version 20 --out patch-out \
  --mirror-hashes   patch-manifests/hashes-v19.json \
  --baseline-hashes patch-manifests/hashes-v0.json \
  --prev-manifest   patch-manifests/version-v19.txt
```

## Contenido de Patch20.zip — un solo fichero

```
Data/Minimaps/tabmap_markers.txt   (108.636 B)
```

Un `--dry-run` previo predijo 1 / 1178 y la generación real dio 1 / 1178.
Verificado además **dentro del zip**: `Condra - Lv. 213`, y cero ocurrencias de
`Lv. 294`.

## Por qué

Un jugador reportó que el tabmap y el mob no coinciden: el mapa decía
`Condra - Lv. 294` mientras `MonsterList.txt` lo tiene en **nivel 213** con
**304.400** de vida — y esa vida coincide exacto con la barra de la captura.
El fichero de marcadores había quedado viejo frente al rework de niveles.

Regenerado con `tools/gen_minimap_markers.py`, sin flags. Clasificación de las
786 líneas que cambian:

| Cambio | Cantidad |
|---|---|
| Solo el nivel (el bug reportado) | **362** |
| Cambió el monstruo del spot (Dark Knight → Cursed Wizard) | 8 |
| Spots de Atlans que se movieron o cambiaron de cantidad | 19 |
| NPCs que faltaban en el mapa | **7** |
| Iconos | 0 |

Los 7 NPCs que aparecen son **Quests Master** (Lorencia y Elbeland), **Charon**
y **Messenger of Archangel**. Nada se pierde: cada marcador que desaparece
reaparece como el mismo mob o NPC en su posición nueva.

## Mobile — no hay nada que hacer aparte

Verificado por el agente de Android: `Data/Minimaps/tabmap_markers.txt` está
activo en la allowlist `tools/packaging/client-data-overlay.txt` (línea 204) y
**no** hay copia en `overlay-local/`, así que `resolve_src` cae a
`client-rex/ClientFile/` — el mismo árbol que se editó acá. El fichero ya les
sirve a los dos.

No alcanzó a entrar en la OTA 1.0.47 (el staging corrió ~50 min antes de la
regeneración), así que va en la 1.0.48.

## Pendiente de publicar

El dueño sube los `.zip` a R2 él mismo y deploya webapp-rex a mano.

1. Subir `patch-out/Patch20.zip` **y** `patch-out/FullPatch.zip` a R2 `patches/`.
   ⚠️ El `FullPatch.zip` **se regeneró** (crc `13e3d0c6` → `fd06603b`). El manifest
   v20 apunta al nuevo, así que si sube sólo `Patch20.zip`, una instalación nueva
   baja el FullPatch viejo y **falla la verificación de CRC**. Los dos o ninguno.
2. Recién después, publicar `version.txt` en webapp-rex (`update/version.txt`).
