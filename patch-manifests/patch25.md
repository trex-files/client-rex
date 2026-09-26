# Patch 25 — prueba cerrada de staff

> Mudanza de infraestructura + mercado filtrado en el servidor + cierre de dupeos.
> **Este parche cambia la IP del servidor OFICIAL.** Leer la seccion de despliegue
> ANTES de subir nada: el orden importa y equivocarse deja a los jugadores fuera.

## 1. Infraestructura: el servidor oficial se muda de VPS

| servidor | IP | puerto |
|---|---|---|
| oficial | **108.186.202.73** (antes `104.234.63.128`) | 63000 |
| battle | 104.234.63.218 (sin cambio) | 63000 |
| ASIA | 139.99.120.136 (sin cambio) | 63000 |

En el cliente: `IpAddress` = battle (primario), `IpAddress2` = oficial (secundario),
`EnableTwoServers = 1`.

Tocado y verificado:
- `ClientFile/Data/Local/rex.main` — verificado DESCIFRANDO el blob, no leyendo el
  `.ini`. Sin rastro de la IP vieja en los 3.716.460 bytes del cuerpo.
- `GetMain/MainInfo.ini`
- `muserver-rex/1.ConnectServer/ServerList.ini` (codigos 0, 1, 19; el 40 ASIA no se toca)
- `muserver-rex/4.GameServer/Data/MapServerInfo.dat` (lineas 15-17)
- `VPS-PUERTOS-FIREWALL.md` — la regla de puertos internos 63001-63003 whitelistea la
  IP del oficial. **Si no se cambia, el VPS nuevo queda bloqueado.**

### 🛑 Trampa que casi se cuela
El commit `feat(tintado)` REHORNEO `rex.main` aguas arriba, y ese blob traia la IP
VIEJA, porque se genero desde el `MainInfo.ini` commiteado mientras el valor bueno
vivia como cambio local sin commitear. Un merge normal habria pisado el parche y el
cliente habria salido apuntando al VPS apagado. Se resolvio conservando el blob de
upstream (trae los textos del tintado) y re-aplicando el parche de IP encima.
**Regla: verificar la IP descifrando el blob, nunca leyendo el `.ini`.**

### Fuera del zip — lo hace el dueño a mano
- `SERVERS_ENDPOINTS` en el `.env` del VPS y en Vercel:
  `latam=108.186.202.73:63000,sea=139.99.120.136:63000`.
  El exe NO lleva ninguna IP dentro (se lee con `?? ""`, sin default).

## 2. Mercado: el servidor filtra, el cliente solo muestra

Antes el cliente pedia pagina por pagina y filtraba en local: una categoria mas un
checkbox producian pagina tras pagina con una o dos filas, y el resto de coincidencias
quedaban varadas en paginas que el jugador nunca veia. Ahora el filtro viaja al
servidor y vuelve ya filtrado.

- **"My Class"** viajaba como lista de indices del catalogo y no cabia en los 500 slots
  del paquete: las 7 clases dan 724-885 indices. Ahora viaja como **un byte**
  (`Reserved` en el offset 13 pasa a `ReqClass`; sizeof y offsets intactos, sin cambio
  de layout) y el GameServer lo expande contra su catalogo.
- **Regla de "My Class"** (decision del dueño): solo equipo usable por la clase. Dentro
  Kris, anillos, pendientes, aretes, armas, armaduras. Fuera joyas, consumibles, plumas,
  Imp/Fenrir y alas no restringidas a la clase. Implementado por SLOT.
- **Escudo** viaja como ventana `IndexMin/IndexMax` sobre `[ITEM_SHIELD, +512)` con
  `TypeItem=1` (la categoria 1 del DataServer es "armas Y escudos").
- **Solo joyas** viaja como lista de indices en `SearchIndices`.
- Ninguno de los dos cambia el layout cliente<->GameServer: usan campos que el
  `0xD3:0x27` ya tenia.

## 3. Crashes cerrados (estos mataban el proceso sin dejar log)

`vsprintf_s` sobre un array fijo **no trunca**: invoca el invalid parameter handler y
mata el proceso. Sin excepcion, sin retorno, sin log. Estaba en 5 sitios:
- `QueryManager::ExecQuery` — `buff[4096]`. Una consulta de "My Class" medía 4632 bytes:
  reproducible al 100%. Ahora `buff[16384]` con `_vsnprintf` y **rechazo** si no entra
  (no truncar: un WHERE cortado borraria de mas).
- `Log.cpp` del DataServer y del GameServer — el crash estaba DENTRO del logger.
- `CB_AutoRecharge.cpp` — `SendMessGobal` y `GetAPIDataString`.

## 4. 🛑 Orden de despliegue — el riesgo real de esta tanda

1. **Correr la migracion SQL PRIMERO**:
   `muserver-rex/0.Database/SQL Back/Migrate_ItemMarketData_FilterColumns_2026-09-23.sql`
2. **DataServer** (un GS nuevo contra un DS viejo no revienta, pero el 0x27 y el
   TwoPhase no funcionan).
3. **GameServer** / GameServerCS.
4. **Cliente** (aditivo: un cliente viejo nunca manda 0x27, asi que no hay prisa).

**Reiniciar los procesos de verdad.** Un hash igual del exe no prueba nada si el
proceso viejo sigue vivo.

## 5. Limitacion conocida

No usar **Reload -> Item** del panel mientras haya gente navegando el mercado: la
expansion de clase llama a `gItemManager.GetInfo` contra el `std::map` que el hilo de
GUI vacia al recargar. El arreglo son 7 bitmaps de 1 KB al final de `Load`, pendiente.

## 6. Verificacion

Suite en `tools/market-verify/`: **29 pasos, 313 checks, 0 fallos**. Los harness
compilan y ejecutan las funciones REALES extraidas del arbol, y los fixtures se
generan del `Item.txt` real. Auditoria independiente del diff: sin CRITICAL ni HIGH.
