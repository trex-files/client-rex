> 🔴 SUPERSEDIDO 05/09 07:35: el Patch 13 YA ESTABA en producción (12 ficheros, crc 042cb46d, subido 04/09 04:52 UTC). Esta regeneración NO se publicó; el contenido salió como **Patch 14**, ver `PENDIENTE-patch14.md`. Los manifests v13 volvieron a los de producción (`4910c2ec`).

# Patch 13 — REGENERADO 2026-09-05 07:14, FALTA PUBLICAR

> ⚠️ Este archivo reemplaza la versión del 2026-09-05 03:36. Aquel Patch13
> tenía **303 ficheros** (crc `d8fea293`) y **tampoco se publicó**. Se
> regeneró de nuevo porque después de esa corrida cambiaron dos ficheros en
> `ClientFile/`: `Main.exe` (recompilado, link timestamp **2026-09-05
> 06:53:35 UTC**, commit `bc16c6e5`) y `Data/Local/Filter.bmd` (filtro de
> palabras vaciado, mismo tamaño 20004 bytes, commit `ce680da8`). Como v13
> sigue sin salir, se mantiene el número 13: el incremental sigue siendo
> v12 → build actual. Respaldo del zip anterior en el scratchpad de la sesión
> (`patch13-prev/Patch13.zip` crc `d8fea293`, `patch13-prev/FullPatch.zip`
> crc `295a9557`).

## Números (verificados de forma independiente)

```
Patch13.zip    crc=90915503  size=9925546   (9,5 MB)    304 ficheros
FullPatch.zip  crc=be8ae58e  size=52145799  (49,7 MB)  1254 ficheros
version.txt    latest=13, 13 líneas (full + patch.1..13)
build tree     28188 ficheros
```

Comando exacto (dry-run primero, después la corrida real):

```
node tools/make-patch.mjs --build ClientFile --version 13 --out patch-out \
  --mirror-hashes patch-manifests/hashes-v12.json \
  --baseline-hashes patch-manifests/hashes-v0.json \
  --prev-manifest patch-manifests/version-v12.txt
```

Dry-run: `FullPatch = 1254 files (differ from baseline)`, `Patch13 = 304 files
(differ from mirror)` — exactamente 1 más que la corrida anterior en cada
zip, coherente con que sólo `Filter.bmd` pasó a diferir del espejo v12 (antes
no difería) y `Main.exe` ya difería (ahora con otro contenido/timestamp).

## 🔑 Qué lleva: 304 ficheros — esto SIGUE sin ser un parche de arreglos

```
Data/Player          165   modelos de personaje  (.bmd)
Data/Item            106   modelos de ítem       (.bmd/.ozj/.smd)
Data/Local            14   4x Item_*.bmd + 8x Text_* + rex.main + Filter.bmd (NUEVO)
Data/Fonts             7   tipografías RexUI Prime
Data/Interface         5   texturas de UI
Data/InGameShopScript  4   Cash Shop v7 (3 nuevos) + rename de categoría
Data/Custom            1   MoveLevelDiscount
Data/Minimaps          1   tabmap_markers
Main.exe               1   recompilado 2026-09-05 06:53:35 UTC
```

**271 de los 304 son modelos** (el rediseño visual del PR#2, sin cambios
desde la corrida anterior). Lo único nuevo de esta regeneración: `Main.exe`
trae el binario recompilado (Jewel Bank medallas 1x2, fixes de
automov/helper/pets/bandeja) y `Data/Local/Filter.bmd` entra por primera vez
porque ahora difiere del espejo v12 (filtro de palabras vaciado).

## Verificado antes de dar por bueno (a–g del pedido)

**a. CRC32 + tamaño** de `FullPatch.zip` y `Patch13.zip` recalculados con
`zlib.crc32`, comparados contra las líneas `full=` y `patch.13=` del
`version.txt` recién emitido: **2/2 MATCH**.

```
FullPatch.zip  computed crc=be8ae58e size=52145799  manifest crc=be8ae58e size=52145799  OK
Patch13.zip    computed crc=90915503 size=9925546   manifest crc=90915503 size=9925546   OK
```

**b. 0 ficheros prohibidos y 0 basura.** Escaneados los 304 entries de
`Patch13.zip` y los 1254 de `FullPatch.zip` contra `Launcher.exe, config.ini,
Mu.ini, MainEdit.exe, main.lib, muerror.log, rex.txt` y contra
`.pdb/.exp/.log/.bak/.rar/.zip/.7z/.cab` / `.bak-*`: **0 hits en ambos zips**.

