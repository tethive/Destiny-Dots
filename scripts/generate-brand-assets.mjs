/**
 * Builds every logo and icon size from public/brand/logo-full.png.
 * Run after changing the logo:  npm run brand:assets
 *
 * - logo-badge.png   full badge, web size (footer, auth and status pages, emails)
 * - logo-mark.png    the inner "D" disc, cropped (header, sidebar)
 * - favicons, Apple touch icon, Android icons and src/app/favicon.ico
 */
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const SOURCE = "public/brand/logo-full.png";
// The inner disc (the "D" with its thin ring) inside the 1254 px source.
const DISC = { cx: 629, cy: 641, r: 414 };

const png = (img) => img.png({ compressionLevel: 9, palette: true, quality: 92, effort: 10 });

async function discCrop(size) {
  const side = DISC.r * 2;
  const mask = Buffer.from(`<svg width="${side}" height="${side}"><circle cx="${DISC.r}" cy="${DISC.r}" r="${DISC.r}" fill="#fff"/></svg>`);
  const cropped = await sharp(SOURCE)
    .extract({ left: DISC.cx - DISC.r, top: DISC.cy - DISC.r, width: side, height: side })
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
  return sharp(cropped).resize(size, size, { kernel: "lanczos3" });
}

/** App-store style icons can't be transparent: place the mark on the brand's light background. */
async function solidIcon(size, padding) {
  const inner = Math.round(size * (1 - padding * 2));
  const mark = await (await discCrop(inner)).png().toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: "#f4f1fd" } }).composite([{ input: mark, gravity: "center" }]);
}

/** ICO container with embedded PNG images (supported by every current browser). */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const entries = [];
  let offset = 6 + 16 * images.length;
  for (const { size, data } of images) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2);
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    entries.push(e);
  }
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

await mkdir("public/brand", { recursive: true });

await png(sharp(SOURCE).resize(512, 512, { kernel: "lanczos3" })).toFile("public/brand/logo-badge.png");
await png(await discCrop(256)).toFile("public/brand/logo-mark.png");

// Tiny sizes get a touch of sharpening so the "D" stays crisp.
const small = async (size) => png((await discCrop(size)).sharpen({ sigma: 0.6 })).toBuffer();
const [f16, f32, f48] = await Promise.all([small(16), small(32), small(48)]);
await writeFile("public/favicon-16x16.png", f16);
await writeFile("public/favicon-32x32.png", f32);
await writeFile("src/app/favicon.ico", ico([
  { size: 16, data: f16 },
  { size: 32, data: f32 },
  { size: 48, data: f48 },
]));

await png(await solidIcon(180, 0.06)).toFile("public/apple-touch-icon.png");
await png(await discCrop(192)).toFile("public/android-chrome-192x192.png");
await png(await discCrop(512)).toFile("public/android-chrome-512x512.png");

console.log("Brand assets generated.");
