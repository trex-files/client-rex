# Patch 13 — REGENERADO 2026-09-05 03:36, FALTA PUBLICAR

> ⚠️ Este archivo reemplaza la versión del 2026-09-04 04:44. Aquel Patch13 se
> generó con **12 archivos** y **nunca se publicó**. Se regeneró desde cero
> porque el merge del PR#2 (New Visual) entró 15 h DESPUÉS de aquella corrida.
> Respaldo del zip anterior en el scratchpad de la sesión (`Patch13-viejo.zip`,
> crc `042cb46d`). Como v13 nunca salió, se mantiene el número 13: el
> incremental sigue siendo v12 → build actual.

## Números (verificados de forma independiente)

```
Patch13.zip    crc=d8fea293  size=9925440   (9,5 MB)    303 ficheros
FullPatch.zip  crc=295a9557  size=52145693  (49,7 MB)  1253 ficheros
version.txt    latest=13, 13 líneas (full + patch.1..13)
build tree     28188 ficheros
```

Comando exacto:

```
node tools/make-patch.mjs --build ClientFile --version 13 --out patch-out \
  --mirror-hashes patch-manifests/hashes-v12.json \
  --baseline-hashes patch-manifests/hashes-v0.json \
  --prev-manifest patch-manifests/version-v12.txt
```

## 🔑 Qué lleva: 303 ficheros — esto NO es un parche de arreglos

```
Data/Player          165   modelos de personaje  (.bmd)
Data/Item            106   modelos de ítem       (.bmd/.ozj/.smd)
Data/Local            13   4x Item_*.bmd + 8x Text_* + rex.main
Data/Fonts             7   tipografías RexUI Prime (NUEVAS)
Data/Interface         5   texturas de UI
Data/InGameShopScript  4   Cash Shop v7 (3 nuevos) + rename de categoría
Data/Custom            1   MoveLevelDiscount
Data/Minimaps          1   tabmap_markers
Main.exe               1
```

**271 de los 303 son modelos.** El salto de 12 → 303 tiene causa fechada: el
Patch13 viejo se generó el 04/09 a las **04:43**, y el PR#2 "New Visual" de
StudioCaliCode (276 assets) más las tipografías RexUI Prime se mergearon a las
**19:47** del mismo día (`590ad32f`, `36594f95`). El parche de ayer los perdía
por completo. **Éste es el parche que le entrega el rediseño visual a los
jugadores** — comunicarlo como tal, y contar con ~9,5 MB de descarga.

## Verificado antes de dar por bueno

- CRC32 + tamaño de `full` y `patch.13` recalculados con `zlib.crc32` contra
  `version.txt`: **2/2 OK**.
- Contenido de ambos zips: **0 ficheros prohibidos** (`Launcher.exe`,
  `config.ini`, `Mu.ini`, `MainEdit.exe`, `main.lib`, `muerror.log`, `rex.txt`)
  y **0 basura** (`.pdb/.exp/.log/.bak/.rar/.zip/.7z/.cab` ni `.bak-*`).
- **0 huérfanos**: ningún fichero de v12 falta en la build. Importa porque el
  pipeline **no soporta borrado** — lo que entra queda para siempre.
- `Main.exe`: PE válido, 6 secciones, sin truncar, link timestamp
  **2026-09-05 03:12:16 UTC**.
- `rex.main` dentro del zip = `ad7e1b62…`, la versión que el dueño confirmó
  como correcta (NO la de pruebas `04bc3849…` ni la vieja `81697435…`).
- Los 4 `Item_*.bmd`: 121/121 filas coinciden con `Data/Item/Item.txt` del
  servidor tras el merge tmpData ronda 4.

## ⚠️ 5 residuos del artista que entran y quedan PERMANENTES

Vienen del commit `cd402dda "New Visual"`, no del trabajo de esta sesión:

    Data/Item/HDK_Sword_old.bmd        20 KB
    Data/Item/godesteel.smd            19 KB
    Data/Item/wing01.SMD              468 KB
    Data/Item/wing01_1.SMD             55 KB
    Data/Item/Item762_Armor-New.ozj    74 KB

~640 KB. El cliente no los carga (no siguen la convención `ItemNNN.bmd`). El
filtro anti-basura NO los atrapa: su regex es `\.(bak|orig|tmp|old)[-_.]`, que
busca el marcador DESPUÉS del punto, y acá el `_old` va antes de la extensión
— el mismo agujero por el que en el Patch8 se colaron 29 backups. Se dejaron
pasar porque borrar assets del artista sin poder probar el juego es peor
riesgo. Si se quieren fuera: `--exclude HDK_Sword_old.bmd,godesteel.smd,wing01.SMD,wing01_1.SMD`.

## 🔴 No verificable desde este sandbox

Sin toolchain Windows ni cliente ejecutable. **Nada de esto se probó en juego.**
El `Main.exe` lo compiló otra sesión; sólo se validó su cabecera PE, no su
comportamiento. Y el rediseño visual completo — 271 modelos — **nunca se vio
corriendo**.

Antes de publicar, probar en cliente real: que los modelos nuevos carguen sin
crash, las tipografías, los tooltips T9/T10 (Level 350/450), el Cash Shop v7,
el panel del 2º slot de pet y la selección de servidor (familia Official).

## Orden de publicación

1. Subir `FullPatch.zip` y `Patch13.zip` a R2.
2. Publicar `version.txt` **AL FINAL** (si sale antes, el launcher pide un zip
   que todavía no está).
