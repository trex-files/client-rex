# REX MU — UPDATE RUNBOOK (plan de actualizaciones del cliente)

> Referencia durable para publicar y testear actualizaciones del cliente desktop.
> Complementa [`LAUNCH-PLAN.md`](./LAUNCH-PLAN.md) (proceso conciso) y
> [`CHANGELOG.md`](./CHANGELOG.md) (historial + integridad/compat) con el detalle
> profundo del **updater del Launcher** y el **procedimiento de test E2E**.
> Actualizar la sección "Lecciones aprendidas" cada vez que se corra un test o patch real.

---

## 0. Arquitectura en una pantalla

- **Baseline instalado**: el instalador (`REXSetup100.exe`) trae la `ClientFile` de la rama `release` = updater **versión 0** (`v0.1-beta`).
- **Cada actualización** sube la versión numérica (1, 2, 3…). El launcher lleva el cliente de su versión local a `latest`.
- **Dos artefactos por versión**: `FullPatch.zip` (v0→N acumulativo) y `PatchN.zip` (incremental N-1→N).
- **Manifest**: `version.txt` le dice al launcher qué versión es `latest` y de dónde bajar los zips.

| Artefacto | Dónde se sube |
|---|---|
| `REXSetup100.exe` | R2 `dl.rexmu.online/releases/` |
| `FullPatch.zip` / `PatchN.zip` | R2 `dl.rexmu.online/patches/` |
| `version.txt` | Vercel `rexmu.online/update/version.txt` — **SIEMPRE al final** |
| `hashes-vN.json`, tags git | este repo (`client-rex`) |

---

## 1. Cómo funciona el Launcher (verificado en `Source/8.Tools/Launcher/`)

### 1.1 De dónde lee el manifest
URL **hardcodeada en compile-time**: `WinMain.cpp:54` → `https://rexmu.online/update/version.txt`. **No hay override en runtime** (ni config.ini, ni CLI, ni env). Para apuntar a otra URL hay que recompilar el launcher.

### 1.2 Versión local instalada — el tracker
`config.ini`, sección `[Launcher]`, clave `Version` (entero), en la carpeta de instalación.
- Lee: `ClientConfig.cpp:34-37` (`GetPrivateProfileIntA("Launcher","Version",0,...)`; default 0).
- Escribe: `ClientConfig.cpp:39-50` (`SetLauncherVersion`, retorna bool).
- **Resetear a 0** = editar esa clave a `Version=0` (o borrar la línea). No hay otro store de versión.
- `Launcher.exe` y `config.ini` están **siempre excluidos** del contenido de cualquier patch (nunca se pisan al aplicar).

### 1.3 Decisión incremental vs full (`Updater.cpp:573-647`, `PlanUpdate`)
1. `local >= latest` → nada que hacer.
2. `local == 0` → **SIEMPRE FullPatch** (un instalado-de-cero nunca encadena incrementales).
3. `local > 0` → intenta encadenar `patch.(local+1) … patch.latest`. Si **falta cualquier** línea `patch.K` intermedia → cae a **FullPatch**.
4. Aunque la cadena esté completa, si `suma(sizes incrementales) > sizeFull` → usa **FullPatch** igual (optimización de peso).
5. Si no, aplica la cadena paso a paso; cada paso bumpea la versión antes del siguiente.
   > Consecuencia: `patch.1` (v0→v1) **nunca se usa** en la práctica (estar "antes de v1" = local 0 = full). Se emite por completitud del manifest, pero el camino incremental real arranca en `patch.2`.

### 1.4 Descarga + verificación + aplicación (`Updater.cpp:359-486`, `ApplyOneStep`)
1. Descarga el zip a `%TEMP%\rexmu\step.zip`.
2. Verifica **tamaño exacto** y **CRC32** contra el manifest (`ComputeFileCrc32`, `mz_crc32`). `crc32=00000000` o `size=0` en el manifest = "no verificar" (bypass explícito).
3. Descomprime TODO a `%TEMP%\rexmu\extract` (todo-o-nada, `UnzipToDir`).
4. Copia `extract → clientDir` con `CopyFileA` directo, excluyendo `Launcher.exe`/`config.ini` (`CopyTreeExcluding`).
5. **Solo si la copia fue 100% OK**, bumpea `[Launcher] Version` (reintento 5×200ms si config.ini está lockeado).

### 1.5 Manejo de fallos (dónde es seguro y dónde no)
| Situación | Comportamiento | Cliente |
|---|---|---|
| Red caída / manifest inválido | No bloquea, juega con la versión actual (`WinMain` ~696-708) | intacto |
| Descarga cortada / tamaño ≠ | Aborta **antes** de tocar clientDir | intacto |
| CRC no matchea | Aborta antes de tocar clientDir | intacto |
| Zip corrupto | Aborta (extracción es a temp) | intacto |
| `WM_CLOSE` a mitad de update | Interceptado, no permite cerrar (`Ui.cpp:365-381`) | protegido |
| **Archivo en uso al copiar (ej. Main.exe lockeado)** | `CopyFileA` falla → retorna false → **NO bumpea versión** → **bloquea "Jugar"** (`WinMain.cpp:220-232`, msg "interrupted... Tap VERIFY") → **reintenta** en próxima corrida | **puede quedar a medio parchear** (transitorio) |

