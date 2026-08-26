# Patch 10 — pendiente (preparado 2026-08-26)

## Que falta
**Solo recompilar `Main.exe`.** Todo lo demas ya esta en el repo.

El slot 455 (Silver Medal) pasó de reusar el modelo de moneda a su arte propio:

    ZzzOpenData.cpp:892
    - AccessModel(MODEL_POTION+455, "Data\Item\", "Gold", 1)
    + AccessModel(MODEL_POTION+455, "Data\Item\", "MedalSilver")

El `Main.exe` que viaja en el Patch 9 todavía tiene el placeholder, así que
hasta el patch 10 la medalla de Plata se ve como una moneda. Las otras cuatro
ya funcionan.

## Como generarlo
Con el `Main.exe` recompilado en `ClientFile/`:

    node tools/make-patch.mjs --build ClientFile --version 10 --out patch-out \
         --baseline-hashes patch-manifests/hashes-v0.json \
         --mirror-hashes   patch-manifests/hashes-v9.json \
         --prev-manifest   patch-manifests/version-v9.txt

Debe salir **Patch10 = 4 ficheros**: `Main.exe`, `MedalSilver.bmd`,
`medals1.OZJ`, `medals2.OZJ`.

Después: subir los zip a R2 **primero**, purgar Cloudflare (`FullPatch.zip`
conserva el nombre y queda cacheado), y recién ahí publicar el `version.txt`
en la webapp. Si el manifest sale antes, los que actualicen se comen un 404.

Y copiar `hashes-v10.json` + `version-v10.txt` a `patch-manifests/` para poder
diffear el patch 11.
