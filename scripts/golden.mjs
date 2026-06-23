// Faithful Node port of refer/engine.js color_blind_sims() + anomylize/monochrome,
// run per-pixel over refer/originalPhoto.gif to produce ground-truth images
// for the 8 simulation types used by the site.
//
// Decode/encode and rounding match engine.js exactly:
//   - gamma decode/encode pow(.,2.2) / pow(.,1/2.2)
//   - dichromat & anomalize outputs use dec_to_hex => floor (parseInt) + clamp
//   - monochrome uses Math.round + .299/.587/.114 in display space
//   - anomalize mixes in display/sRGB space: (v*filtered + original)/(v+1)
//       protan/deutan/tritan: v = 1.75 ; achromatomaly: v = 4

import sharp from "sharp";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "refer", "originalPhoto.gif");
const OUT = path.join(__dirname, "golden");

const gamma = 2.2;
const wx = 0.312713, wy = 0.329016, wz = 0.358271;

const blind = {
  protan: { cpu: 0.735, cpv: 0.265, abu: 0.115807, abv: 0.073581, aeu: 0.471899, aev: 0.527051 },
  deutan: { cpu: 1.14, cpv: -0.14, abu: 0.102776, abv: 0.102864, aeu: 0.505845, aev: 0.493211 },
  tritan: { cpu: 0.171, cpv: -0.003, abu: 0.045391, abv: 0.294976, aeu: 0.665764, aev: 0.334011 },
};
for (const t in blind) {
  blind[t].am = (blind[t].aev - blind[t].abv) / (blind[t].aeu - blind[t].abu);
  blind[t].ayi = blind[t].abv - blind[t].abu * blind[t].am;
}

const xyzFromRgb = (r, g, b) => ({
  x: 0.4306 * r + 0.3416 * g + 0.1783 * b,
  y: 0.2220 * r + 0.7067 * g + 0.0713 * b,
  z: 0.0202 * r + 0.1296 * g + 0.9392 * b,
});
const rgbFromXyz = (x, y, z) => ({
  r: 3.0632 * x - 1.3933 * y - 0.4758 * z,
  g: -0.9692 * x + 1.8760 * y + 0.0416 * z,
  b: 0.0679 * x - 0.2289 * y + 1.0693 * z,
});

// dec_to_hex semantics, but returning an int 0..255 (floor in between)
const decClamp = (dec) => (dec <= 0 ? 0 : dec >= 255 ? 255 : Math.floor(dec));

function colorBlindSims(r, g, b) {
  const cr = Math.pow(r / 255, gamma);
  const cg = Math.pow(g / 255, gamma);
  const cb = Math.pow(b / 255, gamma);
  const c = xyzFromRgb(cr, cg, cb);
  const cy = c.y;
  const sum = c.x + c.y + c.z;
  let cu = 0, cv = 0;
  if (sum !== 0) { cu = c.x / sum; cv = c.y / sum; }
  const nx = wx * cy / wy;
  const nz = wz * cy / wy;

  const sim = {};
  for (const t in blind) {
    let clm;
    if (cu < blind[t].cpu) clm = (blind[t].cpv - cv) / (blind[t].cpu - cu);
    else clm = (cv - blind[t].cpv) / (cu - blind[t].cpu);
    const clyi = cv - cu * clm;
    const du = (blind[t].ayi - clyi) / (clm - blind[t].am);
    const dv = clm * du + clyi;

    const s = rgbFromXyz(du * cy / dv, cy, (1 - (du + dv)) * cy / dv);
    const d = rgbFromXyz(nx - (du * cy / dv), 0, nz - ((1 - (du + dv)) * cy / dv));

    const adjr = d.r ? ((s.r < 0 ? 0 : 1) - s.r) / d.r : 0;
    const adjg = d.g ? ((s.g < 0 ? 0 : 1) - s.g) / d.g : 0;
    const adjb = d.b ? ((s.b < 0 ? 0 : 1) - s.b) / d.b : 0;
    const adjust = Math.max(
      (adjr > 1 || adjr < 0) ? 0 : adjr,
      (adjg > 1 || adjg < 0) ? 0 : adjg,
      (adjb > 1 || adjb < 0) ? 0 : adjb,
    );
    const fr = s.r + adjust * d.r;
    const fg = s.g + adjust * d.g;
    const fb = s.b + adjust * d.b;

    const enc = (v) => (v <= 0 ? 0 : v >= 1 ? 255 : Math.pow(v, 1 / gamma) * 255);
    sim[t] = { r: decClamp(enc(fr)), g: decClamp(enc(fg)), b: decClamp(enc(fb)) };
  }
  return sim;
}

// anomylize_code: (v*filtered + original)/(v+1), display space, floor
const anomalize = (filtered, orig, v) => {
  const d = v + 1;
  return {
    r: decClamp((v * filtered.r + orig.r) / d),
    g: decClamp((v * filtered.g + orig.g) / d),
    b: decClamp((v * filtered.b + orig.b) / d),
  };
};

// monochrome_code: Math.round(.299r + .587g + .114b)
const monochrome = (r, g, b) => {
  const m = Math.round(r * 0.299 + g * 0.587 + b * 0.114);
  return { r: m, g: m, b: m };
};

const TYPES = [
  "Protanomaly", "Protanopia",
  "Deuteranomaly", "Deuteranopia",
  "Tritanomaly", "Tritanopia",
  "Achromatomaly", "Achromatopsia",
];

function simulate(type, r, g, b) {
  switch (type) {
    case "Protanopia": return colorBlindSims(r, g, b).protan;
    case "Deuteranopia": return colorBlindSims(r, g, b).deutan;
    case "Tritanopia": return colorBlindSims(r, g, b).tritan;
    case "Protanomaly": return anomalize(colorBlindSims(r, g, b).protan, { r, g, b }, 1.75);
    case "Deuteranomaly": return anomalize(colorBlindSims(r, g, b).deutan, { r, g, b }, 1.75);
    case "Tritanomaly": return anomalize(colorBlindSims(r, g, b).tritan, { r, g, b }, 1.75);
    case "Achromatopsia": return monochrome(r, g, b);
    case "Achromatomaly": {
      const mono = monochrome(r, g, b);
      return anomalize(mono, { r, g, b }, 4);
    }
    default: return { r, g, b };
  }
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const { data, info } = await sharp(SRC)
    .ensureAlpha(1)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  console.log(`Decoded ${path.basename(SRC)}: ${width}x${height}, channels=${channels}`);

  for (const type of TYPES) {
    const out = Buffer.alloc(width * height * 4);
    for (let i = 0; i < width * height; i++) {
      const o = i * channels;
      const r = data[o], g = data[o + 1], b = data[o + 2];
      const s = simulate(type, r, g, b);
      const p = i * 4;
      out[p] = s.r; out[p + 1] = s.g; out[p + 2] = s.b; out[p + 3] = 255;
    }
    const file = path.join(OUT, `${type}.png`);
    await sharp(out, { raw: { width, height, channels: 4 } }).png().toFile(file);
    console.log(`  wrote ${path.relative(ROOT, file)}`);
  }
  // also save the decoded original for reference
  await sharp(SRC).png().toFile(path.join(OUT, "Original.png"));
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
