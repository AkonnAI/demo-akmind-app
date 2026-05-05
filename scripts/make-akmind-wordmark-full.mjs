/**
 * Build public/brand/akmind-wordmark-full.png from akmind-v1.0-master
 * `Images & Videos/Brain Final.png` — brain + AKMIND wordmark (master's
 * make-logo-transparent.mjs intentionally crops the text off akmind-logo.png).
 *
 * Usage: npm run brand:wordmark-full
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const demoRoot = path.join(__dirname, "..");
const masterRoot = path.join(demoRoot, "..", "akmind-v1.0-master");
const input = path.join(masterRoot, "Images & Videos", "Brain Final.png");
const outLogo = path.join(demoRoot, "public", "brand", "akmind-wordmark-full.png");
const outDims = path.join(demoRoot, "src", "lib", "akmind-wordmark-dimensions.ts");

const PADDING = 16;
const OUTPUT_MAX_WIDTH = 800;

const ALPHA_EMPTY = 10;
const BG_REF = { r: 4, g: 20, b: 30 };
const FLOOD_BG_MANHATTAN = 48;
const HALO_MANHATTAN = 58;
const HALO_ITERATIONS = 2;
const FLOOD_WHITE_MANHATTAN = 32;
const HALO_WHITE_MANHATTAN = 42;
const HALO_WHITE_ITERATIONS = 2;

function manhattan(r, g, b, br, bg, bb) {
  return Math.abs(r - br) + Math.abs(g - bg) + Math.abs(b - bb);
}

function alphaBBox(data, w, h) {
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (data[i + 3] > ALPHA_EMPTY) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX) return null;
  return { minX, minY, maxX, maxY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

function cropBuffer(data, w, h, box) {
  const nw = box.width;
  const nh = box.height;
  const out = Buffer.alloc(nw * nh * 4);
  for (let y = 0; y < nh; y++) {
    for (let x = 0; x < nw; x++) {
      const si = ((box.minY + y) * w + (box.minX + x)) * 4;
      const di = (y * nw + x) * 4;
      out[di] = data[si];
      out[di + 1] = data[si + 1];
      out[di + 2] = data[si + 2];
      out[di + 3] = data[si + 3];
    }
  }
  return { data: out, width: nw, height: nh };
}

function floodEdgeStudioTransparent(data, w, h, br, bg, bb, tol) {
  const inBg = (i) => {
    const a = data[i + 3];
    if (a < 28) return true;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    return manhattan(r, g, b, br, bg, bb) <= tol;
  };
  floodEdgeGeneric(data, w, h, inBg);
}

function floodEdgeWhiteMatte(data, w, h, tol) {
  const inBg = (i) => {
    const a = data[i + 3];
    if (a < 28) return true;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    return manhattan(r, g, b, 255, 255, 255) <= tol;
  };
  floodEdgeGeneric(data, w, h, inBg);
}

function floodEdgeGeneric(data, w, h, inBg) {
  const visited = new Uint8Array(w * h);
  const qx = [];
  const qy = [];

  function enqueue(x, y) {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const pi = y * w + x;
    if (visited[pi]) return;
    const i = pi * 4;
    if (!inBg(i)) return;
    visited[pi] = 1;
    qx.push(x);
    qy.push(y);
  }

  for (let x = 0; x < w; x++) {
    enqueue(x, 0);
    enqueue(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    enqueue(0, y);
    enqueue(w - 1, y);
  }

  for (let qi = 0; qi < qx.length; qi++) {
    const x = qx[qi];
    const y = qy[qi];
    const i = (y * w + x) * 4;
    data[i + 3] = 0;
    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }
}

function transparentNeighbor(data, w, h, x, y) {
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  for (const [dx, dy] of dirs) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
    const ni = (ny * w + nx) * 4;
    if (data[ni + 3] < 40) return true;
  }
  return false;
}

function haloPass(data, w, h, br, bg, bb, tol) {
  const copy = Buffer.from(data);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (copy[i + 3] < 40) continue;
      const r = copy[i];
      const g = copy[i + 1];
      const b = copy[i + 2];
      if (manhattan(r, g, b, br, bg, bb) <= tol && transparentNeighbor(copy, w, h, x, y)) {
        data[i + 3] = 0;
      }
    }
  }
}

function haloWhitePass(data, w, h, tol) {
  const copy = Buffer.from(data);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (copy[i + 3] < 40) continue;
      const r = copy[i];
      const g = copy[i + 1];
      const b = copy[i + 2];
      if (manhattan(r, g, b, 255, 255, 255) <= tol && transparentNeighbor(copy, w, h, x, y)) {
        data[i + 3] = 0;
      }
    }
  }
}

/** Looser than master script so anti-aliased wordmark descenders are not trimmed away. */
function trimTransparent(data, w, h) {
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (data[i + 3] > 6) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX) return { data, width: w, height: h };
  const box = { minX, minY, width: maxX - minX + 1, height: maxY - minY + 1, maxX, maxY };
  return cropBuffer(data, w, h, box);
}

