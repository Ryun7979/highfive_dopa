// MP3 の頭から指定の秒数だけを切りだす（再エンコードなし。フレームの境目で切る）。
// 使い方: node scripts/trim-mp3.mjs <入力.mp3> <出力.mp3> <秒>
// ID3 タグと、長さを書いた先頭の Xing/Info フレームは落とす（切ったあとの長さと合わなくなるため）。
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const [src, out, secArg] = process.argv.slice(2);
if (!src || !out || !secArg) {
  console.error('使い方: node scripts/trim-mp3.mjs <入力.mp3> <出力.mp3> <秒>');
  process.exit(1);
}
const BITRATES = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320]; // MPEG1 Layer3
const RATES = [44100, 48000, 32000];

const buf = await readFile(src);
let pos = 0;
if (buf.toString('latin1', 0, 3) === 'ID3') {
  pos = 10 + ((buf[6] & 127) << 21 | (buf[7] & 127) << 14 | (buf[8] & 127) << 7 | (buf[9] & 127));
}
const frames = [];
let seconds = 0;
while (pos + 4 <= buf.length && seconds < Number(secArg)) {
  const h = buf.readUInt32BE(pos);
  const isFrame = (h >>> 21) === 0x7FF && ((h >>> 19) & 3) === 3 && ((h >>> 17) & 3) === 1;
  const bitrate = BITRATES[(h >>> 12) & 15];
  const rate = RATES[(h >>> 10) & 3];
  if (!isFrame || !bitrate || !rate) { pos++; continue; } // MPEG1 Layer3 のフレームの頭を探す
  const size = Math.floor(144000 * bitrate / rate) + ((h >>> 9) & 1);
  const frame = buf.subarray(pos, pos + size);
  const head = frame.toString('latin1', 0, 64);
  if (!(frames.length === 0 && (head.includes('Xing') || head.includes('Info')))) {
    frames.push(frame);
    seconds += 1152 / rate;
  }
  pos += size;
}
await mkdir(path.dirname(out), { recursive: true });
await writeFile(out, Buffer.concat(frames));
console.log(`${out}\t${seconds.toFixed(1)}秒\t${Math.round(frames.reduce((n, f) => n + f.length, 0) / 1024)}KB`);
