# highfive_dopa（はちゃめちゃタイプ）

視力の弱い子も遊べる、ド派手演出の子ども向けローマ字タイピングゲーム。
TYPING MINI v0.4.3（highfive_7979）から分かれた、別のアプリです。

- 仕様書: [docs/spec.md](docs/spec.md)
- AI 向けの作業ガイド: [CLAUDE.md](CLAUDE.md)、作業記憶: [LEARNINGS.md](LEARNINGS.md)
- 素材台帳: [docs/assets.md](docs/assets.md)
- 相棒キャラ「ラビッドパ」: [docs/character/](docs/character/)（`preview.html` をブラウザで開くとアニメーションを確認できます）

## 動かし方

前提: Node.js 20 以上

```bash
npm install
npm run dev        # http://localhost:3000
```

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | 型チェック＋本番ビルド（`dist/`） |
| `npm run preview` | ビルド結果の確認 |
| `npm run typecheck` | 型チェックのみ |

## 公開（Vercel）

設定は `vercel.json` に書いてあります。Vercel の画面で変える項目はありません。

1. Vercel にログインし、Add New → Project で GitHub の `Ryun7979/highfive_dopa` を Import する
2. 設定は既定のまま Deploy を押す（Framework: Vite、Build: `npm run build`、Output: `dist`）
3. 以後は `main` にプッシュするたびに自動で公開される

公開後の確認（`<URL>` は本番の URL）:

```bash
curl -sI <URL>/ | grep -i x-robots-tag
```

```bash
curl -sI <URL>/favicon.svg | grep -i "HTTP/"
```

`/assets/` 以下のファイルに `cache-control: public, max-age=31536000, immutable` が付いていることは、ブラウザの開発者ツール（Network）で確かめます。

注意:

- **保存データ（レベル・コイン・図鑑）はブラウザの localStorage に、URL ごとに別々に入ります。** プレビュー用の URL と本番の URL では進み具合が共有されません。遊ぶ人には本番の URL だけを渡してください。
- 検索エンジンには載らないようにしてあります（`noindex`）。ただし URL を知っている人は誰でも開けます。

## オフライン動作

Tailwind CSS・フォント・ライブラリはすべてビルドに同梱しており、CDN や外部 API には接続しません。
`npm install` 後はネットワークなしで開発・ビルド・プレイできます。
