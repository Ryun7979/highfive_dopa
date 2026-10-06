// 絵をますめに並べたシートを、同じ大きさのますに切り分ける（左上から右へ、上から下への順に番号を付ける）。
// 使い方: node scripts/split-sheet.mjs <入力> <出力の頭> [列の数=2] [行の数=2]
// 例: node scripts/split-sheet.mjs _inbox/fx_star_src.jpg _inbox/fx_star → _inbox/fx_star_1.png 〜 _4.png
// 透過はしない。切り分けたものを convert-cutout.mjs に渡す。
import sharp from 'sharp';

const [src, prefix, colsArg = '2', rowsArg = '2'] = process.argv.slice(2);
if (!src || !prefix) {
  console.error('使い方: node scripts/split-sheet.mjs <入力> <出力の頭> [列の数=2] [行の数=2]');
  process.exit(1);
}
const cols = Number(colsArg), rows = Number(rowsArg);
const { width, height } = await sharp(src).metadata();
const cw = Math.floor(width / cols), ch = Math.floor(height / rows);

let n = 0;
for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
  const out = `${prefix}_${++n}.png`;
  await sharp(src).extract({ left: c * cw, top: r * ch, width: cw, height: ch }).png().toFile(out);
  console.log(`${out}\t${cw}x${ch}`);
}