if (!fs.existsSync(input)) {
  console.error("Missing source image (install akmind-v1.0-master alongside demo-akmind-app):\n", input);
  process.exit(1);
}

const { data: raw, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let w = info.width;
let h = info.height;
let data = Buffer.from(raw);

let box = alphaBBox(data, w, h);
if (!box) {
  console.error("Could not detect content bounds.");
  process.exit(1);
}

/** Full lockup: include wordmark (do not use brainMaxY crop). */
box = {
  minX: Math.max(0, box.minX - PADDING),
  minY: Math.max(0, box.minY - PADDING),
  maxX: Math.min(w - 1, box.maxX + PADDING),
  maxY: Math.min(h - 1, box.maxY + PADDING),
};
box.width = box.maxX - box.minX + 1;
box.height = box.maxY - box.minY + 1;

console.log("Full lockup crop box", box);

let cropped = cropBuffer(data, w, h, box);
data = cropped.data;
w = cropped.width;
h = cropped.height;

floodEdgeStudioTransparent(data, w, h, BG_REF.r, BG_REF.g, BG_REF.b, FLOOD_BG_MANHATTAN);
for (let t = 0; t < HALO_ITERATIONS; t++) {
  haloPass(data, w, h, BG_REF.r, BG_REF.g, BG_REF.b, HALO_MANHATTAN);
}

floodEdgeWhiteMatte(data, w, h, FLOOD_WHITE_MANHATTAN);
for (let t = 0; t < HALO_WHITE_ITERATIONS; t++) {
  haloWhitePass(data, w, h, HALO_WHITE_MANHATTAN);
}

let trimmed = trimTransparent(data, w, h);
data = trimmed.data;
w = trimmed.width;
h = trimmed.height;

const BOTTOM_PAD_PX = 36;

let outW = w;
let outH = h + BOTTOM_PAD_PX;
let pipeline = sharp(data, { raw: { width: w, height: h, channels: 4 } })
  .ensureAlpha()
  .extend({
    top: 0,
    left: 0,
    right: 0,
    bottom: BOTTOM_PAD_PX,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  });

if (w > OUTPUT_MAX_WIDTH) {
  outW = OUTPUT_MAX_WIDTH;
  outH = Math.round(((h + BOTTOM_PAD_PX) * OUTPUT_MAX_WIDTH) / w);
  pipeline = pipeline.resize(outW, outH, { kernel: sharp.kernel.lanczos3 });
}

const outBuf = await pipeline.png({ compressionLevel: 9, effort: 10, palette: false }).toBuffer();

await fs.promises.mkdir(path.dirname(outLogo), { recursive: true });
await fs.promises.writeFile(outLogo, outBuf);

const metaPng = await sharp(outBuf).metadata();
const finalW = metaPng.width ?? outW;
const finalH = metaPng.height ?? outH;

const dimsSrc = `/** Auto-generated by scripts/make-akmind-wordmark-full.mjs — do not edit by hand. */
export const AKMIND_WORDMARK_FULL_WIDTH = ${finalW};
export const AKMIND_WORDMARK_FULL_HEIGHT = ${finalH};
`;
await fs.promises.writeFile(outDims, dimsSrc, "utf8");

console.log(
  `Wrote ${outLogo} (${finalW}x${finalH}, hasAlpha=${metaPng.hasAlpha}) + ${path.relative(demoRoot, outDims)}`
);
