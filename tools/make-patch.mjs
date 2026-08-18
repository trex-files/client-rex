#!/usr/bin/env node
// make-patch.mjs — genera los .zip de parche y el manifest version.txt del
// launcher REX MU a partir de una comparacion por hash entre el build actual
// y las carpetas de referencia (espejo publicado y baseline del instalador).
//
// Contrato con el launcher (ver Source/8.Tools/Launcher/Updater.cpp):
//   - manifest version.txt: lineas key=value.
//       latest=N
//       full=<url>|<crc32-hex>|<size>          (FullPatch acumulativo v0 -> N)
//       patch.K=<url>|<crc32-hex>|<size>       (incremental K-1 -> K)
//   - crc32 = CRC-32 IEEE del ARCHIVO .zip COMPLETO (mismo mz_crc32 que
//     ComputeFileCrc32 valida tras descargar). zlib.crc32 de Node es el mismo.
//   - el launcher excluye SIEMPRE Launcher.exe y config.ini al aplicar, asi
//     que este script tampoco los mete en ningun zip (mismo kExcluded).
//   - los zips guardan rutas relativas con '/'; el launcher las normaliza a '\'.
//
// NO soporta borrado de archivos (un asset retirado del build queda huerfano en
// el cliente del usuario) — limitacion conocida del pipeline actual. Evitar
// renombres entre versiones, o extender el manifest con un campo de borrado.
//
// Uso:
//   node make-patch.mjs --build <dir> --version <N> --out <dir> [opciones]
//
// Requeridos:
//   --build <dir>      build actual del cliente (la version nueva)
//   --version <N>      entero: version que este build pasa a ser (latest)
//   --out <dir>        carpeta de salida (zips + version.txt)
//
// Opcionales (referencias — por carpeta O por manifest de hashes):
//   --mirror <dir>          espejo publicado (v N-1). PatchN = archivos del build
//                           que difieren del espejo. Sin esto, NO hay incremental.
//   --mirror-hashes <json>  igual que --mirror pero leyendo hashes-v{N-1}.json en
//                           vez de la carpeta (no hace falta guardar el arbol).
//   --baseline <dir>        baseline del instalador (v0). FullPatch = archivos del
//                           build que difieren del baseline. Sin esto, FullPatch
//                           incluye TODO el build (menos excluidos).
//   --baseline-hashes <json> igual que --baseline pero leyendo hashes-v0.json.
//   --prev-manifest <f>     version.txt anterior: se arrastran sus lineas patch.K
//                           historicas (para que un usuario varias versiones atras
//                           pueda encadenar). Sin esto, solo se emite full+patch.N.
//   --base-url <url>        base de las URLs del manifest
//                           [default https://dl.rexmu.online/patches]
//   --exclude <a,b,c>       nombres de archivo extra a excluir (ademas de
//                           Launcher.exe y config.ini, siempre excluidos).
//   --emit-hashes-only      solo emite hashes-v{N}.json del build (para generar el
//                           baseline hashes-v0.json una vez); no arma zips.
//   --dry-run               calcula y reporta, no escribe nada.
//
// En cada corrida normal SIEMPRE se emite tambien hashes-v{N}.json (el cache de
// hashes de esta version) — commitearlo en git para el diff de la siguiente.
//
// --mirror y --mirror-hashes son mutuamente excluyentes (idem baseline).

import { createHash } from 'node:crypto';
import { crc32 } from 'node:zlib';
import { spawnSync } from 'node:child_process';
import {
  readdirSync, readFileSync, writeFileSync,
  mkdirSync, existsSync, rmSync,
} from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

// --- parseo de argumentos ---------------------------------------------------

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const flags = new Set(['dry-run', 'emit-hashes-only']);
    if (flags.has(key)) { args[key] = true; continue; }
    const val = argv[++i];
    if (val === undefined) fail(`Missing value for --${key}`);
    args[key] = val;
  }
  return args;
}

function fail(msg) {
  console.error(`make-patch: ERROR: ${msg}`);
  process.exit(1);
}

// --- utilidades de archivos -------------------------------------------------

