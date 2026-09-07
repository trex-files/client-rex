# Patch 15 — GENERADO 2026-09-07 02:2x UTC, FALTA PUBLICAR

> El Patch 14 SÍ está en producción: `https://rexmu.online/update/version.txt` sirve
> `latest=14` y el CDN devuelve `Patch14.zip` de 9915972 B y `FullPatch.zip` de 52145799 B
> (el nuevo, ya no el cacheado viejo). Verificado por HTTP antes de generar.
> Este Patch 15 es el incremental v14 (producción) → build del 07/09 02:15 UTC.

## Números (verificados, CRC recalculado a mano sobre el zip completo)

```
Patch15.zip    crc=f0feb4c8  size=3621275   (3,5 MB)   1 fichero
FullPatch.zip  crc=d43f38a7  size=52149320  (49,7 MB)  1254 ficheros
version.txt    latest=15, 15 líneas (full + patch.1..15); patch.14 conserva 9ff695fd|9915972
```

Comando exacto:

```
node tools/make-patch.mjs --build ClientFile --version 15 --out patch-out \
  --mirror-hashes patch-manifests/hashes-v14.json \
  --baseline-hashes patch-manifests/hashes-v0.json \
  --prev-manifest patch-manifests/version-v14.txt
```

## Qué lleva: 1 solo fichero, `Main.exe`

El árbol `ClientFile` difiere del Patch 14 en **exactamente un fichero**. No hay ningún
cambio de datos pendiente: todos los assets, `.bmd`, textos, modelos y shaders ya salieron
en el 14. Los arreglos del 06/09 son todos de C++, así que viajan dentro del binario.

`Main.exe` enlazado **2026-09-07 02:15:35 UTC**, 13645312 B (el del 14 medía 13641728).

Arreglos que entran (los 5 fuentes con cambios pendientes, todos recompilados en ese build):

- **`CB_MUHelper.cpp/.h`** — Hellfire, Inferno, Nova y Twisting Slash ya aparecen en el
  picker de ataque del MU Helper: el criterio pasa de la heurística `Magic_Icon/MasteryType`
  a `SkillAttribute[].TypeSkill` (el campo que usa el propio motor para amigo/enemigo).
  Además las AoE autocentradas traen `Distance=0` en `Skill.bmd`, con lo cual "nunca había
  nada en rango" y el helper caminaba hacia el objetivo sin castear: se les asigna un rango
  de 4.0 dentro del radio 6 que aplica el servidor. Y los buffs dejan de colarse en los
  slots de ataque (`MuHelperIsBuffSkill`).
- **`WSclient.cpp/.h`** — party heal del helper. El paquete `C1:44` de GS 803 trae 13 bytes
  por miembro (`life`, `mana`, `name[11]`) y el cliente leía 1 solo byte, así que el
  `stepHP` era basura y la cura de party nunca disparaba. Ahora se decodifica el formato
  real y se casa **por nombre**, no por índice de slot (el servidor saltea slots vacíos).
  Coincide con `PMSG_PARTY_LIFE` de `Source/4.GameServer/GameServer/Party.h` (`>=802`).
- **`NewUIMyInventory.cpp`** — las flechas/virotes (y pociones) guardados en las páginas
  del inventario extendido eran invisibles para la recarga automática y para el helper:
  `FindItemReverseIndex` solo miraba la mochila principal 8x8. Ahora recorre también las
  páginas desbloqueadas, y el conteo por tipo las suma.
- **`wsclientinline.h`** — `SendRequestUse` leía `Inventory[Index]` con un índice absoluto
  que llega hasta 203, fuera del array. Se resuelve el ítem con `FindItem`.
- **`ZzzInterface.cpp` / `NewUIMainFrameWindow.cpp`** — dueño correcto del ítem agarrado
  cuando vive en la mochila extendida, y el picker de ataque filtrado por el criterio nuevo.

## Verificado

- CRC32 + tamaño de `full` y `patch.15` recalculados contra `version.txt`: OK.
- `Patch15.zip` contiene 1 fichero, `Main.exe`, byte a byte idéntico al del disco (sha256
  `51e1be7f…`); PE válido, 6 secciones, el fin de la última sección cae justo en el fin del
  fichero (no truncado); link timestamp 07/09 02:15:35 UTC.
- El build es **posterior** a los fuentes (últimos cambios 06/09 20:56) y es un rebuild
  completo: los **448 `.obj` de `BuildLog/5Main` llevan fecha 02:15**, entre ellos
  `CB_MUHelper.obj`, `WSclient.obj`, `NewUIMyInventory.obj`, `ZzzInterface.obj` y
  `NewUIMainFrameWindow.obj`. El link terminó sin errores. Ésta es la prueba de que el
  binario lleva los arreglos: no se dedujo de la fecha del fichero.
- `version.txt` conserva intactas las líneas `patch.1`..`patch.14` del manifest de producción.
- No es el cliente de pruebas: `MainEdit.exe` no aparece en el zip y el script lo excluye
  siempre por nombre.

## Pendiente conocido (NO es regresión de este parche)

- **Windows 7 sigue roto**: `GetSystemTimePreciseAsFileTime` continúa como import estático
  de `kernel32` en este build, igual que en el del Patch 14 (443 imports en ambos). Los
  Win7 que ya no arrancaban, siguen sin arrancar. Decisión pendiente del dueño.

## Publicar (manual, en este orden)

1. Subir `patch-out/Patch15.zip` y `patch-out/FullPatch.zip` a R2.
2. Purgar `FullPatch.zip` en Cloudflare (si no, las instalaciones nuevas fallan el CRC).
3. Subir `patch-out/version.txt` a `Source/5.Webapp/web/update/version.txt` (webapp-rex →
   Vercel → `https://rexmu.online/update/version.txt`) **AL FINAL**. Ojo: NO va en
   `dl.rexmu.online/patches/version.txt`, ahí da 404.

Nada probado en juego: no hay cliente ejecutable ni toolchain Windows en este entorno.
