// _inbox/bg_*_src.* を、背景用の WebP（1920x1080）にして public/assets/images/bg/ に置く。
// 使い方: node scripts/convert-bg.mjs
// 元画像は Gemini の Web 画面で作ったもの（docs/assets.md）。_inbox/ は git 管理外。
import { mkdir, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const SRC = '_inbox';
const OUT = 'public/assets/images/bg';
const WIDTH = 1920;
const HEIGHT = 1080;

await mkdir(OUT, { recursive: true });
const files = (await readdir(SRC)).filter(f => /^bg_.+_src\.(jpe?g|png|webp)$/i.test(f));
if (files.length === 0) {
  console.error(`${SRC}/ に bg_*_src.* がありません`);
  process.exit(1);
}
for (const f of files) {
  const out = path.join(OUT, f.replace(/_src\.\w+$/, '.webp'));
  await sharp(path.join(SRC, f))
    .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'south' }) // 絵は下に寄っているので、切るなら上
    .webp({ quality: 82 })
    .toFile(out);
  console.log(`${out}\t${Math.round((await stat(out)).size / 1024)}KB`);
}