// Nunca entran en hashes/patches: el propio launcher (frozen) y los archivos de
// config per-usuario (config.ini/Mu.ini van onlyifdoesntexist en el .iss).
const ALWAYS_EXCLUDED = new Set([
  'launcher.exe', 'config.ini', 'mu.ini',
  'main.lib', 'muerror.log',      // residuos especificos del build/runtime
  'main',                         // leftover del linker (ELF sin extension; 0 archivos tracked "Main" en Data)
  'rex.txt',                      // log de debug del cliente (OpenTexture/LoadBitmap Failed), gitignored
  'screenshots', 'stack_error',   // dirs de runtime (capturas / dumps de crash), gitignored
  'thumbs.db', 'desktop.ini',     // basura de Explorer
]);
// Residuos por SUFIJO (nunca datos del juego). OJO: .lib/.obj NO van aca --
// el cliente los reusa para datos de terreno (EncTerrain*.obj/.lib). Solo
// extensiones que son inequivocamente artefactos de compilacion/backup/empaque.
const ALWAYS_EXCLUDED_SUFFIX = ['.pdb', '.exp', '.log', '.bak', '.rar', '.zip', '.7z', '.cab'];

// Recorre dir recursivamente. Devuelve Map<relPathPosix, {abs, size, sha}>.
// excludeBasenames: Set de nombres (lowercase) a saltear en cualquier nivel,
// igual que el CopyTreeExcluding del launcher (excluye por nombre de hoja).
function walkTree(dir, excludeBasenames) {
  const out = new Map();
  function recurse(cur) {
    let entries;
    try {
      entries = readdirSync(cur, { withFileTypes: true });
    } catch (e) {
      fail(`Cannot read directory ${cur}: ${e.message}`);
    }
    for (const ent of entries) {
      const abs = join(cur, ent.name);
      if (ent.isDirectory()) {
        // Saltar dot-directorios (.ruff_cache, .git, etc.): son metadata/caches
        // de herramientas, nunca contenido del cliente.
        if (ent.name.startsWith('.')) continue;
        // Excluir dirs de runtime por nombre (Screenshots/, STACK_ERROR/): mismo
        // criterio de hoja que para archivos, igual que CopyTreeExcluding del launcher.
        if (excludeBasenames.has(ent.name.toLowerCase())) continue;
        recurse(abs);
      } else if (ent.isFile()) {
        const lower = ent.name.toLowerCase();
        if (excludeBasenames.has(lower)) continue;
        if (ALWAYS_EXCLUDED_SUFFIX.some(function (s) { return lower.endsWith(s); })) continue;
        const rel = relative(dir, abs).split(sep).join('/');
        const buf = readFileSync(abs);
        const sha = createHash('sha256').update(buf).digest('hex');
        out.set(rel, { abs, size: buf.length, sha });
      }
      // symlinks/otros: se ignoran (un build de cliente son archivos planos).
    }
  }
  if (!existsSync(dir)) fail(`Directory does not exist: ${dir}`);
  recurse(dir);
  return out;
}

// Archivos de `build` cuyo hash difiere (o no existe) en `ref`. Si ref es null,
// devuelve TODOS los de build. No reporta borrados (ver nota de cabecera).
function changedFiles(build, ref) {
  const changed = [];
  for (const [rel, info] of build) {
    if (!ref) { changed.push(rel); continue; }
    const refInfo = ref.get(rel);
    if (!refInfo || refInfo.sha !== info.sha) changed.push(rel);
  }
  changed.sort();
  return changed;
}

// Carga un manifest de hashes (hashes-vN.json) como Map<relPath, {sha, size}>,
// misma forma que walkTree pero SIN `abs` (no tenemos los archivos viejos, solo
// sus hashes). changedFiles solo usa .sha de la referencia, asi que sirve igual
// -- esto es lo que evita guardar copias de 2.8GB de cada version publicada.
function loadHashes(jsonPath) {
  if (!existsSync(jsonPath)) fail(`hash manifest not found: ${jsonPath}`);
  let data;
  try {
    data = JSON.parse(readFileSync(jsonPath, 'utf8'));
  } catch (e) {
    fail(`could not parse hash manifest ${jsonPath}: ${e.message}`);
  }
  if (!data || typeof data.files !== 'object' || data.files === null) {
    fail(`hash manifest ${jsonPath} has no "files" object`);
  }
  const map = new Map();
  for (const [rel, info] of Object.entries(data.files)) {
    if (!info || typeof info.sha256 !== 'string') {
      fail(`hash manifest ${jsonPath} entry "${rel}" is missing sha256`);
    }
    map.set(rel, { sha: info.sha256, size: info.size });
  }
  return map;
}

