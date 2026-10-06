// 白い単色の背景で作った絵を切りぬいて、透過つきの WebP にする。
// 使い方: node scripts/convert-cutout.mjs <入力> <出力.webp> <出力の幅px>
// 画像のふちからつながっている白だけを消す（絵の中の白は残す）。絵の外がわは濃い線で囲まれている前提。
import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const [src, out, widthArg] = process.argv.slice(2);
if (!src || !out || !widthArg) {
  console.error('使い方: node scripts/convert-cutout.mjs <入力> <出力.webp> <出力の幅px>');
  process.exit(1);
}
const WHITE = 232; // これより明るい画素を背景とみなす
const EDGE = 2;    // 背景に接する何画素ぶんを、なじませる対象にするか

const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h } = info;
const isWhite = i => data[i * 4] > WHITE && data[i * 4 + 1] > WHITE && data[i * 4 + 2] > WHITE;

// ふちから塗りつぶし
const bg = new Uint8Array(w * h);
const stack = [];
const push = i => { if (!bg[i] && isWhite(i)) { bg[i] = 1; stack.push(i); } };
for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
while (stack.length) {
  const i = stack.pop();
  const x = i % w;
  if (x > 0) push(i - 1);
  if (x < w - 1) push(i + 1);
  if (i >= w) push(i - w);
  if (i < w * (h - 1)) push(i + w);
}

// 背景に接する画素は、白がまざっているぶんだけ透かして、色から白をぬく
const near = new Uint8Array(w * h);
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  if (!bg[y * w + x]) continue;
  for (let dy = -EDGE; dy <= EDGE; dy++) for (let dx = -EDGE; dx <= EDGE; dx++) {
    const nx = x + dx, ny = y + dy;
    if (nx >= 0 && nx < w && ny >= 0 && ny < h) near[ny * w + nx] = 1;
  }
}
for (let i = 0; i < w * h; i++) {
  const p = i * 4;
  if (bg[i]) { data[p + 3] = 0; continue; }
  if (!near[i]) continue;
  const a = Math.min(1, (255 - Math.min(data[p], data[p + 1], data[p + 2])) / 200);
  if (a <= 0.02) { data[p + 3] = 0; continue; }
  for (let c = 0; c < 3; c++) data[p + c] = Math.max(0, Math.min(255, Math.round((data[p + c] - 255 * (1 - a)) / a)));
  data[p + 3] = Math.round(a * 255);
}

await mkdir(path.dirname(out), { recursive: true });
const meta = await sharp(data, { raw: { width: w, height: h, channels: 4 } })
  .trim()
  .resize({ width: Number(widthArg) })
  .webp({ quality: 88, alphaQuality: 90 })
  .toFile(out);
console.log(`${out}\t${meta.width}x${meta.height}\t${Math.round((await stat(out)).size / 1024)}KB`);
