# Patch 23 — Mercado (+ un cambio de Dark Side que se coló del 22)

Generado 2026-09-17. `latest=23`.

| Archivo | crc32 | tamaño |
|---|---|---|
| `Patch23.zip` | `904115f1` | 3.678.532 |
| `FullPatch.zip` (regenerado) | `53a0f929` | 52.781.461 |

**FullPatch se REGENERÓ** porque cambia `Main.exe`: si se publica el manifest
sin subir el FullPatch nuevo, se rompe también la instalación limpia.

## Contenido — 5 archivos

| Archivo | Qué trae |
|---|---|
| `Main.exe` | Todo el mercado (ver abajo) |
| `Data/Local/Eng/skill_eng.bmd` | Dark Side (263): delay **10 → 0** |
| `Data/Local/Spn/skill_spn.bmd` | ídem |
| `Data/Local/Por/Skill_por.bmd` | ídem |
| `Data/Local/Vie/skill_vie.bmd` | ídem |

### Mercado (`Main.exe`)
- **"My Items" ahora está en el desplegable de categorías Y sigue el botón** —
  dos vías, imposibles de desincronizar: la categoría seleccionada *es* el modo.
- **Se acabó el "No hay suficiente espacio en el inventario" al cerrar el
  formulario tras publicar.** El cliente ya no suelta su copia del ítem al
  *mandar* el pedido, sólo cuando el servidor confirma que lo soltó él.
  Eso además cierra un camino por el que un rollback rechazado de verdad
  (inventario lleno) dejaba el ítem retenido en el servidor e invisible para
  el jugador hasta reloguear.
- Reseteo del estado de búsqueda al cerrar la ventana; la recuperación de página
  vacía ya no reabre una ventana cerrada; clamp del valor de días al cable.

### ⚠️ Dark Side (263): delay 10 → 0
Cambio del **16/09 21:38**, 49 minutos después de generarse el Patch22 — por eso
viaja acá y no allá. Es el **único** skill que difiere (barrido de los 650).

**Ojo con esto:** el delay del cliente no es el único freno. `CheckSkillCastRate`
(Window 167 / MaxCasts 1 / **Action=1 = descarta en silencio**) deja el piso real
en **167 ms** del lado del servidor. Con el delay del cliente en 0, el cliente
manda todo lo que el jugador clickee y el servidor tira lo que sobra **sin avisar**
— que es exactamente el síntoma de "se come golpes". Si tras el parche vuelve ese
reporte, mirar ese gate, no el delay.

Los `.bmd` son compartidos con el cliente móvil (`resolve_src` cae a
`client-rex/ClientFile/`), así que Android arrastra el mismo cambio.

## Servidor — NO va en este zip, pero el patch lo necesita
`DataServer`, `GameServer` (+GSCS), `ConnectServer` y `JoinServer` tienen cambios
y hay que recompilarlos. **El servidor va ANTES que los clientes:** el cliente
nuevo manda `0xD3:0x26` (búsqueda) y el binario desplegado no lo tiene.
Y ASIA está en otro VPS: se copia y reinicia a mano.

## Publicación
1. `Patch23.zip` y `FullPatch.zip` → **R2 primero**.
2. Recién entonces commitear `update/version.txt` en `webapp-rex` (rama `main`).
3. **Deploy en Vercel a mano.** Pushear no publica nada.