// Escribe hashes-vN.json (path -> sha256+size, claves ordenadas para diffs
// limpios en git). Es el "espejo" cacheado: en la version siguiente se pasa
// como --mirror-hashes en vez de la carpeta completa.
function writeHashManifest(build, ver, outDir) {
  const files = {};
  for (const rel of [...build.keys()].sort()) {
    const info = build.get(rel);
    files[rel] = { sha256: info.sha, size: info.size };
  }
  const p = join(outDir, `hashes-v${ver}.json`);
  writeFileSync(p, JSON.stringify({ version: ver, files }, null, 2) + '\n');
  return p;
}

// Crea un .zip con `zip -X` (sin atributos extra) tomando rutas relativas desde
// `rootDir`, leyendo la lista de nombres por stdin (-@). Devuelve {crc32, size}.
// Busca un bsdtar (libarchive) que sepa --format=zip. OJO: en Git Bash el
// 'tar' del PATH suele ser GNU tar, que NO soporta zip y falla con
// "Invalid archive format" — por eso se prueban rutas concretas y se
// confirma leyendo --version, en vez de confiar en el nombre.
function findBsdtar() {
  const cands = [
    process.env.BSDTAR,
    join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe'),
    'bsdtar',
  ].filter(Boolean);
  for (const c of cands) {
    const v = spawnSync(c, ['--version'], { encoding: 'utf8' });
    if (!v.error && /bsdtar|libarchive/i.test(v.stdout || '')) return c;
  }
  return null;
}

function makeZip(rootDir, relPaths, zipPath) {
  // El proceso hijo `zip` corre con cwd=rootDir (para que -@ escriba nombres de
  // entrada relativos al build). Ese cwd tambien cambia como el hijo resuelve
  // su PROPIO argumento de archivo de salida, asi que zipPath DEBE ser absoluto
  // -- si no, el .zip se crearia dentro del build (rootDir/out/...) en vez de en
  // --out. resolve() lo hace absoluto respecto al cwd de ESTE proceso.
  const absZip = resolve(zipPath);
  if (existsSync(absZip)) rmSync(absZip);
  const list = relPaths.join('\n') + '\n';
  let res = spawnSync('zip', ['-X', '-q', '-@', absZip], {
    cwd: rootDir,
    input: Buffer.from(list, 'utf8'),
    maxBuffer: 1024 * 1024 * 64,
  });
  // Fallback a bsdtar cuando no hay Info-Zip. Windows 10+ trae tar.exe
  // (libarchive) en System32 y sabe escribir zip estandar: deflate, rutas
  // relativas con '/', sin data descriptor. Sale un zip equivalente para lo
  // unico que le importa al launcher (leerlo y validar el CRC-32 del fichero).
  // bsdtar no lee la lista por stdin de forma portable, asi que va por fichero.
  if (res.error && res.error.code === 'ENOENT') {
    const bsdtar = findBsdtar();
    if (!bsdtar)
      fail(`no hay 'zip' (Info-Zip) en el PATH ni un bsdtar que sepa --format=zip. ` +
           `Instala Info-Zip, o usa Windows 10+ (System32\\tar.exe).`);
    const listFile = absZip + '.filelist';
    writeFileSync(listFile, list, 'utf8');
    try {
      res = spawnSync(bsdtar, ['-c', '-f', absZip, '--format=zip', '-T', listFile], {
        cwd: rootDir,
        maxBuffer: 1024 * 1024 * 64,
      });
    } finally {
      if (existsSync(listFile)) rmSync(listFile);
    }
    if (res.error)
      fail(`fallo al lanzar '${bsdtar}': ${res.error.code || res.error.message}`);
  }
  if (res.error)
    fail(`could not launch 'zip' (${res.error.code || res.error.message}). Is Info-Zip 'zip' installed and on PATH?`);
  if (res.status !== 0) {
    // Info-Zip escribe varios de sus errores a stdout, no a stderr; incluir
    // ambos para no perder el diagnostico.
    const er = (res.stderr ? res.stderr.toString() : '').trim();
    const out = (res.stdout ? res.stdout.toString() : '').trim();
    fail(`zip failed for ${absZip}: ${er || out || `exit ${res.status}`}`);
  }
  const buf = readFileSync(absZip);
  // crc32 >>> 0 para forzar unsigned; 8 hex, igual que espera strtoul(...,16).
  const crc = (crc32(buf) >>> 0).toString(16).padStart(8, '0');
  return { crc32: crc, size: buf.length };
}

