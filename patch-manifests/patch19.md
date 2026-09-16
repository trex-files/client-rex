# Patch 19 — GENERADO (2026-09-16, pendiente de publicar)

Cambio único: **Dark Side (RF) pasa de Delay 275 a Delay 10.**

Patch 18 está publicado (confirmado por el dueño), así que 19 encadena limpio encima:
el manifest arrastra `patch.1` … `patch.18` y agrega `patch.19`.

## Números

```
Patch19.zip    crc=4a2368f4  size=31983      (31 KB)     4 ficheros
FullPatch.zip  crc=13e3d0c6  size=52777287   (50,3 MB)   1178 ficheros
version.txt    latest=19  (19 lineas patch.N)
```

CRC32/size recalculados de forma independiente sobre los bytes de cada `.zip`
(`zlib.crc32`, Node) — coinciden exacto con lo que reportó `make-patch.mjs` y con
lo escrito en `version.txt`.

Comando corrido (tal cual):

```
cd /workspace/mu-sourcecode/client-rex
node tools/make-patch.mjs --build ClientFile --version 19 --out patch-out \
  --mirror-hashes   patch-manifests/hashes-v18.json \
  --baseline-hashes patch-manifests/hashes-v0.json \
  --prev-manifest   patch-manifests/version-v18.txt
```

## Contenido de Patch19.zip — los 4 ficheros, nada más

```
Data/Local/Eng/skill_eng.bmd
Data/Local/Por/Skill_por.bmd
Data/Local/Spn/skill_spn.bmd
Data/Local/Vie/skill_vie.bmd
```

Un `--dry-run` previo predijo 4 / 1178 y la generación real dio 4 / 1178 — la lista
no cambió entre el análisis y la generación.

## Cómo se editaron los .bmd

Con `tools/skillbmd_codec.py` (ya existía, no se escribió nada nuevo). El record 263
es Dark Side en los 4 idiomas; el campo `Delay` es un WORD little-endian en el
offset 44 del record decodificado.

Verificación byte a byte contra una copia previa: **cambian exactamente 2 bytes por
fichero**, en el offset `23188` (`0x5A94`) = `263*88 + 44`:

```
offset 23188 (0x5A94): 0x13 -> 0xF1
offset 23189 (0x5A95): 0x77 -> 0x76
```

(los bytes en disco están XOR'eados con BuxConvert `{0xFC,0xCF,0xAB}`; decodificados
son `275` -> `10`.)

El DWORD de checksum del final quedó **intacto** en los 4 — es lo correcto:
`GenerateCheckSum2` no está en el código visible y la verificación está comentada
tanto en el loader de desktop como en el de mobile (`ZzzInfomation.cpp`), así que
recalcularlo mal sería estrictamente peor que dejar un valor viejo que nadie lee.

Se reverificó `roundtrip_ok()` == True en los 4 ficheros ANTES de escribir, y se
releyó cada fichero DESPUÉS para confirmar `Delay == 10` y el nombre intacto.

## Las variantes master ya estaban en 0

No hacía falta tocarlas — se verificó:

| idx | nombre | Delay |
|-----|--------|-------|
| 263 | Dark Side | 275 -> **10** |
| 559 | Dark Side Strengthener | 0 (ya) |
| 563 | Dark Side Mastery | 0 (ya) |

## 🔴 OJO — el Delay NO es el único freno de Dark Side

Bajar el Delay a 10 mueve el piso de **275 ms a 167 ms**, no a 10 ms. Hay tres
gates independientes y el de Skill.txt es el más flojo de los tres:

| # | Gate | Dónde | Valor | ¿Exime el combo de 5? |
|---|------|-------|-------|------------------------|
| 1 | `CheckSkillDelay` | `SkillManager.cpp:843`, lee `Skill.txt` col. Delay | 275 -> **10** | **Sí** (`GetRageComboMax(263)=5`) |
| 2 | `CheckSkillCastRate` | `HackSkillCheck.cpp:150`, `GameServerInfo - Common.ini` | Window 167 / MaxCasts 1 / **Action=1 = descarta** | **NO** |
| 3 | `MU_RAGE_CAST_THROTTLE_MS` | cliente, `wsclientinline.h:591` | 120 ms | no aplica (es por paquete) |

El gate 2 es el que manda ahora: 167 ms por cast = 6 casts/s, y `Action=1` **descarta
el cast en silencio** (loguea a lo sumo 1 línea por minuto y por jugador).

Y lo más importante: **el gate 2 no tiene exención de combo.** El combo de Dark Side
está diseñado para encadenar 5 golpes salteándose el cooldown (gate 1 lo exime
explícitamente), pero esos mismos golpes sí pasan por el gate 2 y los que caen a menos
de 167 ms del anterior **se descartan**. Si el síntoma que reportan los RF es "Dark
Side se come golpes" / "la cadena no sale entera", el culpable más probable es este
gate, no el Delay.

**No se tocó el gate 2 en esta pasada**: es global a todas las skills y su valor salió
de una calibración medida sobre logs reales (ver el comentario de `SkillCastRateCoalesceMs`
en `HackSkillCheck.cpp`, y la memoria de balance del 28/08). Cambiarlo es decisión del
dueño. Opciones, de menor a mayor alcance:

- **Quirúrgica**: eximir Dark Side del gate 2 durante la ventana de combo (misma
  condición que usa `CheckSkillDelay`: `RageFighterSkillIndex == index &&
  RageFighterSkillCount < GetRageComboMax(index)`). Toca sólo al RF en combo. Requiere
  recompilar el GameServer.
- **Por .ini, sin recompilar**: bajar `SkillCastRateWindowMs` (167 -> p. ej. 100).
  Afecta a TODAS las skills, no sólo Dark Side.
- **Diagnóstico primero**: poner `SkillCastRateAction = 0` (sólo loguea, no descarta)
  y `SkillCastRateLogMs` bajo un rato, para medir cuántos casts de Dark Side se están
  descartando hoy antes de decidir. Es reversible en caliente.

## Servidor — va junto con este patch

`muserver-rex/4.GameServer/Data/Skill/Skill.txt` línea 108: columna `Delay` 275 -> 10.
Es un único fichero compartido por los 4 mundos (no hay uno por mundo). No requiere
recompilar: `Skill.txt` se lee como dato.

## Pendiente de publicar (no lo puedo hacer yo — no hay credenciales de R2 en el sandbox)

1. Subir `patch-out/Patch19.zip` **y** `patch-out/FullPatch.zip` a R2 `patches/`.
   ⚠️ El `FullPatch.zip` **se regeneró** (crc `da0f8d76` -> `13e3d0c6`). El manifest v19
   apunta al nuevo, así que si subís sólo `Patch19.zip` y no el FullPatch, una instalación
   nueva baja el FullPatch viejo y **falla la verificación de CRC**. Los dos o ninguno.
2. Probar como usuario (§3 del `UPDATE-RUNBOOK.md`).
3. Recién ahí publicar `version.txt` en Vercel (si va antes → ventana de 404).
4. Copiar `Data/Skill/Skill.txt` al VPS (los 4 mundos comparten el fichero).
