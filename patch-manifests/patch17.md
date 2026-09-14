# Patch 17 — PUBLICADO (verificado 2026-09-14: version.txt de produccion latest=17, byte a byte igual a version-v17.txt)

> Producción está en `latest=16`, verificado por HTTP antes de generar:
> `https://rexmu.online/update/version.txt` responde `latest=16`, `full` y
> `patch.1..16` byte a byte idénticos a `patch-manifests/version-v16.txt`. Este
> Patch 17 es el incremental v16 (producción) → árbol actual de `ClientFile`
> (HEAD `a203e3d9` + 2 ficheros locales sin commitear: `rex.main`, `Main.exe`).

## Números

```
Patch17.zip    crc=f91e7cd5  size=6528791    (6,2 MB)   120 ficheros
FullPatch.zip  crc=01aa1075  size=52720031   (50,3 MB)  1173 ficheros
version.txt    latest=17
```

CRC32/size recalculados de forma independiente sobre los bytes de cada `.zip`
(`zlib.crc32`), coinciden con lo que reportó `make-patch.mjs`. Las líneas
`patch.1..16` del `version.txt` generado son byte a byte idénticas a las de
producción (diff vacío). 0 ficheros prohibidos en ningún zip (`Launcher.exe`,
`config.ini`, `Mu.ini`, `MainEdit.exe`, `.pdb/.log/.bak`, `Main.lib`) — barridos
y ausentes en ambos.

Comando exacto:

```
node tools/make-patch.mjs --build ClientFile --version 17 --out patch-out \
  --mirror-hashes patch-manifests/hashes-v16.json \
  --baseline-hashes patch-manifests/hashes-v0.json \
  --prev-manifest patch-manifests/version-v16.txt
```

(Corrido contra `/workspace/_tmp/patch17/patch-out/`; salida no copiada a
`patch-out/` del repo todavía — ver "Pendiente" abajo.)

## Qué lleva (120 ficheros, los 120 explicados por el árbol; 0 sorpresas)

**Cambio de clase por ticket, textos + ítem (12 ficheros).** Commit `a203e3d9`
sobre `6f9b9d67`: `Text_{eng,spn,por}.txt` claves 5259/5261/5391/5573 (ventana y
botón dicen "Cambio de Clase", piden "%s Ticket de Cambio de Clase") +
`Custom/Text_Eng.ini` + `Item_/ItemTooltip_` de los 4 idiomas (ítem 14,431
renombrado "Class Change Ticket", aplicado sobre los catálogos ya porteados del
dev). `Text_vie.txt` no lleva las 3 claves de cambio de clase (no lo tocó este
commit); ver deuda conocida abajo.

**Catálogos de ítems porteados del dev, 4 idiomas (dentro de los 8
Item_/ItemTooltip_ ya contados arriba).** Commit `6f9b9d67`: ReqLevel a 0 en
~650 ítems, 6 arreglos de daño, conversión de apóstrofo en 97 nombres (por
idioma, no copiando el inglés), merge a 3 bandas de tooltips + 8 entradas de
tooltip restauradas (5 Elixires, Summoner/Rage Fighter Character Card) que el
linaje del dev había perdido. Auditado por el commit: 0 transformaciones
ilegales, 2095 claves, 0 ítems sin tooltip.

**Mix.bmd (1 fichero).** Commit `67c48a07`: receta 36 (Dinorant) acepta el
Talisman de la Suerte en la caja — 1 solo byte de diferencia (`charmOption`
`U`→`A`), servidor ya lo aceptaba.

**Data/Player + Data/Item, 105 ficheros (100 + 5).** Commit `ccd91656`: deshace
el cruce introducido por el merge "New Visual" (590ad32f, 04/09) — 100 ficheros
de `Data/Player` habían quedado byte a byte iguales al `Data/Item` homónimo (los
modelos HQ de REX pisados por los stock de Webzen, con su propia malla de piel:
el MG "no le calzaba" el equipo) y 5 `ArmorElf0N` tenían el cruce completo
Player↔Item ida y vuelta. Se restauran ambas carpetas a su estado previo al
merge, verificado byte a byte contra `590ad32f^`. Los otros 65 ficheros de ese
merge (modelos genuinamente nuevos del pack) NO se tocan.

**`Data/Local/rex.main` (1 fichero, blob regenerado).** Diferencia con el
`rex.main` de HEAD/producción: **62 bytes en total**, los 16 rangos de
`CustomDmgColor[0..7]` (índice + RGB), decodificados a mano con el esquema real
(`Source/6.GetMainInfo/GetMainInfo.cpp::RexObfuscate`: `byte += n*13+7`;
nibble-swap; `xor kRexObfKey[n&7]`, per-posición sin realimentación → diffear
los blobs obfuscados ya revela el diff en claro). Los valores nuevos coinciden
exacto con el `GetMain/CustomManager/CustomDmgColor.txt` local sin commitear
(colores de números de daño, cosmético). **Verificado explícitamente:**
`IpAddress`, `IpAddress2`, `EnableTwoServers`, `ClientSerial`, `ClientVersion` y
el resto del struct son BYTE A BYTE idénticos entre el `rex.main` de HEAD y el
de disco — sigue siendo `104.234.63.218` (primario) / `104.234.63.128`
(secundario, VPS), el par de producción documentado en `GetMain/MainInfo.ini`
(que en sí no tiene diff, está limpio). Ningún IP de prueba se coló.

