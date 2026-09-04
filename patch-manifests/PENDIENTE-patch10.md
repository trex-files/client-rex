# Patch 10 — pendiente (actualizado 2026-08-26)

Lleva DOS cosas:

## 1. Flechas y virotes 1x2 -> 1x1
El patch 9 los dejo en **1x2**, pero el tamaño correcto es **1x1** (asi los tiene el
dataset vanilla de `8.Tools/CashShopEditor/Data/Item.txt`).

Ya cambiado y comiteado en:
- `ClientFile/Data/Local/{Eng,Por,Spn,Vie}/Item_*.bmd` — offset 39 del registro de 84 B
- `muserver-rex/4.GameServer/Data/Item/Item.txt` — columna Height, filas 4,7 y 4,15
- `Source/5.Webapp/api/mudata/.../Item.txt` — el espejo

⚠️ **El servidor y el cliente tienen que ir a la par.** El GameServer valida la colocacion
en el inventario; si los tamaños no coinciden, rechaza los movimientos. Reiniciar el
GameServer junto con la publicacion del parche.

## 2. Medalla de Plata (item 14,455)
`ZzzOpenData.cpp` ya apunta el slot 455 a `MedalSilver` en vez del placeholder de moneda,
y `MedalSilver.bmd` + `medals1/2.OZJ` ya estan en `ClientFile/Data/Item/`.

## Que falta hacer
**Solo recompilar `Main.exe`** (por el punto 2; el punto 1 es data-driven y no lo necesita).

    node tools/make-patch.mjs --build ClientFile --version 10 --out patch-out \
         --baseline-hashes patch-manifests/hashes-v0.json \
         --mirror-hashes   patch-manifests/hashes-v9.json \
         --prev-manifest   patch-manifests/version-v9.txt

Debe salir **Patch10 = 8 ficheros**:
`Main.exe` · los 4 `Item_<lang>.bmd` · `MedalSilver.bmd` · `medals1.OZJ` · `medals2.OZJ`.
Si sale otro numero, algo se colo o algo falta.

## Publicacion
1. Zips a R2 **primero**.
2. Purgar Cloudflare — `FullPatch.zip` conserva el nombre y queda cacheado.
3. Reiniciar el GameServer (por el punto 1).
4. Recien ahi publicar el `version.txt` en la webapp. Si sale antes, 404 para el que actualice.
5. Copiar `hashes-v10.json` + `version-v10.txt` a `patch-manifests/` para diffear el patch 11.