### 1.6 ⚠️ Gaps conocidos de hardening (aún SIN fix)
Verificado leyendo el código actual — el escenario "usuario juega mientras corre el update" está **parcialmente cubierto** (no falso-completa, bloquea Jugar, es recuperable con VERIFICAR), pero:
- **(a) Cero detección proactiva** de si Main.exe ya está corriendo antes de copiar. No hay `OpenProcess`/`CreateMutex`/`FindWindow`/`Process32` en el launcher. Choca contra el lock reactivamente en vez de avisar antes. (Tampoco hay mutex de instancia única del propio launcher.)
- **(b) `CopyFileA` directo sin staging atómico** (`Updater.cpp:152`, tercer arg `FALSE`). Escribe sobre el `Main.exe` destino sin `.tmp`+`MoveFileEx(REPLACE_EXISTING)`. Si Main.exe está lockeado, lo normal es que falle **al abrir** (sharing violation) dejando el viejo intacto — pero es comportamiento de Windows, no garantía del código. Ante un fallo **a mitad de escritura** (disco lleno, AV), un Main.exe truncado/corrupto es posible y el código no lo detecta ni repara.
- **(c) Orden de copia no determinista** (`FindFirstFile`/`FindNextFile`, sin sort). Un fallo a mitad puede dejar cualquier subconjunto actualizado.

**Fixes recomendados** (si se decide endurecer antes de beta pública):
- (a) Antes de aplicar: detectar Main.exe corriendo (mutex / `CreateFile` con share exclusivo de prueba) → mensaje "Cerrá el juego antes de actualizar" en vez de chocar.
- (b) Staging atómico para binarios: copiar a `<archivo>.new` y `MoveFileEx(..., MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH)`; si está lockeado, `MOVEFILE_DELAY_UNTIL_REBOOT` como fallback.
- (a)+(b) son cambios de launcher → recompilar Launcher.exe → nuevo instalador (el launcher es frozen para parches).

---

## 2. Generar una actualización real (FASE B, patch N ≥ 1)

Desde un **checkout LIMPIO de `release`** (`git clean -xdf` o clone fresco; nunca desde carpeta de dev/test):

```bash
node tools/make-patch.mjs --build ClientFile --version N --out patch-out \
     --baseline-hashes patch-manifests/hashes-v0.json \
     --mirror-hashes   patch-manifests/hashes-v{N-1}.json \
     --prev-manifest   <version.txt de la publicacion anterior>
```
Produce: `PatchN.zip`, `FullPatch.zip`, `version.txt`, `hashes-vN.json`.

Requiere `zip` (Info-Zip) y Node ≥ 20.12. `crc32`/`size` reales van al manifest → el launcher verifica.

**Publicar (orden estricto):**
1. Subir `PatchN.zip` + `FullPatch.zip` a R2 `patches/`.
2. Probar como usuario (ver §3).
3. Recién ahí publicar `version.txt` en Vercel (si va antes → ventana de 404).
4. Commit `patch-manifests/hashes-vN.json` + tag `client-patch-N` + push.

Excluidos siempre (no entran a ningún zip): `Launcher.exe`, `config.ini`, `Mu.ini`, residuos de build/runtime (`Main`, `Main.lib`, `*.pdb/.exp/.log`, `REX.txt`, `Screenshots/`, `STACK_ERROR/`). El pipeline **no borra archivos** (un asset retirado queda huérfano hasta reinstalar — evitar renombres).

---

## 3. TEST E2E del updater (prod con contenido descartable)

**Contexto**: pre-lanzamiento, sin usuarios → seguro testear contra los endpoints reales con contenido de prueba y revertir al final. Testea el `Launcher.exe` EXACTO que se shippea.

### Artefactos de prueba (ya generados; en el scratchpad del sandbox)
- **v1** (solo agrega `Data/_patchtest.txt="patch-test v1"`): `Patch1.zip`/`FullPatch.zip` = 150 B, crc `a5390c84`.
- **v2** (overwrite REAL: `Main.exe` modificado + `Data/Macro.txt` + `Data/_patchtest.txt="patch-test v2"`): `Patch2.zip`/`FullPatch.zip` = 3,536,090 B, crc `f44cfce7`.
  - Main.exe baseline (v0/v1) sha256 `7e058c3a…` → Main.exe v2 sha256 `efbef530…` (+17 B overlay, sigue siendo PE válido y corre).

