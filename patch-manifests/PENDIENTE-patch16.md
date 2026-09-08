# Patch 16 — GENERADO 2026-09-08, FALTA PUBLICAR

> Producción está en `latest=15`, verificado por HTTP antes de generar:
> `dl.rexmu.online/patches/Patch15.zip` responde 200 con 3.621.275 B, que coincide
> exacto con el manifiesto (`crc f0feb4c8`). Este Patch 16 es el incremental v15 → build actual.

## Números

```
Patch16.zip    crc=b95248ac  size=5563076    (5,3 MB)   36 ficheros
FullPatch.zip  crc=4c42b94a  size=53540276   (51 MB)    1277 ficheros
version.txt    latest=16
```

Comando exacto:

```
node tools/make-patch.mjs --build ClientFile --version 16 --out patch-out \
  --mirror-hashes patch-manifests/hashes-v15.json \
  --baseline-hashes patch-manifests/hashes-v0.json \
  --prev-manifest patch-manifests/version-v15.txt
```

## Qué lleva

**Grand Tree (18 ficheros).** El atlas `GrandTree_Icons.ozt` (256x256) es el único
que carga el cliente de escritorio; los 16 `GrandTree_Ico_NN.ozt` los referencia
solo el cliente móvil por patrón `%02d`. Van igual: no rompen nada, el motor
simplemente no los toca.

**Textos, 4 idiomas (8 ficheros).** +40 claves 7027-7066 del Grand Tree más la 5398
del menú Escape. Auditado contra HEAD: **cero claves perdidas** en los 4 idiomas —
los `.bmd` se editaron directo, NO se regeneraron desde los `.txt`, que están 43-51
claves atrasados y habrían borrado esas claves en silencio.

**Skills, 4 idiomas (4 ficheros).** 9 valores de `Distance` bajados al `Range` del
servidor. Dark Side venía con cliente 5 contra servidor 4 desde el 28/07 (7633cfc):
banda muerta que rechazaba en silencio todo golpe que cayera en (4,5], con 204
rechazos medidos en producción. Más las 11 filas de `ReqEnergy` de Summoner a 0.
Portugués (`Skill_por.bmd`, con S mayúscula) no tenía ninguno de los dos juegos.

**Insignias VIP (6 ficheros).** Del commit 0986c197, de otra sesión.

**Main.exe.** Linkeado 2026-09-07 20:31 UTC. Incluye el Grand Tree (verificado por
símbolos dentro del binario).

## Lo que NO entra

Cinco fuentes del cliente cambiaron **después** de ese build y no están en este
binario: `NewUIMyInventory.cpp/.h`, `WSclient.cpp`, `ZzzInterface.cpp`,
`CB_CancelExc.h`. Van en el 17, o se recompila el `Main.exe` y entran acá.

## Deuda conocida

`Text_vie.bmd` no tiene las claves **5632/5633/5634** (3693 claves contra 4521 de
los otros tres). El cliente vietnamita no puede dibujar el texto del HP de party
(`GlobalText[5632] = 'HP : %d0%%'`, NewUIPartyListWindow.cpp:194) ni los dos
contadores de quest. No es regresión de este parche: ya faltaban.

## Publicación

Subir los `.zip` a R2 y **publicar `version.txt` AL FINAL**.
