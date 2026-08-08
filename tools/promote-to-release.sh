#!/usr/bin/env bash
# ============================================================================
#  promote-to-release.sh
# ----------------------------------------------------------------------------
#  Promueve el contenido curado de dev/main a la branch `release` de client-rex,
#  PRESERVANDO:
#    - el config.ini curado de release (defaults de instalacion: 1280x720/60fps/
#      MSAA2, graficos High, Version=0). El config.ini de dev NUNCA pisa el de
#      release (igual que va excluido de los parches).
#    - patch-manifests/** (hashes-vN / version-vN), que se commitean SOLO a
#      release al cerrar cada version y por tanto no existen en dev/main.
#  Todo lo demas se toma tal cual de <ref-origen>: cualquier OTRO fichero que
#  exista solo en release desaparece sin aviso. Revisar el diff COMPLETO.
#
#  Usa plumbing (read-tree/commit-tree), SIN checkout -> cero churn LFS sobre
#  los ~27k archivos, y no toca el working tree.
#
#  Uso:
#     tools/promote-to-release.sh [<ref-origen>] ["<mensaje de commit>"]
#       ref-origen : rama/commit/tag a promover   (default: main)
#       mensaje    : mensaje del commit            (default: "release: promote <ref>")
#
#  NO pushea solo. Tras correr, revisa el diff y pushea a mano:
#     git -C client-rex diff release~1 release -- ClientFile
#     git -C client-rex push origin release
# ============================================================================
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && git rev-parse --show-toplevel)"
SRC="${1:-main}"
MSG="${2:-release: promote ${SRC}}"

cd "$REPO"

git rev-parse --verify refs/heads/release >/dev/null 2>&1 || {
  echo "ERROR: la branch 'release' no existe en $REPO"; exit 1; }
git rev-parse --verify "$SRC" >/dev/null 2>&1 || {
  echo "ERROR: ref origen '$SRC' no existe"; exit 1; }

SRCC=$(git rev-parse "$SRC")

# Blob del config.ini curado que ya vive en release (se preserva).
RELCONFIG=$(git rev-parse "release:ClientFile/config.ini") || {
  echo "ERROR: no se pudo leer release:ClientFile/config.ini"; exit 1; }

# Arbol nuevo = arbol de SRC con ClientFile/config.ini forzado al de release.
IDX="$(mktemp)"
trap 'rm -f "$IDX"' EXIT
GIT_INDEX_FILE="$IDX" git read-tree "$SRCC"
GIT_INDEX_FILE="$IDX" git update-index --cacheinfo 100644,"$RELCONFIG",ClientFile/config.ini

# patch-manifests/: se cierran commiteando a `release`, asi que hashes-vN/version-vN
# viven SOLO ahi (en dev/main solo esta hashes-v0.json). Como este script promueve el
# arbol de SRC tal cual, sin esto los borraria en silencio -- ya paso en v4 (commit
# bd5b866b tuvo que restaurar 8 manifiestos). Sin ellos, el siguiente release se queda
# sin --mirror-hashes/--prev-manifest historicos y no puede encadenar las lineas patch.K
# del version.txt. Se reinyectan todos los de release; los que tambien esten en SRC
# quedan pisados por el de release a proposito (release es el historico publicado).
MANIFESTS=0
while read -r mode _type oid name; do
  [ -n "$name" ] || continue
  GIT_INDEX_FILE="$IDX" git update-index --add --cacheinfo "$mode,$oid,patch-manifests/$name"
  MANIFESTS=$((MANIFESTS + 1))
done < <(git ls-tree -r "release:patch-manifests" 2>/dev/null || true)

TREE=$(GIT_INDEX_FILE="$IDX" git write-tree)

NEWC=$(git commit-tree "$TREE" -p refs/heads/release -m "$MSG")
git update-ref refs/heads/release "$NEWC"

echo "OK: release -> $NEWC"
echo "    origen: $SRC ($SRCC), config.ini de release preservado."
echo "    patch-manifests preservados: $MANIFESTS fichero(s)."
echo "revisa:  git diff --name-status release~1 release   # COMPLETO, no solo ClientFile:"
echo "         mirar solo -- ClientFile oculta borrados fuera de esa carpeta"
echo "pushea:  git push origin release   (y taggea client-patch-N)"
