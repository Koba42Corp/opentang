#!/usr/bin/env node
/**
 * generate-icons.js
 *
 * Generates placeholder icons for OpenTang (orange square, #F97316).
 * Run: node scripts/generate-icons.js
 *
 * This produces valid PNG, ICO, and ICNS files so that `tauri build`
 * can complete without requiring external tools like ImageMagick.
 * Replace src-tauri/icons/ contents with real brand artwork before release.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const iconsDir = path.join(__dirname, "..", "src-tauri", "icons");
fs.mkdirSync(iconsDir, { recursive: true });

// ─── PNG Generator ────────────────────────────────────────────────────────────

/** CRC-32 table for PNG chunk checksums */
function buildCrcTable() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  return table;
}
const CRC_TABLE = buildCrcTable();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const lenBuf = Buffer.allocUnsafe(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBytes, data]);
  const crcBuf = Buffer.allocUnsafe(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBytes, data, crcBuf]);
}

/**
 * Create a solid-color PNG of the given dimensions.
 * Color: OpenTang orange #F97316 (R=249, G=115, B=22)
 */
function makeSolidOrangePng(width, height) {
  const R = 249,
    G = 115,
    B = 22;

  // PNG signature
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR chunk — width, height, 8-bit RGB, no interlace
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB
  ihdr[10] = 0; // compression method
  ihdr[11] = 0; // filter method
  ihdr[12] = 0; // interlace method

  // Raw scanline data: filter byte (0 = None) + width * 3 bytes per row
  const rowBytes = 1 + width * 3;
  const raw = Buffer.allocUnsafe(height * rowBytes);
  for (let y = 0; y < height; y++) {
    const off = y * rowBytes;
    raw[off] = 0; // filter: None
    for (let x = 0; x < width; x++) {
      raw[off + 1 + x * 3] = R;
      raw[off + 1 + x * 3 + 1] = G;
      raw[off + 1 + x * 3 + 2] = B;
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    sig,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", compressed),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ─── ICO Generator (Windows) ──────────────────────────────────────────────────

/** Build a minimal ICO file containing a single PNG image. */
function makeIco(pngData, width, height) {
  // ICO header (6 bytes)
  const header = Buffer.allocUnsafe(6);
  header.writeUInt16LE(0, 0); // reserved, must be 0
  header.writeUInt16LE(1, 2); // type: 1 = ICO
  header.writeUInt16LE(1, 4); // number of images: 1

  // Directory entry (16 bytes per image)
  const dir = Buffer.allocUnsafe(16);
  dir[0] = width >= 256 ? 0 : width; // 0 means 256 in ICO
  dir[1] = height >= 256 ? 0 : height;
  dir[2] = 0; // color palette count (0 = no palette)
  dir[3] = 0; // reserved
  dir.writeUInt16LE(1, 4); // color planes
  dir.writeUInt16LE(32, 6); // bits per pixel
  dir.writeUInt32LE(pngData.length, 8); // size of image data
  dir.writeUInt32LE(6 + 16, 12); // offset to image data (header + one dir entry)

  return Buffer.concat([header, dir, pngData]);
}

// ─── ICNS Generator (macOS) ───────────────────────────────────────────────────

/**
 * Build a minimal ICNS file.
 * Uses the 'icp4' OSType which holds a 32×32 PNG directly.
 */
function makeIcns(pngData) {
  // ICNS magic
  const magic = Buffer.from("icns", "ascii");

  // Icon element type: 'icp4' = 32×32 PNG
  const iconType = Buffer.from("icp4", "ascii");

  // Element size = 4 (type) + 4 (size field) + PNG data
  const elementSize = Buffer.allocUnsafe(4);
  elementSize.writeUInt32BE(8 + pngData.length, 0);

  // Total file size = 4 (magic) + 4 (file size field) + element
  const fileSize = Buffer.allocUnsafe(4);
  fileSize.writeUInt32BE(8 + 8 + pngData.length, 0);

  return Buffer.concat([magic, fileSize, iconType, elementSize, pngData]);
}

// ─── Generate all required files ──────────────────────────────────────────────

console.log("Generating placeholder icons for OpenTang...\n");

// PNG sizes required by tauri.conf.json
const png32 = makeSolidOrangePng(32, 32);
const png128 = makeSolidOrangePng(128, 128);
const png256 = makeSolidOrangePng(256, 256);

fs.writeFileSync(path.join(iconsDir, "32x32.png"), png32);
console.log("  ✓  32x32.png");

fs.writeFileSync(path.join(iconsDir, "128x128.png"), png128);
console.log("  ✓  128x128.png");

// 128x128@2x is effectively 256×256
fs.writeFileSync(path.join(iconsDir, "128x128@2x.png"), png256);
console.log("  ✓  128x128@2x.png");

// Windows ICO (32×32 with embedded PNG)
const ico = makeIco(png32, 32, 32);
fs.writeFileSync(path.join(iconsDir, "icon.ico"), ico);
console.log("  ✓  icon.ico");

// macOS ICNS
const icns = makeIcns(png32);
fs.writeFileSync(path.join(iconsDir, "icon.icns"), icns);
console.log("  ✓  icon.icns");

console.log("\nDone. Replace with real brand artwork before v0.1.0 release.");
