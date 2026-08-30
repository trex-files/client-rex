# Patch 11 — listo para publicar (2026-08-30)

Zips ya generados y verificados en `patch-out/`. **Falta solo publicarlos.**

## Que lleva

| Fichero | Que aporta |
|---|---|
| `Main.exe` | preview de Event&Invasion rehecho (ver abajo) |
| `Data/Custom/Monster/MonsterHP.txt` | tabla de respaldo regenerada a `MonsterLifeRate = 100` |
| `Text_{eng,por,spn,vie}.bmd` + `.txt` | strings del Hunting Log en los 4 idiomas |

**Main.exe** trae, acumulado de toda la sesion:
- Preview de Event&Invasion: **16 de 37 clases mostraban otro monstruo**; la tabla
  ahora se GENERA desde `CreateMonster` (157 filas, `tools/gen_monster_remaps.py`).
- Grizzly / Captain Grizzly / Medusa no tenian `case` en `CreateMonster`: salian como
  Bull Fighter **tambien in-game**.
- Bloque HP / ATK|DEF / mapas debajo del modelo, con separador de miles.
- El panel flotante de desglose por mapa **se elimino**; su contenido es ahora la
  tercera linea del preview.
- Titulo al doble (`g_hFontBig`), fondo negro plano al 80% en vez de la textura
  estirada del form.
- Abrir Event&Invasions cierra el resto de la UI.
- Hunting Log: fila "Ocultar" + traduccion.
- MU Helper: la caminata de vuelta al punto.
- HP/ATK/DEF empujados por el servidor (`0xFB:32`), con el `.txt` de respaldo.

## Numeros verificados

```
Patch11.zip   crc=b36c4241  size=4136393    10 ficheros
FullPatch.zip crc=847ff8ed  size=39714721  838 ficheros
version.txt   latest=11, 12 lineas (full + patch.1..11)
```

Verificado antes de dar por buenos los zips:
- CRC32 y tamaño de **las 12 entradas** del manifest contra los ficheros reales: 12/12 OK.
- `rex.main` DENTRO del FullPatch es `81697435...` = **produccion (.218)**, no la de pruebas.
- `Main.exe` del zip es identico byte a byte al compilado.
- Sin `.pdb`, `.exp`, `.ruff_cache`, `Launcher.exe` ni `config.ini` en ningun zip.
- `hashes-v11.json` difiere de v10 en **exactamente esos 10 ficheros**.

## Publicacion — EL ORDEN IMPORTA

El `version.txt` **ya esta comiteado** en `Source/5.Webapp/web` (`20403ad`), **SIN PUSHEAR**.
Ese repo despliega solo por Vercel al pushear a `main`, asi que el push ES la publicacion.

1. **Zips a R2 PRIMERO** (`Patch11.zip` y `FullPatch.zip`).
2. **Purgar Cloudflare**: `FullPatch.zip` conserva el nombre entre versiones y queda cacheado.
3. **Recien ahi `git push` en `Source/5.Webapp/web`** (y el bump del superrepo).

Estado comprobado el 30/08 23:5x contra `dl.rexmu.online`:
- `Patch11.zip` -> **404**, no subido.
- `FullPatch.zip` -> 200 pero pesa **39.702.490** = el **viejo de la v10**. El nuevo son
  39.714.721. Pushear antes de reemplazarlo hace que el launcher **rechace la descarga por
  CRC** (el manifiesto diria `847ff8ed` y bajaria `fb0e55d0`).

Para re-chequear antes de pushear:

    curl -sI https://dl.rexmu.online/patches/Patch11.zip   | head -1   # tiene que dar 200
    curl -sI https://dl.rexmu.online/patches/FullPatch.zip | grep -i content-length   # 39714721

## Lado servidor — se puede desplegar por separado

El patch **no** necesita que el servidor vaya a la par (a diferencia del Patch 10, donde
el tamaño de las flechas obligaba). El push `0xFB:32` tiene respaldo: si el servidor no
manda nada, el cliente usa su `.txt`.

Pero para que se vea lo nuevo hay que desplegar `muserver-rex`:
- **Invasion Guardians** (indice 10, 8 bosses uno por pueblo, 02/09/16/21 h).
- **`MonsterLifeRate` 150 -> 100** y **`GeneralDamageRatePvM` 164 -> 109**: el tiempo de
  matar NO cambia (-0,3%), pero los numeros del fichero y los del juego ahora coinciden.
- Binarios `GameServer.exe` / `GameServerCS.exe` con el orden de invasiones por archivo
  y el orden interno por nivel de monstruo.

🔴 **Desplegar la carpeta `Data` ENTERA, nunca ficheros sueltos.** Las 8 filas Guardian de
`EventItemBagManager.txt` tienen dependencia DURA con `Data/EventItemBag/Monster/Guardian/`:
si falta un bag, `CItemBag::Load` llama a `ErrorMessageBox`, que hace `ExitProcess` — el
**GameServer no arranca**.

🟡 `MapServerInfo.dat` vive dentro de `Data/` y lleva la IP de **produccion** `.218`. No
volcar esta carpeta en un servidor de pruebas.

## Despues de publicar

- `/reload monster` en el GS si se toca `MonsterList.txt` (no `/reload all`: ese a
  proposito NO re-empuja la tabla, ver `CommandManager.cpp:3655`).
- Si se toca `MonsterList.txt`, **regenerar tambien** la tabla del cliente:
  `node tools/gen-client-monsterhp.mjs`.

## Abierto, no bloquea

- **26 de 565 monstruos cambian de barra de vida** por el cambio de rate (los umbrales
  100k/1M/50M se evaluan sobre la vida ya multiplicada). Cosmetico. Si se quieren
  conservar, hay que bajar los umbrales en la misma proporcion.
- ~~**Giant (clase 7) quedo en 30.000 de vida**, nivel 50.~~ **CERRADO 30/08**: el dueño
  pidio igualarlo a Stone Golem. Ya lo estaba — clase 7 y clase 32 son ambas Lv 50 con
  30.000 de vida. Sin cambio, sin regenerar la tabla del cliente, sin rehacer los zips.
- **Sapi Queen (560)** sigue sin modelo identificado.