// --- parseo/merge del manifest previo --------------------------------------

// Extrae las lineas patch.K de un version.txt previo como Map<K, linea-valor>.
function parsePrevPatches(text) {
  const patches = new Map();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^patch\.(\d+)\s*=\s*(.+)$/);
    if (m) patches.set(parseInt(m[1], 10), m[2].trim());
  }
  return patches;
}

// --- main -------------------------------------------------------------------

const args = parseArgs(process.argv.slice(2));

// zlib.crc32 es un builtin reciente (Node 20.12+/21.7+). En Node viejo es
// undefined y reventaria con un TypeError opaco a mitad de makeZip; fallar
// claro y temprano.
if (typeof crc32 !== 'function') {
  fail(`node:zlib.crc32 is unavailable — Node 20.12+ / 21.7+ required (running ${process.version}).`);
}

if (!args.build) fail('--build <dir> is required');
if (!args.version) fail('--version <N> is required');
if (!args.out) fail('--out <dir> is required');

const version = Number(args.version);
if (!Number.isInteger(version) || version < 0) {
  fail(`--version must be a non-negative integer, got "${args.version}"`);
}
if (version < 1 && !args['emit-hashes-only']) {
  fail('--version must be >= 1 to build patches (0 is only valid with --emit-hashes-only, for the v0 baseline manifest)');
}

const baseUrl = (args['base-url'] || 'https://dl.rexmu.online/patches').replace(/\/+$/, '');

const excludeBasenames = new Set(ALWAYS_EXCLUDED);
if (args.exclude) {
  for (const name of args.exclude.split(',')) {
    const n = name.trim().toLowerCase();
    if (n) excludeBasenames.add(n);
  }
}

console.log(`make-patch: version ${version}, out ${args.out}`);
console.log(`make-patch: excluding ${[...excludeBasenames].join(', ')}`);

const build = walkTree(args.build, excludeBasenames);
console.log(`make-patch: build tree = ${build.size} files`);

// Modo baseline: solo emitir el manifest de hashes de este build (para generar
// hashes-v0.json del instalador una unica vez). No arma zips ni version.txt.
if (args['emit-hashes-only']) {
  if (args['dry-run']) {
    console.log('make-patch: --dry-run, not writing the hash manifest.');
    process.exit(0);
  }
  mkdirSync(args.out, { recursive: true });
  const hp = writeHashManifest(build, version, args.out);
  console.log(`make-patch: wrote ${hp} (${build.size} files) — emit-hashes-only, no zips.`);
  process.exit(0);
}

// Referencias: por carpeta (--mirror/--baseline) o por manifest de hashes
// (--mirror-hashes/--baseline-hashes). Los hashes evitan tener que guardar el
// arbol completo de cada version -- basta el JSON pequeno, versionado en git.
if (args.mirror && args['mirror-hashes'])
  fail('use either --mirror or --mirror-hashes, not both');
if (args.baseline && args['baseline-hashes'])
  fail('use either --baseline or --baseline-hashes, not both');

const mirror = args['mirror-hashes'] ? loadHashes(args['mirror-hashes'])
  : args.mirror ? walkTree(args.mirror, excludeBasenames) : null;
const baseline = args['baseline-hashes'] ? loadHashes(args['baseline-hashes'])
  : args.baseline ? walkTree(args.baseline, excludeBasenames) : null;

// FullPatch: build vs baseline (o todo si no hay baseline).
const fullFiles = changedFiles(build, baseline);
// PatchN: build vs mirror (solo si hay mirror).
const patchFiles = mirror ? changedFiles(build, mirror) : null;

