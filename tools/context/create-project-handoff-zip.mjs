#!/usr/bin/env node
/**
 * @file Cross-platform handoff ZIP builder for local repository snapshots.
 *
 * Creates a ZIP archive of the current project using only Node.js standard
 * library APIs. The archive intentionally includes hidden project folders such
 * as `.git`, while excluding dependency installations, frontend/backend build
 * outputs, caches, logs, generated artifacts, and environment files by default.
 *
 * The tool does not shell out to PowerShell, `zip`, `tar`, npm, or platform
 * specific archive commands. This avoids platform differences such as hidden
 * file handling and makes the same command usable on Windows, Linux and macOS.
 *
 * Usage:
 *   node tools/context/create-project-handoff-zip.mjs
 *   node tools/context/create-project-handoff-zip.mjs --output ./handoff.zip
 *   node tools/context/create-project-handoff-zip.mjs --root ../threat-forge-LLM
 *   node tools/context/create-project-handoff-zip.mjs --dry-run
 *   node tools/context/create-project-handoff-zip.mjs --include-env
 *
 * Package scripts:
 *   npm run context:zip:handoff
 *   npm run context:zip:handoff:dry-run
 *   npm run context:zip:handoff -- --output ./handoff.zip
 *
 * Canonical references:
 * - docs/reference/project-model/governance.registry.yml
 * - docs/reference/project-model/requirements.registry.yml
 * - docs/reference/project-model/graph.matrix.yml
 *
 * Related requirements:
 * - project-handoff:REQ-0020
 *
 * Related decisions:
 * - project-handoff:DEC-0011
 * - source-traceability:DEC-0007
 *
 * Supports capabilities:
 * - CAP-DOCUMENTATION-GOVERNANCE
 *
 * Provides graph nodes:
 * - TOOL-PROJECT-HANDOFF-ZIP-BUILDER
 * - CMD-CONTEXT-ZIP-HANDOFF
 * - CMD-CONTEXT-ZIP-HANDOFF-DRY-RUN
 *
 * Failure behavior:
 * - Prints a readable error when archive generation fails.
 * - Exits with status code 1 when argument validation, filesystem traversal, or
 *   ZIP writing fails.
 * - Exits with status code 0 when dry-run inspection or archive generation
 *   succeeds.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import zlib from "node:zlib";

const TOOL_NAME = "create-project-handoff-zip";
const MANIFEST_ENTRY_NAME = "HANDOFF-ZIP-MANIFEST.json";
const UTF8_GENERAL_PURPOSE_FLAG = 0x0800;
const DEFLATE_METHOD = 8;
const STORE_METHOD = 0;
const ZIP_VERSION_NEEDED = 20;
const ZIP_VERSION_MADE_BY = 20;

const EXCLUDED_DIRECTORY_NAMES = new Set([
  "node_modules",
  ".next",
  ".nuxt",
  ".svelte-kit",
  ".astro",
  ".turbo",
  ".vite",
  ".cache",
  ".parcel-cache",
  ".rpt2_cache",
  ".rollup.cache",
  "coverage",
  "dist",
  "build",
  "out",
  "storybook-static",
  "artifacts",
  ".nyc_output",
  ".vs"
]);

const EXCLUDED_FILE_NAMES = new Set([
  ".DS_Store",
  "Thumbs.db",
  "desktop.ini",
  ".eslintcache",
  ".stylelintcache",
  "npm-debug.log",
  "yarn-debug.log",
  "yarn-error.log",
  "pnpm-debug.log",
  "lerna-debug.log"
]);

const EXCLUDED_FILE_SUFFIXES = [
  ".zip",
  ".tar",
  ".tgz",
  ".tar.gz",
  ".7z",
  ".rar",
  ".log",
  ".tmp",
  ".temp",
  ".tsbuildinfo"
];

const USAGE = `
Usage:
  node tools/context/create-project-handoff-zip.mjs [options]
  npm run context:zip:handoff -- [options]
  npm run context:zip:handoff:dry-run

Options:
  --root <path>       Project root to archive. Defaults to current directory.
  --output <path>     ZIP output path. Defaults to artifacts/handoff/<project>-handoff-<timestamp>.zip.
  --include-env       Include .env files. Default is to exclude them for safety.
  --dry-run           Print what would be archived without writing the ZIP.
  --help              Show this help.

Default exclusions:
  node_modules, React/Vite/Next/build outputs, coverage, caches, Visual Studio .vs,
  generated artifacts, archive files, logs, temp files, and .env files unless --include-env is provided.

Important:
  .git and other hidden project folders are included unless explicitly matched by
  an exclusion above.
`.trim();

function parseArgs(argv) {
  const args = {
    root: process.cwd(),
    output: undefined,
    includeEnv: false,
    dryRun: false,
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") {
      args.help = true;
      continue;
    }

    if (arg === "--include-env") {
      args.includeEnv = true;
      continue;
    }

    if (arg === "--dry-run") {
      args.dryRun = true;
      continue;
    }

    if (arg === "--root") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--root requires a path value.");
      }
      args.root = value;
      index += 1;
      continue;
    }

    if (arg === "--output") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--output requires a path value.");
      }
      args.output = value;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function toZipPath(value) {
  return value.split(path.sep).join("/");
}

function toTimestamp(value = new Date()) {
  return value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function createDefaultOutputPath(root) {
  const projectName = path.basename(root);
  const safeProjectName = projectName.replace(/[^a-zA-Z0-9._-]/g, "-");
  return path.join(root, "artifacts", "handoff", `${safeProjectName}-handoff-${toTimestamp()}.zip`);
}

function resolveRoot(rootInput) {
  const root = path.resolve(rootInput);
  const stats = fs.existsSync(root) ? fs.statSync(root) : undefined;

  if (!stats?.isDirectory()) {
    throw new Error(`Project root does not exist or is not a directory: ${root}`);
  }

  return root;
}

function resolveOutputPath(root, outputInput) {
  const output = outputInput
    ? path.resolve(outputInput)
    : createDefaultOutputPath(root);

  if (path.extname(output).toLowerCase() !== ".zip") {
    throw new Error(`Output path must end with .zip: ${output}`);
  }

  return output;
}

function isSameOrInside(childPath, parentPath) {
  const relative = path.relative(parentPath, childPath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function shouldExcludeEntry({ relPath, name, isDirectory, includeEnv, outputPath, root }) {
  const normalizedRelPath = toZipPath(relPath);
  const parts = normalizedRelPath.split("/").filter(Boolean);

  if (isSameOrInside(outputPath, path.join(root, normalizedRelPath))) {
    return "output-target";
  }

  if (isDirectory && EXCLUDED_DIRECTORY_NAMES.has(name)) {
    return `excluded-directory:${name}`;
  }

  if (parts.some((part) => EXCLUDED_DIRECTORY_NAMES.has(part))) {
    const excludedPart = parts.find((part) => EXCLUDED_DIRECTORY_NAMES.has(part));
    return `excluded-directory:${excludedPart}`;
  }

  if (!includeEnv && (name === ".env" || name.startsWith(".env."))) {
    return "excluded-secret-env";
  }

  if (!isDirectory && EXCLUDED_FILE_NAMES.has(name)) {
    return `excluded-file:${name}`;
  }

  if (!isDirectory) {
    const lowerRelPath = normalizedRelPath.toLowerCase();
    const matchedSuffix = EXCLUDED_FILE_SUFFIXES.find((suffix) => lowerRelPath.endsWith(suffix));
    if (matchedSuffix) {
      return `excluded-suffix:${matchedSuffix}`;
    }
  }

  return undefined;
}

function incrementCounter(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function collectFiles(root, options) {
  const files = [];
  const skipped = new Map();
  const stack = [root];

  while (stack.length > 0) {
    const currentDirectory = stack.pop();
    const entries = fs.readdirSync(currentDirectory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      const absolutePath = path.join(currentDirectory, entry.name);
      const relPath = path.relative(root, absolutePath);
      const normalizedRelPath = toZipPath(relPath);

      const reason = shouldExcludeEntry({
        relPath,
        name: entry.name,
        isDirectory: entry.isDirectory(),
        includeEnv: options.includeEnv,
        outputPath: options.outputPath,
        root
      });

      if (reason) {
        incrementCounter(skipped, reason);
        continue;
      }

      if (entry.isSymbolicLink()) {
        incrementCounter(skipped, "skipped-symbolic-link");
        continue;
      }

      if (entry.isDirectory()) {
        stack.push(absolutePath);
        continue;
      }

      if (entry.isFile()) {
        files.push({
          absolutePath,
          zipPath: normalizedRelPath,
          stats: fs.statSync(absolutePath)
        });
        continue;
      }

      incrementCounter(skipped, "skipped-special-file");
    }
  }

  files.sort((left, right) => left.zipPath.localeCompare(right.zipPath));
  return { files, skipped };
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);

  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }

  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function toDosDateTime(date) {
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const year = Math.max(1980, safeDate.getFullYear());
  const month = safeDate.getMonth() + 1;
  const day = safeDate.getDate();
  const hours = safeDate.getHours();
  const minutes = safeDate.getMinutes();
  const seconds = Math.floor(safeDate.getSeconds() / 2);

  return {
    time: (hours << 11) | (minutes << 5) | seconds,
    date: ((year - 1980) << 9) | (month << 5) | day
  };
}

function assertZip32Size(value, label) {
  if (value > 0xffffffff) {
    throw new Error(`${label} exceeds ZIP32 limit. Zip64 is intentionally not implemented.`);
  }
}

function createLocalFileHeader(entry) {
  const fileName = Buffer.from(entry.zipPath, "utf8");
  const header = Buffer.alloc(30);

  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(ZIP_VERSION_NEEDED, 4);
  header.writeUInt16LE(UTF8_GENERAL_PURPOSE_FLAG, 6);
  header.writeUInt16LE(entry.method, 8);
  header.writeUInt16LE(entry.dos.time, 10);
  header.writeUInt16LE(entry.dos.date, 12);
  header.writeUInt32LE(entry.crc, 14);
  header.writeUInt32LE(entry.compressedSize, 18);
  header.writeUInt32LE(entry.uncompressedSize, 22);
  header.writeUInt16LE(fileName.length, 26);
  header.writeUInt16LE(0, 28);

  return Buffer.concat([header, fileName]);
}

function createCentralDirectoryHeader(entry) {
  const fileName = Buffer.from(entry.zipPath, "utf8");
  const header = Buffer.alloc(46);
  const externalAttributes = ((entry.mode ?? 0o100644) & 0xffff) << 16;

  header.writeUInt32LE(0x02014b50, 0);
  header.writeUInt16LE(ZIP_VERSION_MADE_BY, 4);
  header.writeUInt16LE(ZIP_VERSION_NEEDED, 6);
  header.writeUInt16LE(UTF8_GENERAL_PURPOSE_FLAG, 8);
  header.writeUInt16LE(entry.method, 10);
  header.writeUInt16LE(entry.dos.time, 12);
  header.writeUInt16LE(entry.dos.date, 14);
  header.writeUInt32LE(entry.crc, 16);
  header.writeUInt32LE(entry.compressedSize, 20);
  header.writeUInt32LE(entry.uncompressedSize, 24);
  header.writeUInt16LE(fileName.length, 28);
  header.writeUInt16LE(0, 30);
  header.writeUInt16LE(0, 32);
  header.writeUInt16LE(0, 34);
  header.writeUInt16LE(0, 36);
  header.writeUInt32LE(externalAttributes >>> 0, 38);
  header.writeUInt32LE(entry.localHeaderOffset, 42);

  return Buffer.concat([header, fileName]);
}

function createEndOfCentralDirectory(entryCount, centralDirectorySize, centralDirectoryOffset) {
  const header = Buffer.alloc(22);

  header.writeUInt32LE(0x06054b50, 0);
  header.writeUInt16LE(0, 4);
  header.writeUInt16LE(0, 6);
  header.writeUInt16LE(entryCount, 8);
  header.writeUInt16LE(entryCount, 10);
  header.writeUInt32LE(centralDirectorySize, 12);
  header.writeUInt32LE(centralDirectoryOffset, 16);
  header.writeUInt16LE(0, 20);

  return header;
}

function createManifest({ root, outputPath, files, skipped, includeEnv }) {
  const skippedByReason = Object.fromEntries([...skipped.entries()].sort(([left], [right]) => left.localeCompare(right)));
  const includedGit = files.some((file) => file.zipPath === ".git" || file.zipPath.startsWith(".git/"));

  return {
    schema_version: 1,
    tool: TOOL_NAME,
    created_at: new Date().toISOString(),
    platform: {
      process_platform: process.platform,
      os_type: os.type(),
      os_release: os.release(),
      node_version: process.version
    },
    project: {
      root_name: path.basename(root),
      output_name: path.basename(outputPath)
    },
    policy: {
      include_hidden_project_entries: true,
      include_git_directory: true,
      include_env_files: includeEnv,
      excluded_directory_names: [...EXCLUDED_DIRECTORY_NAMES].sort(),
      excluded_file_names: [...EXCLUDED_FILE_NAMES].sort(),
      excluded_file_suffixes: [...EXCLUDED_FILE_SUFFIXES].sort()
    },
    summary: {
      included_files: files.length,
      included_git_directory: includedGit,
      skipped_entries: [...skipped.values()].reduce((sum, value) => sum + value, 0),
      skipped_by_reason: skippedByReason
    },
    notes: [
      "Dependency installation folders such as node_modules are excluded.",
      "Generated frontend/backend build outputs, caches and local IDE caches such as .vs are excluded.",
      ".git is included to support repository handoff.",
      ".env files are excluded by default; rerun with --include-env only after an explicit security review."
    ]
  };
}

function createZipEntryFromBuffer({ zipPath, data, mtime, mode }) {
  const compressed = data.length > 0 ? zlib.deflateRawSync(data, { level: 9 }) : Buffer.alloc(0);
  const useStored = compressed.length >= data.length;
  const payload = useStored ? data : compressed;
  const method = useStored ? STORE_METHOD : DEFLATE_METHOD;
  const { time, date } = toDosDateTime(mtime);

  assertZip32Size(data.length, `${zipPath} uncompressed size`);
  assertZip32Size(payload.length, `${zipPath} compressed size`);

  return {
    zipPath,
    data: payload,
    crc: crc32(data),
    compressedSize: payload.length,
    uncompressedSize: data.length,
    method,
    dos: { time, date },
    mode
  };
}

function writeZip({ files, manifest, outputPath }) {
  const outputDirectory = path.dirname(outputPath);
  fs.mkdirSync(outputDirectory, { recursive: true });

  if (fs.existsSync(outputPath)) {
    fs.rmSync(outputPath, { force: true });
  }

  const fd = fs.openSync(outputPath, "w");
  const centralDirectoryEntries = [];
  let writtenBytes = 0;

  try {
    const writeBuffer = (buffer) => {
      fs.writeSync(fd, buffer, 0, buffer.length);
      writtenBytes += buffer.length;
    };

    const entries = [
      {
        zipPath: MANIFEST_ENTRY_NAME,
        data: Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, "utf8"),
        mtime: new Date(),
        mode: 0o100644
      },
      ...files.map((file) => ({
        zipPath: file.zipPath,
        data: fs.readFileSync(file.absolutePath),
        mtime: file.stats.mtime,
        mode: file.stats.mode
      }))
    ];

    if (entries.length > 0xffff) {
      throw new Error("Too many files for ZIP32. Zip64 is intentionally not implemented.");
    }

    for (const entryInput of entries) {
      const entry = createZipEntryFromBuffer(entryInput);
      entry.localHeaderOffset = writtenBytes;

      assertZip32Size(entry.localHeaderOffset, `${entry.zipPath} local header offset`);

      const localHeader = createLocalFileHeader(entry);
      writeBuffer(localHeader);
      writeBuffer(entry.data);

      centralDirectoryEntries.push({
        ...entry,
        data: undefined
      });
    }

    const centralDirectoryOffset = writtenBytes;

    for (const entry of centralDirectoryEntries) {
      const centralHeader = createCentralDirectoryHeader(entry);
      writeBuffer(centralHeader);
    }

    const centralDirectorySize = writtenBytes - centralDirectoryOffset;

    assertZip32Size(centralDirectoryOffset, "Central directory offset");
    assertZip32Size(centralDirectorySize, "Central directory size");

    const eocd = createEndOfCentralDirectory(
      centralDirectoryEntries.length,
      centralDirectorySize,
      centralDirectoryOffset
    );
    writeBuffer(eocd);
  } finally {
    fs.closeSync(fd);
  }
}

function formatSkipped(skipped) {
  if (skipped.size === 0) {
    return "none";
  }

  return [...skipped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([reason, count]) => `${reason}=${count}`)
    .join(", ");
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(USAGE);
    return;
  }

  const root = resolveRoot(args.root);
  const outputPath = resolveOutputPath(root, args.output);
  const { files, skipped } = collectFiles(root, {
    includeEnv: args.includeEnv,
    outputPath
  });
  const manifest = createManifest({
    root,
    outputPath,
    files,
    skipped,
    includeEnv: args.includeEnv
  });

  if (args.dryRun) {
    console.log(`Handoff ZIP dry run for ${root}`);
    console.log(`Output path: ${outputPath}`);
    console.log(`Included files: ${files.length}`);
    console.log(`Included .git: ${manifest.summary.included_git_directory ? "yes" : "no"}`);
    console.log(`Skipped entries: ${manifest.summary.skipped_entries}`);
    console.log(`Skipped by reason: ${formatSkipped(skipped)}`);
    return;
  }

  writeZip({
    files,
    manifest,
    outputPath
  });

  const outputStats = fs.statSync(outputPath);
  console.log(`Handoff ZIP generated: ${outputPath}`);
  console.log(`Archive size: ${outputStats.size} bytes`);
  console.log(`Included files: ${files.length}`);
  console.log(`Included .git: ${manifest.summary.included_git_directory ? "yes" : "no"}`);
  console.log(`Skipped entries: ${manifest.summary.skipped_entries}`);
  console.log(`Skipped by reason: ${formatSkipped(skipped)}`);
}

try {
  main();
} catch (error) {
  console.error(`Handoff ZIP generation failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
