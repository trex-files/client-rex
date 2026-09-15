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

**Main.exe.** Linkeado **2026-09-08 14:34:34 UTC** (PE link timestamp, medido sobre
el binario que está dentro del zip). Incluye el Grand Tree, verificado por la cadena
`GrandTree_Icons` dentro del binario.

CORRECCIÓN sobre la primera versión de este manifiesto: decía 2026-09-07 20:31. Ese
era el build anterior; el binario se recompiló el 08/09 a las 14:34 y es ese el que
se empaquetó. El mensaje del commit fc31ec54/4dca1e28 arrastra la fecha vieja.

## Lo que entra en el binario

Las cinco fuentes que el manifiesto anterior daba por fuera son TODAS anteriores al
build de las 14:34 — `CB_CancelExc.h` 02:11, `NewUIMyInventory.h` 03:49,
`NewUIMyInventory.cpp` 03:57, `WSclient.cpp` 04:22, `ZzzInterface.cpp` 13:23 — así
que entran: el retiro de ítems de la tienda personal, la cura de party del helper
(decodificado C1:44 de 13 bytes) y la paridad de Power Slash montado en Fenrir.

Salvedad honesta: el timestamp del PE prueba CUÁNDO se linkeó, no DESDE QUÉ árbol.
No hay forma de verificar la correspondencia fuente-binario desde este entorno
(no hay MSVC). Si el build salió de un árbol desactualizado, esto no lo detecta.

## Deuda conocida

`Text_vie.bmd` no tiene las claves **5632/5633/5634** (3693 claves contra 4521 de
los otros tres). El cliente vietnamita no puede dibujar el texto del HP de party
(`GlobalText[5632] = 'HP : %d0%%'`, NewUIPartyListWindow.cpp:194) ni los dos
contadores de quest. No es regresión de este parche: ya faltaban.

## Publicación

Subir los `.zip` a R2 y **publicar `version.txt` AL FINAL**.