console.log(`make-patch: FullPatch = ${fullFiles.length} files` +
  (baseline ? ` (differ from baseline)` : ` (full tree, no baseline given)`));
if (patchFiles) {
  console.log(`make-patch: Patch${version} = ${patchFiles.length} files (differ from mirror)`);
} else {
  console.log(`make-patch: no --mirror given -> no incremental patch, only FullPatch`);
}

// Aviso de posibles borrados no soportados (informativo).
if (mirror) {
  const removed = [];
  for (const rel of mirror.keys()) if (!build.has(rel)) removed.push(rel);
  if (removed.length) {
    console.warn(`make-patch: WARNING: ${removed.length} file(s) exist in the mirror but ` +
      `not in the build. The patch pipeline does NOT delete files, so these will remain ` +
      `orphaned on users' clients:`);
    for (const r of removed.slice(0, 20)) console.warn(`  - ${r}`);
    if (removed.length > 20) console.warn(`  ... and ${removed.length - 20} more`);
  }
}

if (fullFiles.length === 0 && (!patchFiles || patchFiles.length === 0)) {
  fail('Nothing changed vs baseline and mirror — no patch to build.');
}

if (args['dry-run']) {
  console.log('make-patch: --dry-run, not writing zips or manifest.');
  process.exit(0);
}

mkdirSync(args.out, { recursive: true });

// FullPatch.zip
const fullZipPath = join(args.out, 'FullPatch.zip');
const full = makeZip(args.build, fullFiles, fullZipPath);
console.log(`make-patch: wrote FullPatch.zip  crc=${full.crc32} size=${full.size}`);

// PatchN.zip
let patch = null;
if (patchFiles && patchFiles.length > 0) {
  const patchZipPath = join(args.out, `Patch${version}.zip`);
  patch = makeZip(args.build, patchFiles, patchZipPath);
  console.log(`make-patch: wrote Patch${version}.zip  crc=${patch.crc32} size=${patch.size}`);
}

// version.txt
let prevPatches = new Map();
if (args['prev-manifest']) {
  if (existsSync(args['prev-manifest'])) {
    prevPatches = parsePrevPatches(readFileSync(args['prev-manifest'], 'utf8'));
  } else {
    // No silenciar un typo: sin las lineas patch.K historicas, un usuario
    // varias versiones atras no puede encadenar y no habria ninguna senal.
    console.warn(`make-patch: WARNING: --prev-manifest "${args['prev-manifest']}" does not exist; ` +
      `historical patch.K lines will NOT be carried into the new version.txt.`);
  }
}
if (patch) prevPatches.set(version, `${baseUrl}/Patch${version}.zip|${patch.crc32}|${patch.size}`);

const lines = [];
lines.push('# RexMU Launcher — manifest de auto-update (generado por make-patch.mjs)');
lines.push('# Formato: key=value. Lineas # o vacias se ignoran.');
lines.push('#   full=<url>|<crc32-hex>|<size>   (FullPatch acumulativo -> latest)');
lines.push('#   patch.N=<url>|<crc32-hex>|<size> (incremental N-1 -> N)');
lines.push('');
lines.push(`latest=${version}`);
lines.push(`full=${baseUrl}/FullPatch.zip|${full.crc32}|${full.size}`);
for (const k of [...prevPatches.keys()].sort((a, b) => a - b)) {
  lines.push(`patch.${k}=${prevPatches.get(k)}`);
}
const manifest = lines.join('\n') + '\n';
const manifestPath = join(args.out, 'version.txt');
writeFileSync(manifestPath, manifest);
console.log(`make-patch: wrote version.txt (latest=${version}, ${prevPatches.size} patch line(s))`);

// Cachear los hashes de ESTA version: en la siguiente se pasa como
// --mirror-hashes para el diff incremental, sin guardar el arbol completo.
// Commitear hashes-v${version}.json en git junto al tag client-patch-${version}.
const hp = writeHashManifest(build, version, args.out);
console.log(`make-patch: wrote ${hp} — commit it (git) so the next version can diff against it.`);
console.log('make-patch: done. Upload the .zip files to R2, then publish version.txt LAST.');