**`Main.exe` (1 fichero).** Enlazado **2026-09-10 18:46:41 UTC** (PE link
timestamp), 13.663.744 B, sha256 `f8b211e8…`. Rebuild completo: los 449 `.obj`
de `BuildLog/5Main` caen en la ventana 18:46:21–18:46:41, y el `.log` termina
con el link OK + post-build de shaders sin error. Incluye:
- Los 3 commits de C++ del cliente posteriores al Main.exe de Patch16 (linkeado
  08/09 14:34): `88e00318e` (paridad Windows del código que sólo vivía en
  linux-server: `ServerFamily.cpp/h`, `WSclient.cpp`, `Protect.cpp`,
  `NewUICharacterInfoWindow.cpp`, etc.), `081a36448` (elegibilidad +380 sale de
  `ItemAddOption.bmd`, no de `RequireLevel`), `b003dc1ad` (tamaño del paquete de
  party list, limpieza de objeto fantasma, hardening de CS — incluye
  `CB_GrandTree.cpp/h`, `Winmain.cpp`, `ZzzInterface.cpp`).
- 5 ficheros con cambios de C++ **sin commitear** en el árbol del dueño:
  `CB_GetMixRate.cpp/h`, `MixMgr.cpp`, `NewUIMessageBox.cpp`,
  `Platform/win32/{ShellAPI,Wininet}.h` — sus `.obj` recompilaron dentro de la
  misma ventana de build (18:46:21–29), después de la última edición de esos
  fuentes (09/09 22:50 y 08/09 20:54).
- El commit `a203e3d9` (cambio de clase) es solo datos (`.bmd`/`.ini`/`.txt`),
  no toca `Source/7.Main` — no había nada de C++ que ese build necesitara
  incluir por ese lado.

No hay ningún fichero de `Source/7.Main` modificado DESPUÉS del build (solo
cachés de Visual Studio en `.vs/`, irrelevantes). **Veredicto: Main.exe está al
día, no hace falta recompilar.**

## Verificado

- Producción confirmada en `latest=16` antes de generar (no es el error de
  Patch13: acá SÍ es un patch nuevo sobre lo que está publicado).
- Los 120 ficheros del `Patch17.zip` quedan explicados 1:1 por el árbol
  (`git diff` desde el commit de Patch16 + los 2 ficheros locales sin
  commitear); cero ficheros gitignored/sorpresa.
- CRC32 + tamaño recalculados de forma independiente para ambos `.zip`.
- 0 ficheros prohibidos en ningún zip.
- `version.txt`: `patch.1..16` byte a byte idénticos a producción; `full` y
  `patch.17` con CRC/size recién calculados.
- `rex.main`: diff decodificado byte a byte contra HEAD — sólo el bloque de
  colores de daño cambia; IPs, puerto, `ClientSerial` y el resto intactos.
- `Main.exe`: rebuild completo verificado por timestamps `.obj`/PE + `Main.log`
  sin errores; cubre los 3 commits de C++ posteriores a Patch16 y los 5
  ficheros locales sin commitear.

## Deuda conocida (no es regresión de este parche)

- `Text_vie.bmd`/`Text_vie.txt` siguen sin las claves 5632/5633/5634 (HP de
  party, contadores de quest) — ya faltaban desde Patch16. Tampoco llevan las 3
  claves nuevas de cambio de clase (ese commit no tocó vietnamita).
- Windows 7 sigue con `GetSystemTimePreciseAsFileTime` como import estático —
  decisión pendiente del dueño, sin cambios en este parche.

## Pendiente ANTES de publicar (para el dueño)

1. Copiar `Patch17.zip` / `FullPatch.zip` / `version.txt` /
   `hashes-v17.json` de `/workspace/_tmp/patch17/patch-out/` a
   `client-rex/patch-out/` (o donde se suban desde ahí a R2) — quedaron en el
   scratchpad por instrucción de no tocar `/tmp` del proyecto.
2. Nada de esto está commiteado ni pusheado (por instrucción explícita de esta
   tarea). Si se aprueba, falta: `git add` de los 120 ficheros + `hashes-v17.json`,
   commit `chore(patch17): ...`, tag `client-patch-17`.
3. Publicar (orden estricto, runbook §2): subir zips a R2 → probar → recién
   ahí `version.txt` a Vercel.
4. `GetMain/CustomManager/CustomDmgColor.txt` (fuera de `ClientFile`, no entra a
   ningún zip) quedó sin commitear — decisión del dueño si se comitea junto con
   este patch o aparte; su efecto ya está horneado dentro de `rex.main`.
