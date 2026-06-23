// Compare the live site's WebGL canvas output (shader-output.json, base64 PNGs)
// against the Node golden-standard images, using CIE ΔE2000 (perceptual).
//
// Usage: node scripts/compare.mjs [label]
//   label is just printed in the header (e.g. "BEFORE" / "AFTER").

import sharp from "sharp";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const GOLDEN = path.join(__dirname, "golden");
const SHADER_JSON = path.join(ROOT, "shader-output.json");
const LABEL = process.argv[2] || "RESULT";

const ID_TO_TYPE = {
  "cb-canvasProtanomaly": "Protanomaly",
  "cb-canvasProtanopia": "Protanopia",
  "cb-canvasDeuteranomaly": "Deuteranomaly",
  "cb-canvasDeuteranopia": "Deuteranopia",
  "cb-canvasTritanomaly": "Tritanomaly",
  "cb-canvasTritanopia": "Tritanopia",
  "cb-canvasAchromatomaly": "Achromatomaly",
  "cb-canvasAchromatopsia": "Achromatopsia",
};

// sRGB (0..255) -> CIE Lab (D65)
function srgbToLab(r, g, b) {
  let R = r / 255, G = g / 255, B = b / 255;
  const lin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  R = lin(R); G = lin(G); B = lin(B);
  let X = R * 0.4124 + G * 0.3576 + B * 0.1805;
  let Y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  let Z = R * 0.0193 + G * 0.1192 + B * 0.9505;
  X /= 0.95047; Y /= 1.0; Z /= 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(X), fy = f(Y), fz = f(Z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

// CIEDE2000
function deltaE2000(lab1, lab2) {
  const [L1, a1, b1] = lab1, [L2, a2, b2] = lab2;
  const avgL = (L1 + L2) / 2;
  const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2);
  const avgC = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Math.pow(avgC, 7) / (Math.pow(avgC, 7) + Math.pow(25, 7))));
  const a1p = a1 * (1 + G), a2p = a2 * (1 + G);
  const C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2);
  const avgCp = (C1p + C2p) / 2;
  const h = (ap, bp) => { let hp = Math.atan2(bp, ap) * 180 / Math.PI; return hp < 0 ? hp + 360 : hp; };
  const h1p = h(a1p, b1), h2p = h(a2p, b2);
  let dhp;
  if (C1p * C2p === 0) dhp = 0;
  else if (Math.abs(h2p - h1p) <= 180) dhp = h2p - h1p;
  else if (h2p - h1p > 180) dhp = h2p - h1p - 360;
  else dhp = h2p - h1p + 360;
  const dLp = L2 - L1;
  const dCp = C2p - C1p;
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp * Math.PI / 180) / 2);
  let avghp;
  if (C1p * C2p === 0) avghp = h1p + h2p;
  else if (Math.abs(h1p - h2p) <= 180) avghp = (h1p + h2p) / 2;
  else if (h1p + h2p < 360) avghp = (h1p + h2p + 360) / 2;
  else avghp = (h1p + h2p - 360) / 2;
  const T = 1 - 0.17 * Math.cos((avghp - 30) * Math.PI / 180)
    + 0.24 * Math.cos((2 * avghp) * Math.PI / 180)
    + 0.32 * Math.cos((3 * avghp + 6) * Math.PI / 180)
    - 0.20 * Math.cos((4 * avghp - 63) * Math.PI / 180);
  const dTheta = 30 * Math.exp(-Math.pow((avghp - 275) / 25, 2));
  const Rc = 2 * Math.sqrt(Math.pow(avgCp, 7) / (Math.pow(avgCp, 7) + Math.pow(25, 7)));
  const Sl = 1 + (0.015 * Math.pow(avgL - 50, 2)) / Math.sqrt(20 + Math.pow(avgL - 50, 2));
  const Sc = 1 + 0.045 * avgCp;
  const Sh = 1 + 0.015 * avgCp * T;
  const Rt = -Math.sin(2 * dTheta * Math.PI / 180) * Rc;
  return Math.sqrt(
    Math.pow(dLp / Sl, 2) + Math.pow(dCp / Sc, 2) + Math.pow(dHp / Sh, 2)
    + Rt * (dCp / Sc) * (dHp / Sh)
  );
}

async function decodeToRaw(buf) {
  const { data, info } = await sharp(buf).ensureAlpha(1).raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height, channels: info.channels };
}

async function main() {
  const shader = JSON.parse(fs.readFileSync(SHADER_JSON, "utf8"));
  console.log(`\n=== ΔE2000 comparison [${LABEL}] : live WebGL vs Node golden ===`);
  console.log("type".padEnd(16), "avgΔE".padStart(8), "maxΔE".padStart(8), "p>2%".padStart(8), "p>5%".padStart(8));

  let grandAvg = 0, count = 0, worstAvg = 0, worstType = "";
  for (const [id, type] of Object.entries(ID_TO_TYPE)) {
    const b64 = shader[id].replace(/^data:image\/png;base64,/, "");
    const a = await decodeToRaw(Buffer.from(b64, "base64"));
    const g = await decodeToRaw(fs.readFileSync(path.join(GOLDEN, `${type}.png`)));
    if (a.width !== g.width || a.height !== g.height) {
      console.log(`${type}: SIZE MISMATCH ${a.width}x${a.height} vs ${g.width}x${g.height}`);
      continue;
    }
    const n = a.width * a.height;
    let sum = 0, max = 0, over2 = 0, over5 = 0;
    for (let i = 0; i < n; i++) {
      const oa = i * a.channels, og = i * g.channels;
      const labA = srgbToLab(a.data[oa], a.data[oa + 1], a.data[oa + 2]);
      const labG = srgbToLab(g.data[og], g.data[og + 1], g.data[og + 2]);
      const de = deltaE2000(labA, labG);
      sum += de;
      if (de > max) max = de;
      if (de > 2) over2++;
      if (de > 5) over5++;
    }
    const avg = sum / n;
    grandAvg += avg; count++;
    if (avg > worstAvg) { worstAvg = avg; worstType = type; }
    console.log(
      type.padEnd(16),
      avg.toFixed(3).padStart(8),
      max.toFixed(2).padStart(8),
      (100 * over2 / n).toFixed(2).padStart(8),
      (100 * over5 / n).toFixed(2).padStart(8),
    );
  }
  console.log("-".repeat(52));
  console.log(`mean avgΔE across types: ${(grandAvg / count).toFixed(3)}   worst: ${worstType} (${worstAvg.toFixed(3)})`);
  console.log(`PASS threshold: mean avgΔE < 2  =>  ${(grandAvg / count) < 2 ? "PASS" : "FAIL"}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