### Procedimiento (en una instalación de prueba Windows)
| # | Paso | Estado inicial | Publicás | Esperado | Prueba |
|---|------|----------------|----------|----------|--------|
| 1 | Update #1 | Version=0 (fresh install) | Patch1+FullPatch v1 + `version.txt` latest=1 | Baja **FullPatch v0→v1**, aparece `Data/_patchtest.txt`, `Version`→1, entra al juego | camino **full** |
| 2 | Update #2 | Version=1 | Patch2+FullPatch v2 + `version.txt` latest=2 | Baja **Patch2 (incremental v1→v2)**, `Main.exe`→`efbef530`, `Macro.txt` overwriteado, `Version`→2 | camino **incremental** + **overwrite Main.exe** |
| 3 | Descarga completa | Version=0 (reinstalar) | (deja latest=2) | Baja **FullPatch v0→v2** (los 2 cambios en uno), `Version`→2 | **full acumulado** |
| 4 | **Main.exe lockeado** | Version=1 | (latest=2) | **Abrí el juego** y corré el launcher → update falla elegante, **NO** bumpea a 2, **"Jugar" bloqueado**, msg de retry. Cerrá el juego → VERIFICAR → aplica, `Main.exe`→`efbef530` | **el gap §1.6** con data real |

### Verificaciones por paso
- `config.ini [Launcher] Version` avanzó al número esperado (y en Test 4, NO avanzó mientras el juego estaba abierto).
- `Data/_patchtest.txt` muestra el texto de la versión aplicada.
- Tras Test 2/3: `certutil -hashfile ClientFile\Main.exe SHA256` == `efbef530…`.
- El juego abre y entra sin crash con el Main.exe parcheado.

### Cleanup (al terminar)
1. `version.txt` en Vercel → volver a **`latest=0`** (o quitar el archivo).
2. Borrar `Patch1.zip`/`Patch2.zip`/`FullPatch.zip` de R2 `patches/`.
3. En la instalación de prueba: `config.ini [Launcher] Version=0`; borrar `Data/_patchtest.txt`; restaurar `Main.exe`/`Macro.txt` (reinstalar el cliente deja todo prístino).
4. `%TEMP%\rexmu\` lo limpia el propio launcher; opcional borrarlo para estado prístino.

> Los artefactos de test **NO se commitean** al repo (son descartables). `hashes-v1/v2.json` de prueba tampoco: los reales se generan cuando haya una actualización real de contenido.

---

## 4. Integridad y compatibilidad
- **Integridad de updates**: sha256 (baseline) + crc32 (zips) + HTTPS. **Sin firma criptográfica** (decisión beta). Ruta de upgrade = firma Ed25519 del manifest (requiere cambio de launcher). Ver `CHANGELOG.md`.
- **Compatibilidad**: Win7+; binarios static-CRT autocontenidos; GL3.3 con fallback Mesa software. Ver `CHANGELOG.md`.

---

## 5. Lecciones aprendidas
_(Se completa después de cada test/patch real.)_

- **2026-07-24** — Mapeo completo del updater (este documento). Confirmado por lectura de código: los 4 hallazgos de la auditoría 07-23 (zip-slip, EngineSwap delete, re-download loop, WM_CLOSE) están **fixeados** en el source y en el `Launcher.exe` shippeado (commit `9c080b55`). Identificados 2 gaps de hardening pendientes (§1.6 a/b): falta detección proactiva de Main.exe corriendo y staging atómico. Test E2E diseñado (4 casos, incl. Main.exe lockeado). Artefactos v1/v2 generados.

- **2026-07-24 — patch v1 PUBLICADO. ✅ Camino FULL validado en producción**, funcionó
  perfecto a la primera (v0→v1). El test E2E sintético de §3 quedó **obsoleto para los casos
  1-3**: se ejercitaron con parches reales, que es evidencia más fuerte.

- **2026-07-26 — patch v2 PUBLICADO** (`latest=2`, 7 ficheros, crc `85b60cd7`).
  ✅ **Ejercitó el camino INCREMENTAL** (`patch.2` encadenado), incluido el overwrite de
  `Main.exe`.

- 🔴 **Lo ÚNICO que sigue sin ejercitarse es el caso 4** de §3: usuario con el juego ABIERTO
  mientras corre el launcher (`Main.exe` lockeado). Es el escenario de los gaps §1.6 a/b.
  Failure mode esperado por lectura de código: la copia falla, NO bumpea la versión, bloquea
  "Jugar" y pide VERIFICAR; recuperable cerrando el juego. Nunca observado en vivo.

- 🔑 **LECCIÓN DE PROCESO (2026-07-28)**: esta sección se quedó sin actualizar tras publicar
  v1 y v2, y una auditoría previa al v3 leyó el "Pendiente: correr el test" de la entrada del
  24/07 como si fuera el estado actual — concluyendo que el updater **nunca** se había
  probado, cuando llevaba dos publicaciones en producción. **Anotar aquí cada publicación en
  el momento**: un runbook desactualizado no es neutro, induce conclusiones falsas y hace
  perder tiempo revisando riesgos que no existen.
