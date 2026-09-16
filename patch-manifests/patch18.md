# Patch 18 — GENERADO (2026-09-16, pendiente de publicar)

> Producción sigue en `latest=17` (`patch-manifests/version-v17.txt` era la
> referencia correcta para `--prev-manifest`; `patch-out/version.txt` viejo
> decía `latest=16`, del 08/09, y NO se usó). **No reverificado por HTTP en
> esta pasada** que producción siga en 17 en este mismo instante — hacerlo
> justo antes de publicar (ver Pendiente).
>
> Compuerta de frescura de `Main.exe` verificada DOS VECES antes de generar
> (una por el team lead, otra por mí, ~1 minuto después, mismo resultado):
> PE link timestamp `2026-09-16 01:09:40 UTC`, posterior a los 6 ficheros de
> C++ que estaba tocando `legacy-ui2` (el último, `NewUIEmpireGuardianNPC.cpp`,
> a las `01:03:23 UTC`, 6 min de margen). Generado recién después de que la
> compuerta pasó.

## Números

```
Patch18.zip    crc=6d20889e  size=4731446   (4,5 MB)   29 ficheros
FullPatch.zip  crc=da0f8d76  size=52777290  (50,3 MB)  1178 ficheros
version.txt    latest=18
```

CRC32/size recalculados de forma independiente sobre los bytes de cada `.zip`
(`zlib.crc32`, Node), coinciden exacto con lo que reportó `make-patch.mjs` y
con lo escrito en `version.txt`. Conteo de ficheros de cada zip (`unzip -l`)
coincide exacto con lo que había predicho el `--dry-run` previo (29 / 1178) —
la lista de 29 no cambió entre el análisis y la generación real.

Comando corrido (tal cual, sin modificar):

```
cd /workspace/mu-sourcecode/client-rex
node tools/make-patch.mjs --build ClientFile --version 18 --out patch-out \
  --mirror-hashes   patch-manifests/hashes-v17.json \
  --baseline-hashes patch-manifests/hashes-v0.json \
  --prev-manifest   patch-manifests/version-v17.txt
```

Build tree recorrido por el script: 28211 ficheros (igual al espejo v17 — sin
drift de exclusión). Salida completa:

```
make-patch: build tree = 28211 files
make-patch: FullPatch = 1178 files (differ from baseline)
make-patch: Patch18 = 29 files (differ from mirror)
make-patch: wrote FullPatch.zip  crc=da0f8d76 size=52777290
make-patch: wrote Patch18.zip  crc=6d20889e size=4731446
make-patch: wrote version.txt (latest=18, 18 patch line(s))
make-patch: wrote patch-out/hashes-v18.json
```

`version.txt`, `hashes-v18.json` copiados también a `patch-manifests/` como
`version-v18.txt` / `hashes-v18.json` (convención v15/v16/v17, hace falta para
diffear Patch19). Copias verificadas byte a byte idénticas a las de
`patch-out/`.

## Qué lleva (29 ficheros en Patch18.zip, explicados 1:1 — mismo análisis que
la pasada de "en análisis", sin cambios: la lista de 29 no se movió)

**`Data/Local/rex.main` (1 fichero, blob regenerado, 3716468 B).** Diff
binario contra HEAD (commit `7feca418`, patch16): 426 bytes en ~40 rangos —
incluye el color de daño del Combo (patch17, nunca commiteado) + los cambios
de HOY (Wing 3.5, alas `5 145 1 80 1`, nombres de monstruos, VIP Bronze, Combo
TypeIndex 7→8). Verificado real (no touch): mtime 00:06 UTC, posterior al
último `Custom*.txt` tocado (`CustomDmgColor.txt`, 23:58:16 UTC). Presente
dentro de AMBOS zips con el tamaño exacto del fichero en disco (confirmado con
`unzip -l`).

**`Main.exe` (1 fichero, 13698560 B).** PE link timestamp `2026-09-16
01:09:40 UTC` — build FINAL, posterior a los 6 ficheros de UI que tocó
`legacy-ui2` hoy (`NewUICommonMessageBox.cpp/.h`, `WindowClass.cpp/.h`,
`NewUIEmpireGuardianNPC.cpp/.h`; el último a las 01:03:23 UTC). Incluye la
migración de UI a assets REX de Change Class + Imperial Guardian. Presente
dentro de AMBOS zips con el tamaño exacto del fichero en disco.

**Cash Shop `512.2011.007` (3 ficheros: `IBSCategory.txt`, `IBSPackage.txt`,
`IBSProduct.txt`).** Se sacó la categoría "Wings 2.5" (4 paquetes) y entró
"Box of Wing 3.5" como pkg 280 / producto 2800 (ítem 7313, categoría 12
"Special", 2000 Grand Coins). La colisión 279/2790 (Box vs. Class Change
Ticket) que estaba registrada en memoria como sin resolver ya no está: el
ticket quedó en 279/2790 (ítem 7599), la caja en 280/2800, sin choque,
verificado en cliente y servidor.