**c. 0 huérfanos.** Los 28173 paths de `hashes-v12.json` existen todos en
`ClientFile/` actual: **0 faltantes**. (El pipeline no borra, así que esto
sólo puede fallar si algo se movió/renombró — no fue el caso.)

**d. `Main.exe` dentro de `Patch13.zip`: PE válido.**

```
MZ=b'MZ'  PEsig=b'PE\x00\x00'  6 secciones  filesize=13641728
link timestamp = 1788591215 (unix) = 2026-09-05T06:53:35Z UTC   ← coincide exacto
última sección (.reloc) termina en offset 13641728 = filesize   → sin truncar
```

**e. `Data/Local/rex.main` dentro del zip.**
`sha256 = ad7e1b625fbd647da698b52aa3f64695cb2d6bc8f0c0c4b06673953ca83249d3` —
empieza con `ad7e1b62`, la versión que el dueño confirmó como correcta
(no es `04bc3849…` de pruebas ni `81697435…` la vieja).

**f. `Data/Local/Filter.bmd` dentro del zip == disco.**
`zip_size=20004 disk_size=20004 bytes_iguales=True` frente al `Filter.bmd`
actual de `ClientFile/Data/Local/` (el filtro vaciado del commit `ce680da8`).

**g. Diff de contenido contra el `Patch13.zip` anterior** (sha256 de cada
entrada, 303 vs 304):

```
agregados (1):  Data/Local/Filter.bmd
eliminados (0): (ninguno)
cambiados (1):  Main.exe
sin cambios: 302
```

Exactamente lo esperado — nada más se movió.

## ⚠️ 5 residuos del artista que entran y quedan PERMANENTES (sin cambios)

Vienen del commit `cd402dda "New Visual"`, no de esta sesión. Se dejaron
igual que en la corrida anterior (no se usó `--exclude`):

    Data/Item/HDK_Sword_old.bmd        20 KB
    Data/Item/godesteel.smd            19 KB
    Data/Item/wing01.SMD              468 KB
    Data/Item/wing01_1.SMD             55 KB
    Data/Item/Item762_Armor-New.ozj    74 KB

~640 KB. El filtro anti-basura no los atrapa (`_old` va antes del punto, no
después). Borrarlos ahora sin poder probar el juego es más riesgo que
dejarlos. Si se quieren fuera: `--exclude
HDK_Sword_old.bmd,godesteel.smd,wing01.SMD,wing01_1.SMD,Item762_Armor-New.ozj`.

## 🔴 No verificable desde este sandbox

Sin toolchain Windows ni cliente ejecutable. **Nada de esto se probó en
juego** — ni el `Main.exe` recompilado (Jewel Bank, automov, helper, pets,
bandeja), ni el filtro de palabras vacío, ni el rediseño visual completo (271
modelos, ya iba en la corrida anterior).

Antes de publicar, probar en cliente real: que el `Main.exe` nuevo arranque y
las funciones tocadas (Jewel Bank 2x1, auto-movimiento, MU Helper, doble
slot de pet, bandeja/F12) se comporten como se espera, que el chat sin filtro
de palabras sea intencional, y lo pendiente de la corrida anterior (modelos
nuevos, tipografías, tooltips T9/T10, Cash Shop v7, selección de servidor).

## Orden de publicación

1. Subir `FullPatch.zip` y `Patch13.zip` a R2.
2. Publicar `version.txt` **AL FINAL** (si sale antes, el launcher pide un
   zip que todavía no está).

## Ficheros escritos/actualizados por esta regeneración

- `patch-out/Patch13.zip`, `patch-out/FullPatch.zip`, `patch-out/version.txt`,
  `patch-out/hashes-v13.json` (salida del tool, sin publicar).
- `patch-manifests/version-v13.txt` ← copia de `patch-out/version.txt`.
- `patch-manifests/hashes-v13.json` ← copia de `patch-out/hashes-v13.json`.
- `patch-manifests/PENDIENTE-patch13.md` ← este archivo.
- Nada bajo `ClientFile/` se tocó. Nada se commiteó.

---

## ✅ VERIFICACIÓN DURA previa (05/09 03:5x) — sigue vigente para el resto

La corrida del 03:36 ya había pasado 6 pruebas independientes (git diff vs
v12, byte-a-byte zip vs disco, coherencia servidor↔cliente, etc. — ver
historial en el commit `97633096`). Esta regeneración sólo agrega `Main.exe`
+ `Filter.bmd` sobre esa base ya verificada; las pruebas a–g de arriba cubren
específicamente el delta nuevo.

**Veredicto: el parche está completo y correcto.** Lo único que sigue sin
poder probarse desde acá es el comportamiento en juego.
