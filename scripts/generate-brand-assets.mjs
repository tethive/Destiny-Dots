/**
 * Builds every logo and icon size from public/brand/logo-full.png (the full badge).
 * Run after changing the logo:  npm run brand:assets
 *
 * - logo-badge.png   the badge at web size (header, sidebar, footer, emails, PDFs)
 * - favicons, Apple touch icon, Android icons and src/app/favicon.ico
 */
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const SOURCE = "public/brand/logo-full.png";

const png = (img) => img.png({ compressionLevel: 9, palette: true, quality: 92, effort: 10 });

const logoAt = (size) =>
  sharp(SOURCE).resize(size, size, { kernel: "lanczos3", fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } });

/** Home-screen icons can't be transparent: place the badge on the brand's light background. */
async function solidIcon(size, padding) {
  const inner = Math.round(size * (1 - padding * 2));
  const logo = await logoAt(inner).png().toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: "#f4f1fd" } }).composite([{ input: logo, gravity: "center" }]);
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

await png(logoAt(512)).toFile("public/brand/logo-badge.png");

// Tiny sizes get a touch of sharpening so the "D" stays visible.
const small = (size) => png(logoAt(size).sharpen({ sigma: 0.6 })).toBuffer();
const [f16, f32, f48] = await Promise.all([small(16), small(32), small(48)]);
await writeFile("public/favicon-16x16.png", f16);
await writeFile("public/favicon-32x32.png", f32);
await writeFile(
  "src/app/favicon.ico",
  ico([
    { size: 16, data: f16 },
    { size: 32, data: f32 },
    { size: 48, data: f48 },
  ]),
);

await png(await solidIcon(180, 0.04)).toFile("public/apple-touch-icon.png");
await png(logoAt(192)).toFile("public/android-chrome-192x192.png");
await png(logoAt(512)).toFile("public/android-chrome-512x512.png");

console.log("Brand assets generated.");