**Catálogos localizados, 4 idiomas (17 ficheros: 6 Eng, 6 Por, 6 Spn, 5 Vie —
`ItemAddOption_<lang>.bmd`, `ItemTooltip_<lang>.bmd`, `Item_<lang>.bmd`,
`Text_<lang>.bmd`, `skill_<lang>.bmd`; + `Text_<lang>.txt` para Eng/Por/Spn,
Vie no tiene el `.txt` hermano modificado).** Catálogos porteados + rename ya
commiteados (`978e4615`, `e9625116`) que todavía no habían entrado a ningún
patch publicado (difieren del espejo v17, no de HEAD). `Text_vie.bmd`: su
fuente `.txt` es byte a byte idéntica al espejo v17 (la clave 5391, botón
"Change Class" del menú ESC, se agregó directo al `.bmd`) — verificado
estructuralmente que es un append limpio (creció 20 bytes, un solo byte más
cambia cerca del header, consistente con una entrada nueva al final de la
tabla, no una pisada), sin decodificar el contenido semántico del string
(formato no es texto plano).

**`Data/Interface/FontTest.OZT` (1 fichero).** Ya commiteado (`cf856d81`,
glifo del punto de miles en el atlas de daño) — entra solo porque el commit
es posterior a la publicación de v17, no por trabajo de hoy.

## Verificado

- **Compuerta de frescura de `Main.exe`**: verificada por PE link timestamp
  (no mtime) contra los 6 ficheros de C++ que tocaba `legacy-ui2`, dos veces
  independientes (team lead + yo), antes de generar. Pasó ambas veces.
- **CRC32 + tamaño** de ambos `.zip` recalculados de forma independiente
  (`zlib.crc32` sobre los bytes completos del archivo) — coinciden exacto con
  lo reportado por `make-patch.mjs` y con lo escrito en `version.txt`.
- **`patch.1..17`** del `version.txt` nuevo son byte a byte idénticos a
  `patch-manifests/version-v17.txt` (diff vacío, 17 líneas cada lado).
- **`latest=18`** presente; **`patch.18=`** con la URL/CRC/size correctos.
- **Cero ficheros prohibidos dentro de los zips generados** (no solo en el
  árbol): listado completo de `Patch18.zip` y `FullPatch.zip` vía `unzip -l`,
  grep case-insensitive por `Launcher.exe`, `config.ini`, `Mu.ini`,
  `MainEdit.exe`, `Main.lib`, `Main.pdb`, `Main.exp`, `Main` (bare), `.log`,
  `.bak` — cero coincidencias en ambos. Los 5 subproductos del compilador que
  quedaron al lado de `Main.exe` en `ClientFile/` (`Main`, `Main.exp`,
  `Main.lib`, `Main.pdb`, y el propio `Main.exe`) fueron correctamente
  filtrados por la exclusión automática del script — solo `Main.exe` entró.
- **`Data/Local/rex.main` y `Main.exe` están dentro de ambos zips**, con el
  tamaño exacto del fichero en disco (`unzip -l` vs `ls -la`).
- **Conteo de ficheros**: Patch18.zip = 29, FullPatch.zip = 1178 — idéntico a
  lo que había predicho el `--dry-run` previo. Sin sorpresas.
- `hashes-v18.json` y `version.txt` copiados a `patch-manifests/` como
  `version-v18.txt` / `hashes-v18.json`, verificados byte a byte idénticos a
  los de `patch-out/`.

## Deuda conocida (no bloquea publicar, pero afecta qué tan a fondo se auditó)

- `rex.main` no se decodificó byte a byte en su totalidad (solo se confirmó
  que cambió de verdad — diff binario + timestamp — no el contenido semántico
  completo de cada campo, como sí hizo Patch17 para el bloque de colores).
- `Text_vie.bmd`: se verificó la FORMA del cambio (registro nuevo, tamaño y
  contador consistentes) pero no el contenido semántico de la clave 5391 en
  vietnamita.
- No se re-verificó por HTTP que producción siga en `latest=17` en el momento
  exacto de generar (se confirmó antes, en el análisis previo, no en esta
  pasada).
- Deuda ya conocida de Patch17 sigue igual: Vietnamita sin las claves de HP de
  party/quest counters (5632-5634); Windows 7 con
  `GetSystemTimePreciseAsFileTime` como import estático.

## Pendiente ANTES de publicar (para el dueño)

1. Confirmar por HTTP que producción sigue en `latest=17` justo antes de subir
   nada (`https://rexmu.online/update/version.txt`) — no asumir que no cambió
   desde que se generó este patch.
2. Subir `Patch18.zip` y `FullPatch.zip` (`client-rex/patch-out/`) a R2.
3. Probar la actualización end-to-end contra los zips subidos.
4. Recién ahí publicar `version.txt` a Vercel (orden estricto del runbook:
   zips primero, manifest al final).
5. Nada de esto está commiteado (por instrucción explícita de esta tarea): si
   se aprueba, falta `git add` de los 29 ficheros del patch (en `ClientFile`)
   + `hashes-v18.json`, commit `chore(patch18): ...`, tag `client-patch-18`.
6. Decisión del dueño: si conviene commitear ya los 7 `GetMain/*.txt` (fuera
   de `ClientFile`, no entran a ningún zip pero son la fuente de lo horneado
   en `rex.main`) junto con este patch o aparte — mismo punto pendiente que
   dejó Patch17 con `CustomDmgColor.txt`.
7. Igual para el trabajo de C++ de `legacy-ui2` (`NewUIEmpireGuardianNPC.*`,
   `WindowClass.*`, `NewUICommonMessageBox.*`) — sin commitear, ya horneado
   dentro del `Main.exe` de este patch.
